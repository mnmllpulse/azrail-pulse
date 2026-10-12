import type { Env } from "../types";

/**
 * Resolve a persisted mission snapshot only when it is still backed by the
 * same project's project_versions row. mission_snapshots.r2_key alone is not
 * an authorization/integrity boundary: a damaged row must never redirect a
 * rollback to another project or to an untracked R2 prefix.
 */
export async function loadMissionSnapshotKey(env:Env,projectId:string,missionId:string):Promise<string> {
  const link=await env.AZRAIL_D1.prepare("SELECT r2_key FROM mission_snapshots WHERE mission_id=?")
    .bind(missionId).first<{r2_key:string}>();
  if(!link)return "";
  const key=link.r2_key;
  const validScope=(key.startsWith(`projects/${projectId}/snapshots/`) || key.startsWith(`projects/${projectId}/snapshots-v2/`)) && key.endsWith("/");
  if(!validScope)throw new Error("Повреждена ссылка snapshot миссии; автоматическое восстановление запрещено.");
  const version=await env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM project_versions WHERE project_id=? AND r2_object_key=? AND created_by_agent='execution-engine'")
    .bind(projectId,key).first();
  if(!version)throw new Error("Snapshot миссии не подтверждён историей версий; автоматическое восстановление запрещено.");
  return key;
}
