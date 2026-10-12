import { describe, it, expect, vi } from 'vitest';
import type { Env } from '../src/types';
import { publishWorkspace, workspacePrefix } from '../src/lib/workspace-head';
import { snapshotWorkspace } from '../src/core/mission-guard';
import { backupProject, deleteBackup, MAX_BACKUPS_PER_PROJECT } from '../src/lib/backups';
import { studioRoute } from '../src/unified/studios';
import { createAccount } from '../src/lib/accounts';
import { handleUpload } from '../src/lib/upload';
import { sqliteD1 } from './stubs/sqlite-d1';

const enc=(v:string)=>new TextEncoder().encode(v);
function memoryR2(){
  const objects=new Map<string,Uint8Array>();
  const r2={
    async put(key:string,value:unknown){
      const bytes=typeof value==='string'?enc(value):value instanceof Uint8Array?value:new Uint8Array(value as ArrayBuffer);
      objects.set(key,bytes.slice());
    },
    async get(key:string){const b=objects.get(key);return b?{size:b.length,body:b,arrayBuffer:async()=>b.slice().buffer,text:async()=>new TextDecoder().decode(b)}:null;},
    async head(key:string){const b=objects.get(key);return b?{size:b.length}:null;},
    async delete(key:string){objects.delete(key);},
    async list({prefix,limit=1000,cursor}:{prefix:string;limit?:number;cursor?:string}){
      const all=[...objects].filter(([key])=>key.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).map(([key,b])=>({key,size:b.length}));
      const at=Number(cursor??0),page=all.slice(at,at+limit),next=at+page.length;
      return {objects:page,truncated:next<all.length,cursor:next<all.length?String(next):undefined};
    },
  };
  return {r2,objects};
}

describe('RC8 workspace publication CAS',()=>{
  it('refuses a stale head flip and removes only the unpublished tree',async()=>{
    const {db,sqlite}=sqliteD1();
    const {r2,objects}=memoryR2();
    sqlite.exec("INSERT INTO workspace_heads(project_id,prefix) VALUES('p','projects/p/workspace-versions/base/')");
    let firstPut=true;
    const wrapped={...r2,async put(key:string,value:unknown){
      await r2.put(key,value);
      if(firstPut){firstPut=false;sqlite.prepare("UPDATE workspace_heads SET prefix='projects/p/workspace-versions/newer/' WHERE project_id='p'").run();}
    }};
    const env={AZRAIL_D1:db,AZRAIL_R2:wrapped} as unknown as Env;
    await expect(publishWorkspace(env,'p',[{path:'a.txt',content:'stale'}])).rejects.toThrow(/изменилась/);
    expect(await workspacePrefix(env,'p')).toBe('projects/p/workspace-versions/newer/');
    expect([...objects.keys()].some(k=>k.includes('/workspace-versions/')&&k.endsWith('/a.txt'))).toBe(false);
  });
});

describe('RC8 mission snapshot publication',()=>{
  it('publishes project version and mission link in the same D1 batch',async()=>{
    const {db,sqlite}=sqliteD1();
    const {r2}=memoryR2();
    sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','u@example.invalid','u')").run();
    sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','p')").run();
    await r2.put('projects/p/workspace/a.txt','before');
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    const snapshot=await snapshotWorkspace(env,'p','baseline','m1');
    expect(snapshot).not.toBeNull();
    expect(sqlite.prepare('SELECT r2_object_key FROM project_versions WHERE id=?').get(snapshot!.versionId)?.r2_object_key).toBe(snapshot!.r2Key);
    expect(sqlite.prepare('SELECT r2_key FROM mission_snapshots WHERE mission_id=?').get('m1')?.r2_key).toBe(snapshot!.r2Key);
  });
});

describe('RC8 backup lifecycle',()=>{
  it('fails closed at the documented retention ceiling',async()=>{
    const {db,sqlite}=sqliteD1();const {r2}=memoryR2();
    for(let i=0;i<MAX_BACKUPS_PER_PROJECT;i++)sqlite.prepare('INSERT INTO backup_manifests(id,project_id,r2_key,created_at,file_count) VALUES(?,?,?,?,0)').run(crypto.randomUUID(),'p',`backups/p/${i}/manifest.json`,i);
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    await expect(backupProject(env,'p')).rejects.toThrow(/Предел копий/);
  });

  it('drops D1 reference before bounded R2 cleanup',async()=>{
    const {db,sqlite}=sqliteD1();const {r2,objects}=memoryR2();
    const id=crypto.randomUUID(),prefix=`backups/p/${id}/`;
    sqlite.prepare('INSERT INTO backup_manifests(id,project_id,r2_key,created_at,file_count) VALUES(?,?,?,?,1)').run(id,'p',`${prefix}manifest.json`,Date.now());
    await r2.put(`${prefix}0`,'x');await r2.put(`${prefix}manifest.json`,'{}');
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    const result=await deleteBackup(env,'p',id);
    expect(result.deleted).toBe(true);expect(result.orphaned).toBe(0);
    expect(sqlite.prepare('SELECT 1 FROM backup_manifests WHERE id=?').get(id)).toBeUndefined();
    expect([...objects.keys()].filter(k=>k.startsWith(prefix))).toHaveLength(0);
  });
});

describe('RC8 studio artifact lifecycle',()=>{
  it('lets the owner delete metadata and the backing R2 object',async()=>{
    const {db,sqlite}=sqliteD1();const {r2,objects}=memoryR2();
    const account=await createAccount({AZRAIL_D1:db} as Env,'alice','editor');
    const id=crypto.randomUUID(),key=`studio/${account.id}/${id}`;
    await r2.put(key,'artifact');
    sqlite.prepare('INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at) VALUES(?,?,?,?,?,?,?)').run(id,account.id,'a.bin','application/octet-stream',key,8,Date.now());
    const env={AZRAIL_D1:db,AZRAIL_R2:r2} as unknown as Env;
    const response=await studioRoute(new Request(`https://x/api/studio/artifacts/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${account.token}`}}),env);
    expect(response?.status).toBe(200);
    expect(sqlite.prepare('SELECT 1 FROM studio_artifacts WHERE id=?').get(id)).toBeUndefined();
    expect(objects.has(key)).toBe(false);
  });
});

describe('RC8 upload publication ambiguity',()=>{
  it('preserves R2 when upload ownership committed but the D1 response was lost',async()=>{
    const objects=new Map<string,Uint8Array>();let uploadKey='';let published=false;
    const d1={prepare:(sql:string)=>{
      let args:unknown[]=[];
      return {bind(...v:unknown[]){args=v;return this;},async run(){
        if(sql.includes("VALUES('upload',?,?)")){uploadKey=String(args[0]);published=true;throw Error('response lost');}
        return {meta:{changes:1}};
      },async first(){
        if(sql.includes("kind='upload'")&&published&&String(args[0])===uploadKey)return {ok:1};
        return null;
      }};
    }};
    const r2={async put(k:string,v:unknown){objects.set(k,new Uint8Array(v as ArrayBuffer));},async delete(k:string){objects.delete(k);}};
    const env={AZRAIL_D1:d1,AZRAIL_R2:r2} as unknown as Env;
    const form=new FormData();form.set('file',new File([enc('hello')],'a.txt',{type:'text/plain'}));form.set('projectId','p');
    const principal={id:'admin',name:'admin',role:'admin' as const};
    const request=new Request('https://x/api/upload',{method:'POST',body:form});
    const result=await handleUpload(request,env,principal);
    expect('r2Key' in result).toBe(true);
    expect(objects.has(uploadKey)).toBe(true);
  });
});
