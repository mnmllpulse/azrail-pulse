import type { Env } from "../types";
import { AccessError } from "./accounts";
import { log } from "./resilience";

export type ProjectLease = {
  projectId: string;
  owner: string;
  leaseId: string;
  fenceToken: number;
  startedAt: number;
};

type LeaseRow = {
  project_id: string;
  owner: string;
  lease_id: string;
  fence_token: number;
  started_at: number;
};

async function readLease(env: Env, projectId: string): Promise<LeaseRow | null> {
  return env.AZRAIL_D1.prepare(`SELECT project_id,owner,lease_id,fence_token,started_at
    FROM project_lock_leases WHERE project_id=?`).bind(projectId).first<LeaseRow>();
}

async function releaseLease(env: Env, lease: ProjectLease): Promise<void> {
  // The fence row is authoritative. Delete the compatibility lock only when no
  // newer lease replaced this one. This prevents an old Worker (same mission
  // owner after recovery) from deleting the lock of a newer generation.
  await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare(`DELETE FROM project_lock_leases
      WHERE project_id=? AND owner=? AND lease_id=? AND fence_token=?`)
      .bind(lease.projectId,lease.owner,lease.leaseId,lease.fenceToken),
    env.AZRAIL_D1.prepare(`DELETE FROM operation_locks
      WHERE project_id=? AND owner=?
      AND NOT EXISTS(SELECT 1 FROM project_lock_leases WHERE project_id=?)`)
      .bind(lease.projectId,lease.owner,lease.projectId),
  ]);
}

async function acquireLease(env: Env, projectId: string, owner: string): Promise<ProjectLease> {
  const leaseId=crypto.randomUUID();
  const startedAt=Date.now();

  // One D1 transaction:
  // 1) advance the monotonic project generation (gaps are harmless);
  // 2) create a lease only if neither the new lease table nor the legacy lock
  //    says the project is occupied;
  // 3) mirror the lease into operation_locks for rolling compatibility.
  // A failed acquisition may consume a generation, but it never invalidates the
  // active holder because fencing checks the lease row, not the counter value.
  let batchResult: Array<{results?:unknown[]}>;
  try {
    batchResult=await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare(`INSERT INTO project_lock_counters(project_id,generation) VALUES(?,1)
        ON CONFLICT(project_id) DO UPDATE SET generation=project_lock_counters.generation+1`)
        .bind(projectId),
      env.AZRAIL_D1.prepare(`INSERT INTO project_lock_leases(project_id,owner,lease_id,fence_token,started_at)
        SELECT ?,?,?,generation,? FROM project_lock_counters
        WHERE project_id=?
          AND NOT EXISTS(SELECT 1 FROM project_lock_leases WHERE project_id=?)
          AND NOT EXISTS(SELECT 1 FROM operation_locks WHERE project_id=?)
        RETURNING project_id,owner,lease_id,fence_token,started_at`)
        .bind(projectId,owner,leaseId,startedAt,projectId,projectId,projectId),
      env.AZRAIL_D1.prepare(`INSERT INTO operation_locks(project_id,owner,started_at)
        SELECT project_id,owner,started_at FROM project_lock_leases
        WHERE project_id=? AND lease_id=?
        ON CONFLICT(project_id) DO NOTHING RETURNING owner`)
        .bind(projectId,leaseId),
    ]);
  } catch(error) {
    // The transaction can commit before the response is lost. Prove this exact
    // lease before failing; otherwise the caller may retry and create a second
    // writer while the first lease is already durable.
    try {
      const proven=await env.AZRAIL_D1.prepare(`SELECT f.project_id,f.owner,f.lease_id,f.fence_token,f.started_at
        FROM project_lock_leases f JOIN operation_locks l ON l.project_id=f.project_id AND l.owner=f.owner
        WHERE f.project_id=? AND f.lease_id=?`).bind(projectId,leaseId).first<LeaseRow>();
      if(proven && proven.owner===owner) return {projectId,owner,leaseId,fenceToken:proven.fence_token,startedAt:proven.started_at};
    } catch(verifyError) {
      log("error","project.lease_acquire_verify_failed",{projectId,owner,leaseId,error:verifyError instanceof Error?verifyError.message:String(verifyError)});
    }
    throw error;
  }

  const [,leaseResult,compatResult]=batchResult;
  const row=leaseResult.results?.[0] as LeaseRow|undefined;
  const compat=compatResult.results?.[0] as {owner?:string}|undefined;
  if(!row || compat?.owner!==owner) {
    // If the lease row was inserted but compatibility mirroring somehow did not
    // happen, remove only this exact generation before failing closed.
    if(row) {
      try {
        await env.AZRAIL_D1.prepare(`DELETE FROM project_lock_leases
          WHERE project_id=? AND lease_id=? AND fence_token=?`).bind(projectId,leaseId,row.fence_token).run();
      } catch(error) {
        log("error","project.lease_rollback_failed",{projectId,owner,leaseId,error:error instanceof Error?error.message:String(error)});
      }
    }
    throw new AccessError("Проект занят. Если процесс прервался, используйте восстановление миссии.",409);
  }

  return {projectId,owner,leaseId,fenceToken:row.fence_token,startedAt:row.started_at};
}

/**
 * Fencing check for a long-lived writer. A stale Worker can still be alive
 * after its lock was reaped; only the latest durable lease generation may
 * continue issuing project side effects.
 */
export async function assertProjectLease(env: Env, lease: ProjectLease): Promise<void> {
  const row=await env.AZRAIL_D1.prepare(`SELECT l.owner AS legacy_owner,
      f.owner,f.lease_id,f.fence_token,f.started_at
    FROM project_lock_leases f
    LEFT JOIN operation_locks l ON l.project_id=f.project_id
    WHERE f.project_id=?`).bind(lease.projectId).first<{
      legacy_owner:string|null;owner:string;lease_id:string;fence_token:number;started_at:number;
    }>();
  if(!row || row.owner!==lease.owner || row.lease_id!==lease.leaseId || row.fence_token!==lease.fenceToken || row.legacy_owner!==lease.owner) {
    throw new AccessError("Лизинг проекта устарел: другой writer уже получил более новый fencing token.",409);
  }
}

export async function withProjectLock<T>(
  env:Env,
  project:string|undefined,
  owner:string,
  work:(lease?:ProjectLease)=>Promise<T>,
):Promise<T> {
  if(!project) return work(undefined);
  const lease=await acquireLease(env,project,owner);
  let result:T;
  try { result=await work(lease); }
  catch(error) {
    try { await releaseLease(env,lease); }
    catch(releaseError) { log("error","project.lock_release_failed",{project,owner,leaseId:lease.leaseId,fenceToken:lease.fenceToken,error:releaseError instanceof Error?releaseError.message:String(releaseError)}); }
    throw error;
  }
  try { await releaseLease(env,lease); }
  catch(releaseError) {
    // The protected operation already succeeded. Turning a lock-cleanup outage
    // into an HTTP failure invites callers to replay a non-idempotent mutation.
    // The stale-lock reaper removes the lease later; preserve the successful result.
    log("error","project.lock_release_failed",{project,owner,leaseId:lease.leaseId,fenceToken:lease.fenceToken,error:releaseError instanceof Error?releaseError.message:String(releaseError)});
  }
  return result;
}

/** Visible for recovery/reaper tests and diagnostics. */
export async function currentProjectLease(env:Env,projectId:string):Promise<ProjectLease|null> {
  const row=await readLease(env,projectId);
  return row ? {projectId:row.project_id,owner:row.owner,leaseId:row.lease_id,fenceToken:row.fence_token,startedAt:row.started_at} : null;
}

export async function requireCapability(env:Env,project:string|undefined,capability:string):Promise<void> {
  if(!["git","deploy","sandbox","qa"].includes(capability)) return;
  if(!project) throw new AccessError("Интеграция требует проект.");
  const row=await env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM project_permissions WHERE project_id=? AND capability=?").bind(project,capability).first();
  if(!row) throw new AccessError(`Администратор не разрешил ${capability} для этого проекта.`);
}
export function toolCapability(tool:string):string {
  if(tool.startsWith("sandbox_"))return "sandbox";
  if(tool==="open_pr"||tool==="git_diff")return "git";
  if(tool==="run_tests")return "qa";
  return "";
}
