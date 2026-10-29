import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../types';
import { AccessError, hashToken, type Principal } from '../lib/accounts';
import { enforceOperationLimit } from '../lib/operation-limit';
import { validateTrustedHttpsUrl } from './trusted-endpoint';
import { readBoundedBody } from '../lib/request-body';

const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const cookieName = '__Host-pulse-session';
export function cookies(request: Request): Record<string,string> {
 return Object.fromEntries((request.headers.get('Cookie') ?? '').split(';').map(p => p.trim().split('=').slice(0,2)).filter(p=>p.length===2));
}
function cookie(name:string,value:string,seconds:number) {
 return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
function random() { return crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''); }
const validateOidcEndpoint=(value:string,label='OIDC endpoint')=>validateTrustedHttpsUrl(value,label,{allowSearch:true});
/**
 * Workers reject `redirect: "error"`. `manual` keeps the same boundary:
 * a 3xx is discarded here and never followed, so a token POST cannot be
 * replayed to another host with the code or client secret.
 */
async function fetchOidc(url:string,init:RequestInit={}):Promise<Response> {
 const response=await fetch(url,{...init,redirect:'manual'});
 if(response.status>=300&&response.status<400){
  await response.body?.cancel().catch(()=>{});
  throw new Error('OIDC endpoint отклонил перенаправление.');
 }
 return response;
}

/** Default admin group when OIDC_ADMIN_GROUPS is unset. An explicitly empty value disables admin entirely. */
export const DEFAULT_OIDC_ADMIN_GROUPS='pulse-admins';
export function oidcAdminGroups(env:Env):string[] {
 const raw=env.OIDC_ADMIN_GROUPS===undefined?DEFAULT_OIDC_ADMIN_GROUPS:env.OIDC_ADMIN_GROUPS;
 return [...new Set(String(raw).split(',').map(s=>s.trim()).filter(Boolean))];
}
export function oidcAdminEmails(env:Env):string[] {
 return [...new Set(String(env.OIDC_ADMIN_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(s=>s.includes('@')))];
}
/**
 * Role for a verified ID token. Fail closed: admin only when the configured
 * claim (OIDC_GROUPS_CLAIM, default "groups"; falls back to "roles" when that
 * claim is absent) is an array of strings containing a configured admin group.
 * Missing, empty or wrongly typed claims, or an empty group list, give editor.
 */
export function oidcRoleFromClaims(payload:Record<string,unknown>,env:Env):'admin'|'editor' {
 const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
 if(email&&oidcAdminEmails(env).includes(email))return 'admin';
 const groups=oidcAdminGroups(env);
 if(!groups.length)return 'editor';
 const claimName=(env.OIDC_GROUPS_CLAIM??'').trim()||'groups';
 const claim=Object.hasOwn(payload,claimName)?payload[claimName]:Object.hasOwn(payload,'roles')?payload.roles:undefined;
 if(!Array.isArray(claim)||!claim.length)return 'editor';
 const member=new Set(claim.filter((v):v is string=>typeof v==='string'));
 return groups.some(g=>member.has(g))?'admin':'editor';
}

export function trustedOrigin(request:Request,env:Env) {
 const origin=new URL(request.url).origin;
 return (env.PUBLIC_ORIGINS ?? '').split(',').map(s=>s.trim()).includes(origin);
}
async function responseObject(response:Response,limit:number,label:string):Promise<Record<string,string>> {
 const bytes=await readBoundedBody(response,limit);
 let value:unknown;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error(`${label}: некорректный JSON.`);}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label}: ожидался JSON-объект.`);
 return value as Record<string,string>;
}
async function metadata(env:Env) {
 if(!env.OIDC_ISSUER || !env.OIDC_CLIENT_ID) throw new Error('OIDC не настроен: нужны issuer и client ID.');
 const issuer=env.OIDC_ISSUER.replace(/\/$/,'');
 validateTrustedHttpsUrl(issuer,'OIDC issuer');
 const r=await fetchOidc(`${issuer}/.well-known/openid-configuration`,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
 if(!r.ok) throw new Error('OIDC discovery недоступен.');
 const d=await responseObject(r,256*1024,'OIDC discovery');
 if(d.issuer!==env.OIDC_ISSUER && d.issuer!==issuer) throw new Error('OIDC issuer mismatch.');
 for(const key of ['authorization_endpoint','token_endpoint','jwks_uri']) {
  if(typeof d[key]!=='string'||!d[key])throw new Error(`OIDC ${key}: отсутствует endpoint.`);
  validateOidcEndpoint(d[key],`OIDC ${key}`);
 }
 return d;
}
export async function sessionPrincipal(request:Request,env:Env):Promise<Principal|null> {
 const token=cookies(request)[cookieName];
 if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
 const row=await env.AZRAIL_D1.prepare(`SELECT a.id,a.name,a.role FROM web_sessions s JOIN access_accounts a ON a.id=s.account_id
 WHERE s.token_hash=? AND s.origin=? AND s.expires_at>? AND a.expires_at>? AND a.disabled=0`)
 .bind(await hashToken(token),new URL(request.url).origin,Date.now(),Date.now()).first<Principal>();
 if(!row)return null;
 // Preserve a server-side downgrade. A legacy admin role must not grant global
 // access through the public OIDC application. Admin survives only for OIDC
 // identities whose last verified login carried a configured admin group, and
 // only while an admin group is configured (emptying OIDC_ADMIN_GROUPS revokes at once).
 if(!['viewer','editor','admin'].includes(row.role))return null;
 const oidcAdmin=row.role==='admin'&&row.id.startsWith('oidc_')&&oidcAdminGroups(env).length>0;
 const role=row.role==='viewer'?'viewer':oidcAdmin?'admin':'editor';
 return {...row,role,operator:role!=='viewer'&&(env.OPERATOR_ACCOUNT_IDS??'').split(',').map(s=>s.trim()).includes(row.id)};
}
export async function authRoute(request:Request,env:Env):Promise<Response|null> {
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/auth/'))return null;
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!trustedOrigin(request,env))return reply({error:'Домен не разрешён в PUBLIC_ORIGINS.'},403);
 if(url.pathname==='/auth/status')return reply({configured:!!env.OIDC_ISSUER&&!!env.OIDC_CLIENT_ID,key:env.AUTH_MODE!=='oidc',account:await sessionPrincipal(request,env)});
 if(url.pathname==='/auth/logout' && request.method==='POST') {
  if(request.headers.get('Origin')!==url.origin)return reply({error:'Origin mismatch'},403);
  await env.AZRAIL_D1.prepare('DELETE FROM web_sessions WHERE token_hash=?').bind(await hashToken(cookies(request)[cookieName]??'')).run();
  return new Response(null,{status:204,headers:{'Set-Cookie':cookie(cookieName,'',0)}});
 }
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 try {
  if(url.pathname==='/auth/callback' && (!url.searchParams.get('code') || !url.searchParams.get('state') || url.searchParams.get('state')!==cookies(request)['__Host-pulse-state']))return reply({error:'Недействительный вход. Начните заново.'},400);
  if(url.pathname==='/auth/login') {
   const ip=(request.headers.get('CF-Connecting-IP')??'unknown').slice(0,64);
   try{await enforceOperationLimit(env,'login',ip);}catch(error){if(error instanceof AccessError)return reply({error:error.message},error.status);throw error;}
  }
  const d=await metadata(env), redirectURI=`${url.origin}/auth/callback`;
  if(url.pathname==='/auth/login') {
   const state=random(),verifier=random(),nonce=random();
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
   const challenge=btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   await env.AZRAIL_D1.prepare('DELETE FROM oidc_states WHERE expires_at<?').bind(Date.now()).run();
   await env.AZRAIL_D1.prepare('INSERT INTO oidc_states VALUES(?,?,?,?,?)').bind(await hashToken(state),verifier,nonce,url.origin,Date.now()+600000).run();
   const target=new URL(d.authorization_endpoint);
   target.search=new URLSearchParams({client_id:env.OIDC_CLIENT_ID!,redirect_uri:redirectURI,response_type:'code',scope:'openid profile email',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).toString();
   return new Response(null,{status:302,headers:{Location:target.href,'Set-Cookie':cookie('__Host-pulse-state',state,600),'Cache-Control':'no-store'}});
  }
  if(url.pathname==='/auth/callback') {
   const state=url.searchParams.get('state')??'',code=url.searchParams.get('code');
   if(!state || state!==cookies(request)['__Host-pulse-state'] || !code)return reply({error:'Недействительный вход. Начните заново.'},400);
   const pending=await env.AZRAIL_D1.prepare('DELETE FROM oidc_states WHERE state_hash=? AND origin=? AND expires_at>? RETURNING verifier,nonce')
   .bind(await hashToken(state),url.origin,Date.now()).first<{verifier:string;nonce:string}>();
   if(!pending)return reply({error:'Ссылка входа истекла или уже использована.'},400);
   const form=new URLSearchParams({grant_type:'authorization_code',client_id:env.OIDC_CLIENT_ID!,code,redirect_uri:redirectURI,code_verifier:pending.verifier});
   // client_secret_post; configure this method on the IdP. Public clients use PKCE only.
   if(env.OIDC_CLIENT_SECRET)form.set('client_secret',env.OIDC_CLIENT_SECRET);
   const tr=await fetchOidc(d.token_endpoint,{method:'POST',body:form,signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
   if(!tr.ok)return reply({error:'Провайдер отклонил вход.'},401);
   const tokens=await responseObject(tr,256*1024,'OIDC token response') as {id_token?:string};
   if(!tokens.id_token)return reply({error:'Провайдер не вернул ID token.'},401);
   if(!jwks.has(d.jwks_uri))jwks.set(d.jwks_uri,createRemoteJWKSet(new URL(d.jwks_uri),{timeoutDuration:8000}));
   const {payload}=await jwtVerify(tokens.id_token,jwks.get(d.jwks_uri)!,{issuer:d.issuer,audience:env.OIDC_CLIENT_ID,algorithms:['RS256','ES256'],requiredClaims:['exp','iat','sub','nonce'],maxTokenAge:'10m'});
   if(payload.nonce!==pending.nonce || typeof payload.sub!=='string' || (payload.azp!==undefined && payload.azp!==env.OIDC_CLIENT_ID) || (Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==env.OIDC_CLIENT_ID))return reply({error:'OIDC nonce mismatch.'},401);
   const id=`oidc_${(await hashToken(`${d.issuer}\n${payload.sub}`)).slice(0,48)}`;
   const emailName=typeof payload.email==='string'?payload.email.trim():'';
   const name=String(payload.name??payload.preferred_username??(emailName||'Пользователь')).slice(0,100);
   // Random unusable API key hash: OIDC identities never get a shared owner key.
   // Role is recomputed from the group claim on every login; a manual viewer downgrade is kept.
   const role=oidcRoleFromClaims(payload as Record<string,unknown>,env);
   await env.AZRAIL_D1.prepare(`INSERT INTO access_accounts(id,name,role,token_hash,expires_at) VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,expires_at=excluded.expires_at,role=CASE WHEN access_accounts.role='viewer' THEN 'viewer' ELSE excluded.role END`)
    .bind(id,name,role,await hashToken(random()),Date.now()+365*86400000).run();
   const account=await env.AZRAIL_D1.prepare('SELECT disabled FROM access_accounts WHERE id=?').bind(id).first<{disabled:number}>();
   if(account?.disabled)return reply({error:'Аккаунт отключён.'},403);
   const session=random(),sessionHash=await hashToken(session),expires=Date.now()+12*3600000;
   await env.AZRAIL_D1.batch([
    env.AZRAIL_D1.prepare('INSERT INTO web_sessions VALUES(?,?,?,?)').bind(sessionHash,id,url.origin,expires),
    env.AZRAIL_D1.prepare(`DELETE FROM web_sessions WHERE account_id=? AND token_hash IN (
      SELECT token_hash FROM web_sessions WHERE account_id=? ORDER BY expires_at DESC LIMIT -1 OFFSET 10
    )`).bind(id,id),
   ]);
   const headers=new Headers({Location:'/', 'Cache-Control':'no-store'});
   headers.append('Set-Cookie',cookie(cookieName,session,43200));headers.append('Set-Cookie',cookie('__Host-pulse-state','',0));
   return new Response(null,{status:302,headers});
  }
  return reply({error:'Not found'},404);
 } catch (error) {
  const text=error instanceof Error?error.message:'';
  if(text.startsWith('OIDC'))return reply({error:text},503);
  return reply({error:'Вход не завершён. Проверьте OIDC issuer, client и разрешённые callback URL.'},503);
 }
}
