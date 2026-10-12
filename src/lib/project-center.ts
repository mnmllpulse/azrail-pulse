import type {Env} from '../types';
import type {Principal} from './accounts';
import {AccessError} from './accounts';
import {withProjectLock} from './project-control';
import {logicalWorkspacePath,publishWorkspace,workspacePrefix} from './workspace-head';
import {emitEvent} from './event-stream';
import {log} from './resilience';

const PROJECT_STUDIO_IDS=['web','image','music','video','audio','als','data','ledger','lab'] as const;
export type ProjectStudioId=typeof PROJECT_STUDIO_IDS[number];
export type ProjectStatus='active'|'archived'|'deleted';

export type ProjectSummary={
 id:string;name:string;description:string;status:ProjectStatus;pinned:boolean;studioId:ProjectStudioId|null;tags:string[];
 ownerId:string;ownerName:string;createdAt:string;updatedAt:string;lastActivityAt:number;
 missionId:string|null;missionStatus:string|null;missionCount:number;artifactsCount:number;versionsCount:number;
};

type SummaryRow={
 id:string;name:string;description:string|null;status:string;pinned:number;studio_id:string|null;tags_json:string|null;
 owner_id:string;created_at:string;updated_at:string;last_activity_at:number|null;mission_id:string|null;mission_status:string|null;
 mission_count:number;artifacts_count:number;versions_count:number;
};

const MAX_DUPLICATE_FILES=400;
const MAX_DUPLICATE_BYTES=16*1024*1024;

function text(value:unknown,max:number,label:string){
 if(typeof value!=='string')throw new AccessError(`${label}: ожидается текст.`,400);
 const v=value.trim();if(v.length>max)throw new AccessError(`${label}: максимум ${max} символов.`,400);return v;
}
function projectName(value:unknown){const v=text(value,120,'Название');if(!v)throw new AccessError('Название проекта не может быть пустым.',400);return v;}
function description(value:unknown){return text(value,1200,'Описание');}
export function normalizeStudioId(value:unknown):ProjectStudioId|null{
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||!PROJECT_STUDIO_IDS.includes(value as ProjectStudioId))throw new AccessError('Неизвестная студия.',400);
 return value as ProjectStudioId;
}
function normalizeTags(value:unknown):string[]{
 if(value===undefined)return [];
 if(!Array.isArray(value))throw new AccessError('Теги должны быть массивом.',400);
 const out:string[]=[];
 for(const raw of value){if(typeof raw!=='string')throw new AccessError('Некорректный тег.',400);const tag=raw.trim().replace(/\s+/g,' ');if(!tag)continue;if(tag.length>28)throw new AccessError('Тег длиннее 28 символов.',400);if(!out.includes(tag))out.push(tag);if(out.length>8)throw new AccessError('Максимум 8 тегов.',400);}
 return out;
}
function parseTags(raw:string|null):string[]{try{const v=JSON.parse(raw??'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,8):[];}catch{return [];}}
function studioFromRow(value:string|null):ProjectStudioId|null{return value&&PROJECT_STUDIO_IDS.includes(value as ProjectStudioId)?value as ProjectStudioId:null;}
function normalizeStatus(value:unknown):ProjectStatus{if(value==='active'||value==='archived'||value==='deleted')return value;throw new AccessError('Недопустимый статус проекта.',400);}

function toSummary(row:SummaryRow,principal:Principal):ProjectSummary{
 const status=(row.status==='archived'||row.status==='deleted')?row.status:'active';
 return {id:row.id,name:row.name,description:row.description??'',status,pinned:row.pinned===1,studioId:studioFromRow(row.studio_id),tags:parseTags(row.tags_json),ownerId:row.owner_id,ownerName:row.owner_id===principal.id?principal.name:row.owner_id,createdAt:row.created_at,updatedAt:row.updated_at,lastActivityAt:Number(row.last_activity_at??0),missionId:row.mission_id,missionStatus:row.mission_status,missionCount:Number(row.mission_count??0),artifactsCount:Number(row.artifacts_count??0),versionsCount:Number(row.versions_count??0)};
}

const projectDisplayNameSql=`CASE WHEN p.name=p.id THEN COALESCE((SELECT NULLIF(trim(mn.goal),'') FROM missions mn WHERE mn.project_id=p.id ORDER BY mn.updated_at DESC,mn.created_at DESC LIMIT 1),p.name) ELSE p.name END`;
const summarySelect=`SELECT p.id,${projectDisplayNameSql} AS name,p.description,p.status,COALESCE(pp.pinned,0) AS pinned,pp.studio_id,COALESCE(pp.tags_json,'[]') AS tags_json,
 o.account_id AS owner_id,p.created_at,p.updated_at,
 max(
   COALESCE(CAST(strftime('%s',p.updated_at) AS INTEGER)*1000,0),
   COALESCE((SELECT MAX(created_at) FROM event_stream e WHERE e.project_id=p.id),0),
   COALESCE((SELECT MAX(linked_at) FROM studio_artifact_projects ap WHERE ap.project_id=p.id),0),
   COALESCE((SELECT MAX(CAST(strftime('%s',created_at) AS INTEGER)*1000) FROM project_versions v WHERE v.project_id=p.id),0),
   COALESCE((SELECT MAX(CAST(strftime('%s',updated_at) AS INTEGER)*1000) FROM missions m WHERE m.project_id=p.id),0)
 ) AS last_activity_at,
 (SELECT id FROM missions m WHERE m.project_id=p.id ORDER BY updated_at DESC,created_at DESC LIMIT 1) AS mission_id,
 (SELECT status FROM missions m WHERE m.project_id=p.id ORDER BY updated_at DESC,created_at DESC LIMIT 1) AS mission_status,
 (SELECT COUNT(*) FROM missions m WHERE m.project_id=p.id) AS mission_count,
 (SELECT COUNT(*) FROM studio_artifact_projects ap JOIN studio_artifacts a ON a.id=ap.artifact_id WHERE ap.project_id=p.id) AS artifacts_count,
 (SELECT COUNT(*) FROM project_versions v WHERE v.project_id=p.id) AS versions_count
 FROM resource_owners o JOIN projects p ON p.id=o.resource_id AND o.kind='project'
 LEFT JOIN project_profiles pp ON pp.project_id=p.id`;

export async function listProjects(env:Env,principal:Principal,options:{search?:string;sort?:string;status?:string;studio?:string;pinned?:boolean}={}):Promise<ProjectSummary[]>{
 const where=['o.account_id=?'];const args:unknown[]=[principal.id];
 const search=(options.search??'').trim().slice(0,120);
 if(search){const like=`%${search.replace(/[\\%_]/g,m=>`\\${m}`)}%`;where.push(`(${projectDisplayNameSql} LIKE ? ESCAPE '\\' OR COALESCE(p.description,'') LIKE ? ESCAPE '\\' OR COALESCE(pp.tags_json,'') LIKE ? ESCAPE '\\')`);args.push(like,like,like);}
 const status=options.status??'active';
 if(status==='active')where.push(`COALESCE(p.status,'active') NOT IN ('archived','deleted')`);
 else if(status==='archived'||status==='deleted'){where.push('p.status=?');args.push(status);} else if(status!=='all')throw new AccessError('Некорректный фильтр статуса.',400);
 if(options.studio){const studio=normalizeStudioId(options.studio);where.push('pp.studio_id=?');args.push(studio);}
 if(options.pinned){where.push('COALESCE(pp.pinned,0)=1');}
 const order=options.sort==='name_asc'?'name COLLATE NOCASE ASC':options.sort==='name_desc'?'name COLLATE NOCASE DESC':options.sort==='created_desc'?'p.created_at DESC':options.sort==='created_asc'?'p.created_at ASC':options.sort==='updated_asc'?'last_activity_at ASC':'COALESCE(pp.pinned,0) DESC,last_activity_at DESC';
 const sql=`${summarySelect} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 100`;
 const rows=(await env.AZRAIL_D1.prepare(sql).bind(...args).all<SummaryRow>()).results;
 return rows.map(r=>toSummary(r,principal));
}

async function readSummary(env:Env,principal:Principal,projectId:string):Promise<ProjectSummary>{
 const row=await env.AZRAIL_D1.prepare(`${summarySelect} WHERE o.account_id=? AND p.id=? LIMIT 1`).bind(principal.id,projectId).first<SummaryRow>();
 if(!row)throw new AccessError('Проект не найден.',404);return toSummary(row,principal);
}

async function emitProjectEvent(env:Env,principal:Principal,projectId:string,type:string,payload:Record<string,unknown>={}){
 try{await emitEvent(env,{domain:'system',type,accountId:principal.id,projectId,subjectType:'project',subjectId:projectId,actor:principal.id,payload});}
 catch(error){log('warn','project.event_stream_failed',{projectId,type,error:error instanceof Error?error.message:String(error)});}
}

async function insertProject(env:Env,principal:Principal,input:Record<string,unknown>={}):Promise<{project:ProjectSummary;name:string;studio:ProjectStudioId|null;tags:string[]}>{
 const id=crypto.randomUUID(),name=input.name===undefined?'Новый проект':projectName(input.name),desc=input.description===undefined?'':description(input.description),studio=normalizeStudioId(input.studioId),tags=normalizeTags(input.tags),now=Date.now();
 await env.AZRAIL_D1.batch([
  env.AZRAIL_D1.prepare("INSERT OR IGNORE INTO users(id,name) VALUES('system','AZRAIL system')"),
  env.AZRAIL_D1.prepare("INSERT INTO projects(id,user_id,name,description,status,created_at,updated_at) VALUES(?,'system',?,?,'active',datetime('now'),datetime('now'))").bind(id,name,desc||null),
  env.AZRAIL_D1.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('project',?,?)").bind(id,principal.id),
  env.AZRAIL_D1.prepare('INSERT INTO project_profiles(project_id,pinned,studio_id,tags_json,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,0,studio,JSON.stringify(tags),now,now),
 ]);
 return {project:await readSummary(env,principal,id),name,studio,tags};
}

export async function createProject(env:Env,principal:Principal,input:Record<string,unknown>={}):Promise<ProjectSummary>{
 if(principal.role==='viewer')throw new AccessError('Ваш аккаунт разрешает только просмотр.',403);
 const created=await insertProject(env,principal,input);
 await emitProjectEvent(env,principal,created.project.id,'project.created',{name:created.name,studioId:created.studio,tags:created.tags});
 return created.project;
}

async function assertIdle(env:Env,projectId:string){
 const active=await env.AZRAIL_D1.prepare("SELECT id,status FROM missions WHERE project_id=? AND status IN ('queued','planning','executing','verifying','waiting_approval') ORDER BY updated_at DESC LIMIT 1").bind(projectId).first<{id:string;status:string}>();
 if(active)throw new AccessError(`Сначала завершите или остановите активную миссию (${active.status}).`,409);
}

export async function updateProject(env:Env,principal:Principal,projectId:string,input:Record<string,unknown>):Promise<ProjectSummary>{
 if(principal.role==='viewer')throw new AccessError('Ваш аккаунт разрешает только просмотр.',403);
 const current=await readSummary(env,principal,projectId);
 const nextName=input.name===undefined?current.name:projectName(input.name);
 const nextDescription=input.description===undefined?current.description:description(input.description);
 const nextPinned=input.pinned===undefined?current.pinned:Boolean(input.pinned);
 const nextStudio=input.studioId===undefined?current.studioId:normalizeStudioId(input.studioId);
 const nextTags=input.tags===undefined?current.tags:normalizeTags(input.tags);
 const nextStatus=input.status===undefined?current.status:normalizeStatus(input.status);
 if(nextStatus!==current.status)await assertIdle(env,projectId);
 const profile=await env.AZRAIL_D1.prepare('SELECT archived_at,deleted_at,created_at FROM project_profiles WHERE project_id=?').bind(projectId).first<{archived_at:number|null;deleted_at:number|null;created_at:number}>();
 const now=Date.now();
 const archivedAt=nextStatus==='archived'?(current.status==='archived'?(profile?.archived_at??now):now):null;
 const deletedAt=nextStatus==='deleted'?(current.status==='deleted'?(profile?.deleted_at??now):now):null;
 const profileCreatedAt=profile?.created_at??now;
 await env.AZRAIL_D1.batch([
  env.AZRAIL_D1.prepare("UPDATE projects SET name=?,description=?,status=?,updated_at=datetime('now') WHERE id=?").bind(nextName,nextDescription||null,nextStatus,projectId),
  env.AZRAIL_D1.prepare(`INSERT INTO project_profiles(project_id,pinned,studio_id,tags_json,archived_at,deleted_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET pinned=excluded.pinned,studio_id=excluded.studio_id,tags_json=excluded.tags_json,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at`)
   .bind(projectId,nextPinned?1:0,nextStudio,JSON.stringify(nextTags),archivedAt,deletedAt,profileCreatedAt,now),
 ]);
 const event=nextStatus!==current.status?`project.${nextStatus==='active'?'restored':nextStatus}`:'project.updated';
 await emitProjectEvent(env,principal,projectId,event,{name:nextName,pinned:nextPinned,studioId:nextStudio,tags:nextTags,status:nextStatus});
 return readSummary(env,principal,projectId);
}

async function readWorkspaceFiles(env:Env,projectId:string):Promise<Array<{path:string;content:Uint8Array}>>{
 const prefix=await workspacePrefix(env,projectId),objects:Array<{key:string;size:number;etag?:string}>=[],seen=new Set<string>();let cursor:string|undefined,total=0;
 do{
  const page=await env.AZRAIL_R2.list({prefix,limit:Math.min(401-objects.length,1000),cursor});
  for(const object of page.objects){if(objects.length>=MAX_DUPLICATE_FILES)throw new AccessError(`Проект содержит больше ${MAX_DUPLICATE_FILES} файлов; автоматическое дублирование остановлено.`,413);if(!Number.isSafeInteger(object.size)||object.size<0||total+object.size>MAX_DUPLICATE_BYTES)throw new AccessError('Проект превышает лимит дублирования 16 МиБ.',413);objects.push({key:object.key,size:object.size,etag:object.etag});total+=object.size;}
  if(!page.truncated)break;cursor=page.cursor;if(!cursor||seen.has(cursor))throw new AccessError('Не удалось получить полный список файлов проекта.',409);seen.add(cursor);
 }while(true);
 const files:Array<{path:string;content:Uint8Array}>=[];
 for(let i=0;i<objects.length;i+=12){
  const batch=await Promise.all(objects.slice(i,i+12).map(async object=>{const body=await env.AZRAIL_R2.get(object.key);if(!body||body.size!==object.size||(object.etag&&body.etag!==object.etag))throw new AccessError('Файлы проекта изменились во время дублирования. Повторите после завершения работы.',409);const bytes=new Uint8Array(await body.arrayBuffer());return {path:logicalWorkspacePath(prefix,object.key.slice(prefix.length)),content:bytes};}));
  files.push(...batch);
 }
 if(await workspacePrefix(env,projectId)!==prefix)throw new AccessError('Версия проекта изменилась во время дублирования.',409);
 return files;
}

async function cleanupFailedDuplicate(env:Env,targetId:string){
 try{await env.AZRAIL_D1.batch([
  env.AZRAIL_D1.prepare('DELETE FROM project_profiles WHERE project_id=?').bind(targetId),
  env.AZRAIL_D1.prepare("DELETE FROM resource_owners WHERE kind='project' AND resource_id=?").bind(targetId),
  env.AZRAIL_D1.prepare('DELETE FROM projects WHERE id=?').bind(targetId),
 ]);}catch(error){log('error','project.duplicate_cleanup_failed',{targetId,error:error instanceof Error?error.message:String(error)});}
}

export async function duplicateProject(env:Env,principal:Principal,projectId:string,input:Record<string,unknown>={}):Promise<{project:ProjectSummary;copiedFiles:number}>{
 if(principal.role==='viewer')throw new AccessError('Ваш аккаунт разрешает только просмотр.',403);
 const source=await readSummary(env,principal,projectId);
 const target=(await insertProject(env,principal,{name:input.name===undefined?`${source.name} — копия`:input.name,description:source.description,studioId:source.studioId,tags:source.tags})).project;
 let committed=false;
 try{
  await env.AZRAIL_D1.prepare('UPDATE project_profiles SET duplicated_from=?,updated_at=? WHERE project_id=?').bind(projectId,Date.now(),target.id).run();
  let copiedFiles=0;
  await withProjectLock(env,projectId,`duplicate-source:${crypto.randomUUID()}`,async()=>{
   const files=await readWorkspaceFiles(env,projectId);copiedFiles=files.length;if(!files.length)return;
   await withProjectLock(env,target.id,`duplicate-target:${crypto.randomUUID()}`,async lease=>{if(!lease)throw new Error('Target project lease missing');await publishWorkspace(env,target.id,files,lease);});
  });
  committed=true;
  const project=await readSummary(env,principal,target.id);
  await emitProjectEvent(env,principal,target.id,'project.duplicated',{sourceProjectId:projectId,copiedFiles});
  return {project,copiedFiles};
 }catch(error){
  if(!committed)await cleanupFailedDuplicate(env,target.id);
  else log('error','project.duplicate_post_commit_failed',{targetId:target.id,sourceProjectId:projectId,error:error instanceof Error?error.message:String(error)});
  throw error;
 }
}

export async function projectDetails(env:Env,principal:Principal,projectId:string){
 const project=await readSummary(env,principal,projectId);
 const [missions,versions,artifacts,events]=await Promise.all([
  env.AZRAIL_D1.prepare('SELECT id,goal,status,progress,created_at,updated_at FROM missions WHERE project_id=? ORDER BY updated_at DESC LIMIT 10').bind(projectId).all(),
  env.AZRAIL_D1.prepare('SELECT id,version_number,summary,created_by_agent,created_at FROM project_versions WHERE project_id=? ORDER BY version_number DESC LIMIT 10').bind(projectId).all(),
  env.AZRAIL_D1.prepare(`SELECT a.id,a.name,a.mime,a.bytes,a.created_at,ap.studio_id FROM studio_artifact_projects ap JOIN studio_artifacts a ON a.id=ap.artifact_id WHERE ap.project_id=? ORDER BY ap.linked_at DESC LIMIT 20`).bind(projectId).all(),
  env.AZRAIL_D1.prepare('SELECT seq,domain,type,actor,created_at FROM event_stream WHERE project_id=? ORDER BY seq DESC LIMIT 20').bind(projectId).all(),
 ]);
 return {project,missions:missions.results,versions:versions.results,artifacts:artifacts.results,activity:[...events.results].reverse()};
}
