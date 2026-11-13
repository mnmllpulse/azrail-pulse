import engine from '../index';
import { errorPayload } from '../lib/validation';
import type { Env } from '../types';
import { authRoute } from './oidc';
import { studioRoute } from './studios';
import { AccessError, authenticate, hashToken } from '../lib/accounts';
import { claimMission, finishAdmission } from '../lib/mission-admission';
import { readBoundedBody, BodyLimitError } from '../lib/request-body';
import { BudgetError } from './ledger';
import {connectorRoute} from './connectors';
import {agentRoute} from './local-agent';
import {publishedSiteResponse} from '../lib/web-sites';
import {unversionApiPath} from '../lib/api-contract';
import {log} from '../lib/resilience';

const SPA_PAGES=new Set(['/index.html','/app.html','/ultimate.html']);
function isStaticAsset(pathname:string) {
 return /\.[a-z0-9]+$/i.test(pathname) && !SPA_PAGES.has(pathname);
}
/**
 * Cloudflare Assets pretty-URLs turn /app.html into 307 /app.
 * If the worker then maps /app back to /app.html, the browser loops and Chrome
 * shows the empty "try deleting cookies" page. Fetch the real /index.html file
 * (html_handling=none) and never leak those redirects to the client.
 */
async function serveAppAsset(request:Request,env:Env,url:URL):Promise<Response> {
 const target=new URL(request.url);
 if(!isStaticAsset(url.pathname))target.pathname='/index.html';
 const first=await env.ASSETS!.fetch(new Request(target,request));
 if(first.status<300||first.status>=400)return first;
 const location=first.headers.get('Location');
 if(!location)return first;
 const next=new URL(location,target);
 if(next.origin!==target.origin)return first;
 return env.ASSETS!.fetch(new Request(next,request));
}

export function secureResponse(response:Response,request:Request) {
 const h=new Headers(response.headers);
 h.delete('Access-Control-Allow-Origin');h.delete('Access-Control-Allow-Credentials');
 h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','same-origin');
 h.set('Permissions-Policy','camera=(), microphone=(self), geolocation=()');
 if(new URL(request.url).protocol==='https:')h.set('Strict-Transport-Security','max-age=31536000');
 if(!new URL(request.url).pathname.startsWith('/s/'))h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' data:; style-src-attr 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-src blob: about:; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
 if(new URL(request.url).pathname.startsWith('/api/')||new URL(request.url).pathname.startsWith('/auth/'))h.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response> {
  const incoming=new URL(request.url);
  const canonicalPath=unversionApiPath(incoming.pathname);
  if(canonicalPath!==incoming.pathname){
   incoming.pathname=canonicalPath;
   request=new Request(incoming,request);
  }
  const url=new URL(request.url);
  try {
   let response:Response|null=null;
   if(!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers.has('Cookie') && request.headers.get('Origin')!==url.origin)
    response=Response.json({error:'Cross-origin request blocked'},{status:403});
   if(!response)response=await authRoute(request,env);
   if(!response&&request.method==='POST'&&['/api/studio/image','/api/studio/voice','/api/studio/video/plan'].includes(url.pathname)) {
    const auth=await authenticate(request,env);
    if(!auth.ok)response=Response.json({error:auth.error},{status:401});
    else if(auth.principal!.role==='viewer')response=Response.json({error:'Ваш аккаунт разрешает только просмотр.'},{status:403});
    else {
     const key=request.headers.get('Idempotency-Key')??'';
     if(!/^[a-zA-Z0-9_-]{12,128}$/.test(key))response=Response.json({error:'Нужен Idempotency-Key'},{status:400});
     else {
      const bytes=await readBoundedBody(request,4*1024*1024);
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const scope=`studio:${auth.caller}:${url.pathname}:${key}`;
      const claim=await claimMission(env,scope,await hashToken([...new Uint8Array(digest)].join(',')));
      if(claim.kind==='replay')response=new Response(claim.body,{status:claim.status,headers:{'Content-Type':'application/json'}});
      else if(claim.kind!=='claimed')response=Response.json({error:claim.kind==='conflict'?'Ключ уже используется для другого запроса.':'Запрос уже выполняется или требует сверки. Автоповтор заблокирован.'},{status:409});
      else {
       let dispatched=false;
       try{response=await studioRoute(new Request(request,{body:bytes}),env,()=>{dispatched=true;});if(response)await finishAdmission(env,scope,claim.claim,response);}
       catch(error){
        if(dispatched){
         const message=error instanceof Error?error.message:String(error);
         if(/3043|internal server error/i.test(message)){
          await env.AZRAIL_D1.prepare('DELETE FROM mission_admissions WHERE key=? AND claim=?').bind(scope,claim.claim).run();
         }
         throw new AccessError('Запрос отправлен провайдеру, но результат не подтверждён. Повтор с новым ключом может создать вторую операцию. Проверьте сохранённые файлы.',409);
        }
        const status=error instanceof AccessError?error.status:error instanceof BodyLimitError?413:error instanceof BudgetError?429:503;
        if(status>=400&&status<500)await finishAdmission(env,scope,claim.claim,Response.json(errorPayload(error,'Ошибка запроса.'),{status}));
        else await env.AZRAIL_D1.prepare('DELETE FROM mission_admissions WHERE key=? AND claim=?').bind(scope,claim.claim).run().catch(()=>{});
        throw error;
       }
      }
     }
    }
   }
   if(!response)response=await agentRoute(request,env);
   if(!response)response=await connectorRoute(request,env);
   if(!response)response=await studioRoute(request,env);
   if(!response&&(url.pathname.startsWith('/api/')||url.pathname==='/health'||url.pathname==='/agents'||url.pathname.startsWith('/agents/')))response=await engine.fetch(request,env,ctx);
   if(!response&&url.pathname.startsWith('/s/'))response=await publishedSiteResponse(env,request);
   if(!response) {
    if(!['GET','HEAD'].includes(request.method))response=new Response('Method not allowed',{status:405});
    else response=await serveAppAsset(request,env,url);
   }
   if(!response)throw new Error('No response generated');
   return secureResponse(response,request);
  } catch(error) {
   log('error','request.unhandled',{path:new URL(request.url).pathname,method:request.method,message:error instanceof Error?error.message:String(error)});
   const known=error instanceof AccessError || error instanceof BodyLimitError || error instanceof BudgetError || (error instanceof Error&&'status' in error);
   const status=error instanceof BodyLimitError?413:error instanceof BudgetError?429:known?Number((error as {status:number}).status):503;
   return secureResponse(Response.json(known?errorPayload(error,'Ошибка запроса.'):{error:'Сервис недоступен. Проверьте настройки, лимит и журнал сервера.'},{status:status>=400&&status<=599?status:503}),request);
  }
 },
 scheduled:engine.scheduled,
} satisfies ExportedHandler<Env>;
