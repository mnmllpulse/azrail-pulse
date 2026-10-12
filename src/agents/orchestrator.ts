import { sendProjectEvent, socketAuthorized } from "../lib/socket-access";
import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { withProjectLock } from "../lib/project-control";
import { activeAccount, requireResource } from "../lib/accounts";
import { checkRateLimit } from "../lib/auth";
import { Agent } from "agents";
import { log } from "../lib/resilience";
import type { Env, OrchestratorState, TaskRequest, TaskResult, Intent, GeneratedFile } from "../types";
import { AGENT_REGISTRY, capabilityForIntent, type Capability } from "../lib/agent-registry";
import { ensureProject } from "../lib/project";
import type { EventEnvelope } from "../lib/event-stream";
import { taskTrace, traceLog } from "../lib/observability-context";
import { addMessage, ensureConversation, listMessages } from "../lib/chat-store";
import { checkTaskSufficiency, classifyTaskIntent } from "./orchestrator-intent";
import { commitGeneratedFiles, invokeAgentCapability } from "./orchestrator-capabilities";
import { listTaskHistory, recordTaskHistory } from "./orchestrator-history";
import { runOrchestratorSelfTest, type OrchestratorSelfTestResult } from "./orchestrator-self-test";
import {
  recoverMission as recoverMissionFlow,
  runBenchMission as runBenchMissionFlow,
  runScheduledMission,
  scheduleMission,
  type MissionCoordinatorHost,
  type MissionParams,
  type ScheduledMissionParams,
} from "./mission-coordinator";

function missionHost(orchestrator: any, activeMissions: Set<string>): MissionCoordinatorHost {
  return {
    env: orchestrator.env,
    activeMissions,
    createAbortController: (missionId) => orchestrator.createMissionAbortController(missionId),
    releaseAbortController: (missionId) => orchestrator.releaseMissionAbortController(missionId),
    storage: {
      get: (key) => orchestrator.ctx.storage.get(key),
      put: (key, value) => orchestrator.ctx.storage.put(key, value),
      delete: (key) => orchestrator.ctx.storage.delete(key),
    },
    schedule: (delay, method, payload) => orchestrator.schedule(delay, method, payload),
    keepAlive: () => orchestrator.keepAlive(),
    broadcast: (payload, projectId) => orchestrator.broadcastMissionEvent(payload, projectId),
    invokeCapability: (capability, request) => orchestrator.runCapability(capability, request),
    startMission: (params) => orchestrator.startMission(params),
  };
}

/**
 * AZRAIL ORCHESTRATOR
 *
 * Единственный агент с явным Durable Object биндингом (см. wrangler.toml).
 * Code Agent и Deploy Agent — sub-agents (this.subAgent), у них своя
 * изолированная SQLite-память, но общий рантайм-инстанс с оркестратором.
 *
 * Обязательный воркфлоу из системного промпта (раздел 5):
 *   Шаг 1 — анализ / классификация намерения
 *   Шаг 2 — проверка достаточности данных (не домысливать)
 *   Шаг 3+ — передаётся дальше конкретному агенту
 */
export class Orchestrator extends Agent<Env, OrchestratorState> {
  initialState: OrchestratorState = {
    activeProjectId: null,
    lastIntent: null,
    taskCount: 0,
  };

  onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS local_tasks (
        id TEXT PRIMARY KEY,
        intent TEXT,
        status TEXT,
        started_at TEXT
      )
    `;
    // Таблицы messages здесь БОЛЬШЕ НЕТ намеренно. Переписка переехала в
    // D1 (lib/chat-store.ts): в SQLite объекта она была видна только этому
    // объекту, не переживала его выгрузку и не давала ветвления правок.
    // Два хранилища одного и того же неизбежно разъехались бы.
  }

  /**
   * WebSocket-подключение принято SDK автоматически (см. index.ts —
   * getAgentByName + fetch на апгрейд-запрос). Здесь только логирование:
   * ничего не отправляем на connect, чтобы не путать с onStateUpdate самого
   * SDK, который и так шлёт свой протокольный кадр первым.
   */
  /**
   * Рассылка события миссии подключённым сокетам.
   *
   * Цикл выполнения пишет события в D1 сам (event-store) — это надёжная
   * запись, переживающая перезагрузку. Но пока цикл идёт, смотреть в базу
   * некому: карта миссии в интерфейсе живёт на сокете. Отсюда отдельный
   * вызов — не дубль хранения, а другая задача: показать сейчас.
   */
  async broadcastMissionEvent(payload: { streamEvent?: EventEnvelope; id?: string; seq?: number; domain?: string; event: string; tool?: string; reason?: string; iteration?: number; maxIterations?: number; steps?: number; files?: number }, projectId?: string): Promise<void> {
    if (!payload.streamEvent) {
      log("warn", "orchestrator.event_not_durable", { event: payload.event, projectId });
      return;
    }
    try {
      await sendProjectEvent(this.env, this.getConnections(), projectId, {type:"event_stream", event:payload.streamEvent});
    } catch (err) {
      log("warn", "orchestrator.mission_broadcast_failed", {
        event: payload.event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  onConnect(connection: import("agents").Connection, context: import("agents").ConnectionContext) {
    connection.setState({account:context.request.headers.get("X-Azrail-Account"),project:context.request.headers.get("X-Azrail-Project")});
    this.setConnectionReadonly(connection, true);
    log("info", "orchestrator.ws_connect", { connectionId: connection.id });
  }

  onClose(connection: import("agents").Connection) {
    log("info", "orchestrator.ws_close", { connectionId: connection.id });
  }

  /**
   * Чат поверх того же соединения, что и живой стрим задач — не отдельный
   * канал. Формат входящего сообщения: {"type":"chat","text":"..."}.
   * Всё остальное (в частности протокольные кадры самого SDK) — молча
   * игнорируется, а не считается ошибкой: это НЕ единственный потребитель
   * этого сокета.
   *
   * Переписка хранится в D1 через lib/chat-store.ts, а не в SQLite этого
   * объекта: диалог должен переживать выгрузку объекта и быть читаемым из
   * обычных HTTP-роутов, а не только через сокет.
   */
  async onMessage(connection: import("agents").Connection, message: string | ArrayBuffer | ArrayBufferView) {
    if (typeof message !== "string" || message.length > 16_384) return;

    let parsed: { type?: string; text?: string; conversationId?: string; preferredModel?: string };
    try {
      parsed = JSON.parse(message);
    } catch {
      return; // не наш формат — не JSON вовсе
    }
    if (!parsed || parsed.type !== "chat" || typeof parsed.text !== "string" || !parsed.text.trim()) return;
    if (parsed.conversationId !== undefined && (typeof parsed.conversationId !== "string" || parsed.conversationId.length > 128)) return;
    if (parsed.preferredModel !== undefined && typeof parsed.preferredModel !== "string") return;
    const session=connection.state as {account?:string;project?:string}|null;
    const principal=session?.account?await activeAccount(this.env,session.account):null;
    if(!principal || !session?.project) { connection.close(1008,"Session revoked");return; }
    await requireResource(this.env,principal,"project",session.project);
    if(principal.role==="viewer") return;
    const quota = await checkRateLimit(this.env, principal.id);
    if (!quota.allowed) {
      connection.send(JSON.stringify({ type: "chat_reply", text: "Часовой лимит исчерпан или учёт расходов недоступен." }));
      return;
    }

    const userText = parsed.text.trim().slice(0, 4000);
    // Имя экземпляра объекта — это projectId, поэтому оно же годится как
    // идентификатор диалога по умолчанию: один проект — одна переписка,
    // пока пользователь явно не завёл другую.
    const convId = parsed.conversationId ?? session.project;
    await requireResource(this.env,principal,"conversation",convId,true);

    let replyText: string;
    try {
      await ensureConversation(this.env, convId, session.project);
      await addMessage(this.env, convId, "user", userText);

      // Последние сообщения — достаточно для связного диалога, без выгрузки
      // всей истории на каждый вызов модели (растущая стоимость на ровном месте).
      const history = (await listMessages(this.env, convId, 20)) as Array<{ role: string; content: string }>;

      // Чат идёт через ту же возможность, что и вопрос через /api/task.
      // Раньше здесь был голый вызов модели: без памяти, без счёта, с
      // системным промптом «ты не выполняешь здесь задачи». Один и тот же
      // вопрос получал разные ответы в зависимости от того, каким входом
      // его задали, а посчитать в чате было нельзя вовсе.
      //
      // История передаётся дальше: без неё «а почему?» следом за вопросом
      // потеряло бы предмет разговора.
      const answered = await this.runCapability("reasoning", {
        payload: userText,
        projectId: session.project,
        preferredModel: parsed.preferredModel,
        conversationHistory: history.slice(-10),
        intent: "answer",
      });

      replyText = answered.summary || "(пустой ответ модели)";
      const answerModel = (answered.data as { model?: string } | undefined)?.model;
      await addMessage(this.env, convId, "assistant", replyText, undefined, answerModel);
    } catch (err) {
      // Сбой записи в D1 не должен съесть ответ пользователю — но и молчать
      // о нём нельзя, иначе переписка теряется незаметно.
      replyText = `Не получилось ответить: ${err instanceof Error ? err.message : String(err)}`;
      log("error", "orchestrator.chat_failed", {
        conversationId: convId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (await socketAuthorized(this.env,connection,session.project,convId))
      connection.send(JSON.stringify({ type: "chat_reply", conversationId: convId, text: replyText }));
  }

  /**
   * Самопроверка: прогоняет РЕАЛЬНЫЕ рискованные пути и говорит, что именно
   * живо. Модели не вызываются — проверка бесплатна и её можно жать сколько
   * угодно.
   *
   * Зачем: subAgent() до первого деплоя ни разу не выполнялся. Без этой
   * проверки любая поломка в нём выглядела бы как "задача не выполнена" для
   * всех девяти агентов сразу, и причину искали бы перебором. Здесь же сразу
   * видно: поднимается ли каждый агент, проходит ли запись в D1 по цепочке
   * внешних ключей, отвечают ли KV и R2.
   */
  async selfTest(): Promise<OrchestratorSelfTestResult> {
    return runOrchestratorSelfTest(this.env, (agentClass, name) => this.subAgent(agentClass, name));
  }

  async handleTask(request: TaskRequest): Promise<TaskResult> {
    return withBillingScope(projectBillingScope(request.projectId), () =>
      withProjectLock(this.env,request.projectId,crypto.randomUUID(),()=>this.handleTaskLocked(request)));
  }
  private async handleTaskLocked(request: TaskRequest): Promise<TaskResult> {
    const taskId = request._taskId ?? crypto.randomUUID();
    request._taskId = taskId;
    const trace = taskTrace(request, { taskId });
    request._requestId = trace.requestId;
    request._traceId = trace.traceId;

    log("info", "orchestrator.task_started", { projectId: request.projectId, taskId, ...traceLog(trace) });

    // Шаг 2 — проверка достаточности данных
    const missing = this.checkSufficiency(request);
    if (missing.length > 0) {
      return {
        status: "needs_input",
        agent: "orchestrator",
        summary: "Недостаточно данных для выполнения задачи.",
        questions: missing,
      };
    }

    // Шаг 1 — определить намерение
    const intent = request.intent ?? (await this.classifyIntent(request));

    this.setState({
      activeProjectId: request.projectId ?? this.state.activeProjectId,
      lastIntent: intent,
      taskCount: this.state.taskCount + 1,
    });

    this.sql`
      INSERT INTO local_tasks (id, intent, status, started_at)
      VALUES (${taskId}, ${intent}, 'running', ${new Date().toISOString()})
    `;

    // Строка проекта обязана существовать до записи в task_history:
    // у таблицы внешний ключ на projects(id). См. lib/project.ts.
    if (request.projectId) {
      await ensureProject(this.env, request.projectId);
    }
    await this.recordHistory(taskId, request, intent, "running");

    let result: TaskResult;
    try {
      // Маршрутизация идёт через реестр: Orchestrator ищет ВОЗМОЖНОСТЬ, а не
      // имя агента. Здесь остались только два случая — те, где задача реально
      // не сводится к одному вызову, а образует цепочку из двух агентов.
      if (intent === "analyze_spec" || intent === "generate_code") {
        // Свежая спецификация или генерация с нуля — сначала план архитектуры.
        // review_repo сюда не попадает: там архитектура уже есть, её надо
        // ревьюить, а не проектировать заново.
        const plan = await this.runCapability("architecture", request);

        if (plan.status !== "done") {
          result = plan; // needs_input/failed на планировании — дальше не идём
        } else {
          const planData = plan.data as { output?: string; diagram?: string | null } | undefined;
          const codeResult = await this.runCapability("code_generation", {
            ...request,
            architecturePlan: planData?.output,
          });

          result = {
            ...codeResult,
            data: {
              ...(codeResult.data && typeof codeResult.data === "object" ? codeResult.data : {}),
              architecturePlan: planData?.output,
              architectureDiagram: planData?.diagram,
            },
          };

          // Та же опциональная сшивка, что и у generate_ui ниже: коммитим
          // сгенерированные файлы ТОЛЬКО по явному commitToBranch. Раньше
          // этого не было вовсе — Code Agent мог вернуть files, но дальше
          // они никуда не уходили, отсюда и "почему он ничего не делает".
          if (result.status === "done" && request.commitToBranch) {
            const files = (result.data as { files?: GeneratedFile[] } | undefined)?.files ?? [];
            result = {
              ...result,
              data: {
                ...(result.data && typeof result.data === "object" ? result.data : {}),
                commits: await this.commitFiles(request, files),
              },
            };
          }
        }
      } else if (intent === "generate_ui") {
        result = await this.runCapability("ui_generation", request);

        // Опциональная сшивка: сгенерированные файлы сразу в репозиторий.
        // Только по явному commitToBranch — молча коммитить в чужую ветку
        // то, что сгенерила модель, нельзя.
        if (result.status === "done" && request.commitToBranch) {
          const files = (result.data as { files?: GeneratedFile[] } | undefined)?.files ?? [];
          result = {
            ...result,
            data: {
              ...(result.data && typeof result.data === "object" ? result.data : {}),
              commits: await this.commitFiles(request, files),
            },
          };
        }
      } else {
        // Всё остальное — один агент, найденный по возможности.
        // unclear уходит в code_review как наименее разрушительный дефолт:
        // разбор без изменений безопаснее генерации по неясному запросу.
        const capability = capabilityForIntent(intent) ?? "code_review";
        result = await this.runCapability(capability, request);
      }
    } catch (err) {
      result = {
        status: "failed",
        agent: "orchestrator",
        summary: "Сбой при выполнении задачи.",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    this.sql`UPDATE local_tasks SET status = ${result.status} WHERE id = ${taskId}`;
    // result.agent — тот, кто РЕАЛЬНО выполнял. Раньше сюда всегда шло
    // "orchestrator", из-за чего Evolution Agent видел один агент на все сбои.
    await this.recordHistory(taskId, request, intent, result.status, result.summary, result.error ?? null, result.agent);
    log(result.status === "failed" ? "error" : "info", "orchestrator.task_finished", { projectId: request.projectId, taskId, agent: result.agent, status: result.status, ...traceLog(trace) });
    return result;
  }

  /** Поднимает агента, умеющего нужную возможность, и выполняет задачу.
   *  Единственное место, где вообще создаётся инстанс агента — маршрутизация
   *  выше знает только возможности, не имена и не классы. */
  /**
   * Позвать агента по возможности — снаружи Durable Object.
   *
   * Цикл выполнения (core/execution-engine.ts) — обычный класс, а не
   * Durable Object, поэтому subAgent() ему недоступен. Без этого метода
   * инструменты open_pr / git_diff / run_tests пришлось бы дублировать
   * заново поверх GitHub API — то есть завести второй путь к тому же, со
   * своей отдельной проверкой путей и своими будущими расхождениями.
   *
   * Здесь тот же runCapability, что использует handleTask: один путь,
   * один набор проверок.
   */
  async invokeCapability(capability: Capability, request: TaskRequest): Promise<TaskResult> {
    return this.runCapability(capability, request);
  }

  /**
   * ЗАПУСК МИССИИ В ФОНЕ.
   *
   * Раньше весь цикл выполнялся внутри HTTP-запроса к /api/mission: роут
   * делал `await engine.runMission(...)` на восемь-двадцать шагов, каждый
   * со своим вызовом модели. Cloudflare обрывает клиентское соединение
   * примерно на сотой секунде, и миссия в него попросту не помещалась —
   * пользователь получал 524, результат терялся целиком, а строка в
   * missions навсегда оставалась в "executing", потому что запись
   * финального статуса стояла ПОСЛЕ недостижимого await.
   *
   * Теперь роут только ставит задачу и сразу отдаёт missionId. Работа идёт
   * здесь, внутри Durable Object: у него нет клиентского соединения, рвать
   * нечего, и цикл может идти сколько нужно.
   *
   * schedule(0, ...) — штатный планировщик SDK агентов, а не самодельный
   * alarm(). Свой alarm() на подклассе Agent конфликтует с внутренним
   * планировщиком SDK: тот держит на будильнике собственные задачи и
   * heartbeat, и перехват метода тихо ломает и то и другое.
   */
  async startMission(params: MissionParams): Promise<{ scheduled: true; missionId: string }> {
    return scheduleMission(missionHost(this, this.activeMissions), params);
  }

  async runBenchMission(params: Omit<MissionParams, "preferredModel" | "publicHostname">): Promise<TaskResult> {
    return runBenchMissionFlow(missionHost(this, this.activeMissions), params);
  }

  private activeMissions = new Set<string>();
  private missionAbortControllers = new Map<string, AbortController>();

  /** @internal used by missionHost() */
  createMissionAbortController(missionId: string): AbortController {
    const existing = this.missionAbortControllers.get(missionId);
    if (existing && !existing.signal.aborted) return existing;
    const controller = new AbortController();
    this.missionAbortControllers.set(missionId, controller);
    return controller;
  }

  /** @internal used by missionHost() */
  releaseMissionAbortController(missionId: string): void {
    this.missionAbortControllers.delete(missionId);
  }

  /** Live health probe for Metatron. It proves Durable Object RPC + storage readability; it never labels an unprobed agent online. */
  async probeAgents(projectId: string): Promise<Array<{id:string;name:string;status:"healthy"|"degraded";storageReadable:boolean;error?:string}>> {
    const out:Array<{id:string;name:string;status:"healthy"|"degraded";storageReadable:boolean;error?:string}>=[];
    for(const entry of AGENT_REGISTRY){
      try{
        const agent=await this.subAgent(entry.agentClass,`${entry.id}-${projectId}`);
        const ping=await agent.ping();
        out.push({id:entry.id,name:entry.name,status:ping.storageReadable?"healthy":"degraded",storageReadable:!!ping.storageReadable});
      }catch(error){
        out.push({id:entry.id,name:entry.name,status:"degraded",storageReadable:false,error:error instanceof Error?error.message:String(error)});
      }
    }
    return out;
  }

  /** Immediate in-memory cancellation for the current DO turn; D1 remains durable source of truth. */
  async abortMission(missionId: string): Promise<{ aborted: boolean }> {
    const controller = this.missionAbortControllers.get(missionId);
    if (!controller || controller.signal.aborted) return { aborted: false };
    controller.abort(new DOMException("Mission cancelled by owner", "AbortError"));
    return { aborted: true };
  }

  async recoverMission(missionId: string): Promise<{ resumed: boolean; reason?: string }> {
    return recoverMissionFlow(missionHost(this, this.activeMissions), missionId);
  }

  async runMissionTask(params: ScheduledMissionParams): Promise<void> {
    return runScheduledMission(missionHost(this, this.activeMissions), params);
  }

  private async runCapability(capability: Capability, request: TaskRequest): Promise<TaskResult> {
    return invokeAgentCapability(this.env, (agentClass, name) => this.subAgent(agentClass, name), capability, request);
  }

  private async commitFiles(request: TaskRequest, files: GeneratedFile[]) {
    return commitGeneratedFiles(this.env, (agentClass, name) => this.subAgent(agentClass, name), request, files);
  }

  async getHistory(projectId: string, limit = 20) {
    return listTaskHistory(this.env, projectId, limit);
  }

  private checkSufficiency(request: TaskRequest): string[] {
    return checkTaskSufficiency(request);
  }

  private async classifyIntent(request: TaskRequest): Promise<Intent> {
    return classifyTaskIntent(this.env, request);
  }

  private async recordHistory(
    id: string,
    request: TaskRequest,
    intent: Intent,
    status: TaskResult["status"] | "running",
    outputSummary?: string,
    error?: string | null,
    actualAgent = "orchestrator",
  ): Promise<void> {
    return recordTaskHistory(
      this.env,
      this.getConnections(),
      id,
      request,
      intent,
      status,
      outputSummary,
      error,
      actualAgent,
    );
  }

}
