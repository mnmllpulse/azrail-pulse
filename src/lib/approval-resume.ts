import { getAgentByName } from "agents";
import type { Env } from "../types";
import { loadCheckpoints } from "./checkpoints";
import { isLocalToolName } from "./local-agent";
import { log } from "./resilience";

export type ResumeOutcome = { missionId: string; resumed: boolean; reason?: string };

function mentionsCall(resultJson: string | null, callId: string): boolean {
  if (!resultJson) return false;
  try {
    const result = JSON.parse(resultJson) as { id?: unknown; approvalRequired?: unknown } | null;
    return !!result && typeof result === "object" && result.id === callId && result.approvalRequired === true;
  } catch {
    return false;
  }
}

/**
 * После успешного внешнего действия продолжает миссии этого аккаунта, которые ждали именно его.
 * Безопасность держится на recoverMission: он сам проверяет, что все нужные действия завершены,
 * проект свободен и миссию можно взять ровно один раз. Здесь только поиск подходящих миссий;
 * любая ошибка возвращается в результате и никогда не ломает ответ о самом действии.
 */
export async function resumeAfterConnectorCall(env: Env, account: string, callId: string): Promise<ResumeOutcome[]> {
  const outcomes: ResumeOutcome[] = [];
  try {
    const { results } = await env.AZRAIL_D1.prepare(
      `SELECT m.id AS id, m.project_id AS project_id FROM missions m
       WHERE m.status='waiting_approval'
         AND EXISTS(SELECT 1 FROM resource_owners o WHERE o.kind='project' AND o.resource_id=m.project_id AND o.account_id=?)
       ORDER BY m.updated_at DESC LIMIT 10`,
    ).bind(account).all<{ id: string; project_id: string }>();
    for (const mission of results ?? []) {
      try {
        const points = await loadCheckpoints(env, mission.id);
        if (!points.some((point) => point.tool === "connector_call" && point.status === "completed" && mentionsCall(point.result_json, callId))) continue;
        const agent = await getAgentByName(env.Orchestrator, mission.project_id);
        const outcome = await agent.recoverMission(mission.id);
        outcomes.push({ missionId: mission.id, resumed: outcome.resumed, ...(outcome.reason ? { reason: outcome.reason } : {}) });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Не удалось продолжить миссию.";
        log("warn", "approval_resume.failed", { missionId: mission.id, error: reason });
        outcomes.push({ missionId: mission.id, resumed: false, reason });
      }
    }
  } catch (error) {
    log("warn", "approval_resume.lookup_failed", { error: error instanceof Error ? error.message : String(error) });
  }
  return outcomes;
}


/** После завершения или отклонения задачи на компьютере продолжает миссии, которые ждали именно её. */
export async function resumeAfterLocalJob(env: Env, jobId: string): Promise<ResumeOutcome[]> {
  const outcomes: ResumeOutcome[] = [];
  try {
    const { results } = await env.AZRAIL_D1.prepare(
      `SELECT id, project_id FROM missions WHERE status='waiting_approval' ORDER BY updated_at DESC LIMIT 10`,
    ).all<{ id: string; project_id: string }>();
    for (const mission of results ?? []) {
      try {
        const points = await loadCheckpoints(env, mission.id);
        if (!points.some((point) => isLocalToolName(point.tool) && point.status === "completed" && mentionsCall(point.result_json, jobId))) continue;
        const agent = await getAgentByName(env.Orchestrator, mission.project_id);
        const outcome = await agent.recoverMission(mission.id);
        outcomes.push({ missionId: mission.id, resumed: outcome.resumed, ...(outcome.reason ? { reason: outcome.reason } : {}) });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Не удалось продолжить миссию.";
        log("warn", "approval_resume.local_failed", { missionId: mission.id, error: reason });
        outcomes.push({ missionId: mission.id, resumed: false, reason });
      }
    }
  } catch (error) {
    log("warn", "approval_resume.local_lookup_failed", { error: error instanceof Error ? error.message : String(error) });
  }
  return outcomes;
}
