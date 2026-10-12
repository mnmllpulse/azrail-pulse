import { workspacePrefix,publishWorkspace,logicalWorkspacePath,workspacePath } from "./workspace-head";
import type { Env } from "../types";
import { withProjectLock } from "./project-control";
import { cleanupUnpublishedR2, deleteR2KeysBestEffort } from "./r2-consistency";
import { log } from "./resilience";
import type { TraceContext } from "./observability-context";

export const MAX_BACKUPS_PER_PROJECT = 50;

async function sha(bytes:Uint8Array):Promise<string> {
  const sum=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(sum)].map(n=>n.toString(16).padStart(2,"0")).join("");
}
interface Backup {version:1|2;projectId:string;createdAt:string;files:Array<{path:string;key:string;sha256:string;size:number}>}
export async function backupProject(env:Env,project:string) {
  return withProjectLock(env,project,crypto.randomUUID(),async()=>{
    const count=await env.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM backup_manifests WHERE project_id=?").bind(project).first<{n:number}>();
    if((count?.n??0)>=MAX_BACKUPS_PER_PROJECT)throw new Error(`Предел копий: ${MAX_BACKUPS_PER_PROJECT}. Удалите старую копию перед созданием новой.`);
    const prefix=await workspacePrefix(env,project),id=crypto.randomUUID(),files:Backup["files"]=[],written:string[]=[];
    const seenCursors=new Set<string>();
    let cursor:string|undefined,total=0,manifestKey="",publishAttempted=false;
    try {
      do {
        const page=await env.AZRAIL_R2.list({prefix,cursor,limit:100});
        for(const obj of page.objects) {
          total+=obj.size;if(files.length>=1000||total>16*1024*1024)throw new Error("Предел копии: 1000 файлов / 16 МиБ.");
          const value=await env.AZRAIL_R2.get(obj.key);if(!value)throw new Error("Файл исчез во время копирования.");
          const bytes=new Uint8Array(await value.arrayBuffer()), key=`backups/${project}/${id}/${files.length}`;
          await env.AZRAIL_R2.put(key,bytes);written.push(key);
          files.push({path:logicalWorkspacePath(prefix,obj.key.slice(prefix.length)),key,sha256:await sha(bytes),size:bytes.length});
        }
        if(!page.truncated)break;
        if(!page.cursor||seenCursors.has(page.cursor))throw new Error("Неполный список файлов.");
        seenCursors.add(page.cursor);cursor=page.cursor;
      }while(true);
      const manifest:Backup={version:2,projectId:project,createdAt:new Date().toISOString(),files};
      manifestKey=`backups/${project}/${id}/manifest.json`;
      await env.AZRAIL_R2.put(manifestKey,JSON.stringify(manifest));written.push(manifestKey);
      publishAttempted=true;
      await env.AZRAIL_D1.prepare("INSERT INTO backup_manifests(id,project_id,r2_key,created_at,file_count) VALUES(?,?,?,?,?)").bind(id,project,manifestKey,Date.now(),files.length).run();
      return {id,files:files.length,bytes:total};
    } catch(error) {
      // A D1 write can commit and lose its response. Delete the staged backup
      // only after D1 proves there is no manifest row for this id.
      if(!publishAttempted){
        await deleteR2KeysBestEffort(env,written,"backup.stage_cleanup",{project,id,manifestKey});
        throw error;
      }
      const cleanup=await cleanupUnpublishedR2(
        env,written,
        async()=>!!(await env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM backup_manifests WHERE id=? AND project_id=?").bind(id,project).first()),
        "backup.publish_cleanup",{project,id,manifestKey},
      );
      if(cleanup.published===true){
        log("warn","backup.publish_response_lost",{project,id});
        return {id,files:files.length,bytes:total};
      }
      throw error;
    }
  });
}
/** Restore into a new project. Existing working files are never overwritten. */
export async function restoreBackup(env:Env,project:string,id:string,target:string,trace?:TraceContext) {
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(target)||target===project)throw new Error("Нужен новый projectId для восстановления.");
  return withProjectLock(env,target,crypto.randomUUID(),async lease=>{
    const existing=await env.AZRAIL_R2.list({prefix:await workspacePrefix(env,target),limit:1});
    if(existing.objects.length)throw new Error("Целевой проект должен быть пустым.");
    const row=await env.AZRAIL_D1.prepare("SELECT r2_key FROM backup_manifests WHERE id=? AND project_id=?").bind(id,project).first<{r2_key:string}>();
    if(!row)throw new Error("Копия не найдена.");
    const object=await env.AZRAIL_R2.get(row.r2_key);if(!object)throw new Error("Манифест отсутствует.");
    if(object.size>2*1024*1024)throw new Error("Манифест копии слишком большой.");
    const m=JSON.parse(await object.text()) as Backup;
    if(!m||typeof m!=="object"||![1,2].includes(m.version)||m.projectId!==project||!Array.isArray(m.files)||m.files.length>1000)throw new Error("Повреждённый манифест.");
    const values:Array<{path:string;bytes:Uint8Array}>=[];let total=0;
    const paths=new Set<string>(),keys=new Set<string>();
    for(const f of m.files) {
      if(!f||typeof f!=="object"||typeof f.path!=="string"||typeof f.key!=="string"||typeof f.sha256!=="string"
        || !/^[a-f0-9]{64}$/i.test(f.sha256)||!Number.isSafeInteger(f.size)||f.size<0||f.size>16*1024*1024)
        throw new Error("Повреждённая запись файла в манифесте.");
      if(paths.has(f.path)||keys.has(f.key))throw new Error("Манифест содержит дубли файлов.");
      paths.add(f.path);keys.add(f.key);
      if(!f.key.startsWith(`backups/${project}/${id}/`))throw new Error("Неверная область копии.");
      workspacePath(f.path);
      if(m.version===1 && /%[0-9a-f]{2}/i.test(f.path))
        throw new Error("Копия v1 содержит неоднозначно закодированные пути. Сначала проверьте имена и переведите манифест в v2.");
      const o=await env.AZRAIL_R2.get(f.key);if(!o)throw new Error("Файл копии отсутствует.");
      if(o.size>16*1024*1024)throw new Error("Слишком большой файл.");
      const bytes=new Uint8Array(await o.arrayBuffer());total+=bytes.length;
      if(total>16*1024*1024||bytes.length!==f.size||await sha(bytes)!==f.sha256)throw new Error("Копия не прошла проверку целостности.");
      values.push({path:f.path,bytes});
    }
    // All hashes validated before the first write.
    if(!lease)throw new Error("Project lease missing during restore");
    await publishWorkspace(env,target,values.map(f=>({path:f.path,content:f.bytes})),lease,trace);
    return {projectId:target,restored:values.length};
  });
}


/**
 * Delete one published backup without ever deleting R2 while a D1 reference may
 * still be live. A lost DELETE response is verified by re-reading D1 first.
 */
export async function deleteBackup(env:Env,project:string,id:string):Promise<{deleted:true;objects:number;orphaned:number;cleanupComplete:boolean}> {
  if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error("Некорректный backupId.");
  return withProjectLock(env,project,`backup-delete:${crypto.randomUUID()}`,async()=>{
    const row=await env.AZRAIL_D1.prepare("SELECT r2_key FROM backup_manifests WHERE id=? AND project_id=?").bind(id,project).first<{r2_key:string}>();
    if(!row)throw new Error("Копия не найдена.");
    const prefix=`backups/${project}/${id}/`;
    if(row.r2_key!==`${prefix}manifest.json`)throw new Error("Некорректная область хранения копии; автоматическое удаление заблокировано.");

    try {
      const removed=await env.AZRAIL_D1.prepare("DELETE FROM backup_manifests WHERE id=? AND project_id=? RETURNING id").bind(id,project).first<{id:string}>();
      if(!removed)throw new Error("Копия уже удалена.");
    } catch(error) {
      let stillThere:unknown;
      try { stillThere=await env.AZRAIL_D1.prepare("SELECT 1 AS ok FROM backup_manifests WHERE id=? AND project_id=?").bind(id,project).first(); }
      catch(verifyError) {
        log("error","backup.delete_verify_failed",{project,id,error:verifyError instanceof Error?verifyError.message:String(verifyError)});
        throw error;
      }
      if(stillThere)throw error;
      log("warn","backup.delete_response_lost",{project,id});
    }

    const keys:string[]=[];let cursor:string|undefined;const seen=new Set<string>();
    try {
      do {
        const page=await env.AZRAIL_R2.list({prefix,cursor,limit:250});
        keys.push(...page.objects.map(o=>o.key));
        if(keys.length>1100)throw new Error("Копия содержит неожиданно много объектов; автоматическое R2-удаление остановлено.");
        if(!page.truncated)break;
        if(!page.cursor||seen.has(page.cursor))throw new Error("Неполный список объектов копии; R2-удаление остановлено.");
        seen.add(page.cursor);cursor=page.cursor;
      }while(true);
    } catch(error) {
      // The D1 reference is already gone. Returning a request failure here would
      // invite a retry of an operation that already succeeded. Leave any R2
      // residue for a later GC pass and report cleanup as incomplete.
      log("error","backup.delete_r2_list_failed",{project,id,error:error instanceof Error?error.message:String(error)});
      return {deleted:true,objects:0,orphaned:0,cleanupComplete:false};
    }
    const deleted=await deleteR2KeysBestEffort(env,keys,"backup.delete_r2",{project,id});
    const orphaned=keys.length-deleted;
    if(orphaned)log("warn","backup.delete_r2_orphans",{project,id,orphaned,total:keys.length});
    return {deleted:true,objects:deleted,orphaned,cleanupComplete:orphaned===0};
  });
}
