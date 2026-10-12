import type {Env} from '../types';
import {AccessError} from '../lib/accounts';
import {validateTrustedHttpsUrl} from './trusted-endpoint';
export interface ConnectorPolicy {id:string;name:string;url:string;auth:'none'|'bearer'|'oauth';readTools:string[];blockedTools:string[];dailyCalls:number;oauth?:{clientId:string;authorizationUrl:string;tokenUrl:string;scopes:string[];};}
const name=/^[A-Za-z0-9_.-]{1,128}$/;
export function connectorPolicies(env:Env):ConnectorPolicy[] {
 let list:unknown;try{list=JSON.parse(env.MCP_SERVERS??'[]');}catch{throw new AccessError('MCP_SERVERS содержит неверный JSON.',503);}
 if(!Array.isArray(list)||list.length>100)throw new AccessError('Некорректный каталог подключений.',503);
 const ids=new Set<string>();
 return list.map((item:unknown)=>{
  const p=item as ConnectorPolicy;let u:URL;try{u=validateTrustedHttpsUrl(p.url,'MCP endpoint');}catch{throw new AccessError('Некорректный адрес MCP.',503);}
  // Only operator-configured, exact HTTPS endpoints are reachable. Clients never
  // supply a URL to fetch. Private/IP hosts and redirects are forbidden.
  if(!p||!name.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||p.name.length>80)throw new AccessError('Недопустимая политика MCP-сервера.',503);
  if(!['none','bearer','oauth'].includes(p.auth))throw new AccessError('Неподдерживаемая авторизация MCP.',503);
  if(p.auth==='oauth'){
   if(!p.oauth||typeof p.oauth.clientId!=='string'||!p.oauth.clientId||p.oauth.clientId.length>256||!Array.isArray(p.oauth.scopes)||p.oauth.scopes.some(s=>typeof s!=='string'||s.length>200))throw new AccessError('OAuth сервиса не настроен.',503);
   for(const address of [p.oauth.authorizationUrl,p.oauth.tokenUrl])try{validateTrustedHttpsUrl(address,'OAuth endpoint');}catch{throw new AccessError('Недопустимый OAuth endpoint.',503);}
  }
  for(const a of [p.readTools??[],p.blockedTools??[]])if(!Array.isArray(a)||a.length>200||a.some(x=>typeof x!=='string'||!name.test(x)))throw new AccessError('Некорректная политика инструментов.',503);
  const dailyCalls=p.dailyCalls??50;if(!Number.isSafeInteger(dailyCalls)||dailyCalls<0||dailyCalls>1000)throw new AccessError('Некорректный лимит подключений.',503);
  ids.add(p.id);return {...p,url:u.toString(),readTools:p.readTools??[],blockedTools:p.blockedTools??[],dailyCalls};
 });
}
export function findPolicy(env:Env,id:string) {const p=connectorPolicies(env).find(p=>p.id===id);if(!p)throw new AccessError('Подключение отключено оператором.',403);return p;}
export function toolRisk(policy:ConnectorPolicy,name:string):'read'|'approval'|'blocked' {return policy.blockedTools.includes(name)?'blocked':policy.readTools.includes(name)?'read':'approval';}
