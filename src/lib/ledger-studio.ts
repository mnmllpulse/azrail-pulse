import type {Env} from '../types';
import type {Principal} from './accounts';
import {findModel} from './model-registry';

export const LEDGER_SCAN_LIMIT=3_000;
export const LEDGER_RESULT_LIMIT=500;
const STATUS_SET=new Set(['running','completed','cancelled','failed','uncertain','unpriced']);
const DATE_PRESETS=new Set(['24h','7d','30d','all']);

export interface LedgerFilters {
 projectId:string;
 missionId:string;
 model:string;
 provider:string;
 agent:string;
 status:string;
 date:string;
 from:number|null;
 to:number|null;
 limit:number;
}

export interface LedgerCallRow {
 id:string;
 projectId:string|null;
 projectName:string|null;
 missionId:string|null;
 missionTitle:string|null;
 model:string;
 provider:string;
 providerSource:'recorded'|'registry-inferred'|'slug-inferred'|'unknown';
 agent:string|null;
 status:string;
 startedAt:number;
 finishedAt:number|null;
 latencyMs:number|null;
 promptTokens:number;
 completionTokens:number;
 tokens:number;
 routeAttempt:number;
 retryAttempt:number;
 reservedMicroUsd:number;
 actualMicroUsd:number|null;
 error:string|null;
 traceId:string|null;
}

export interface LedgerAnomaly {severity:'info'|'warning'|'critical';code:string;message:string;value?:number;}

function clean(value:string|null,max=160){return String(value??'').trim().slice(0,max);}
function boundedEpoch(value:string|null):number|null{
 if(!value)return null;
 const direct=Number(value);if(Number.isFinite(direct)&&direct>0)return Math.trunc(direct);
 const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null;
}
export function parseLedgerFilters(url:URL,now=Date.now()):LedgerFilters{
 const date=DATE_PRESETS.has(clean(url.searchParams.get('date'),8))?clean(url.searchParams.get('date'),8):'7d';
 let from=boundedEpoch(url.searchParams.get('from')),to=boundedEpoch(url.searchParams.get('to'));
 if(from===null){const windows:Record<string,number>={'24h':86400_000,'7d':7*86400_000,'30d':30*86400_000};from=date==='all'?null:now-windows[date];}
 if(to!==null&&from!==null&&to<from)[from,to]=[to,from];
 const rawLimit=Number(url.searchParams.get('limit')??LEDGER_RESULT_LIMIT);
 const limit=Number.isFinite(rawLimit)?Math.max(1,Math.min(LEDGER_RESULT_LIMIT,Math.trunc(rawLimit))):LEDGER_RESULT_LIMIT;
 const status=clean(url.searchParams.get('status'),32);
 return {
  projectId:clean(url.searchParams.get('projectId'),128),missionId:clean(url.searchParams.get('missionId'),128),
  model:clean(url.searchParams.get('model')),provider:clean(url.searchParams.get('provider')),agent:clean(url.searchParams.get('agent')),
  status:STATUS_SET.has(status)?status:'',date,from,to,limit,
 };
}

function providerFor(model:string,stored:unknown):{provider:string;source:'recorded'|'registry-inferred'|'slug-inferred'|'unknown'}{
 const recorded=typeof stored==='string'&&stored.trim()&&stored!=='unknown'?stored.trim():'';
 if(recorded)return {provider:recorded,source:'recorded'};
 const registry=findModel(model)?.provider;if(registry)return {provider:registry,source:'registry-inferred'};
 const slug=model.startsWith('@cf/')?model.slice(4):model;
 const key=slug.includes('/')?slug.slice(0,slug.indexOf('/')):'';
 if(!key)return {provider:'Unknown',source:'unknown'};
 return {provider:key.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),source:'slug-inferred'};
}
function n(value:unknown):number{return typeof value==='number'&&Number.isFinite(value)?value:Number(value)||0;}
function nullableNumber(value:unknown):number|null{return value===null||value===undefined?null:Number.isFinite(Number(value))?Number(value):null;}
function percentile(values:number[],p:number):number|null{
 if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const at=Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1));return sorted[at];
}
function spend(row:LedgerCallRow):number{return row.actualMicroUsd??(['running','uncertain','unpriced'].includes(row.status)?row.reservedMicroUsd:0);}
function unique(values:Array<string|null|undefined>):string[]{return [...new Set(values.filter((v):v is string=>!!v))].sort((a,b)=>a.localeCompare(b));}

function anomalies(rows:LedgerCallRow[],now:number):LedgerAnomaly[]{
 const out:LedgerAnomaly[]=[];
 const hour=rows.filter(r=>r.startedAt>=now-3600_000),previous=rows.filter(r=>r.startedAt>=now-7200_000&&r.startedAt<now-3600_000);
 const currentSpend=hour.reduce((s,r)=>s+spend(r),0),previousSpend=previous.reduce((s,r)=>s+spend(r),0);
 if(previousSpend>0&&currentSpend>previousSpend*2){const growth=Math.round((currentSpend/previousSpend-1)*100);out.push({severity:growth>=300?'critical':'warning',code:'spend_growth',value:growth,message:`Model spend grew ${growth}% in the last hour.`});}
 const uncertain=rows.filter(r=>r.status==='uncertain');if(uncertain.length)out.push({severity:'warning',code:'uncertain_outcomes',value:uncertain.length,message:`${uncertain.length} model call(s) have an uncertain provider outcome and retained reservation.`});
 const failures=rows.filter(r=>['cancelled','failed','uncertain'].includes(r.status));if(rows.length>=5&&failures.length/rows.length>=.2)out.push({severity:'warning',code:'error_rate',value:Math.round(failures.length/rows.length*100),message:`Model error/failed/uncertain rate is ${Math.round(failures.length/rows.length*100)}% in the selected window.`});
 const p95=percentile(rows.map(r=>r.latencyMs).filter((v):v is number=>v!==null),.95);if(p95!==null&&p95>15_000)out.push({severity:'warning',code:'latency_p95',value:Math.round(p95),message:`P95 model latency is ${Math.round(p95)} ms.`});
 return out;
}

async function budgetRows(env:Env,principal:Principal,canSeePlatform:boolean,now:number){
 const paidMonth=`paid-month:${new Date(now).toISOString().slice(0,7)}`;
 const {results}=await env.AZRAIL_D1.prepare(`SELECT s.scope,s.limit_micro_usd,s.spent_micro_usd,
   CASE WHEN s.scope LIKE 'project:%' THEN substr(s.scope,9) ELSE m.project_id END AS project_id,
   CASE WHEN s.scope LIKE 'mission:%' THEN substr(s.scope,9) END AS mission_id
  FROM spend_limits s LEFT JOIN missions m ON m.id=CASE WHEN s.scope LIKE 'mission:%' THEN substr(s.scope,9) END
  WHERE s.scope=?
     OR (s.scope LIKE 'project:%' AND EXISTS(SELECT 1 FROM resource_owners o WHERE o.kind='project' AND o.resource_id=substr(s.scope,9) AND o.account_id=?))
     OR (s.scope LIKE 'mission:%' AND EXISTS(SELECT 1 FROM missions owned_m JOIN resource_owners o ON o.kind='project' AND o.resource_id=owned_m.project_id WHERE owned_m.id=substr(s.scope,9) AND o.account_id=?))
     OR (?=1 AND s.scope=?) ORDER BY s.scope LIMIT 1000`).bind(`account:${principal.id}`,principal.id,principal.id,canSeePlatform?1:0,paidMonth).all<Record<string,unknown>>();
 return (results??[]).map(r=>({scope:String(r.scope),projectId:r.project_id?String(r.project_id):null,missionId:r.mission_id?String(r.mission_id):null,limitMicroUsd:n(r.limit_micro_usd),committedMicroUsd:n(r.spent_micro_usd)}));
}

function summarizeBudget(rows:Array<{scope:string;projectId:string|null;missionId:string|null;limitMicroUsd:number;committedMicroUsd:number}>,filters:LedgerFilters,canSeePlatform:boolean,now:number,principalId:string){
 let selected:Array<{scope:string;projectId:string|null;missionId:string|null;limitMicroUsd:number;committedMicroUsd:number}>=[],scopeLabel='Account budget',aggregate=false;
 if(filters.missionId){selected=rows.filter(r=>r.scope===`mission:${filters.missionId}`);scopeLabel='Mission budget';}
 else if(filters.projectId){
  selected=rows.filter(r=>r.scope===`project:${filters.projectId}`);scopeLabel='Project budget';
  if(!selected.length){selected=rows.filter(r=>r.projectId===filters.projectId&&r.missionId!==null);scopeLabel='Mission budgets under project';aggregate=true;}
 } else if(canSeePlatform){
  const month=`paid-month:${new Date(now).toISOString().slice(0,7)}`;selected=rows.filter(r=>r.scope===month);scopeLabel='Paid model monthly budget';
  if(!selected.length){selected=rows.filter(r=>r.scope===`account:${principalId}`);scopeLabel='Account budget';}
 } else selected=rows.filter(r=>r.scope===`account:${principalId}`);
 if(!selected.length)return {scopeLabel,aggregate,limitMicroUsd:null,committedMicroUsd:null,remainingMicroUsd:null,scopes:[] as string[]};
 const limit=selected.reduce((s,r)=>s+r.limitMicroUsd,0),committed=selected.reduce((s,r)=>s+r.committedMicroUsd,0);
 return {scopeLabel,aggregate,limitMicroUsd:limit,committedMicroUsd:committed,remainingMicroUsd:Math.max(0,limit-committed),scopes:selected.map(r=>r.scope)};
}

export async function buildLedgerReport(env:Env,principal:Principal,filters:LedgerFilters,now=Date.now()){
 const sql=`WITH enriched AS (
  SELECT c.id,c.scope,c.model,c.status,c.started_at,c.finished_at,c.prompt_tokens,c.completion_tokens,c.reserved_micro_usd,c.actual_micro_usd,c.error,
   d.provider,d.route_attempt,d.retry_attempt,tl.trace_id,tl.task_id,
   COALESCE(tl.mission_id,CASE WHEN c.scope LIKE 'mission:%' THEN substr(c.scope,9) END) AS mission_id,
   CASE WHEN c.scope LIKE 'project:%' THEN substr(c.scope,9) ELSE m.project_id END AS project_id,
   th.agent AS agent,m.goal AS mission_title,
   p.name AS project_name
  FROM model_calls c
  LEFT JOIN model_call_dimensions d ON d.call_id=c.id
  LEFT JOIN trace_links tl ON tl.entity_type='model_call' AND tl.entity_id=c.id
  LEFT JOIN missions m ON m.id=COALESCE(tl.mission_id,CASE WHEN c.scope LIKE 'mission:%' THEN substr(c.scope,9) END)
  LEFT JOIN task_history th ON th.id=tl.task_id
  LEFT JOIN projects p ON p.id=CASE WHEN c.scope LIKE 'project:%' THEN substr(c.scope,9) ELSE m.project_id END
 ) SELECT * FROM enriched e
 WHERE (e.scope=? OR EXISTS(SELECT 1 FROM resource_owners o WHERE o.kind='project' AND o.resource_id=e.project_id AND o.account_id=?))
   AND (? IS NULL OR e.started_at>=?) AND (? IS NULL OR e.started_at<=?)
 ORDER BY e.started_at DESC LIMIT ?`;
 const scan=await env.AZRAIL_D1.prepare(sql).bind(
  `account:${principal.id}`,principal.id,filters.from,filters.from,filters.to,filters.to,LEDGER_SCAN_LIMIT+1,
 ).all<Record<string,unknown>>();
 const scanned=(scan.results??[]).slice(0,LEDGER_SCAN_LIMIT).map((r):LedgerCallRow=>{
  const started=n(r.started_at),finished=nullableNumber(r.finished_at),prompt=n(r.prompt_tokens),completion=n(r.completion_tokens);
  const provider=providerFor(String(r.model),r.provider);
  return {id:String(r.id),projectId:r.project_id?String(r.project_id):null,projectName:r.project_name?String(r.project_name):null,missionId:r.mission_id?String(r.mission_id):null,missionTitle:r.mission_title?String(r.mission_title):null,
   model:String(r.model),provider:provider.provider,providerSource:provider.source,agent:r.agent?String(r.agent):null,status:String(r.status),startedAt:started,finishedAt:finished,latencyMs:finished===null?null:Math.max(0,finished-started),
   promptTokens:prompt,completionTokens:completion,tokens:prompt+completion,routeAttempt:Math.max(1,n(r.route_attempt)||1),retryAttempt:Math.max(1,n(r.retry_attempt)||1),reservedMicroUsd:n(r.reserved_micro_usd),actualMicroUsd:nullableNumber(r.actual_micro_usd),error:r.error?String(r.error):null,traceId:r.trace_id?String(r.trace_id):null};
 });
 const providerNeedle=filters.provider.toLowerCase();
 const filtered=scanned.filter(r=>(!filters.projectId||r.projectId===filters.projectId)&&(!filters.missionId||r.missionId===filters.missionId)&&(!filters.model||r.model===filters.model)&&(!providerNeedle||r.provider.toLowerCase()===providerNeedle)&&(!filters.agent||r.agent===filters.agent)&&(!filters.status||r.status===filters.status));
 const rows=filtered.slice(0,filters.limit),latencies=filtered.map(r=>r.latencyMs).filter((v):v is number=>v!==null);
 const todayStart=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth(),new Date(now).getUTCDate());
 const todaySpend=filtered.filter(r=>r.startedAt>=todayStart).reduce((s,r)=>s+spend(r),0);
 const retries=filtered.reduce((sum,r)=>sum+Math.max(0,r.retryAttempt-1),0),errors=filtered.filter(r=>['cancelled','failed','uncertain'].includes(r.status)).length;
 const estimated=filtered.reduce((s,r)=>s+r.reservedMicroUsd,0),actual=filtered.reduce((s,r)=>s+(r.actualMicroUsd??0),0),reserved=filtered.filter(r=>['running','uncertain','unpriced'].includes(r.status)).reduce((s,r)=>s+r.reservedMicroUsd,0),uncertain=filtered.filter(r=>r.status==='uncertain').reduce((s,r)=>s+r.reservedMicroUsd,0);
 const canSeePlatform=principal.role==='admin'||principal.operator===true,budgets=await budgetRows(env,principal,canSeePlatform,now),budget=summarizeBudget(budgets,filters,canSeePlatform,now,principal.id);
 const platformLimits=canSeePlatform?(await env.AZRAIL_D1.prepare('SELECT scope,unit,limit_units,committed_units FROM resource_budgets WHERE scope=? ORDER BY unit').bind(`platform:${new Date(now).toISOString().slice(0,10)}`).all<Record<string,unknown>>()).results??[]:[];
 return {
  generatedAt:now,filters,
  overview:{todaySpendMicroUsd:todaySpend,budget},
  metrics:{tokens:filtered.reduce((s,r)=>s+r.tokens,0),promptTokens:filtered.reduce((s,r)=>s+r.promptTokens,0),completionTokens:filtered.reduce((s,r)=>s+r.completionTokens,0),calls:filtered.length,latencyMeanMs:latencies.length?latencies.reduce((s,v)=>s+v,0)/latencies.length:null,latencyP95Ms:percentile(latencies,.95),retries,errors,estimatedMicroUsd:estimated,actualMicroUsd:actual,reservedMicroUsd:reserved,uncertainMicroUsd:uncertain,uncertainCalls:filtered.filter(r=>r.status==='uncertain').length},
  anomalies:anomalies(filtered,now),calls:rows,
  available:{projects:unique(scanned.map(r=>r.projectId?`${r.projectId}\t${r.projectName??r.projectId}`:null)),missions:unique(scanned.map(r=>r.missionId?`${r.missionId}\t${r.missionTitle??r.missionId}`:null)),models:unique(scanned.map(r=>r.model)),providers:unique(scanned.map(r=>r.provider)),agents:unique(scanned.map(r=>r.agent)),statuses:unique(scanned.map(r=>r.status))},
  platformLimits:platformLimits.map(r=>({scope:String(r.scope),unit:String(r.unit),limitUnits:n(r.limit_units),committedUnits:n(r.committed_units)})),
  truncated:Boolean((scan.results?.length??0)>LEDGER_SCAN_LIMIT||filtered.length>filters.limit),scanLimit:LEDGER_SCAN_LIMIT,resultLimit:filters.limit,
  note:'AZRAIL Ledger is application-level metering. Estimated/reserved values are not provider invoices; Cloudflare/provider billing remains the authoritative exact billing source.',
 };
}
