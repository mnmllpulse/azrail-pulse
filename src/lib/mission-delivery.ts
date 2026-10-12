import type { Env } from "../types";
import { MAX_MISSION_ITERATIONS } from "./mission-limits";

export type MissionDeliveryParams = {
  missionId:string;
  projectId:string;
  goal:string;
  maxIterations:number;
  preferredModel?:string;
  publicHostname?:string;
  requestId?:string;
  traceId?:string;
};

export type MissionDeliveryRow = {
  mission_id:string;
  project_id:string;
  goal:string;
  params:string;
};

export type MissionDeliveryLease = {
  missionId:string;
  generation:number;
  leaseId:string;
  owner:string;
  expiresAt:number;
};

const DELIVERY_LEASE_MS = 45_000;

/**
 * Atomically claim one mission delivery generation for a bounded window.
 *
 * This is the cross-process fence missing from the Durable Object local
 * storage marker. Concurrent cron dispatchers, recovery calls, or a retried
 * RPC may all reach startMission(), but only one current-generation lease may
 * create a schedule at a time. A crashed scheduler becomes retryable after the
 * lease expires; runMissionTask still has the mission status/generation CAS as
 * the second line of defense against duplicate execution.
 */
export async function claimMissionDelivery(
  env:Env,
  missionId:string,
  generation:number,
  owner:string,
  now=Date.now(),
):Promise<MissionDeliveryLease|null> {
  if(!Number.isSafeInteger(generation)||generation<1||!owner||owner.length>200)return null;
  const leaseId=crypto.randomUUID();
  const expiresAt=now+DELIVERY_LEASE_MS;
  const row=await env.AZRAIL_D1.prepare(`INSERT INTO mission_delivery_leases(
      mission_id,generation,lease_id,owner,expires_at,updated_at
    )
    SELECT ?,?,?,?,?,?
    WHERE EXISTS(
      SELECT 1 FROM missions m
      JOIN mission_outbox o ON o.mission_id=m.id
      JOIN mission_delivery_state d ON d.mission_id=m.id
      WHERE m.id=? AND m.status='queued' AND o.delivered=0 AND d.generation=?
    )
    ON CONFLICT(mission_id) DO UPDATE SET
      generation=excluded.generation,lease_id=excluded.lease_id,owner=excluded.owner,
      expires_at=excluded.expires_at,updated_at=excluded.updated_at
    WHERE mission_delivery_leases.generation<>excluded.generation
       OR mission_delivery_leases.expires_at<=?
    RETURNING mission_id,generation,lease_id,owner,expires_at`)
    .bind(missionId,generation,leaseId,owner,expiresAt,now,missionId,generation,now)
    .first<{mission_id:string;generation:number;lease_id:string;owner:string;expires_at:number}>();
  return row?{missionId:row.mission_id,generation:row.generation,leaseId:row.lease_id,owner:row.owner,expiresAt:row.expires_at}:null;
}

export async function releaseMissionDeliveryLease(env:Env,lease:MissionDeliveryLease):Promise<void> {
  await env.AZRAIL_D1.prepare(`DELETE FROM mission_delivery_leases
    WHERE mission_id=? AND generation=? AND lease_id=? AND owner=?`)
    .bind(lease.missionId,lease.generation,lease.leaseId,lease.owner).run();
}

/**
 * Parse persisted outbox parameters against the authoritative mission row.
 *
 * The outbox is a delivery envelope, not a second source of truth. A damaged
 * or stale payload must never be allowed to silently change which project or
 * goal a mission executes after a retry/recovery.
 */
export function parseMissionDelivery(row:MissionDeliveryRow):MissionDeliveryParams {
  const raw=JSON.parse(row.params) as Partial<MissionDeliveryParams>;
  const authoritativeGoal=typeof row.goal==="string"?row.goal.trim():"";
  const payloadGoal=typeof raw?.goal==="string"?raw.goal.trim():"";
  if(!raw || typeof raw!=="object" ||
    raw.missionId!==row.mission_id || raw.projectId!==row.project_id ||
    !authoritativeGoal || authoritativeGoal.length>32_000 || payloadGoal!==authoritativeGoal ||
    !Number.isSafeInteger(raw.maxIterations) || (raw.maxIterations??0)<1 || (raw.maxIterations??0)>MAX_MISSION_ITERATIONS ||
    (raw.preferredModel!==undefined && (typeof raw.preferredModel!=="string" || raw.preferredModel.length>200)) ||
    (raw.publicHostname!==undefined && (typeof raw.publicHostname!=="string" || !raw.publicHostname || raw.publicHostname.length>253)) ||
    (raw.requestId!==undefined && (typeof raw.requestId!=="string" || raw.requestId.length<8 || raw.requestId.length>128)) ||
    (raw.traceId!==undefined && (typeof raw.traceId!=="string" || !/^[a-f0-9]{32}$/i.test(raw.traceId)))) {
    throw new Error("invalid outbox payload");
  }
  return {
    missionId:row.mission_id,
    projectId:row.project_id,
    goal:authoritativeGoal,
    maxIterations:raw.maxIterations!,
    ...(raw.preferredModel?{preferredModel:raw.preferredModel}:{}),
    ...(raw.publicHostname?{publicHostname:raw.publicHostname}:{}),
    ...(raw.requestId?{requestId:raw.requestId}:{}),
    ...(raw.traceId?{traceId:raw.traceId.toLowerCase()}:{}),
  };
}

/**
 * Re-arm an already terminal/suspended mission for delivery.
 *
 * The outbox row is reset in the same D1 transaction as the mission CAS. If
 * immediate DO scheduling fails afterwards, dispatchOutbox can retry safely
 * instead of leaving a queued mission with delivered=1 forever.
 */

export async function loadMissionDelivery(env:Env,missionId:string):Promise<{status:string;generation:number;delivered:boolean;params:MissionDeliveryParams}|null> {
  const row=await env.AZRAIL_D1.prepare(`SELECT m.status,m.project_id,m.goal,o.params,o.delivered,d.generation
    FROM missions m
    JOIN mission_outbox o ON o.mission_id=m.id
    JOIN mission_delivery_state d ON d.mission_id=m.id
    WHERE m.id=?`)
    .bind(missionId).first<{status:string;project_id:string;goal:string;params:string;delivered:number;generation:number}>();
  if(!row || !Number.isSafeInteger(row.generation) || row.generation<1)return null;
  return {status:row.status,generation:row.generation,delivered:row.delivered===1,params:parseMissionDelivery({mission_id:missionId,project_id:row.project_id,goal:row.goal,params:row.params})};
}

export async function markMissionDeliveryScheduled(
  env:Env,missionId:string,generation:number,leaseId?:string,
):Promise<boolean> {
  if(!Number.isSafeInteger(generation)||generation<1)return false;
  const row=await env.AZRAIL_D1.prepare(`UPDATE mission_outbox SET delivered=1
    WHERE mission_id=?
    AND EXISTS(SELECT 1 FROM missions WHERE id=?)
    AND EXISTS(SELECT 1 FROM mission_delivery_state WHERE mission_id=? AND generation=?)
    AND (? IS NULL OR EXISTS(
      SELECT 1 FROM mission_delivery_leases l
      WHERE l.mission_id=? AND l.generation=? AND l.lease_id=? AND l.expires_at>?
    ))
    RETURNING mission_id`)
    .bind(missionId,missionId,missionId,generation,leaseId??null,missionId,generation,leaseId??'',Date.now())
    .first<{mission_id:string}>();
  if(row&&leaseId){
    await env.AZRAIL_D1.prepare(`DELETE FROM mission_delivery_leases
      WHERE mission_id=? AND generation=? AND lease_id=?`).bind(missionId,generation,leaseId).run();
  }
  return !!row;
}
export async function queueMissionRecovery(
  env:Env,
  missionId:string,
  projectId:string,
  expectedStatus:string,
):Promise<boolean> {
  if(!["failed","cancelled","waiting_approval","paused"].includes(expectedStatus))return false;
  const now=new Date().toISOString();
  const nowMs=Date.now();
  const [outbox,delivery,mission]=await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`UPDATE mission_outbox SET delivered=0
      WHERE mission_id=?
      AND EXISTS (
        SELECT 1 FROM missions m WHERE m.id=? AND m.project_id=? AND m.status=?
        AND EXISTS(SELECT 1 FROM mission_delivery_state WHERE mission_id=m.id)
        AND NOT EXISTS (
          SELECT 1 FROM missions other
          WHERE other.project_id=? AND other.id<>? AND other.status IN ('queued','executing','cancelling','pausing','terminating','paused')
        )
      ) RETURNING mission_id`)
      .bind(missionId,missionId,projectId,expectedStatus,projectId,missionId),
    env.AZRAIL_D1.prepare(`UPDATE mission_delivery_state
      SET generation=generation+1,updated_at=?
      WHERE mission_id=?
      AND EXISTS(SELECT 1 FROM mission_outbox WHERE mission_id=?)
      AND EXISTS(
        SELECT 1 FROM missions m WHERE m.id=? AND m.project_id=? AND m.status=?
        AND NOT EXISTS (
          SELECT 1 FROM missions other
          WHERE other.project_id=? AND other.id<>? AND other.status IN ('queued','executing','cancelling','pausing','terminating','paused')
        )
      )
      RETURNING generation`)
      .bind(nowMs,missionId,missionId,missionId,projectId,expectedStatus,projectId,missionId),
    env.AZRAIL_D1.prepare(`UPDATE missions
      SET status='queued',updated_at=?,finished_at=NULL,result_json=NULL
      WHERE id=? AND project_id=? AND status=?
      AND EXISTS(SELECT 1 FROM mission_outbox WHERE mission_id=?)
      AND EXISTS(SELECT 1 FROM mission_delivery_state WHERE mission_id=?)
      AND NOT EXISTS (
        SELECT 1 FROM missions WHERE project_id=? AND id<>? AND status IN ('queued','executing','cancelling','pausing','terminating','paused')
      ) RETURNING id`)
      .bind(now,missionId,projectId,expectedStatus,missionId,missionId,projectId,missionId),
  ]) as Array<{results?:unknown[]}>;
  return !!outbox?.results?.length && !!delivery?.results?.length && !!mission?.results?.length;
}
