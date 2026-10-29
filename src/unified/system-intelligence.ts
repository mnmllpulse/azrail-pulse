import type {Env} from '../types';
import type {Principal} from '../lib/accounts';
import {AccessError,requireResource} from '../lib/accounts';
import {readJsonRecord} from './request-json';
import {BROWSER_QA_REQUIRED_CHECKS,REAL_E2E_JOURNEYS,rankSystemSuggestions,undoContract,type SystemSurface} from '../lib/series-g';

const SURFACES=new Set<SystemSurface>(['chat','web','image','music','video','audio','als','data','ledger','lab','prose']);
const FEEDBACK_OUTCOMES=new Set(['accepted','dismissed','completed','failed']);
function text(v:unknown,max:number,label:string){if(typeof v!=='string')throw new AccessError(`${label}: ожидается текст.`,400);const s=v.trim();if(!s||s.length>max)throw new AccessError(`${label}: максимум ${max} символов.`,400);return s;}

export async function systemIntelligenceRoute(request:Request,env:Env,principal:Principal):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname,account=principal.id;
 if(path==='/api/studio/system/suggestions'&&request.method==='POST'){
  const body=await readJsonRecord(request,32_000),surface=String(body.surface??'chat') as SystemSurface;if(!SURFACES.has(surface))throw new AccessError('Некорректная suggestion surface.',400);
  const projectId=typeof body.projectId==='string'?body.projectId.trim():'';if(projectId)await requireResource(env,principal,'project',projectId);
  const [events,memory,assets,mission,uncertain]=projectId?await Promise.all([
   env.AZRAIL_D1.prepare('SELECT type FROM event_stream WHERE project_id=? ORDER BY seq DESC LIMIT 40').bind(projectId).all<{type:string}>(),
   env.AZRAIL_D1.prepare(`SELECT DISTINCT scope FROM intelligence_memory WHERE account_id=? AND (project_id IS NULL OR project_id=?) AND (ttl_expires_at IS NULL OR ttl_expires_at>?) LIMIT 20`).bind(account,projectId,Date.now()).all<{scope:string}>(),
   env.AZRAIL_D1.prepare(`SELECT DISTINCT ai.kind FROM studio_artifact_projects ap JOIN studio_artifacts a ON a.id=ap.artifact_id LEFT JOIN asset_intelligence ai ON ai.artifact_id=a.id WHERE ap.project_id=? AND a.account_id=? AND ai.kind IS NOT NULL LIMIT 30`).bind(projectId,account).all<{kind:string}>(),
   env.AZRAIL_D1.prepare('SELECT status FROM missions WHERE project_id=? ORDER BY created_at DESC LIMIT 1').bind(projectId).first<{status:string}>(),
   env.AZRAIL_D1.prepare(`SELECT COUNT(*) AS n FROM connector_calls WHERE account_id=? AND status='uncertain'`).bind(account).first<{n:number}>(),
  ]):[{results:[]},{results:[]},{results:[]},null,await env.AZRAIL_D1.prepare(`SELECT COUNT(*) AS n FROM connector_calls WHERE account_id=? AND status='uncertain'`).bind(account).first<{n:number}>()];
  const items=rankSystemSuggestions({surface,lastUserMessage:typeof body.lastUserMessage==='string'?body.lastUserMessage.slice(0,4000):undefined,hasResult:body.hasResult===true,errors:Array.isArray(body.errors)?body.errors.map(String).slice(0,20):undefined,budgetState:['ok','warning','blocked'].includes(String(body.budgetState))?body.budgetState as any:undefined,missionStatus:mission?.status,recentEventTypes:(events.results??[]).map(r=>r.type),memoryScopes:(memory.results??[]).map(r=>r.scope),assetKinds:(assets.results??[]).map(r=>r.kind),uncertainEffects:Number(uncertain?.n??0)});
  return Response.json({items,context:{projectId:projectId||null,missionStatus:mission?.status??null,memoryScopes:(memory.results??[]).map(r=>r.scope),assetKinds:(assets.results??[]).map(r=>r.kind),uncertainEffects:Number(uncertain?.n??0)}});
 }
 if(path==='/api/studio/system/suggestion-feedback'&&request.method==='POST'){
  if(principal.role==='viewer')throw new AccessError('Только чтение.',403);const body=await readJsonRecord(request,16_000),projectId=typeof body.projectId==='string'?body.projectId.trim():'';if(projectId)await requireResource(env,principal,'project',projectId);const surface=text(body.surface,40,'Surface'),suggestionId=text(body.suggestionId,160,'Suggestion'),outcome=text(body.outcome,32,'Outcome');if(!FEEDBACK_OUTCOMES.has(outcome))throw new AccessError('Некорректный suggestion outcome.',400);const context=JSON.stringify(body.context??{});if(context.length>8000)throw new AccessError('Suggestion context слишком большой.',413);const id=crypto.randomUUID(),now=Date.now();await env.AZRAIL_D1.prepare(`INSERT INTO suggestion_feedback(id,account_id,project_id,surface,suggestion_id,outcome,context_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,account,projectId||null,surface,suggestionId,outcome,context,now).run();return Response.json({id,createdAt:now},{status:201});
 }
 if(path==='/api/studio/system/history'&&request.method==='GET'){
  const projectId=(url.searchParams.get('projectId')??'').trim();if(!projectId)throw new AccessError('Выберите Project.',400);await requireResource(env,principal,'project',projectId);
  const [events,tasks]=await Promise.all([
   env.AZRAIL_D1.prepare(`SELECT id,type,domain,created_at,payload_json FROM event_stream WHERE project_id=? ORDER BY seq DESC LIMIT 180`).bind(projectId).all<Record<string,unknown>>(),
   env.AZRAIL_D1.prepare(`SELECT id,agent,intent,status,input_summary,output_summary,error,started_at,finished_at FROM task_history WHERE project_id=? ORDER BY started_at DESC LIMIT 120`).bind(projectId).all<Record<string,unknown>>(),
  ]);
  const rows=[...(events.results??[]).map(row=>{const c=undoContract(String(row.type));return{id:String(row.id),source:'event' as const,type:String(row.type),domain:String(row.domain),createdAt:Number(row.created_at),summary:String(row.type),undoable:c.undoable,undoHint:c.hint};}),...(tasks.results??[]).map(row=>({id:String(row.id),source:'task' as const,type:`task.${String(row.status)}`,domain:'agent',createdAt:String(row.started_at),summary:`${String(row.agent)} · ${String(row.intent??'task')} · ${String(row.status)}`,undoable:false,undoHint:'Task history is immutable evidence; use subsystem snapshot/history for a reversible change.'}))];
  rows.sort((a,b)=>new Date(b.createdAt as any).getTime()-new Date(a.createdAt as any).getTime());return Response.json({items:rows.slice(0,240)});
 }
 if(path==='/api/studio/system/readiness'&&request.method==='GET'){
  const browserConfigured=Boolean(env.AZRAIL_BROWSER);const connectorCount=await env.AZRAIL_D1.prepare(`SELECT COUNT(*) AS n FROM connector_connections WHERE account_id=? AND disabled=0`).bind(account).first<{n:number}>().catch(()=>({n:0}));
  return Response.json({series:'G',gates:{G01:'suggestion-engine',G02:'global-memory',G03:'asset-library',G04:'command-palette',G05:'history-undo',G06:'connector-gateway',G07:'resource-ledger-2',G08:'mission-graph',G09:'browser-qa',G10:'real-e2e'},browserQA:{staticPreviewCollector:true,staticPreviewIsRealBrowser:false,realBrowserConfigured:browserConfigured,requiredChecks:BROWSER_QA_REQUIRED_CHECKS,truthBoundary:browserConfigured?'Real browser binding is configured; execution still requires a live deployed target.':'No Browser Run binding is configured; static preview QA must not be reported as real-browser PASS.'},realE2E:{journeys:REAL_E2E_JOURNEYS,requiresLiveUrl:true,requiresAuth:true,requiresBrowserProof:true},connectorGateway:{activeConnections:Number(connectorCount?.n??0)},resourceLedger:{unified:true},missionGraph:{validator:true,metatronLiveGraph:true}});
 }
 return null;
}
