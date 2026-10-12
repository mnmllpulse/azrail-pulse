import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('../src/core/azrail-sandbox',()=>({Sandbox:class{}}));
import worker from '../src/unified/entry';
import {sqliteD1} from './stubs/sqlite-d1';
import {createAccount,hashToken} from '../src/lib/accounts';
import {unseal} from '../src/unified/connector-vault';
import {decideApproval} from '../src/lib/approval-engine';
import type {Env} from '../src/types';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const policy={id:'files',name:'Workspace files',url:'https://mcp.example.com/mcp',auth:'bearer',readTools:['search_files'],blockedTools:['destroy_all'],dailyCalls:20};
async function fixture(){
 const {db,sqlite}=sqliteD1();const env={AZRAIL_D1:db,AUTH_MODE:'oidc',PUBLIC_ORIGINS:'https://app.example.com',INTEGRATION_KEY:btoa('k'.repeat(32)),MCP_SERVERS:JSON.stringify([policy]),AZRAIL_R2:{list:async()=>({objects:[]})}} as unknown as Env;
 const admin=await createAccount(env,'Admin','admin'),other=await createAccount(env,'Other','editor');for(const [account,key] of [[admin,'a'],[other,'b']] as const)sqlite.prepare('INSERT INTO web_sessions VALUES(?,?,?,?)').run(await hashToken(key.repeat(64)),account.id,'https://app.example.com',Date.now()+3600000);
 vi.stubGlobal('fetch',vi.fn(async(_url:any,init:any)=>{const message=JSON.parse(init.body);if(init.method==='DELETE')return new Response(null,{status:204});if(message.method==='notifications/initialized')return new Response(null,{status:202});const result=message.method==='initialize'?{protocolVersion:'2025-11-25',capabilities:{tools:{}}}:message.method==='tools/list'?{tools:[{name:'search_files',description:'Search',inputSchema:{type:'object',properties:{query:{type:'string'}},additionalProperties:false}}]}:{content:[{type:'text',text:'ok'}]};return Response.json({jsonrpc:'2.0',id:message.id,result},{headers:message.method==='initialize'?{'Mcp-Session-Id':'session-1'}:{}});}));
 const call=(path:string,body?:unknown,owner='a',method=body===undefined?'GET':'POST')=>worker.fetch(new Request('https://app.example.com'+path,{method,headers:{Cookie:`__Host-pulse-session=${owner.repeat(64)}`,Origin:'https://app.example.com','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),env,{} as ExecutionContext);
 const connect=async()=>{const r=await call('/api/connectors',{endpointKey:'files',token:'provider-secret'});expect(r.status).toBe(201);return (await r.json() as any).id as string;};
 return{env,sqlite,admin,other,call,connect};
}
describe('Professional Connections',()=>{
 it('does not expose credentials in list or detail',async()=>{const f=await fixture(),id=await f.connect();for(const path of ['/api/connectors',`/api/connectors/${id}`]){const text=await(await f.call(path)).text();expect(text).not.toContain('provider-secret');expect(text).not.toContain('secret_cipher');}});
 it('records verification health with latency and tool count',async()=>{const f=await fixture(),id=await f.connect();expect((await f.call(`/api/connectors/${id}/discover`,{})).status).toBe(200);const row=f.sqlite.prepare('SELECT * FROM connector_health_checks WHERE connection_id=?').get(id) as any;expect(row.status).toBe('healthy');expect(row.tool_count).toBe(1);expect(row.latency_ms).toBeGreaterThanOrEqual(0);});
 it('credential rotation requires approval and invalidates the discovered catalog',async()=>{const f=await fixture(),id=await f.connect();await f.call(`/api/connectors/${id}/discover`,{});const first=await f.call(`/api/connectors/${id}/rotate`,{token:'new-provider-secret'});expect(first.status).toBe(409);const body=await first.json() as any;expect(body.approval.action_type).toBe('secret_rotation');// Policy: approvals are decided only by an administrator; OIDC web sessions are never admin, so the requester cannot self-approve.
expect((await f.call(`/api/approvals/${body.approval.id}/decision`,{decision:'approved',payloadDigest:body.approval.payload_digest,reason:'test rotation'})).status).toBe(403);
await decideApproval(f.env,{id:body.approval.id,actor:'account:out-of-band-admin',decision:'approved',reason:'test rotation',expectedDigest:body.approval.payload_digest});const rotated=await f.call(`/api/connectors/${id}/rotate`,{token:'new-provider-secret',approvalId:body.approval.id});expect(rotated.status).toBe(200);const row=f.sqlite.prepare('SELECT * FROM connector_connections WHERE id=?').get(id) as any;expect(row.revision).toBe(2);expect(row.verified_at).toBeNull();expect(row.tools_json).toBe('[]');expect(await unseal<any>(f.env,`connector:${f.admin.id}:${id}`,row.secret_cipher)).toEqual({token:'new-provider-secret'});});
 it('connection detail is owner scoped',async()=>{const f=await fixture(),id=await f.connect();expect((await f.call(`/api/connectors/${id}`,undefined,'b')).status).toBe(404);});
});
