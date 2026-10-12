import type {Env} from '../types';
import {AccessError,hashToken} from '../lib/accounts';
import {approvalDigest,claimApproval,completeApproval,getApproval,requestApproval} from '../lib/approval-engine';
import {cookies,trustedOrigin} from './oidc';
import {findPolicy} from './connector-policy';
import {seal,unseal,canonical} from './connector-vault';
const cookieName='__Host-pulse-connector';
const cookie=(value:string,age:number)=>`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const random=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
type PendingOAuth={verifier:string;connectionId?:string;revision?:number;approvalId?:string;rotationDigest?:string;rotationScopeId?:string};
export async function startConnectorOAuth(request:Request,env:Env,account:string,endpointKey:string,connectionId='',approvalId='') {
 if(!trustedOrigin(request,env))throw new AccessError('Домен не разрешён.');
 const p=findPolicy(env,endpointKey);if(p.auth!=='oauth'||!p.oauth)throw new AccessError('OAuth сервиса не настроен.',400);
 let rotation:{id:string;revision:number;label:string}|null=null,rotationDigest='',rotationScopeId='';
 if(connectionId){
  rotation=await env.AZRAIL_D1.prepare('SELECT id,revision,label FROM connector_connections WHERE id=? AND account_id=? AND endpoint_key=? AND disabled=0').bind(connectionId,account,p.id).first<{id:string;revision:number;label:string}>();if(!rotation)throw new AccessError('Подключение для повторной авторизации не найдено.',404);
  rotationScopeId=`${rotation.id}:${rotation.revision}`;rotationDigest=await approvalDigest({connectionId:rotation.id,endpointKey:p.id,revision:rotation.revision,mode:'oauth_reauthorize'});
  if(!approvalId){const approval=await requestApproval(env,{accountId:account,actionType:'secret_rotation',risk:'high',scopeType:'connector_connection',scopeId:rotationScopeId,payloadDigest:rotationDigest,summary:`Re-authorize OAuth credentials for ${rotation.label}`,requestedBy:`account:${account}`,externalRef:rotation.id});return Response.json({error:'Credential rotation requires approval.',approval},{status:409});}
  const approval=await getApproval(env,approvalId);if(!approval||approval.action_type!=='secret_rotation'||approval.scope_type!=='connector_connection'||approval.scope_id!==rotationScopeId||approval.payload_digest!==rotationDigest||approval.status!=='approved'||approval.expires_at<=Date.now())throw new AccessError('Approval не готов к OAuth re-authorization.',409);
 }else{
  const count=await env.AZRAIL_D1.prepare('SELECT COUNT(*) AS n FROM connector_connections WHERE account_id=? AND disabled=0').bind(account).first<{n:number}>();if((count?.n??0)>=30)throw new AccessError('Лимит: 30 подключений на аккаунт.',429);
 }
 const state=random(),verifier=random(),origin=new URL(request.url).origin,hash=await hashToken(state);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 await env.AZRAIL_D1.prepare('DELETE FROM connector_oauth_states WHERE expires_at<?').bind(Date.now()).run();
 const pending:PendingOAuth={verifier,...(rotation?{connectionId:rotation.id,revision:rotation.revision,approvalId,rotationDigest,rotationScopeId}:{})};
 const created=await env.AZRAIL_D1.prepare('INSERT INTO connector_oauth_states SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM connector_oauth_states WHERE account_id=?)<20 RETURNING state_hash').bind(hash,account,p.id,origin,await hashToken(canonical(p)),await seal(env,`oauth:${account}:${hash}`,pending),Date.now()+600000,account).first();
 if(!created)throw new AccessError('Слишком много незавершённых подключений. Повторите через 10 минут.',429);
 const target=new URL(p.oauth.authorizationUrl);target.search=new URLSearchParams({client_id:p.oauth.clientId,response_type:'code',redirect_uri:origin+'/api/connectors/oauth/callback',scope:p.oauth.scopes.join(' '),resource:p.url,state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return Response.json({url:target.href},{headers:{'Set-Cookie':cookie(state,600)}});
}
export async function finishConnectorOAuth(request:Request,env:Env,account:string) {
 const url=new URL(request.url),state=url.searchParams.get('state')??'',code=url.searchParams.get('code');
 if(!trustedOrigin(request,env)||!code||code.length>4096||! /^[a-f0-9]{64}$/.test(state)||state!==cookies(request)[cookieName])throw new AccessError('Подключение не подтверждено этим браузером. Начните заново.',400);
 const hash=await hashToken(state);const row=await env.AZRAIL_D1.prepare('DELETE FROM connector_oauth_states WHERE state_hash=? AND account_id=? AND origin=? AND expires_at>? RETURNING *').bind(hash,account,url.origin,Date.now()).first<{endpoint_key:string;policy_digest:string;verifier_cipher:string}>();
 if(!row)throw new AccessError('Ссылка подключения истекла или уже использована.',400);
 const p=findPolicy(env,row.endpoint_key);if(!p.oauth||await hashToken(canonical(p))!==row.policy_digest)throw new AccessError('Настройки сервиса изменились. Начните подключение заново.',409);
 const pending=await unseal<PendingOAuth>(env,`oauth:${account}:${hash}`,row.verifier_cipher);
 const body=new URLSearchParams({grant_type:'authorization_code',client_id:p.oauth.clientId,code,redirect_uri:url.origin+'/api/connectors/oauth/callback',code_verifier:pending.verifier,resource:p.url});
 let secrets:Record<string,string>;try{secrets=JSON.parse(env.MCP_OAUTH_SECRETS??'{}');if(!secrets||Array.isArray(secrets)||typeof secrets!=='object'||Object.values(secrets).some(v=>typeof v!=='string'||v.length>8192))throw new Error();}catch{throw new AccessError('OAuth секреты настроены неверно.',503);}if(secrets[p.id])body.set('client_secret',secrets[p.id]);
 const response=await fetch(p.oauth.tokenUrl,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok){await response.body?.cancel();throw new AccessError('Сервис отклонил подключение. Повторите вход.',401);}
 if(!response.body)throw new AccessError('Пустой ответ сервиса.',502);
 const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>24000)throw new AccessError('Ответ авторизации превышает лимит.',502);text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
 let token:{access_token?:string;token_type?:string;expires_in?:number};try{token=JSON.parse(text);}catch{throw new AccessError('Некорректный ответ авторизации.',502);}
 if(!token||typeof token.access_token!=='string'||!token.access_token||token.access_token.length>8192||/[\r\n]/.test(token.access_token)||typeof token.token_type!=='string'||token.token_type.toLowerCase()!=='bearer')throw new AccessError('Неподдерживаемый ответ авторизации.',502);
 const lifetime=Number(token.expires_in??3600);if(!Number.isFinite(lifetime)||lifetime<=0)throw new AccessError('Токен сервиса истёк.',401);
 const now=Date.now(),expiresAt=now+Math.min(lifetime,31536000)*1000;
 if(pending.connectionId){
  if(!pending.approvalId||!pending.rotationDigest||!pending.rotationScopeId||!Number.isSafeInteger(pending.revision))throw new AccessError('OAuth rotation context повреждён.',409);
  const claimed=await claimApproval(env,{id:pending.approvalId,actionType:'secret_rotation',scopeType:'connector_connection',scopeId:pending.rotationScopeId,payloadDigest:pending.rotationDigest,actor:`account:${account}`});
  try{const cipher=await seal(env,`connector:${account}:${pending.connectionId}`,{token:token.access_token,expiresAt});const changed=await env.AZRAIL_D1.prepare("UPDATE connector_connections SET secret_cipher=?,revision=revision+1,tools_json='[]',tools_digest='',verified_at=NULL,updated_at=? WHERE id=? AND account_id=? AND endpoint_key=? AND revision=? AND disabled=0 RETURNING revision").bind(cipher,now,pending.connectionId,account,p.id,pending.revision).first<{revision:number}>();if(!changed)throw new AccessError('Подключение изменилось во время OAuth re-authorization.',409);await env.AZRAIL_D1.prepare("UPDATE connector_calls SET status='cancelled',updated_at=? WHERE connection_id=? AND account_id=? AND status='prepared'").bind(now,pending.connectionId,account).run();await completeApproval(env,{id:claimed.id,actor:`connector:${account}`,outcome:'executed',detail:{connectionId:pending.connectionId,revision:changed.revision,mode:'oauth_reauthorize'}});}catch(error){await completeApproval(env,{id:claimed.id,actor:`connector:${account}`,outcome:'failed',detail:{connectionId:pending.connectionId,mode:'oauth_reauthorize'}}).catch(()=>{});throw error;}
 }else{
  const id=crypto.randomUUID(),cipher=await seal(env,`connector:${account}:${id}`,{token:token.access_token,expiresAt});const inserted=await env.AZRAIL_D1.prepare('INSERT INTO connector_connections(id,account_id,endpoint_key,label,secret_cipher,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM connector_connections WHERE account_id=? AND disabled=0)<30 RETURNING id').bind(id,account,p.id,p.name,cipher,now,now,account).first();if(!inserted)throw new AccessError('Лимит: 30 подключений на аккаунт. Отключите ненужный сервис и повторите вход.',429);
 }
 return new Response(null,{status:303,headers:{Location:'/settings/connections?connected=1','Set-Cookie':cookie('',0)}});
}
