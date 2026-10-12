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

export function secureResponse(response:Response,request:Request) {
 const h=new Headers(response.headers);
 h.delete('Access-Control-Allow-Origin');h.delete('Access-Control-Allow-Credentials');
 h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','same-origin');
 h.set('Permissions-Policy','camera=(), microphone=(self), geolocation=()');
 h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-src blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
 if(new URL(request.url).protocol==='https:')h.set('Strict-Transport-Security','max-age=31536000');
 if(new URL(request.url).pathname.startsWith('/api/')||new URL(request.url).pathname.startsWith('/auth/'))h.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response> {
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
        if(dispatched)throw new AccessError('Запрос отправлен провайдеру, но результат не подтверждён. Повтор с новым ключом может создать вторую операцию. Проверьте сохранённые файлы.',409);
        const status=error instanceof AccessError?error.status:error instanceof BodyLimitError?413:error instanceof BudgetError?429:503;
        if(status>=400&&status<500)await finishAdmission(env,scope,claim.claim,Response.json(errorPayload(error,'Ошибка запроса.'),{status}));
        throw error;
       }
      }
     }
    }
   }
   if(!response)response=await connectorRoute(request,env);
   if(!response)response=await studioRoute(request,env);
   if(!response&&(url.pathname.startsWith('/api/')||url.pathname==='/health'))response=await engine.fetch(request,env,ctx);
   if(!response) {
    if(!['GET','HEAD'].includes(request.method))response=new Response('Method not allowed',{status:405});
    else {
     const assetURL=new URL(request.url);
     // Never publish the old monolithic console under the strict app policy.
     if(!/\.[a-z0-9]+$/i.test(url.pathname)||['/index.html','/ultimate.html'].includes(url.pathname))assetURL.pathname='/app.html';
     response=await env.ASSETS!.fetch(new Request(assetURL,request));
    }
   }
   if(!response)throw new Error('No response generated');
   return secureResponse(response,request);
  } catch(error) {
   const known=error instanceof AccessError || error instanceof BodyLimitError || error instanceof BudgetError || (error instanceof Error&&'status' in error);
   const status=error instanceof BodyLimitError?413:error instanceof BudgetError?429:known?Number((error as {status:number}).status):503;
   return secureResponse(Response.json(known?errorPayload(error,'Ошибка запроса.'):{error:'Сервис недоступен. Проверьте настройки, лимит и журнал сервера.'},{status:status>=400&&status<=599?status:503}),request);
  }
 },
 scheduled:engine.scheduled,
} satisfies ExportedHandler<Env>;
