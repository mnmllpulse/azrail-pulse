import type { Env } from "../types";
import { UnsafePathError } from "./safe-path";
import { cleanupUnpublishedR2, deleteR2KeysBestEffort } from "./r2-consistency";
import { log } from "./resilience";
import { assertProjectLease, type ProjectLease } from "./project-control";
import { emitEvent } from "./event-stream";
import type { TraceContext } from "./observability-context";

export function workspacePath(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 500 || /[\\\x00-\x1f\x7f]/.test(value)
      || value.split("/").some(p => !p || p === "." || p === "..")) {
    throw new UnsafePathError("workspace path", value);
  }
  return value;
}

/** 0.8's default prefix stored URL-encoded segments; published versions used raw paths.
 * New versioned workspaces and snapshots use raw R2 keys (R2 is not a URL). */
export function storedWorkspacePath(prefix: string, path: string): string {
  const safe = workspacePath(path);
  return prefix.endsWith("/workspace/") ? safe.split("/").map(encodeURIComponent).join("/") : safe;
}
export function logicalWorkspacePath(prefix: string, stored: string): string {
  const path = prefix.endsWith("/workspace/") ? stored.split("/").map(decodeURIComponent).join("/") : stored;
  return workspacePath(path);
}
export async function workspacePrefix(env: Env, project: string): Promise<string> {
  const fallback = `projects/${project}/workspace/`;
  if (!env.AZRAIL_D1) return fallback;
  const row = await env.AZRAIL_D1.prepare(`SELECT h.prefix,p.prefix AS published_prefix
    FROM workspace_heads h
    LEFT JOIN workspace_publications p ON p.prefix=h.prefix AND p.project_id=h.project_id
    WHERE h.project_id=?`)
    .bind(project).first<{prefix:string;published_prefix:string|null}>();
  if (!row) return fallback;
  if (!row.prefix.startsWith(`projects/${project}/workspace-versions/`) || !row.prefix.endsWith("/"))
    throw new Error("Invalid workspace head");
  if (!row.published_prefix) throw new Error("Workspace head has no immutable publication provenance");
  return row.prefix;
}

const encoder = new TextEncoder();

function bytesOf(content:string|Uint8Array):Uint8Array {
  return typeof content === "string" ? encoder.encode(content) : new Uint8Array(content);
}

async function sha256Hex(bytes:Uint8Array):Promise<string> {
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

async function workspaceManifest(files:Array<{path:string;bytes:Uint8Array}>):Promise<{hash:string;totalBytes:number}> {
  const entries:string[]=[];
  let totalBytes=0;
  for(const file of [...files].sort((a,b)=>a.path.localeCompare(b.path))) {
    totalBytes+=file.bytes.byteLength;
    entries.push(`${file.path}\0${file.bytes.byteLength}\0${await sha256Hex(file.bytes)}`);
  }
  return {hash:await sha256Hex(encoder.encode(entries.join("\n"))),totalBytes};
}

async function publicationEvent(env:Env,project:string,prefix:string,basePrefix:string,manifest:{hash:string;totalBytes:number},fileCount:number,responseLost=false,trace?:TraceContext){
  try{await emitEvent(env,{domain:"publication",type:"publication.workspace.published",projectId:project,subjectType:"workspace",subjectId:prefix,actor:"workspace-head",payload:{prefix,basePrefix,manifestHash:manifest.hash,fileCount,totalBytes:manifest.totalBytes,responseLost},trace});}
  catch(error){log("warn","workspace.event_stream_failed",{project,prefix,error:error instanceof Error?error.message:String(error)});}
}

/**
 * Publish a complete workspace snapshot using an optimistic compare-and-swap.
 *
 * Project locks serialize every current writer, but the D1 CAS is a second
 * boundary: a stale exporter/rollback must never overwrite a newer head if a
 * future caller bypasses the lock or a lease is recovered concurrently.
 */
export async function publishWorkspace(env: Env, project: string, files: Array<{path:string;content:string|Uint8Array}>, lease: ProjectLease, trace?: TraceContext) {
  if (lease.projectId !== project) throw new Error("Workspace writer lease belongs to another project");
  await assertProjectLease(env, lease);
  const staged = files.map(f=>({path:workspacePath(f.path),bytes:bytesOf(f.content)}));
  const paths = staged.map(f=>f.path);
  if (new Set(paths).size !== paths.length) throw new Error("Duplicate workspace paths");
  const basePrefix = await workspacePrefix(env, project);
  const prefix = `projects/${project}/workspace-versions/${crypto.randomUUID()}/`;
  const written:string[] = [];
  const manifest=await workspaceManifest(staged);

  // Phase 1: stage an immutable byte snapshot in a fresh, unreachable prefix.
  // Uint8Array inputs are copied before the first await so a caller cannot
  // mutate the backing buffer while publication is in progress.
  try {
    for (const f of staged) {
      const key=prefix + f.path;
      await env.AZRAIL_R2.put(key, f.bytes);
      written.push(key);
    }
  } catch (error) {
    // No D1 head write has been attempted yet, so this random prefix cannot be
    // published by this operation. Cleanup is unconditionally safe.
    await deleteR2KeysBestEffort(env,written,"workspace.stage_cleanup",{project,prefix});
    throw error;
  }

  // Phase 2: publish with one conditional D1 head flip. Existing heads are
  // replaced only when they still equal the prefix we observed before staging.
  // If no row exists yet, the INSERT wins exactly once; a concurrent publisher
  // then sees a non-matching versioned prefix and is rejected.
  try {
    await assertProjectLease(env,lease);
    const fallback=`projects/${project}/workspace/`;
    const [publication,head]=await env.AZRAIL_D1.batch([
      env.AZRAIL_D1.prepare(`INSERT INTO workspace_publications(
          prefix,project_id,parent_prefix,manifest_hash,file_count,total_bytes,lease_id,fence_token,created_at
        )
        SELECT ?,?,?,?,?,?,?,?,?
        WHERE EXISTS(
          SELECT 1 FROM project_lock_leases f
          JOIN operation_locks l ON l.project_id=f.project_id AND l.owner=f.owner
          WHERE f.project_id=? AND f.owner=? AND f.lease_id=? AND f.fence_token=?
        )
        AND (
          (NOT EXISTS(SELECT 1 FROM workspace_heads WHERE project_id=?) AND ?=?)
          OR EXISTS(SELECT 1 FROM workspace_heads WHERE project_id=? AND prefix=?)
        )
        ON CONFLICT(prefix) DO NOTHING
        RETURNING prefix`)
        .bind(prefix,project,basePrefix,manifest.hash,staged.length,manifest.totalBytes,lease.leaseId,lease.fenceToken,Date.now(),
          project,lease.owner,lease.leaseId,lease.fenceToken,project,basePrefix,fallback,project,basePrefix),
      env.AZRAIL_D1.prepare(`INSERT INTO workspace_heads(project_id,prefix)
        SELECT ?,?
        WHERE EXISTS(SELECT 1 FROM workspace_publications WHERE prefix=? AND project_id=? AND manifest_hash=? AND lease_id=? AND fence_token=?)
          AND EXISTS(
            SELECT 1 FROM project_lock_leases f
            JOIN operation_locks l ON l.project_id=f.project_id AND l.owner=f.owner
            WHERE f.project_id=? AND f.owner=? AND f.lease_id=? AND f.fence_token=?
          )
        ON CONFLICT(project_id) DO UPDATE SET prefix=excluded.prefix
        WHERE workspace_heads.prefix=?
          AND EXISTS(SELECT 1 FROM workspace_publications WHERE prefix=excluded.prefix AND project_id=workspace_heads.project_id AND manifest_hash=? AND lease_id=? AND fence_token=?)
          AND EXISTS(
            SELECT 1 FROM project_lock_leases f
            JOIN operation_locks l ON l.project_id=f.project_id AND l.owner=f.owner
            WHERE f.project_id=? AND f.owner=? AND f.lease_id=? AND f.fence_token=?
          )
        RETURNING prefix`)
        .bind(project,prefix,prefix,project,manifest.hash,lease.leaseId,lease.fenceToken,
          project,lease.owner,lease.leaseId,lease.fenceToken,
          basePrefix,manifest.hash,lease.leaseId,lease.fenceToken,project,lease.owner,lease.leaseId,lease.fenceToken),
    ]) as Array<{results?:unknown[]}>;
    const publicationOk=!!publication?.results?.length;
    const headOk=!!head?.results?.length;
    if (!publicationOk || !headOk) {
      await deleteR2KeysBestEffort(env,written,"workspace.cas_conflict_cleanup",{project,prefix,basePrefix,leaseId:lease.leaseId,fenceToken:lease.fenceToken});
      // If the immutable registry insert succeeded but the head did not, remove
      // only the unreachable registry row. Never delete a published record.
      await env.AZRAIL_D1.prepare(`DELETE FROM workspace_publications WHERE prefix=?
        AND NOT EXISTS(SELECT 1 FROM workspace_heads WHERE prefix=?)`).bind(prefix,prefix).run().catch(()=>{});
      await assertProjectLease(env,lease);
      throw new Error("Рабочая область изменилась во время публикации; устаревшая версия не применена.");
    }
    await publicationEvent(env,project,prefix,basePrefix,manifest,staged.length,false,trace);
    return prefix;
  } catch (error) {
    // A thrown D1 call is ambiguous: the write may have committed before the
    // response was lost. Never delete the R2 tree until D1 proves that the new
    // prefix is NOT the active head.
    const cleanup=await cleanupUnpublishedR2(
      env,
      written,
      async()=>{
        const row=await env.AZRAIL_D1.prepare("SELECT prefix FROM workspace_heads WHERE project_id=?").bind(project).first<{prefix:string}>();
        return row?.prefix===prefix;
      },
      "workspace.publish_cleanup",
      {project,prefix,basePrefix},
    );
    if(cleanup.published===true){
      // The D1 mutation committed and only its response was lost. Preserve the
      // published tree and return success so the caller does not replay it.
      log("warn","workspace.publish_response_lost",{project,prefix,basePrefix});
      await publicationEvent(env,project,prefix,basePrefix,manifest,staged.length,true,trace);
      return prefix;
    }
    // published===null means the verification read failed: objects are kept,
    // but the original error is propagated because success cannot be proven.
    throw error;
  }
}
