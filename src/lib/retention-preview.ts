import type { Env } from "../types";

export type RetentionPreview = {
  dryRun: true;
  olderThanDays: number;
  keepNewest: number;
  versionCandidates: Array<{id:string; projectId:string; r2Key:string; createdAt:string; agent:string|null}>;
  studioCandidates: Array<{id:string; accountId:string; r2Key:string; bytes:number; createdAt:number}>;
  truncated: boolean;
  unsafeReferencesSkipped: number;
  safeToApply: false;
  note: string;
};

const RETURN_LIMIT = 250;

export function parseRetentionPreviewRequest(url: URL): {olderThanDays:number; keepNewest:number} {
  const olderThanDays=Number(url.searchParams.get("olderThanDays")??180);
  const keepNewest=Number(url.searchParams.get("keepNewest")??20);
  if(!Number.isSafeInteger(olderThanDays)||olderThanDays<30||olderThanDays>3650) {
    throw new Error("olderThanDays должен быть целым числом от 30 до 3650.");
  }
  if(!Number.isSafeInteger(keepNewest)||keepNewest<1||keepNewest>100) {
    throw new Error("keepNewest должен быть целым числом от 1 до 100.");
  }
  return {olderThanDays,keepNewest};
}

/**
 * Read-only retention proposal.
 *
 * Ranking happens inside SQLite with ROW_NUMBER() per project/account. The old
 * implementation fetched one global LIMIT ordered by owner, so one project
 * with thousands of versions could starve every later project from the preview.
 */
export async function previewRetention(
  env:Env,
  options:{olderThanDays?:number;keepNewest?:number;now?:number}={},
):Promise<RetentionPreview> {
  const olderThanDays=options.olderThanDays??180;
  const keepNewest=options.keepNewest??20;
  const now=options.now??Date.now();
  const cutoffMs=now-olderThanDays*86400000;
  const cutoffIso=new Date(cutoffMs).toISOString();

  const versions=(await env.AZRAIL_D1.prepare(`WITH ranked AS (
      SELECT id,project_id,r2_object_key,created_at,created_by_agent,
        ROW_NUMBER() OVER (
          PARTITION BY project_id
          ORDER BY datetime(created_at) DESC, id DESC
        ) AS rn
      FROM project_versions
    )
    SELECT id,project_id,r2_object_key,created_at,created_by_agent,
      ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY datetime(created_at) ASC,id ASC) AS candidate_rank
    FROM ranked r
    WHERE r.rn>?
      AND datetime(r.created_at)<=datetime(?)
      AND NOT EXISTS(SELECT 1 FROM workspace_heads h WHERE h.prefix=r.r2_object_key)
      AND NOT EXISTS(SELECT 1 FROM mission_snapshots s WHERE s.r2_key=r.r2_object_key)
    ORDER BY candidate_rank ASC, datetime(r.created_at) ASC, r.id ASC
    LIMIT ${RETURN_LIMIT+1}`)
    .bind(keepNewest,cutoffIso).all<{
      id:string;project_id:string;r2_object_key:string;created_at:string;created_by_agent:string|null
    }>()).results;

  const artifacts=(await env.AZRAIL_D1.prepare(`WITH ranked AS (
      SELECT id,account_id,r2_key,bytes,created_at,
        ROW_NUMBER() OVER (
          PARTITION BY account_id
          ORDER BY created_at DESC, id DESC
        ) AS rn
      FROM studio_artifacts
    )
    SELECT id,account_id,r2_key,bytes,created_at,
      ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY created_at ASC,id ASC) AS candidate_rank
    FROM ranked
    WHERE rn>? AND created_at<=?
    ORDER BY candidate_rank ASC,created_at ASC,id ASC
    LIMIT ${RETURN_LIMIT+1}`)
    .bind(keepNewest,cutoffMs).all<{
      id:string;account_id:string;r2_key:string;bytes:number;created_at:number
    }>()).results;

  const truncated=versions.length>RETURN_LIMIT||artifacts.length>RETURN_LIMIT;
  let unsafeReferencesSkipped=0;
  const versionCandidates=versions.slice(0,RETURN_LIMIT).flatMap(row=>{
    if(!row.r2_object_key.startsWith(`projects/${row.project_id}/`)){unsafeReferencesSkipped++;return [];}
    return [{id:row.id,projectId:row.project_id,r2Key:row.r2_object_key,createdAt:row.created_at,agent:row.created_by_agent}];
  });
  const studioCandidates=artifacts.slice(0,RETURN_LIMIT).flatMap(row=>{
    if(!row.r2_key.startsWith(`studio/${row.account_id}/`)){unsafeReferencesSkipped++;return [];}
    return [{id:row.id,accountId:row.account_id,r2Key:row.r2_key,bytes:row.bytes,createdAt:row.created_at}];
  });

  return {
    dryRun:true,olderThanDays,keepNewest,versionCandidates,studioCandidates,truncated,unsafeReferencesSkipped,safeToApply:false,
    note:truncated
      ? "Preview содержит больше кандидатов, чем безопасно возвращать одним ответом; применять удаление по усечённому набору запрещено."
      : unsafeReferencesSkipped
        ? "Только preview. Повреждённые или cross-scope R2 ссылки исключены из кандидатов; автоматическое удаление запрещено."
        : "Только preview. Политика retention не применяется автоматически и требует отдельного подтверждения.",
  };
}
