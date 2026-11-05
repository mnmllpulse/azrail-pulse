import { readModelPolicy, setModelPolicy, modelBlockReason, FREE_MODEL_SLUGS, ModelPolicyError } from "./lib/model-policy";
import { parseInput, queryObject, errorPayload } from "./lib/validation";
import { BudgetError } from "./unified/ledger";
import { chatSchema, missionStartSchema, missionRefSchema, missionHintSchema, benchSchema, polishSchema, planDraftSchema, conversationPatchSchema, conversationPlanSchema, approvalListQuerySchema, approvalDecisionSchema, backupCreateSchema, backupQuerySchema, backupDeleteQuerySchema, backupRestoreSchema, accountCreateSchema, accountRevokeSchema, permissionSchema, ownershipSchema, streamTicketSchema, metatronControlSchema, faultInjectionSchema, billingUpdateSchema } from "./shared/schemas";
import { readLiveCatalog } from "./lib/model-catalog";
import { backupProject, deleteBackup, restoreBackup } from "./lib/backups";
import { withProjectLock } from "./lib/project-control";
import { quarantineStaleRunningToolReceipts } from "./lib/checkpoints";
import { dispatchOutbox } from "./lib/outbox";
import { reconcileModelCall } from "./lib/billing";
import { authenticate, authorizeRequest, createAccount, requireResource, activeAccount, administrator, AccessError, type Principal } from "./lib/accounts";
import { getAgentByName } from "agents";
import type { Env, TaskRequest, TaskResult, AttachmentRef } from "./types";
import { cleanupSecurityState, reserveDailyQuota, positiveLimit } from "./lib/quota";
import { enforceOperationLimit } from "./lib/operation-limit";
import { readBoundedBody, BodyLimitError, validateJsonObject } from "./lib/request-body";
import { getCors } from "./lib/cors";
import { Orchestrator } from "./agents/orchestrator";
import { forgetFact, listFacts, type MemoryCategory } from "./lib/memory-agent";
import { listVersions, restoreVersion } from "./lib/versions";
import { handleUpload } from "./lib/upload";
import { describeRegistry, allCapabilities } from "./lib/agent-registry";
import { describeTools } from "./lib/tool-registry";
import { addMessage, deleteConversation, ensureConversation, listMessages, updateConversationMeta } from "./lib/chat-store";
import { parsePlanDraft } from "./lib/assignment-plan";
import { listMissionEvents } from "./lib/event-store";
import { listProjectEvents, listTraceEvents } from "./lib/event-stream";
import { MODEL_REGISTRY, findModel, providerIcon } from "./lib/model-registry";
import { clampIterations } from "./lib/mission-limits";
import { loadMissionDelivery } from "./lib/mission-delivery";
import { metatronSnapshot, retryFailedStep, saveMissionControlIntent, simulateMissionFault, type FaultScenario } from "./lib/metatron-ops";
import { extractText, runModel } from "./lib/model-router";
import { UsageLedger } from "./lib/usage";
import { checkRateLimit } from "./lib/auth";
import { chargeWrites, estimateMissionWrites } from "./lib/write-budget";
import { validateAgainstCanon, summarizeCanon } from "./lib/canon-check";
import { loadAttachments, attachmentsToText } from "./lib/attachments";
import { log } from "./lib/resilience";
import {
  MAX_PENDING_HINTS,
  isTerminal,
  reapStaleMissions,
  requestCancel,
  requestPause,
  requestTerminate,
  sendHint,
} from "./lib/mission-state";
import { issueTicket, redeemTicket } from "./lib/ws-ticket";
import { readKey as idemKey } from "./lib/idempotency";
import { createMission } from "./lib/mission-concurrency";
import { claimMission, finishAdmission } from "./lib/mission-admission";
import { SEED_CASES } from "./bench/cases";
import { runBench } from "./bench/runner";
import { listRuns, loadOutcomes, saveRun } from "./bench/store";
import { runInContainer, detectBackend } from "./core/sandbox";
import { syncWorkspaceToSandbox } from "./core/workspace-sync";
import { previewR2GarbageCollection, parseR2GcRequest } from "./lib/r2-gc";
import { previewRetention, parseRetentionPreviewRequest } from "./lib/retention-preview";
import { BUILD_VERSION } from "./build-info";
import {
  approvalDigest,
  claimApproval,
  completeApproval,
  decideApproval,
  getApproval,
  listApprovals,
  requestApproval,
} from "./lib/approval-engine";
import type { ApprovalStatus } from "./lib/approval-types";
import { childTrace, listTraceLinks, requestTrace, traceLog, type TraceContext } from "./lib/observability-context";
import { projectRoute } from "./unified/projects";
import { webWorkbenchRoute } from "./unified/web-workbench";
import { publishedSiteResponse } from "./lib/web-sites";

export { Orchestrator };

// Дочерние агенты ОБЯЗАНЫ быть экспортированы отсюда: subAgent() ищет класс
// в ctx.exports по его имени (`ctx.exports[cls.name]`) и, не найдя, бросает
// "Sub-agent class ... not found in worker exports".
//
// Имена экспортов должны в точности совпадать с именами классов — SDK
// сопоставляет именно по cls.name, поэтому переименование экспорта здесь
// сломает подъём агента в рантайме, не сломав при этом сборку.
//
// Отдельных записей в [[migrations]] им не требуется: subAgent поднимает их
// как facets внутри Orchestrator, а не как самостоятельные Durable Objects.
// Класс песочницы. НЕ прямой реэкспорт из пакета: наш подкласс применяет
// объявленные лимиты (см. core/azrail-sandbox.ts), иначе SANDBOX_LIMITS
// остаётся документацией, а поведением правит чужое умолчание.
// Wrangler ищет класс по имени из [[containers]].class_name.
export { Sandbox } from "./core/azrail-sandbox";

export { AnswerAgent } from "./agents/answer-agent";
export { ArchitectAgent } from "./agents/architect-agent";
export { CodeAgent } from "./agents/code-agent";
export { UiAgent } from "./agents/ui-agent";
export { GitAgent } from "./agents/git-agent";
export { DeployAgent } from "./agents/deploy-agent";
export { SecurityAgent } from "./agents/security-agent";
export { QaAgent } from "./agents/qa-agent";
export { EvolutionAgent } from "./agents/evolution-agent";

/** Потолок тела для /api/task. Файлы идут через /api/upload, здесь только JSON. */
const MAX_TASK_BODY_BYTES = 1024 * 1024;

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getCors(env, { "Content-Type": "application/json" }),
  });
}

function withTraceHeaders(response: Response, trace: TraceContext): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", trace.requestId);
  headers.set("X-Trace-Id", trace.traceId);
  const exposed = headers.get("Access-Control-Expose-Headers");
  headers.set("Access-Control-Expose-Headers", [exposed, "X-Request-Id", "X-Trace-Id"].filter(Boolean).join(", "));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const ingressTrace = requestTrace(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCors(env) });
    }

    // НАЙДЕНО ПРИ АУДИТЕ: до этой правки try/catch стоял только в четырёх
    // локальных местах (парсинг тела /api/task, /api/upload, DELETE памяти,
    // восстановление версии). Всё остальное — /api/history, /api/memory GET,
    // сам /api/upload изнутри lib/upload.ts (R2.put ничем не накрыт) — при
    // непойманном throw улетало бы наружу как голая ошибка платформы
    // Cloudflare без единой строки в структурных логах и без JSON-ответа,
    // которого ждёт клиент. Общая сетка ниже не меняет поведение уже
    // обработанных путей — она ловит только то, что раньше не ловилось нигде.
    try {
      const path = new URL(request.url).pathname;
      const key = path === "/api/mission" && request.method === "POST" ? idemKey(request) : "";
      if (key) {
        const auth = await authenticate(request, env);
        if (!auth.ok) return json({error:auth.error},env,auth.status ?? 401);
        let raw: string;
        try {
          raw = new TextDecoder().decode(await readBoundedBody(request, MAX_TASK_BODY_BYTES));
          validateJsonObject(JSON.parse(raw));
        } catch (err) {
          return json({error:err instanceof Error ? err.message : "Некорректный JSON."},env,err instanceof BodyLimitError ? 413 : 400);
        }
        await authorizeRequest(env,auth.principal!,request,JSON.parse(raw));
        const admission = await claimMission(env, `${auth.caller}:${key}`, raw);
        if (admission.kind === "replay") return new Response(admission.body, {
          status:admission.status, headers:getCors(env,{"Content-Type":"application/json", "Idempotency-Replayed":"true"}),
        });
        if (admission.kind !== "claimed") return json({
          error:admission.kind === "conflict" ? "Этот Idempotency-Key уже использован с другим содержимым." : "Запрос уже принят и обрабатывается; повторите позже с тем же ключом.",
          code:admission.kind === "conflict" ? "idempotency_conflict" : "idempotency_pending",
        },env,409);
        const response = withTraceHeaders(await handleRequest(new Request(request,{body:raw}),env,ingressTrace), ingressTrace);
        try { await finishAdmission(env,`${auth.caller}:${key}`,admission.claim,response); }
        catch (err) { log("error","admission.finalize_failed",{error:err instanceof Error ? err.message : String(err)}); }
        return response;
      }
      return withTraceHeaders(await handleRequest(request, env, ingressTrace), ingressTrace);
    } catch (err) {
      if (err instanceof URIError) return json({error:"Некорректная кодировка пути."},env,400);
      if (err instanceof AccessError) return json(errorPayload(err,"Ошибка доступа."),env,err.status);
      if (err instanceof BudgetError) return json({error:err.message||"Лимит моделей на сегодня исчерпан.",code:"provider_daily_limit"},env,429);
      log("error", "fetch.uncaught", {
        path: new URL(request.url).pathname,
        method: request.method,
        error: err instanceof Error ? err.message : String(err),
        ...traceLog(ingressTrace),
      });
      return withTraceHeaders(json({ error: "Внутренняя ошибка." }, env, 500), ingressTrace);
    }
  },

  /**
   * КРОН: сборщик зависших миссий.
   *
   * Нужен именно потому, что миссия теперь идёт в фоне. Durable Object
   * можно выселить, инстанс — перезапустить, запланированную задачу —
   * не доставить. Любой из этих случаев оставляет строку в "executing"
   * навсегда, и интерфейс вечно показывает работу, которой давно нет.
   * Сама остановленная миссия о себе не сообщит — сообщить некому.
   *
   * Расписание — в wrangler.toml, [triggers].
   */
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          await cleanupSecurityState(env);
          await dispatchOutbox(env);
          const { reaped } = await reapStaleMissions(env);
          const receipts = await quarantineStaleRunningToolReceipts(env);
          log("info", "cron.reaper_done", { cron: event.cron, reaped, quarantinedToolReceipts: receipts.quarantined });
        } catch (err) {
          log("error", "cron.reaper_failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;

async function handleRequest(request: Request, env: Env, ingressTrace?: TraceContext): Promise<Response> {
    const url = new URL(request.url);
    const trace = ingressTrace ?? requestTrace(request);
    let principal: Principal = administrator;
    let parsedBody: Record<string, unknown> = {};
    // SDK RPC bypasses application validation and budgets. Only /api/stream is public transport.
    if (url.pathname === "/agents" || url.pathname.startsWith("/agents/")) {
      return json({ error: "Прямой доступ к агентам отключён." }, env, 404);
    }


    if (url.pathname === "/health") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status ?? 401);
      // Раньше здесь проверялось только наличие биндинга (`!!env.AZRAIL_D1`) —
      // это показывало "всё зелено" даже когда D1 недоступна. Теперь делается
      // реальный round-trip к каждому сервису.
      const check = async (name: string, probe: () => Promise<unknown>) => {
        const t0 = Date.now();
        try {
          await probe();
          return { name, status: "ok" as const, ms: Date.now() - t0, error: null };
        } catch (err) {
          return {
            name,
            status: "error" as const,
            ms: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      };

      const services = await Promise.all([
        env.AZRAIL_D1
          ? check("d1", () => env.AZRAIL_D1.prepare("SELECT 1").all())
          : Promise.resolve({ name: "d1", status: "absent" as const, ms: null, error: null }),
        env.AZRAIL_KV
          ? check("kv", () => env.AZRAIL_KV.get("__healthcheck__")) // отсутствие ключа — не ошибка, важен сам ответ
          : Promise.resolve({ name: "kv", status: "absent" as const, ms: null, error: null }),
        env.AZRAIL_R2
          ? check("r2", () => env.AZRAIL_R2.head("__healthcheck__"))
          : Promise.resolve({ name: "r2", status: "absent" as const, ms: null, error: null }),
      ]);

      // AI/Vectorize/Queue намеренно не пробуем: вызов модели ради health-check
      // стоит денег и времени, а put в очередь порождал бы мусорные сообщения.
      // Для них честнее показать наличие биндинга и так и назвать это.
      const bindingsOnly = {
        ai: !!env.AI ? "bound" : "absent",
        vectorize: !!env.AZRAIL_VECTORIZE ? "bound" : "absent",
        queue: !!env.AZRAIL_QUEUE ? "bound" : "absent",
      };

      const degraded = services.some((s) => s.status !== "ok");
      return json(
        {
          system: "AZRAIL OS",
          version: BUILD_VERSION,
          status: degraded ? "degraded" : "healthy",
          services, // реально проверены round-trip'ом
          bindings: bindingsOnly, // только наличие биндинга, не проверка работоспособности
          agents: describeRegistry().length,
          timestamp: new Date().toISOString(),
        },
        env,
        degraded ? 503 : 200,
      );
    }

    if (url.pathname.startsWith("/s/")) {
      const published = await publishedSiteResponse(env, request);
      if (published) return published;
    }

    // ─── Граница защиты ───────────────────────────────────────────────
    // Всё, что ниже, тратит деньги (модели) или раскрывает данные проекта.
    // Проверка стоит ОДНИМ местом, а не в каждом роуте.
    //
    // ВАЖНО: ни один защищённый роут не должен обрабатываться ВЫШЕ этого
    // блока. Здесь уже была ровно такая ошибка — /api/agents отвечал раньше
    // проверки и по факту был открыт, хотя числился в списке защищённых.
    // Тест в tests/regressions.test.ts ("Регрессия: порядок роутов и
    // защита") следит, чтобы это не повторилось. Раньше здесь была ссылка
    // на несуществующий tests/routes.test.ts — файла с таким именем в
    // проекте нет, тест живёт в общем регрессионном файле.
    const isProtected =
      url.pathname.startsWith("/api/") ||
      url.pathname === "/api/task" ||
      url.pathname === "/api/upload" ||
      url.pathname === "/api/agents" ||
      url.pathname === "/api/selftest" ||
      url.pathname === "/api/models" ||
      url.pathname === "/api/tools" ||
      url.pathname === "/api/chat" ||
      url.pathname === "/api/mission" ||
      url.pathname === "/api/conversations" ||
      url.pathname === "/api/polish" ||
      url.pathname === "/api/stream" ||
      url.pathname === "/api/stream/ticket" ||
      // Остановка миссии — тоже платный контур: она меняет состояние
      // чужой работы, и открывать её было бы способом гасить чужие
      // миссии, зная один только идентификатор.
      url.pathname === "/api/mission/cancel" ||
      url.pathname === "/api/mission/hint" ||
      url.pathname === "/api/bench" ||
      url.pathname.startsWith("/api/projects/");

    if (isProtected) {
      /* Билет вместо токена — только для рукопожатия WebSocket.
       *
       * Конструктор WebSocket в браузере не даёт выставить заголовок
       * Authorization, поэтому единственный канал там — строка запроса. А
       * строка запроса оседает в логах Cloudflare, в истории браузера и в
       * Referer, и класть туда ПОСТОЯННЫЙ токен от всех платных
       * эндпоинтов — значит раздать его насовсем.
       *
       * Билет годен минуту и один раз (см. lib/ws-ticket.ts): утечь он
       * может так же легко, но постоянный токен в query больше не принимается.
       * Старые клиенты должны использовать Authorization или одноразовый билет. */
      const ticket = url.pathname === "/api/stream" ? url.searchParams.get("ticket") : null;
      const auth = ticket
        ? await (async () => {
            const stored = await redeemTicket(env, ticket);
            let data: {account:string;project:string} | null = null;
            try { data=stored?JSON.parse(stored):null; } catch { /* old tickets expire within a minute */ }
            const account=data?await activeAccount(env,data.account):null;
            const caller=account && data?.project===(url.searchParams.get("projectId")??"default") ? account.id : null;
            if(account && caller) { await requireResource(env,account,"project",data!.project); principal=account; }
            return caller
              ? { ok: true as const, caller, principal }
              : { ok: false as const, status: 401, error: "Билет недействителен или уже использован." };
          })()
        : await authenticate(request, env);
      if (!auth.ok) {
        log("warn", "auth.rejected", { path: url.pathname, status: auth.status, ...traceLog(trace) });
        return json({ error: auth.error }, env, auth.status ?? 401);
      }

      principal = auth.principal ?? principal;
      // Лимит — на всё, что реально запускает модели. Раньше здесь стоял
      // только /api/task, и это была дыра: /api/mission прогоняет ЦИКЛ до
      // двадцати вызовов модели, а лимита на нём не было вовсе. Самый
      // дорогой путь оказывался единственным неограниченным.
      //
      // Стоимость разная, потому что расход разный. Миссия списывается по
      // заявленному потолку шагов, а не по факту: списать после выполнения
      // — значит сначала потратить, потом узнать, что было нельзя.
      const MODEL_ROUTES: Record<string, number> = {
        "/api/task": 1,
        "/api/polish": 1,
        "/api/mission": 0, // считается ниже по maxIterations
        // /api/chat — отдельный дневной лимит CHAT_DAILY_LIMIT ниже
      };
      // Bound actual streamed bytes before parsing or cloning, not only Content-Length.
      if ((request.method === "POST" || request.method === "PATCH") && url.pathname !== "/api/upload") {
        try {
          const bodyLimit = url.pathname.match(/^\/api\/projects\/[^/]+\/workbench\/files$/) ? 2 * 1024 * 1024 : MAX_TASK_BODY_BYTES;
          const bytes = await readBoundedBody(request, bodyLimit);
          const raw = bytes.length ? new TextDecoder().decode(bytes) : "{}";
          parsedBody=JSON.parse(raw);
          validateJsonObject(parsedBody);
          request = new Request(request, { body: raw });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Некорректный JSON." }, env,
            err instanceof BodyLimitError ? 413 : 400);
        }
      }
      await authorizeRequest(env,principal,request,parsedBody);
      if (request.method === "POST" && (url.pathname === "/api/chat" || url.pathname === "/api/plan")) await enforceOperationLimit(env, "chat", auth.caller ?? "shared");
      if (request.method === "POST" && url.pathname.startsWith("/api/admin/")) await enforceOperationLimit(env, "admin", principal.id);
      if (request.method === "POST" && (url.pathname === "/api/chat" || url.pathname === "/api/plan")) {
        const daily = await reserveDailyQuota(
          env,
          auth.caller ?? "shared",
          1,
          positiveLimit(env.CHAT_DAILY_LIMIT, 200),
        );
        if (!daily.allowed) {
          log("warn", "chat.daily_limit", { caller: auth.caller, used: daily.used, limit: daily.limit, ...traceLog(trace) });
          return json(
            { error: "Дневной лимит. Завтра снова.", code: "chat_daily_limit", used: daily.used, limit: daily.limit, resetAt: daily.resetAt },
            env,
            429,
          );
        }
      } else if (request.method === "POST" && url.pathname in MODEL_ROUTES) {
        let cost = MODEL_ROUTES[url.pathname];
        if (url.pathname === "/api/mission") {
          // Тело нужно прочитать заранее, чтобы узнать потолок шагов.
          // Request можно прочитать один раз, поэтому дальше по коду идёт
          // клон — иначе роут получил бы уже опустошённый поток.
          const peek = await request.clone().json().catch(() => ({}) as { maxIterations?: number });
          cost = clampIterations((peek as { maxIterations?: number }).maxIterations);
        }
        const rl = await checkRateLimit(env, auth.caller ?? "shared", cost);
        if (!rl.allowed) {
          log("warn", "ratelimit.exceeded", { caller: auth.caller, used: rl.used, limit: rl.limit, ...traceLog(trace) });
          return json(
            {
              error: `Лимит исчерпан: ${rl.used} из ${rl.limit} задач в час. Сбросится в ${new Date(rl.resetAt).toISOString()}.`,
              used: rl.used,
              limit: rl.limit,
              resetAt: rl.resetAt,
            },
            env,
            429,
          );
        }
      }
    }

    if (url.pathname === "/api/routing-settings" && request.method === "GET") {
      const policy = await readModelPolicy(env);
      const month = `paid-month:${new Date().toISOString().slice(0,7)}`;
      const spend = await env.AZRAIL_D1.prepare("SELECT spent_micro_usd FROM spend_limits WHERE scope=?").bind(month).first<{spent_micro_usd:number}>();
      return json({policy, gatewayConfigured:!!env.AI_GATEWAY_ID, workersPlan:env.AZRAIL_WORKERS_PLAN??"unknown",
        committedUsd:(spend?.spent_micro_usd??0)/1e6, month:month.slice(11),
        note:"OFF блокирует платные маршруты AZRAIL. Квоты Workers, R2 и других сервисов учитываются отдельно."},env);
    }
    if (url.pathname === "/api/admin/routing-settings" && request.method === "POST") {
      try { return json({policy:await setModelPolicy(env,parsedBody.allowThirdPartyModels,parsedBody.monthlyBudgetUsd)},env); }
      catch (e) { if(e instanceof ModelPolicyError) return json({error:e.message},env,400); throw e; }
    }
    if (url.pathname === "/api/model-catalog" && request.method === "GET") {
      return json(await readLiveCatalog(env),env);
    }
    if(url.pathname === "/api/admin/retention-preview" && request.method === "GET") {
      try {
        const options=parseRetentionPreviewRequest(url);
        return json(await previewRetention(env,options),env);
      } catch(error) {
        return json({error:error instanceof Error?error.message:String(error)},env,400);
      }
    }
    if(url.pathname === "/api/admin/r2-gc" && request.method === "GET") {
      try {
        const options=parseR2GcRequest(url);
        return json(await previewR2GarbageCollection(env,options),env);
      } catch(error) {
        return json({error:error instanceof Error?error.message:String(error)},env,400);
      }
    }
    if(url.pathname === "/api/admin/billing" && request.method === "GET") {
      const limits=await env.AZRAIL_D1.prepare("SELECT * FROM spend_limits ORDER BY scope LIMIT 100").all();
      const prices=await env.AZRAIL_D1.prepare("SELECT * FROM model_prices ORDER BY model LIMIT 200").all();
      const unresolved=await env.AZRAIL_D1.prepare(`SELECT id,scope,model,status,started_at,finished_at,reserved_micro_usd,actual_micro_usd,error
        FROM model_calls WHERE status IN ('uncertain','unpriced') ORDER BY started_at DESC LIMIT 100`).all();
      return json({limits:limits.results,prices:prices.results,unresolved:unresolved.results,mode:env.AZRAIL_METERING??"off"},env);
    }
    if(url.pathname === "/api/admin/billing" && request.method === "POST") {
      parseInput(billingUpdateSchema,parsedBody);
      if(parsedBody.reconcileCallId) {
        try {
          return json({reconciled:await reconcileModelCall(env,String(parsedBody.reconcileCallId),Number(parsedBody.actualMicroUsd),String(parsedBody.evidence??''))},env);
        } catch(error) {
          return json({error:error instanceof Error?error.message:String(error)},env,409);
        }
      }
      if(parsedBody.model) {
        const input=Number(parsedBody.inputRate),output=Number(parsedBody.outputRate);
        if(!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input<0||output<0||input>1e12||output>1e12) return json({error:"Тарифы задаются в micro-USD за миллион токенов, от 0 до 1e12."},env,400);
        await env.AZRAIL_D1.prepare("INSERT INTO model_prices VALUES(?,?,?,?) ON CONFLICT(model) DO UPDATE SET input_micro_usd_per_million=excluded.input_micro_usd_per_million,output_micro_usd_per_million=excluded.output_micro_usd_per_million,updated_at=excluded.updated_at").bind(String(parsedBody.model),input,output,Date.now()).run();
      } else {
        const usd=Number(parsedBody.usd),scope=String(parsedBody.scope??"global");
        if(!Number.isFinite(usd)||usd<=0||usd>1000||scope.length>256)return json({error:"Допустимый бюджет: больше 0, до 1000 USD; область до 256 символов."},env,400);
        await env.AZRAIL_D1.prepare("INSERT INTO spend_limits(scope,limit_micro_usd) VALUES(?,?) ON CONFLICT(scope) DO UPDATE SET limit_micro_usd=excluded.limit_micro_usd").bind(scope,Math.floor(usd*1e6)).run();
      }
      return json({success:true,mode:env.AZRAIL_METERING??"off"},env);
    }
    if(url.pathname === "/api/admin/ownership" && request.method === "POST") {
      const {kind,resourceId:id,accountId:account}=parseInput(ownershipSchema,parsedBody);
      if(!await activeAccount(env,account))return json({error:"Неверный владелец или тип ресурса."},env,400);
      await env.AZRAIL_D1.prepare("INSERT INTO resource_owners VALUES(?,?,?) ON CONFLICT(kind,resource_id) DO UPDATE SET account_id=excluded.account_id").bind(kind,id,account).run();
      return json({success:true},env);
    }
    if(url.pathname === "/api/metrics" && request.method === "GET") {
      const project=url.searchParams.get("projectId");
      if(!project)return json({error:"projectId обязателен."},env,400);
      const missions=await env.AZRAIL_D1.prepare("SELECT status,COUNT(*) AS count FROM missions WHERE project_id=? GROUP BY status").bind(project).all();
      const calls=await env.AZRAIL_D1.prepare("SELECT COUNT(*) AS calls,SUM(prompt_tokens) AS input_tokens,SUM(completion_tokens) AS output_tokens,SUM(actual_micro_usd) AS measured_micro_usd,SUM(CASE WHEN actual_micro_usd IS NULL THEN 1 ELSE 0 END) AS unknown_cost_calls,AVG(finished_at-started_at) AS mean_ms FROM model_calls WHERE scope=? OR scope IN (SELECT 'mission:'||id FROM missions WHERE project_id=?)").bind(`project:${project}`,project).first();
      return json({missions:missions.results,models:calls,metering:env.AZRAIL_METERING??"off"},env);
    }
    if(url.pathname === "/api/approvals" && request.method === "GET") {
      const query = parseInput(approvalListQuerySchema, queryObject(url));
      const approvals = await listApprovals(env,{
        accountId: principal.role === "admin" ? undefined : principal.id,
        projectId: query.projectId,
        missionId: query.missionId,
        status: query.status as ApprovalStatus | undefined,
        limit: query.limit,
      });
      return json({approvals},env);
    }
    const approvalItem = url.pathname.match(/^\/api\/approvals\/([^/]+)$/);
    if(approvalItem && request.method === "GET") {
      const approval = await getApproval(env,decodeURIComponent(approvalItem[1]));
      if(!approval || (principal.role !== "admin" && approval.account_id !== principal.id)) return json({error:"Approval не найден."},env,404);
      const receipts = (await env.AZRAIL_D1.prepare("SELECT event_type,actor,payload_digest,detail_json,created_at FROM approval_receipts WHERE approval_id=? ORDER BY created_at").bind(approval.id).all()).results;
      return json({approval,receipts},env);
    }
    const approvalDecision = url.pathname.match(/^\/api\/approvals\/([^/]+)\/decision$/);
    if(approvalDecision && request.method === "POST") {
      const input = parseInput(approvalDecisionSchema, parsedBody);
      const approval = await decideApproval(env,{
        id:decodeURIComponent(approvalDecision[1]),
        actor:`account:${principal.id}`,
        decision:input.decision,
        reason:input.reason,
        expectedDigest:input.payloadDigest,
      });
      return json({approval},env);
    }

    if(url.pathname === "/api/backups" && request.method === "POST") {
      const project=parseInput(backupCreateSchema,parsedBody).projectId;
      return json(await backupProject(env,project),env,201);
    }
    if(url.pathname === "/api/backups" && request.method === "GET") {
      const project=parseInput(backupQuerySchema,queryObject(url)).projectId;
      return json({backups:(await env.AZRAIL_D1.prepare("SELECT id,created_at,file_count FROM backup_manifests WHERE project_id=? ORDER BY created_at DESC LIMIT 50").bind(project).all()).results},env);
    }
    if(url.pathname === "/api/backups" && request.method === "DELETE") {
      const {projectId:project,backupId}=parseInput(backupDeleteQuerySchema,queryObject(url));
      return json(await deleteBackup(env,project,backupId),env);
    }
    if(url.pathname === "/api/backups/restore" && request.method === "POST") {
      const restoreInput=parseInput(backupRestoreSchema,parsedBody);
      const project=restoreInput.projectId,target=restoreInput.targetProjectId,backupId=restoreInput.backupId;
      const payloadDigest=await approvalDigest({projectId:project,targetProjectId:target,backupId});
      const scopeId=`${project}:${backupId}:${target}`;
      const approvalId=restoreInput.approvalId??"";
      if(!approvalId){
        const approval=await requestApproval(env,{accountId:principal.id,projectId:project,actionType:"restore",risk:"critical",scopeType:"backup_restore",scopeId,payloadDigest,summary:`Восстановить backup ${backupId} проекта ${project} в новый проект ${target}`,requestedBy:`account:${principal.id}`,trace});
        return json({error:"Нужно отдельное подтверждение восстановления.",approvalRequired:true,approval},env,409);
      }
      await claimApproval(env,{id:approvalId,actionType:"restore",scopeType:"backup_restore",scopeId,payloadDigest,actor:`restore:${principal.id}`});
      try {
        await requireResource(env,principal,"project",target,true);
        const restored=await restoreBackup(env,project,backupId,target,childTrace(trace,{approvalId}));
        await completeApproval(env,{id:approvalId,actor:`restore:${principal.id}`,outcome:"executed",detail:{restored:restored.restored,target}});
        return json(restored,env);
      } catch(error) {
        await completeApproval(env,{id:approvalId,actor:`restore:${principal.id}`,outcome:"failed",detail:{error:error instanceof Error?error.message:String(error)}}).catch(()=>{});
        throw error;
      }
    }

    if(url.pathname === "/api/me" && request.method === "GET") return json({account:principal},env);
    { const response=await webWorkbenchRoute(request,env,principal,trace); if(response) return new Response(response.body,{status:response.status,statusText:response.statusText,headers:getCors(env,response.headers)}); }
    { const response=await projectRoute(request,env,principal); if(response) return new Response(response.body,{status:response.status,statusText:response.statusText,headers:getCors(env,response.headers)}); }
    if(url.pathname === "/api/admin/accounts" && request.method === "POST") {
      const accountInput=parseInput(accountCreateSchema,parsedBody);
      const account=await createAccount(env,accountInput.name,accountInput.role,accountInput.days);
      return json({account},env,201);
    }
    if(url.pathname === "/api/admin/accounts" && request.method === "GET") {
      return json({accounts:(await env.AZRAIL_D1.prepare("SELECT id,name,role,expires_at,disabled FROM access_accounts").all()).results},env);
    }
    if(url.pathname === "/api/admin/accounts/revoke" && request.method === "POST") {
      await env.AZRAIL_D1.prepare("UPDATE access_accounts SET disabled=1 WHERE id=?").bind(parseInput(accountRevokeSchema,parsedBody).accountId).run();
      return json({success:true},env);
    }
    if(url.pathname === "/api/admin/permissions" && request.method === "POST") {
      const permission=parseInput(permissionSchema,parsedBody);
      const project=permission.projectId,capability=permission.capability;
      const sql=permission.enabled===true?"INSERT OR IGNORE INTO project_permissions(project_id,capability) VALUES(?,?)":"DELETE FROM project_permissions WHERE project_id=? AND capability=?";
      await env.AZRAIL_D1.prepare(sql).bind(project,capability).run();return json({success:true},env);
    }

    /* Билет на подключение к потоку. Выдаётся по обычному токену в
     * заголовке, живёт минуту и гасится при первом использовании —
     * см. lib/ws-ticket.ts про то, почему постоянному токену не место
     * в строке запроса. */
    if (url.pathname === "/api/stream/ticket" && request.method === "POST") {
      const project=parseInput(streamTicketSchema,parsedBody).projectId;
      const issued = await issueTicket(env, JSON.stringify({account:principal.id,project}));
      return json({ success: true, ...issued }, env);
    }

    if (url.pathname === "/api/stream") {
      // Апгрейд до WebSocket — GET-запрос со спецзаголовком, не отдельный
      // метод. Здесь минимальная проверка формы запроса; сам апгрейд и
      // onConnect/onMessage/onClose делает SDK внутри Orchestrator.fetch().
      if (request.headers.get("Upgrade") !== "websocket") {
        return json({ error: "Этот путь только для WebSocket-подключения (заголовок Upgrade: websocket)." }, env, 426);
      }
      const instanceName = url.searchParams.get("projectId") ?? "default";
      const orchestrator = await getAgentByName(env.Orchestrator, instanceName);
      const forwarded=new Request(request);
      forwarded.headers.set("X-Azrail-Account",principal.id);
      forwarded.headers.set("X-Azrail-Project",instanceName);
      return orchestrator.fetch(forwarded);
    }

    if (url.pathname === "/api/models" && request.method === "GET") {
      const policy = await readModelPolicy(env);
      // Список для выпадающего меню в интерфейсе. Раньше слаг вводился
      // руками — опечатка выяснялась только при падении задачи.
      // Отдаём ровно то, что нужно для выбора: сам слаг, кто сделал, класс.
      // Ключей и внутренних причин выбора здесь нет.
      return json(
        {
          success: true,
          models: MODEL_REGISTRY.map((m) => ({
            slug: m.slug,
            provider: m.provider,
            tier: m.tier,
            capabilities: m.capabilities,
            // Путь к статической иконке провайдера (public/icons/), либо null.
            icon: providerIcon(m.provider) ?? null,
            // Окно контекста для карточки модели. null = не проверено,
            // интерфейс тогда просто не показывает цифру.
            contextWindow: m.contextWindow ?? null,
            // Модель, требующая Gateway, без AI_GATEWAY_ID не заработает —
            // интерфейс должен показать это ДО выбора, а не после ошибки.
            available: !modelBlockReason(m,policy,env),
            blockedReason: modelBlockReason(m,policy,env),
            freeAllowlisted: FREE_MODEL_SLUGS.has(m.slug),
          })),
        },
        env,
      );
    }

    if (url.pathname === "/api/tools" && request.method === "GET") {
      // Что AZRAIL умеет прямо сейчас. `available` здесь означает «есть
      // рабочий адаптер», а не «запланировано» — см. lib/tool-registry.ts.
      return json({ success: true, tools: describeTools(env) }, env);
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      // Owner/admin phase: full Chat + models for product testing. Public Free/Pro later.
      if (principal.role !== "admin" && !principal.operator) {
        return json({ error: "Chat пока открыт только владельцу.", code: "chat_owner_only" }, env, 403);
      }
      const body = parseInput(chatSchema, await request.json());
      let message = body.message;
      if (body.attachments?.length) {
        message += attachmentsToText(await loadAttachments(env, body.attachments as AttachmentRef[]));
      }

      const cid = body.conversationId ?? body.projectId ?? crypto.randomUUID();
      await ensureConversation(env, cid, body.projectId);
      // Prior turns only — current user line is added after, so the model
      // sees the same thread memory a person expects in a real chat.
      // Drop platform/error lines so a failed Whisper pick or budget miss
      // cannot poison the next greeting into a "can't talk" refusal.
      const errorish=/лимит ресурсов|не найдена в реестре|Ни одна модель|Модель недоступна|технические ограничения|не могу поддерживать диалог|Попытки:|Дневная квота|пустой ответ|семёрки Workers Paid|10 000 нейронов/i;
      const prior = ((await listMessages(env, cid, 40)) as Array<{ role?: string; content?: string }>)
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .filter((m) => !(m.role === "assistant" && errorish.test(String(m.content))))
        .map((m) => ({ role: String(m.role), content: String(m.content) }))
        .slice(-20);
      await addMessage(env, cid, "user", message, body.parentMessageId);

      // Chat only accepts registered text models. Invalid sticky picks (Whisper,
      // image, unknown slug) fall back to Auto instead of hard-failing the turn.
      let preferredModel=body.preferredModel;
      if(preferredModel){
        const pinned=findModel(preferredModel);
        const chatOk=!!pinned&&pinned.capabilities.some((c)=>["text_generation","reasoning","coding","tool_calling","vision"].includes(c));
        if(!chatOk){
          log("warn","chat.preferred_ignored",{preferredModel,reason:pinned?"not_chat_capable":"not_in_registry",...traceLog(trace)});
          preferredModel=undefined;
        }
      }

      const orchestrator = await getAgentByName(env.Orchestrator, body.projectId ?? "default");
      // Аннотация типа обязательна: через RPC-стаб Durable Object возвращаемый
      // тип схлопывается в never, и без неё сборка падает восемью ошибками
      // подряд на обращениях к полям результата.
      // intent:answer — разговор, не миссия/скан проекта.
      const result: TaskResult = await orchestrator.handleTask({
        projectId: body.projectId,
        conversationId: cid,
        parentMessageId: body.parentMessageId,
        inputType: "text",
        intent: "answer",
        message,
        payload: message,
        conversationHistory: prior,
        preferredModel,
        voice: body.voice,
        _requestId: trace.requestId,
        _traceId: trace.traceId,
      });

      const assistantId = await addMessage(
        env,
        cid,
        "assistant",
        result.error ?? result.summary,
        body.parentMessageId,
      );
      // Persist-then-reply: keep HTTP 200 when the turn was stored so the UI
      // can show the model/budget error inside the thread instead of a bare 500.
      const failed = result.status === "failed";
      const budget = /лимит ресурсов|лимит моделей|budget/i.test(`${result.error??""} ${result.summary??""}`);
      return json(
        {
          success: !failed,
          conversationId: cid,
          assistantMessageId: assistantId,
          result,
          ...(failed ? { error: result.error ?? result.summary ?? "Не удалось получить ответ.", code: budget ? "provider_daily_limit" : "chat_failed" } : {}),
        },
        env,
        failed ? (budget ? 429 : 200) : result.status === "needs_input" ? 422 : 200,
      );
    }

    if (url.pathname === "/api/chat" && request.method === "GET") {
      const conversation = url.searchParams.get("conversationId");
      if (!conversation) return json({ error: "conversationId обязателен." }, env, 400);
      return json({ success: true, messages: await listMessages(env, conversation) }, env);
    }

    if (url.pathname === "/api/chat" && request.method === "DELETE") {
      const conversation = url.searchParams.get("conversationId");
      if (!conversation) return json({ error: "conversationId обязателен." }, env, 400);
      await deleteConversation(env, conversation);
      return json({ success: true }, env);
    }

    if(url.pathname === "/api/metatron/missions" && request.method === "GET") {
      const projectId=url.searchParams.get("projectId")?.trim();
      if(!projectId)return json({error:"projectId обязателен."},env,400);
      const {results}=await env.AZRAIL_D1.prepare(`SELECT id,goal,status,progress,created_at,updated_at,finished_at
        FROM missions WHERE project_id=? ORDER BY updated_at DESC LIMIT 40`).bind(projectId).all();
      return json({success:true,items:results??[]},env);
    }

    if(url.pathname === "/api/metatron/mission" && request.method === "GET") {
      const missionId=url.searchParams.get("missionId")?.trim();
      if(!missionId)return json({error:"missionId обязателен."},env,400);
      const snapshot=await metatronSnapshot(env,missionId);
      if(!snapshot)return json({error:"Миссия не найдена."},env,404);
      let health:unknown[]=[];
      if(url.searchParams.get("probe")==="1"){
        const projectId=String((snapshot.mission as {project_id?:unknown}).project_id??"");
        if(projectId){const orchestrator=await getAgentByName(env.Orchestrator,projectId);health=await orchestrator.probeAgents(projectId);}
      }
      return json({success:true,...snapshot,health},env);
    }

    if(url.pathname === "/api/metatron/control" && request.method === "POST") {
      const control=parseInput(metatronControlSchema,parsedBody);
      const {missionId,action}=control;
      const row=await env.AZRAIL_D1.prepare("SELECT project_id,status FROM missions WHERE id=?").bind(missionId).first<{project_id:string;status:string}>();
      if(!row)return json({error:"Миссия не найдена."},env,404);
      const agent=await getAgentByName(env.Orchestrator,row.project_id);
      const requestedBy=principal.id||"metatron";
      if(action==="pause"){
        await saveMissionControlIntent(env,missionId,"paused",requestedBy,"Metatron Pause: cooperative AbortSignal at a safe mission boundary.");
        const outcome=await requestPause(env,missionId);
        const liveAbort=outcome.status==="pausing"?(await agent.abortMission(missionId)).aborted:false;
        return json({success:outcome.ok,missionId,status:outcome.status,reason:outcome.reason,liveAbort},env,outcome.ok?200:409);
      }
      if(action==="resume"||action==="start"){
        await saveMissionControlIntent(env,missionId,"running",requestedBy,`Metatron ${action}: resume from durable checkpoints.`);
        if(row.status==="queued"){
          const delivery=await loadMissionDelivery(env,missionId);
          if(!delivery)return json({error:"Сохранённое delivery-задание не найдено."},env,409);
          // delivered=1 means Durable Object scheduling was already acknowledged.
          // F63 Start must be idempotent and must not manufacture a second run.
          if(delivery.delivered)return json({success:true,missionId,status:"queued",scheduled:true,alreadyScheduled:true},env,202);
          await agent.startMission(delivery.params);
          return json({success:true,missionId,status:"queued",scheduled:true,alreadyScheduled:false},env,202);
        }
        const resumed=await agent.recoverMission(missionId);
        return json({success:resumed.resumed,missionId,status:resumed.resumed?"queued":row.status,reason:resumed.reason},env,resumed.resumed?202:409);
      }
      if(action==="cancel"){
        await saveMissionControlIntent(env,missionId,"cancelled",requestedBy,"Metatron Cancel: use the canonical cancellation state machine.");
        const outcome=await requestCancel(env,missionId);
        const liveAbort=outcome.status==="cancelling"?(await agent.abortMission(missionId)).aborted:false;
        return json({success:outcome.ok,missionId,status:outcome.status,reason:outcome.reason,liveAbort},env,outcome.ok?200:409);
      }
      if(action==="terminate"){
        if(principal.role!=="admin"&&!principal.operator)return json({error:"Terminate доступен только администратору/оператору."},env,403);
        await saveMissionControlIntent(env,missionId,"terminated",requestedBy,"Metatron Terminate: operator hard-stop request with cooperative AbortSignal.");
        const outcome=await requestTerminate(env,missionId);
        const liveAbort=outcome.status==="terminating"?(await agent.abortMission(missionId)).aborted:false;
        return json({success:outcome.ok,missionId,status:outcome.status,reason:outcome.reason,liveAbort},env,outcome.ok?200:409);
      }
      const step=control.action==="retry_step"?control.step:-1;
      const retry=await retryFailedStep(env,missionId,step);
      await saveMissionControlIntent(env,missionId,"running",requestedBy,`Metatron Step Retry: ${step}.`);
      const resumed=await agent.recoverMission(missionId);
      return json({success:resumed.resumed,missionId,retry,resumed},env,resumed.resumed?202:409);
    }

    if(url.pathname === "/api/metatron/fault-injection" && request.method === "POST") {
      if(principal.role!=="admin"&&!principal.operator)return json({error:"Fault Injection Lab доступен только администратору/оператору."},env,403);
      const {missionId,scenario}=parseInput(faultInjectionSchema,parsedBody) as {missionId:string;scenario:FaultScenario};
      return json({success:true,run:await simulateMissionFault(env,missionId,scenario)},env);
    }

    if(url.pathname === "/api/mission/recover" && request.method === "POST") {
      const recoverId=parseInput(missionRefSchema,parsedBody).missionId;
      const row=await env.AZRAIL_D1.prepare("SELECT project_id,status FROM missions WHERE id=?").bind(recoverId).first<{project_id:string;status:string}>();
      if(!row) return json({error:"Миссия не найдена."},env,404);
      if(isTerminal(row.status)) return json({error:"Миссия уже завершена и имеет финальный статус."},env,409);
      const agent=await getAgentByName(env.Orchestrator,row.project_id);
      return json(await agent.recoverMission(recoverId),env);
    }
    if (url.pathname === "/api/mission" && request.method === "POST") {
      // Автономный режим: AZRAIL сам решает, какие инструменты звать.
      // Отличается от /api/task тем, что там один агент делает один проход,
      // а здесь цикл из нескольких шагов с обратной связью.
      const body = parseInput(missionStartSchema, await request.json());
      let goal = body.message;

      // Миссия идёт другим путём, чем /api/task, и вложения ей нужны так
      // же. Починить только один путь значило бы оставить вторую половину
      // сломанной — ровно так этот класс ошибок и живёт долго.
      if (body.attachments?.length) {
        goal += attachmentsToText(await loadAttachments(env, body.attachments as AttachmentRef[]));
      }

      /* Бюджет записей — до начала работы, не после.
       *
       * Cloudflare не даёт жёсткого потолка расходов: о превышении
       * узнают по счёту. Списываем по ЗАЯВЛЕННОЙ стоимости миссии
       * заранее — узнать о перерасходе после того, как записи сделаны,
       * бесполезно.
       *
       * На бесплатном плане это лишняя предосторожность: там переплата
       * невозможна. Она нужна ровно с того дня, когда план станет
       * платным, и поставить её надо ДО этого дня.
       */
      const budget = await chargeWrites(env, estimateMissionWrites(clampIterations(body.maxIterations)));
      // Остаток уходит в ответ: интерфейс должен показать приближение к
      // потолку ЗАРАНЕЕ, а не сообщить об упоре в него постфактум.
      if (!budget.allowed) {
        return json(
          {
            error:
              `Достигнут часовой потолок операций записи (${budget.used}/${budget.limit}). ` +
              `Это защита от неконтролируемого счёта, а не сбой. Потолок задаётся переменной AZRAIL_WRITE_BUDGET.`,
          },
          env,
          429,
        );
      }

      /* Повтор того же запроса не должен запускать вторую миссию.
       * Дрогнувшая связь на мобильном интернете, двойное нажатие, повтор
       * от самого клиента — раньше каждый из этих случаев стоил ещё
       * одного полного прогона моделей, и заметить это можно было только
       * по счёту. Ключ необязателен: без него поведение прежнее. */
      const missionId = crypto.randomUUID();
      const maxIterations = clampIterations(body.maxIterations);

      // Эта запись ОБЯЗАНА пройти, и падать здесь правильно: без строки в
      // missions миссию нечем отслеживать и не к чему привязать события.
      // Отказ ДО работы дешевле, чем осиротевший прогон, потративший модели.
      try {
        if (!await createMission(env, missionId, body.projectId, goal, {maxIterations,preferredModel:body.preferredModel,publicHostname:url.hostname,requestId:trace.requestId,traceId:trace.traceId})) {
          return json({error:"В проекте уже выполняется миссия. Дождитесь завершения или отмените её.", code:"project_busy"},env,409);
        }
      } catch (err) {
        log("error", "mission.create_failed", {
          missionId,
          ...traceLog({ ...trace, missionId }),
          error: err instanceof Error ? err.message : String(err),
        });
        return json(
          {
            error:
              "Не удалось создать миссию в базе. Частая причина — не применена схема: " +
              "wrangler d1 execute azrail-db --remote --file=./schema.sql",
          },
          env,
          500,
        );
      }

      /* ── Миссия уходит в фон ───────────────────────────────────────
       *
       * Здесь раньше стоял `await engine.runMission(...)` — весь цикл из
       * восьми-двадцати шагов с вызовами модели исполнялся внутри этого
       * HTTP-запроса. Cloudflare обрывает клиентское соединение примерно
       * на сотой секунде: длинная миссия отдавала 524, результат терялся,
       * а строка в missions навсегда оставалась в "executing", потому что
       * запись финального статуса стояла ПОСЛЕ недостижимого await.
       *
       * Теперь роут только ставит задачу и отдаёт missionId. Работа идёт
       * в Durable Object оркестратора (см. startMission/runMissionTask):
       * у него нет клиентского соединения, обрывать нечего.
       *
       * Ответ 202, а не 200: работа принята, но не выполнена. Клиент
       * следит за ней через WebSocket или опросом GET /api/mission. */
      const missionSocket = await getAgentByName(env.Orchestrator, body.projectId);
      try {
        await missionSocket.startMission({
          missionId,
          projectId: body.projectId,
          goal,
          maxIterations,
          preferredModel: body.preferredModel,
          requestId: trace.requestId,
          traceId: trace.traceId,
          // Хост берётся ИЗ ЗАПРОСА: на своём домене предпросмотр должен
          // вести на него же, а не на workers.dev. Внутри фоновой задачи
          // запроса уже нет — значит, передать надо сейчас.
          publicHostname: new URL(request.url).hostname,
        });
      } catch (err) {
        // Не удалось поставить в очередь — миссия не должна остаться
        // висеть в "queued" до сборщика зависших: о неудаче известно
        // ПРЯМО СЕЙЧАС, и честнее закрыть её сразу.
        const message = err instanceof Error ? err.message : String(err);
        log("error", "mission.schedule_failed", { missionId, ...traceLog({ ...trace, missionId }), error: message });
        return json({success:true,missionId,status:"accepted",deliveryPending:true},env,202);
      }

      // The fetch admission boundary persists the accepted response before returning.

      // Бюджет и остаток уходят в ответ: интерфейс предупреждает о
      // приближении к потолку заранее, а не сообщает об упоре постфактум.
      return json(
        {
          success: true,
          missionId,
          status: "accepted",
          budget: { used: budget.used, limit: budget.limit, remaining: budget.remaining },
        },
        env,
        202,
      );
    }

    /* Остановка идущей миссии.
     *
     * До этого остановить её было нечем: кнопка «Отменить» в интерфейсе
     * рвала HTTP-соединение, а цикл на сервере продолжал жечь модели и
     * бюджет записей до конца maxIterations, ни о чём не подозревая.
     *
     * Обрыв происходит на границе шага, а не мгновенно: прервать на
     * середине записи файла значит оставить проект в состоянии, которого
     * не было ни до, ни после. */
    if (url.pathname === "/api/mission/cancel" && request.method === "POST") {
      const id = parseInput(missionRefSchema, await request.json().catch(() => ({}))).missionId;

      const missionOwner = await env.AZRAIL_D1.prepare("SELECT project_id FROM missions WHERE id=?").bind(id).first<{project_id:string}>();
      const outcome = await requestCancel(env, id);
      if (outcome.reason === "not_found") return json({ error: "Миссия не найдена." }, env, 404);
      if (outcome.reason === "already_finished") {
        return json(
          { success: false, missionId: id, status: outcome.status, error: "Миссия уже завершена — останавливать нечего." },
          env,
          409,
        );
      }
      if (outcome.reason === "external_in_flight") {
        return json(
          { success: false, missionId: id, status: outcome.status, error: "Внешняя операция уже выполняется или её результат неопределён. Сначала проверьте её статус в Подключениях." },
          env,
          409,
        );
      }
      let liveAbort = false;
      if (missionOwner?.project_id && outcome.status === "cancelling") {
        try {
          const orchestrator = await getAgentByName(env.Orchestrator, missionOwner.project_id);
          liveAbort = (await orchestrator.abortMission(id)).aborted;
        } catch (error) {
          log("warn", "mission.live_abort_failed", { missionId: id, error: error instanceof Error ? error.message : String(error) });
        }
      }
      log("info", "mission.cancel_requested", { missionId: id, status: outcome.status, liveAbort });
      return json({ success: true, missionId: id, status: outcome.status ?? "cancelling", liveAbort }, env);
    }

    /* Слово человека посреди идущей миссии.
     *
     * До этого маршрута единственным способом поправить агента на ходу
     * была отмена — то есть убить работу вместе с наработанным
     * контекстом. Подсказка ложится в очередь; цикл забирает её перед
     * следующим шагом, на той же границе, где проверяет отмену. */
    if (url.pathname === "/api/mission/hint" && request.method === "POST") {
      const hintBody = parseInput(missionHintSchema, await request.json().catch(() => ({})));
      const hintId = hintBody.missionId;

      const outcome = await sendHint(env, hintId, hintBody.text ?? "");
      if (outcome.reason === "not_found") return json({ error: "Миссия не найдена." }, env, 404);
      if (outcome.reason === "empty") return json({ error: "Пустая подсказка." }, env, 400);
      // Опоздавшая подсказка отклоняется явно: принять её молча значило бы
      // дать человеку думать, что она будет учтена.
      if (outcome.reason === "already_finished") {
        return json(
          { success: false, missionId: hintId, error: "Миссия уже завершена — подсказку некому прочитать." },
          env,
          409,
        );
      }
      if (outcome.reason === "too_many") {
        return json(
          {
            success: false,
            missionId: hintId,
            error: `Очередь подсказок заполнена (${MAX_PENDING_HINTS}). Дождись, пока агент прочитает предыдущие.`,
          },
          env,
          429,
        );
      }
      log("info", "mission.hint_queued", { missionId: hintId });
      return json({ success: true, missionId: hintId }, env);
    }

    if (url.pathname === "/api/mission" && request.method === "GET") {
      const missionId = url.searchParams.get("missionId");
      if (!missionId) return json({ error: "missionId обязателен." }, env, 400);
      const mission = await env.AZRAIL_D1.prepare(`SELECT * FROM missions WHERE id = ?`).bind(missionId).first();
      if (!mission) return json({ error: "Миссия не найдена." }, env, 404);
      /* Полная трассировка прогона.
       *
       * Эти четыре таблицы ПИСАЛИСЬ и никогда не читались: план, вызовы
       * инструментов, вердикты проверок и заблокированные запросы
       * копились в базе, и достать их было нечем. Данные для отладки и
       * для сравнения прогонов уже собирались — просто не отдавались.
       *
       * Каждый запрос обёрнут отдельно: отсутствие одной таблицы (схема
       * применена не полностью — обычный случай при обновлении) не
       * должно лишать трассировки целиком. */
      const pick = async <T>(sql: string): Promise<T[]> => {
        try {
          const { results } = await env.AZRAIL_D1.prepare(sql).bind(missionId).all<T>();
          return results ?? [];
        } catch {
          return [];
        }
      };

      const plan = await pick(`SELECT position, title, status, note FROM mission_steps WHERE mission_id = ? ORDER BY position`);
      const calls = await pick(
        `SELECT tool, status, started_at, finished_at FROM tool_calls WHERE mission_id = ? ORDER BY started_at`,
      );
      const checks = await pick(`SELECT attempt, passed, reason, created_at FROM mission_checks WHERE mission_id = ? ORDER BY attempt`);

      // Проверка по канону считается ЗДЕСЬ, из уже прочитанных строк:
      // ни одного лишнего запроса, ни одного обращения к модели. Отчёт,
      // который стоит дорого, перестают открывать.
      const canon = validateAgainstCanon({
        calls: (calls as Array<{ tool: string; status: string }>) ?? [],
        checks: (checks as Array<{ attempt: number; passed: number }>) ?? [],
        steps: (plan as unknown[]) ?? [],
        status: (mission as { status?: string } | null)?.status,
      });

      /* Результат миссии теперь ЗДЕСЬ, а не в ответе на POST: POST
       * возвращается сразу, ещё до начала работы. Колонка может
       * отсутствовать на базе, где не применена миграция 002 — тогда
       * поле просто пустое, а не ошибка на весь отчёт. */
      const row = mission as { result_json?: string | null; status?: string } | null;
      let result: unknown = null;
      if (row?.result_json) {
        try {
          result = JSON.parse(row.result_json);
        } catch {
          result = null;
        }
      }

      return json(
        {
          success: true,
          mission,
          // Явный признак «работа идёт» — чтобы клиенту не приходилось
          // угадывать это по набору статусов, которые он знать не обязан.
          done: isTerminal(row?.status),
          requiresAction: row?.status === "waiting_approval",
          result,
          events: await listMissionEvents(env, missionId),
          plan,
          calls,
          checks,
          blocked: await pick(`SELECT action_type AS action, status, risk, summary FROM approval_requests WHERE mission_id = ? ORDER BY requested_at`),
          canon: { summary: summarizeCanon(canon), principles: canon },
        },
        env,
      );
    }

    /* ИЗМЕРИТЕЛЬ КАЧЕСТВА.
     *
     * Отвечает на единственный вопрос, на который до него ответить было
     * нельзя: стало лучше или хуже после правки в промптах, в выборе
     * модели, в цикле выполнения. Одна миссия этого не показывает —
     * разброс между двумя запусками одной задачи больше, чем разница
     * между двумя версиями промпта.
     *
     * ПРОГОН ДОРОГОЙ: каждая задача — это полная миссия с вызовами
     * моделей и записями. Поэтому явное подтверждение (confirm) и
     * последовательное исполнение, а не параллельное. */
    if (url.pathname === "/api/bench" && request.method === "POST") {
      const benchBody = parseInput(benchSchema, await request.json().catch(() => ({})));

      if (!benchBody.confirm) {
        // Отказ с ЦЕНОЙ в тексте, а не просто «нужно подтверждение»:
        // решение принимают, зная стоимость, а не после счёта.
        const planned = benchBody.only?.length
          ? SEED_CASES.filter((c) => benchBody.only!.includes(c.id))
          : SEED_CASES;
        return json(
          {
            error: "Нужно подтверждение: прогон запускает полные миссии.",
            cases: planned.map((c) => ({ id: c.id, difficulty: c.difficulty, maxIterations: c.maxIterations })),
            estimatedModelCalls: planned.reduce((sum, c) => sum + c.maxIterations, 0),
            hint: 'Повтори запрос с {"confirm": true}.',
          },
          env,
          400,
        );
      }

      if (detectBackend(env) !== "container") {
        // Без контейнера прогнать тесты негде, а без прогона тестов
        // измерять нечего. Отказ честнее числа, полученного неизвестно из
        // чего.
        return json(
          { error: "Измеритель требует контейнерную песочницу: без неё нечем прогнать тесты." },
          env,
          503,
        );
      }

      const plannedCases = benchBody.only?.length ? SEED_CASES.filter(c => benchBody.only!.includes(c.id)) : SEED_CASES;
      const estimatedCalls = plannedCases.reduce((sum, c) => sum + c.maxIterations, 0);
      if (!plannedCases.length) return json({ error: "Нет выбранных тестов." }, env, 400);
      const quota = await checkRateLimit(env, "shared", estimatedCalls);
      if (!quota.allowed) return json({ error: "Недостаточно часового лимита для benchmark." }, env, 429);
      const writes = await chargeWrites(env, plannedCases.reduce((sum, c) => sum + estimateMissionWrites(c.maxIterations), 0));
      if (!writes.allowed) return json({ error: "Недостаточно бюджета записей для benchmark." }, env, 429);
      const runId = crypto.randomUUID().slice(0, 8);
      const startedAt = new Date().toISOString();
      const orchestrator = await getAgentByName(env.Orchestrator, `bench-${runId}`);

      const result = await runBench(
        env,
        {
          // Миссия идёт тем же путём, что и обычная, — иначе измерялся бы
          // не тот код, который работает у пользователя.
          runMission: async ({ projectId, goal, maxIterations }) => {
            // Explicit admin-confirmed benchmark grants only sandbox on its
            // isolated generated project; Git/deploy stay denied.
            await env.AZRAIL_D1.prepare("INSERT OR IGNORE INTO project_permissions(project_id,capability) VALUES(?,'sandbox')").bind(projectId).run();
            const missionId = crypto.randomUUID();
            await env.AZRAIL_D1.prepare(
              `INSERT INTO missions (id, project_id, goal, status, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)`,
            )
              .bind(missionId, projectId, goal, new Date().toISOString(), new Date().toISOString())
              .run();
            return orchestrator.runBenchMission({ missionId, projectId, goal, maxIterations });
          },
          execInSandbox: async (projectId, command) => {
            const res = await runInContainer(env, command, { sandboxName: projectId });
            return { exitCode: res.exitCode, output: res.output };
          },
          syncWorkspace: (projectId) => syncWorkspaceToSandbox(env, projectId),
        },
        SEED_CASES,
        { runId, only: benchBody.only },
      );

      try {
        await saveRun(env, runId, result.report, result.outcomes, { note: benchBody.note, startedAt });
      } catch (err) {
        log("error", "bench.save_failed", {
          runId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return json({ success: true, ...result }, env);
    }

    if (url.pathname === "/api/bench" && request.method === "GET") {
      const runId = url.searchParams.get("runId");
      if (runId) {
        return json({ success: true, runId, outcomes: await loadOutcomes(env, runId) }, env);
      }
      return json({ success: true, runs: await listRuns(env) }, env);
    }

    if (url.pathname === "/api/conversations" && request.method === "GET") {
      // Cross-device sidebar: pinned first, then newest activity; preview = first user line.
      const { results } = await env.AZRAIL_D1.prepare(
        `SELECT c.id, c.project_id, c.title, COALESCE(c.pinned, 0) AS pinned, COALESCE(c.archived, 0) AS archived, c.created_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'
                 ORDER BY m.created_at ASC LIMIT 1) AS preview,
                (SELECT MAX(m3.created_at) FROM messages m3 WHERE m3.conversation_id = c.id) AS last_message_at,
                (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id) AS message_count
         FROM conversations c WHERE ? = 'admin' OR EXISTS(SELECT 1 FROM resource_owners o WHERE o.kind='conversation' AND o.resource_id=c.id AND o.account_id=?)
         ORDER BY COALESCE(c.archived, 0) ASC,
                  COALESCE(c.pinned, 0) DESC,
                  COALESCE((SELECT MAX(m4.created_at) FROM messages m4 WHERE m4.conversation_id = c.id), c.created_at) DESC
         LIMIT 80`,
      ).bind(principal.role,principal.id).all();
      return json({ success: true, conversations: results }, env);
    }

    if (url.pathname === "/api/conversations/plan" && request.method === "POST") {
      const body = parseInput(conversationPlanSchema, parsedBody);
      await ensureConversation(env, body.conversationId);
      if (body.userText) {
        const prior = (await listMessages(env, body.conversationId, 40)) as Array<{ role?: string; content?: string }>;
        if (!prior.some((row) => row.role === "user" && row.content === body.userText)) {
          await addMessage(env, body.conversationId, "user", body.userText);
        }
      }
      if (body.summary) await addMessage(env, body.conversationId, "assistant", body.summary);
      await addMessage(env, body.conversationId, "plan", JSON.stringify(body.plan));
      return json({ success: true, conversationId: body.conversationId }, env);
    }

    if (url.pathname === "/api/conversations" && request.method === "PATCH") {
      const body = parseInput(conversationPatchSchema, parsedBody);
      await requireResource(env, principal, "conversation", body.id);
      await updateConversationMeta(env, body.id, {
        title: body.title,
        pinned: body.pinned,
        archived: body.archived,
        projectId: body.projectId,
      });
      return json({
        success: true,
        id: body.id,
        title: body.title,
        pinned: body.pinned,
        archived: body.archived,
        projectId: body.projectId,
      }, env);
    }

    if (url.pathname === "/api/plan" && request.method === "POST") {
      if (principal.role !== "admin" && !principal.operator) {
        return json({ error: "План модели пока открыт только владельцу.", code: "chat_owner_only" }, env, 403);
      }
      const body = parseInput(planDraftSchema, parsedBody);
      const routed = await runModel<unknown>(env, "chat", {
        messages: [
          { role: "system", content: "Разбери поручение на части. Верни только JSON {\"parts\":[{\"text\":\"короткая задача\",\"kind\":\"image|music|video|web|build\",\"after\":false}]}. after true ставит часть после предыдущей. image — картинка, music — трек, video — раскадровка, web — сайт, build — другое дело. Вопрос без готовой вещи: {\"parts\":[]}. Не больше 4 частей. Не выдумывай темп, деньги и ссылки. Если сказано, что часть уже собрана, не заказывай её снова, пока новая фраза прямо не просит переделать." },
          ...(body.memory ? [{ role: "user" as const, content: `Уже собрано: ${body.memory}` }] : []),
          { role: "user", content: body.message },
        ],
      }, { ledger: new UsageLedger(`account:${principal.id}`), trace });
      const parts = parsePlanDraft(extractText(routed.output));
      if (!parts) return json({ success: true, fallback: true, parts: [] }, env);
      return json({ success: true, fallback: false, parts }, env);
    }

    if (url.pathname === "/api/polish" && request.method === "POST") {
      // Довести формулировку до рабочей. Отдельно от /api/chat намеренно:
      // черновик и его правка не должны попадать в историю диалога — иначе
      // переписка засорится тем, что пользователь даже не отправлял.
      const body = parseInput(polishSchema, await request.json());
      const draft = body.text;

      const routed = await runModel<{ response?: string }>(
        env,
        "chat",
        {
          messages: [
            {
              role: "system",
              content:
                "Ты дорабатываешь формулировку задачи для AI-разработчика. Верни ТОЛЬКО " +
                "переписанную задачу — без пояснений, без вступлений, без кавычек. " +
                "Сохрани исходный смысл и язык. Сделай конкретнее: добавь недостающие " +
                "технические детали, которые очевидно подразумеваются. Не выдумывай " +
                "требований, которых в исходнике нет.",
            },
            { role: "user", content: draft },
          ],
        },
        { preferredModel: body.preferredModel, ledger: new UsageLedger(`account:${principal.id}`), trace },
      );
      return json({ success: true, original: draft, polished: extractText(routed.output) || draft }, env);
    }

    if (url.pathname === "/api/selftest" && request.method === "POST") {
      // Моделей не вызывает, поэтому не под лимитом расхода — жать можно
      // сколько угодно, особенно в первые минуты после деплоя.
      const orchestrator = await getAgentByName(env.Orchestrator, "selftest");
      const result = await orchestrator.selfTest();
      return json({ success: result.ok, ...result }, env, result.ok ? 200 : 503);
    }

    if (url.pathname === "/api/agents" && request.method === "GET") {
      return json({ success: true, agents: describeRegistry(), capabilities: allCapabilities() }, env);
    }

    if (url.pathname === "/api/upload" && request.method === "POST") {
      await enforceOperationLimit(env, "upload", principal.id);
      const result = await handleUpload(request, env, principal);
      if ("error" in result) return json({ error: result.error }, env, result.status);
      return json({ success: true, ...result }, env);
    }

    if (url.pathname === "/api/task" && request.method === "POST") {
      // Ограничение размера тела: без него в память тянется что угодно.
      // Content-Length может отсутствовать (chunked), поэтому это отсечка
      // очевидных случаев, а не гарантия — настоящий потолок даёт платформа.
      const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
      if (declaredLength > MAX_TASK_BODY_BYTES) {
        return json(
          { error: `Тело запроса больше ${MAX_TASK_BODY_BYTES / 1024 / 1024} МБ. Большие файлы грузи через /api/upload.` },
          env,
          413,
        );
      }

      let body: TaskRequest;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Некорректный JSON в теле запроса." }, env, 400);
      }
      if (!body.inputType && !body.gitOp) {
        return json({ error: 'Нужно "inputType" (для задач с содержимым) либо "gitOp" (для Git-операций).' }, env, 400);
      }

      const instanceName = body.projectId ?? "default";
      const t0 = Date.now();

      // ВЛОЖЕНИЯ. До сих пор интерфейс их отправлял, а сервер не читал:
      // файл уходил в R2 и оставался там навсегда, а задача уходила в
      // работу пустой. Ничего не падало — просто содержимое не доезжало,
      // и агент отвечал «не найдено исходных модулей».
      if (Array.isArray(body.attachments) && body.attachments.length) {
        const loaded = await loadAttachments(env, body.attachments);
        body.payload = String(body.payload ?? "") + attachmentsToText(loaded);
        log("info", "task.attachments", {
          total: body.attachments.length,
          read: loaded.filter((a) => a.text).length,
          skipped: loaded.filter((a) => !a.text).length,
        });
      }

      log("info", "task.received", {
        projectId: body.projectId,
        intent: body.intent,
        inputType: body.inputType,
        hasGitOp: !!body.gitOp,
        hasQaOp: !!body.qaOp,
        ...traceLog(trace),
      });

      body.userId = principal.id;
      body._requestId = trace.requestId;
      body._traceId = trace.traceId;
      const orchestrator = await getAgentByName(env.Orchestrator, instanceName);
      const result: TaskResult = await orchestrator.handleTask(body);

      log(result.status === "failed" ? "error" : "info", "task.finished", {
        projectId: body.projectId,
        agent: result.agent,
        status: result.status,
        ms: Date.now() - t0,
        error: result.error,
        ...traceLog(trace),
      });
      const status = result.status === "failed" ? 500 : result.status === "needs_input" ? 422 : 200;
      return json(result, env, status);
    }

    if (url.pathname.match(/^\/api\/projects\/[^/]+\/history$/) && request.method === "GET") {
      // decodeURIComponent обязателен: клиент шлёт encodeURIComponent(id),
      // а запись в D1 идёт под сырым projectId из тела запроса. Без декода
      // "test 1" сохранялся бы как "test 1", а искался как "test%201".
      const projectId = decodeURIComponent(url.pathname.split("/")[3]);
      const orchestrator = await getAgentByName(env.Orchestrator, projectId);
      const history = await orchestrator.getHistory(projectId);
      return json({ success: true, data: history }, env);
    }

    if (url.pathname.match(/^\/api\/projects\/[^/]+\/memory$/) && request.method === "GET") {
      const projectId = decodeURIComponent(url.pathname.split("/")[3]);
      const facts = await listFacts(env, projectId);
      return json({ success: true, data: facts }, env);
    }

    // Удаление факта из памяти проекта.
    //
    // Пробел, найденный при разборе: факты пишут пять агентов, а способа
    // убрать ОШИБОЧНЫЙ не было вовсе. Память подмешивается в промпт при
    // каждой будущей задаче по проекту — то есть одна галлюцинация модели
    // тихо отравляла бы всю дальнейшую работу, и починить это можно было
    // бы только руками в базе.
    if (url.pathname.match(/^\/api\/projects\/[^/]+\/memory\/[^/]+\/[^/]+$/) && request.method === "DELETE") {
      const parts = url.pathname.split("/");
      const projectId = decodeURIComponent(parts[3]);
      const category = decodeURIComponent(parts[5]) as MemoryCategory;
      const key = decodeURIComponent(parts[6]);
      try {
        await withProjectLock(env,projectId,crypto.randomUUID(),()=>forgetFact(env, projectId, category, key));
        log("info", "memory.forgotten", { projectId, category, key });
        return json({ success: true, forgotten: { category, key } }, env);
      } catch (err) {
        log("error", "memory.forget_failed", {
          projectId,
          error: err instanceof Error ? err.message : String(err),
        });
        return json({ error: "Не удалось удалить факт." }, env, 500);
      }
    }

    // Operator-only trace correlation view. Trace links are diagnostic metadata,
    // not an authorization primitive; cross-project traversal is therefore admin-only.
    if (url.pathname.match(/^\/api\/observability\/traces\/[0-9a-fA-F]{32}$/) && request.method === "GET") {
      if (principal.role !== "admin") return json({ error: "Требуется роль администратора." }, env, 403);
      const traceId = url.pathname.split("/").pop()!.toLowerCase();
      const afterRaw = url.searchParams.get("after") ?? "0";
      const limitRaw = url.searchParams.get("limit") ?? "200";
      if (!/^\d{1,16}$/.test(afterRaw) || !/^\d{1,4}$/.test(limitRaw)) return json({ error: "Некорректный trace cursor." }, env, 400);
      const [links, replay] = await Promise.all([
        listTraceLinks(env, traceId, 500),
        listTraceEvents(env, traceId, { after: Number(afterRaw), limit: Number(limitRaw) }),
      ]);
      return json({ success: true, traceId, links, ...replay }, env);
    }

    // Unified Event Stream replay endpoint. `after` is the durable monotonic
    // sequence cursor; clients can reconnect without guessing from timestamps.
    if (url.pathname.match(/^\/api\/projects\/[^/]+\/events$/) && request.method === "GET") {
      const projectId = decodeURIComponent(url.pathname.split("/")[3]);
      const afterRaw = url.searchParams.get("after") ?? "0";
      const limitRaw = url.searchParams.get("limit") ?? "200";
      if (!/^\d{1,16}$/.test(afterRaw) || !/^\d{1,4}$/.test(limitRaw)) return json({ error: "Некорректный event cursor." }, env, 400);
      const replay = await listProjectEvents(env, projectId, { after: Number(afterRaw), limit: Number(limitRaw) });
      return json({ success: true, ...replay }, env);
    }

    // История версий проекта: UI Agent и Code Agent пишут в project_versions
    // с первых версий, но до этой пары маршрутов ничего не читало запись
    // обратно — таблица только наполнялась. См. lib/versions.ts про то, как
    // разбирается разница форматов r2_object_key между двумя агентами.
    if (url.pathname.match(/^\/api\/projects\/[^/]+\/versions$/) && request.method === "GET") {
      const projectId = decodeURIComponent(url.pathname.split("/")[3]);
      const versions = await listVersions(env, projectId);
      return json({ success: true, data: versions }, env);
    }

    // Восстановление ТОЛЬКО отдаёт файлы версии обратно — ничего не
    // коммитит и не деплоит. Осознанно: самомодификация и деплой AZRAIL
    // идут по отдельному, куда более строгому пути (см. docs/product/ARCHITECTURE-v2.md,
    // «AZRAIL не разворачивает себя. Никогда»), а это — чтение чужого,
    // не своего, проекта.
    if (
      url.pathname.match(/^\/api\/projects\/[^/]+\/versions\/[^/]+\/restore$/) &&
      request.method === "POST"
    ) {
      const parts = url.pathname.split("/");
      const projectId = decodeURIComponent(parts[3]);
      const versionId = decodeURIComponent(parts[5]);
      try {
        const restored = await restoreVersion(env, projectId, versionId);
        if (!restored) {
          return json({ error: "Версия не найдена." }, env, 404);
        }
        // Неполное восстановление поднимается НА ВЕРХНИЙ уровень ответа.
        // Внутри data флаг technically есть, но его никто не читает — а
        // проект, восстановленный наполовину, выглядит целым и не
        // работает. Причину искали бы в коде, а не в ответе API.
        if (restored.truncated) {
          return json(
            {
              success: true,
              data: restored,
              warning:
                `Восстановлены не все файлы версии (взято ${restored.files.length}): ` +
                `версия слишком велика для одного запроса. Проверь состав перед использованием.`,
            },
            env,
          );
        }
        return json({ success: true, data: restored }, env);
      } catch (err) {
        log("error", "version.restore_route_failed", {
          projectId,
          versionId,
          error: err instanceof Error ? err.message : String(err),
        });
        return json({ error: "Не удалось восстановить версию." }, env, 500);
      }
    }

    // GET / отдаёт Cloudflare Assets (public/index.html) до этого хендлера —
    // сюда запрос на "/" не дойдёт, пока в public/ лежит index.html.

    // Маршрутизация напрямую к агентам (WebSocket/RPC от клиента) — на будущее,
    // для панели управления AZRAIL.
    // Direct SDK routing deliberately disabled: application routes own authorization.

    /* Неизвестный путь отдаёт ПРИЛОЖЕНИЕ, а не голую строку.
     *
     * Биндинг ASSETS был объявлен в wrangler.toml и не читался ни одной
     * строкой кода — это было честно записано там же в комментарии и так
     * и осталось несделанным. Итог: любая опечатка в адресе (или переход
     * по ссылке на внутренний раздел) выдавала текст «AZRAIL OS — Core
     * API Running» — с виду мёртвый сервис.
     *
     * Только для GET и только когда браузер просит HTML: промахнувшийся
     * запрос к /api/… должен получить честную ошибку, а не страницу,
     * которую он не сможет разобрать. */
    const wantsHtml = (request.headers.get("Accept") ?? "").includes("text/html");
    if (request.method === "GET" && wantsHtml && !url.pathname.startsWith("/api/") && env.ASSETS) {
      try {
        const page = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
        if (page.ok) {
          // 200, а не 404: это единственная страница приложения, и для
          // клиентской навигации она валидный ответ на любой её путь.
          return new Response(page.body, {
            status: 200,
            headers: getCors(env, page.headers),
          });
        }
      } catch (err) {
        log("warn", "assets.fallback_failed", {
          path: url.pathname,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
      return json({ error: `Неизвестный путь: ${url.pathname}` }, env, 404);
    }

    return json({error:"Маршрут или метод не найден.",code:"not_found"},env,404);
}
