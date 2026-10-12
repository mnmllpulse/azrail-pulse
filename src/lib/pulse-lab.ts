import type { Env } from '../types';
import type { Principal } from './accounts';
import { BUILD_VERSION } from '../build-info';
import { MODEL_REGISTRY } from './model-registry';

export type PulseStatus='healthy'|'warning'|'blocked'|'unknown';
export type PulseItem={label:string;value:string;status:PulseStatus;detail:string};
export type PulseSection={id:'system'|'auth'|'storage'|'ai'|'runtime'|'release'|'health';title:string;items:PulseItem[]};
export type PulseControlReport={
 generatedAt:string;
 overall:PulseStatus;
 mutationFree:true;
 paidModelCalls:false;
 sections:PulseSection[];
 browser?:never;
};

type Probe={status:'ok'|'error'|'absent';ms:number|null;error:string|null};
const safe=(error:unknown)=>error instanceof Error?error.message:String(error);
const item=(label:string,value:string,status:PulseStatus,detail:string):PulseItem=>({label,value,status,detail});

async function probe(bound:boolean,run:()=>Promise<unknown>):Promise<Probe>{
 if(!bound)return {status:'absent',ms:null,error:null};
 const started=Date.now();
 try{await run();return {status:'ok',ms:Date.now()-started,error:null};}
 catch(error){return {status:'error',ms:Date.now()-started,error:safe(error)};}
}
function fromProbe(name:string,p:Probe):PulseItem{
 if(p.status==='ok')return item(name,`Healthy · ${p.ms} ms`,'healthy','Read-only round-trip succeeded.');
 if(p.status==='error')return item(name,'Blocked','blocked',`Read-only probe failed: ${p.error??'unknown error'}`);
 return item(name,'Unknown','unknown','Binding is not present in this runtime profile.');
}
function environmentName(request:Request,env:Env){
 const host=new URL(request.url).hostname.toLowerCase();
 const origins=(env.PUBLIC_ORIGINS??'').toLowerCase();
 if(host.includes('staging')||origins.includes('staging'))return 'staging';
 if(host==='localhost'||host==='127.0.0.1'||host.endsWith('.local'))return 'local';
 return 'unknown';
}
function overallStatus(sections:PulseSection[]):PulseStatus{
 const states=sections.flatMap(section=>section.items.map(entry=>entry.status));
 if(states.includes('blocked'))return 'blocked';
 if(states.includes('warning'))return 'warning';
 if(states.includes('unknown'))return 'warning';
 return 'healthy';
}
async function releaseRows(env:Env){
 try{
  const result=await env.AZRAIL_D1.prepare(`SELECT kind,environment,status,summary,recorded_at FROM release_evidence ORDER BY recorded_at DESC LIMIT 40`).all<Record<string,unknown>>();
  return result.results??[];
 }catch{return [] as Record<string,unknown>[];}
}
function latestEvidence(rows:Record<string,unknown>[],kind:string){return rows.find(row=>String(row.kind)===kind);}
function evidenceItem(label:string,row:Record<string,unknown>|undefined):PulseItem{
 if(!row)return item(label,'Unknown','unknown','No durable release evidence has been recorded yet.');
 const status=String(row.status||'unknown') as PulseStatus;
 const normalized:PulseStatus=['healthy','warning','blocked','unknown'].includes(status)?status:'unknown';
 const when=Number(row.recorded_at);const stamp=Number.isFinite(when)?new Date(when).toISOString():'unknown time';
 return item(label,String(row.summary||row.status||'Recorded'),normalized,`Evidence ${String(row.environment||'unknown')} · ${stamp}`);
}

export async function buildPulseControlReport(request:Request,env:Env,principal:Principal):Promise<PulseControlReport>{
 const started=Date.now();
 const [d1,kv,r2]=await Promise.all([
  probe(!!env.AZRAIL_D1,()=>env.AZRAIL_D1.prepare('SELECT 1 AS ok').first()),
  probe(!!env.AZRAIL_KV,()=>env.AZRAIL_KV.get('__healthcheck__')),
  probe(!!env.AZRAIL_R2,()=>env.AZRAIL_R2.head('__healthcheck__')),
 ]);
 let migrationVersion='Unknown';let migrationStatus:PulseStatus='unknown';let migrationDetail='Migration ledger could not be read.';
 let recentErrors=0;let recentMissions=0;let failedMissions=0;
 if(d1.status==='ok'){
  try{
   const row=await env.AZRAIL_D1.prepare(`SELECT version,filename,applied_at,status FROM schema_migrations WHERE status='applied' ORDER BY CAST(version AS INTEGER) DESC LIMIT 1`).first<Record<string,unknown>>();
   if(row){migrationVersion=`${String(row.version)} · ${String(row.filename)}`;migrationStatus='healthy';migrationDetail=`Applied ${String(row.applied_at)}`;}
   else{migrationStatus='warning';migrationDetail='schema_migrations exists but has no applied entries.';}
  }catch{migrationStatus='warning';migrationDetail='schema_migrations is unavailable or not initialized.';}
  try{
   const since=Date.now()-60*60*1000;
   const errorRow=await env.AZRAIL_D1.prepare(`SELECT COUNT(*) AS n FROM event_stream WHERE created_at>=? AND (type LIKE '%.failed' OR type LIKE '%.error' OR type LIKE '%.error.%')`).bind(since).first<{n:number}>();
   recentErrors=Number(errorRow?.n??0);
   const missionRow=await env.AZRAIL_D1.prepare(`SELECT COUNT(*) AS n,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed FROM missions WHERE updated_at>=datetime(?,'unixepoch')`).bind(Math.floor(since/1000)).first<{n:number;failed:number}>();
   recentMissions=Number(missionRow?.n??0);failedMissions=Number(missionRow?.failed??0);
  }catch{/* health counters are best-effort and never change application state */}
 }
 const evidence=await releaseRows(env);
 const envName=environmentName(request,env);
 const host=new URL(request.url).host;
 const role=`${principal.role}${principal.operator?' · operator':''}`;
 const errorStatus:PulseStatus=recentErrors>0||failedMissions>0?'warning':'healthy';
 const apiMs=Date.now()-started;
 const sections:PulseSection[]=[
  {id:'system',title:'SYSTEM',items:[
   item('App version',BUILD_VERSION,'healthy','Single version source generated from package.json.'),
   item('Build SHA',env.AZRAIL_BUILD_SHA?.trim()||'Unknown',env.AZRAIL_BUILD_SHA?.trim()?'healthy':'unknown','Git/build commit is shown only when deployment injects AZRAIL_BUILD_SHA.'),
   item('Environment',envName,envName==='unknown'?'unknown':'healthy','Derived only from a trustworthy runtime hostname/origin signal; otherwise left unknown.'),
   item('Worker',host,'healthy','Current request host; this is not a Cloudflare control-plane lookup.'),
  ]},
  {id:'auth',title:'AUTH',items:[
   item('OIDC',env.AUTH_MODE==='oidc'?'Configured':env.AUTH_MODE??'legacy',env.AUTH_MODE==='oidc'?'healthy':'warning','Reports configured auth mode; it does not expose issuer/client secrets.'),
   item('Session','Authenticated','healthy','Pulse endpoint is behind the normal AZRAIL authentication boundary.'),
   item('Access',role,'healthy','Current principal role only; no credential material is returned.'),
  ]},
  {id:'storage',title:'STORAGE',items:[fromProbe('D1',d1),fromProbe('KV',kv),fromProbe('R2',r2)]},
  {id:'ai',title:'AI',items:[
   item('Workers AI',env.AI?'Bound':'Unknown',env.AI?'healthy':'unknown','Binding presence only. Pulse Lab never calls a model for health verification.'),
   item('Gateway',env.AI_GATEWAY_ID?'Configured':'Unknown',env.AI_GATEWAY_ID?'healthy':'unknown','Configuration presence only; no paid request is dispatched.'),
   item('Model Registry',`${MODEL_REGISTRY.length} models`,'healthy','Local canonical registry count; model availability is not inferred from this count.'),
  ]},
  {id:'runtime',title:'RUNTIME',items:[
   item('Orchestrator',env.Orchestrator?'Bound':'Unknown',env.Orchestrator?'healthy':'unknown','Durable Object binding presence; no synthetic mission is created.'),
   item('Sandbox',env.AZRAIL_SANDBOX?'Bound':'Not in profile',env.AZRAIL_SANDBOX?'healthy':'unknown','Binding presence only; no container is started by Pulse Lab.'),
   item('Cron','Control-plane evidence required','unknown','Worker runtime cannot prove schedule registration without an external read-only control-plane snapshot.'),
  ]},
  {id:'release',title:'RELEASE',items:[
   item('Migration version',migrationVersion,migrationStatus,migrationDetail),
   evidenceItem('Config drift',latestEvidence(evidence,'config_drift')),
   evidenceItem('Last staging smoke',latestEvidence(evidence,'staging_smoke')),
  ]},
  {id:'health',title:'HEALTH',items:[
   item('API latency',`${apiMs} ms`,apiMs>1500?'warning':'healthy','Time spent building this authenticated read-only control report.'),
   item('Errors',`${recentErrors} system events · ${failedMissions}/${recentMissions} failed missions`,errorStatus,'Best-effort one-hour counters from existing D1 telemetry; zero does not prove absence of external provider incidents.'),
   item('Queue',env.AZRAIL_QUEUE?'Bound':'Not in profile',env.AZRAIL_QUEUE?'healthy':'unknown','Binding presence only. Pulse Lab never sends a synthetic queue message.'),
  ]},
 ];
 return {generatedAt:new Date().toISOString(),overall:overallStatus(sections),mutationFree:true,paidModelCalls:false,sections};
}
