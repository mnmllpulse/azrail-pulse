import { getAgentByName } from "agents";
import type { Env, TaskResult } from "../types";
import { log } from "./resilience";
import { parseMissionDelivery, type MissionDeliveryParams, type MissionDeliveryRow } from "./mission-delivery";

type DeliveryParams = MissionDeliveryParams;
type OutboxRow = MissionDeliveryRow;

async function quarantine(env:Env,row:OutboxRow,reason:string) {
  const now=new Date().toISOString();
  const result:TaskResult={status:"failed",agent:"outbox",summary:"Сохранённое задание повреждено; автоматический запуск заблокирован.",error:"invalid_outbox_payload"};
  await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`UPDATE missions SET status='failed',finished_at=?,updated_at=?,result_json=?
      WHERE id=? AND project_id=? AND status='queued'`).bind(now,now,JSON.stringify(result),row.mission_id,row.project_id),
    env.AZRAIL_D1.prepare("UPDATE mission_outbox SET delivered=1 WHERE mission_id=? AND delivered=0").bind(row.mission_id),
  ]);
  log("error","outbox.quarantined",{missionId:row.mission_id,projectId:row.project_id,reason});
}

export async function dispatchOutbox(env:Env):Promise<void> {
  const {results}=await env.AZRAIL_D1.prepare(`SELECT o.mission_id,m.project_id,m.goal,o.params
    FROM mission_outbox o JOIN missions m ON m.id=o.mission_id
    WHERE o.delivered=0 AND m.status='queued' ORDER BY o.created_at LIMIT 20`)
    .all<OutboxRow>();
  for(const row of results) {
    let params:DeliveryParams;
    try { params=parseMissionDelivery(row); }
    catch(error) {
      await quarantine(env,row,error instanceof Error?error.message:String(error));
      continue;
    }
    try {
      const agent=await getAgentByName(env.Orchestrator,params.projectId);
      await agent.startMission(params);
    } catch(error) {
      // A transient DO/edge failure remains retryable. The payload itself has
      // already been validated, so poison messages cannot loop forever here.
      log("error","outbox.delivery_failed",{missionId:row.mission_id,error:error instanceof Error?error.message:String(error)});
    }
  }
}
