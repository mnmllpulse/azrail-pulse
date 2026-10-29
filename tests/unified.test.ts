import {describe,it,expect,vi,afterEach} from 'vitest';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
vi.mock('../src/core/azrail-sandbox',()=>({Sandbox:class{}}));
import worker,{secureResponse} from '../src/unified/entry';
import {sqliteD1} from './stubs/sqlite-d1';
import {hashToken,createAccount,authenticate,requireResource} from '../src/lib/accounts';
import {ensureBudget,reserve,settle} from '../src/unified/ledger';
import {authRoute,sessionPrincipal} from '../src/unified/oidc';
import {analyzeCSV,parseCSV} from '../ui/data';
import {composeNotes} from '../ui/media';
import type {Env} from '../src/types';
import {readFileSync} from 'node:fs';
afterEach(()=>vi.unstubAllGlobals());

async function fixture(){
 const {db,sqlite}=sqliteD1(),objects=new Map<string,Uint8Array>();
 const env={AZRAIL_D1:db,AUTH_MODE:'oidc',PUBLIC_ORIGINS:'https://app.test',UNIFIED_LEDGER:'true',DAILY_PROVIDER_CALLS:'5',
  AZRAIL_R2:{list:async({prefix}:{prefix:string})=>({objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,size:objects.get(key)!.length})),truncated:false}),put:async(k:string,v:Uint8Array)=>{objects.set(k,v);},get:async(k:string)=>objects.has(k)?{body:objects.get(k),text:async()=>new TextDecoder().decode(objects.get(k))}:null,delete:async(k:string)=>objects.delete(k)},AI:{run:vi.fn().mockResolvedValue({image:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='})},ASSETS:{fetch:vi.fn().mockResolvedValue(new Response('<html></html>',{headers:{'Content-Type':'text/html'}}))}} as unknown as Env;
 const alice=await createAccount(env,'Alice','editor'),bob=await createAccount(env,'Bob','editor');
 const token='a'.repeat(64),bobToken='b'.repeat(64);
 for(const [who,key] of [[alice,token],[bob,bobToken]] as const)sqlite.prepare('INSERT INTO web_sessions VALUES(?,?,?,?)').run(await hashToken(key),who.id,'https://app.test',Date.now()+3600000);
 const call=(path:string,body?:unknown,owner='a',extra:Record<string,string>={})=>worker.fetch(new Request(`https://app.test${path}`,{method:body===undefined?'GET':'POST',headers:{Cookie:`__Host-pulse-session=${owner.repeat(64)}`,Origin:'https://app.test','Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)}),env,{waitUntil:vi.fn()} as unknown as ExecutionContext);
 return{env,sqlite,alice,bob,call,token,objects};
}
describe('Unified OIDC and tenant isolation',()=>{
 it('completes signed PKCE/OIDC login once, without issuing browser API keys',async()=>{
  const f=await fixture(),issuer='https://issuer.example.com/'+crypto.randomUUID();f.env.OIDC_ISSUER=issuer;f.env.OIDC_CLIENT_ID='client';
  const keys=await generateKeyPair('ES256'),jwk=await exportJWK(keys.publicKey);jwk.kid='signer';jwk.alg='ES256';
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input);
   if(url.endsWith('/.well-known/openid-configuration'))return Response.json({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks'});
   if(url.endsWith('/jwks'))return Response.json({keys:[jwk]});
   if(url.endsWith('/token')){
    expect(new URLSearchParams(String(init?.body)).get('code_verifier')?.length).toBe(64);
    return Response.json({id_token:await new SignJWT({nonce:nonce,name:'OIDC user'}).setProtectedHeader({alg:'ES256',kid:'signer'}).setIssuer(issuer).setAudience('client').setSubject('new-person').setIssuedAt().setExpirationTime('5m').sign(keys.privateKey)});
   }
   throw Error('Unexpected fetch');
  }));
  const login=await authRoute(new Request('https://app.test/auth/login'),f.env);expect(login?.status).toBe(302);
  const location=new URL(login!.headers.get('Location')!);expect(location.searchParams.get('code_challenge_method')).toBe('S256');const state=location.searchParams.get('state')!,nonce=location.searchParams.get('nonce')!;
  const request=new Request('https://app.test/auth/callback?code=one&state='+state,{headers:{Cookie:'__Host-pulse-state='+state}});
  const callback=await authRoute(request,f.env);expect(callback?.status).toBe(302);const cookie=callback!.headers.get('Set-Cookie')!;expect(cookie).toContain('HttpOnly');expect(cookie).not.toContain('az_');
  expect((await authRoute(request,f.env))?.status).toBe(400);
 });
 it('rejects callback state not bound to the browser without contacting the IdP',async()=>{const f=await fixture();const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await authRoute(new Request('https://app.test/auth/callback?code=x&state=attacker'),f.env))?.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();});
 it('accepts only a live session on its exact host',async()=>{const f=await fixture();const headers={Cookie:`__Host-pulse-session=${f.token}`};expect((await sessionPrincipal(new Request('https://app.test/',{headers}),f.env))?.id).toBe(f.alice.id);expect(await sessionPrincipal(new Request('https://other.test/',{headers}),f.env)).toBeNull();});
 it('never accepts bootstrap owner token in OIDC mode',async()=>{const f=await fixture();f.env.AZRAIL_TOKEN='owner';expect((await authenticate(new Request('https://app.test/',{headers:{Authorization:'Bearer owner'}}),f.env)).ok).toBe(false);});
 it('revoked account immediately loses its cookie session',async()=>{const f=await fixture();f.sqlite.prepare('UPDATE access_accounts SET disabled=1 WHERE id=?').run(f.alice.id);expect((await f.call('/api/me')).status).toBe(401);});
 it('does not serve the app shell for a direct agent address',async()=>{const f=await fixture();const response=await worker.fetch(new Request('https://app.test/agents/orchestrator/default'),f.env,{waitUntil:vi.fn()} as unknown as ExecutionContext);expect(response.status).toBe(404);expect(await response.json()).toEqual({error:'Прямой доступ к агентам отключён.'});});
 it('blocks CSRF even with valid cookies and Origin on another domain',async()=>{const f=await fixture();expect((await f.call('/api/admin/routing-settings',{},'a',{Origin:'https://attacker.test'})).status).toBe(403);});
 it('operator setting does not grant access to other users projects',async()=>{const f=await fixture();f.env.OPERATOR_ACCOUNT_IDS=f.alice.id;await requireResource(f.env,f.bob,'project','secret',true);expect((await f.call('/api/backups?projectId=secret')).status).toBe(404);expect((await f.call('/api/admin/accounts')).status).toBe(403);});
 it('callback without browser-bound state fails without creating an account',async()=>{const f=await fixture();expect((await authRoute(new Request('https://wrong.test/auth/callback?code=x&state=x'),f.env))?.status).toBe(403);});
 it('logout invalidates session and sends an expiring HttpOnly cookie',async()=>{const f=await fixture();const r=await f.call('/auth/logout',{});expect(r.status).toBe(204);expect(r.headers.get('Set-Cookie')).toContain('Max-Age=0');expect((await f.call('/api/me')).status).toBe(401);});
 it('scopes project lists to owner',async()=>{const f=await fixture();await requireResource(f.env,f.alice,'project','alice-project',true);await requireResource(f.env,f.bob,'project','bob-project',true);const data=await(await f.call('/api/studio/projects')).json() as any;expect(data.projects.map((p:any)=>p.id)).toEqual(['alice-project']);});
 it('strict CSP has no eval or inline script permission',()=>{const r=secureResponse(new Response(''),new Request('https://app.test'));expect(r.headers.get('Content-Security-Policy')).toContain("script-src 'self';");expect(r.headers.get('Content-Security-Policy')).not.toContain('unsafe-eval');});
});
describe('Resource ledger uses real SQLite transactions',()=>{
 it('parallel reservations cannot overrun a hard limit',async()=>{const{env,sqlite}=await fixture();await ensureBudget(env,'test','micro_usd',100);const results=await Promise.allSettled(Array.from({length:12},(_,i)=>reserve(env,{id:`r${i}`,scope:'test',unit:'micro_usd',resource:'test',upperBound:30,fingerprint:`r${i}`})));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(3);expect(sqlite.prepare("SELECT committed_units FROM resource_budgets WHERE scope='test'").get()?.committed_units).toBe(90);});
 it('same reservation is charged once; conflicting request is rejected',async()=>{const{env,sqlite}=await fixture();await ensureBudget(env,'s','request',2);const r={id:'same',scope:'s',unit:'request' as const,resource:'provider',upperBound:1,fingerprint:'abc'};expect(await reserve(env,r)).toBe('new');expect(await reserve(env,r)).toBe('existing');await expect(reserve(env,{...r,fingerprint:'other'})).rejects.toThrow('conflict');expect(sqlite.prepare("SELECT committed_units FROM resource_budgets WHERE scope='s'").get()?.committed_units).toBe(1);});
 it('unknown result holds reserve, settlement refunds unused amount exactly once',async()=>{const{env,sqlite}=await fixture();await ensureBudget(env,'s','micro_usd',100);await reserve(env,{id:'r',scope:'s',unit:'micro_usd',resource:'model',upperBound:80,fingerprint:'x'});await settle(env,'r',null,'timeout');expect(sqlite.prepare("SELECT committed_units FROM resource_budgets WHERE scope='s'").get()?.committed_units).toBe(80);await settle(env,'r',25,'invoice');await settle(env,'r',25,'duplicate');expect(sqlite.prepare("SELECT committed_units FROM resource_budgets WHERE scope='s'").get()?.committed_units).toBe(25);});
 it('actual overshoot is recorded and further reservations blocked',async()=>{const{env,sqlite}=await fixture();await ensureBudget(env,'s','micro_usd',100);await reserve(env,{id:'r',scope:'s',unit:'micro_usd',resource:'model',upperBound:40,fingerprint:'x'});await settle(env,'r',60,'provider charged more');expect(sqlite.prepare("SELECT actual_units FROM resource_ledger WHERE id='r'").get()?.actual_units).toBe(60);await expect(reserve(env,{id:'r2',scope:'s',unit:'micro_usd',resource:'model',upperBound:1,fingerprint:'y'})).rejects.toThrow();});
});
describe('Studio request safety',()=>{
 it('rejects unauthenticated media calls',async()=>{const f=await fixture();const r=await worker.fetch(new Request('https://app.test/api/studio/image',{method:'POST',body:'{}'}),f.env,{} as ExecutionContext);expect(r.status).toBe(401);expect(f.env.AI.run).not.toHaveBeenCalled();});
 it('replays image result after reconnect without a second model call',async()=>{const f=await fixture();const headers={'Idempotency-Key':'image-request-12345'};const first=await f.call('/api/studio/image',{prompt:'night'},'a',headers);expect(first.status).toBe(201);const a=await first.json();const second=await f.call('/api/studio/image',{prompt:'night'},'a',headers);expect(await second.json()).toEqual(a);expect(f.env.AI.run).toHaveBeenCalledTimes(1);});
 it('another account cannot fetch generated image',async()=>{const f=await fixture();const created=await f.call('/api/studio/image',{prompt:'night'},'a',{'Idempotency-Key':'image-request-12345'});const art=await created.json() as any;expect((await f.call(art.url,undefined,'b')).status).toBe(404);expect((await f.call(art.url)).status).toBe(200);});
 it('content-length body cap stops media before provider execution',async()=>{const f=await fixture();const r=await f.call('/api/studio/image',{prompt:'x'},'a',{'Idempotency-Key':'image-request-12345','Content-Length':'999999999'});expect(r.status).toBe(413);expect(f.env.AI.run).not.toHaveBeenCalled();});
 it('legacy HTML URL resolves to new self-contained app asset',async()=>{const f=await fixture();await f.call('/ultimate.html');const request=vi.mocked(f.env.ASSETS!.fetch).mock.calls[0][0] as Request;expect(new URL(request.url).pathname).toBe('/index.html');});
 it('serves / and /app from the SPA entry without leaking a redirect',async()=>{
  const f=await fixture();
  for(const path of ['/','/app','/studios']){
   vi.mocked(f.env.ASSETS!.fetch).mockClear();
   const r=await f.call(path);
   expect(r.status).toBe(200);
   expect(r.headers.get('Location')).toBeNull();
   const request=vi.mocked(f.env.ASSETS!.fetch).mock.calls[0][0] as Request;
   expect(new URL(request.url).pathname).toBe('/index.html');
  }
 });
 it('follows Cloudflare pretty-URL redirects internally instead of looping',async()=>{
  const f=await fixture();
  f.env.ASSETS={fetch:vi.fn(async(req:Request)=>{
   const path=new URL(req.url).pathname;
   if(path==='/'||path==='/index.html'||path==='/app.html')return new Response(null,{status:307,headers:{Location:'/app'}});
   if(path==='/app')return new Response('<!doctype html><title>app</title>',{headers:{'Content-Type':'text/html'}});
   return new Response('missing',{status:404});
  })} as unknown as Env['ASSETS'];
  const r=await f.call('/');
  expect(r.status).toBe(200);
  expect(await r.text()).toContain('<title>app</title>');
  expect(r.headers.get('Location')).toBeNull();
 });
});
describe('Local studio output',()=>{
 it('CSV handles quoted commas, multiline cells and escaped quotes',()=>{expect(parseCSV('name,value\n"a,b",2\n"a\n""b""",3')).toEqual([['name','value'],['a,b','2'],['a\n"b"','3']]);});
 it('CSV reports missing/ragged cells and excludes empty numbers',()=>{const r=analyzeCSV('x,y\n1,\n3,4\n5');expect(r.columns[0].mean).toBe(3);expect(r.columns[1].mean).toBe(4);expect(r.raggedRows).toBe(1);});
 it('music export composition is deterministic and bounded to selected bars',()=>{const a=composeNotes('orbit',124,8);expect(a).toEqual(composeNotes('orbit',124,8));expect(a.notes.length).toBeGreaterThan(1);expect(a.notes.every(n=>n.start+n.length<=32)).toBe(true);});
 it('Free deploy profile contains no containers and production assets exclude legacy',()=>{const config=JSON.parse(readFileSync('wrangler.staging.json','utf8'));expect(config.containers).toBeUndefined();expect(config.vars.AUTH_MODE).toBe('oidc');expect(config.assets.directory).toBe('./site');expect(config.assets.run_worker_first).toBe(true);});
});
