import {renderMission} from './mission-view';
import {mountStudioDraft} from './studio-draft';
import {createNavigation,type Route} from './navigation';
import {studios,studioById,loadStudioModule} from './studio-registry';
import type {StudioId,StudioModule,StudioModuleContext} from './studio-types';
import {createProjectEventClient,type StreamEvent} from './event-stream';
import {renderProjectCenter,type ProjectSummary} from './projects';
import {createAttachmentManager} from './attachment-manager';
import {mountSuggestionBar,type Suggestion,type SuggestionContext} from './components/suggestions';
import {mountStudioToolbar} from './components/studio-toolbar';
import {createStudioStateController} from './components/studio-state';
import {renderSmartEmptyState} from './components/smart-empty';
import {mountModuleFrameActions} from './components/module-frame';
import {renderRecoveryError} from './components/error-recovery';
import {mountVoiceInput} from './components/voice-input';
import {mountCommandPalette} from './components/command-palette';
import {mountMetatronLab} from './metatron-lab';
import {openUniversalCompareCenter} from './components/universal-compare';
export {};
// Global safety net: uncaught errors and unhandled promise rejections surface to the user instead of failing silently.
function reportGlobalError(source:string,reason:unknown){
  const message=reason instanceof Error?reason.message:String(reason??'Unknown error');
  console.error(`[azrail-ui] ${source}:`,reason);
  if(typeof document==='undefined'||!document.body)return;
  let bar=document.getElementById('azrail-global-error');
  if(!bar){bar=document.createElement('div');bar.id='azrail-global-error';bar.setAttribute('role','alert');bar.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:10px 14px;border-radius:8px;background:#3b0d12;color:#fff;font:13px system-ui;display:flex;gap:12px;align-items:center';const text=document.createElement('span');text.className='azrail-global-error-text';const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть');close.onclick=()=>bar?.remove();bar.append(text,close);document.body.append(bar);}
  const text=bar.querySelector('.azrail-global-error-text');if(text)text.textContent=`Ошибка интерфейса: ${message.slice(0,300)}`;
}
if(typeof window!=='undefined'){
  window.addEventListener('error',e=>reportGlobalError('error',e.error??e.message));
  window.addEventListener('unhandledrejection',e=>reportGlobalError('unhandledrejection',e.reason));
}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const local=!/^https?:$/.test(location.protocol);
type Account={id:string;name:string;operator?:boolean;role?:'viewer'|'editor'|'admin'};
let account:Account|null=null,project='',mission='',pollTimer=0,epoch=0,studioEpoch=0,mediaCleanup=()=>{},lastBlob:Blob|null=null;
let draftCleanup=()=>{},studioChromeCleanup=()=>{},pollFailures=0,missionSubmitting=false,studioRun=0;
let preferredModel='';
let stopEventStream=()=>{},streamProject='';
let activeStudioModule:StudioModule|null=null,activeStudioContext:StudioModuleContext|null=null;
let metatronCleanup=()=>{};
// Токен-вход: единственный способ войти без регистрации OAuth-приложения у
// провайдера OIDC. Один и тот же заголовок Authorization принимает и общий
// bootstrap-секрет AZRAIL_TOKEN (роль admin, см. lib/auth.ts), и выданный
// администратором персональный ключ az_... (lib/accounts.ts) — выбор формата
// токена не касается интерфейса. Хранится только в sessionStorage текущей
// вкладки: closeTab = выход, как и у остальных локальных черновиков здесь.
let authToken='',oidcConfigured=true;
const prompt=$<HTMLTextAreaElement>('prompt');
const composer=$('composer'),missionPanel=$('mission-panel');
const composerHome=document.createComment('composer-home'),missionHome=document.createComment('mission-home');
composer.before(composerHome);missionPanel.before(missionHome);
const navigation=createNavigation(renderRoute);
let attachmentRefs:any[]=[],pending:{key:string;body:string}|null=null;
const attachmentManager=createAttachmentManager({root:$('attachment-manager'),input:$<HTMLInputElement>('attachments'),getProjectId:()=>project,api,failure,onChange:refs=>{attachmentRefs=refs;$('attachment-names').textContent=refs.length?`${refs.length} файл(ов) готово`:'';}});
function clearAttachments(){attachmentRefs=[];attachmentManager.clear();$('attachment-names').textContent='';}
try{pending=JSON.parse(sessionStorage.getItem('pulse.pending')??'null');project=sessionStorage.getItem('pulse.project')??'';mission=sessionStorage.getItem('pulse.mission')??'';authToken=sessionStorage.getItem('pulse.token')??'';preferredModel=sessionStorage.getItem('pulse.preferredModel')??'';}catch{}
function remember(){try{if(pending)sessionStorage.setItem('pulse.pending',JSON.stringify(pending));else sessionStorage.removeItem('pulse.pending');sessionStorage.setItem('pulse.project',project);sessionStorage.setItem('pulse.mission',mission);}catch{}}
function setPreferredModel(model:string){preferredModel=model;try{if(model)sessionStorage.setItem('pulse.preferredModel',model);else sessionStorage.removeItem('pulse.preferredModel');}catch{}}

let noticeTimer=0;
function notice(message:string,persist=false){clearTimeout(noticeTimer);$('notice-text').textContent=message;$('notice').hidden=false;if(!persist)noticeTimer=window.setTimeout(()=>{$('notice').hidden=true;},6500);}
$('notice-close').onclick=()=>{clearTimeout(noticeTimer);$('notice').hidden=true;};
function failure(e:unknown){notice(e instanceof Error?e.message:String(e),true);}
class APIError extends Error {
 constructor(message:string,readonly status:number,readonly code?:string,readonly body?:any){super(message);}
}
async function api(path:string,options:RequestInit={}) {
 if(local)throw Error('Этот файл показывает интерфейс и локальные студии. Для AI и проектов откройте развёрнутое приложение.');
 const headers=new Headers(options.headers);if(typeof options.body==='string'&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 if(authToken&&!headers.has('Authorization'))headers.set('Authorization','Bearer '+authToken);
 const r=await fetch(path,{...options,credentials:'same-origin',headers,signal:options.signal??AbortSignal.timeout(90000)});
 if(r.status===204)return null;
 if(r.status===401&&authToken){authToken='';try{sessionStorage.removeItem('pulse.token');}catch{}account=null;}
 const text=await r.text();let body:any;try{body=JSON.parse(text);}catch{}
 if(!r.ok)throw new APIError(typeof body?.error==='string'?body.error:`Сервис вернул ошибку ${r.status}. Повторите позже.`,r.status,body?.code,body);
 if(body===undefined)throw Error('Сервис вернул неполный ответ. Статус операции требует проверки.');return body;
}
async function blobAPI(path:string){const headers=new Headers();if(authToken)headers.set('Authorization','Bearer '+authToken);const r=await fetch(path,{credentials:'same-origin',headers,signal:AbortSignal.timeout(90000)});if(!r.ok){const j=await r.json().catch(()=>({}));throw new APIError(j.error??'Не удалось скачать файл.',r.status);}return r.blob();}
function bind(id:string,fn:()=>unknown){$(id).onclick=()=>Promise.resolve().then(fn).catch(failure);}
function dialog(title:string,html:string){$('dialog-title').textContent=title;const content=$('dialog-content');content.innerHTML=html;$<HTMLDialogElement>('dialog').showModal();return content;}
async function openAssetIntelligence(){
 if(!account)throw Error('Войдите, чтобы открыть Asset Intelligence Library.');
 const root=dialog('Asset Intelligence Library','<p class="muted">Загрузка…</p>');
 const query=project?`?projectId=${encodeURIComponent(project)}`:'';
 const response=await api('/api/studio/assets/intelligence'+query) as {items:Array<{id:string;name:string;mime:string;bytes:number;studioId:string|null;kind:string|null;tags:string[];usageCount:number;projectLinks:string[];versionOf:string|null;analysis:Record<string,unknown>;usageHistory:unknown[];metadata:Record<string,unknown>;embeddingRef:string|null}>};root.replaceChildren();
 if(!response.items.length){root.textContent='Артефактов пока нет.';return;}
 const summary=document.createElement('p');summary.className='context-note';summary.textContent='Единая библиотека: metadata · tags · project links · version lineage · analysis · usage history. Embedding остаётся evidence-backed: пустой embeddingRef не выдаётся за семантический индекс.';root.append(summary);
 const list=document.createElement('div');list.className='cards';for(const item of response.items.slice(0,120)){const card=document.createElement('article');card.className='card';const h=document.createElement('h3');h.textContent=item.name;const meta=document.createElement('p');meta.className='muted';meta.textContent=`${item.kind??'unclassified'} · ${item.mime} · ${Math.max(1,Math.ceil(item.bytes/1024))} KB${item.studioId?` · ${item.studioId}`:''}`;const tags=document.createElement('p');tags.textContent=(item.tags??[]).join(' · ')||'Без тегов';const evidence=document.createElement('small');evidence.textContent=`projects: ${(item.projectLinks??[]).join(', ')||'—'} · version of: ${item.versionOf??'—'} · usage: ${item.usageCount} · embedding: ${item.embeddingRef??'not indexed'}`;card.append(h,meta,tags,evidence);const detail={metadata:item.metadata??{},analysis:item.analysis??{},usageHistory:(item.usageHistory??[]).slice(-12)};if(Object.keys(detail.metadata).length||Object.keys(detail.analysis).length||detail.usageHistory.length){const pre=document.createElement('pre');pre.textContent=JSON.stringify(detail,null,2);card.append(pre);}list.append(card);}root.append(list);
}
async function openGlobalMemory(){
 if(!account)throw Error('Войдите, чтобы открыть Global Memory.');
 const query=project?`&projectId=${encodeURIComponent(project)}`:'';const root=dialog('Global Project Memory','<p class="muted">Загрузка…</p>');
 const response=await api(`/api/studio/intelligence/memory?scope=all${query}`) as {hierarchy?:string[];items:Array<{id:string;scope:string;key:string;value:unknown;source:string;whyStored:string;confidence:number;expiresAt:number|null;createdAt:number;updatedAt:number}>};root.replaceChildren();
 const note=document.createElement('p');note.className='context-note';note.textContent='AZRAIL Memory → User → Workspace → Project → Music/Image/Video → Agent → Session. Каждая запись показывает why stored, scope, TTL, source и confidence.';root.append(note);
 if(!response.items.length){root.append(document.createTextNode('Память пока пуста.'));return;}
 const scopes=response.hierarchy??['user','workspace','project','music','image','video','agent','session'];for(const scope of scopes){const items=response.items.filter(item=>item.scope===scope);if(!items.length)continue;const section=document.createElement('section');section.className='card';const title=document.createElement('h3');title.textContent=scope.toUpperCase();section.append(title);for(const item of items.slice(0,40)){const row=document.createElement('article');row.className='memory-row';const head=document.createElement('strong');head.textContent=item.key;const policy=document.createElement('small');const ttl=item.expiresAt?Math.max(0,Math.ceil((item.expiresAt-Date.now())/86400000))+'d':'persistent';policy.textContent=`source: ${item.source} · confidence: ${Math.round(item.confidence*100)}% · TTL: ${ttl} · why: ${item.whyStored}`;const pre=document.createElement('pre');pre.textContent=JSON.stringify(item.value,null,2);row.append(head,policy,pre);if(account.role!=='viewer'){const del=document.createElement('button');del.type='button';del.className='text-button';del.textContent='Forget';del.onclick=()=>api(`/api/studio/intelligence/memory?id=${encodeURIComponent(item.id)}`,{method:'DELETE'}).then(()=>openGlobalMemory()).catch(failure);row.append(del);}section.append(row);}root.append(section);}
}
async function openSystemHistory(){
 if(!account)throw Error('Войдите, чтобы открыть System History.');if(!project)throw Error('Сначала выберите проект.');const root=dialog('System History / Undo','<p class="muted">Загрузка…</p>');const response=await api(`/api/studio/system/history?projectId=${encodeURIComponent(project)}`) as {items:Array<{id:string;source:string;type:string;domain:string;createdAt:number|string;summary:string;undoable:boolean;undoHint?:string}>};root.replaceChildren();
 const note=document.createElement('p');note.className='context-note';note.textContent='История — immutable evidence. Event-level Undo по умолчанию fail-closed; восстановление выполняется только через доказанный Project Version / subsystem snapshot flow и создаёт новую revision.';const versions=document.createElement('button');versions.type='button';versions.className='text-button';versions.textContent='Open Project Version History';versions.onclick=()=>{$<HTMLDialogElement>('dialog').close();$<HTMLButtonElement>('project-history').click();};root.append(note,versions);const list=document.createElement('div');list.className='cards';for(const item of response.items.slice(0,160)){const card=document.createElement('article');card.className='card';const h=document.createElement('strong');h.textContent=item.summary;const meta=document.createElement('small');meta.textContent=`${item.domain} · ${item.source} · ${new Date(item.createdAt).toLocaleString()}`;const undo=document.createElement('p');undo.className='muted';undo.textContent=item.undoable?`UNDO AVAILABLE: ${item.undoHint??''}`:`NO AUTO-UNDO: ${item.undoHint??''}`;card.append(h,meta,undo);list.append(card);}if(!response.items.length)list.append(document.createTextNode('История пока пуста.'));root.append(list);
}
async function openSystemReadiness(){
 if(!account)throw Error('Войдите, чтобы открыть Series G readiness.');const root=dialog('Series G · Browser QA / Real E2E','<p class="muted">Загрузка…</p>');const r=await api('/api/studio/system/readiness') as any;root.replaceChildren();const pre=document.createElement('pre');pre.textContent=JSON.stringify(r,null,2);const note=document.createElement('p');note.className='context-note';note.textContent=r.browserQA?.realBrowserConfigured?'Browser binding configured; live proof всё равно требует deployed authenticated target.':'Real browser binding не настроен: static preview QA не считается real-browser PASS.';root.append(note,pre);
}
async function loadSystemSuggestions(context:SuggestionContext):Promise<Suggestion[]>{
 if(local||!account)return [];try{const r=await api('/api/studio/system/suggestions',{method:'POST',body:JSON.stringify({...context,projectId:project||context.projectId})}) as {items?:Suggestion[]};return r.items??[];}catch{return [];}
}
async function openCompareCenter(){
 if(!account)throw Error('Войдите, чтобы открыть Compare Mode.');
 await openUniversalCompareCenter({api,blobAPI,dialog,notice,projectId:project,studioId:activeStudioContext?.meta.id});
}
async function startProfessionalReviewMission(){
 const context=activeStudioContext;if(!context?.startMission)throw Error('Откройте Studio с активным mission workflow.');
 await context.startMission(`Проведи Professional Review текущего результата в ${context.meta.title}. Используй только доступные evidence/измерения и не придумывай PASS. Классифицируй findings строго как Critical, Major, Minor или Improvement. Для каждого finding укажи code, message, target и safeAutoFix=true только если исправление локальное, обратимое и не требует deploy/push/внешней мутации. Сохрани структурированный review через существующий /api/studio/review для текущего project/studio, если этот внутренний маршрут доступен агенту. Ничего не исправляй до отдельного выбора пользователя.`);
}
type ReviewFindingUI={severity:'critical'|'major'|'minor'|'improvement';code?:string;message:string;safeAutoFix?:boolean;target?:string};
type ReviewItemUI={id:string;studioId:string;subjectType:string;subjectId?:string|null;counts:{critical:number;major:number;minor:number;improvement:number};findings:ReviewFindingUI[];createdAt:number};
async function startSafeReviewRepair(item:ReviewItemUI,mode:'critical'|'all'){
 const context=activeStudioContext;if(!context?.startMission||context.meta.id!==item.studioId)throw Error(`Откройте ${studioById(item.studioId as StudioId)?.title??item.studioId}, затем повторите действие.`);
 const candidates=item.findings.filter(f=>f.safeAutoFix===true&&(mode==='all'||f.severity==='critical'));
 if(!candidates.length)throw Error(mode==='critical'?'В этом review нет Critical findings с доказанным safeAutoFix=true. Нужна ручная проверка.':'В этом review нет findings с доказанным safeAutoFix=true.');
 const lines=candidates.map((f,i)=>`${i+1}. [${f.severity.toUpperCase()}] ${f.code??'review'}${f.target?` · ${f.target}`:''}: ${f.message}`).join('\n');
 await context.startMission(`Professional Review remediation для ${context.meta.title}. Исправь ТОЛЬКО перечисленные findings, где review уже зафиксировал safeAutoFix=true:\n${lines}\nГраницы: только локальные обратимые изменения; не делать deploy, push, PR, remote migration или внешние действия. Перед каждой правкой проверь, что precondition всё ещё актуален. После изменений запусти релевантные локальные проверки и не объявляй проблему исправленной без evidence. Если любой finding больше не безопасен — остановись и пометь его manual review required.`);
}
async function openReviewHistory(){
 if(!account)throw Error('Войдите, чтобы открыть Professional Review.');const studioId=activeStudioContext?.meta.id??'',query=new URLSearchParams();if(project)query.set('projectId',project);if(studioId)query.set('studioId',studioId);const root=dialog('Professional Review','<p class="muted">Загрузка…</p>');const response=await api('/api/studio/review?'+query.toString()) as {items:ReviewItemUI[]};root.replaceChildren();
 const intro=document.createElement('p');intro.className='context-note';intro.textContent='Review не равен автоприменению. Fix critical / Fix all safe запускают только findings с safeAutoFix=true; остальные остаются manual review required.';root.append(intro);
 const run=document.createElement('button');run.type='button';run.className='primary';run.textContent='Запустить Professional Review';run.disabled=!activeStudioContext?.startMission;run.onclick=()=>startProfessionalReviewMission().then(()=>{$<HTMLDialogElement>('dialog').close();}).catch(failure);root.append(run);
 if(!response.items.length){const empty=document.createElement('p');empty.textContent='Сохранённых reviews пока нет.';root.append(empty);return;}
 const list=document.createElement('div');list.className='cards';for(const item of response.items){const card=document.createElement('article');card.className='card';const h=document.createElement('h3');h.textContent=`${studioById(item.studioId as StudioId)?.title??item.studioId} · ${item.subjectType}`;const meta=document.createElement('p');meta.className='muted';meta.textContent=`Critical ${item.counts.critical} · Major ${item.counts.major} · Minor ${item.counts.minor} · Improvement ${item.counts.improvement} · ${new Date(item.createdAt).toLocaleString()}`;const ul=document.createElement('ul');for(const finding of item.findings.slice(0,20)){const li=document.createElement('li');li.textContent=`${finding.severity.toUpperCase()}${finding.safeAutoFix?' · SAFE FIX':''}: ${finding.message}`;ul.append(li);}const actions=document.createElement('div');actions.className='toolbar';const critical=document.createElement('button');critical.type='button';critical.textContent='Fix critical';critical.disabled=!item.findings.some(f=>f.severity==='critical'&&f.safeAutoFix===true)||activeStudioContext?.meta.id!==item.studioId;critical.title=critical.disabled?'Доступно только в исходной Studio и только для Critical findings с safeAutoFix=true.':'Запустить безопасный локальный repair mission';critical.onclick=()=>startSafeReviewRepair(item,'critical').then(()=>{$<HTMLDialogElement>('dialog').close();}).catch(failure);const safe=document.createElement('button');safe.type='button';safe.textContent='Fix all safe issues';safe.disabled=!item.findings.some(f=>f.safeAutoFix===true)||activeStudioContext?.meta.id!==item.studioId;safe.onclick=()=>startSafeReviewRepair(item,'all').then(()=>{$<HTMLDialogElement>('dialog').close();}).catch(failure);const manual=document.createElement('button');manual.type='button';manual.textContent='Review manually';const details=document.createElement('pre');details.hidden=true;details.textContent=JSON.stringify(item.findings,null,2);manual.onclick=()=>{details.hidden=!details.hidden;manual.textContent=details.hidden?'Review manually':'Hide manual review';};actions.append(critical,safe,manual);card.append(h,meta,ul,actions,details);list.append(card);}root.append(list);
}

bind('close-dialog',()=>$<HTMLDialogElement>('dialog').close());
function cleanupMedia(){const cleanup=mediaCleanup;mediaCleanup=()=>{};cleanup();}
function leaveStudio(){studioEpoch++;studioRun++;if(activeStudioModule&&activeStudioContext)activeStudioModule.cleanup?.(activeStudioContext);activeStudioModule=null;activeStudioContext=null;draftCleanup();draftCleanup=()=>{};studioChromeCleanup();studioChromeCleanup=()=>{};cleanupMedia();lastBlob=null;composerHome.after(composer);missionHome.after(missionPanel);$('studio-work').hidden=true;$('studio-toolbar').replaceChildren();$('studio-suggestions').replaceChildren();$('studio-controls').replaceChildren();$('studio-result').replaceChildren();$('studio-result').removeAttribute('aria-busy');}
function renderRoute(route:Route,initial:boolean){
 leaveStudio();metatronCleanup();metatronCleanup=()=>{};const id=route.page==='studio'?'studio-page':route.page;
 document.querySelectorAll<HTMLElement>('.view').forEach(el=>el.hidden=el.id!==id);
 const nav=route.page==='studio'?'studios':route.page;
 document.querySelectorAll('.nav').forEach(el=>{const active=el.getAttribute('data-view')===nav;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 if(route.page==='studio')void renderStudio(route.studio).catch(failure);
 if(route.page==='projects')loadProjects().catch(failure);
 if(route.page==='connections')loadConnections().catch(failure);
 if(route.page==='metatron')metatronCleanup=mountMetatronLab({root:$('metatron-page'),api,local,account,getProjectId:()=>project,getMissionId:()=>mission,setMissionId:id=>{mission=id;remember();},notice,failure});
 const title=route.page==='studio'?studioById(route.studio)!.title:route.page==='create'?'Создать':route.page==='projects'?'Проекты':route.page==='studios'?'Студии':route.page==='metatron'?'Metatron Lab':route.page==='connections'?'Connections':'Страница не найдена';
 document.title=`${title} · AZRAIL MNMLL PULSE OS`;
 if(!initial){document.querySelector<HTMLElement>(`#${id} h1`)?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function view(id:'create'|'projects'|'studios'){navigation.navigate({page:id});}
navigation.link(document.querySelector<HTMLAnchorElement>('[data-home]')!,{page:'create'});
document.querySelectorAll<HTMLAnchorElement>('[data-view]').forEach(el=>navigation.link(el,{page:el.dataset.view as 'create'|'projects'|'studios'|'metatron'|'connections'}));
navigation.link($<HTMLAnchorElement>('close-studio'),{page:'studios'});
navigation.link($<HTMLAnchorElement>('connections'),{page:'connections'});
document.querySelectorAll<HTMLElement>('[data-prompt]').forEach(el=>el.onclick=()=>{prompt.value=el.dataset.prompt!;prompt.focus();});
document.addEventListener('azrail:open-studio',(event:Event)=>{const id=(event as CustomEvent<{studio?:string}>).detail?.studio;if(id&&studioById(id))navigation.navigate({page:'studio',studio:id as StudioId});});
const chatSuggestionBar=mountSuggestionBar($('chat-suggestions'),{surface:'chat',projectId:project||undefined,lastUserMessage:prompt.value},item=>{prompt.value=item.prompt;prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();});
prompt.addEventListener('input',()=>chatSuggestionBar.update({surface:'chat',projectId:project||undefined,lastUserMessage:prompt.value}));
bind('attach',()=>{if(!project){project=crypto.randomUUID();remember();}$<HTMLInputElement>('attachments').click();});
bind('account',async()=>{
 if(!account){
  if(local)throw Error('Вход доступен после развёртывания приложения.');
  if(oidcConfigured){location.assign('/auth/login');return;}
  // Без OIDC — единственный путь входа, уже реализованный на сервере
  // (lib/auth.ts, timing-safe сравнение, fail-closed без секрета):
  // общий AZRAIL_TOKEN или персональный ключ az_..., выданный
  // администратором через /api/admin/accounts.
  dialog('Вход по токену','<p>OIDC не настроен на этом развёртывании — регистрация внешнего OAuth-приложения не требуется. Введите токен доступа.</p><label for="login-token">Токен</label><input id="login-token" type="password" autocomplete="off" spellcheck="false"><button id="login-save" class="primary">Войти</button>');
  $('login-token').focus();
  bind('login-save',async()=>{
   const value=$<HTMLInputElement>('login-token').value.trim();
   if(!value)throw Error('Введите токен.');
   authToken=value;try{sessionStorage.setItem('pulse.token',authToken);}catch{}
   try{const me=await api('/api/me');account=me.account;}
   catch(e){authToken='';try{sessionStorage.removeItem('pulse.token');}catch{};throw e;}
   $<HTMLDialogElement>('dialog').close();$('account').textContent=account!.name;await refreshMode();
   if(mission){$('mission-panel').hidden=false;await poll(++epoch);}
   notice('Вход выполнен.');
  });
  return;
 }
 dialog('Ваш аккаунт','<p id="account-name"></p><p id="account-id"></p><button id="logout">Выйти</button>');
 $('account-name').textContent=account.name;$('account-id').textContent=account.id;
 bind('logout',async()=>{
  const wasToken=!!authToken;
  if(wasToken){authToken='';try{sessionStorage.removeItem('pulse.token');}catch{}}
  else await api('/auth/logout',{method:'POST'});
  for(const key of ['pulse.pending','pulse.project','pulse.mission','pulse.image.pending'])sessionStorage.removeItem(key);
  location.reload();
 });
});
async function refreshAccount(){
 if(local){$('local-notice').textContent='Локальный просмотр · WAV/MIDI, аудиоанализ и CSV доступны на устройстве. Для AI и проектов нужен вход в развёрнутое приложение.';$('local-notice').hidden=false;$('mode').textContent='AI подключается после развёртывания';return;}
 const a=await api('/auth/status');account=a.account;oidcConfigured=!!a.configured;
 if(!account&&authToken){try{const me=await api('/api/me');account=me.account;}catch{authToken='';try{sessionStorage.removeItem('pulse.token');}catch{}}}
 if(account){$('account').textContent=account.name;await refreshMode();ensureEventStream();if(mission){$('mission-panel').hidden=false;await poll(++epoch);}}
 else if(!oidcConfigured)notice('OIDC не настроен. Войдите по токену через кнопку «Аккаунт» — регистрация внешнего приложения не нужна.');
}
async function refreshMode(){const r=await api('/api/routing-settings');$('mode').textContent=r.policy.allowThirdPartyModels?'Сторонние модели включены':'Сторонние модели выключены';return r;}
bind('settings',async()=>{
 if(!account)throw Error('Войдите, чтобы посмотреть режим и лимиты.');
 const r=await refreshMode();dialog('Режим и лимиты','<label><input type="checkbox" id="third-party"> Сторонние AI-модели</label><label for="budget">Месячный лимит платных моделей, USD</label><input id="budget" type="number" min="0" step="1"><p id="budget-info"></p><p>OFF блокирует сторонние модели. На Workers Paid даже собственные модели могут расходовать деньги сверх квоты. R2 и Sandbox учитываются отдельно.</p><button id="save-mode" class="primary">Сохранить</button><button id="catalog">Каталог моделей</button><button id="open-connections">Connections ↗</button>');
 $<HTMLInputElement>('third-party').checked=r.policy.allowThirdPartyModels;$<HTMLInputElement>('budget').value=String(r.policy.monthlyBudgetUsd);$('budget-info').textContent=`Учтено и зарезервировано: $${r.committedUsd.toFixed(4)}. План: ${r.workersPlan}.`;
 $<HTMLButtonElement>('save-mode').disabled=!account.operator;
 if(!account.operator)$('budget-info').textContent+=' Изменения доступны оператору платформы.';
 bind('save-mode',async()=>{await api('/api/admin/routing-settings',{method:'POST',body:JSON.stringify({allowThirdPartyModels:$<HTMLInputElement>('third-party').checked,monthlyBudgetUsd:Number($<HTMLInputElement>('budget').value)})});await refreshMode();notice('Настройки сохранены на сервере.');});
 bind('catalog',async()=>{const cat=await api('/api/model-catalog');const pre=document.createElement('pre');pre.textContent=JSON.stringify(cat,null,2);$('dialog-content').append(pre);});
 bind('open-connections',()=>{$<HTMLDialogElement>('dialog').close();navigation.navigate({page:'connections'});});
});
function ensureEventStream(){
 if(local||!account||!project){stopEventStream();stopEventStream=()=>{};streamProject='';return;}
 if(streamProject===project)return;
 stopEventStream();streamProject=project;
 stopEventStream=createProjectEventClient({api,projectId:project,onEvent:(event:StreamEvent)=>{
  if(event.missionId&&event.missionId===mission&&!document.hidden){clearTimeout(pollTimer);pollTimer=window.setTimeout(()=>void poll(epoch),120);}
 }});
}
bind('about',()=>dialog('AZRAIL × MNMLL PULSE','<p>Мультиагентное ядро AZRAIL и творческие инструменты PULSE в одном приложении. У каждого модуля студий своя страница.</p><p>Текст и голос → миссия → файлы проекта → проверка. Результат не получает статус готовности к публикации без успешной проверки кода.</p><p>Музыка здесь — локальный procedural synthesis. Video Studio использует AI только для Scene Builder, а preview/WebM рендерит локально через Canvas + MediaRecorder. Cloudflare Stream/Veo не выдаются за подключённые, пока binding не настроен и не проверен.</p>'));
async function runMission(){
 if(missionSubmitting)return;
 if(!account)throw Error('Войдите в аккаунт, чтобы запустить AZRAIL.');
 if(account.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');
 const message=prompt.value.trim();if(!message)return;
 if(attachmentManager.hasPending())throw Error('Дождитесь окончания загрузки вложений.');if(attachmentManager.hasFailed())throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');if(!pending){project=project||crypto.randomUUID();pending={key:crypto.randomUUID(),body:JSON.stringify({message,projectId:project,maxIterations:8,attachments:attachmentRefs,...(preferredModel?{preferredModel}:{})})};}
 remember();
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 try{const r=await api('/api/mission',{method:'POST',headers:{'Idempotency-Key':pending.key},body:pending.body});mission=r.missionId;pending=null;remember();$('mission-panel').hidden=false;ensureEventStream();await poll(++epoch);}
 catch(e){
  // A definite admission rejection is editable. Network errors, 5xx and an
  // in-flight 409 retain the exact request/key: its delivery is uncertain.
  if(e instanceof APIError&&([400,401,403,404,405,413,415,422,429].includes(e.status)||e.code==='project_busy')){pending=null;remember();}
  throw e;
 }
 finally{missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;}
}
$('composer').onsubmit=e=>{e.preventDefault();runMission().catch(failure);};
async function poll(version=epoch){
 clearTimeout(pollTimer);if(!mission||document.hidden)return;
 try {const r=await api(`/api/mission?missionId=${encodeURIComponent(mission)}`);if(version!==epoch)return;pollFailures=0;const state=renderMission(document,r,!!account?.operator);if(state.active)pollTimer=window.setTimeout(()=>void poll(version),3000);}
 catch(e){if(version!==epoch)return;pollFailures++;$('mission-connection').textContent=e instanceof APIError&&e.status===401?'Сессия завершена. Войдите снова, чтобы продолжить просмотр.':'Связь прервана. Задача может продолжать работу на сервере. Повторная отправка не выполняется.';if(!(e instanceof APIError&&[401,403,404].includes(e.status))&&pollFailures<6)pollTimer=window.setTimeout(()=>void poll(version),Math.min(30000,3000*2**pollFailures));}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll().catch(failure);else clearTimeout(pollTimer);});
bind('resume',()=>poll(++epoch));
bind('cancel',async()=>{if(mission){await api('/api/mission/cancel',{method:'POST',body:JSON.stringify({missionId:mission,projectId:project})});await poll(++epoch);}});
bind('export-project',async()=>{if(!project)throw Error('Выберите проект.');const {download}=await import('./media');download(await blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(project)}`),'azrail-project.zip');});
bind('recover',async()=>{if(!mission)throw Error('Выберите миссию.');const r=await api('/api/mission/recover',{method:'POST',body:JSON.stringify({projectId:project,missionId:mission})});notice(r.resumed?'Миссия возобновлена.':r.reason);await poll(++epoch);});
bind('permit-sandbox',async()=>{if(!account?.operator)throw Error('Разрешение Sandbox выдаёт оператор платформы.');const c=await api('/api/studio/capabilities');if(!c.sandbox)throw Error('Sandbox отсутствует в этом профиле. Нужен Paid-профиль Cloudflare.');await api('/api/admin/permissions',{method:'POST',body:JSON.stringify({projectId:project,capability:'sandbox',enabled:true})});notice('Sandbox разрешён для этого проекта. Его использование тарифицируется отдельно.');});

function openProjectFromCenter(item:ProjectSummary){
 if(pending&&project!==item.id){notice('Предыдущая отправка требует проверки. Повторите её перед сменой проекта.',true);return;}
 if(project!==item.id)clearAttachments();project=item.id;mission=item.missionId??'';remember();ensureEventStream();const studio=item.studioId&&studioById(item.studioId as StudioId)?item.studioId as StudioId:null;if(studio)navigation.navigate({page:'studio',studio});else view('create');$('mission-panel').hidden=!mission;if(mission)poll(++epoch).catch(failure);prompt.focus();
}
async function loadProjects(){
 await renderProjectCenter({account,local,selectedProjectId:project,api,blobAPI,onOpen:openProjectFromCenter,notice,failure,dialog,closeDialog:()=>$<HTMLDialogElement>('dialog').close()});
}
for(const studio of studios){
 const el=document.createElement('a');el.className='card';el.dataset.studio=studio.id;el.dataset.icon=studio.icon;
 const small=document.createElement('small'),h=document.createElement('h3'),p=document.createElement('p'),action=document.createElement('span');
 small.textContent=studio.type;h.textContent=studio.title;p.textContent=studio.description;action.className='card-action';action.textContent=studio.action+' ↗';
 el.append(small,h,p,action);navigation.link(el,{page:'studio',studio:studio.id});$('studio-list').append(el);
}
function studioContext(meta:ReturnType<typeof studioById>,token:number,runToken:number,signal?:AbortSignal):StudioModuleContext{
 if(!meta)throw Error('Студия не найдена.');
 return {
  meta,controls:$('studio-controls'),result:$('studio-result'),account,projectId:project,composer,missionPanel,api,blobAPI,notice,failure,signal,currentProjectId:()=>project,startMission:async message=>{prompt.value=message;await runMission();},dialog,closeDialog:()=>$<HTMLDialogElement>('dialog').close(),
  current:()=>token===studioEpoch&&runToken===studioRun,
  mountDraft:(server,options)=>{draftCleanup();draftCleanup=mountStudioDraft($('studio-controls'),meta.id,api,server,options);},
  setMediaCleanup:(cleanup)=>{mediaCleanup=cleanup;},setLastBlob:(blob)=>{lastBlob=blob;},
 };
}
async function renderStudio(id:StudioId){
 const meta=studioById(id);if(!meta)return;
 const token=++studioEpoch,state=createStudioStateController('IDLE');state.set('READY');
 $('studio-work').hidden=false;$('studio-title').textContent=meta.title;$('studio-description').textContent=meta.description;$('studio-type').textContent=meta.type;
 const controls=$('studio-controls'),result=$('studio-result');controls.replaceChildren();result.replaceChildren();
 const module=await loadStudioModule(id);if(token!==studioEpoch)return;
 const mountContext=studioContext(meta,token,studioRun);activeStudioModule=module;activeStudioContext=mountContext;
 await module.mount(mountContext);if(token!==studioEpoch)return;
 const run=controls.querySelector<HTMLButtonElement>('#studio-run');
 if(module.run&&!run)throw Error(`Studio ${id} did not mount #studio-run.`);
 if(run)run.textContent=module.action+' ↗';
 const readOnly=account?.role==='viewer'&&module.capabilities.includes('cloud-write');
 if(run&&(module.cloud&&!account||readOnly)){run.disabled=true;const info=document.createElement('p');info.className='context-note';info.textContent=readOnly?'Ваш аккаунт разрешает только просмотр.':'Для этого инструмента войдите в развёрнутое приложение.';controls.append(info);}
 const modulePermissions=['module.view'];
 if(!account||account.role!=='viewer'){modulePermissions.push('module.configure');if(module.run)modulePermissions.push('module.execute');}
 if(account?.operator||account?.role==='admin')modulePermissions.push('module.manage');
 let moduleRuns=0,lastModuleRunMs=0;
 const moduleFrame=mountModuleFrameActions(controls,id,{
  definition:{id,type:meta.type,title:`${meta.title} · Module`,status:'idle',capabilities:[...meta.capabilities],permissions:modulePermissions,resourceUsage:{runs:0,last_ms:0}},
  permissions:modulePermissions,
  onRetry:run?()=>run.click():undefined,
  shortcuts:run?[{id:'run',label:'Run module',keys:'Alt+Enter',permission:'module.execute',run:()=>{if(!run.disabled)run.click();}}]:[],
  persistKey:`azrail.module.${id}.${project||'local'}`,
 });
 const suggestionContext:SuggestionContext={surface:id,projectId:project||undefined,activeModel:preferredModel||'AUTO',capabilities:meta.capabilities,hasResult:false};
 const suggestion=mountSuggestionBar($('studio-suggestions'),suggestionContext,(item:Suggestion)=>{
  const field=controls.querySelector<HTMLTextAreaElement|HTMLInputElement>('#studio-text');if(field){field.value=item.prompt;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();notice(`Подсказка добавлена: ${item.label}`);return;}
  if(mountContext.startMission)void mountContext.startMission(item.prompt).catch(failure);
 });
 void loadSystemSuggestions(suggestionContext).then(items=>{if(token===studioEpoch&&items.length)suggestion.update({...suggestionContext,remoteSuggestions:items});});
 const toolbar=mountStudioToolbar({host:$('studio-toolbar'),meta,state,run,stop:()=>{if(['RUNNING','PAUSED'].includes(state.get())){state.set('CANCELLING');cleanupMedia();state.set('READY');notice('Операция остановлена.');}},openHistory:()=>{const button=$<HTMLButtonElement>('project-history');if(project&&account)button.click();else notice('История проекта появится после выбора сохранённого проекта.');},openCompare:()=>{void openCompareCenter().catch(failure);},openReview:()=>{void openReviewHistory().catch(failure);},openHelp:()=>$<HTMLButtonElement>('shortcuts').click(),loadModels:account&&meta.capabilities.includes('mission')?async()=>{const catalog=await api('/api/model-catalog') as {models?:Array<{slug:string;task?:string;freeAllowlisted?:boolean;reviewed?:boolean;provider?:string;capabilities?:string[];contextWindow?:number|null;speedProfile?:'fast'|'balanced'|'quality'|'unknown';costProfile?:'free-allowlisted'|'policy-gated'|'unknown';availability?:'available'|'unavailable'}>};return catalog.models??[];}:undefined,getPreferredModel:()=>preferredModel,setPreferredModel:model=>{setPreferredModel(model);suggestion.update({surface:id,projectId:project||undefined,activeModel:model||'AUTO',capabilities:meta.capabilities,hasResult:!!result.textContent?.trim()});notice(model?`Модель закреплена: ${model}`:'AUTO router включён.');}});
 studioChromeCleanup=()=>{toolbar.destroy();suggestion.destroy();moduleFrame.destroy();};
 renderSmartEmptyState(result,meta);
 if(!module.run||!run)return;
 toolbar.setRunEnabled(!run.disabled);run.hidden=true;
 run.onclick=()=>Promise.resolve().then(async()=>{
  if(run.disabled)return;run.disabled=true;toolbar.setRunEnabled(false);state.set('RUNNING');moduleFrame.clearError();moduleFrame.setStatus('loading');const moduleStarted=performance.now();moduleRuns++;moduleFrame.setResourceUsage({runs:moduleRuns,last_ms:lastModuleRunMs});const runToken=++studioRun,current=()=>token===studioEpoch&&runToken===studioRun;
  const abort=new AbortController();cleanupMedia();mediaCleanup=()=>abort.abort();lastBlob=null;
  result.textContent=module.pendingLabel??'Выполняю…';result.setAttribute('aria-busy','true');moduleFrame.setStatus('running');
  const runContext=studioContext(meta,token,runToken,abort.signal) as StudioModuleContext & {signal:AbortSignal};activeStudioContext=runContext;
  try{await module.run!(runContext);if(current()){state.set('COMPLETED');moduleFrame.setStatus('success');moduleFrame.recordHistory('Run completed');}}
  catch(error){if(current()){if(abort.signal.aborted){if(state.get()!=='READY')state.set('READY');moduleFrame.setStatus('idle');moduleFrame.recordHistory('Run cancelled');result.textContent='Операция остановлена. Параметры сохранены.';return;}state.set('FAILED');moduleFrame.setError(error,()=>run.click());renderRecoveryError(result,error,{retry:()=>run.click(),restore:()=>{draftCleanup();void renderStudio(id);},openLogs:()=>{if(project&&mission){missionPanel.hidden=false;return poll(++epoch);}notice('Логи миссии появятся после запуска задачи.');},report:()=>{prompt.value=`Проверь ошибку в ${meta.title}: ${error instanceof Error?error.message:String(error)}`;navigation.navigate({page:'create'});prompt.focus();}});throw error;}}
  finally{lastModuleRunMs=Math.max(0,Math.round(performance.now()-moduleStarted));moduleFrame.setResourceUsage({runs:moduleRuns,last_ms:lastModuleRunMs});run.disabled=false;toolbar.setRunEnabled(true);if(current())result.setAttribute('aria-busy','false');suggestion.update({surface:id,projectId:project||undefined,activeModel:preferredModel||'AUTO',capabilities:meta.capabilities,hasResult:true});}
 }).catch(failure);
}
const voiceInput=mountVoiceInput({button:$<HTMLButtonElement>('voice'),prompt,api,canUse:()=>!!account,notice,failure});
const commandPalette=mountCommandPalette(()=>[
 {id:'open-create',label:'Open Chat / Создать',keywords:['chat','create'],run:()=>navigation.navigate({page:'create'})},
 {id:'open-projects',label:'Open Projects',keywords:['projects','project'],run:()=>navigation.navigate({page:'projects'})},
 {id:'open-metatron',label:'Open Metatron Lab',keywords:['metatron','agents','mission graph','operations'],run:()=>navigation.navigate({page:'metatron'})},
 {id:'open-connections',label:'Open Connections',keywords:['connectors','integrations'],run:()=>navigation.navigate({page:'connections'})},
 ...studios.map(meta=>({id:`studio-${meta.id}`,label:`Open ${meta.title}`,keywords:[meta.description,meta.id],run:()=>navigation.navigate({page:'studio',studio:meta.id})})),
 {id:'run-mission',label:'Run mission / Отправить запрос',keywords:['run','mission'],disabled:()=>!prompt.value.trim(),run:()=>composer.dispatchEvent(new Event('submit',{cancelable:true}))},
 {id:'stop-mission',label:'Stop mission',keywords:['cancel','abort'],disabled:()=>!mission,run:()=>$( 'cancel' ).click()},
 {id:'history',label:'Open project history',keywords:['history','versions'],disabled:()=>!project||!account,run:()=>$( 'project-history' ).click()},
 {id:'asset-library',label:'Open Asset Intelligence Library',keywords:['assets','library','images','audio','documents'],disabled:()=>!account,run:()=>openAssetIntelligence().catch(failure)},
 {id:'global-memory',label:'Open Global Memory',keywords:['memory','context','knowledge','ttl','scope'],disabled:()=>!account,run:()=>openGlobalMemory().catch(failure)},
 {id:'system-history',label:'Open System History / Undo',keywords:['history','undo','events','tasks'],disabled:()=>!project||!account,run:()=>openSystemHistory().catch(failure)},
 {id:'series-g-readiness',label:'Open Browser QA / Real E2E readiness',keywords:['browser','qa','e2e','series g'],disabled:()=>!account,run:()=>openSystemReadiness().catch(failure)},
 {id:'compare-mode',label:'Open Compare Mode · A | B',keywords:['compare','a b','versions','before after'],disabled:()=>!account,run:()=>openCompareCenter().catch(failure)},
 {id:'professional-review',label:'Open Professional Review',keywords:['review','quality','critical','major','minor','safe fix'],disabled:()=>!account,run:()=>openReviewHistory().catch(failure)},
 {id:'shortcuts',label:'Open shortcuts',keywords:['help','keyboard'],run:()=>$( 'shortcuts' ).click()},
]);
navigation.render(true);
refreshAccount().then(()=>{if(!local&&account)navigation.render(true);}).catch(failure);
// Avoid keeping a previous large export reachable after leaving its studio.
window.addEventListener('pagehide',()=>{stopEventStream();draftCleanup();cleanupMedia();voiceInput.destroy();commandPalette.destroy();lastBlob=null;});
void lastBlob;

bind('shortcuts',()=>dialog('Горячие клавиши','<p>Ctrl / ⌘ + K — Command Palette.</p><p>Ctrl / ⌘ + Enter — отправить запрос.</p><p>Alt + 1 — создать; Alt + 2 — проекты; Alt + 3 — студии.</p><p>В Studio: ↶ / ↷ управляет историей черновика; Stop отменяет текущую локальную/сетевую операцию через AbortController.</p><p>Escape — закрыть окно.</p>'));
document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing)return;if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&document.activeElement===prompt){e.preventDefault();$('composer').dispatchEvent(new Event('submit',{cancelable:true}));}if(e.altKey&&['1','2','3'].includes(e.key)){e.preventDefault();view((['create','projects','studios'] as const)[Number(e.key)-1]);}});


async function loadConnections(){
 const host=$('connections-page');
 if(local){host.replaceChildren(document.createTextNode('Connections доступны в развёрнутом приложении.'));return;}
 if(!account){const p=document.createElement('p');p.className='context-note';p.textContent='Войдите, чтобы управлять подключениями вашего аккаунта.';host.replaceChildren(p);return;}
 const {renderConnections}=await import('./connectors');await renderConnections(host,api,{role:account.role});
}

if(new URLSearchParams(location.search).get('connected')==='1'){notice('Сервис подключён. Откройте Подключения и проверьте соединение.');history.replaceState(null,'',location.pathname+location.hash);}

bind('project-design',async()=>{if(!project||!account)throw Error('Откройте свой проект.');const path='/api/studio/design-contract?projectId='+encodeURIComponent(project),r=await api(path);dialog('Design Contract','<p>Контракт задаёт типографику, сетку, breakpoints, component density и обязательные UI states до генерации кода.</p><label for="design-accent">Акцент</label><input id="design-accent" type="color"><label for="design-font">Характер шрифта</label><select id="design-font"><option value="sans-serif">Прямой гротеск</option><option value="serif">С засечками</option><option value="monospace">Моноширинный</option></select><label for="design-density">Плотность компонентов</label><select id="design-density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select><label for="design-gutter">Grid gutter, px</label><input id="design-gutter" type="number" min="8" max="48"><label for="design-max-width">Max content width, px</label><input id="design-max-width" type="number" min="960" max="1920"><label for="design-action">Основное действие</label><input id="design-action" maxlength="60"><p class="muted">Responsive contract: 390 / 768 / 1024 / 1440. Empty state — guided, error state — recoverable.</p><button id="design-save" class="primary">Сохранить контракт</button>');$<HTMLInputElement>('design-accent').value=r.contract.accent;$<HTMLSelectElement>('design-font').value=r.contract.fontFamily;$<HTMLSelectElement>('design-density').value=r.contract.components?.density??'comfortable';$<HTMLInputElement>('design-gutter').value=String(r.contract.grid?.gutter??24);$<HTMLInputElement>('design-max-width').value=String(r.contract.grid?.maxWidth??1440);$<HTMLInputElement>('design-action').value=r.contract.primaryAction;bind('design-save',async()=>{await api(path,{method:'PUT',body:JSON.stringify({baseRevision:r.revision,contract:{...r.contract,version:2,accent:$<HTMLInputElement>('design-accent').value,fontFamily:$<HTMLSelectElement>('design-font').value,primaryAction:$<HTMLInputElement>('design-action').value,grid:{...r.contract.grid,gutter:Number($<HTMLInputElement>('design-gutter').value),maxWidth:Number($<HTMLInputElement>('design-max-width').value)},components:{...r.contract.components,density:$<HTMLSelectElement>('design-density').value}}})});$<HTMLDialogElement>('dialog').close();notice('Design Contract сохранён. Следующие UI-правки обязаны учитывать сетку, breakpoints и состояния.');});});

// История версий: project_versions копится давно (UI/Code Agent), API чтения
// (lib/versions.ts) и восстановления тоже уже есть и защищены тем же
// requireResource, что и остальные /api/projects/*. Экрана не было — только
// это и добавлено. Восстановление намеренно не пишет файлы автоматически
// (см. комментарий у маршрута в src/index.ts): пользователь получает список
// файлов версии и решает сам, что с ним делать — скачать по одному.
type ProjectVersion={id:string;versionNumber:number;summary:string|null;createdByAgent:string|null;createdAt:string};
type RestoredVersion={version:ProjectVersion;files:Array<{path:string;content:string}>;truncated?:boolean};
bind('project-history',async()=>{
 if(!project||!account)throw Error('Откройте свой проект.');
 dialog('История версий','<div id="version-list" class="cards"></div><div id="version-restore"></div>');
 const list=$('version-list');
 const r=await api(`/api/projects/${encodeURIComponent(project)}/versions`) as {data:ProjectVersion[]};
 if(!r.data.length){list.textContent='У этого проекта пока нет сохранённых версий.';return;}
 for(const v of r.data){
  const card=document.createElement('div');card.className='card';
  const h=document.createElement('h3');h.textContent=`Версия ${v.versionNumber}`;
  const meta=document.createElement('p');meta.className='muted';meta.textContent=`${new Date(v.createdAt).toLocaleString()} · ${v.createdByAgent??'—'}`;
  const summary=document.createElement('p');summary.textContent=v.summary??'Без описания.';
  card.append(h,meta,summary);
  if(account.role!=='viewer'){
   const btn=document.createElement('button');btn.textContent='Восстановить';
   btn.onclick=()=>{
    if(btn.disabled)return;btn.disabled=true;
    api(`/api/projects/${encodeURIComponent(project)}/versions/${encodeURIComponent(v.id)}/restore`,{method:'POST'})
     .then((res:{data:RestoredVersion;warning?:string})=>{
      const out=$('version-restore');out.replaceChildren();
      if(res.warning){const w=document.createElement('p');w.className='muted';w.textContent=res.warning;out.append(w);}
      if(!res.data.files.length){out.append(document.createTextNode('В этой версии нет файлов.'));return;}
      const ul=document.createElement('ul');
      for(const f of res.data.files){
       const li=document.createElement('li');
       const code=document.createElement('code');code.textContent=f.path;
       const dl=document.createElement('button');dl.className='text-button';dl.textContent='Скачать';
       dl.onclick=()=>import('./media').then(m=>m.download(new Blob([f.content]),f.path.split('/').pop()||'file.txt'));
       li.append(code,document.createTextNode(' '),dl);ul.append(li);
      }
      out.append(ul);
     })
     .catch(failure).finally(()=>{btn.disabled=false;});
   };
   card.append(btn);
  }
  list.append(card);
 }
});

// Резервные копии: backupProject/restoreBackup (lib/backups.ts) уже
// реализованы и провалидированы (sha256 на файл, лимит 1000 файлов/16 МиБ,
// восстановление только в пустой НОВЫЙ project — рабочие файлы никогда не
// перезаписываются молча). Не хватало экрана создания/просмотра/восстановления.
type BackupManifest={id:string;created_at:number;file_count:number};
bind('project-backups',async()=>{
 if(!project||!account)throw Error('Откройте свой проект.');
 const viewer=account.role==='viewer';
 dialog('Резервные копии',viewer?'<div id="backup-list" class="cards"></div>':'<button id="backup-create" class="primary">Создать копию сейчас</button><div id="backup-list" class="cards"></div>');
 async function refresh(){
  const list=$('backup-list');list.textContent='Загрузка…';
  const r=await api(`/api/backups?projectId=${encodeURIComponent(project)}`) as {backups:BackupManifest[]};
  list.replaceChildren();
  if(!r.backups.length){list.textContent='Резервных копий ещё нет.';return;}
  for(const b of r.backups){
   const card=document.createElement('div');card.className='card';
   const h=document.createElement('h3');h.textContent=new Date(b.created_at).toLocaleString();
   const meta=document.createElement('p');meta.className='muted';meta.textContent=`Файлов: ${b.file_count} · ${b.id.slice(0,8)}`;
   card.append(h,meta);
   if(!viewer){
    const btn=document.createElement('button');btn.textContent='Восстановить в новый проект';
    btn.onclick=()=>{
     if(btn.disabled)return;btn.disabled=true;
     const target=crypto.randomUUID();
     api('/api/backups/restore',{method:'POST',body:JSON.stringify({projectId:project,backupId:b.id,targetProjectId:target})})
      .then(()=>{
       $<HTMLDialogElement>('dialog').close();
       notice(`Копия восстановлена в новый проект. Открываю его.`);
       project=target;mission='';remember();ensureEventStream();view('create');
      })
      .catch(failure).finally(()=>{btn.disabled=false;});
    };
    card.append(btn);
   }
   list.append(card);
  }
 }
 if(!viewer)bind('backup-create',async()=>{await api('/api/backups',{method:'POST',body:JSON.stringify({projectId:project})});notice('Резервная копия создана.');await refresh();});
 await refresh();
});
