import { describe,it,expect,vi } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { createAccount,authenticate,requireResource,authorizeRequest,AccessError } from "../src/lib/accounts";
import { withProjectLock,requireCapability } from "../src/lib/project-control";
import { checkpointTool,loadCheckpoints } from "../src/lib/checkpoints";
import { meteredCall } from "../src/lib/billing";
import { withBillingScope, currentBillingScope } from "../src/lib/billing-context";
import { runModel } from "../src/lib/model-router";
import { backupProject,restoreBackup } from "../src/lib/backups";
import { readFile } from "../src/lib/workspace";
import { publishWorkspace,workspacePrefix } from "../src/lib/workspace-head";
import type { Env } from "../src/types";
function setup(){const {db,sqlite}=sqliteD1();const files=new Map<string,Uint8Array>();const bytes=(v:unknown)=>typeof v==="string"?new TextEncoder().encode(v):new Uint8Array(v as ArrayBuffer);
 const r2={async put(k:string,v:unknown){files.set(k,bytes(v));},async get(k:string){const b=files.get(k);return b?{size:b.length,arrayBuffer:async()=>b.slice().buffer,text:async()=>new TextDecoder().decode(b)}:null;},async list({prefix,limit=1000,cursor}:{prefix:string,limit?:number,cursor?:string}){const all=[...files].filter(([k])=>k.startsWith(prefix)).map(([key,b])=>({key,size:b.length}));const at=Number(cursor??0);return {objects:all.slice(at,at+limit),truncated:at+limit<all.length,cursor:String(at+limit)};},async delete(k:string){files.delete(k);}};
 return {env:{AZRAIL_D1:db,AZRAIL_R2:r2,AZRAIL_TOKEN:'admin-test'} as unknown as Env,sqlite,files,r2};}
async function editor(env:Env,name='alice'){const a=await createAccount(env,name,'editor');return {a,p:{id:a.id,name:a.name,role:'editor' as const}};}

describe('accounts and isolation',()=>{
 it('stores a hash, authenticates, and revokes immediately',async()=>{const {env,sqlite}=setup();const {a}=await editor(env);expect(sqlite.prepare('SELECT token_hash FROM access_accounts').get()?.token_hash).not.toBe(a.token);const req=new Request('https://x',{headers:{Authorization:'Bearer '+a.token}});expect((await authenticate(req,env)).ok).toBe(true);sqlite.prepare('UPDATE access_accounts SET disabled=1').run();expect((await authenticate(req,env)).ok).toBe(false);});
 it('cannot claim another owner project',async()=>{const {env}=setup();const a=await editor(env),b=await editor(env,'bob');await requireResource(env,a.p,'project','p',true);await expect(requireResource(env,b.p,'project','p',true)).rejects.toBeInstanceOf(AccessError);});
 it('cannot claim an existing legacy project',async()=>{const {env,sqlite}=setup();sqlite.exec("INSERT INTO users(id) VALUES('u');INSERT INTO projects(id,user_id,name) VALUES('legacy','u','old')");await expect(requireResource(env,(await editor(env)).p,'project','legacy',true)).rejects.toThrow();});
 it('denies other users uploaded objects and missions',async()=>{const {env,sqlite}=setup(),a=await editor(env),b=await editor(env,'bob');await requireResource(env,a.p,'project','p',true);await requireResource(env,a.p,'upload','uploads/a.zip',true);sqlite.exec("INSERT INTO missions(id,project_id,goal) VALUES('m','p','goal')");await expect(authorizeRequest(env,b.p,new Request('https://x/api/mission?missionId=m'))).rejects.toThrow();await expect(authorizeRequest(env,b.p,new Request('https://x/api/task',{method:'POST'}),{projectId:'b',attachments:[{r2Key:'uploads/a.zip'}]})).rejects.toThrow();});
 it('viewer cannot mutate, editor cannot administer',async()=>{const {env}=setup();const {p}=await editor(env);await expect(authorizeRequest(env,{...p,role:'viewer'},new Request('https://x/api/backups',{method:'POST'}))).rejects.toThrow();await expect(authorizeRequest(env,p,new Request('https://x/api/admin/accounts'))).rejects.toThrow();});
 it('editor cannot invoke private server GitHub credentials',async()=>{const {env}=setup();const {p}=await editor(env);await expect(authorizeRequest(env,p,new Request('https://x/api/task',{method:'POST'}),{projectId:'p',inputType:'github'})).rejects.toThrow();});
});
describe('coordination and checkpoints',()=>{
 it('only one project writer, lock releases on completion',async()=>{const {env}=setup();let release!:()=>void;const waiting=new Promise<void>(r=>release=r);let entered!:()=>void;const start=new Promise<void>(r=>entered=r);const one=withProjectLock(env,'p','one',async()=>{entered();await waiting;return 1;});await start;await expect(withProjectLock(env,'p','two',async()=>2)).rejects.toThrow();release();expect(await one).toBe(1);expect(await withProjectLock(env,'p','three',async()=>3)).toBe(3);});
 it('external tools fail closed until granted',async()=>{const {env,sqlite}=setup();await expect(requireCapability(env,'p','sandbox')).rejects.toThrow();sqlite.exec("INSERT INTO project_permissions VALUES('p','sandbox')");await expect(requireCapability(env,'p','sandbox')).resolves.toBeUndefined();});
 it('completed and uncertain effects never rerun automatically',async()=>{const {env}=setup();const action=vi.fn(async()=>({ok:true}));await checkpointTool(env,'m',0,'write_file',{},action);await expect(checkpointTool(env,'m',0,'write_file',{},action)).rejects.toThrow();expect(action).toHaveBeenCalledTimes(1);await expect(checkpointTool(env,'m',1,'open_pr',{},async()=>{throw Error('connection lost');})).rejects.toThrow();expect((await loadCheckpoints(env,'m'))[1].status).toBe('uncertain');});
});
describe('cost accounting',()=>{
 it('async mission scopes remain separate across concurrent model calls',async()=>{
   const {env,sqlite}=setup();env.AZRAIL_METERING='observe';
   env.AI={run:async()=>{await Promise.resolve();return {response:'ok',usage:{prompt_tokens:1,completion_tokens:1}};}} as never;
   await Promise.all(['mission:a','mission:b'].map(scope=>withBillingScope(scope,async()=>{
     await Promise.resolve();expect(currentBillingScope()).toBe(scope);
     await runModel(env,'chat',{messages:[]},{preferredModel:'@cf/meta/llama-3.2-3b-instruct'});
   })));
   expect(sqlite.prepare('SELECT scope FROM model_calls ORDER BY scope').all().map(r=>r.scope)).toEqual(['mission:a','mission:b']);
   expect(currentBillingScope()).toBeUndefined();
 });
 it('partial provider usage never becomes a zero dollar charge',async()=>{
   const {env,sqlite}=setup();env.AZRAIL_METERING='enforce';
   sqlite.exec("INSERT INTO model_prices VALUES('m',1000000,1000000,1);INSERT INTO spend_limits VALUES('s',100000,0)");
   await meteredCall(env,'m',{},'s',async()=>({usage:{total_tokens:200}}));
   expect(sqlite.prepare('SELECT actual_micro_usd FROM model_calls').get()?.actual_micro_usd).toBeNull();
   expect(Number(sqlite.prepare('SELECT spent_micro_usd FROM spend_limits').get()?.spent_micro_usd)).toBeGreaterThan(0);
 });
 it('enforce refuses unknown prices without calling provider',async()=>{const {env}=setup();env.AZRAIL_METERING='enforce';const call=vi.fn();await expect(meteredCall(env,'unknown',{},'global',call)).rejects.toThrow();expect(call).not.toHaveBeenCalled();});
 it('reserves then reconciles provider tokens',async()=>{const {env,sqlite}=setup();env.AZRAIL_METERING='enforce';sqlite.exec("INSERT INTO model_prices VALUES('model',1000000,2000000,1);INSERT INTO spend_limits VALUES('scope',100000,0)");await meteredCall(env,'model',{max_tokens:20},'scope',async()=>({usage:{prompt_tokens:10,completion_tokens:5}}));expect(sqlite.prepare("SELECT spent_micro_usd FROM spend_limits").get()?.spent_micro_usd).toBe(20);expect(sqlite.prepare('SELECT status FROM model_calls').get()?.status).toBe('completed');});
 it('uncertain failure retains reservation',async()=>{const {env,sqlite}=setup();env.AZRAIL_METERING='enforce';sqlite.exec("INSERT INTO model_prices VALUES('m',1000000,1000000,1);INSERT INTO spend_limits VALUES('s',100000,0)");await expect(meteredCall(env,'m',{},'s',async()=>{throw Error('network');})).rejects.toThrow();expect(Number(sqlite.prepare('SELECT spent_micro_usd FROM spend_limits').get()?.spent_micro_usd)).toBeGreaterThan(0);expect(sqlite.prepare('SELECT status FROM model_calls').get()?.status).toBe('uncertain');});
 it('observe never reports unknown cost as zero',async()=>{const {env,sqlite}=setup();env.AZRAIL_METERING='observe';await meteredCall(env,'unpriced',{},'s',async()=>({response:'ok'}));expect(sqlite.prepare('SELECT actual_micro_usd FROM model_calls').get()?.actual_micro_usd).toBeNull();});
});
describe('backup and atomic restore',()=>{
 it('restores a verified copy to a new project',async()=>{const {env,r2}=setup();await r2.put('projects/p/workspace/a.ts','source');const backup=await backupProject(env,'p');expect((await restoreBackup(env,'p',backup.id,'restored')).restored).toBe(1);expect((await readFile(env,'restored','a.ts'))?.content).toBe('source');});
 it('corruption prevents publication',async()=>{const {env,files,r2}=setup();await r2.put('projects/p/workspace/a.ts','source');const backup=await backupProject(env,'p');files.set(`backups/p/${backup.id}/0`,new Uint8Array([1]));await expect(restoreBackup(env,'p',backup.id,'target')).rejects.toThrow();expect(await readFile(env,'target','a.ts')).toBeNull();});
 it('failed staged write preserves the active version',async()=>{const {env,r2}=setup();await publishWorkspace(env,'p',[{path:'old',content:'old'}]);const previous=await workspacePrefix(env,'p');vi.spyOn(r2,'put').mockRejectedValueOnce(Error('storage down'));await expect(publishWorkspace(env,'p',[{path:'new',content:'new'}])).rejects.toThrow();expect(await workspacePrefix(env,'p')).toBe(previous);expect((await readFile(env,'p','old'))?.content).toBe('old');});
});
