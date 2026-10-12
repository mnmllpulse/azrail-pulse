import type {Env} from '../types';
import {AccessError,authenticate,hashToken,activeAccount} from '../lib/accounts';
import {readJsonRecord} from './request-json';
import {connectorPolicies,findPolicy,toolRisk,type ConnectorPolicy} from './connector-policy';
import {seal,unseal,canonical} from './connector-vault';
import {MCPClient,type MCPTool} from './mcp-client';
import {ensureBudget,reserve,settle,BudgetError} from './ledger';
import {boundedStructure,validateArguments} from './connector-schema';
import {startConnectorOAuth,finishConnectorOAuth} from './connector-oauth';
import {approvalDigest,cancelApprovalByScope,claimApproval,completeApproval,decideApproval,findApprovalByScope,requestApproval} from '../lib/approval-engine';
import {emitEvent} from '../lib/event-stream';
import {log} from '../lib/resilience';
import {childTrace,linkTrace,loadTraceLink,requestTrace,traceLog,type TraceContext} from '../lib/observability-context';

interface Connection {id:string;account_id:string;endpoint_key:string;label:string;secret_cipher:string;revision:number;tools_json:string;tools_digest:string;verified_at:number|null;disabled:number;created_at:number;updated_at:number;}
interface Call {id:string;account_id:string;connection_id:string;connection_revision:number;request_key:string;tool_name:string;arguments_cipher:string;arguments_digest:string;tools_digest:string;policy_digest:string;approval_needed:number;approved_at:number|null;status:string;result_cipher:string|null;error_code:string|null;expires_at:number;created_at:number;updated_at:number;}
interface HealthCheck {id:string;account_id:string;connection_id:string;status:'healthy'|'degraded'|'rate_limited'|'auth_expired'|'unavailable'|'warning';error_code:string|null;latency_ms:number;tool_count:number;checked_at:number;}
interface CallStats {connection_id:string;last_call_at:number|null;error_count:number;call_count:number;}
const ID=/^[a-zA-Z0-9_-]{12,128}$/;
const secretBinding=(c:Pick<Connection,'account_id'|'id'>)=>`connector:${c.account_id}:${c.id}`;
const callBinding=(c:Pick<Call,'account_id'|'id'>)=>`call:${c.account_id}:${c.id}`;
async function connectorEvent(env:Env,c:Pick<Call,'id'|'account_id'|'connection_id'|'tool_name'|'status'>,type:string,payload?:unknown){
 const trace=await loadTraceLink(env,'connector_call',c.id).catch(()=>null);
 try{await emitEvent(env,{domain:'connector',type,accountId:c.account_id,trace:trace?childTrace(trace,{connectorCallId:c.id}):undefined,subjectType:'connector_call',subjectId:c.id,actor:`connector:${c.account_id}`,payload:{connectionId:c.connection_id,tool:c.tool_name,status:c.status,...(payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:{detail:payload??null})}});}
 catch(error){log('warn','connector.event_stream_failed',{callId:c.id,type,...traceLog(trace??undefined),error:error instanceof Error?error.message:String(error)});}
}

async function connection(env:Env,account:string,id:string) {const c=await env.AZRAIL_D1.prepare('SELECT * FROM connector_connections WHERE id=? AND account_id=? AND disabled=0').bind(id,account).first<Connection>();if(!c)throw new AccessError('Подключение недоступно.',404);return c;}
async function callRecord(env:Env,account:string,id:string){const c=await env.AZRAIL_D1.prepare('SELECT * FROM connector_calls WHERE id=? AND account_id=?').bind(id,account).first<Call>();if(!c)throw new AccessError('Операция недоступна.',404);return c;}
function connectionStatus(c:Connection,health?:HealthCheck){if(health)return health.status;return c.verified_at&&c.verified_at>Date.now()-86400000?'healthy':c.verified_at?'warning':'unknown';}
function publicConnection(c:Connection,p:ConnectorPolicy,stats?:CallStats,health?:HealthCheck) {return {id:c.id,endpointKey:c.endpoint_key,label:c.label,revision:c.revision,endpoint:p.url,auth:p.auth,scopes:p.oauth?.scopes??[],dailyCalls:p.dailyCalls,status:connectionStatus(c,health),verifiedAt:c.verified_at,lastCheckedAt:health?.checked_at??c.verified_at,lastCheckLatencyMs:health?.latency_ms??null,lastCheckError:health?.error_code??null,toolCount:(JSON.parse(c.tools_json) as unknown[]).length,lastCallAt:stats?.last_call_at??null,errorCount:Number(stats?.error_count??0),callCount:Number(stats?.call_count??0),createdAt:c.created_at,updatedAt:c.updated_at,credentialRotation:p.auth!=='none'};}
async function publicCall(env:Env,c:Call,details=false) {const label=details?await env.AZRAIL_D1.prepare('SELECT label FROM connector_connections WHERE id=? AND account_id=?').bind(c.connection_id,c.account_id).first<{label:string}>():null;const approval=c.approval_needed?await findApprovalByScope(env,'connector_mutation','connector_call',c.id):null;return {id:c.id,...(label?{connectionLabel:label.label}:{}),connectionId:c.connection_id,tool:c.tool_name,status:c.status,approvalRequired:!!c.approval_needed&&!c.approved_at,approvalId:approval?.id??null,approvalStatus:approval?.status??null,expiresAt:c.expires_at,createdAt:c.created_at,updatedAt:c.updated_at,error:c.error_code,...(details?{arguments:await unseal(env,callBinding(c)+':args',c.arguments_cipher),result:c.result_cipher?await unseal(env,callBinding(c)+':result',c.result_cipher):null}:{})};}
async function ensureConnectorApproval(env:Env,account:string,c:Call,create=true){
 if(!c.approval_needed)return null;
 const existing=await findApprovalByScope(env,'connector_mutation','connector_call',c.id);
 if(existing)return existing;
 if(!create)return null;
 const trace=await loadTraceLink(env,'connector_call',c.id).catch(()=>null);
 return requestApproval(env,{accountId:account,actionType:'connector_mutation',risk:'high',scopeType:'connector_call',scopeId:c.id,payloadDigest:c.arguments_digest,summary:`Connector ${c.connection_id}: ${c.tool_name}`,requestedBy:`account:${account}`,externalRef:c.id,expiresAt:c.expires_at,trace:trace??undefined});
}
async function client(env:Env,c:Connection,p:ConnectorPolicy,signal?:AbortSignal){const s=await unseal<{token:string;expiresAt?:number}>(env,secretBinding(c),c.secret_cipher);if(s.expiresAt&&s.expiresAt<=Date.now())throw new AccessError('Токен сервиса истёк. Подключите сервис заново.',401);return new MCPClient(p.url,s.token,signal);}
async function allowance(env:Env,account:string,p:ConnectorPolicy,id:string){const scope=`connector:${account}:${p.id}:${new Date().toISOString().slice(0,10)}`;await ensureBudget(env,scope,'request',p.dailyCalls);await env.AZRAIL_D1.prepare('UPDATE resource_budgets SET limit_units=? WHERE scope=? AND unit=?').bind(p.dailyCalls,scope,'request').run();await reserve(env,{id,scope,unit:'request',resource:`mcp:${p.id}`,upperBound:1,fingerprint:id});}

async function recordHealthCheck(env:Env,account:string,connectionId:string,status:HealthCheck['status'],latencyMs:number,toolCount:number,errorCode:string|null){
 try{await env.AZRAIL_D1.prepare('INSERT INTO connector_health_checks(id,account_id,connection_id,status,error_code,latency_ms,tool_count,checked_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),account,connectionId,status,errorCode,Math.max(0,Math.round(latencyMs)),Math.max(0,toolCount),Date.now()).run();}
 catch(error){log('warn','connector.health_check_persist_failed',{connectionId,error:error instanceof Error?error.message:String(error)});}
}
function healthStatus(error:unknown):HealthCheck['status']{if(error instanceof BudgetError)return 'rate_limited';if(error instanceof AccessError){if(error.status===401)return 'auth_expired';if(error.status===429)return 'rate_limited';if(error.status>=500)return 'unavailable';return 'degraded';}return 'unavailable';}
function healthErrorCode(error:unknown){if(error instanceof BudgetError)return 'budget_exceeded';if(error instanceof AccessError){if(error.status===401)return 'credential_invalid_or_expired';if(error.status===409)return 'connection_changed';if(error.status===429)return 'rate_limited';return `access_${error.status}`;}return 'protocol_or_network_error';}
async function connectionCollections(env:Env,account:string){
 const [rows,statsRows,healthRows]=await Promise.all([
  env.AZRAIL_D1.prepare('SELECT * FROM connector_connections WHERE account_id=? AND disabled=0 ORDER BY updated_at DESC LIMIT 100').bind(account).all<Connection>(),
  env.AZRAIL_D1.prepare(`SELECT connection_id,MAX(created_at) AS last_call_at,COUNT(*) AS call_count,SUM(CASE WHEN status IN ('failed','uncertain') THEN 1 ELSE 0 END) AS error_count FROM connector_calls WHERE account_id=? GROUP BY connection_id`).bind(account).all<CallStats>(),
  env.AZRAIL_D1.prepare(`SELECT h.* FROM connector_health_checks h JOIN (SELECT connection_id,MAX(checked_at) checked_at FROM connector_health_checks WHERE account_id=? GROUP BY connection_id) x ON x.connection_id=h.connection_id AND x.checked_at=h.checked_at WHERE h.account_id=?`).bind(account,account).all<HealthCheck>().catch(()=>({results:[]} as any)),
 ]);
 const stats=new Map((statsRows.results??[]).map(r=>[r.connection_id,r]));const health=new Map<string,HealthCheck>(((healthRows as {results?:HealthCheck[]}).results??[]).map((r:HealthCheck)=>[r.connection_id,r] as const));
 return (rows.results??[]).map(c=>{const p=findPolicy(env,c.endpoint_key);return publicConnection(c,p,stats.get(c.id),health.get(c.id));});
}
async function connectionDetail(env:Env,account:string,id:string){
 const c=await connection(env,account,id),p=findPolicy(env,c.endpoint_key),tools=(JSON.parse(c.tools_json) as MCPTool[]).map(t=>({name:t.name,description:t.description??'',risk:toolRisk(p,t.name),inputSchema:t.inputSchema}));
 const [calls,checks,stats]=await Promise.all([
  env.AZRAIL_D1.prepare('SELECT * FROM connector_calls WHERE account_id=? AND connection_id=? ORDER BY created_at DESC LIMIT 50').bind(account,id).all<Call>(),
  env.AZRAIL_D1.prepare('SELECT * FROM connector_health_checks WHERE account_id=? AND connection_id=? ORDER BY checked_at DESC LIMIT 20').bind(account,id).all<HealthCheck>().catch(()=>({results:[]} as any)),
  env.AZRAIL_D1.prepare(`SELECT connection_id,MAX(created_at) AS last_call_at,COUNT(*) AS call_count,SUM(CASE WHEN status IN ('failed','uncertain') THEN 1 ELSE 0 END) AS error_count FROM connector_calls WHERE account_id=? AND connection_id=? GROUP BY connection_id`).bind(account,id).first<CallStats>(),
 ]);
 const health=((checks as any).results??[])[0] as HealthCheck|undefined;
 return {connection:publicConnection(c,p,stats??undefined,health),policy:{endpoint:p.url,auth:p.auth,scopes:p.oauth?.scopes??[],readTools:p.readTools,blockedTools:p.blockedTools,dailyCalls:p.dailyCalls},tools,calls:await Promise.all((calls.results??[]).map(r=>publicCall(env,r))),checks:(checks as any).results??[]};
}
async function rotateBearerCredential(env:Env,account:string,id:string,token:unknown,approvalId:unknown){
 const c=await connection(env,account,id),p=findPolicy(env,c.endpoint_key);if(p.auth!=='bearer')throw new AccessError(p.auth==='oauth'?'OAuth credentials rotate through provider re-authorization.':'This connection has no credential to rotate.',400);
 if(typeof token!=='string'||!token||token.length>8192||/[\r\n]/.test(token))throw new AccessError('Нужен новый токен без переводов строк.',400);
 const digest=await approvalDigest({connectionId:id,endpointKey:c.endpoint_key,revision:c.revision,tokenDigest:await hashToken(token)});const scopeId=`${id}:${c.revision}`;
 if(typeof approvalId!=='string'||!approvalId){const approval=await requestApproval(env,{accountId:account,actionType:'secret_rotation',risk:'high',scopeType:'connector_connection',scopeId,payloadDigest:digest,summary:`Rotate credentials for ${c.label}`,requestedBy:`account:${account}`,externalRef:id});return {approvalRequired:true,approval};}
 const claimed=await claimApproval(env,{id:approvalId,actionType:'secret_rotation',scopeType:'connector_connection',scopeId,payloadDigest:digest,actor:`account:${account}`});
 try{
  const cipher=await seal(env,secretBinding(c),{token}),now=Date.now();const changed=await env.AZRAIL_D1.prepare("UPDATE connector_connections SET secret_cipher=?,revision=revision+1,tools_json='[]',tools_digest='',verified_at=NULL,updated_at=? WHERE id=? AND account_id=? AND revision=? AND disabled=0 RETURNING revision").bind(cipher,now,id,account,c.revision).first<{revision:number}>();if(!changed)throw new AccessError('Подключение изменилось во время ротации.',409);
  await env.AZRAIL_D1.prepare("UPDATE connector_calls SET status='cancelled',updated_at=? WHERE connection_id=? AND account_id=? AND status='prepared'").bind(now,id,account).run();await completeApproval(env,{id:claimed.id,actor:`connector:${account}`,outcome:'executed',detail:{connectionId:id,revision:changed.revision}});
  try{await emitEvent(env,{domain:'connector',type:'connector.credential_rotated',accountId:account,subjectType:'connector_connection',subjectId:id,actor:`account:${account}`,payload:{endpointKey:c.endpoint_key,revision:changed.revision}});}catch{}
  return {rotated:true,revision:changed.revision,requiresVerification:true};
 }catch(error){await completeApproval(env,{id:claimed.id,actor:`connector:${account}`,outcome:'failed',detail:{connectionId:id}}).catch(()=>{});throw error;}
}
async function discoverConnection(env:Env,account:string,id:string,signal?:AbortSignal) {
 const started=Date.now(),c=await connection(env,account,id),p=findPolicy(env,c.endpoint_key),reservation=crypto.randomUUID();let rpc:MCPClient|undefined,reserved=false;
 try{
  rpc=await client(env,c,p,signal);await allowance(env,account,p,reservation);reserved=true;await rpc.initialize();const tools=await rpc.listTools(),digest=await hashToken(canonical(tools)),verifiedAt=Date.now();const row=await env.AZRAIL_D1.prepare('UPDATE connector_connections SET tools_json=?,tools_digest=?,verified_at=?,updated_at=? WHERE id=? AND account_id=? AND revision=? AND disabled=0 RETURNING id').bind(JSON.stringify(tools),digest,verifiedAt,verifiedAt,id,account,c.revision).first();if(!row)throw new AccessError('Подключение изменено во время проверки.',409);await settle(env,reservation,1,'MCP discovery completed');await recordHealthCheck(env,account,id,'healthy',Date.now()-started,tools.length,null);return {tools:tools.map(t=>({...t,risk:toolRisk(p,t.name)})),verifiedAt};
 }catch(e){if(reserved)await settle(env,reservation,1,'MCP discovery failed; request budget retained').catch(()=>{});await recordHealthCheck(env,account,id,healthStatus(e),Date.now()-started,(JSON.parse(c.tools_json) as unknown[]).length,healthErrorCode(e));if(e instanceof AccessError||e instanceof BudgetError)throw e;throw new AccessError('Проверка MCP не завершена. Проверьте адрес, токен и совместимость протокола.',502);}
 finally{await rpc?.close();}
}
export async function searchConnectorTools(env:Env,account:string,query:string,limit=5) {
 const rows=await env.AZRAIL_D1.prepare('SELECT * FROM connector_connections WHERE account_id=? AND disabled=0 AND verified_at>? ORDER BY updated_at DESC LIMIT 100').bind(account,Date.now()-86400000).all<Connection>();
 const words=query.toLocaleLowerCase().split(/[^\p{L}\p{N}_]+/u).filter(Boolean).slice(0,20);const results=[];
 for(const c of rows.results){let p:ConnectorPolicy;try{p=findPolicy(env,c.endpoint_key);}catch{continue;}for(const t of JSON.parse(c.tools_json) as MCPTool[]){const risk=toolRisk(p,t.name);if(risk==='blocked')continue;const hay=(t.name+' '+t.description+' '+c.label).toLocaleLowerCase();const score=words.reduce((n,w)=>n+(hay.includes(w)?1:0),0);if(words.length&&!score)continue;results.push({connectionId:c.id,connection:c.label,name:t.name,description:t.description,inputSchema:t.inputSchema,risk,score});}}
 return results.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,Math.max(1,Math.min(5,limit)));
}
/** All arguments are immutable after preparation. Approval binds to exactly this
 * connection revision, tool catalog, policy and arguments digest. */
export async function prepareConnectorCall(env:Env,account:string,input:{connectionId:string;tool:string;arguments:Record<string,unknown>;idempotencyKey:string},trace?:TraceContext) {
 if(!ID.test(input.idempotencyKey)||typeof input.tool!=='string'||!input.arguments||typeof input.arguments!=='object'||Array.isArray(input.arguments)||JSON.stringify(input.arguments).length>16000)throw new AccessError('Некорректные параметры операции.',400);
 boundedStructure(input.arguments);
 const fingerprint=await hashToken(canonical({connectionId:input.connectionId,tool:input.tool,arguments:input.arguments}));
 const old=await env.AZRAIL_D1.prepare('SELECT * FROM connector_calls WHERE account_id=? AND request_key=?').bind(account,input.idempotencyKey).first<Call>();
 if(old){if(old.arguments_digest!==fingerprint)throw new AccessError('Ключ уже связан с другой операцией.',409);if(trace)await linkTrace(env,'connector_call',old.id,childTrace(trace,{connectorCallId:old.id}));return publicCall(env,old,true);}
 const c=await connection(env,account,input.connectionId),p=findPolicy(env,c.endpoint_key),risk=toolRisk(p,input.tool);
 if(risk==='blocked')throw new AccessError('Этот инструмент запрещён политикой.');
 if(!c.verified_at||c.verified_at<Date.now()-86400000||!(JSON.parse(c.tools_json) as MCPTool[]).some(t=>t.name===input.tool))throw new AccessError('Сначала обновите каталог инструментов.',409);
 const definition=(JSON.parse(c.tools_json) as MCPTool[]).find(t=>t.name===input.tool)!;validateArguments(definition.inputSchema,input.arguments);
 const pending=await env.AZRAIL_D1.prepare("SELECT COUNT(*) AS n FROM connector_calls WHERE account_id=? AND status='prepared' AND expires_at>?").bind(account,Date.now()).first<{n:number}>();if((pending?.n??0)>=50)throw new AccessError('Слишком много неподтверждённых операций.',429);
 const id=crypto.randomUUID(),now=Date.now(),binding=callBinding({id,account_id:account});
 await env.AZRAIL_D1.prepare(`INSERT INTO connector_calls(id,account_id,connection_id,connection_revision,request_key,tool_name,arguments_cipher,arguments_digest,tools_digest,policy_digest,approval_needed,status,expires_at,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,'prepared',?,?,?) ON CONFLICT(account_id,request_key) DO NOTHING`).bind(id,account,c.id,c.revision,input.idempotencyKey,input.tool,await seal(env,binding+':args',input.arguments),fingerprint,c.tools_digest,await hashToken(canonical(p)),risk==='read'?0:1,now+600000,now,now).run();
 const row=await env.AZRAIL_D1.prepare('SELECT * FROM connector_calls WHERE account_id=? AND request_key=?').bind(account,input.idempotencyKey).first<Call>();if(!row||row.arguments_digest!==fingerprint)throw new AccessError('Конфликт ключа операции.',409);
 if(trace)await linkTrace(env,'connector_call',row.id,childTrace(trace,{connectorCallId:row.id}));
 if(row.approval_needed)await ensureConnectorApproval(env,account,row,true);
 await connectorEvent(env,row,'connector.call.prepared',{approvalRequired:!!row.approval_needed});
 return publicCall(env,row,true);
}
export async function executeConnectorCall(env:Env,account:string,id:string,confirmed=false,signal?:AbortSignal) {
 let row=await callRecord(env,account,id);
 if(row.status==='succeeded'||row.status==='failed'){
  if(row.result_cipher)await settle(env,id,1,'Stored MCP response reconciled');
  return publicCall(env,row,true);
 }
 if(row.status!=='prepared')throw new AccessError('Операция уже выполняется, отменена или требует сверки. Повтор заблокирован.',409);
 if(row.expires_at<Date.now())throw new AccessError('Срок подтверждения истёк. Подготовьте новую операцию.',409);
 const unifiedApproval=row.approval_needed?await ensureConnectorApproval(env,account,row,true):null;
 if(row.approval_needed&&!confirmed)throw new AccessError('Нужно подтвердить точные параметры операции.',409);
 let claimedApprovalId:string|null=null;
 if(unifiedApproval){
  if(unifiedApproval.status==='pending')await decideApproval(env,{id:unifiedApproval.id,actor:`account:${account}`,decision:'approved',expectedDigest:row.arguments_digest,reason:'exact connector parameters confirmed'});
  await claimApproval(env,{id:unifiedApproval.id,actionType:'connector_mutation',scopeType:'connector_call',scopeId:row.id,payloadDigest:row.arguments_digest,actor:`connector:${account}`});
  claimedApprovalId=unifiedApproval.id;
 }
 const c=await connection(env,account,row.connection_id),p=findPolicy(env,c.endpoint_key);
 if(c.revision!==row.connection_revision||c.tools_digest!==row.tools_digest||await hashToken(canonical(p))!==row.policy_digest)throw new AccessError('Подключение или политика изменены. Подготовьте операцию заново.',409);
 const args=await unseal<Record<string,unknown>>(env,callBinding(row)+':args',row.arguments_cipher),rpc=await client(env,c,p,signal);
 // CAS admits only one executor. A worker crash after this point blocks retries.
 const claimed=await env.AZRAIL_D1.prepare("UPDATE connector_calls SET status='running',approved_at=?,updated_at=? WHERE id=? AND account_id=? AND status='prepared' AND expires_at>? RETURNING id").bind(confirmed?Date.now():null,Date.now(),id,account,Date.now()).first();
 if(!claimed)throw new AccessError('Операция уже принята.',409);
 row=await callRecord(env,account,id);await connectorEvent(env,row,'connector.call.executing');
 let dispatched=false,reserved=false,responseStored=false;
 try{
  await allowance(env,account,p,id);reserved=true;
  await rpc.initialize();const tools=await rpc.listTools();if(await hashToken(canonical(tools))!==row.tools_digest)throw new AccessError('Описание инструментов изменилось. Обновите подключение и подтвердите заново.',409);
  const still=await connection(env,account,c.id);if(still.revision!==c.revision)throw new AccessError('Подключение было изменено.',409);
  dispatched=true;const result=await rpc.call(row.tool_name,args,tools.find(t=>t.name===row.tool_name)?.outputSchema);const cipher=await seal(env,callBinding(row)+':result',result);
  await env.AZRAIL_D1.prepare("UPDATE connector_calls SET status=?,result_cipher=?,updated_at=? WHERE id=? AND account_id=? AND status='running'").bind(result?.isError?'failed':'succeeded',cipher,Date.now(),id,account).run();
  responseStored=true;
  await settle(env,id,1,'MCP response received');
  if(claimedApprovalId)await completeApproval(env,{id:claimedApprovalId,actor:`connector:${account}`,outcome:'executed',detail:{connectorStatus:result?.isError?'failed':'succeeded'}});
  row=await callRecord(env,account,id);await connectorEvent(env,row,result?.isError?'connector.call.failed':'connector.call.succeeded');return publicCall(env,row,true);
 }catch(e){
  // The response is already durable. A ledger outage must not hide it or cause
  // a second provider call. Its full request reservation remains held.
  if(responseStored){if(claimedApprovalId){const a=await findApprovalByScope(env,'connector_mutation','connector_call',id);if(a?.status==='executing')await completeApproval(env,{id:claimedApprovalId,actor:`connector:${account}`,outcome:'executed',detail:{ledgerPending:true}});}return {...await publicCall(env,await callRecord(env,account,id),true),ledgerPending:true};}
  const status=dispatched?'uncertain':'failed';await env.AZRAIL_D1.prepare("UPDATE connector_calls SET status=?,error_code=?,updated_at=? WHERE id=? AND account_id=? AND status='running'").bind(status,dispatched?'remote_outcome_unknown':'preflight_failed',Date.now(),id,account).run();
  row=await callRecord(env,account,id);await connectorEvent(env,row,dispatched?'connector.call.uncertain':'connector.call.failed');
  if(claimedApprovalId)await completeApproval(env,{id:claimedApprovalId,actor:`connector:${account}`,outcome:dispatched?'uncertain':'failed',detail:{connectorStatus:status}});
  if(reserved)await settle(env,id,dispatched?null:1,dispatched?'Remote outcome unknown; never auto-retry':'Preflight failed');
  if(dispatched)throw new AccessError('Ответ внешнего сервиса потерян. Операция могла выполниться; повтор заблокирован. Проверьте результат в самом сервисе.',409);
  if(e instanceof AccessError||e instanceof BudgetError)throw e;throw new AccessError('Операция не отправлена инструменту: проверка подключения или лимита не пройдена.',502);
 }finally{await rpc.close();}
}

export async function reconcileConnectorCall(env:Env,account:string,id:string,outcome:unknown,evidence:unknown) {
 const normalized=String(outcome??'');
 const note=typeof evidence==='string'?evidence.trim().slice(0,2000):'';
 if(!['succeeded','failed','not_executed'].includes(normalized))throw new AccessError('Укажите исход: succeeded, failed или not_executed.',400);
 if(note.length<3)throw new AccessError('Для ручной сверки нужно краткое подтверждение результата.',400);
 const prior=await env.AZRAIL_D1.prepare('SELECT outcome,evidence FROM connector_reconciliations WHERE call_id=? AND account_id=?').bind(id,account).first<{outcome:string;evidence:string}>();
 if(prior){
  if(prior.outcome!==normalized)throw new AccessError('Эта операция уже сверена с другим исходом.',409);
  const actual=normalized==='not_executed'?0:1;
  let ledgerPending=false;try{await settle(env,id,actual,`Manual reconciliation: ${prior.evidence}`);}catch{ledgerPending=true;}
  const current=await callRecord(env,account,id);return {id:current.id,status:current.status,reconciled:true,ledgerPending};
 }
 const row=await callRecord(env,account,id);
 if(row.status!=='uncertain')throw new AccessError(`Ручная сверка разрешена только для uncertain, сейчас: ${row.status}.`,409);
 const target=normalized==='not_executed'?'cancelled':normalized;
 const now=Date.now();
 const result=await env.AZRAIL_D1.batch([
  env.AZRAIL_D1.prepare(`INSERT INTO connector_reconciliations(call_id,account_id,outcome,evidence,decided_at)
   SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM connector_calls WHERE id=? AND account_id=? AND status='uncertain')
   ON CONFLICT(call_id) DO NOTHING RETURNING call_id`).bind(id,account,normalized,note,now,id,account),
  env.AZRAIL_D1.prepare(`UPDATE connector_calls SET status=?,error_code=?,updated_at=? WHERE id=? AND account_id=? AND status='uncertain'
   AND EXISTS(SELECT 1 FROM connector_reconciliations WHERE call_id=? AND account_id=? AND outcome=?) RETURNING id`).bind(target,`manual_${normalized}`,now,id,account,id,account,normalized),
 ]);
 if(!result[0].results?.length||!result[1].results?.length)throw new AccessError('Состояние операции изменилось во время сверки; повтор заблокирован.',409);
 const actual=normalized==='not_executed'?0:1;
 let ledgerPending=false;try{await settle(env,id,actual,`Manual reconciliation: ${note}`);}catch{ledgerPending=true;}
 const current=await callRecord(env,account,id);await connectorEvent(env,current,'connector.call.reconciled',{outcome:normalized});return {id:current.id,status:current.status,reconciled:true,ledgerPending};
}

export async function connectorRoute(request:Request,env:Env):Promise<Response|null> {
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/connectors'))return null;
 const auth=await authenticate(request,env);if(!auth.ok)return Response.json({error:auth.error},{status:401});const principal=auth.principal!,account=principal.id,trace=requestTrace(request);
 if(principal.role==='viewer'&&request.method!=='GET')throw new AccessError('Роль разрешает только чтение.');
 const parts=url.pathname.split('/').filter(Boolean).slice(2),head=parts[0];
 if(head==='oauth'&&parts[1]==='callback'&&request.method==='GET')return finishConnectorOAuth(request,env,account);
 if(request.method==='GET'){
  if(!head)return Response.json({catalog:connectorPolicies(env).map(p=>({id:p.id,name:p.name,auth:p.auth,dailyCalls:p.dailyCalls,endpoint:p.url,scopes:p.oauth?.scopes??[]})),connections:await connectionCollections(env,account),vaultConfigured:!!env.INTEGRATION_KEY});
  if(head==='tools')return Response.json({tools:await searchConnectorTools(env,account,(url.searchParams.get('q')??'').slice(0,500))});
  if(head==='calls'){if(parts[1])return Response.json(await publicCall(env,await callRecord(env,account,parts[1]),true));const rows=await env.AZRAIL_D1.prepare('SELECT * FROM connector_calls WHERE account_id=? ORDER BY created_at DESC LIMIT 50').bind(account).all<Call>();return Response.json({calls:await Promise.all(rows.results.map(r=>publicCall(env,r)))});}
  if(head&&!parts[1])return Response.json(await connectionDetail(env,account,head));
 }
 if(!['POST','PUT','DELETE'].includes(request.method))throw new AccessError('Метод недоступен.',405);
 const body=request.method==='DELETE'?{}:await readJsonRecord(request,24000) as Record<string,any>;
 if(head==='oauth'&&parts[1]==='start'&&request.method==='POST')return startConnectorOAuth(request,env,account,String(body.endpointKey??''),typeof body.connectionId==='string'?body.connectionId:'',typeof body.approvalId==='string'?body.approvalId:'');
 if(!head&&request.method==='POST'){
  const p=findPolicy(env,String(body.endpointKey??'')),token=body.token??'';if(p.auth==='oauth')throw new AccessError('Подключите этот сервис через OAuth.',400);if(typeof token!=='string'||token.length>8192||/[\r\n]/.test(token)||(p.auth==='bearer'&&!token)||(p.auth==='none'&&token))throw new AccessError('Нужен токен выбранного сервиса без переводов строк.',400);
  const n=await env.AZRAIL_D1.prepare('SELECT COUNT(*) AS n FROM connector_connections WHERE account_id=? AND disabled=0').bind(account).first<{n:number}>();if((n?.n??0)>=30)throw new AccessError('Лимит: 30 подключений на аккаунт.',429);
  const id=crypto.randomUUID(),now=Date.now(),label=typeof body.label==='string'?body.label.trim().slice(0,80):p.name;
  const cipher=await seal(env,secretBinding({id,account_id:account}),{token});const inserted=await env.AZRAIL_D1.prepare('INSERT INTO connector_connections(id,account_id,endpoint_key,label,secret_cipher,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM connector_connections WHERE account_id=? AND disabled=0)<30 RETURNING id').bind(id,account,p.id,label||p.name,cipher,now,now,account).first();if(!inserted)throw new AccessError('Лимит: 30 подключений на аккаунт.',429);return Response.json({id},{status:201});
 }
 if(head==='prepare'&&request.method==='POST')return Response.json(await prepareConnectorCall(env,account,{connectionId:String(body.connectionId??''),tool:String(body.tool??''),arguments:body.arguments,idempotencyKey:request.headers.get('Idempotency-Key')??''},trace),{status:201});
 if(head==='calls'&&parts[1]){
  if(parts[2]==='execute'&&request.method==='POST')return Response.json(await executeConnectorCall(env,account,parts[1],body.confirm===true,request.signal));
  if(parts[2]==='reconcile'&&request.method==='POST')return Response.json(await reconcileConnectorCall(env,account,parts[1],body.outcome,body.evidence));
  if(parts[2]==='cancel'&&request.method==='POST'){await callRecord(env,account,parts[1]);const row=await env.AZRAIL_D1.prepare("UPDATE connector_calls SET status='cancelled',updated_at=? WHERE id=? AND account_id=? AND status='prepared' RETURNING id").bind(Date.now(),parts[1],account).first();if(!row)throw new AccessError('Можно отменить только ещё не отправленную операцию.',409);await cancelApprovalByScope(env,{actionType:'connector_mutation',scopeType:'connector_call',scopeId:parts[1],actor:`account:${account}`,reason:'connector call cancelled'});return Response.json({cancelled:true});}
 }
 if(head&&parts[1]==='discover'&&request.method==='POST')return Response.json(await discoverConnection(env,account,head,request.signal));
 if(head&&parts[1]==='rotate'&&request.method==='POST'){const result=await rotateBearerCredential(env,account,head,body.token,body.approvalId);if((result as any).approvalRequired)return Response.json({error:'Credential rotation requires approval.',approval:(result as any).approval},{status:409});return Response.json(result);}
 if(head&&request.method==='DELETE'){await connection(env,account,head);await env.AZRAIL_D1.batch([env.AZRAIL_D1.prepare("UPDATE connector_connections SET disabled=1,secret_cipher='',revision=revision+1,updated_at=? WHERE id=? AND account_id=?").bind(Date.now(),head,account),env.AZRAIL_D1.prepare("UPDATE connector_calls SET status='cancelled',updated_at=? WHERE connection_id=? AND account_id=? AND status='prepared'").bind(Date.now(),head,account)]);return Response.json({disconnected:true});}
 throw new AccessError('Маршрут не найден.',404);
}
/** Server-derived ownership: a model cannot choose an account or a secret. */
export async function projectConnectorOwner(env:Env,project:string) {const row=await env.AZRAIL_D1.prepare("SELECT account_id FROM resource_owners WHERE kind='project' AND resource_id=?").bind(project).first<{account_id:string}>();if(!row||!await activeAccount(env,row.account_id))throw new AccessError('Нет активного владельца проекта.');return row.account_id;}

export async function connectorResult(env:Env,account:string,id:string){return publicCall(env,await callRecord(env,account,id),true);}
