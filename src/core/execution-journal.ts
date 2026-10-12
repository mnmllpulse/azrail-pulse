import type { Env } from "../types";
import { emitMissionEvent } from "../lib/event-store";
import { log } from "../lib/resilience";
import type { ExecutionContext } from "./execution-types";
import { actionForTool, approvalDigest, requestApproval } from "../lib/approval-engine";
import { childTrace, linkTrace, traceLog } from "../lib/observability-context";

/** Durable audit/event journal for execution missions. */
export class ExecutionJournal {
  constructor(private readonly env: Env) {}

  async recordToolCall(
    ctx: ExecutionContext,
    id: string,
    tool: string,
    status: string,
    input: unknown,
    output: string | null,
    error: string | null,
    startedAt: string,
  ): Promise<void> {
    try {
      await this.env.AZRAIL_D1.prepare(
        `INSERT INTO tool_calls (id, mission_id, tool, status, input, output, error, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, ctx.missionId, tool, status, JSON.stringify(input ?? null), output, error, startedAt, new Date().toISOString())
        .run();
      await linkTrace(this.env, "tool_call", id, childTrace(ctx, { toolCallId: id }));
    } catch (err) {
      log("error", "execution.tool_call_write_failed", {
        missionId: ctx.missionId,
        tool,
        ...traceLog(childTrace(ctx, { toolCallId: id })),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }


  async recordApprovalRequest(
    ctx: Pick<ExecutionContext, "missionId" | "projectId" | "requestId" | "traceId" | "taskId" | "toolCallId">,
    tool: string,
    input: Record<string, unknown>,
    reason: string,
  ): Promise<void> {
    try {
      const actionType = actionForTool(tool);
      const payloadDigest = await approvalDigest({ tool, input });
      await requestApproval(this.env, {
        missionId: ctx.missionId,
        projectId: ctx.projectId,
        actionType,
        risk: actionType === "github_pr" || actionType === "delete_file" ? "critical" : "high",
        scopeType: "mission_tool",
        scopeId: `${ctx.missionId}:${tool}`,
        payloadDigest,
        summary: `${tool}: ${reason}`.slice(0, 800),
        requestedBy: `mission:${ctx.missionId}`,
        trace: childTrace(ctx as ExecutionContext),
      });
    } catch (err) {
      log("warn", "approval.record_failed", {
        missionId: ctx.missionId,
        ...traceLog(ctx),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }


  async recordCheck(ctx: ExecutionContext, attempt: number, passed: boolean, reason: string): Promise<void> {
    try {
      const id = crypto.randomUUID();
      await this.env.AZRAIL_D1.prepare(
        `INSERT INTO mission_checks (id, mission_id, attempt, passed, reason) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(id, ctx.missionId, attempt, passed ? 1 : 0, reason.slice(0, 800))
        .run();
      await linkTrace(this.env, "mission_check", id, ctx);
    } catch (err) {
      log("error", "check.record_failed", {
        missionId: ctx.missionId,
        ...traceLog(ctx),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }


  async note(
    ctx: ExecutionContext,
    event: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    // Запись в журнал НЕ должна ронять миссию.
    //
    // Раньше этот await стоял голым, и любой сбой D1 выбрасывал исключение
    // наружу через runMission — миссия умирала целиком, уже успев записать
    // файлы. Хуже того: первое событие (mission.started) отправляется ДО
    // начала работы, поэтому при неприменённой схеме падала бы каждая
    // миссия, хотя сама работа выполнима.
    //
    // Ровно тот же класс ошибки мы уже чинили в rememberFact: сбой
    // вспомогательной записи подменял результат основной работы.
    // Журнал важен, но он вторичен по отношению к делу, которое описывает.
    // Опознавательный знак события. Одно и то же событие доезжает до
    // интерфейса ДВУМЯ путями: живьём по сокету и вместе с опросом из
    // базы. Без общего знака второй путь рисовал бы те же шаги заново,
    // и карта миссии удваивалась бы на глазах. Знак присваивает база —
    // он один и тот же в обоих каналах.
    let streamEvent: Awaited<ReturnType<typeof emitMissionEvent>> | undefined;
    try {
      streamEvent = await emitMissionEvent(this.env, ctx.missionId, event, data, childTrace(ctx, { toolCallId: ctx.toolCallId }));
    } catch (err) {
      log("error", "execution.event_write_failed", {
        missionId: ctx.missionId,
        event,
        ...traceLog(ctx),
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!ctx.onEvent) return;
    try {
      // await обязателен: вызов уходит в ЧУЖОЙ Durable Object. Без него
      // ввод-вывод переживает контекст, в котором был начат.
      await ctx.onEvent({
        // Может отсутствовать, если запись в журнал не удалась. Тогда
        // события нет и в базе — значит, опрос его не принесёт, и
        // разойтись в двойную отрисовку неоткуда.
        streamEvent,
        id: streamEvent?.id,
        seq: streamEvent?.seq,
        domain: streamEvent?.domain,
        event,
        tool: typeof data?.tool === "string" ? data.tool : undefined,
        reason: typeof data?.reason === "string" ? data.reason : undefined,
        iteration: typeof data?.iteration === "number" ? data.iteration : undefined,
        // Нужен интерфейсу, чтобы показать ЧЕСТНЫЙ процент: шаг из скольких.
        // Без него прогресс пришлось бы выдумывать — а зашитые проценты мы
        // уже видели в чужом макете и решили, что так нельзя.
        maxIterations: typeof data?.maxIterations === "number" ? data.maxIterations : undefined,
        // Число шагов плана — для строки «план составлен: N шагов».
        steps: typeof data?.steps === "number" ? data.steps : undefined,
        files: typeof data?.files === "number" ? data.files : undefined,
      });
    } catch (err) {
      log("warn", "execution.live_event_failed", {
        missionId: ctx.missionId,
        event,
        ...traceLog(ctx),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

}
