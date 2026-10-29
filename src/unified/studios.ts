import type { Env } from '../types';
import { authenticate, AccessError, requireResource } from '../lib/accounts';
import {exportProjectZip} from './project-export';
import {readJsonRecord} from './request-json';
import { readBoundedBody } from '../lib/request-body';
import {ALS_COMPRESSED_LIMIT,AbletonAnalysisError,parseALSBuffer} from './music';
import { accountCall } from './ledger';
import {draftRoute} from './drafts';
import {designRoute} from './design-contract';
import {cleanupUnpublishedR2, deleteR2KeysBestEffort} from '../lib/r2-consistency';
import {log} from '../lib/resilience';
import {normalizeStudioId} from '../lib/project-center';
import {parseImageStudioRequest,loadReferenceImage,runImageProvider,selectImageModel,imageDimensions} from '../lib/image-studio';
import {parseMusicSessionRequest} from '../lib/music-studio';
import { API_CONTRACT } from '../lib/api-contract';
import {generateRemoteMusic} from './music-remote';
import {enforceOperationLimit} from '../lib/operation-limit';
import {assertSubsystem} from '../lib/kill-switch';
import {generateSitePlan,listPublishedSites,publishSite,publishedNotes,publishedStats,readCompetitorPages,readReferencePage} from '../lib/web-sites';
import {buildVideoScenePlan,parseVideoPlanRequest,parseVideoSessionRequest} from '../lib/video-studio';
import {buildProse,parseProseRequest} from '../lib/prose-studio';
import {parseVideo2StoryboardRequest} from '../lib/video-studio-2';
import {parseDataReportRequest} from '../lib/data-studio';
import {emitEvent} from '../lib/event-stream';
import {buildLedgerReport,parseLedgerFilters} from '../lib/ledger-studio';
import {buildPulseControlReport} from '../lib/pulse-lab';
import {CloudflareSpeechToTextAdapter} from './voice';
import {createImageJob} from '../lib/image-pipeline';
import {productIntelligenceRoute} from './product-intelligence';
import {systemIntelligenceRoute} from './system-intelligence';
import {DAW_IMPORT_COMPRESSED_LIMIT,DAWImportError,parseDAWImport,pluginCompatibilityReport,type DAWImportReport} from '../lib/daw-import';

const json=Response.json;

function compactDAWImportReport(report:DAWImportReport){
 const compact={...report,tracks:report.tracks.slice(0,500),plugins:report.plugins.slice(0,1000),media:report.media.slice(0,1000),raw:report.raw?{projectXmlBytes:report.raw.projectXmlBytes,metadataXmlBytes:report.raw.metadataXmlBytes}:undefined};
 let json=JSON.stringify(compact),truncated=report.tracks.length>compact.tracks.length||report.plugins.length>compact.plugins.length||report.media.length>compact.media.length;
 if(json.length>900_000){json=JSON.stringify({...compact,tracks:compact.tracks.slice(0,120),plugins:compact.plugins.slice(0,250),media:compact.media.slice(0,250)});truncated=true;}
 if(json.length>900_000){json=JSON.stringify({format:report.format,sourceName:report.sourceName,standardVersion:report.standardVersion,application:report.application,title:report.title,bpm:report.bpm,timeSignature:report.timeSignature,trackCount:report.trackCount,summary:report.summary,warnings:report.warnings,analysisBoundary:report.analysisBoundary,tracks:[],plugins:[],media:[]});truncated=true;}
 return {json,truncated};
}
function compactAbletonReport(report:ReturnType<typeof parseALSBuffer>){
 const compact={...report,tracks:report.tracks.slice(0,500).map(track=>({...track,devices:track.devices.slice(0,80),routing:track.routing.slice(0,20)})),samples:report.samples.slice(0,1000),masterChain:report.masterChain.slice(0,100)};
 const json=JSON.stringify(compact);
 return {json,truncated:report.tracks.length>compact.tracks.length||report.samples.length>compact.samples.length||report.masterChain.length>compact.masterChain.length||json.length>900_000};
}
function studioFilename(request:Request,fallback:string){
 let decoded=fallback;try{decoded=decodeURIComponent(request.headers.get('X-Filename')??fallback);}catch{}
 return decoded.replace(/[\x00-\x1f/\\]/g,'_').slice(0,160).trim()||fallback;
}


async function requireVideoArtifact(env:Env,account:string,id:string,projectId:string){
 const row=await env.AZRAIL_D1.prepare(`SELECT a.id,a.mime,p.project_id,p.studio_id FROM studio_artifacts a LEFT JOIN studio_artifact_projects p ON p.artifact_id=a.id WHERE a.id=? AND a.account_id=?`).bind(id,account).first<{id:string;mime:string;project_id:string|null;studio_id:string|null}>();
 if(!row)throw new AccessError('Video artifact не найден.',404);
 if(!/^video\/webm(?:;|$)/i.test(row.mime))throw new AccessError('Video session принимает только WebM artifact.',400);
 if(projectId&&(row.project_id!==projectId||row.studio_id!=='video'))throw new AccessError('Video artifact не принадлежит выбранному проекту.',403);
}

async function requireMusicArtifact(env:Env,account:string,id:string,kind:'wav'|'midi',projectId:string){
 const row=await env.AZRAIL_D1.prepare(`SELECT a.id,a.mime,p.project_id,p.studio_id FROM studio_artifacts a LEFT JOIN studio_artifact_projects p ON p.artifact_id=a.id WHERE a.id=? AND a.account_id=?`).bind(id,account).first<{id:string;mime:string;project_id:string|null;studio_id:string|null}>();
 if(!row)throw new AccessError('Music artifact не найден.',404);
 const valid=kind==='wav'?row.mime==='audio/wav':/^(audio\/midi|audio\/x-midi|application\/x-midi)$/i.test(row.mime);
 if(!valid)throw new AccessError(`Некорректный ${kind.toUpperCase()} artifact.`,400);
 if(projectId&&(row.project_id!==projectId||row.studio_id!=='music'))throw new AccessError('Music artifact не принадлежит выбранному проекту.',403);
}
async function requireDataArtifact(env:Env,account:string,id:string,projectId:string){
 const row=await env.AZRAIL_D1.prepare(`SELECT a.id,a.mime,p.project_id,p.studio_id FROM studio_artifacts a LEFT JOIN studio_artifact_projects p ON p.artifact_id=a.id WHERE a.id=? AND a.account_id=?`).bind(id,account).first<{id:string;mime:string;project_id:string|null;studio_id:string|null}>();
 if(!row)throw new AccessError('Dataset artifact не найден.',404);
 if(!/^(text\/csv|text\/tab-separated-values|text\/plain)(?:;|$)/i.test(row.mime))throw new AccessError('Data Studio принимает CSV/TSV artifact.',400);
 if(row.project_id!==projectId||row.studio_id!=='data')throw new AccessError('Dataset artifact не принадлежит выбранному проекту.',403);
}
export async function studioRoute(request:Request,env:Env,onProviderDispatch?:()=>void):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/studio/'))return null;
 const auth=await authenticate(request,env);
 if(!auth.ok)return json({error:auth.error},{status:401});
 const account=auth.principal!.id;
 if(auth.principal!.role==='viewer'&&request.method!=='GET')throw new AccessError('Только чтение');
 if(request.method==='POST'&&path==='/api/studio/music/generate')assertSubsystem(env,'music');
 if(request.method==='POST'&&path==='/api/studio/video/plan')assertSubsystem(env,'video');
 if(request.method==='POST'&&['/api/studio/image','/api/studio/voice','/api/studio/web/generate','/api/studio/prose','/api/studio/video/plan'].includes(path))assertSubsystem(env,'ai');
 if(request.method==='POST'&&['/api/studio/music/generate','/api/studio/image','/api/studio/voice','/api/studio/video/plan','/api/studio/web/generate','/api/studio/prose'].includes(path))await enforceOperationLimit(env,'generation',account);
 if(path==='/api/studio/design-contract')return designRoute(request,env,auth.principal!);
 if(path.startsWith('/api/studio/drafts/'))return draftRoute(request,env,account);
 const intelligence=await productIntelligenceRoute(request,env,auth.principal!);if(intelligence)return intelligence;
 const systemIntelligence=await systemIntelligenceRoute(request,env,auth.principal!);if(systemIntelligence)return systemIntelligence;
 if(path==='/api/studio/projects'&&request.method==='GET')return json({projects:(await env.AZRAIL_D1.prepare(`SELECT o.resource_id AS id,
  (SELECT id FROM missions WHERE project_id=o.resource_id ORDER BY created_at DESC LIMIT 1) AS mission_id,
  (SELECT goal FROM missions WHERE project_id=o.resource_id ORDER BY created_at DESC LIMIT 1) AS title
  FROM resource_owners o WHERE o.kind='project' AND o.account_id=? ORDER BY o.rowid DESC LIMIT 100`).bind(account).all()).results});
 if(path==='/api/studio/project-zip'&&request.method==='GET') {
  const project=url.searchParams.get('projectId')??'';await requireResource(env,auth.principal!,'project',project);
  return exportProjectZip(env,project);
 }
 if(path==='/api/studio/contract'&&request.method==='GET')return json({version:'v1',endpoints:API_CONTRACT});
 if(path==='/api/studio/capabilities')return json({
  image:!!env.AI,voice:!!env.AI,music:'local-wav-aiff-flac-mp3-midi',musicRemote:!!env.ELEVENLABS_API_KEY,musicDawImport:true,video:'storyboard+timeline+local-webm',videoProviderGeneration:false,videoContinuityMemory:true,als:true,prose:'local-draft+free-text',
  sandbox:!!env.AZRAIL_SANDBOX,auth:env.AUTH_MODE==='oidc'?'oidc':'token',ledger:true,providerCosts:'See Cloudflare account; request ledger is not a Neuron meter',
 });
 if(path==='/api/studio/web/generate'&&request.method==='POST'){const body=await readJsonRecord(request,12000);return json(await accountCall(env,'@cf/openai/gpt-oss-20b',()=>generateSitePlan(env,body,onProviderDispatch)));}
 if(path==='/api/studio/web/reference'&&request.method==='POST')return json(await readReferencePage((await readJsonRecord(request,4000)).url));
 if(path==='/api/studio/web/competitors'&&request.method==='POST'){const body=await readJsonRecord(request,4000);return json(await readCompetitorPages(body.urls));}
 if(path==='/api/studio/web/publish'&&request.method==='POST')return json(await publishSite(env,account,await readJsonRecord(request,500000)));
 if(path==='/api/studio/web/sites'&&request.method==='GET')return json(await listPublishedSites(env,account));
 if(path==='/api/studio/web/stats'&&request.method==='GET')return json(await publishedStats(env,account,url.searchParams.get('id')??''));
 if(path==='/api/studio/web/notes'&&request.method==='GET')return json(await publishedNotes(env,account,url.searchParams.get('id')??''));


 if(path==='/api/studio/video/storyboards'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(!projectId)throw new AccessError('Выберите Project.',400);
  await requireResource(env,auth.principal!,'project',projectId);
  const rows=await env.AZRAIL_D1.prepare(`SELECT id,project_id,title,prompt,aspect_ratio,resolution,export_profile,shots_json,continuity_json,reference_count,tracks_json,captions_json,grading_json,created_at,updated_at FROM video_storyboards WHERE account_id=? AND project_id=? ORDER BY updated_at DESC LIMIT 40`).bind(account,projectId).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({id:String(row.id),projectId:String(row.project_id),title:String(row.title),prompt:String(row.prompt),aspectRatio:String(row.aspect_ratio),resolution:String(row.resolution),exportProfile:String(row.export_profile),shots:JSON.parse(String(row.shots_json)),continuity:JSON.parse(String(row.continuity_json)),referenceCount:Number(row.reference_count),tracks:JSON.parse(String(row.tracks_json)),captions:JSON.parse(String(row.captions_json)),grading:JSON.parse(String(row.grading_json)),createdAt:Number(row.created_at),updatedAt:Number(row.updated_at)}))});
 }
 if(path==='/api/studio/video/sessions'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  const rows=projectId
   ? await env.AZRAIL_D1.prepare(`SELECT * FROM video_sessions WHERE account_id=? AND project_id=? ORDER BY created_at DESC LIMIT 60`).bind(account,projectId).all<Record<string,unknown>>()
   : await env.AZRAIL_D1.prepare(`SELECT * FROM video_sessions WHERE account_id=? ORDER BY created_at DESC LIMIT 60`).bind(account).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({id:String(row.id),projectId:row.project_id?String(row.project_id):null,prompt:String(row.prompt),aspectRatio:String(row.aspect_ratio),resolution:String(row.resolution),durationSeconds:Number(row.duration_seconds),fps:Number(row.fps),transition:String(row.transition),motionPreset:String(row.motion_preset),exportPreset:String(row.export_preset),scenes:JSON.parse(String(row.scenes_json)),hasAudio:Number(row.has_audio)===1,imageCount:Number(row.image_count),videoArtifactId:row.video_artifact_id?String(row.video_artifact_id):null,createdAt:Number(row.created_at)}))});
 }
 if(path==='/api/studio/music/generate'&&request.method==='POST'){const body=await readJsonRecord(request,12000);return json(await generateRemoteMusic(env,{...body,accountId:account}));}
 if(path==='/api/studio/music/daw-imports'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  const rows=projectId
   ? await env.AZRAIL_D1.prepare(`SELECT id,project_id,source_artifact_id,file_name,format,application_name,application_version,bpm,time_signature,track_count,plugin_count,media_count,report_json,report_truncated,created_at FROM music_daw_imports WHERE account_id=? AND project_id=? ORDER BY created_at DESC LIMIT 40`).bind(account,projectId).all<Record<string,unknown>>()
   : await env.AZRAIL_D1.prepare(`SELECT id,project_id,source_artifact_id,file_name,format,application_name,application_version,bpm,time_signature,track_count,plugin_count,media_count,report_json,report_truncated,created_at FROM music_daw_imports WHERE account_id=? ORDER BY created_at DESC LIMIT 40`).bind(account).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({id:String(row.id),projectId:row.project_id?String(row.project_id):null,sourceArtifactId:row.source_artifact_id?String(row.source_artifact_id):null,fileName:String(row.file_name),format:String(row.format),applicationName:row.application_name?String(row.application_name):null,applicationVersion:row.application_version?String(row.application_version):null,bpm:row.bpm===null||row.bpm===undefined?null:Number(row.bpm),timeSignature:row.time_signature?String(row.time_signature):null,trackCount:Number(row.track_count),pluginCount:Number(row.plugin_count),mediaCount:Number(row.media_count),report:JSON.parse(String(row.report_json)),reportTruncated:Number(row.report_truncated)===1,createdAt:Number(row.created_at)}))});
 }
 if(path==='/api/studio/music/sessions'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  const rows=projectId
   ? await env.AZRAIL_D1.prepare(`SELECT * FROM music_sessions WHERE account_id=? AND project_id=? ORDER BY created_at DESC LIMIT 60`).bind(account,projectId).all<Record<string,unknown>>()
   : await env.AZRAIL_D1.prepare(`SELECT * FROM music_sessions WHERE account_id=? ORDER BY created_at DESC LIMIT 60`).bind(account).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({id:String(row.id),projectId:row.project_id?String(row.project_id):null,prompt:String(row.prompt),genre:String(row.genre),mood:String(row.mood),bpm:Number(row.bpm),keyRoot:String(row.key_root),scale:String(row.scale),bars:Number(row.bars),timeSignature:String(row.time_signature),pattern:String(row.pattern),arrangement:String(row.arrangement),synthPreset:String(row.synth_preset),seed:Number(row.seed),wavArtifactId:row.wav_artifact_id?String(row.wav_artifact_id):null,midiArtifactId:row.midi_artifact_id?String(row.midi_artifact_id):null,createdAt:Number(row.created_at)}))});
 }

 if(path==='/api/studio/als/reports'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  const rows=projectId
   ? await env.AZRAIL_D1.prepare(`SELECT id,project_id,source_artifact_id,file_name,ableton_version,bpm,time_signature,track_count,scene_count,issue_count,report_json,report_truncated,created_at FROM ableton_analyses WHERE account_id=? AND project_id=? ORDER BY created_at DESC LIMIT 40`).bind(account,projectId).all<Record<string,unknown>>()
   : await env.AZRAIL_D1.prepare(`SELECT id,project_id,source_artifact_id,file_name,ableton_version,bpm,time_signature,track_count,scene_count,issue_count,report_json,report_truncated,created_at FROM ableton_analyses WHERE account_id=? ORDER BY created_at DESC LIMIT 40`).bind(account).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({id:String(row.id),projectId:row.project_id?String(row.project_id):null,sourceArtifactId:row.source_artifact_id?String(row.source_artifact_id):null,fileName:String(row.file_name),abletonVersion:row.ableton_version?String(row.ableton_version):null,bpm:row.bpm===null||row.bpm===undefined?null:Number(row.bpm),timeSignature:row.time_signature?String(row.time_signature):null,trackCount:Number(row.track_count),sceneCount:Number(row.scene_count),issueCount:Number(row.issue_count),report:JSON.parse(String(row.report_json)),reportTruncated:Number(row.report_truncated)===1,createdAt:Number(row.created_at)}))});
 }
 if(path==='/api/studio/image/history'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  const rows=projectId
   ? await env.AZRAIL_D1.prepare(`SELECT g.id,g.artifact_id,g.operation,g.prompt,g.style,g.aspect_ratio,g.width,g.height,g.seed,g.variation_index,g.reference_artifact_id,g.model,g.created_at,a.name
      FROM image_generations g JOIN studio_artifacts a ON a.id=g.artifact_id AND a.account_id=g.account_id
      WHERE g.account_id=? AND g.project_id=? ORDER BY g.created_at DESC LIMIT 80`).bind(account,projectId).all<Record<string,unknown>>()
   : await env.AZRAIL_D1.prepare(`SELECT g.id,g.artifact_id,g.operation,g.prompt,g.style,g.aspect_ratio,g.width,g.height,g.seed,g.variation_index,g.reference_artifact_id,g.model,g.created_at,a.name
      FROM image_generations g JOIN studio_artifacts a ON a.id=g.artifact_id AND a.account_id=g.account_id
      WHERE g.account_id=? ORDER BY g.created_at DESC LIMIT 80`).bind(account).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({
   id:String(row.id),artifactId:String(row.artifact_id),url:`/api/studio/artifacts/${String(row.artifact_id)}?inline=1`,name:String(row.name),
   operation:String(row.operation),prompt:String(row.prompt),style:String(row.style),aspectRatio:String(row.aspect_ratio),
   width:Number(row.width),height:Number(row.height),seed:row.seed===null||row.seed===undefined?null:Number(row.seed),variationIndex:Number(row.variation_index??0),referenceArtifactId:row.reference_artifact_id?String(row.reference_artifact_id):null,model:String(row.model),createdAt:Number(row.created_at),
  }))});
 }
 if(path==='/api/studio/artifacts'&&request.method==='GET') {
  return json({artifacts:(await env.AZRAIL_D1.prepare('SELECT id,name,mime,bytes,created_at FROM studio_artifacts WHERE account_id=? ORDER BY created_at DESC LIMIT 100').bind(account).all()).results});
 }
 const match=path.match(/^\/api\/studio\/artifacts\/([a-f0-9-]{36})$/);
 if(match&&request.method==='GET') {
  const row=await env.AZRAIL_D1.prepare('SELECT r2_key,mime,name FROM studio_artifacts WHERE id=? AND account_id=?').bind(match[1],account).first<{r2_key:string;mime:string;name:string}>();
  if(!row)return json({error:'Файл не найден'},{status:404});
  const file=await env.AZRAIL_R2.get(row.r2_key);if(!file)return json({error:'Объект отсутствует в R2'},{status:404});
  const disposition=url.searchParams.get('inline')==='1'&&(/^(image\/(png|jpeg|webp)|video\/webm|audio\/wav)$/i.test(row.mime))?'inline':'attachment';
  return new Response(file.body,{headers:{'Content-Type':row.mime,'Content-Disposition':`${disposition}; filename*=UTF-8''${encodeURIComponent(row.name)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(match&&request.method==='DELETE') {
  return json(await deleteStudioArtifact(env,account,match[1]));
 }
 if(path==='/api/studio/data/reports'&&request.method==='GET') {
  const projectId=(url.searchParams.get('projectId')??'').trim();
  if(!projectId)throw new AccessError('Выберите Project.',400);
  await requireResource(env,auth.principal!,'project',projectId);
  const rows=await env.AZRAIL_D1.prepare(`SELECT id,project_id,dataset_artifact_id,file_name,delimiter,row_count,column_count,issue_count,transformations_json,schema_json,summary_json,created_at FROM data_analyses WHERE account_id=? AND project_id=? ORDER BY created_at DESC LIMIT 60`).bind(account,projectId).all<Record<string,unknown>>();
  return json({items:(rows.results??[]).map(row=>({id:String(row.id),projectId:String(row.project_id),artifactId:row.dataset_artifact_id?String(row.dataset_artifact_id):null,fileName:String(row.file_name),delimiter:String(row.delimiter),rowCount:Number(row.row_count),columnCount:Number(row.column_count),issueCount:Number(row.issue_count),transformations:JSON.parse(String(row.transformations_json)),schema:JSON.parse(String(row.schema_json)),summary:JSON.parse(String(row.summary_json)),createdAt:Number(row.created_at)}))});
 }
 if(path==='/api/studio/pulse'&&request.method==='GET') {
  return json(await buildPulseControlReport(request,env,auth.principal!));
 }
 if(path==='/api/studio/ledger'&&request.method==='GET') {
  const filters=parseLedgerFilters(url);
  if(filters.projectId)await requireResource(env,auth.principal!,'project',filters.projectId);
  return json(await buildLedgerReport(env,auth.principal!,filters));
 }
 if(request.method!=='POST')return json({error:'Маршрут не найден'},{status:404});

 if(path==='/api/studio/data/reports') {
  const body=await readJsonRecord(request,140000),input=parseDataReportRequest(body);
  await requireResource(env,auth.principal!,'project',input.projectId);
  await requireDataArtifact(env,account,input.artifactId,input.projectId);
  const id=crypto.randomUUID(),createdAt=Date.now();
  await env.AZRAIL_D1.prepare(`INSERT INTO data_analyses(id,account_id,project_id,dataset_artifact_id,file_name,delimiter,row_count,column_count,issue_count,transformations_json,schema_json,summary_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,account,input.projectId,input.artifactId,input.fileName,input.delimiter,input.rowCount,input.columnCount,input.issueCount,JSON.stringify(input.transformations),JSON.stringify(input.schema),JSON.stringify(input.summary),createdAt).run();
  emitEvent(env,{domain:'verification',type:'verification.data.analysis_saved',accountId:account,projectId:input.projectId,subjectType:'data_analysis',subjectId:id,actor:auth.principal!.id,payload:{datasetArtifactId:input.artifactId,fileName:input.fileName,rowCount:input.rowCount,columnCount:input.columnCount,issueCount:input.issueCount,transformations:input.transformations}}).catch(error=>log('warn','data.event_emit_failed',{id,error:error instanceof Error?error.message:String(error)}));
  return json({id,createdAt},{status:201});
 }

 if(path==='/api/studio/video/storyboards') {
  const body=await readJsonRecord(request,120000),input=parseVideo2StoryboardRequest(body);
  await requireResource(env,auth.principal!,'project',input.projectId);
  const id=crypto.randomUUID(),now=Date.now();
  await env.AZRAIL_D1.prepare(`INSERT INTO video_storyboards(id,account_id,project_id,title,prompt,aspect_ratio,resolution,export_profile,shots_json,continuity_json,reference_count,tracks_json,captions_json,grading_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,account,input.projectId,input.title,input.prompt,input.aspectRatio,input.resolution,input.exportProfile,JSON.stringify(input.shots),JSON.stringify(input.continuity),input.referenceCount,JSON.stringify(input.tracks),JSON.stringify(input.captions),JSON.stringify(input.grading),now,now).run();
  emitEvent(env,{domain:'publication',type:'publication.video.storyboard_saved',accountId:account,projectId:input.projectId,subjectType:'video_storyboard',subjectId:id,actor:auth.principal!.id,payload:{shotCount:input.shots.length,exportProfile:input.exportProfile,resolution:input.resolution,referenceCount:input.referenceCount}}).catch(error=>log('warn','video.storyboard_event_failed',{id,error:error instanceof Error?error.message:String(error)}));
  return json({id,createdAt:now,updatedAt:now},{status:201});
 }
 if(path==='/api/studio/video/plan') {
  const body=await readJsonRecord(request,20000),input=parseVideoPlanRequest(body);
  const plan=await accountCall(env,'@cf/openai/gpt-oss-20b',()=>buildVideoScenePlan(env,input,onProviderDispatch));
  return json(plan);
 }
 if(path==='/api/studio/prose'&&request.method==='POST') {
  const body=await readJsonRecord(request,20000),input=parseProseRequest(body);
  const prose=await accountCall(env,'@cf/openai/gpt-oss-20b',()=>buildProse(env,input,onProviderDispatch));
  return json(prose);
 }
 if(path==='/api/studio/video/sessions') {
  const body=await readJsonRecord(request,40000),input=parseVideoSessionRequest(body);
  if(input.projectId)await requireResource(env,auth.principal!,'project',input.projectId);
  await requireVideoArtifact(env,account,input.videoArtifactId,input.projectId);
  const id=crypto.randomUUID(),createdAt=Date.now();
  await env.AZRAIL_D1.prepare(`INSERT INTO video_sessions(id,account_id,project_id,prompt,aspect_ratio,resolution,duration_seconds,fps,transition,motion_preset,export_preset,scenes_json,has_audio,image_count,video_artifact_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,account,input.projectId||null,input.prompt,input.aspectRatio,input.resolution,input.durationSeconds,input.fps,input.transition,input.motionPreset,input.exportPreset,JSON.stringify(input.scenes),input.hasAudio?1:0,input.imageCount,input.videoArtifactId,createdAt).run();
  emitEvent(env,{domain:'publication',type:'publication.video.session_saved',accountId:account,projectId:input.projectId||undefined,subjectType:'video_session',subjectId:id,actor:auth.principal!.id,payload:{videoArtifactId:input.videoArtifactId,aspectRatio:input.aspectRatio,resolution:input.resolution,durationSeconds:input.durationSeconds,fps:input.fps,sceneCount:input.scenes.length,hasAudio:input.hasAudio,imageCount:input.imageCount}}).catch(error=>log('warn','video.event_emit_failed',{id,error:error instanceof Error?error.message:String(error)}));
  return json({id,createdAt},{status:201});
 }
 if(path==='/api/studio/music/daw-import') {
  const bytes=await readBoundedBody(request,DAW_IMPORT_COMPRESSED_LIMIT),projectId=(request.headers.get('X-Project-Id')??'').trim(),fileName=studioFilename(request,'project.dawproject');
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  let report:DAWImportReport;try{report=parseDAWImport(bytes,fileName);}catch(error){if(error instanceof DAWImportError)throw new AccessError(error.message,error.status);throw error;}
  const compatibility=pluginCompatibilityReport(report);
  if(!projectId)return json({report,compatibility,saved:false});
  const importId=crypto.randomUUID(),packed=compactDAWImportReport(report),mime=fileName.toLowerCase().endsWith('.dawproject')?'application/zip':fileName.toLowerCase().endsWith('.zip')?'application/zip':'application/octet-stream';
  const artifact=await saveArtifact(env,account,projectId,'music',fileName,mime,bytes,(artifactId,now)=>[env.AZRAIL_D1.prepare(`INSERT INTO music_daw_imports(id,account_id,project_id,source_artifact_id,file_name,format,application_name,application_version,bpm,time_signature,track_count,plugin_count,media_count,report_json,report_truncated,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(importId,account,projectId,artifactId,fileName,report.format,report.application.name,report.application.version,report.bpm,report.timeSignature,report.trackCount,report.summary.plugins,report.media.length,packed.json,packed.truncated?1:0,now)]);
  emitEvent(env,{domain:'verification',type:'verification.music.daw_import_completed',accountId:account,projectId,subjectType:'music_daw_import',subjectId:importId,actor:auth.principal!.id,payload:{sourceArtifactId:artifact.id,fileName,format:report.format,trackCount:report.trackCount,pluginCount:report.summary.plugins,mediaCount:report.media.length,reportTruncated:packed.truncated}}).catch(error=>log('warn','music.daw_import_event_failed',{importId,error:error instanceof Error?error.message:String(error)}));
  return json({report,compatibility,saved:true,importId,sourceArtifactId:artifact.id,reportTruncated:packed.truncated},{status:201});
 }
 if(path==='/api/studio/music/sessions') {
  const body=await readJsonRecord(request,20000),input=parseMusicSessionRequest(body);
  if(input.projectId)await requireResource(env,auth.principal!,'project',input.projectId);
  if(input.wavArtifactId)await requireMusicArtifact(env,account,input.wavArtifactId,'wav',input.projectId);
  if(input.midiArtifactId)await requireMusicArtifact(env,account,input.midiArtifactId,'midi',input.projectId);
  const id=crypto.randomUUID(),createdAt=Date.now();
  await env.AZRAIL_D1.prepare(`INSERT INTO music_sessions(id,account_id,project_id,prompt,genre,mood,bpm,key_root,scale,bars,time_signature,pattern,arrangement,synth_preset,seed,wav_artifact_id,midi_artifact_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,account,input.projectId||null,input.prompt,input.genre,input.mood,input.bpm,input.keyRoot,input.scale,input.bars,input.timeSignature,input.pattern,input.arrangement,input.synthPreset,input.seed,input.wavArtifactId,input.midiArtifactId,createdAt).run();
  emitEvent(env,{domain:'publication',type:'publication.music.session_saved',accountId:account,projectId:input.projectId||undefined,subjectType:'music_session',subjectId:id,actor:auth.principal!.id,payload:{bpm:input.bpm,keyRoot:input.keyRoot,scale:input.scale,bars:input.bars,wavArtifactId:input.wavArtifactId,midiArtifactId:input.midiArtifactId}}).catch(error=>log('warn','music.event_emit_failed',{id,error:error instanceof Error?error.message:String(error)}));
  return json({id,createdAt},{status:201});
 }
 if(path==='/api/studio/als') {
  const bytes=await readBoundedBody(request,ALS_COMPRESSED_LIMIT),projectId=(request.headers.get('X-Project-Id')??'').trim(),fileName=studioFilename(request,'project.als');
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  let report:ReturnType<typeof parseALSBuffer>;try{report=parseALSBuffer(bytes);}catch(error){if(error instanceof AbletonAnalysisError)throw new AccessError(error.message,error.status);throw error;}
  if(!projectId)return json({...report,saved:false});
  const analysisId=crypto.randomUUID(),packed=compactAbletonReport(report);
  let stored=packed.json,truncated=packed.truncated;
  if(stored.length>900_000){const reduced={...report,tracks:report.tracks.slice(0,120).map(track=>({...track,devices:track.devices.slice(0,30),routing:track.routing.slice(0,10)})),samples:report.samples.slice(0,200),masterChain:report.masterChain.slice(0,50)};stored=JSON.stringify(reduced);truncated=true;}
  if(stored.length>900_000){stored=JSON.stringify({format:report.format,abletonVersion:report.abletonVersion,bpm:report.bpm,timeSignature:report.timeSignature,keyRoot:report.keyRoot,keyScale:report.keyScale,locators:report.locators.slice(0,80),roleSummary:report.roleSummary,sceneCount:report.sceneCount,groups:report.groups,trackCount:report.trackCount,summary:report.summary,warnings:report.warnings,analysisBoundary:report.analysisBoundary,checks:{missingPlugins:report.checks.missingPlugins.slice(0,100),missingSamples:report.checks.missingSamples.slice(0,100),duplicatedProcessing:report.checks.duplicatedProcessing.slice(0,100),routingLoops:report.checks.routingLoops.slice(0,100),sidechainTopology:report.checks.sidechainTopology.slice(0,100),gainStagingWarnings:report.checks.gainStagingWarnings.slice(0,100),cpuHeavyDevices:report.checks.cpuHeavyDevices.slice(0,100),frozenTracks:report.checks.frozenTracks.slice(0,100),inactiveDevices:report.checks.inactiveDevices.slice(0,100)},tracks:[],samples:[],masterChain:[]});truncated=true;}
  const artifact=await saveArtifact(env,account,projectId,'als',fileName,'application/octet-stream',bytes,(artifactId,now)=>[env.AZRAIL_D1.prepare(`INSERT INTO ableton_analyses(id,account_id,project_id,source_artifact_id,file_name,ableton_version,bpm,time_signature,track_count,scene_count,issue_count,report_json,report_truncated,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(analysisId,account,projectId,artifactId,fileName,report.abletonVersion,report.bpm,report.timeSignature,report.trackCount,report.sceneCount,report.summary.issues,stored,truncated?1:0,now)]);
  emitEvent(env,{domain:'verification',type:'verification.ableton.analysis_completed',accountId:account,projectId,subjectType:'ableton_analysis',subjectId:analysisId,actor:auth.principal!.id,payload:{sourceArtifactId:artifact.id,fileName,trackCount:report.trackCount,sceneCount:report.sceneCount,issueCount:report.summary.issues,reportTruncated:truncated}}).catch(error=>log('warn','ableton.event_emit_failed',{analysisId,error:error instanceof Error?error.message:String(error)}));
  return json({...report,saved:true,analysisId,sourceArtifactId:artifact.id,reportTruncated:truncated},{status:201});
 }
 if(path==='/api/studio/artifacts') {
  const mime=request.headers.get('Content-Type')?.split(';')[0]??'application/octet-stream';
  let decoded:string;try{decoded=decodeURIComponent(request.headers.get('X-Filename')??'artifact.bin');}catch{throw new AccessError('Некорректная кодировка имени файла.',400);}
  const name=decoded.replace(/[\x00-\x1f/\\]/g,'_').slice(0,160).trim()||'artifact.bin';
  const projectId=(request.headers.get('X-Project-Id')??'').trim();
  const studioId=normalizeStudioId(request.headers.get('X-Studio-Id'));
  if(projectId)await requireResource(env,auth.principal!,'project',projectId);
  return json(await saveArtifactStream(env,account,projectId||null,studioId,name,mime,request,12*1024*1024),{status:201});
 }
 if(path==='/api/studio/image') {
  const body=await readJsonRecord(request,20000);
  const input=parseImageStudioRequest(body);
  if(input.projectId)await requireResource(env,auth.principal!,'project',input.projectId);
  const reference=input.referenceArtifactId?await loadReferenceImage(env,account,input.referenceArtifactId):undefined;
  if(input.maskArtifactId)await loadReferenceImage(env,account,input.maskArtifactId); // ownership/type validation; provider dispatch stays fail-closed until a reviewed mask-capable model is wired.
  const jobId=crypto.randomUUID(),jobModel=selectImageModel(input),{width,height}=imageDimensions(input.aspectRatio,input.operation==='upscale'?1024:input.resolution);
  const job=createImageJob(jobId,input.projectId||null,{prompt:input.prompt,referenceArtifactIds:input.referenceArtifactId?[input.referenceArtifactId]:[],maskArtifactId:input.maskArtifactId,width,height,style:input.style,styleLock:input.styleLock,identityConsistency:input.identityConsistency,brandConstraints:input.brandConstraints,structuralMode:input.structuralMode,restoration:input.restoration,provider:jobModel,seed:input.seed,operation:input.operation});
  await env.AZRAIL_D1.prepare(`INSERT INTO image_jobs(id,account_id,project_id,status,config_json,outputs_json,created_at) VALUES(?,?,?,?,?,'[]',?)`).bind(job.id,account,input.projectId||null,'queued',JSON.stringify(job.config),job.createdAt).run();
  await env.AZRAIL_D1.prepare(`UPDATE image_jobs SET status='running',started_at=? WHERE id=? AND account_id=?`).bind(Date.now(),jobId,account).run();
  const items=[] as Array<{id:string;artifactId:string;url:string;name:string;operation:string;prompt:string;style:string;aspectRatio:string;width:number;height:number;seed:number|null;model:string;createdAt:number}>;
  try {
   for(let variationIndex=0;variationIndex<input.variations;variationIndex++){
    const model=selectImageModel(input);
    const generated=await accountCall(env,model,()=>runImageProvider(env,input,variationIndex,reference,onProviderDispatch));
    const generationId=crypto.randomUUID(),createdAt=Date.now();
    const name=`pulse-image-${generationId}.${generated.extension}`;
    const artifact=await saveArtifact(env,account,input.projectId||null,'image',name,generated.mime,generated.bytes,(artifactId,now)=>[
     env.AZRAIL_D1.prepare(`INSERT INTO image_generations(id,account_id,project_id,artifact_id,operation,prompt,style,aspect_ratio,width,height,seed,variation_index,reference_artifact_id,model,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(generationId,account,input.projectId||null,artifactId,input.operation,input.prompt,input.style,input.aspectRatio,generated.width,generated.height,generated.seed,variationIndex,input.referenceArtifactId,generated.model,now),
    ]);
    const item={id:generationId,artifactId:artifact.id,url:`${artifact.url}?inline=1`,name:artifact.name,operation:input.operation,prompt:input.prompt,style:input.style,aspectRatio:input.aspectRatio,width:generated.width,height:generated.height,seed:generated.seed,model:generated.model,createdAt};
    items.push(item);
    emitEvent(env,{domain:'publication',type:'publication.image.generated',accountId:account,projectId:input.projectId||undefined,subjectType:'image_generation',subjectId:generationId,actor:auth.principal!.id,payload:{jobId,artifactId:artifact.id,operation:input.operation,model:generated.model,width:generated.width,height:generated.height,variationIndex}})
     .catch(error=>log('warn','image.event_emit_failed',{generationId,error:error instanceof Error?error.message:String(error)}));
   }
   await env.AZRAIL_D1.prepare(`UPDATE image_jobs SET status='completed',outputs_json=?,finished_at=? WHERE id=? AND account_id=?`).bind(JSON.stringify(items.map(item=>item.artifactId)),Date.now(),jobId,account).run();
   const first=items[0];
   return json({...first,items,job:{id:jobId,status:'completed'}},{status:201});
  } catch(error) {
   await env.AZRAIL_D1.prepare(`UPDATE image_jobs SET status='failed',error=?,finished_at=? WHERE id=? AND account_id=?`).bind((error instanceof Error?error.message:String(error)).slice(0,1000),Date.now(),jobId,account).run().catch(()=>{});
   throw error;
  }
 }
 if(path==='/api/studio/voice') {
  const bytes=await readBoundedBody(request,4*1024*1024);
  if(!bytes.length)return json({error:'Аудиозапись пуста'},{status:400});
  const audio=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
  const adapter=new CloudflareSpeechToTextAdapter(env);
  const result=await accountCall(env,'@cf/openai/whisper-large-v3-turbo',()=>adapter.transcribe({audio,mimeType:request.headers.get('Content-Type')??undefined,language:'ru'},onProviderDispatch));
  return json(result);
 }
 return json({error:'Маршрут не найден'},{status:404});
}

function intelligentAssetKind(mime:string,name:string){
 const m=mime.toLowerCase(),n=name.toLowerCase();
 if(m.startsWith('image/'))return 'image';
 if(m.startsWith('audio/'))return n.endsWith('.mid')||n.endsWith('.midi')?'midi':'audio';
 if(m.startsWith('video/'))return 'video';
 if(n.endsWith('.als')||n.endsWith('.dawproject'))return 'daw_project';
 if(/(?:json|xml|csv|text|pdf|word|document)/.test(m))return 'document';
 if(/\.(?:ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|css|html|vue|svelte)$/i.test(n))return 'code';
 return 'other';
}
function assetIntelligenceStatement(env:Env,id:string,account:string,studioId:ReturnType<typeof normalizeStudioId>,name:string,mime:string,bytes:number,projectId:string|null,now:number){
 const kind=intelligentAssetKind(mime,name),tags=[studioId,kind].filter(Boolean),metadata={name,mime,bytes,studioId,projectId,source:'artifact-save'};
 return env.AZRAIL_D1.prepare(`INSERT INTO asset_intelligence(artifact_id,account_id,kind,metadata_json,tags_json,embedding_ref,usage_count,updated_at) VALUES(?,?,?,?,?,NULL,0,?)`).bind(id,account,kind,JSON.stringify(metadata),JSON.stringify(tags),now);
}

async function saveArtifactStream(env:Env,account:string,projectId:string|null,studioId:ReturnType<typeof normalizeStudioId>,name:string,mime:string,request:Request,maxBytes:number) {
 const contentLengthRaw=request.headers.get('Content-Length');
 if(contentLengthRaw){
  const declared=Number(contentLengthRaw);
  if(!Number.isSafeInteger(declared)||declared<0)throw new AccessError('Некорректный Content-Length.',400);
  if(declared>maxBytes)throw new AccessError(`Файл больше ${Math.floor(maxBytes/1024/1024)}MB.`,413);
 }
 if(!request.body)throw new AccessError('Файл пуст.',400);
 const id=crypto.randomUUID(),key=`studio/${account}/${id}`;
 let bytes=0;
 const limiter=new TransformStream<Uint8Array,Uint8Array>({
  transform(chunk,controller){
   bytes+=chunk.byteLength;
   if(bytes>maxBytes)throw new AccessError(`Файл больше ${Math.floor(maxBytes/1024/1024)}MB.`,413);
   controller.enqueue(chunk);
  },
 });
 try {
  await env.AZRAIL_R2.put(key,request.body.pipeThrough(limiter),{httpMetadata:{contentType:mime}});
 } catch(error) {
  await deleteR2KeysBestEffort(env,[key],'studio.artifact_stream_stage_cleanup',{account,id});
  throw error;
 }
 if(bytes===0){
  await deleteR2KeysBestEffort(env,[key],'studio.artifact_stream_empty_cleanup',{account,id});
  throw new AccessError('Файл пуст.',400);
 }
 try {
  const now=Date.now();
  const statements=[env.AZRAIL_D1.prepare(`INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at)
   VALUES(?,?,?,?,?,?,?)`).bind(id,account,name,mime,key,bytes,now),assetIntelligenceStatement(env,id,account,studioId,name,mime,bytes,projectId,now)];
  if(projectId){
   statements.push(env.AZRAIL_D1.prepare('INSERT INTO studio_artifact_projects(artifact_id,project_id,studio_id,linked_at) VALUES(?,?,?,?)').bind(id,projectId,studioId,now));
   statements.push(env.AZRAIL_D1.prepare(`INSERT INTO project_profiles(project_id,pinned,studio_id,tags_json,created_at,updated_at) VALUES(?,0,?,'[]',?,?)
    ON CONFLICT(project_id) DO UPDATE SET studio_id=COALESCE(excluded.studio_id,project_profiles.studio_id),updated_at=excluded.updated_at`).bind(projectId,studioId,now,now));
   statements.push(env.AZRAIL_D1.prepare("UPDATE projects SET updated_at=datetime('now') WHERE id=?").bind(projectId));
  }
  await env.AZRAIL_D1.batch(statements);
 } catch(error) {
  const cleanup=await cleanupUnpublishedR2(
   env,[key],
   async()=>!!(await env.AZRAIL_D1.prepare('SELECT 1 AS ok FROM studio_artifacts WHERE id=? AND account_id=? AND r2_key=?').bind(id,account,key).first()),
   'studio.artifact_stream_publish_cleanup',{account,id,key},
  );
  if(cleanup.published===true)log('warn','studio.artifact_stream_publish_response_lost',{account,id,key});
  else throw error;
 }
 return {id,name,mime,bytes,url:`/api/studio/artifacts/${id}`};
}

async function saveArtifact(env:Env,account:string,projectId:string|null,studioId:ReturnType<typeof normalizeStudioId>,name:string,mime:string,bytes:Uint8Array,extraStatements?:(artifactId:string,now:number)=>D1PreparedStatement[]) {
 const id=crypto.randomUUID(),key=`studio/${account}/${id}`;
 try {
  await env.AZRAIL_R2.put(key,bytes,{httpMetadata:{contentType:mime}});
 } catch(error) {
  // Fresh unpublished key: if R2 committed but lost the response, deleting it
  // is still safe because no D1 row can reference it yet.
  await deleteR2KeysBestEffort(env,[key],'studio.artifact_stage_cleanup',{account,id});
  throw error;
 }
 try {
  const now=Date.now();
  const statements=[env.AZRAIL_D1.prepare(`INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at)
   VALUES(?,?,?,?,?,?,?)`).bind(id,account,name,mime,key,bytes.length,now),assetIntelligenceStatement(env,id,account,studioId,name,mime,bytes.length,projectId,now)];
  if(projectId){
   statements.push(env.AZRAIL_D1.prepare('INSERT INTO studio_artifact_projects(artifact_id,project_id,studio_id,linked_at) VALUES(?,?,?,?)').bind(id,projectId,studioId,now));
   statements.push(env.AZRAIL_D1.prepare(`INSERT INTO project_profiles(project_id,pinned,studio_id,tags_json,created_at,updated_at) VALUES(?,0,?,'[]',?,?)
    ON CONFLICT(project_id) DO UPDATE SET studio_id=COALESCE(excluded.studio_id,project_profiles.studio_id),updated_at=excluded.updated_at`).bind(projectId,studioId,now,now));
   statements.push(env.AZRAIL_D1.prepare("UPDATE projects SET updated_at=datetime('now') WHERE id=?").bind(projectId));
  }
  if(extraStatements)statements.push(...extraStatements(id,now));
  await env.AZRAIL_D1.batch(statements);
 } catch(error) {
  const cleanup=await cleanupUnpublishedR2(
   env,[key],
   async()=>!!(await env.AZRAIL_D1.prepare('SELECT 1 AS ok FROM studio_artifacts WHERE id=? AND account_id=? AND r2_key=?').bind(id,account,key).first()),
   'studio.artifact_publish_cleanup',{account,id,key},
  );
  if(cleanup.published===true){
   log('warn','studio.artifact_publish_response_lost',{account,id,key});
  } else {
   throw error;
  }
 }
 return {id,name,mime,bytes:bytes.length,url:`/api/studio/artifacts/${id}`};
}

async function deleteStudioArtifact(env:Env,account:string,id:string) {
 const row=await env.AZRAIL_D1.prepare('SELECT r2_key FROM studio_artifacts WHERE id=? AND account_id=?').bind(id,account).first<{r2_key:string}>();
 if(!row)throw new AccessError('Файл не найден',404);
 let deleted=false;
 try {
  const results=await env.AZRAIL_D1.batch([
   env.AZRAIL_D1.prepare('DELETE FROM studio_artifact_projects WHERE artifact_id=?').bind(id),
   env.AZRAIL_D1.prepare('DELETE FROM studio_artifacts WHERE id=? AND account_id=? RETURNING r2_key').bind(id,account),
  ]) as Array<{results?:unknown[]}>;
  deleted=!!results[1]?.results?.length;
 } catch(error) {
  // DELETE may have committed before its response was lost. Only remove R2
  // after D1 proves the authorization/publication row is gone. A failed
  // verification read is not proof of deletion and therefore fails closed.
  let stillThere:unknown;
  try {
   stillThere=await env.AZRAIL_D1.prepare('SELECT 1 AS ok FROM studio_artifacts WHERE id=? AND account_id=?').bind(id,account).first();
  } catch(verifyError) {
   log('error','studio.artifact_delete_verify_failed',{account,id,error:verifyError instanceof Error?verifyError.message:String(verifyError)});
   throw error;
  }
  if(stillThere)throw error;
  deleted=true;
 }
 if(!deleted)throw new AccessError('Файл не найден',404);
 const removed=await deleteR2KeysBestEffort(env,[row.r2_key],'studio.artifact_delete_cleanup',{account,id});
 if(!removed)log('warn','studio.artifact_r2_orphaned',{account,id,key:row.r2_key});
 return {deleted:true,id};
}
