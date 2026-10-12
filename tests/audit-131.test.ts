import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('../src/core/azrail-sandbox',()=>({Sandbox:class{}}));
import worker from '../src/unified/entry';
import {sqliteD1} from './stubs/sqlite-d1';
import {createAccount,hashToken} from '../src/lib/accounts';
import {claimMission,finishAdmission} from '../src/lib/mission-admission';
import {cleanupSecurityState} from '../src/lib/quota';
import {accountCall} from '../src/unified/ledger';
import {MCPClient} from '../src/unified/mcp-client';
import {unzipSync} from 'fflate';
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
describe('Audit 1.3.1 reproductions',()=>{
 it('honors viewer downgrade on an already active OIDC session',async()=>{const f=await fixture();f.sqlite.prepare("UPDATE access_accounts SET role='viewer' WHERE id=?").run(f.account.id);const r=await f.call('/api/studio/drafts/music',{baseRevision:0,values:{'studio-text':'not allowed'}},'PUT');expect(r.status).toBe(403);expect(f.sqlite.prepare('SELECT COUNT(*) n FROM studio_drafts').get()?.n).toBe(0);});
 it('never re-admits an uncertain paid job after 24 hours and scheduled cleanup',async()=>{const f=await fixture();expect((await claimMission(f.env,'unknown','payload')).kind).toBe('claimed');f.sqlite.exec('UPDATE mission_admissions SET expires_at=0');await cleanupSecurityState(f.env);expect((await claimMission(f.env,'unknown','payload')).kind).toBe('pending');});
 it('keeps a completed admission replayable after retention deadline',async()=>{const f=await fixture(),admission=await claimMission(f.env,'completed','payload');if(admission.kind!=='claimed')throw Error();await finishAdmission(f.env,'completed',admission.claim,Response.json({missionId:'one'},{status:202}));f.sqlite.exec('UPDATE mission_admissions SET expires_at=0');await cleanupSecurityState(f.env);expect((await claimMission(f.env,'completed','payload')).kind).toBe('replay');});
 it.each([null,[],{prompt:7}])('invalid image body %j returns 400 and permits correction before any provider call',async(body)=>{const f=await fixture();expect((await f.call('/api/studio/image',body)).status).toBe(400);expect(f.env.AI.run).not.toHaveBeenCalled();expect((await f.call('/api/studio/image',{prompt:'valid'})).status).toBe(201);expect(f.env.AI.run).toHaveBeenCalledTimes(1);});
 it('lowering DAILY_PROVIDER_CALLS stops new calls immediately',async()=>{const f=await fixture(),provider=vi.fn(async()=>true);await accountCall(f.env,'media',provider);f.env.DAILY_PROVIDER_CALLS='0';await expect(accountCall(f.env,'media',provider)).rejects.toThrow();expect(provider).toHaveBeenCalledTimes(1);});
 it('exports binary workspace assets without UTF-8 replacement',async()=>{const f=await fixture();f.project();const bytes=new Uint8Array([0,255,128,137,80,78,71,13,10,26,10]);f.objects.set('projects/p1/workspace/image.png',bytes);const r=await f.call('/api/studio/project-zip?projectId=p1');expect(r.status).toBe(200);expect(unzipSync(new Uint8Array(await r.arrayBuffer()))['image.png']).toEqual(bytes);});
 it('does not export a workspace while another process holds its write lock',async()=>{const f=await fixture();f.project();f.objects.set('projects/p1/workspace/main.js',new TextEncoder().encode('old'));f.sqlite.prepare('INSERT INTO operation_locks VALUES(?,?,?)').run('p1','writer',Date.now());expect((await f.call('/api/studio/project-zip?projectId=p1')).status).toBe(409);});
 it('does not treat an invalid tools/call result as a successful external operation',async()=>{const f=await fixture();vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{const request=JSON.parse(String(init?.body));return Response.json({jsonrpc:'2.0',id:request.id,result:{}});}));await expect(new MCPClient('https://mcp.example.com/mcp','').call('write_file',{})).rejects.toThrow();});
 it('invalid JSON in a draft is a client error rather than a server outage',async()=>{const f=await fixture();const r=await worker.fetch(new Request('https://app.test/api/studio/drafts/music',{method:'PUT',headers:{Cookie:`__Host-pulse-session=${'a'.repeat(64)}`,Origin:'https://app.test'},body:'{'}),f.env,{} as ExecutionContext);expect(r.status).toBe(400);});
});

it('shows the latest 200 mission events in stable chronological order',async()=>{
 const {listMissionEvents}=await import('../src/lib/event-store');const f=await fixture();f.sqlite.prepare('INSERT INTO missions(id,goal) VALUES(?,?)').run('mission','Audit');
 for(let i=0;i<205;i++)f.sqlite.prepare('INSERT INTO mission_events (id,mission_id,type,data,created_at) VALUES(?,?,?,?,?)').run(String(i),'mission','step','{}','2026-09-30T00:00:00Z');
 const events=await listMissionEvents(f.env,'mission');expect(events).toHaveLength(200);expect(events[0].id).toBe('5');expect(events.at(-1)?.id).toBe('204');
});
it('rejects malformed MCP content and output-schema violations after dispatch',async()=>{
 let result:any={content:[{type:'text'}]};vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{const request=JSON.parse(String(init?.body));return Response.json({jsonrpc:'2.0',id:request.id,result});}));
 const client=new MCPClient('https://mcp.example.com/mcp','');await expect(client.call('write',{})).rejects.toThrow();
 result={content:[],structuredContent:{count:'wrong'}};await expect(client.call('write',{}, {type:'object',properties:{count:{type:'integer'}},required:['count']})).rejects.toThrow();
 result={content:[],structuredContent:{count:1}};await expect(client.call('write',{}, {type:'object',properties:{count:{type:'integer'}},required:['count']})).resolves.toEqual(result);
});
it('retains request identity when a provider reports an error after dispatch',async()=>{
 const {AccessError}=await import('../src/lib/accounts');const f=await fixture();vi.mocked(f.env.AI.run).mockRejectedValue(new AccessError('Remote error',400));
 expect((await f.call('/api/studio/image',{prompt:'draw'})).status).toBe(409);expect((await f.call('/api/studio/image',{prompt:'draw'})).status).toBe(409);expect(f.env.AI.run).toHaveBeenCalledTimes(1);
});
it('rejects a changed R2 object rather than returning a mixed export',async()=>{
 const f=await fixture();f.project();f.objects.set('projects/p1/workspace/file.bin',new Uint8Array([255,1]));vi.mocked(f.env.AZRAIL_R2.get).mockResolvedValue({body:new Uint8Array([0,1]),size:2,etag:'changed'} as any);
 const r=await f.call('/api/studio/project-zip?projectId=p1');expect(r.status).toBe(409);expect(f.sqlite.prepare('SELECT COUNT(*) n FROM operation_locks').get()?.n).toBe(0);
});
it('does not save arbitrary provider text as a PNG image or retry the paid call',async()=>{
 const f=await fixture();vi.mocked(f.env.AI.run).mockResolvedValue({image:btoa('not an image')} as any);
 expect((await f.call('/api/studio/image',{prompt:'draw'})).status).toBe(409);expect(f.objects.size).toBe(0);expect((await f.call('/api/studio/image',{prompt:'draw'})).status).toBe(409);expect(f.env.AI.run).toHaveBeenCalledTimes(1);
});
it('keeps a valid provider result and the full reservation if settlement storage fails',async()=>{
 const f=await fixture(),batch=f.env.AZRAIL_D1.batch.bind(f.env.AZRAIL_D1);let calls=0;
 vi.spyOn(f.env.AZRAIL_D1,'batch').mockImplementation(async statements=>{if(++calls===2)throw Error('Settlement storage unavailable');return batch(statements);});
 const provider=vi.fn(async()=>({artifact:'available'}));await expect(accountCall(f.env,'image',provider)).resolves.toEqual({artifact:'available'});
 expect(provider).toHaveBeenCalledTimes(1);expect(f.sqlite.prepare('SELECT status FROM resource_ledger').get()?.status).toBe('reserved');expect(f.sqlite.prepare('SELECT committed_units FROM resource_budgets').get()?.committed_units).toBe(1);
});
