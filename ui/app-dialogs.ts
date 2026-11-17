import type {Suggestion,SuggestionContext} from './components/suggestions';
import type {StudioId,StudioModuleContext} from './studio-types';
import {studioById} from './studio-registry';
import {openUniversalCompareCenter} from './components/universal-compare';

type ReviewFindingUI={severity:'critical'|'major'|'minor'|'improvement';code?:string;message:string;safeAutoFix?:boolean;target?:string};
type ReviewItemUI={id:string;studioId:string;subjectType:string;subjectId?:string|null;counts:{critical:number;major:number;minor:number;improvement:number};findings:ReviewFindingUI[];createdAt:number};

export type AppDialogsDeps={
 api:(path:string,options?:RequestInit)=>Promise<any>;
 blobAPI:(path:string)=>Promise<any>;
 dialog:(title:string,html:string)=>HTMLElement;
 notice:(message:string,persist?:boolean)=>void;
 failure:(error:unknown)=>void;
 getAccount:()=>{role?:string;operator?:boolean}|null;
 isLocal:()=>boolean;
 getProject:()=>string;
 getStudio:()=>StudioModuleContext|null;
};

export function createAppDialogs(deps:AppDialogsDeps){
 const {api,blobAPI,dialog,notice,failure}=deps;
 const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
async function openAssetIntelligence(){
 if(!deps.getAccount())throw Error('Войдите, чтобы открыть Asset Intelligence Library.');
 const root=dialog('Asset Intelligence Library','<p class="muted">Загрузка…</p>');
 const query=deps.getProject()?`?projectId=${encodeURIComponent(deps.getProject())}`:'';
 const response=await api('/api/studio/assets/intelligence'+query) as {items:Array<{id:string;name:string;mime:string;bytes:number;studioId:string|null;kind:string|null;tags:string[];usageCount:number;projectLinks:string[];versionOf:string|null;analysis:Record<string,unknown>;usageHistory:unknown[];metadata:Record<string,unknown>;embeddingRef:string|null}>};root.replaceChildren();
 if(!response.items.length){root.textContent='Артефактов пока нет.';return;}
 const summary=document.createElement('p');summary.className='context-note';summary.textContent='Единая библиотека: metadata · tags · project links · version lineage · analysis · usage history. Embedding остаётся evidence-backed: пустой embeddingRef не выдаётся за семантический индекс.';root.append(summary);
 const list=document.createElement('div');list.className='cards';for(const item of response.items.slice(0,120)){const card=document.createElement('article');card.className='card';const h=document.createElement('h3');h.textContent=item.name;const meta=document.createElement('p');meta.className='muted';meta.textContent=`${item.kind??'unclassified'} · ${item.mime} · ${Math.max(1,Math.ceil(item.bytes/1024))} KB${item.studioId?` · ${item.studioId}`:''}`;const tags=document.createElement('p');tags.textContent=(item.tags??[]).join(' · ')||'Без тегов';const evidence=document.createElement('small');evidence.textContent=`projects: ${(item.projectLinks??[]).join(', ')||'—'} · version of: ${item.versionOf??'—'} · usage: ${item.usageCount} · embedding: ${item.embeddingRef??'not indexed'}`;card.append(h,meta,tags,evidence);const detail={metadata:item.metadata??{},analysis:item.analysis??{},usageHistory:(item.usageHistory??[]).slice(-12)};if(Object.keys(detail.metadata).length||Object.keys(detail.analysis).length||detail.usageHistory.length){const pre=document.createElement('pre');pre.textContent=JSON.stringify(detail,null,2);card.append(pre);}list.append(card);}root.append(list);
}
async function openGlobalMemory(){
 if(!deps.getAccount())throw Error('Войдите, чтобы открыть Global Memory.');
 const query=deps.getProject()?`&projectId=${encodeURIComponent(deps.getProject())}`:'';const root=dialog('Global Project Memory','<p class="muted">Загрузка…</p>');
 const response=await api(`/api/studio/intelligence/memory?scope=all${query}`) as {hierarchy?:string[];items:Array<{id:string;scope:string;key:string;value:unknown;source:string;whyStored:string;confidence:number;expiresAt:number|null;createdAt:number;updatedAt:number}>};root.replaceChildren();
 const note=document.createElement('p');note.className='context-note';note.textContent='AZRAIL Memory → User → Workspace → Project → Music/Image/Video → Agent → Session. Каждая запись показывает why stored, scope, TTL, source и confidence.';root.append(note);
 if(!response.items.length){root.append(document.createTextNode('Память пока пуста.'));return;}
 const scopes=response.hierarchy??['user','workspace','project','music','image','video','agent','session'];for(const scope of scopes){const items=response.items.filter(item=>item.scope===scope);if(!items.length)continue;const section=document.createElement('section');section.className='card';const title=document.createElement('h3');title.textContent=scope.toUpperCase();section.append(title);for(const item of items.slice(0,40)){const row=document.createElement('article');row.className='memory-row';const head=document.createElement('strong');head.textContent=item.key;const policy=document.createElement('small');const ttl=item.expiresAt?Math.max(0,Math.ceil((item.expiresAt-Date.now())/86400000))+'d':'persistent';policy.textContent=`source: ${item.source} · confidence: ${Math.round(item.confidence*100)}% · TTL: ${ttl} · why: ${item.whyStored}`;const pre=document.createElement('pre');pre.textContent=JSON.stringify(item.value,null,2);row.append(head,policy,pre);if(deps.getAccount()?.role!=='viewer'){const del=document.createElement('button');del.type='button';del.className='text-button';del.textContent='Forget';del.onclick=()=>api(`/api/studio/intelligence/memory?id=${encodeURIComponent(item.id)}`,{method:'DELETE'}).then(()=>openGlobalMemory()).catch(failure);row.append(del);}section.append(row);}root.append(section);}
}
async function openSystemHistory(){
 if(!deps.getAccount())throw Error('Войдите, чтобы открыть System History.');if(!deps.getProject())throw Error('Сначала выберите проект.');const root=dialog('System History / Undo','<p class="muted">Загрузка…</p>');const response=await api(`/api/studio/system/history?projectId=${encodeURIComponent(deps.getProject())}`) as {items:Array<{id:string;source:string;type:string;domain:string;createdAt:number|string;summary:string;undoable:boolean;undoHint?:string}>};root.replaceChildren();
 const note=document.createElement('p');note.className='context-note';note.textContent='История — immutable evidence. Event-level Undo по умолчанию fail-closed; восстановление выполняется только через доказанный Project Version / subsystem snapshot flow и создаёт новую revision.';const versions=document.createElement('button');versions.type='button';versions.className='text-button';versions.textContent='Open Project Version History';versions.onclick=()=>{$<HTMLDialogElement>('dialog').close();$<HTMLButtonElement>('project-history').click();};root.append(note,versions);const list=document.createElement('div');list.className='cards';for(const item of response.items.slice(0,160)){const card=document.createElement('article');card.className='card';const h=document.createElement('strong');h.textContent=item.summary;const meta=document.createElement('small');meta.textContent=`${item.domain} · ${item.source} · ${new Date(item.createdAt).toLocaleString()}`;const undo=document.createElement('p');undo.className='muted';undo.textContent=item.undoable?`UNDO AVAILABLE: ${item.undoHint??''}`:`NO AUTO-UNDO: ${item.undoHint??''}`;card.append(h,meta,undo);list.append(card);}if(!response.items.length)list.append(document.createTextNode('История пока пуста.'));root.append(list);
}
async function openSystemReadiness(){
 if(!deps.getAccount())throw Error('Войдите, чтобы открыть Series G readiness.');const root=dialog('Series G · Browser QA / Real E2E','<p class="muted">Загрузка…</p>');const r=await api('/api/studio/system/readiness') as any;root.replaceChildren();const pre=document.createElement('pre');pre.textContent=JSON.stringify(r,null,2);const note=document.createElement('p');note.className='context-note';note.textContent=r.browserQA?.realBrowserConfigured?'Browser binding configured; live proof всё равно требует deployed authenticated target.':'Real browser binding не настроен: static preview QA не считается real-browser PASS.';root.append(note,pre);
}
async function loadSystemSuggestions(context:SuggestionContext):Promise<Suggestion[]>{
 if(deps.isLocal()||!deps.getAccount())return [];try{const r=await api('/api/studio/system/suggestions',{method:'POST',body:JSON.stringify({...context,projectId:deps.getProject()||context.projectId})}) as {items?:Suggestion[]};return r.items??[];}catch{return [];}
}
async function openCompareCenter(){
 if(!deps.getAccount())throw Error('Войдите, чтобы открыть Compare Mode.');
 await openUniversalCompareCenter({api,blobAPI,dialog,notice,projectId:deps.getProject(),studioId:deps.getStudio()?.meta.id});
}
async function startProfessionalReviewMission(){
 const context=deps.getStudio();if(!context?.startMission)throw Error('Откройте Studio с активным mission workflow.');
 await context.startMission(`Проведи Professional Review текущего результата в ${context.meta.title}. Используй только доступные evidence/измерения и не придумывай PASS. Классифицируй findings строго как Critical, Major, Minor или Improvement. Для каждого finding укажи code, message, target и safeAutoFix=true только если исправление локальное, обратимое и не требует deploy/push/внешней мутации. Сохрани структурированный review через существующий /api/studio/review для текущего project/studio, если этот внутренний маршрут доступен агенту. Ничего не исправляй до отдельного выбора пользователя.`);
}
async function startSafeReviewRepair(item:ReviewItemUI,mode:'critical'|'all'){
 const context=deps.getStudio();if(!context?.startMission||context.meta.id!==item.studioId)throw Error(`Откройте ${studioById(item.studioId as StudioId)?.title??item.studioId}, затем повторите действие.`);
 const candidates=item.findings.filter(f=>f.safeAutoFix===true&&(mode==='all'||f.severity==='critical'));
 if(!candidates.length)throw Error(mode==='critical'?'В этом review нет Critical findings с доказанным safeAutoFix=true. Нужна ручная проверка.':'В этом review нет findings с доказанным safeAutoFix=true.');
 const lines=candidates.map((f,i)=>`${i+1}. [${f.severity.toUpperCase()}] ${f.code??'review'}${f.target?` · ${f.target}`:''}: ${f.message}`).join('\n');
 await context.startMission(`Professional Review remediation для ${context.meta.title}. Исправь ТОЛЬКО перечисленные findings, где review уже зафиксировал safeAutoFix=true:\n${lines}\nГраницы: только локальные обратимые изменения; не делать deploy, push, PR, remote migration или внешние действия. Перед каждой правкой проверь, что precondition всё ещё актуален. После изменений запусти релевантные локальные проверки и не объявляй проблему исправленной без evidence. Если любой finding больше не безопасен — остановись и пометь его manual review required.`);
}
async function openReviewHistory(){
 if(!deps.getAccount())throw Error('Войдите, чтобы открыть Professional Review.');const studioId=deps.getStudio()?.meta.id??'',query=new URLSearchParams();if(deps.getProject())query.set('projectId',deps.getProject());if(studioId)query.set('studioId',studioId);const root=dialog('Professional Review','<p class="muted">Загрузка…</p>');const response=await api('/api/studio/review?'+query.toString()) as {items:ReviewItemUI[]};root.replaceChildren();
 const intro=document.createElement('p');intro.className='context-note';intro.textContent='Review не равен автоприменению. Fix critical / Fix all safe запускают только findings с safeAutoFix=true; остальные остаются manual review required.';root.append(intro);
 const run=document.createElement('button');run.type='button';run.className='primary';run.textContent='Запустить Professional Review';run.disabled=!deps.getStudio()?.startMission;run.onclick=()=>startProfessionalReviewMission().then(()=>{$<HTMLDialogElement>('dialog').close();}).catch(failure);root.append(run);
 if(!response.items.length){const empty=document.createElement('p');empty.textContent='Сохранённых reviews пока нет.';root.append(empty);return;}
 const list=document.createElement('div');list.className='cards';for(const item of response.items){const card=document.createElement('article');card.className='card';const h=document.createElement('h3');h.textContent=`${studioById(item.studioId as StudioId)?.title??item.studioId} · ${item.subjectType}`;const meta=document.createElement('p');meta.className='muted';meta.textContent=`Critical ${item.counts.critical} · Major ${item.counts.major} · Minor ${item.counts.minor} · Improvement ${item.counts.improvement} · ${new Date(item.createdAt).toLocaleString()}`;const ul=document.createElement('ul');for(const finding of item.findings.slice(0,20)){const li=document.createElement('li');li.textContent=`${finding.severity.toUpperCase()}${finding.safeAutoFix?' · SAFE FIX':''}: ${finding.message}`;ul.append(li);}const actions=document.createElement('div');actions.className='toolbar';const critical=document.createElement('button');critical.type='button';critical.textContent='Fix critical';critical.disabled=!item.findings.some(f=>f.severity==='critical'&&f.safeAutoFix===true)||deps.getStudio()?.meta.id!==item.studioId;critical.title=critical.disabled?'Доступно только в исходной Studio и только для Critical findings с safeAutoFix=true.':'Запустить безопасный локальный repair mission';critical.onclick=()=>startSafeReviewRepair(item,'critical').then(()=>{$<HTMLDialogElement>('dialog').close();}).catch(failure);const safe=document.createElement('button');safe.type='button';safe.textContent='Fix all safe issues';safe.disabled=!item.findings.some(f=>f.safeAutoFix===true)||deps.getStudio()?.meta.id!==item.studioId;safe.onclick=()=>startSafeReviewRepair(item,'all').then(()=>{$<HTMLDialogElement>('dialog').close();}).catch(failure);const manual=document.createElement('button');manual.type='button';manual.textContent='Review manually';const details=document.createElement('pre');details.hidden=true;details.textContent=JSON.stringify(item.findings,null,2);manual.onclick=()=>{details.hidden=!details.hidden;manual.textContent=details.hidden?'Review manually':'Hide manual review';};actions.append(critical,safe,manual);card.append(h,meta,ul,actions,details);list.append(card);}root.append(list);
}


 return {openAssetIntelligence,openGlobalMemory,openSystemHistory,openSystemReadiness,loadSystemSuggestions,openCompareCenter,openReviewHistory,startProfessionalReviewMission};
}
