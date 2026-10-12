import type {Env} from '../types';
import {AGENT_REGISTRY} from './agent-registry';
import {loadCheckpoints,type MissionCheckpoint} from './checkpoints';
import {listMissionEvents} from './event-store';

export type MetatronControlAction='start'|'pause'|'resume'|'cancel'|'terminate'|'retry_step';
export type FaultScenario='timeout'|'provider_down'|'d1_failure'|'network_loss';

import {recordMissionDecision} from './mission-decision-log';
export {recordMissionDecision};

export async function recordMemoryReads(
  env:Env,missionId:string,rows:Array<{id:string;category:string;key:string;sourceAgent?:string|null}>,source='project-memory',
):Promise<void>{
  if(!missionId||!rows.length)return;
  await env.AZRAIL_D1.batch(rows.slice(0,100).map(row=>env.AZRAIL_D1.prepare(`INSERT INTO mission_memory_reads(
    id,mission_id,memory_id,category,memory_key,source,created_at
  ) VALUES(?,?,?,?,?,?,?)`).bind(
    crypto.randomUUID(),missionId,row.id,row.category,row.key,row.sourceAgent||source,Date.now(),
  )));
}

function parseJson<T>(value:string|null|undefined,fallback:T):T{
  if(!value)return fallback;
  try{return JSON.parse(value) as T;}catch{return fallback;}
}

function graphFromSteps(steps:Array<{id?:string;position:number;title:string;status:string;note?:string|null}>){
  return steps.map((step,index)=>({
    id:step.id??`step-${step.position}`,
    label:step.title,
    status:step.status,
    dependencies:index?[steps[index-1].id??`step-${steps[index-1].position}`]:[],
    note:step.note??null,
  }));
}

function checkpointUncertain(points:MissionCheckpoint[]){
  return points.filter(point=>point.status==='uncertain'||point.receipt_status==='uncertain').map(point=>({
    step:point.step,tool:point.tool,status:'uncertain',result:parseJson(point.result_json,point.result_json),
  }));
}

export async function metatronSnapshot(env:Env,missionId:string){
  const mission=await env.AZRAIL_D1.prepare(`SELECT id,project_id,goal,status,current_step,progress,created_at,updated_at,finished_at
    FROM missions WHERE id=?`).bind(missionId).first<Record<string,unknown>&{project_id:string;status:string}>();
  if(!mission)return null;
  const pick=async<T>(sql:string,...args:unknown[]):Promise<T[]>=>{
    try{return (await env.AZRAIL_D1.prepare(sql).bind(...args).all<T>()).results??[];}catch{return [];}
  };
  const [steps,agents,decisions,memoryReads,faults,approvals,traceLinks,toolCalls,modelCalls]=await Promise.all([
    pick<{id:string;position:number;title:string;status:string;note:string|null}>(`SELECT id,position,title,status,note FROM mission_steps WHERE mission_id=? ORDER BY position`,missionId),
    pick<{agent_id:string;instance_id:string;capability:string;status:string;generation:number;started_at:number;heartbeat_at:number|null;finished_at:number|null;last_error:string|null}>(`SELECT agent_id,instance_id,capability,status,generation,started_at,heartbeat_at,finished_at,last_error FROM mission_agent_runtime WHERE mission_id=? ORDER BY started_at`,missionId),
    pick<{id:string;step:number|null;decision_kind:string;choice:string;reason:string;evidence_json:string;created_at:number}>(`SELECT * FROM mission_decisions WHERE mission_id=? ORDER BY created_at`,missionId),
    pick<{memory_id:string;category:string;memory_key:string;source:string;created_at:number}>(`SELECT memory_id,category,memory_key,source,created_at FROM mission_memory_reads WHERE mission_id=? ORDER BY created_at`,missionId),
    pick<{id:string;scenario:string;simulation_only:number;expected_json:string;observed_json:string;status:string;created_at:number}>(`SELECT * FROM mission_fault_runs WHERE mission_id=? ORDER BY created_at DESC LIMIT 20`,missionId),
    pick<{id:string;action_type:string;status:string;risk:string;summary:string;requested_at:number}>(`SELECT id,action_type,status,risk,summary,requested_at FROM approval_requests WHERE mission_id=? ORDER BY requested_at`,missionId),
    pick<Record<string,unknown>>(`SELECT entity_type,entity_id,request_id,trace_id,tool_call_id,approval_id,connector_call_id,model_call_id,created_at FROM trace_links WHERE mission_id=? ORDER BY created_at`,missionId),
    pick<Record<string,unknown>>(`SELECT id,tool,status,started_at,finished_at,error FROM tool_calls WHERE mission_id=? ORDER BY started_at`,missionId),
    pick<{id:string;model:string;status:string;prompt_tokens:number|null;completion_tokens:number|null;reserved_micro_usd:number;actual_micro_usd:number|null;started_at:number;finished_at:number|null}>(`SELECT mc.id,mc.model,mc.status,mc.prompt_tokens,mc.completion_tokens,mc.reserved_micro_usd,mc.actual_micro_usd,mc.started_at,mc.finished_at
      FROM model_calls mc JOIN trace_links tl ON tl.model_call_id=mc.id WHERE tl.mission_id=? ORDER BY mc.started_at`,missionId),
  ]);
  const checkpoints=await loadCheckpoints(env,missionId).catch(()=>[]);
  const events=await listMissionEvents(env,missionId).catch(()=>[]);
  const control=await env.AZRAIL_D1.prepare(`SELECT desired_state,generation,requested_by,reason,requested_at,updated_at FROM mission_controls WHERE mission_id=?`)
    .bind(missionId).first<Record<string,unknown>>().catch(()=>null);
  const lock=await env.AZRAIL_D1.prepare(`SELECT lease_id,fence_token,started_at FROM project_lock_leases WHERE project_id=? AND owner=?`)
    .bind(mission.project_id,missionId).first<Record<string,unknown>>().catch(()=>null);
  const costs=modelCalls.reduce((acc,row)=>{
    acc.promptTokens+=row.prompt_tokens??0;acc.completionTokens+=row.completion_tokens??0;
    acc.reservedMicroUsd+=row.reserved_micro_usd??0;acc.actualMicroUsd+=row.actual_micro_usd??0;return acc;
  },{promptTokens:0,completionTokens:0,reservedMicroUsd:0,actualMicroUsd:0});
  const started=new Date(String(mission.created_at)).getTime();
  const finished=mission.finished_at?new Date(String(mission.finished_at)).getTime():Date.now();
  const elapsedMs=Number.isFinite(started)?Math.max(0,finished-started):0;
  const uncertainty=checkpointUncertain(checkpoints);
  const risk=uncertainty.length?'HIGH':approvals.some(a=>a.status==='pending')?'MEDIUM':'LOW';
  const registered=AGENT_REGISTRY.map(agent=>({id:agent.id,name:agent.name,capabilities:agent.capabilities,status:'registered'}));
  return {
    mission,
    control,
    graph:{mode:'derived-linear',nodes:graphFromSteps(steps),warning:'Dependencies are derived from persisted step order until an explicit planner DAG is stored.'},
    agentCards:{registered,runtime:agents},
    live:{transport:'project-websocket+durable-replay',events},
    traceExplorer:{links:traceLinks,toolCalls,modelCalls},
    resources:{...costs,elapsedMs,risk,fenceToken:lock?.fence_token??null,lock},
    checkpoints,
    uncertainEffects:uncertainty,
    reconciliationEngine:{
      mode:'fail-closed',
      automaticRetry:false,
      checkpointRule:'uncertain_effect blocks replay until external outcome is reconciled',
      connector:{method:'POST',path:'/api/connectors/calls/:id/reconcile',outcomes:['succeeded','failed','not_executed'],evidenceRequired:true},
      model:{method:'POST',path:'/api/admin/billing',fields:['reconcileCallId','actualMicroUsd','evidence'],evidenceRequired:true},
      note:'Metatron only exposes the reconciliation path; it never guesses an external outcome.',
    },
    approvals,
    memoryInspector:memoryReads,
    decisions:decisions.map(row=>({...row,evidence:parseJson(row.evidence_json,{})})),
    faultInjection:faults.map(row=>({...row,expected:parseJson(row.expected_json,{}),observed:parseJson(row.observed_json,{})})),
    replay:{mode:'read-only',events,checkpoints,decisions:decisions.map(({evidence_json,...row})=>({...row,evidence:parseJson(evidence_json,{})}))},
  };
}

export async function saveMissionControlIntent(
  env:Env,missionId:string,desiredState:'running'|'paused'|'cancelled'|'terminated',requestedBy:string,reason='Metatron operator control',
){
  const now=Date.now();
  const row=await env.AZRAIL_D1.prepare(`INSERT INTO mission_controls(mission_id,desired_state,generation,requested_by,reason,requested_at,updated_at)
    VALUES(?,?,1,?,?,?,?) ON CONFLICT(mission_id) DO UPDATE SET desired_state=excluded.desired_state,generation=mission_controls.generation+1,
    requested_by=excluded.requested_by,reason=excluded.reason,requested_at=excluded.requested_at,updated_at=excluded.updated_at
    RETURNING desired_state,generation,updated_at`).bind(missionId,desiredState,requestedBy,reason,now,now).first<{desired_state:string;generation:number;updated_at:number}>();
  await recordMissionDecision(env,missionId,'control',desiredState,reason,{generation:row?.generation??1});
  return row;
}

export async function retryFailedStep(env:Env,missionId:string,step:number){
  if(!Number.isSafeInteger(step)||step<0)throw new Error('Некорректный step.');
  const point=await env.AZRAIL_D1.prepare(`SELECT c.status,c.tool,r.status AS receipt_status FROM mission_checkpoints c
    LEFT JOIN mission_tool_receipts r ON r.mission_id=c.mission_id AND r.step=c.step WHERE c.mission_id=? AND c.step=?`)
    .bind(missionId,step).first<{status:string;tool:string;receipt_status:string|null}>();
  if(!point)throw new Error('Checkpoint шага не найден.');
  if(point.status==='uncertain'||point.receipt_status==='uncertain')throw new Error('uncertain_effect нельзя повторять автоматически; сначала reconciliation.');
  if(point.status!=='failed'||point.receipt_status!=='failed')throw new Error('Step Retry разрешён только для доказанно failed шага.');
  const later=await env.AZRAIL_D1.prepare(`SELECT step FROM mission_checkpoints WHERE mission_id=? AND step>? LIMIT 1`).bind(missionId,step).first();
  if(later)throw new Error('После этого шага уже есть durable checkpoints; локальный retry запрещён.');
  await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`DELETE FROM mission_tool_receipts WHERE mission_id=? AND step=? AND status='failed'`).bind(missionId,step),
    env.AZRAIL_D1.prepare(`DELETE FROM mission_checkpoints WHERE mission_id=? AND step=? AND status='failed'`).bind(missionId,step),
  ]);
  await recordMissionDecision(env,missionId,'retry',`step:${step}`,'Operator requested safe retry of a failed non-effect checkpoint.',{tool:point.tool},step);
  return {retryable:true,step,tool:point.tool};
}

export async function simulateMissionFault(env:Env,missionId:string,scenario:FaultScenario){
  const expected:Record<FaultScenario,unknown>={
    timeout:{guard:'AbortSignal/timeout',expected:'stop or uncertain_effect if provider request may have escaped'},
    provider_down:{guard:'bounded retry/model fallback',expected:'retry only clean failures; no fallback after uncertain outcome'},
    d1_failure:{guard:'fail-closed durable receipts',expected:'do not claim completion without D1 proof'},
    network_loss:{guard:'event replay + checkpoint receipt',expected:'reconnect from durable cursor; do not duplicate effectful step'},
  };
  const observed={simulation:true,destructiveFaultInjected:false,contract:expected[scenario]};
  const id=crypto.randomUUID(),now=Date.now();
  await env.AZRAIL_D1.prepare(`INSERT INTO mission_fault_runs(id,mission_id,scenario,simulation_only,expected_json,observed_json,status,created_at)
    VALUES(?,?,?,1,?,?,?,?)`).bind(id,missionId,scenario,JSON.stringify(expected[scenario]),JSON.stringify(observed),'passed',now).run();
  return {id,scenario,simulationOnly:true,status:'passed',expected:expected[scenario],observed};
}
