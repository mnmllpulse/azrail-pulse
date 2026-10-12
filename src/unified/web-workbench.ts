import type {Env} from "../types";
import type {Principal} from "../lib/accounts";
import {AccessError} from "../lib/accounts";
import type {TraceContext} from "../lib/observability-context";
import {
 compareWorkspaceSnapshot,createWorkspaceSnapshot,emitWorkbenchAction,mutateWorkbenchFile,readWorkbenchFile,recordBrowserQa,
 restoreWorkspaceSnapshot,revertWorkbenchFile,scanWorkbenchComponents,searchWorkbench,workbenchOverview,
} from "../lib/web-workbench";
import {readJsonRecord} from "./request-json";

const json=Response.json;
export async function webWorkbenchRoute(request:Request,env:Env,principal:Principal,trace?:TraceContext):Promise<Response|null>{
 const url=new URL(request.url),match=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]{1,128})\/workbench(?:\/(.*))?$/);if(!match)return null;
 const projectId=decodeURIComponent(match[1]),tail=match[2]??"";
 if(!tail&&request.method==="GET")return json(await workbenchOverview(env,projectId));
 if(tail==="file"&&request.method==="GET")return json(await readWorkbenchFile(env,projectId,url.searchParams.get("path")));
 if(tail==="search"&&request.method==="GET")return json(await searchWorkbench(env,projectId,url.searchParams.get("q")??""));
 if(tail==="components"&&request.method==="GET")return json(await scanWorkbenchComponents(env,projectId));
 if(tail==="browser-qa"&&request.method==="POST"){const body=await readJsonRecord(request,96*1024);return json(await recordBrowserQa(env,principal,projectId,body,trace),{status:201});}
 if(tail==="files"&&request.method==="POST"){
  const body=await readJsonRecord(request,2*1024*1024),result=await mutateWorkbenchFile(env,principal,projectId,body,trace);
  if("approvalRequired" in result&&result.approvalRequired)return json(result,{status:409});
  await emitWorkbenchAction(env,projectId,`tool.web_file.${String(body.action??"mutation")}`,`account:${principal.id}`,{path:body.path,targetPath:body.targetPath??null},trace);return json(result);
 }
 if(tail==="snapshots"&&request.method==="POST"){
  const body=await readJsonRecord(request,4000),result=await createWorkspaceSnapshot(env,principal,projectId,body.label);await emitWorkbenchAction(env,projectId,"tool.web_snapshot.created",`account:${principal.id}`,{snapshotId:result.snapshot.id,label:result.snapshot.label},trace);return json(result,{status:201});
 }
 if(tail==="compare"&&request.method==="GET"){
  const id=url.searchParams.get("snapshotId")??"";if(!id)throw new AccessError("snapshotId обязателен.",400);return json(await compareWorkspaceSnapshot(env,projectId,id,url.searchParams.get("path")??undefined));
 }
 if(tail==="restore"&&request.method==="POST"){
  const body=await readJsonRecord(request,6000),id=String(body.snapshotId??"");if(!id)throw new AccessError("snapshotId обязателен.",400);
  const result=await restoreWorkspaceSnapshot(env,principal,projectId,id,typeof body.approvalId==="string"?body.approvalId:undefined,trace);
  if("approvalRequired" in result)return json(result,{status:409});
  await emitWorkbenchAction(env,projectId,"tool.web_snapshot.restored",`account:${principal.id}`,{snapshotId:id,prefix:result.prefix},trace);return json(result);
 }
 if(tail==="revert-file"&&request.method==="POST"){
  const body=await readJsonRecord(request,6000),id=String(body.snapshotId??"");if(!id)throw new AccessError("snapshotId обязателен.",400);
  const result=await revertWorkbenchFile(env,principal,projectId,id,body.path,trace);await emitWorkbenchAction(env,projectId,"tool.web_file.reverted",`account:${principal.id}`,{snapshotId:id,path:body.path},trace);return json(result);
 }
 return json({error:"Workbench route не найден."},{status:404});
}
