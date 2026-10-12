import type { Env } from "../types";
import { linkTrace } from "./observability-context";
/** Admission and durable delivery intent are one D1 transaction. */
export async function createMission(env: Env, id: string, projectId: string, goal: string, options:Record<string,unknown>={}): Promise<boolean> {
  const now = new Date().toISOString();
  const results=await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`INSERT INTO missions(id,project_id,goal,status,created_at,updated_at)
      SELECT ?,?,?,'queued',?,? WHERE NOT EXISTS(SELECT 1 FROM missions WHERE project_id=? AND status IN ('queued','executing','cancelling','pausing','terminating','paused')) RETURNING id`)
      .bind(id,projectId,goal,now,now,projectId),
    env.AZRAIL_D1.prepare("INSERT INTO mission_outbox(mission_id,params,created_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM missions WHERE id=?)")
      .bind(id,JSON.stringify({missionId:id,projectId,goal,maxIterations:12,...options}),Date.now(),id),
    env.AZRAIL_D1.prepare("INSERT INTO mission_delivery_state(mission_id,generation,updated_at) SELECT ?,1,? WHERE EXISTS(SELECT 1 FROM missions WHERE id=?)")
      .bind(id,Date.now(),id),
  ]);
  const created=!!results[0].results?.length;
  if(created && typeof options.requestId==="string" && typeof options.traceId==="string") {
    await linkTrace(env,"mission",id,{requestId:options.requestId,traceId:options.traceId,missionId:id});
  }
  return created;
}
