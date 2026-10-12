import type {Env} from '../types';
import {AccessError} from '../lib/accounts';
import {withProjectLock} from '../lib/project-control';
import {workspacePrefix,logicalWorkspacePath} from '../lib/workspace-head';
import {readBoundedBody} from '../lib/request-body';
import {zipSync} from 'fflate';

export async function exportProjectZip(env:Env,project:string):Promise<Response> {
 return withProjectLock(env,project,`zip:${crypto.randomUUID()}`,async()=>{
  const prefix=await workspacePrefix(env,project),entries:R2Object[]=[],cursors=new Set<string>();let cursor:string|undefined;
  do{
   const page=await env.AZRAIL_R2.list({prefix,limit:401-entries.length,cursor});entries.push(...page.objects);
   if(entries.length>400)throw new AccessError('В проекте больше 400 файлов.',413);
   if(!page.truncated)break;
   const nextCursor=page.cursor;
   if(!nextCursor||cursors.has(nextCursor))throw new AccessError('Не удалось получить полный список файлов.',409);
   cursor=nextCursor;cursors.add(nextCursor);
  }while(true);
  if(!entries.length)throw new AccessError('В проекте ещё нет файлов.',404);
  const files:Record<string,Uint8Array>=Object.create(null);let total=0;const maximum=16*1024*1024;
  for(const entry of entries){
   if(!entry.key.startsWith(prefix))throw new AccessError('Некорректный ключ файла.',409);
   const path=logicalWorkspacePath(prefix,entry.key.slice(prefix.length));
   if(/^[A-Za-z]:/.test(path)||Object.hasOwn(files,path))throw new AccessError('Недопустимый путь в ZIP.',409);
   if(!Number.isSafeInteger(entry.size)||entry.size<0||entry.size>maximum-total)throw new AccessError('ZIP превышает лимит экспорта 16 МиБ.',413);
   const file=await env.AZRAIL_R2.get(entry.key);
   if(!file||entry.etag&&file.etag!==entry.etag)throw new AccessError('Файлы проекта изменились. Повторите экспорт после завершения миссии.',409);
   const bytes=await readBoundedBody(new Response(file.body),maximum-total);
   if(bytes.length!==entry.size)throw new AccessError('Размер файла изменился во время экспорта.',409);
   total+=bytes.length;files[path]=bytes;
  }
  if(await workspacePrefix(env,project)!==prefix)throw new AccessError('Версия проекта изменилась во время экспорта.',409);
  return new Response(zipSync(files,{level:1}),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="azrail-project.zip"','Cache-Control':'no-store'}});
 });
}
