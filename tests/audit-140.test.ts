import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('../src/core/azrail-sandbox',()=>({Sandbox:class{}}));
import worker from '../src/unified/entry';
import {sqliteD1} from './stubs/sqlite-d1';
import {createAccount,hashToken} from '../src/lib/accounts';
import type {Env} from '../src/types';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(){
 const {db,sqlite}=sqliteD1(),objects=new Map<string,Uint8Array>();
 const env={AZRAIL_D1:db,AUTH_MODE:'oidc',PUBLIC_ORIGINS:'https://app.test',UNIFIED_LEDGER:'true',DAILY_PROVIDER_CALLS:'5',
 AZRAIL_R2:{list:vi.fn(async({prefix,limit}:{prefix:string;limit:number})=>{const all=[...objects.keys()].filter(k=>k.startsWith(prefix));return {objects:all.slice(0,limit).map(key=>({key,size:objects.get(key)!.length,etag:'fixed-etag'})),truncated:all.length>limit};}),get:vi.fn(async(k:string)=>{const data=objects.get(k);return data?{body:data,size:data.length,etag:'fixed-etag',text:async()=>new TextDecoder().decode(data),arrayBuffer:async()=>data.slice().buffer}:null;}),put:async(k:string,v:Uint8Array)=>{objects.set(k,v);},delete:async(k:string)=>objects.delete(k)},AI:{run:vi.fn().mockResolvedValue({image:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='})}} as unknown as Env;
 const account=await createAccount(env,'Owner','editor');sqlite.prepare('INSERT INTO web_sessions VALUES(?,?,?,?)').run(await hashToken('a'.repeat(64)),account.id,'https://app.test',Date.now()+3600000);
 const call=(path:string,body?:unknown,method=body===undefined?'GET':'POST',key='audit-request-0001')=>worker.fetch(new Request('https://app.test'+path,{method,headers:{Cookie:`__Host-pulse-session=${'a'.repeat(64)}`,Origin:'https://app.test','Content-Type':'application/json','Idempotency-Key':key},body:body===undefined?undefined:JSON.stringify(body)}),env,{} as ExecutionContext);
 const project=()=>{sqlite.prepare('INSERT INTO resource_owners VALUES(?,?,?)').run('project','p1',account.id);};
 return {env,sqlite,account,objects,call,project};
}

describe('Audit 1.4 studio protections',()=>{
 it.each([7,false,{},[]])('non-string mission message %j is rejected as a client error and releases admission',async(message)=>{
  const f=await fixture();f.env.AZRAIL_KV={get:vi.fn(async()=>null),put:vi.fn(async()=>{})} as any;
  const r=await f.call('/api/mission',{message,projectId:'project-a'});expect(r.status).toBe(400);
  expect(f.env.AI.run).not.toHaveBeenCalled();expect(f.sqlite.prepare('SELECT COUNT(*) n FROM mission_admissions').get()?.n).toBe(0);
 });
 it('viewer cannot create even an admission for an image call',async()=>{
  const f=await fixture();f.sqlite.prepare("UPDATE access_accounts SET role='viewer' WHERE id=?").run(f.account.id);
  expect((await f.call('/api/studio/image',{prompt:'blocked'})).status).toBe(403);
  expect(f.env.AI.run).not.toHaveBeenCalled();expect(f.sqlite.prepare('SELECT COUNT(*) n FROM mission_admissions').get()?.n).toBe(0);
 });
 it('malformed upload filename returns a client error before any R2 write',async()=>{
  const f=await fixture();const r=await worker.fetch(new Request('https://app.test/api/studio/artifacts',{method:'POST',headers:{Cookie:`__Host-pulse-session=${'a'.repeat(64)}`,Origin:'https://app.test','X-Filename':'%ZZ'},body:new Uint8Array([1,2])}),f.env,{} as ExecutionContext);
  expect(r.status).toBe(400);expect((await r.json() as any).error).toContain('имени файла');expect(f.objects.size).toBe(0);
 });
 it('server rejects an oversized video draft even when the client is bypassed',async()=>{
  const f=await fixture();const r=await f.call('/api/studio/drafts/video',{baseRevision:0,values:{'studio-text':'a'.repeat(91)}},'PUT');
  expect(r.status).toBe(400);expect(f.sqlite.prepare('SELECT COUNT(*) n FROM studio_drafts').get()?.n).toBe(0);
 });
 it('deep studio page URLs pass through the secured worker asset handler',async()=>{
  const f=await fixture();f.env.ASSETS={fetch:vi.fn(async()=>new Response('app html'))} as any;
  const r=await f.call('/studios/music');expect(r.status).toBe(200);
  const request=vi.mocked(f.env.ASSETS!.fetch).mock.calls.at(-1)![0] as Request;
  expect(new URL(request.url).pathname).toBe('/app.html');expect(r.headers.get('Content-Security-Policy')).toContain("script-src 'self'");
 });
});
