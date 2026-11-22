import type { Env } from "../types";
import { getCors } from "../lib/cors";
import { requireResource, type Principal } from "../lib/accounts";
import { parseInput, queryObject } from "../lib/validation";
import { backupCreateSchema, backupQuerySchema, backupDeleteQuerySchema, backupRestoreSchema } from "../shared/schemas";
import { backupProject, deleteBackup, restoreBackup } from "../lib/backups";
import { approvalDigest, claimApproval, completeApproval, requestApproval } from "../lib/approval-engine";
import { childTrace, type TraceContext } from "../lib/observability-context";

function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: getCors(env, { "Content-Type": "application/json" }) });
}

export async function backupsRoute(
  request: Request,
  url: URL,
  env: Env,
  principal: Principal,
  parsedBody: Record<string, unknown>,
  trace: TraceContext,
): Promise<Response | null> {
    if(url.pathname === "/api/backups" && request.method === "POST") {
      const project=parseInput(backupCreateSchema,parsedBody).projectId;
      return jsonResponse(await backupProject(env,project),env,201);
    }
    if(url.pathname === "/api/backups" && request.method === "GET") {
      const project=parseInput(backupQuerySchema,queryObject(url)).projectId;
      return jsonResponse({backups:(await env.AZRAIL_D1.prepare("SELECT id,created_at,file_count FROM backup_manifests WHERE project_id=? ORDER BY created_at DESC LIMIT 50").bind(project).all()).results},env);
    }
    if(url.pathname === "/api/backups" && request.method === "DELETE") {
      const {projectId:project,backupId}=parseInput(backupDeleteQuerySchema,queryObject(url));
      return jsonResponse(await deleteBackup(env,project,backupId),env);
    }
    if(url.pathname === "/api/backups/restore" && request.method === "POST") {
      const restoreInput=parseInput(backupRestoreSchema,parsedBody);
      const project=restoreInput.projectId,target=restoreInput.targetProjectId,backupId=restoreInput.backupId;
      const payloadDigest=await approvalDigest({projectId:project,targetProjectId:target,backupId});
      const scopeId=`${project}:${backupId}:${target}`;
      const approvalId=restoreInput.approvalId??"";
      if(!approvalId){
        const approval=await requestApproval(env,{accountId:principal.id,projectId:project,actionType:"restore",risk:"critical",scopeType:"backup_restore",scopeId,payloadDigest,summary:`Восстановить backup ${backupId} проекта ${project} в новый проект ${target}`,requestedBy:`account:${principal.id}`,trace});
        return jsonResponse({error:"Нужно отдельное подтверждение восстановления.",approvalRequired:true,approval},env,409);
      }
      await claimApproval(env,{id:approvalId,actionType:"restore",scopeType:"backup_restore",scopeId,payloadDigest,actor:`restore:${principal.id}`});
      try {
        await requireResource(env,principal,"project",target,true);
        const restored=await restoreBackup(env,project,backupId,target,childTrace(trace,{approvalId}));
        await completeApproval(env,{id:approvalId,actor:`restore:${principal.id}`,outcome:"executed",detail:{restored:restored.restored,target}});
        return jsonResponse(restored,env);
      } catch(error) {
        await completeApproval(env,{id:approvalId,actor:`restore:${principal.id}`,outcome:"failed",detail:{error:error instanceof Error?error.message:String(error)}}).catch(()=>{});
        throw error;
      }
    }
  return null;
}
