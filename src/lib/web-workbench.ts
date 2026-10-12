import type {Env} from "../types";
import type {Principal} from "./accounts";
import {AccessError} from "./accounts";
import {withProjectLock} from "./project-control";
import {logicalWorkspacePath,publishWorkspace,storedWorkspacePath,workspacePath,workspacePrefix} from "./workspace-head";
import {searchFiles} from "./workspace";
import {approvalDigest,claimApproval,completeApproval,requestApproval} from "./approval-engine";
import {emitEvent} from "./event-stream";
import type {TraceContext} from "./observability-context";

const MAX_FILES=400;
const MAX_TOTAL_BYTES=16*1024*1024;
const MAX_TEXT_BYTES=1024*1024;
const READ_BATCH=12;
const TEXT_EXT=/\.(?:html?|css|m?[jt]sx?|tsx?|jsx?|json|md|txt|xml|svg|ya?ml|toml|ini|py|rb|go|rs|java|kt|php|sql|sh|bash|zsh|c|cc|cpp|h|hpp|vue|svelte)$/i;

export type WorkbenchFile={path:string;size:number;uploaded?:string;sha256?:string};
export type WorkspaceSnapshot={id:string;projectId:string;prefix:string;manifestHash:string;label:string;createdBy:string;createdAt:number};

type SnapshotRow={id:string;project_id:string;prefix:string;manifest_hash:string;label:string;created_by:string;created_at:number};
type PublicationRow={prefix:string;manifest_hash:string;file_count:number;total_bytes:number;created_at:number;parent_prefix:string};
type BytesFile={path:string;bytes:Uint8Array};

function toSnapshot(row:SnapshotRow):WorkspaceSnapshot{
 return {id:row.id,projectId:row.project_id,prefix:row.prefix,manifestHash:row.manifest_hash,label:row.label,createdBy:row.created_by,createdAt:row.created_at};
}

async function sha256(bytes:Uint8Array):Promise<string>{
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");
}

export function languageForPath(path:string):string{
 const ext=path.toLowerCase().split(".").pop()??"";
 return ({html:"html",htm:"html",css:"css",js:"javascript",mjs:"javascript",cjs:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",json:"json",md:"markdown",py:"python",svg:"xml",xml:"xml",sql:"sql",sh:"shell",bash:"shell"} as Record<string,string>)[ext]??"text";
}

function assertTextPath(value:unknown):string{
 const path=workspacePath(value);
 if(!TEXT_EXT.test(path))throw new AccessError("Web Studio редактирует только текстовые файлы. Бинарные файлы доступны через проект и вложения.",415);
 return path;
}

async function prefixFiles(env:Env,projectId:string,prefix:string):Promise<BytesFile[]>{
 if(prefix!==`projects/${projectId}/workspace/`&&!prefix.startsWith(`projects/${projectId}/workspace-versions/`))throw new AccessError("Некорректная workspace revision.",409);
 const objects:R2Object[]=[];let cursor:string|undefined,total=0;const seen=new Set<string>();
 do{
  const page=await env.AZRAIL_R2.list({prefix,limit:Math.min(1000,MAX_FILES+1-objects.length),cursor});
  objects.push(...page.objects);
  if(objects.length>MAX_FILES)throw new AccessError(`Workspace превышает лимит Web Studio: ${MAX_FILES} файлов.`,413);
  for(const o of page.objects){total+=o.size;if(total>MAX_TOTAL_BYTES)throw new AccessError("Workspace превышает 16 MiB — используйте миссию/архив вместо интерактивного редактора.",413);}
  if(!page.truncated)break;
  if(!page.cursor||seen.has(page.cursor))throw new Error("Incomplete R2 listing");seen.add(page.cursor);cursor=page.cursor;
 }while(true);
 const files:BytesFile[]=[];
 for(let i=0;i<objects.length;i+=READ_BATCH){
  const batch=await Promise.all(objects.slice(i,i+READ_BATCH).map(async o=>{
   const obj=await env.AZRAIL_R2.get(o.key);if(!obj||obj.size!==o.size)throw new AccessError("Workspace изменился во время чтения. Повторите операцию.",409);
   return {path:logicalWorkspacePath(prefix,o.key.slice(prefix.length)),bytes:new Uint8Array(await obj.arrayBuffer())};
  }));files.push(...batch);
 }
 return files;
}

async function currentFiles(env:Env,projectId:string):Promise<{prefix:string;files:BytesFile[]}>{
 const prefix=await workspacePrefix(env,projectId);return {prefix,files:await prefixFiles(env,projectId,prefix)};
}

async function publication(env:Env,projectId:string,prefix:string):Promise<PublicationRow>{
 const row=await env.AZRAIL_D1.prepare(`SELECT prefix,manifest_hash,file_count,total_bytes,created_at,parent_prefix
   FROM workspace_publications WHERE project_id=? AND prefix=?`).bind(projectId,prefix).first<PublicationRow>();
 if(!row)throw new AccessError("Workspace revision не зарегистрирована как immutable publication.",409);return row;
}

export async function workbenchOverview(env:Env,projectId:string){
 const prefix=await workspacePrefix(env,projectId);
 const [pub,snapshots,mission,events]=await Promise.all([
  publication(env,projectId,prefix).catch(()=>null),
  env.AZRAIL_D1.prepare(`SELECT id,project_id,prefix,manifest_hash,label,created_by,created_at FROM workspace_snapshots WHERE project_id=? ORDER BY created_at DESC LIMIT 50`).bind(projectId).all<SnapshotRow>(),
  env.AZRAIL_D1.prepare(`SELECT id,status,goal,created_at,updated_at FROM missions WHERE project_id=? ORDER BY created_at DESC LIMIT 1`).bind(projectId).first(),
  env.AZRAIL_D1.prepare(`SELECT seq,domain,type,actor,created_at,payload_json FROM event_stream WHERE project_id=? ORDER BY seq DESC LIMIT 120`).bind(projectId).all(),
 ]);
 const list=await env.AZRAIL_R2.list({prefix,limit:MAX_FILES+1});
 const files=list.objects.slice(0,MAX_FILES).map(o=>({path:logicalWorkspacePath(prefix,o.key.slice(prefix.length)),size:o.size,uploaded:o.uploaded?.toISOString?.()??String(o.uploaded??"")}));
 return {prefix,publication:pub,files,truncated:list.truncated||list.objects.length>MAX_FILES,snapshots:(snapshots.results??[]).map(toSnapshot),mission,events:(events.results??[]).reverse(),limits:{maxFiles:MAX_FILES,maxTotalBytes:MAX_TOTAL_BYTES,maxTextBytes:MAX_TEXT_BYTES}};
}

export async function readWorkbenchFile(env:Env,projectId:string,rawPath:unknown){
 const path=assertTextPath(rawPath),prefix=await workspacePrefix(env,projectId),key=prefix+storedWorkspacePath(prefix,path),obj=await env.AZRAIL_R2.get(key);
 if(!obj)throw new AccessError("Файл не найден.",404);if(obj.size>MAX_TEXT_BYTES)throw new AccessError("Файл больше 1 MiB. Откройте его через экспорт проекта.",413);
 const bytes=new Uint8Array(await obj.arrayBuffer());if(bytes.includes(0))throw new AccessError("Бинарный файл нельзя открыть в редакторе.",415);
 return {path,size:bytes.length,sha256:await sha256(bytes),language:languageForPath(path),content:new TextDecoder().decode(bytes)};
}

export async function searchWorkbench(env:Env,projectId:string,q:string){
 const query=q.trim();if(!query||query.length>200)throw new AccessError("Поиск должен содержать от 1 до 200 символов.",400);return searchFiles(env,projectId,query,80);
}

function fileIndex(files:BytesFile[]):Map<string,BytesFile>{return new Map(files.map(f=>[f.path,f]));}

async function publishMutation(env:Env,projectId:string,actor:string,mutate:(files:BytesFile[])=>Promise<void>|void,trace?:TraceContext){
 return withProjectLock(env,projectId,`web-studio:${actor}:${crypto.randomUUID()}`,async lease=>{
  if(!lease)throw new Error("Project lease missing");const {files}=await currentFiles(env,projectId);await mutate(files);
  const prefix=await publishWorkspace(env,projectId,files.map(f=>({path:f.path,content:f.bytes})),lease,trace);
  return {prefix,fileCount:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes.length,0)};
 });
}

export async function mutateWorkbenchFile(env:Env,principal:Principal,projectId:string,body:Record<string,unknown>,trace?:TraceContext){
 const action=String(body.action??"");if(!["create","update","rename","move","delete"].includes(action))throw new AccessError("Неизвестная операция файла.",400);
 const path=assertTextPath(body.path);const target=action==="rename"||action==="move"?assertTextPath(body.targetPath):"";
 const actor=`account:${principal.id}`;
 if(action==="delete"){
  const opened=await readWorkbenchFile(env,projectId,path);const digest=await approvalDigest({projectId,path,sha256:opened.sha256});const scopeId=`${projectId}:${path}`;
  const approvalId=typeof body.approvalId==="string"?body.approvalId:"";
  if(!approvalId){const approval=await requestApproval(env,{accountId:principal.id,projectId,actionType:"delete_file",risk:"high",scopeType:"workspace_file",scopeId,payloadDigest:digest,summary:`Удалить ${path} из Web Studio`,requestedBy:actor,trace});return {approvalRequired:true,approval};}
  await claimApproval(env,{id:approvalId,actionType:"delete_file",scopeType:"workspace_file",scopeId,payloadDigest:digest,actor});
  try{
   const result=await publishMutation(env,projectId,principal.id,files=>{const i=files.findIndex(f=>f.path===path);if(i<0)throw new AccessError("Файл уже отсутствует.",409);files.splice(i,1);},trace);
   await completeApproval(env,{id:approvalId,actor,outcome:"executed",detail:{projectId,path,prefix:result.prefix}});return {...result,deleted:path};
  }catch(error){await completeApproval(env,{id:approvalId,actor,outcome:"failed",detail:{error:error instanceof Error?error.message:String(error)}}).catch(()=>{});throw error;}
 }
 const content=typeof body.content==="string"?body.content:"";const bytes=new TextEncoder().encode(content);if((action==="create"||action==="update")&&bytes.length>MAX_TEXT_BYTES)throw new AccessError("Файл больше 1 MiB.",413);
 return publishMutation(env,projectId,principal.id,async files=>{
  const idx=fileIndex(files),existing=idx.get(path);
  if(action==="create"){
   if(existing)throw new AccessError("Файл уже существует.",409);files.push({path,bytes});return;
  }
  if(action==="update"){
   if(!existing)throw new AccessError("Файл не найден.",404);const expected=typeof body.expectedSha256==="string"?body.expectedSha256:"";if(!expected||await sha256(existing.bytes)!==expected)throw new AccessError("Файл изменился после открытия. Обновите редактор перед сохранением.",409);existing.bytes=bytes;return;
  }
  if(!existing)throw new AccessError("Исходный файл не найден.",404);if(idx.has(target))throw new AccessError("Целевой путь уже существует.",409);existing.path=target;
 },trace);
}

export async function createWorkspaceSnapshot(env:Env,principal:Principal,projectId:string,labelRaw:unknown){
 const prefix=await workspacePrefix(env,projectId),pub=await publication(env,projectId,prefix),id=crypto.randomUUID(),label=String(labelRaw??"").trim().slice(0,120)||`Snapshot ${new Date().toISOString()}`;
 await env.AZRAIL_D1.prepare(`INSERT INTO workspace_snapshots(id,project_id,prefix,manifest_hash,label,created_by,created_at) VALUES(?,?,?,?,?,?,?)`)
  .bind(id,projectId,prefix,pub.manifest_hash,label,principal.id,Date.now()).run();
 return {snapshot:{id,projectId,prefix,manifestHash:pub.manifest_hash,label,createdBy:principal.id,createdAt:Date.now()}};
}

async function snapshotRow(env:Env,projectId:string,id:string):Promise<SnapshotRow>{
 const row=await env.AZRAIL_D1.prepare(`SELECT id,project_id,prefix,manifest_hash,label,created_by,created_at FROM workspace_snapshots WHERE id=? AND project_id=?`).bind(id,projectId).first<SnapshotRow>();
 if(!row)throw new AccessError("Snapshot не найден.",404);await publication(env,projectId,row.prefix);return row;
}

export async function compareWorkspaceSnapshot(env:Env,projectId:string,snapshotId:string,pathRaw?:string){
 const snapshot=await snapshotRow(env,projectId,snapshotId),base=await prefixFiles(env,projectId,snapshot.prefix),current=(await currentFiles(env,projectId)).files;
 const b=fileIndex(base),c=fileIndex(current),paths=[...new Set([...b.keys(),...c.keys()])].sort();const changes:Array<{path:string;status:"added"|"deleted"|"changed";beforeSha?:string;afterSha?:string}>=[];
 for(const path of paths){const before=b.get(path),after=c.get(path);if(!before&&after){changes.push({path,status:"added",afterSha:await sha256(after.bytes)});continue;}if(before&&!after){changes.push({path,status:"deleted",beforeSha:await sha256(before.bytes)});continue;}if(before&&after){const [x,y]=await Promise.all([sha256(before.bytes),sha256(after.bytes)]);if(x!==y)changes.push({path,status:"changed",beforeSha:x,afterSha:y});}}
 let detail:null|{path:string;before:string;after:string;language:string}=null;
 if(pathRaw){const path=assertTextPath(pathRaw),before=b.get(path),after=c.get(path);if((before?.bytes.length??0)>MAX_TEXT_BYTES||(after?.bytes.length??0)>MAX_TEXT_BYTES)throw new AccessError("Файл слишком велик для diff.",413);detail={path,before:before?new TextDecoder().decode(before.bytes):"",after:after?new TextDecoder().decode(after.bytes):"",language:languageForPath(path)};}
 return {snapshot:toSnapshot(snapshot),changes,detail};
}

export async function restoreWorkspaceSnapshot(env:Env,principal:Principal,projectId:string,snapshotId:string,approvalId:string|undefined,trace?:TraceContext){
 const snapshot=await snapshotRow(env,projectId,snapshotId),digest=await approvalDigest({projectId,snapshotId,prefix:snapshot.prefix,manifestHash:snapshot.manifest_hash}),scopeId=`${projectId}:${snapshotId}`,actor=`account:${principal.id}`;
 if(!approvalId){const approval=await requestApproval(env,{accountId:principal.id,projectId,actionType:"restore",risk:"high",scopeType:"workspace_snapshot",scopeId,payloadDigest:digest,summary:`Восстановить snapshot «${snapshot.label}» в новую workspace revision`,requestedBy:actor,trace});return {approvalRequired:true,approval};}
 await claimApproval(env,{id:approvalId,actionType:"restore",scopeType:"workspace_snapshot",scopeId,payloadDigest:digest,actor});
 try{
  const files=await prefixFiles(env,projectId,snapshot.prefix),result=await withProjectLock(env,projectId,`web-restore:${principal.id}:${crypto.randomUUID()}`,async lease=>{if(!lease)throw new Error("Project lease missing");const prefix=await publishWorkspace(env,projectId,files.map(f=>({path:f.path,content:f.bytes})),lease,trace);return {prefix,fileCount:files.length};});
  await completeApproval(env,{id:approvalId,actor,outcome:"executed",detail:{projectId,snapshotId,prefix:result.prefix}});return result;
 }catch(error){await completeApproval(env,{id:approvalId,actor,outcome:"failed",detail:{error:error instanceof Error?error.message:String(error)}}).catch(()=>{});throw error;}
}

export async function revertWorkbenchFile(env:Env,principal:Principal,projectId:string,snapshotId:string,rawPath:unknown,trace?:TraceContext){
 const path=assertTextPath(rawPath),snapshot=await snapshotRow(env,projectId,snapshotId),base=await prefixFiles(env,projectId,snapshot.prefix),source=fileIndex(base).get(path);
 return publishMutation(env,projectId,principal.id,files=>{const idx=files.findIndex(f=>f.path===path);if(!source){if(idx>=0)files.splice(idx,1);return;}if(idx>=0)files[idx]={path,bytes:source.bytes};else files.push({path,bytes:source.bytes});},trace);
}


export type WorkbenchComponent={path:string;line:number;name:string;kind:"react-function"|"react-const"|"react-class"|"html-id"|"html-component";selector?:string};

function pushComponent(out:WorkbenchComponent[],seen:Set<string>,item:WorkbenchComponent){const key=`${item.path}:${item.line}:${item.kind}:${item.name}`;if(seen.has(key))return;seen.add(key);out.push(item);}

export async function scanWorkbenchComponents(env:Env,projectId:string):Promise<{items:WorkbenchComponent[];scannedFiles:number}> {
 const {files}=await currentFiles(env,projectId),items:WorkbenchComponent[]=[],seen=new Set<string>();let scannedFiles=0;
 for(const file of files){if(file.bytes.length>MAX_TEXT_BYTES||!TEXT_EXT.test(file.path))continue;const text=new TextDecoder().decode(file.bytes);if(text.includes("\u0000"))continue;scannedFiles++;const lines=text.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){const line=lines[i],n=i+1;let m:RegExpMatchArray|null;
   if((m=line.match(/(?:export\s+default\s+|export\s+)?function\s+([A-Z][A-Za-z0-9_$]*)\s*\(/)))pushComponent(items,seen,{path:file.path,line:n,name:m[1],kind:"react-function"});
   if((m=line.match(/(?:export\s+)?(?:const|let)\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/)))pushComponent(items,seen,{path:file.path,line:n,name:m[1],kind:"react-const"});
   if((m=line.match(/(?:export\s+default\s+|export\s+)?class\s+([A-Z][A-Za-z0-9_$]*)\s+extends\s+(?:React\.)?(?:Component|PureComponent)/)))pushComponent(items,seen,{path:file.path,line:n,name:m[1],kind:"react-class"});
   if((m=line.match(/<([a-z][\w:-]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/i)))pushComponent(items,seen,{path:file.path,line:n,name:m[2],kind:"html-id",selector:`#${m[2]}`});
   if((m=line.match(/<([a-z][\w:-]*)\b[^>]*\bdata-component=["']([^"']+)["'][^>]*>/i)))pushComponent(items,seen,{path:file.path,line:n,name:m[2],kind:"html-component",selector:`[data-component="${m[2].replaceAll('"','\\"')}"]`});
  }
 }
 items.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.name.localeCompare(b.name));return {items:items.slice(0,1200),scannedFiles};
}

type BrowserQaFinding={severity:"critical"|"major"|"minor";code:string;message:string;selector?:string};
export async function recordBrowserQa(env:Env,principal:Principal,projectId:string,body:Record<string,unknown>,trace?:TraceContext){
 const viewport=Number(body.viewport),score=Number(body.score),raw=Array.isArray(body.findings)?body.findings:[];if(!Number.isInteger(viewport)||viewport<320||viewport>2000)throw new AccessError("Некорректный viewport browser QA.",400);if(!Number.isFinite(score)||score<0||score>100)throw new AccessError("Некорректный score browser QA.",400);if(raw.length>300)throw new AccessError("Слишком много browser QA findings.",413);
 const findings:BrowserQaFinding[]=raw.map(value=>{if(!value||typeof value!=="object")throw new AccessError("Некорректный browser QA finding.",400);const row=value as Record<string,unknown>,severity=String(row.severity??"") as BrowserQaFinding["severity"],code=String(row.code??"").trim(),message=String(row.message??"").trim(),selector=typeof row.selector==="string"?row.selector.slice(0,500):undefined;if(!["critical","major","minor"].includes(severity)||!/^[a-z0-9._-]{2,80}$/i.test(code)||!message||message.length>1000)throw new AccessError("Некорректный browser QA finding.",400);return {severity,code,message,selector};});
 const counts={critical:findings.filter(f=>f.severity==="critical").length,major:findings.filter(f=>f.severity==="major").length,minor:findings.filter(f=>f.severity==="minor").length};const calculatedScore=Math.max(0,100-counts.critical*25-counts.major*8-counts.minor*2);if(score!==calculatedScore)throw new AccessError("Browser QA score не соответствует findings.",400);
 await emitEvent(env,{domain:"verification",type:"verification.web.browser_qa",projectId,accountId:principal.id,actor:`account:${principal.id}`,subjectType:"web-studio",subjectId:projectId,payload:{source:"client-dom-static-preview",viewport,score,counts,findings},trace});return {source:"client-dom-static-preview",viewport,score,counts,findings};
}

export async function emitWorkbenchAction(env:Env,projectId:string,type:string,actor:string,payload:Record<string,unknown>,trace?:TraceContext){
 await emitEvent(env,{domain:"tool",type,projectId,actor,subjectType:"web-studio",subjectId:projectId,payload,trace}).catch(()=>{});
}
