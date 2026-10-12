import type { Connection } from "agents";
import { ensureProject } from "../lib/project";
import { log } from "../lib/resilience";
import { sendProjectEvent } from "../lib/socket-access";
import { emitEvent } from "../lib/event-stream";
import type { Env, Intent, TaskRequest, TaskResult } from "../types";
import { linkTrace, taskTrace, traceLog } from "../lib/observability-context";

export async function recordTaskHistory(
  env: Env,
  connections: Iterable<Connection>,
  id: string,
  request: TaskRequest,
  intent: Intent,
  status: TaskResult["status"] | "running",
  outputSummary?: string,
  error?: string | null,
  actualAgent = "orchestrator",
): Promise<void> {
  const finishedAt = status === "running" ? null : new Date().toISOString();
  const at = finishedAt ?? new Date().toISOString();

  try {
    if (request.projectId) await ensureProject(env, request.projectId);
    await env.AZRAIL_D1.prepare(
      `INSERT INTO task_history (id, project_id, agent, intent, input_type, status, input_summary, output_summary, error, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         agent = excluded.agent,
         status = excluded.status,
         output_summary = excluded.output_summary,
         error = excluded.error,
         finished_at = excluded.finished_at`,
    )
      .bind(
        id,
        request.projectId ?? null,
        actualAgent,
        intent,
        request.inputType ?? null,
        status,
        (request.payload || request.r2Key || "").slice(0, 500),
        outputSummary ?? null,
        error ?? null,
        finishedAt,
      )
      .run();
    const trace = taskTrace(request, { taskId: id });
    await linkTrace(env, "task", id, trace);
  } catch (err) {
    log("error", "history.write_failed", {
      taskId: id,
      projectId: request.projectId,
      ...traceLog(taskTrace(request, { taskId: id })),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!request.projectId) return;
  try {
    const streamEvent = await emitEvent(env, {
      domain: "agent",
      type: `agent.task.${status}`,
      projectId: request.projectId,
      taskId: id,
      trace: taskTrace(request, { taskId: id }),
      subjectType: "task",
      subjectId: id,
      actor: `agent:${actualAgent}`,
      payload: { intent, status, agent: actualAgent, summary: outputSummary ?? null, error: error ?? null, at },
    });
    await sendProjectEvent(env, connections, request.projectId, { type: "event_stream", event: streamEvent });
  } catch (broadcastErr) {
    log("warn", "orchestrator.event_delivery_failed", {
      taskId: id,
      ...traceLog(taskTrace(request, { taskId: id })),
      error: broadcastErr instanceof Error ? broadcastErr.message : String(broadcastErr),
    });
  }
}

export async function listTaskHistory(env: Env, projectId: string, limit = 20) {
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT id, agent, intent, input_type, status, output_summary, error, started_at, finished_at
     FROM task_history WHERE project_id = ? ORDER BY started_at DESC LIMIT ?`,
  )
    .bind(projectId, limit)
    .all();
  return results;
}
