import type {Env} from '../types';
import type {Principal} from '../lib/accounts';
import {AccessError} from '../lib/accounts';
import {createProject,duplicateProject,listProjects,projectDetails,updateProject} from '../lib/project-center';
import {readJsonRecord} from './request-json';

const json=Response.json;
export async function projectRoute(request:Request,env:Env,principal:Principal):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/projects'){
  if(request.method==='GET'){
   const projects=await listProjects(env,principal,{search:url.searchParams.get('search')??'',sort:url.searchParams.get('sort')??'',status:url.searchParams.get('status')??'active',studio:url.searchParams.get('studio')??'',pinned:url.searchParams.get('pinned')==='1'});
   return json({projects,total:projects.length});
  }
  if(request.method==='POST')return json({project:await createProject(env,principal,await readJsonRecord(request,6000))},{status:201});
  return json({error:'Метод не поддерживается.'},{status:405});
 }
 const duplicate=path.match(/^\/api\/projects\/([A-Za-z0-9_-]{1,128})\/duplicate$/);
 if(duplicate&&request.method==='POST')return json(await duplicateProject(env,principal,decodeURIComponent(duplicate[1]),await readJsonRecord(request,2000)),{status:201});
 const match=path.match(/^\/api\/projects\/([A-Za-z0-9_-]{1,128})$/);
 if(!match)return null;
 const projectId=decodeURIComponent(match[1]);
 if(request.method==='GET')return json(await projectDetails(env,principal,projectId));
 if(request.method==='PATCH')return json({project:await updateProject(env,principal,projectId,await readJsonRecord(request,8000))});
 if(request.method==='DELETE'){
  if(request.headers.get('X-AZRAIL-Confirm-Project')!==projectId)throw new AccessError('Удаление требует точного подтверждения проекта.',409);
  const confirmation=await readJsonRecord(request,1200);
  const current=await projectDetails(env,principal,projectId);
  if(confirmation.confirmName!==current.project.name)throw new AccessError('Введите точное название проекта для удаления.',409);
  return json({project:await updateProject(env,principal,projectId,{status:'deleted'})});
 }
 return json({error:'Метод не поддерживается.'},{status:405});
}
