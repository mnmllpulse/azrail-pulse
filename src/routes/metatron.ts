import { getAgentByName } from "agents";
import type { Env } from "../types";
import { getCors } from "../lib/cors";
import { parseInput } from "../lib/validation";
import { missionRefSchema, metatronControlSchema, faultInjectionSchema } from "../shared/schemas";
import { metatronSnapshot, retryFailedStep, saveMissionControlIntent, simulateMissionFault, type FaultScenario } from "../lib/metatron-ops";
import { isTerminal, requestCancel, requestPause, requestTerminate } from "../lib/mission-state";
import { loadMissionDelivery } from "../lib/mission-delivery";
import type { Principal } from "../lib/accounts";

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

/** Метатрон: список и снимок миссий, управление (пауза, возобновление, отмена, остановка, повтор шага), лаборатория сбоев и восстановление. */
export async function metatronRoute(
  request: Request,
  url: URL,
  env: Env,
  principal: Principal,
  parsedBody: Record<string, unknown>,
): Promise<Response | null> {
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
  return null;
}
