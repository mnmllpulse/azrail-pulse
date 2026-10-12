import { readDesignContract, designInstruction } from "../unified/design-contract";
export { parseDecision, renderHistory } from "./execution-protocol";
export type { StepDecision, StepRecordView } from "./execution-protocol";
import type { StepDecision } from "./execution-protocol";
import { withProjectLock, assertProjectLease, requireCapability, toolCapability, type ProjectLease } from "../lib/project-control";
import { loadCheckpoints, checkpointTool, UncertainToolError, validateReplayableCheckpoints } from "../lib/checkpoints";
import { withBillingScope } from "../lib/billing-context";
import type { Env, TaskRequest, TaskResult, ToolName } from "../types";
import { readFile } from "../lib/workspace";
import { availableTools, TOOL_REGISTRY } from "../lib/tool-registry";
import { extractText, runModel } from "../lib/model-router";
import { diffWorkspace, renderChanges, type WorkspaceFile } from "./verification";
import { buildReflection } from "./reflection";
import { buildRepoMap, renderRepoMap } from "./repo-map";
import { planScoutQuestions, renderFindings, runScouts, shouldScout } from "./scout";
import { log } from "../lib/resilience";
import { WorkingSet, type FileWindow } from "./file-window";
import { checkEdit } from "./syntax-guard";
import { clampIterations } from "../lib/mission-limits";
import { recordMissionDecision } from "../lib/mission-decision-log";
import { recallContext, rememberFact } from "../lib/memory-agent";
import { renderUsage } from "../lib/usage";
import {
  type PlanStep,
  loadPlan,
  advancePlan,
  planProgress,
  revisePlan,
  planExhausted,
  MAX_REVISIONS,
} from "./planner";
import { checkResult, findTestEvidence, CHECK_LIMITS } from "./checker";
import { detectBackend } from "./sandbox";
import {
  detectLoop,
  snapshotWorkspace,
  rollbackWorkspace,
  compareTests,
  MUTATING_TOOLS,
  type Snapshot,
} from "./mission-guard";
import { loadMissionSnapshotKey } from "../lib/mission-snapshot";
import { loadMissionTestBaseline, rememberMissionTestBaseline } from "../lib/mission-baseline";
import { claimPlanRevision, claimRegressionRetry, loadMissionRecoveryState } from "../lib/mission-recovery-state";
import { ExecutionToolExecutor } from "./execution-tools";
import { ExecutionPlanningEngine } from "./execution-planning";
import { ExecutionJournal } from "./execution-journal";
import { readMissionWorkspace } from "./mission-workspace";
import type { ExecutionContext, StepRecord } from "./execution-types";
export type { ExecutionContext } from "./execution-types";

export class ExecutionEngine {
  private readonly toolExecutor: ExecutionToolExecutor;
  private readonly planningEngine: ExecutionPlanningEngine;
  private readonly journal: ExecutionJournal;

  constructor(private readonly env: Env) {
    this.toolExecutor = new ExecutionToolExecutor(env);
    this.planningEngine = new ExecutionPlanningEngine(env);
    this.journal = new ExecutionJournal(env);
  }

  async executeTool(tool: ToolName, input: Record<string, unknown>, ctx: ExecutionContext, lease?: ProjectLease): Promise<unknown> {
    return this.toolExecutor.executeTool(tool, input, ctx, lease);
  }


  /**
   * Автономный цикл миссии.
   *
   * Модель на каждом шаге получает цель, список ДОСТУПНЫХ инструментов и
   * историю уже сделанного, и отвечает одним решением: позвать инструмент
   * или закончить. Движок исполняет, кладёт результат обратно в историю и
   * идёт на следующий круг.
   *
   * ГРАНИЦЫ, встроенные намеренно:
   *
   * 1. Инструменты риска "approval" цикл НЕ исполняет никогда. Не «спросит
   *    и выполнит» — просто не может: availableTools() их не показывает, а
   *    executeTool отказывает по флагу. Необратимое действие требует
   *    отдельного решения владельца, а не согласия внутри цикла.
   *
   * 2. maxIterations — жёсткий потолок, а не пожелание. Модель, зациклившаяся
   *    на одном файле, остановится по счётчику. Без него цикл крутился бы до
   *    исчерпания лимитов Worker'а.
   *
   * 3. Ошибка инструмента не роняет миссию — она возвращается модели текстом,
   *    чтобы та попробовала иначе. Но три ошибки подряд цикл прекращают:
   *    если три шага подряд провалились, дело не в невезении.
   */
  async runMission(request: TaskRequest, ctx: ExecutionContext): Promise<TaskResult> {
    return withBillingScope(`mission:${ctx.missionId}`, () =>
      withProjectLock(this.env,ctx.projectId,ctx.missionId,(lease)=>this.runMissionLocked(request,ctx,lease)));
  }
  private async runMissionLocked(request: TaskRequest, ctx: ExecutionContext, lease?: ProjectLease): Promise<TaskResult> {
    const goal = (request.message ?? request.payload ?? "").trim();
    if (!goal) {
      return {
        status: "needs_input",
        agent: "execution-engine",
        summary: "Для выполнения миссии нужен запрос пользователя.",
        questions: ["Что именно нужно создать или изменить?"],
      };
    }
    if (!ctx.projectId) {
      // Без проекта у файловых инструментов нет рабочей папки — цикл
      // выродится в один call_model. Честнее сказать сразу.
      return {
        status: "needs_input",
        agent: "execution-engine",
        summary: "Не указан проект: без него у файловых инструментов нет рабочей папки.",
        questions: ["В каком проекте выполнять задачу?"],
      };
    }

    if (ctx.shouldAbort && (await ctx.shouldAbort())) {
      return {status:"failed", agent:"execution-engine", summary:"Миссия остановлена до планирования.", error:"cancelled"};
    }
    const tools = availableTools(this.env);
    const toolList = tools.map((t) => `- ${t.name} (${t.risk}): ${t.description}`).join("\n");
    const maxIterations = clampIterations(ctx.maxIterations);
    const checkpoints=await loadCheckpoints(this.env,ctx.missionId);
    const replay=validateReplayableCheckpoints(checkpoints,maxIterations);
    const history: StepRecord[] = replay.map((p)=>({
      tool:p.tool as ToolName,
      input:p.input,
      ok:p.status==="completed",
      result:p.result_json!,
    }));
    const workingSet = new WorkingSet();
    /* Предупреждение о повторе не тратит шаг бюджета: инструмент не
     * исполнялся, работы не было. Раньше каждое такое предупреждение
     * съедало шаг бюджета. Бесплатных — не больше двух, чтобы
     * упрямый повтор не крутил цикл бесконечно. */
    let freeLoopWarnings = 2;
    let consecutiveFailures = 0;
    // This is not an authorization gate; it only preserves reflection/reporting
    // semantics across a restart. If D1 is unavailable we default to false, while
    // the actual retry gate below still fails closed on claimRegressionRetry().
    let regressionRetryUsed = false;
    try {
      regressionRetryUsed=(await loadMissionRecoveryState(this.env,ctx.missionId)).regressionRetries>0;
    } catch(error) {
      log("warn","mission.recovery_state_load_failed",{missionId:ctx.missionId,error:error instanceof Error?error.message:String(error)});
    }

    await this.note(ctx, "mission.started", { goal, maxIterations });

    // ── План строится ДО первого шага ──────────────────────────────
    // Пока контекст чистый и задача видна целиком. Позже, в середине
    // длинной истории вызовов, декомпозиция получается заметно хуже.
    //
    // Сбой планирования миссию НЕ останавливает: цикл умеет работать и
    // без плана, просто хуже держит цель. Терять работоспособность
    // ради надстройки неправильно.
    let rejections = 0;

    /* ── Снимок рабочей области ДО работы ──────────────────────────
     * Миссия могла упасть на пятом шаге из восьми — и файлы, записанные
     * на первых четырёх, оставались. Проект в промежуточном состоянии,
     * и никто об этом не говорил.
     *
     * Снимок необязателен: новый проект без файлов — обычный случай, и
     * требовать там снимок было бы абсурдом. */
    /* Содержимое файлов ДО работы — для показа проверяющему.
     *
     * Снимок в R2 (ниже) нужен для отката, а это — для ответа на вопрос
     * «что вообще изменилось». Без него проверяющий видит ПЕРЕСКАЗ
     * работы, а пересказ легко выглядит убедительно при пустом
     * результате: «прочитал файл, понял проблему, записал исправление»
     * читается как работа, даже если записанное ничего не меняет. */
    let filesBefore: WorkspaceFile[] = [];
    if (ctx.projectId) {
      try {
        filesBefore = await this.readWorkspace(ctx.projectId);
      } catch {
        // Не прочиталось — проверка пойдёт без диффа, как раньше.
      }
    }

    /* ── Карта проекта ────────────────────────────────────────────────
     *
     * Модель видит инструменты и историю своих вызовов, но НЕ ВИДИТ
     * проект. Отсюда самый частый класс ошибок — не в коде, а в том, где
     * код: выдуманные пути, правка не того файла, попытка написать
     * заново то, что уже лежит в соседней папке.
     *
     * Строится ОДИН РАЗ за миссию из уже прочитанных файлов — лишнего
     * чтения это не стоит. Обновлять её по ходу незачем: миссия меняет
     * единицы файлов, а карта отвечает на вопрос «где искать», и ответ
     * от одной правки не меняется.
     */
    let repoMap = "";
    if (filesBefore.length) {
      repoMap = renderRepoMap(buildRepoMap(filesBefore));
      await this.note(ctx, "repo.mapped", {
        reason: `в карте ${filesBefore.length} файлов`,
      });
    }

    /* ── ЧТО УЖЕ ИЗВЕСТНО ПРО ЭТОТ ПРОЕКТ ───────────────────────────
     *
     * Здесь ничего не было — и это был самый обидный пробел во всей
     * системе. Цикл вызывал rememberFact в конце каждой миссии, факты
     * ложились в D1, функция recallContext была написана с комментарием
     * «то, что реально спрашивается перед каждым решением» — и не
     * вызывалась НИКЕМ. AZRAIL копил знание о проекте и каждую следующую
     * миссию начинал с чистого листа.
     *
     * Память идёт ПЕРЕД картой и разведкой: она дешевле обеих (одно
     * чтение из D1) и может сделать их лишними. Знание «обработчик задач
     * в src/routes/api.ts» стоит трёх разведчиков.
     */
    let memoryBlock = "";
    const design=await readDesignContract(this.env,ctx.projectId!);
    memoryBlock=designInstruction(design.contract);
    if (ctx.projectId) {
      try {
        const recalled = await recallContext(this.env, ctx.projectId, 30, {missionId:ctx.missionId});
        if (recalled) {
          memoryBlock += "\n" +
            `ИЗВЕСТНО ПО ПРОШЛЫМ МИССИЯМ (свежие записи; это не гарантия, ` +
            `проверяй, если решение зависит от факта):\n${recalled}`;
          await this.note(ctx, "memory.recalled", { reason: `записей: ${recalled.split("\n").length}` });
        }
      } catch (err) {
        log("warn", "memory.recall_failed", {
          missionId: ctx.missionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    /* ── Параллельная разведка ────────────────────────────────────────
     *
     * Разбор проекта съедал контекст главного цикла: list_files, потом
     * read_file, потом ещё read_file — и каждый ответ ложился в историю
     * целиком. К моменту решения история забита содержимым файлов,
     * половина из которых оказалась ни при чём, а задача — далеко в
     * начале запроса, там, где модель помнит хуже всего.
     *
     * Разведчики идут ОДНОВРЕМЕННО и каждый со своим контекстом. Сюда
     * возвращаются не файлы, а несколько строк вывода на вопрос.
     * Читают все, пишет по-прежнему один — этот цикл.
     */
    let plan: PlanStep[] = [];
    let planLoadFailed = false;
    let durablePlan: PlanStep[] | null = null;
    try {
      durablePlan = await loadPlan(this.env, ctx.missionId);
      if (durablePlan?.length) {
        plan = durablePlan;
        await this.note(ctx, "plan.resumed", { steps: plan.length, checkpoints: replay.length });
      }
    } catch (err) {
      // A corrupt durable plan is not permission to append another plan
      // generation. Continue without plan guidance; checkpoint history still
      // preserves exactly-once tool replay semantics.
      planLoadFailed = true;
      log("error", "plan.load_failed", {
        missionId: ctx.missionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    let scoutReport = "";
    if (
      !durablePlan && !planLoadFailed &&
      ctx.projectId &&
      shouldScout({ fileCount: filesBefore.length, maxIterations, goal })
    ) {
      const ask = async (prompt: string, system: string) => {
        const routed = await runModel<{ response?: string }>(
          this.env,
          "scout",
          { messages: [{ role: "system", content: system }, { role: "user", content: prompt }] },
          { preferredModel: ctx.preferredModel, ledger: ctx.usage, trace: ctx, signal: ctx.signal },
        );
        return extractText(routed.output);
      };

      try {
        const questions = await planScoutQuestions({ ask }, goal, repoMap);
        if (questions.length) {
          await this.note(ctx, "scouts.started", { reason: questions.join(" | "), count: questions.length });
          const findings = await runScouts(
            {
              ask,
              // Инструменты идут через тот же executeTool, что и у главного
              // цикла: отдельная реализация чтения разошлась бы с основной
              // по поведению — и разведка докладывала бы про другой проект.
              runTool: (tool, input) => this.executeTool(tool, input, ctx),
            },
            questions,
            repoMap,
          );
          scoutReport = renderFindings(findings);
          await this.note(ctx, "scouts.done", {
            reason: `выводов: ${findings.filter((f) => f.ok).length} из ${findings.length}`,
          });
        }
      } catch (err) {
        // Разведка вспомогательна. Не вышла — работаем как раньше.
        await this.note(ctx, "scouts.failed", {
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }


    /* План строится ПОСЛЕ карты и разведки, а не до них.
     * Durable plan, если он уже существует, был загружен до разведчиков:
     * recovery не должен снова платить за scout/model calls только потому,
     * что процесс перезапустился. */
    /* Лимит пересборок хранится в D1 (mission_recovery_state), а не в памяти
     * Durable Object: restart не должен возвращать миссии ещё два replan. */
    /* Бюджет автоматического rollback-and-retry тоже хранится в D1.
     * Restart не должен давать миссии ещё одну попытку после уже
     * использованного отката. */
    if (!durablePlan && !planLoadFailed) {
      try {
        plan = await this.buildPlan(goal, toolList, maxIterations, ctx, repoMap, scoutReport, memoryBlock);
        if (plan.length) await this.note(ctx, "plan.ready", { steps: plan.length });
      } catch (err) {
        log("warn", "plan.build_failed", {
          missionId: ctx.missionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let snapshot: Snapshot | null = null;
    let snapshotKey = await loadMissionSnapshotKey(this.env,ctx.projectId,ctx.missionId);
    if (ctx.projectId && !snapshotKey) {
      snapshot = await snapshotWorkspace(this.env, ctx.projectId, goal, ctx.missionId);
      if (snapshot) {
        // snapshotWorkspace publishes the version row and the mission link in
        // one D1 transaction, so recovery can never lose the original baseline
        // between those two records.
        snapshotKey = snapshot.r2Key;
        await this.note(ctx, "snapshot.taken", { files: snapshot.files });
      }
    }

    /* ── Замер тестов ДО правок ────────────────────────────────────
     * Без него нельзя отличить «я починил» от «оно и так работало» и,
     * что важнее, от «я сломал то, что работало». Замер необязателен:
     * если прогонять нечем, работаем как раньше. */
    let testsBefore: { passed: number; failed: number } | null = null;
    try {
      testsBefore = await loadMissionTestBaseline(this.env,ctx.missionId);
      if(testsBefore) await this.note(ctx,"tests.baseline_resumed",testsBefore);
    } catch(error) {
      // Corrupt baseline is not permission to replace it with measurements
      // from an already-mutated workspace. Disable regression comparison.
      log("error","tests.baseline_load_failed",{missionId:ctx.missionId,error:error instanceof Error?error.message:String(error)});
    }
    if (!testsBefore && replay.length===0 && detectBackend(this.env) !== "none" && ctx.projectId) {
      try {
        const probe = await this.executeTool("sandbox_test", {}, ctx);
        const p = probe as { passed?: number; failed?: number; total?: number };
        if (typeof p?.passed === "number" && Number.isSafeInteger(p.passed) && p.passed>=0 && (p.total ?? 0) > 0) {
          const observed={ passed: p.passed, failed: Number.isSafeInteger(p.failed)&&Number(p.failed)>=0 ? Number(p.failed) : 0 };
          try { testsBefore=await rememberMissionTestBaseline(this.env,ctx.missionId,observed); }
          catch(error) {
            // Baseline persistence is auxiliary. Keep the in-memory baseline
            // for this uninterrupted run, but a later recovery will refuse to
            // recapture it after checkpoints exist.
            testsBefore=observed;
            log("warn","tests.baseline_persist_failed",{missionId:ctx.missionId,error:error instanceof Error?error.message:String(error)});
          }
          await this.note(ctx, "tests.baseline", testsBefore);
        }
      } catch {
        // Прогонять нечем или упало — не повод отказываться от работы.
      }
    } else if(!testsBefore && replay.length>0) {
      await this.note(ctx,"tests.baseline_unavailable_after_recovery",{reason:"checkpoint history already exists; recapture from mutated workspace is forbidden"});
    }

    for (let i = checkpoints.length ? Math.max(...checkpoints.map(p=>p.step))+1 : 0; i < maxIterations; i++) {
      /* ── Точка останова ────────────────────────────────────────────
       * До этой проверки запущенную миссию нельзя было прекратить ничем:
       * кнопка «Отменить» в интерфейсе рвала HTTP-соединение, а цикл на
       * сервере продолжал жечь модели и бюджет записей до maxIterations,
       * ни о чём не подозревая.
       *
       * Проверка стоит ПЕРЕД решением шага, а не после: иначе отмена
       * оплачивала бы ещё один вызов модели ради права остановиться. */
      if (ctx.shouldAbort && (await ctx.shouldAbort())) {
        await this.note(ctx, "mission.cancelled", { reason: "остановлено владельцем", iteration: i });
        return {
          status: "failed",
          agent: "execution-engine",
          summary: `Миссия остановлена по команде на шаге ${i + 1}. Сделанное сохранено, откат не выполнялся.`,
          error: "cancelled",
          data: { missionId: ctx.missionId, steps: history, iterations: i, plan, cancelled: true },
        };
      }

      /* ── Слово человека посреди работы ────────────────────────────
       *
       * До этого в идущую миссию можно было вмешаться только топором:
       * отменить. Видишь по карте, что агент пошёл не туда, — и
       * единственный доступный жест это убить всё вместе с наработанным
       * контекстом. Для миссии на десять минут это дорого до нелепости.
       *
       * Подсказка кладётся в историю как шаг, а не подмешивается в
       * системный промпт: история — это то, что произошло, и «владелец
       * сказал X» произошло ровно так же, как вызов инструмента. В
       * промпте она стояла бы вне времени, и модель не поняла бы, что
       * сказанное относится к последнему шагу, а не к заданию целиком.
       */
      if (ctx.takeHints) {
        const hints = await ctx.takeHints();
        for (const hint of hints) {
          history.push({
            tool: "hint",
            input: {},
            // ok: true — это не сбой. Пометив подсказку неудачей, мы бы
            // накрутили счётчик провалов и оборвали миссию за то, что
            // человек попытался помочь.
            ok: true,
            result: `ВЛАДЕЛЕЦ ВМЕШАЛСЯ ПО ХОДУ РАБОТЫ: "${hint}"\nЭто важнее твоего текущего плана. Учти сказанное на следующем шаге.`,
          });
          await this.note(ctx, "hint.received", { reason: hint, iteration: i });
        }
      }

      let decision: StepDecision;
      try {
        decision = await this.decideNextStep(goal, toolList, history, i, maxIterations, ctx, plan, repoMap, scoutReport, memoryBlock, workingSet.render());
        await recordMissionDecision(this.env,ctx.missionId,'tool',decision.tool??(decision.done?'done':'replan'),decision.reason??'Execution Engine selected the next step.',{done:!!decision.done,replan:!!decision.replan,input:decision.input??{}},i);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.note(ctx, "mission.failed", { reason: `решение шага: ${msg}` });
        return {
          status: "failed",
          agent: "execution-engine",
          summary: "Не удалось получить следующий шаг от модели.",
          error: msg,
          data: { missionId: ctx.missionId, steps: history },
        };
      }

      /* ── Пересборка плана ─────────────────────────────────────────
       *
       * План строился ОДИН РАЗ, до первого шага — то есть до того, как
       * хоть что-то стало известно о проекте. Реальная работа так не
       * идёт: третий шаг регулярно выясняет, что план был неверен. А план
       * при этом продолжал показываться модели в каждом запросе и тянуть
       * её обратно к неверному маршруту.
       *
       * Два повода пересобрать:
       *   1. модель сказала об этом сама (replan);
       *   2. план кончился, а работа — нет: ориентира больше нет, а до
       *      потолка шагов ещё далеко.
       *
       * Выполненные шаги не трогаются: это сделанная работа, и переписать
       * её задним числом значит потерять след того, что происходило.
       */
      const exhausted = planExhausted(plan);
      if ((decision.replan || exhausted) && plan.length) {
        let revision:number|null=null;
        try { revision=await claimPlanRevision(this.env,ctx.missionId,MAX_REVISIONS); }
        catch(error) {
          // Planner state is advisory. A D1 outage must not make the main
          // mission fail, but it also must not grant an uncounted revision.
          log("error","plan.revision_claim_failed",{missionId:ctx.missionId,error:error instanceof Error?error.message:String(error)});
        }
        if(revision!==null) {
          const why = decision.replan
            ? (decision.reason ?? "модель сочла план негодным")
            : "план исчерпан, а задача не закрыта";

          const titles = await this.replanTitles(goal, toolList, history, plan, maxIterations - i, ctx);
          if (titles.length) {
            plan = await revisePlan(this.env, ctx.missionId, plan, titles, why);
            await this.note(ctx, "plan.revised", { reason: why, steps: titles.length, iteration: i, revision });
          } else {
            await this.note(ctx, "plan.revise_skipped", { reason: "модель не вернула новых шагов", revision });
          }

          if (decision.replan) continue;
        } else if(decision.replan) {
          await this.note(ctx,"plan.revise_limit",{reason:`достигнут лимит ${MAX_REVISIONS}`,iteration:i});
          // A pure replan decision has no tool to execute. Do not fall through
          // and accidentally treat it as successful completion.
          continue;
        }
      }

      if (decision.done || !decision.tool) {
        /* ── Проверка перед «готово» ──────────────────────────────
         *
         * Раньше здесь был безусловный возврат: модель сказала done —
         * значит done. Теперь результат смотрит проверяющий с ЧИСТЫМ
         * контекстом (см. core/checker.ts, там же честно написано,
         * почему это промежуточная мера до появления песочницы).
         *
         * Отклонение не бесконечно: после MAX_REJECTIONS попыток цикл
         * отдаёт needs_input, а не done. Бесконечный пинг-понг между
         * исполнителем и проверяющим сжёг бы шаги и всё равно не
         * сошёлся бы — а незакрытую задачу нельзя выдавать за
         * закрытую.
         */
        /* ── ПРОВЕРКА ФАКТОМ, А НЕ НА СЛОВО ──────────────────────
         *
         * До этого прогон тестов был ДОБРОВОЛЬНЫМ: если модель ни разу
         * не позвала sandbox_test, в истории не оказывалось объективных
         * данных, и решение принималось по мнению другой модели о
         * пересказе работы. То есть агент, ни разу не запустивший
         * ничего, проходил проверку ровно так же, как агент, добившийся
         * зелёных тестов.
         *
         * Теперь тесты гоняет сам цикл, перед тем как принять «готово».
         * Отсутствие тестов в проекте — не препятствие: прогонять нечего,
         * работаем как раньше. Недоступность песочницы — тоже: без неё
         * проверка возвращается к прежнему уровню, а не блокирует
         * сделанную работу. */
        let executionVerified = false;
        let executionAttempted = false;
        let executionFailureReason = "";
        if (detectBackend(this.env) === "container" && ctx.projectId) {
          try {
            const verify = await this.runTestsInContainer(ctx.projectId);
            if (verify) {
              executionAttempted = true;
              executionVerified = verify.ok;
              executionFailureReason = verify.ok ? "" : `${verify.failed} проверок завершились ошибкой (${verify.command})`;
              history.push({
                tool: "sandbox_test",
                input: {},
                ok: verify.ok,
                result: this.renderResult(verify),
              });
              await this.note(ctx, verify.ok ? "tests.verified" : "tests.failed", {
                reason: `${verify.passed} прошло, ${verify.failed} упало (${verify.command})`,
                iteration: i,
              });
            }
          } catch (err) {
            // Прогон не состоялся — это UNVERIFIED, а не зелёный Completed.
            executionFailureReason = err instanceof Error ? err.message : String(err);
            await this.note(ctx, "tests.unavailable", { reason: executionFailureReason });
          }
        }

        const changes = ctx.projectId
          ? diffWorkspace(filesBefore, await this.readWorkspace(ctx.projectId))
          : [];

        // An LLM verdict must never override absent or failing executable evidence.
        const changesCode = changes.some(c => /(?:\.[cm]?[jt]sx?|\.py|\.go|\.rs|\.html|\.css|package\.json)$/.test(c.path));
        const executableEvidenceRequired = changesCode || history.some(step=>step.ok && ["write_file","edit_file","apply_patch","sandbox_exec"].includes(step.tool));
        if (executableEvidenceRequired && executionAttempted && !executionVerified) {
          await this.note(ctx, "verification.failed", {reason:executionFailureReason || "Исполняемые проверки завершились ошибкой."});
          return {status:"failed",agent:"execution-engine",
            summary:"Изменения сохранены, но Quality Gate обнаружил ошибки. Результат нельзя считать готовым.",
            error:executionFailureReason || "Quality Gate failed",
            quality:{status:"failed",reason:executionFailureReason || "Executable verification failed",gates:[{name:"tests",status:"failed",detail:executionFailureReason}]},
            data:{missionId:ctx.missionId,steps:history,verification:{status:"failed"},changes}};
        }
        if (executableEvidenceRequired && !executionVerified) {
          const reason = executionFailureReason || "Независимая исполняемая проверка недоступна.";
          await this.note(ctx, "verification.unverified", {reason});
          return {status:"done",agent:"execution-engine",
            summary:"Изменения сохранены, но результат остаётся UNVERIFIED: обязательная исполняемая проверка не подтверждена.",
            quality:{status:"unverified",reason,gates:[{name:"tests",status:"blocked",detail:reason}]},
            data:{missionId:ctx.missionId,steps:history,verification:{status:"unverified"},changes}};
        }
        const verdict = await checkResult(this.env, goal, history, ctx.preferredModel, renderChanges(changes), ctx.usage, ctx);
        await this.recordCheck(ctx, rejections + 1, verdict.passed, verdict.reason);
        /* Три исхода, а не два.
         *
         * Раньше «проверено, всё хорошо», «проверяющий не ответил» и
         * «проверка упала» давали одно и то же событие check.passed.
         * Различие жило в тексте reason — то есть нигде, потому что ни
         * одна ветка кода его не читала. Событие называет исход прямо. */
        await this.note(ctx, verdict.passed ? (verdict.verified ? "check.passed" : "check.unverified") : "check.rejected", {
          reason: verdict.reason,
          iteration: i,
        });

        if (!verdict.passed && rejections < CHECK_LIMITS.MAX_REJECTIONS) {
          rejections++;
          // Возражение уходит В ИСТОРИЮ как обычный факт: исполнитель
          // увидит его на следующем шаге и продолжит работу.
          history.push({
            tool: "check",
            input: {},
            ok: false,
            result: `Проверка не пройдена: ${verdict.reason}`,
          });
          continue;
        }

        if (!verdict.passed) {
          /* Откат: работа не доведена, а файлы уже записаны.
           *
           * Возвращаем рабочую область к снимку. Файлы, появившиеся за
           * миссию и отсутствовавшие в снимке, УДАЛЯЮТСЯ — иначе откат
           * неполон: остались бы половинчатые новые файлы, на которые
           * ничего не ссылается, и разбираться пришлось бы руками. */
          let rolledBack: { restored: number; removed: number } | null = null;
          if (snapshotKey && ctx.projectId) {
            rolledBack = await rollbackWorkspace(this.env, ctx.projectId, snapshotKey, lease!, ctx);
            if (rolledBack) {
              await this.note(ctx, "rollback.done", {
                reason: `Возвращено файлов: ${rolledBack.restored}, удалено новых: ${rolledBack.removed}`,
              });
            }
          }

          await this.note(ctx, "mission.needs_input", { reason: verdict.reason, steps: history.length });
          return {
            status: "needs_input",
            agent: "execution-engine",
            summary: `Задача не доведена до конца: ${verdict.reason}`,
            questions: ["Продолжить работу или уточнить требования?"],
            quality: { status: "blocked", reason: verdict.reason, gates: [{ name: "checker", status: "failed", detail: verdict.reason }] },
            data: { missionId: ctx.missionId, steps: history, iterations: i, plan, check: verdict, rolledBack },
          };
        }

        /* Сравнение с замером ДО работы.
         *
         * Критерий строже очевидного: мало починить целевое, надо ещё
         * не сломать остальное. Агент, исправивший одно и сломавший
         * три, формально решил задачу — и именно этот случай надо
         * ловить, потому что сам он о нём не сообщит. */
        const testsNow = findTestEvidence(history);
        const comparison = compareTests(
          testsBefore,
          testsNow ? { passed: testsNow.passed, failed: testsNow.failed } : null,
        );
        if (comparison.regressed) {
          await this.note(ctx, "tests.regressed", { reason: comparison.summary });

          /* ── Откат и вторая попытка ──────────────────────────────────
           *
           * Раньше здесь был вопрос человеку: «откатить или продолжить
           * исправление?» — и миссия замирала. Для работы с телефона это
           * худший из возможных исходов: агент трудился десять минут,
           * сломал тесты и встал ждать, пока ты дойдёшь до экрана. К тому
           * моменту контекст миссии уже не восстановить.
           *
           * Правильный ответ на этот вопрос почти всегда один и тот же:
           * откатить. Сломанные тесты — не повод сохранять изменения,
           * которые их сломали. Спрашивать имеет смысл, только когда
           * ВТОРАЯ попытка кончилась тем же: значит, дело не в подходе, а
           * в понимании задачи, и тут человек действительно нужен.
           *
           * Одна попытка, не больше. Цикл «сломал — откатил — сломал
           * иначе» способен сжечь весь бюджет шагов, и каждый его виток
           * выглядит как прогресс.
           */
          let retryClaimed=false;
          if(snapshotKey && ctx.projectId) {
            try { retryClaimed=(await claimRegressionRetry(this.env,ctx.missionId,1))!==null; }
            catch(error) {
              // A counter outage cannot grant an uncounted retry. Stop safely.
              log("error","tests.regression_retry_claim_failed",{missionId:ctx.missionId,error:error instanceof Error?error.message:String(error)});
            }
          }
          if (retryClaimed && snapshotKey && ctx.projectId) {
            regressionRetryUsed=true;
            const undone = await rollbackWorkspace(this.env, ctx.projectId, snapshotKey, lease!, ctx);
            await this.note(ctx, "tests.rolled_back", {
              reason: undone
                ? `${comparison.summary} Откатено: восстановлено ${undone.restored}, удалено новых ${undone.removed}. Пробую другой подход.`
                : `${comparison.summary} Откат не удался.`,
              iteration: i,
            });

            /* Запись в историю — не для отчёта, а чтобы модель УЗНАЛА об
             * откате. Без неё следующий шаг строится на убеждении, что
             * правки на месте, и модель продолжит достраивать поверх
             * того, чего больше нет. */
            history.push({
              tool: "rollback",
              input: {},
              ok: false,
              result:
                `Твои изменения СЛОМАЛИ тесты (${comparison.summary}) и были отменены. ` +
                `Файлы вернулись в исходное состояние — того, что ты написал, больше нет. ` +
                `Подход оказался неверным: не повторяй его, а разберись, почему он ломает тесты.`,
            });

            // Снимок отдавать нельзя: он всё ещё описывает исходное
            // состояние, и вторая неудача должна откатывать к нему же.
            continue;
          }

          return {
            status: "needs_input",
            agent: "execution-engine",
            summary: `${comparison.summary} Автоматический откат/повтор уже использован либо его durable-счётчик недоступен.`,
            questions: ["Откатить изменения или продолжить исправление?"],
            data: { missionId: ctx.missionId, steps: history, iterations: i, plan, comparison, regressionRetryUsed },
          };
        }

        /* Рефлексия: опыт должен пережить миссию.
         *
         * Без неё выясненное теряется полностью — следующая миссия по
         * тому же проекту начинает с нуля и наступает на те же грабли.
         *
         * Записывается НЕ пересказ работы, а то, что пригодится потом:
         * какие шаги привели к результату. Пересказ «сделал то, потом
         * это» бесполезен — он и так есть в журнале событий.
         *
         * Сбой записи миссию не роняет: работа уже сделана. */
        await this.reflect(ctx, goal, history, changes.map((c) => c.path), regressionRetryUsed);

        /* Расход миссии — в результат и в карту.
         *
         * Не ради денег: модели бесплатны. Ради измеримости. Измеритель
         * качества отвечает «сколько задач решено» и молчит о том, какой
         * ценой, — а решение 60% за двадцать вызовов хуже решения 55% за
         * шесть. Без этого числа любая правка, добавляющая вызовы, будет
         * выглядеть выигрышной, пока она хоть немного поднимает долю. */
        const usage = ctx.usage?.totals();
        if (usage) await this.note(ctx, "usage.summary", { reason: renderUsage(usage) });

        await this.note(ctx, "mission.completed", { steps: history.length, summary: decision.summary });
        return {
          status: "done",
          agent: "execution-engine",
          summary:
            (decision.summary ?? `Миссия завершена за ${history.length} шаг(ов).`) +
            // Приписка ровно там, где человек читает итог. Без неё
            // «сделано» и «сделано, но проверить не удалось» выглядят
            // одинаково — а это разные вещи.
            (verdict.verified ? "" : ` (UNVERIFIED: ${verdict.reason})`),
          quality: verdict.verified
            ? { status: "verified", gates: [{ name: "checker", status: "passed", detail: verdict.reason }, ...(executionVerified ? [{ name: "tests", status: "passed" as const }] : [])] }
            : { status: "unverified", reason: verdict.reason, gates: [{ name: "checker", status: "blocked", detail: verdict.reason }] },
          data: {
            missionId: ctx.missionId,
            steps: history,
            iterations: i,
            plan,
            check: verdict,
            verified: verdict.verified,
            tests: comparison.summary,
            progress: planProgress(plan),
            usage,
          },
        };
      }

      /* Зацикливание: тот же инструмент с тем же входом трижды.
       *
       * Раньше цикл останавливали только три ОШИБКИ подряд. Повтор
       * УСПЕШНОГО действия не ловился вовсе: агент мог двадцать раз
       * прочитать один файл, сжечь весь бюджет и отчитаться «потолок
       * шагов» — хотя причина была видна на первом же повторе.
       *
       * Не обрываем, а СООБЩАЕМ модели: обрыв на повторе грубее, чем
       * нужно, — модель часто выходит из тупика ровно тогда, когда ей
       * прямо сказали, что она в нём. */
      const loop = detectLoop(
        history.map((h) => ({ tool: h.tool, input: h.input, ok: h.ok })),
        { tool: String(decision.tool), input: decision.input ?? {} },
      );
      if (loop.looping) {
        await this.note(ctx, "loop.detected", { tool: String(decision.tool), reason: loop.reason });
        const inputPath = typeof decision.input?.path === "string" ? decision.input.path : "";
        const hint =
          decision.tool === "read_file" && workingSet.has(inputPath)
            ? " Текст этого файла уже есть в РАБОЧЕМ НАБОРЕ — работай по нему."
            : "";
        history.push({ tool: "loop", input: {}, ok: false, result: loop.reason + hint });
        if (freeLoopWarnings > 0) {
          freeLoopWarnings--;
          i--;
        }
        continue;
      }

      // Модель могла назвать инструмент, которого нет или который недоступен.
      // Это не сбой миссии: возвращаем ей отказ текстом, пусть выберет другой.
      const known = tools.find((t) => t.name === decision.tool);
      if (!known) {
        /* Запрос на необратимое действие ЗАПИСЫВАЕТСЯ.
         *
         * Таблица approvals до сих пор создавалась и пустовала. Теперь у
         * неё есть смысл: в ней видно, что агент ХОТЕЛ сделать, но не
         * смог — открыть PR, удалить файл. Это ровно тот список, по
         * которому потом решают, что разрешить следующим.
         *
         * Инструмент при этом по-прежнему не исполняется: запись — не
         * разрешение. */
        const wanted = TOOL_REGISTRY.find((t) => t.name === decision.tool);
        if (wanted?.risk === "approval") {
          await this.recordApprovalRequest(ctx, String(decision.tool), decision.input ?? {}, decision.reason ?? "");
          await this.note(ctx, "approval.requested", { tool: String(decision.tool), reason: decision.reason });
        }

        history.push({
          tool: String(decision.tool),
          input: decision.input ?? {},
          ok: false,
          result: `Инструмент "${decision.tool}" недоступен. Доступны только: ${tools.map((t) => t.name).join(", ")}.`,
        });
        consecutiveFailures++;
        if (consecutiveFailures >= 3) break;
        continue;
      }

      // Cancellation can arrive while the model is deciding; recheck before effects.
      if (ctx.shouldAbort && (await ctx.shouldAbort())) {
        return {status:"failed",agent:"execution-engine",summary:"Миссия остановлена перед следующим инструментом.",error:"cancelled"};
      }
      const callId = crypto.randomUUID();
      const toolCtx: ExecutionContext = { ...ctx, iteration: i, toolCallId: callId };
      const startedAt = new Date().toISOString();
      await this.note(toolCtx, "tool.started", { tool: known.name, reason: decision.reason, iteration: i });

      try {
        await requireCapability(this.env,ctx.projectId,toolCapability(known.name));
        const stepPath = typeof decision.input?.path === "string" ? decision.input.path : "";
        const mutating = MUTATING_TOOLS.has(known.name) && !!stepPath && !!ctx.projectId;
        // Текст ДО правки — чтобы предупреждать только об ухудшении.
        const before = mutating ? ((await readFile(this.env, ctx.projectId!, stepPath).catch(() => null))?.content ?? null) : null;
        const mayHaveEffects = !["read_file","list_files","search_files","git_diff"].includes(known.name);
        // A mission Worker may outlive a reaped project lock. Put BOTH fence
        // checks inside checkpointTool's work boundary: if the generation
        // changes while a side effect is in flight, the step is persisted as
        // uncertain instead of being falsely recorded as completed.
        const fencedWork = async () => {
          if (mayHaveEffects) {
            if (!lease) throw new Error("Project lease is missing for a mutating mission step.");
            await assertProjectLease(this.env,lease);
          }
          const value=await this.executeTool(known.name, decision.input ?? {}, toolCtx, lease);
          if (mayHaveEffects) await assertProjectLease(this.env,lease!);
          return value;
        };
        const output = await checkpointTool(this.env,ctx.missionId,i,known.name,decision.input??{},fencedWork,mayHaveEffects,callId);
        if(known.name==='connector_call'&&output&&typeof output==='object'&&'approvalRequired'in output&&output.approvalRequired&&'status'in output&&output.status==='prepared') {
          await this.recordToolCall(toolCtx,callId,known.name,"done",decision.input,JSON.stringify(output),null,startedAt);
          return {status:'needs_input',agent:'execution-engine',summary:'Внешнее действие подготовлено. Откройте Подключения → История и ожидающие действия, проверьте параметры и подтвердите. Затем нажмите Продолжить миссию.',data:output};
        }
        const rendered = this.renderResult(output);
        const stepInput = decision.input ?? {};
        let historyText = rendered;
        if (known.name === "read_file" && output && typeof output === "object" && "content" in output) {
          // Текст уходит в рабочий набор; в истории — только факт, без копии.
          const win = output as FileWindow;
          workingSet.remember(win);
          historyText = `строки ${win.fromLine}–${win.toLine} из ${win.totalLines}, в рабочем наборе` + (win.more ? `. ${win.more}` : "");
        } else if (MUTATING_TOOLS.has(known.name) && typeof stepInput.path === "string") {
          // Старое окно после правки лжёт: search по нему даст отказ.
          if (workingSet.invalidate(stepInput.path)) historyText += `\n(файл изменён — убран из рабочего набора, перечитай при нужде)`;
          const after = await readFile(this.env, ctx.projectId!, stepInput.path).catch(() => null);
          const warn = after ? checkEdit(stepInput.path, before, after.content) : null;
          if (warn) {
            historyText += `\n${warn}`;
            await this.note(ctx, "edit.syntax_warning", { path: stepInput.path, warning: warn });
          }
        }
        history.push({ tool: known.name, input: stepInput, ok: true, result: historyText });
        consecutiveFailures = 0;
        // Шаг плана закрывается только по УСПЕШНОМУ вызову. На ошибке
        // план не двигается: иначе прогресс показывал бы движение там,
        // где система топчется на месте.
        if (plan.length) plan = await advancePlan(this.env, ctx.missionId, plan, decision.reason);
        await this.recordToolCall(toolCtx, callId, known.name, "done", decision.input, rendered, null, startedAt);
        await this.note(toolCtx, "tool.finished", { tool: known.name, iteration: i });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        history.push({ tool: known.name, input: decision.input ?? {}, ok: false, result: `Ошибка: ${msg}` });
        consecutiveFailures++;
        await this.recordToolCall(toolCtx, callId, known.name, "failed", decision.input, null, msg, startedAt);
        await this.note(toolCtx, "tool.failed", { tool: known.name, error: msg, iteration: i });
        if (err instanceof UncertainToolError) throw err;

        if (consecutiveFailures >= 3) {
          await this.note(ctx, "mission.failed", { reason: "три ошибки подряд" });
          return {
            status: "failed",
            agent: "execution-engine",
            summary: "Три шага подряд закончились ошибкой — цикл остановлен, чтобы не тратить вызовы впустую.",
            error: msg,
            data: { missionId: ctx.missionId, steps: history },
          };
        }
      }
    }

    // Потолок исчерпан. Это НЕ "done": задача могла остаться недоделанной,
    // и выдавать её за выполненную нельзя.
    await this.note(ctx, "mission.exhausted", { steps: history.length });
    return {
      status: "needs_input",
      agent: "execution-engine",
      summary: `Потолок в ${maxIterations} шаг(ов) исчерпан, задача не закрыта. Ниже — что успел сделать.`,
      questions: ["Продолжить с этого места?"],
      data: { missionId: ctx.missionId, steps: history, exhausted: true },
    };
  }

  /** Один запрос к модели: что делать дальше. */
  /**
   * Прогон тестов в контейнере на файлах рабочей области.
   *
   * Возвращает null, когда прогонять нечем: тестов в проекте нет. Это НЕ
   * ошибка и не провал — придумать команду, которой нет, значит получить
   * «тесты упали» там, где тестов не существует, и заблокировать работу
   * навсегда.
   *
   * Заливка перед каждым прогоном обязательна: замер на устаревшем
   * содержимом даёт ложный результат, то есть ровно то, ради чего
   * проверка фактом и делается, перестаёт работать.
   */
  /** Содержимое рабочей области целиком. Используется для сравнения «до и
   *  после»: список путей без содержимого не показал бы, что файл
   *  переписали, — а это и есть главный интересующий случай. */
  private async readWorkspace(projectId: string): Promise<WorkspaceFile[]> {
    return readMissionWorkspace(this.env, projectId);
  }

  private async runTestsInContainer(projectId: string) {
    return this.toolExecutor.runTestsInContainer(projectId);
  }


  private async decideNextStep(
    goal: string,
    toolList: string,
    history: StepRecord[],
    iteration: number,
    maxIterations: number,
    ctx: ExecutionContext,
    plan: PlanStep[] = [],
    repoMap = "",
    scoutReport = "",
    memoryBlock = "",
    workingSetBlock = "",
  ): Promise<StepDecision> {
    return this.planningEngine.decideNextStep(
      goal, toolList, history, iteration, maxIterations, ctx, plan, repoMap, scoutReport, memoryBlock, workingSetBlock,
    );
  }

  private renderResult(output: unknown): string {
    const text = typeof output === "string" ? output : JSON.stringify(output);
    const LIMIT = 4000;
    return text.length > LIMIT ? `${text.slice(0, LIMIT)}\n…(обрезано, всего ${text.length} символов)` : text;
  }

  /** След вызова в D1. Не роняет миссию, если запись не удалась, но и не
   *  молчит: потерянный след — невидимая дыра в истории. */
  private async recordToolCall(
    ctx: ExecutionContext,
    id: string,
    tool: string,
    status: string,
    input: unknown,
    output: string | null,
    error: string | null,
    startedAt: string,
  ): Promise<void> {
    return this.journal.recordToolCall(ctx, id, tool, status, input, output, error, startedAt);
  }

  /** Записать событие в D1 И показать его вживую. Показ не критичен —
   *  его сбой не должен ронять миссию, поэтому он отдельно в try/catch. */
  /**
   * Построить план миссии одним обращением к модели.
   *
   * Список инструментов даётся специально: план из шагов, которые нечем
   * выполнить, хуже отсутствия плана — он уводит исполнителя в тупик и
   * тратит шаги на попытки сделать невозможное.
   */
  /**
   * Новые шаги взамен негодных.
   *
   * Отличается от buildPlan тем, что видит УЖЕ СДЕЛАННОЕ. Планировать
   * заново с чистого листа бессмысленно: модель повторила бы шаги,
   * которые уже выполнены, и миссия пошла бы по кругу — ровно то, от
   * чего пересборка должна спасать.
   *
   * Потолок шагов — остаток от maxIterations, а не исходное число. План
   * из восьми шагов при трёх оставшихся — это обещание, которое нечем
   * выполнить, и модель будет идти по нему, пока не упрётся в потолок.
   */
  private async replanTitles(
    goal: string,
    toolList: string,
    history: StepRecord[],
    plan: PlanStep[],
    remaining: number,
    ctx: ExecutionContext,
  ): Promise<string[]> {
    return this.planningEngine.replanTitles(goal, toolList, history, plan, remaining, ctx);
  }

  private async buildPlan(
    goal: string,
    toolList: string,
    maxIterations: number,
    ctx: ExecutionContext,
    repoMap = "",
    scoutReport = "",
    memoryBlock = "",
  ): Promise<PlanStep[]> {
    return this.planningEngine.buildPlan(goal, toolList, maxIterations, ctx, repoMap, scoutReport, memoryBlock);
  }

  /**
   * Записать вердикт проверки.
   *
   * Пишутся ВСЕ проверки, включая пройденные. Без отказов в данных
   * нельзя отличить «задачи были простые» от «проверяющий пропускает
   * всё подряд» — а второе означает, что проверка декоративная.
   */
  /**
   * Извлечь урок из завершённой миссии.
   *
   * Записывается ровно один факт — самый полезный. Десять фактов с
   * каждой миссии за месяц превращают память в шум, из которого модель
   * ничего не выберет, и она перестаёт работать как память.
   *
   * Категория "known_issue" для миссий с ошибками по пути, иначе
   * "architecture_decision": то, ЧТО помогло, полезнее того, что делали.
   */
  /**
   * Что из миссии переживёт её саму.
   *
   * Раньше здесь писалась одна строка: «Решено за N шагов через
   * read_file, write_file. По пути мешало: <первая попавшаяся ошибка>».
   * Такой факт бесполезен — он перечисляет очевидное и цитирует ошибку
   * без причины и без места. Вспомнив его через неделю, модель узнавала,
   * что когда-то что-то не получилось, и становилась осторожнее там, где
   * не надо.
   *
   * Правила отбора вынесены в core/reflection.ts и проверяются отдельно:
   * решение «что достойно памяти» важнее, чем механика записи, и не
   * должно было прятаться внутри цикла.
   */
  private async reflect(
    ctx: ExecutionContext,
    goal: string,
    history: { tool: string; ok: boolean; result: string }[],
    changedFiles: string[],
    rolledBack: boolean,
  ): Promise<void> {
    if (!ctx.projectId) return;

    const facts = buildReflection({ goal, history, changedFiles, rolledBack });
    // Пустой список — нормальный ответ: миссия, ничего не изменившая и не
    // встретившая внятной ошибки, ничего и не выяснила. Записать про неё
    // что-нибудь ради заполнения памяти значит разбавить то немногое, что
    // в ней есть смысла.
    if (!facts.length) return;

    try {
      for (const fact of facts) {
        await rememberFact(this.env, ctx.projectId, fact);
      }
      await this.note(ctx, "memory.saved", { reason: `записей: ${facts.length}` });
    } catch (err) {
      log("warn", "reflect.failed", {
        missionId: ctx.missionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Record an exact-payload request in the Unified Approval Engine.
   * Recording is never permission: the autonomous loop still cannot execute
   * approval-risk tools directly. A human decision and a later bounded claim
   * are separate state transitions. */
  private async recordApprovalRequest(
    ctx: ExecutionContext,
    tool: string,
    input: Record<string, unknown>,
    reason: string,
  ): Promise<void> {
    return this.journal.recordApprovalRequest(ctx, tool, input, reason);
  }

  private async recordCheck(ctx: ExecutionContext, attempt: number, passed: boolean, reason: string): Promise<void> {
    return this.journal.recordCheck(ctx, attempt, passed, reason);
  }

  private async note(
    ctx: ExecutionContext,
    event: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    return this.journal.note(ctx, event, data);
  }

}
