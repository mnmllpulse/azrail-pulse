import {renderMission} from './mission-view';
import {createSettingsPage} from './settings-page';
import {APIError} from './api-error';
import {localCommandOf,blockedReply,limitsText,type LimitsRead} from './chat-local-commands';
import {chatRequestBody,chatReplyOf,chatFailureOf} from './chat-send';
import {hydrateIcons,icon} from './icons';
import {createAccountMenu} from './account-menu';
import {mountWorkspaceShell} from './components/workspace-shell';
import {createChatHistory,renderChatMessages} from './chat-history';
import {createStudioRooms} from './studio-chat';
import {mountStudioDraft} from './studio-draft';
import {createNavigation,type Route} from './navigation';
import {studios,studioById,loadStudioModule} from './studio-registry';
import type {StudioId,StudioModule,StudioModuleContext} from './studio-types';
import {createProjectEventClient,type StreamEvent} from './event-stream';
import {renderProjectCenter,type ProjectSummary} from './projects';
import {createAttachmentManager} from './attachment-manager';
import {mountSuggestionBar,type Suggestion,type SuggestionContext} from './components/suggestions';
import {mountHomeCanvas} from './home-canvas';
import {mountTerminal} from './terminal-panel';
import {mountStudioToolbar} from './components/studio-toolbar';
import {createStudioStateController} from './components/studio-state';
import {renderSmartEmptyState} from './components/smart-empty';
import {mountModuleFrameActions} from './components/module-frame';
import {renderRecoveryError} from './components/error-recovery';
import {mountVoiceInput} from './components/voice-input';
import {mountCommandPalette} from './components/command-palette';
import {mountMetatronLab} from './metatron-lab';
import {createAppDialogs} from './app-dialogs';
import {applyRetention} from './data-controls';
import {createComposerModels} from './composer-models';
import {createModelMenu} from './composer-menu';
import {modelBadge} from './model-picker';
import {createChatMenu} from './chat-menu';
import {groupModelsByProvider,isChatCapableModel,isNeuronPaidModel,modelDisplayName,providerFromSlug,providerIconPath,providerInitial,resolveModelIcon} from './model-display';
import {appendAssistantActions,copyText,shareText,speakText} from './chat-actions';
import {fillMarkdownContent} from './chat-markdown';
import {assignmentForKind,formatAssignment,skillsReply,type Assignment} from './assignment';
import {contextPrompt,drawRequest} from './draw-intent';
import {readPendingImage,requestImage,type ImageRequestBody} from './image-request';
import {explainIntent,intentFromParts} from '../src/lib/intent-contract';
import {applyDisplayPrefs,readDisplayPrefs} from './display-preferences';
import {settingsTitle} from './settings-center';
import {SWITCH_KINDS,switchPartKind,formatPlan,fileNameFromPhrase,followUpPlan,groundWorkPlan,holdBlocked,keepAskedMedia,openStoredPlan,pictureReply,planRecord,planWork,restorePageVersion,retryPart,revisePart,takeBackPage,wantsPageRestore,wavesToRun,workPlanFromDraft,type PlanPart,type PlanThing,type WorkPlan} from './planner';
import {wantsZipOfReply,filesFromReply,zipOfReply} from './chat-zip';
import {createChatCommands} from './chat-commands';
import {createAttachmentUploads,isImageFile,shrinkReference} from './attachment-upload';
import {studioIntent,budgetSummary,ledgerSummary,pulseSummary,dataSummary,audioSummary} from './chat-studios';
import {activePath,archiveMarks,askedPaths,bytesForArchive,bytesForFile,holdArchive,holdPlain,matchHeldPath,openOnlyPath,restoreFileShot,saveBytes,siteFromZip,sourceIsHeld} from './zip-site';
import {applySiteNote,draftFromLine,draftFromPhrase,draftLine,filesForDraft,siteDelta,siteZip} from './chat-site';
import {diagramLines,diagramModel,diagramSvg} from './diagram';
import {buildOffice} from '../src/lib/office-file';
import {installImageViewer} from './image-viewer';
import {htmlBlockOf} from './chat-code';
installImageViewer();
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
const isLocalPage=local;
applyDisplayPrefs(readDisplayPrefs());
type Account={id:string;name:string;nickname?:string;picture?:string;operator?:boolean;role?:'viewer'|'editor'|'admin'};
let account:Account|null=null,project='',mission='',pollTimer=0,epoch=0,studioEpoch=0,mediaCleanup=()=>{},lastBlob:Blob|null=null;
let draftCleanup=()=>{},studioChromeCleanup=()=>{},pollFailures=0,missionSubmitting=false,studioRun=0;
let preferredModel='';
const composerModels=createComposerModels({$,preferred:()=>preferredModel,setPreferred:setPreferredModel,dialog,notice,loadCatalog:()=>api('/api/model-catalog'),identity:()=>account?.id??null,local:()=>local});
const {pickable:pickerModels,label:modelLabel,sync:syncModelsButton,fill:fillComposerModels,open:openModelPicker,refresh:refreshComposerModels}=composerModels;
type ChatVoice='lumen'|'shade'|'aria';
const VOICES:Record<ChatVoice,{name:string;line:string}>={
 lumen:{name:'Люмен',line:'Мужской · добрый, ясный, живой'},
 shade:{name:'Серый',line:'Мужской · серьёзный, короткий, собранный'},
 aria:{name:'Ария',line:'Женский · мягкий, добрый, ясный'},
};
let chatVoice:ChatVoice='shade';
let stopEventStream=()=>{},streamProject='';
let activeStudioModule:StudioModule|null=null,activeStudioContext:StudioModuleContext|null=null;
let metatronCleanup=()=>{};
// Токен-вход: единственный способ войти без регистрации OAuth-приложения у
// провайдера OIDC. Один и тот же заголовок Authorization принимает и общий
// bootstrap-секрет AZRAIL_TOKEN (роль admin, см. lib/auth.ts), и выданный
// администратором персональный ключ az_... (lib/accounts.ts) — выбор формата
// токена не касается интерфейса. Хранится только в sessionStorage текущей
// вкладки: closeTab = выход, как и у остальных локальных черновиков здесь.
let authToken='',oidcConfigured=true,keyLogin=true;
const prompt=$<HTMLTextAreaElement>('prompt');
const composer=$('composer'),missionPanel=$('mission-panel');
const composerHome=document.createComment('composer-home'),missionHome=document.createComment('mission-home');
composer.before(composerHome);missionPanel.before(missionHome);
const navigation=createNavigation(renderRoute);
let attachmentRefs:any[]=[],pending:{key:string;body:string}|null=null;
const attachmentManager=createAttachmentManager({root:$('attachment-manager'),input:$<HTMLInputElement>('attachments'),getProjectId:()=>project,api,failure,onAdded:files=>{void previewAttachedSite(files);if(account)for(const file of files)void uploadedAttachment(file).catch(()=>{});},onChange:refs=>{attachmentRefs=refs;syncContextPanel();}});
function clearAttachments(){attachmentRefs=[];attachmentManager.clear();$('attachment-names').textContent='';}
function deviceValue(key:string){try{return localStorage.getItem(key)??sessionStorage.getItem(key);}catch{try{return sessionStorage.getItem(key);}catch{return null;}}}
function deviceWrite(key:string,value:string|null){for(const store of [localStorage,sessionStorage])try{if(value===null)store.removeItem(key);else store.setItem(key,value);}catch{/* private mode */}}
try{pending=JSON.parse(deviceValue('pulse.pending')??'null');project=deviceValue('pulse.project')??'';mission=deviceValue('pulse.mission')??'';authToken=sessionStorage.getItem('pulse.token')??'';preferredModel=sessionStorage.getItem('pulse.preferredModel')??'';const savedVoice=sessionStorage.getItem('pulse.voice');if(savedVoice==='lumen'||savedVoice==='shade'||savedVoice==='aria')chatVoice=savedVoice;}catch{}
function remember(){deviceWrite('pulse.pending',pending?JSON.stringify(pending):null);deviceWrite('pulse.project',project);deviceWrite('pulse.mission',mission);}
const expertStudios=new Set(['lab','ledger']);
function expertOn(){return document.documentElement.dataset.expert==='on';}
function applyExpert(on:boolean){
 document.documentElement.dataset.expert=on?'on':'off';
 deviceWrite('pulse.expert',on?'on':'off');
 const button=$<HTMLButtonElement>('expert-mode');
 button.textContent=on?'Обычный вид':'Эксперт';
 button.setAttribute('aria-pressed',on?'true':'false');
 const count=document.querySelector('.nav-count');
 if(count)count.textContent=on?'8':'6';
}
applyExpert(false);
function setPreferredModel(model:string){preferredModel=model;try{if(model)sessionStorage.setItem('pulse.preferredModel',model);else sessionStorage.removeItem('pulse.preferredModel');}catch{}const select=$<HTMLSelectElement>('composer-model');if(model&&!Array.from(select.options).some(o=>o.value===model)){const option=document.createElement('option');option.value=model;option.textContent=modelDisplayName(model);option.title=model;select.append(option);}select.value=model;syncModelsButton();syncContextPanel();}
function setChatVoice(voice:ChatVoice){chatVoice=voice;session(()=>sessionStorage.setItem('pulse.voice',voice));syncChatUI();notice(`Голос: ${VOICES[voice].name}. Серый говорит ниже, Люмен выше, Ария мягче.`);}

let chatStorage:Storage|undefined;
try{chatStorage={getItem:key=>deviceValue(key),setItem:(key,value)=>{deviceWrite(key,value);},removeItem:key=>deviceWrite(key,null),key:()=>null,length:0,clear(){}} as Storage;}catch{}
const chatHistory=createChatHistory(chatStorage,()=>notice('История доступна в памяти, но хранилище устройства заполнено или недоступно.',true));
applyRetention({storage:chatStorage,threads:()=>chatHistory.list(),keepId:()=>chatHistory.current()?.id??'',removeThread:id=>chatHistory.remove(id)});
const chatMenu=createChatMenu({chatHistory,api,signedIn:()=>!!account&&!local,notice,syncChatUI,openChat,newChat,getProject:()=>project,setProject:id=>{project=id;remember();}});
const closeChatMenus=()=>chatMenu.close(),openChatMenu=chatMenu.open;
const studioRooms=createStudioRooms(chatStorage);
chatHistory.setScope(local?'local':'guest');
let openContextPanel=()=>{};
hydrateIcons();
const workspace=mountWorkspaceShell(()=>openContextPanel());
async function previewAttachedSite(files:File[]){
 const zip=files.find(file=>file.name.toLowerCase().endsWith('.zip'));
 const page=files.find(file=>/\.html?$/i.test(file.name));
 let html='';
 try{
  if(zip){
   const buf=await zip.arrayBuffer();
   const paths=await holdArchive(buf,zip.name);
   if(paths.length)document.dispatchEvent(new CustomEvent('azrail:zip-catalog',{detail:paths}));
   html=await siteFromZip(buf)??'';
  }
  else if(page){
   html=await page.text();
   stageFiles([{path:page.name,text:html}],page.name.replace(/\.html?$/i,'')+'.zip');
  }
 }catch{return;}
 if(!html.trim())return;
 document.dispatchEvent(new CustomEvent('azrail:site-preview',{detail:html}));
 workspace.setPreview(true);
}
let contextGeneration=0;
let currentRoute:Route={page:'create'};
function syncChatUI(messages=true){
 closeChatMenus();
 const active=chatHistory.current(),query=$<HTMLInputElement>('chat-search').value.trim().toLocaleLowerCase();
 const list=$('chat-list');list.replaceChildren();
 const showArchived=$<HTMLInputElement>('chat-show-archived')?.checked??false;
 const threads=chatHistory.list().filter(t=>showArchived?t.archived:!t.archived);
 $('chat-count').textContent=String(threads.length);
 for(const thread of threads.filter(t=>!query||t.title.toLocaleLowerCase().includes(query))){
  const li=document.createElement('li'),row=document.createElement('div');row.className='chat-row';row.dataset.active=String(thread.id===active?.id);if(thread.pinned)row.dataset.pinned='true';if(thread.archived)row.dataset.archived='true';
  const open=document.createElement('button');open.type='button';open.className='chat-open';open.dataset.chatId=thread.id;
  open.setAttribute('aria-current',String(thread.id===active?.id));
  const title=document.createElement('strong');title.textContent=thread.title;
  const date=document.createElement('small');date.textContent=new Date(thread.updatedAt||Date.now()).toLocaleDateString('ru',{day:'numeric',month:'short'});
  open.append(title,date);open.onclick=()=>openChat(thread.id);
  const actions=document.createElement('div');actions.className='chat-row-actions';
  const more=document.createElement('button');more.type='button';more.className='chat-more';more.title='Действия с чатом';more.setAttribute('aria-label','Действия с чатом');more.setAttribute('aria-haspopup','menu');
  more.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';
  more.onclick=(e)=>{e.stopPropagation();openChatMenu(thread.id,more);};
  actions.append(more);row.append(open,actions);li.append(row);list.append(li);
 }
 $('chat-history-empty').hidden=!!list.childElementCount;$('chat-history-empty').textContent=query?'Чаты не найдены.':(showArchived?'Архив пуст.':'Здесь появятся ваши чаты.');
 if(messages)renderChatMessages($('chat-messages'),active,mission,{
  assistantLabel:`AZRAIL · ${VOICES[chatVoice].name}`,
  onCopy:()=>notice('Скопировано.'),
  onEdit:text=>{prompt.value=text;prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();notice('Запрос в поле ввода: измени и отправь заново.');},
  onSave:async(text,role)=>{
   if(!account){notice('Войдите, чтобы сохранять в память.',true);return;}
   try{
    await api('/api/studio/intelligence/memory',{method:'POST',body:JSON.stringify({scope:'user',key:`chat-${role}-${Date.now()}`,value:{text:text.slice(0,12000),role,chat:chatHistory.current()?.title??''},source:'chat',whyStored:role==='user'?'Запрос сохранён из чата':'Ответ сохранён из чата'})});
    notice('Сохранено в Global Memory.');
   }catch(error){failure(error);}
  },
  onBranch:index=>{
   const current=chatHistory.current();if(!current)return;
   const branch=chatHistory.fork(current.id,index);if(!branch)return;
   openChat(branch.id);notice('Ветка создана в новом чате. Сервер контекст не копирует: продолжай как новый диалог.');
  },
 });
 $('chat-welcome').hidden=!!(active?.turns.length||mission);
 $('create').dataset.chat=(active?.turns.length||mission)?'open':'empty';
 if(!$('create').hidden)$('workspace-page-title').textContent=active?.title??'Новый чат';
 $('context-project').textContent=project?`Проект · ${project}`:'Выберите проект или начните диалог.';
 syncContextPanel();
 for(const id of ['export-project','project-history','project-backups','project-design','context-refresh'])$<HTMLButtonElement>(id).disabled=!account||!project;
 $<HTMLButtonElement>('resume').disabled=!account||!mission;
 workspace.contentChanged();
}
function resetMissionView(){
 ++epoch;clearTimeout(pollTimer);pollFailures=0;contextGeneration++;
 missionPanel.hidden=true;$('mission-done').hidden=true;$('cancel').hidden=true;
 for(const id of ['mission-status','mission-summary','mission-output','mission-activity','mission-plan','mission-connection','mission-checks','mission-progress-label'])$(id).textContent='';
 $('mission-progress').hidden=true;$('recover').hidden=true;$('permit-sandbox').hidden=true;
 $('context-status').textContent='Активной задачи пока нет.';
 $('context-files').replaceChildren();
 $('context-panel-files')?.replaceChildren();
}
function canSwitchChat(){if(pending||missionSubmitting){notice('Дождитесь ответа на отправку или повторите запрос с неопределённым статусом перед сменой диалога.',true);return false;}return true;}
let skipComposerSave=false;
async function hydrateChat(id:string){
 if(!account||local||!id)return;
 try{
  const r=await api(`/api/chat?conversationId=${encodeURIComponent(id)}`);
  const messages=Array.isArray(r.messages)?r.messages:[];
  chatHistory.hydrate(id,messages);
  const list=messages as Array<{role?:string;content?:string}>;
  let planAt=-1;
  for(let i=list.length-1;i>=0;i--)if(list[i]?.role==='plan'){planAt=i;break;}
  const content=planAt>=0&&typeof list[planAt]?.content==='string'?list[planAt].content:'';
  let earlier='';
  for(let i=planAt-1;i>=0;i--){const text=list[i]?.content;if(list[i]?.role==='user'&&typeof text==='string'){earlier=text;break;}}
  if(content)restoreStoredPlan(content,earlier);
  await reopenHeldZip(list);
  syncChatUI();workspace.toLatest();
 }catch{/* Offline or missing conversation — keep local cache. */}
}
async function reopenHeldZip(messages:Array<{role?:string;content?:string}>){
 if(sourceIsHeld()||!project)return;
 const raw=messages.filter(row=>row.role==='user'&&typeof row.content==='string').map(row=>String(row.content)).join('\n');
 const mark=archiveMarks(raw).filter(item=>item.r2Key.startsWith(`uploads/${project}/`)&&!item.r2Key.includes('..')).at(-1);
 if(!mark)return;
 try{
  const blob=await blobAPI(`/api/uploads/file?projectId=${encodeURIComponent(project)}&key=${encodeURIComponent(mark.r2Key)}`);
  const buf=await blob.arrayBuffer();
  const paths=await holdArchive(buf,mark.fileName);
  if(paths.length)document.dispatchEvent(new CustomEvent('azrail:zip-catalog',{detail:paths}));
  const html=await siteFromZip(buf)??'';
  if(html.trim()){document.dispatchEvent(new CustomEvent('azrail:site-preview',{detail:html}));workspace.setPreview(true);}
  else if(paths[0]){document.dispatchEvent(new CustomEvent('azrail:zip-open',{detail:paths[0]}));workspace.setPreview(true);}
 }catch{/* Сервер по-прежнему откроет названный файл из этого архива. */}
}
async function syncServerChats(){
 if(!account||local)return;
 const identity=account.id;
 try{
  const r=await api('/api/conversations');
  if(account?.id!==identity)return;
  const rows=Array.isArray(r.conversations)?r.conversations:[];
  chatHistory.mergeRemote(rows);
  syncChatUI();
  // Pull messages for the open thread so phone ↔ desktop share the same dialogue.
  const active=chatHistory.current();
  if(active&&!active.missionId)await hydrateChat(active.id);
 }catch{/* List sync is best-effort; sending chat still works. */}
}
function openChat(id:string){
 if(!canSwitchChat())return;
 saveComposerDraft();skipComposerSave=true;
 const thread=chatHistory.select(id);if(!thread)return;
 resetMissionView();clearAttachments();clearHeldPlan();project=thread.projectId;mission=thread.missionId;prompt.value=thread.draft;remember();ensureEventStream();
 navigation.navigate({page:mission&&expertOn()?'mission':'create'});workspace.setContext(false);syncChatUI();workspace.toLatest();prompt.focus();
 if(mission&&account&&expertOn()){missionPanel.hidden=false;void poll(epoch);}else missionPanel.hidden=true;
 // Always refresh from server so a chat started on phone appears here with full history.
 if(account&&(!mission||!expertOn()))void hydrateChat(id);
}
function newChat(){
 if(!canSwitchChat())return;
 saveComposerDraft();skipComposerSave=true;chatHistory.create();resetMissionView();clearAttachments();clearHeldPlan();
 document.dispatchEvent(new CustomEvent('azrail:canvas-clear'));
 project='';mission='';prompt.value='';remember();ensureEventStream();navigation.navigate({page:'create'});workspace.setContext(false);syncChatUI();workspace.toLatest();prompt.focus();
}
function syncChatAccount(){
 const scope=account?.id??(local?'local':'guest');
 try{const previous=sessionStorage.getItem('pulse.identity');if(previous&&previous!==scope){project='';mission='';pending=null;resetMissionView();clearAttachments();remember();}sessionStorage.setItem('pulse.identity',scope);}catch{}
 chatHistory.setScope(scope);studioRooms.setScope(scope);const active=chatHistory.current();
 if(active){project=active.projectId;mission=active.missionId;if(composerRoom==='home')prompt.value=active.draft;remember();}
 else if(project||mission)chatHistory.attach(project,mission);
 syncChatUI();workspace.resizePrompt();
 if(account&&!local)void syncServerChats();
}
function modelDot(m:{slug:string;freeAllowlisted?:boolean;hosted?:boolean;availability?:string}):'free'|'neuron'|undefined{const kind=modelBadge(m).kind;return kind==='free'?'free':kind==='neuron'?'neuron':undefined;}
const dotRank=(d?:string)=>d==='free'?0:d==='neuron'?1:2;
const groupRank=(slug:string)=>slug.startsWith('openrouter:')?0:1;
const modelMenu=createModelMenu({root:$('composer-models'),button:$<HTMLButtonElement>('composer-models-open'),
 current:()=>{const hit=preferredModel?composerModels.find(preferredModel):undefined;return {slug:preferredModel,label:currentModelLabel(),description:hit?.description,dot:hit?modelDot(hit):undefined};},
 others:()=>composerModels.pickable().filter(m=>m.slug!==preferredModel).map(m=>({slug:m.slug,label:modelLabel(m),description:m.description,dot:modelDot(m)})).sort((x,y)=>groupRank(x.slug)-groupRank(y.slug)||dotRank(x.dot)-dotRank(y.dot)||x.label.localeCompare(y.label,'ru')),
 select:slug=>{setPreferredModel(slug);syncModelsButton();const hit=composerModels.find(slug);const kind=hit?modelBadge(hit).kind:'';
  if(kind==='neuron')notice('Это одна из моделей Workers Paid. AZRAIL её не вызывает: после 10 000 нейронов в сутки идёт доплата.',true);
  else if(kind==='external')notice('Сторонняя модель: вызов идёт через AI Gateway и только если включены платные модели и есть бюджет.',true);
  else if(hit&&!isChatCapableModel(hit))notice('Модель выбрана. Для чата AZRAIL подставит текстовую модель автоматически.',true);},
 openAll:()=>openModelPicker()});
void modelMenu;
function contextFileHosts(){return ['context-files','context-panel-files'].map(id=>document.getElementById(id)).filter((el):el is HTMLElement=>!!el);}
function fillContextFileHost(host:HTMLElement,artifacts:Array<{id:string;name:string;bytes?:number;mime?:string}>){
 host.replaceChildren();
 if(!artifacts.length){host.textContent='Сохранённых файлов проекта пока нет.';return;}
 for(const item of artifacts.slice(0,40)){
  const button=document.createElement('button'),name=document.createElement('span'),meta=document.createElement('small');
  button.type='button';name.textContent=String(item.name);meta.textContent=`${Math.ceil(Number(item.bytes||0)/1024)} КБ · ${item.mime??'файл'}`;button.append(name,meta);
  button.onclick=()=>{button.disabled=true;void blobAPI(`/api/studio/artifacts/${encodeURIComponent(item.id)}`).then(async blob=>(await import('./media')).download(blob,item.name)).catch(failure).finally(()=>{button.disabled=false;});};
  host.append(button);
 }
}
async function refreshContextFiles(){
 const generation=++contextGeneration,id=project,hosts=contextFileHosts();
 const note=(text:string)=>{for(const host of hosts)host.textContent=text;};
 if(!account||!id||local){note('Сохранённые результаты появятся после входа и выбора проекта.');return;}
 note('Загрузка файлов…');
 try{
  const result=await api(`/api/projects/${encodeURIComponent(id)}`);
  if(generation!==contextGeneration||id!==project)return;
  const artifacts=Array.isArray(result.artifacts)?result.artifacts:[];
  const named=result?.project&&typeof result.project.name==='string'?result.project.name:'';
  if(named)rememberProjectTitle(id,named);
  for(const host of hosts)fillContextFileHost(host,artifacts);
  syncContextPanel();
 }catch(error){if(generation===contextGeneration&&id===project)note(error instanceof Error?error.message:'Не удалось загрузить файлы. Нажмите «Обновить».');}
}
function pageLabel(route:Route){
 if(route.page==='studio')return studioById(route.studio)?.title??'Студия';
 if(route.page==='create')return 'Чат';
 if(route.page==='mission')return 'Mission Control';
 if(route.page==='projects')return 'Проекты';
 if(route.page==='studios')return 'Студии';
 if(route.page==='metatron')return 'Metatron Lab';
 if(route.page==='connections')return 'Подключения';
 return 'Страница не найдена';
}
let contextProjectSeen='',contextNamedProject='',contextProjectTitle='';
function rememberProjectTitle(id:string,name:string){const title=name.replace(/\s+/g,' ').trim();if(!id||!title)return;contextNamedProject=id;contextProjectTitle=title;}
function markContextStudio(){
 document.querySelectorAll<HTMLAnchorElement>('#context-studios a').forEach(link=>{
  const on=currentRoute.page==='studio'&&link.dataset.studio===currentRoute.studio;
  link.classList.toggle('active',on);
  if(on)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
}
function syncContextPanel(){
 const session=$('context-session');if(!session)return;
 if(project!==contextProjectSeen){
  contextProjectSeen=project;
  if(contextNamedProject!==project){contextNamedProject='';contextProjectTitle='';}
  if(account&&project&&!local)void refreshContextFiles().catch(()=>{});
 }
 session.textContent=local?'Локальный просмотр. AI и проекты открываются после входа в развёрнутое приложение.':account?`Аккаунт · ${account.name}${account.role?` · ${account.role}`:''}`:'Вход не выполнен';
 $('context-page-label').textContent=`Страница · ${pageLabel(currentRoute)}`;
 const modelLine=$('context-model-label');
 modelLine.hidden=!preferredModel;
 modelLine.textContent=preferredModel?`Модель · ${modelDisplayName(preferredModel)}`:'';
 $('context-voice-label').textContent=`Голос · ${VOICES[chatVoice].name}. Серый ниже, Люмен выше, Ария мягче.`;
 $('context-panel-project').textContent=project?(contextProjectTitle?`Проект · ${contextProjectTitle}`:'Проект · без названия'):'Проект не выбран. Откройте проекты или начните задачу.';
 const names=attachmentRefs.map(ref=>ref.fileName).filter(Boolean);
 $('context-attachment-label').textContent=names.length?names.join(', '):'Нет прикреплённых файлов';
 const refresh=$<HTMLButtonElement>('context-panel-refresh');if(refresh)refresh.disabled=!account||!project||local;
 markContextStudio();
}
openContextPanel=()=>{syncContextPanel();if(account&&project&&!local)void refreshContextFiles().catch(failure);};
bind('new-chat',newChat);bind('context-refresh',refreshContextFiles);bind('context-panel-refresh',refreshContextFiles);
bind('context-goto-projects',()=>navigation.navigate({page:'projects'}));
bind('context-goto-mission',()=>navigation.navigate({page:'mission'}));
bind('context-goto-connections',()=>navigation.navigate({page:'connections'}));
$<HTMLInputElement>('chat-search').oninput=()=>syncChatUI(false);
const archiveToggle=$<HTMLInputElement>('chat-show-archived');if(archiveToggle)archiveToggle.onchange=()=>syncChatUI(false);
const searchInput=$<HTMLInputElement>('chat-search'),searchOpen=$<HTMLButtonElement>('nav-search'),archiveOpen=$<HTMLButtonElement>('nav-archive');
searchOpen.onclick=()=>{const show=searchInput.hidden;searchInput.hidden=!show;searchOpen.setAttribute('aria-expanded',String(show));if(show)searchInput.focus();else if(searchInput.value){searchInput.value='';syncChatUI(false);}};
archiveOpen.onclick=()=>{archiveToggle.checked=!archiveToggle.checked;archiveOpen.setAttribute('aria-pressed',String(archiveToggle.checked));syncChatUI(false);};
$<HTMLSelectElement>('composer-model').onchange=()=>setPreferredModel($<HTMLSelectElement>('composer-model').value);
prompt.addEventListener('input',()=>{saveComposerDraft();syncChatUI(false);});

let noticeTimer=0;
function notice(message:string,persist=false){clearTimeout(noticeTimer);$('notice-text').textContent=message;$('notice').hidden=false;if(!persist)noticeTimer=window.setTimeout(()=>{$('notice').hidden=true;},6500);}
$('notice-close').onclick=()=>{clearTimeout(noticeTimer);$('notice').hidden=true;};
/** sessionStorage бросает в приватном окне и при заблокированных данных сайта: тогда работаем без него. */
function session(write:()=>void){try{write();}catch{/* хранилище недоступно */}}
function failure(e:unknown){notice(e instanceof Error?e.message:String(e),true);}
async function api(path:string,options:RequestInit={}) {
 if(local)throw Error('Этот файл показывает интерфейс и локальные студии. Для AI и проектов откройте развёрнутое приложение.');
 const headers=new Headers(options.headers);if(typeof options.body==='string'&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 if(authToken&&!headers.has('Authorization'))headers.set('Authorization','Bearer '+authToken);
 const r=await fetch(path,{...options,credentials:'same-origin',headers,signal:options.signal??AbortSignal.timeout(90000)});
 if(r.status===204)return null;
 if(r.status===401&&authToken){authToken='';session(()=>sessionStorage.removeItem('pulse.token'));account=null;}
 const text=await r.text();let body:any;try{body=JSON.parse(text);}catch{/* не JSON: тело разбирается как текст ниже */}
 if(!r.ok)throw new APIError(typeof body?.error==='string'?body.error:`Сервис вернул ошибку ${r.status}. Повторите позже.`,r.status,body?.code,body);
 if(body===undefined)throw Error('Сервис вернул неполный ответ. Статус операции требует проверки.');return body;
}
async function blobAPI(path:string){const headers=new Headers();if(authToken)headers.set('Authorization','Bearer '+authToken);const r=await fetch(path,{credentials:'same-origin',headers,signal:AbortSignal.timeout(90000)});if(!r.ok){const j=await r.json().catch(()=>({}));throw new APIError(j.error??'Не удалось скачать файл.',r.status);}return r.blob();}
function bind(id:string,fn:()=>unknown){$(id).onclick=()=>Promise.resolve().then(fn).catch(failure);}
function dialog(title:string,html:string){$('dialog-title').textContent=title;const content=$('dialog-content');content.innerHTML=html;const dlg=$<HTMLDialogElement>('dialog');if(!dlg.open)dlg.showModal();return content;}
const appDialogs=createAppDialogs({api,blobAPI,dialog,notice,failure,getAccount:()=>account,isLocal:()=>local,getProject:()=>project,getStudio:()=>activeStudioContext});
const {openAssetIntelligence,openGlobalMemory,openSystemHistory,openSystemReadiness,loadSystemSuggestions,openCompareCenter,openReviewHistory}=appDialogs;
bind('close-dialog',()=>$<HTMLDialogElement>('dialog').close());
function cleanupMedia(){const cleanup=mediaCleanup;mediaCleanup=()=>{};cleanup();}
function leaveStudio(){studioEpoch++;studioRun++;if(activeStudioModule&&activeStudioContext)activeStudioModule.cleanup?.(activeStudioContext);activeStudioModule=null;activeStudioContext=null;draftCleanup();draftCleanup=()=>{};studioChromeCleanup();studioChromeCleanup=()=>{};cleanupMedia();lastBlob=null;composerHome.after(composer);missionHome.after(missionPanel);$('studio-work').hidden=true;$('studio-toolbar').replaceChildren();$('studio-suggestions').replaceChildren();$('studio-controls').replaceChildren();$('studio-result').replaceChildren();$('studio-result').removeAttribute('aria-busy');}
let composerPage:Route['page']='create';
let composerRoom:'home'|StudioId|'metatron'='home';
let composerReady=false;
let studioTalkOpen=false;
const roomPlaceholder:Record<string,string>={
 web:'Опиши сайт. Сборка файлов — в Chat или Mission Control…',
 image:'Опиши картинку обычными словами…',
 music:'Опиши трек обычными словами…',
 video:'Опиши видео обычными словами…',
 audio:'Напиши, что проверить, и прикрепи аудио…',
 als:'Напиши, что разобрать, и прикрепи проект Ableton…',
 data:'Напиши, что посчитать, и прикрепи таблицу…',
 ledger:'Спроси про расходы этого проекта…',
 lab:'Спроси про состояние системы…',
 prose:'Вставь готовый текст или одну фразу…',
 metatron:'Спроси про миссию и агентов…',
};
function saveComposerDraft(){if(composerRoom==='home')chatHistory.setDraft(prompt.value);else studioRooms.setDraft(composerRoom,prompt.value);}
function setStudioTalk(open:boolean,focus=false){
 const talk=composerRoom!=='home'&&(composerPage==='studio'||composerPage==='metatron');
 studioTalkOpen=open&&talk;
 document.querySelector('.composer-dock')?.classList.toggle('studio-talk',studioTalkOpen);
 const opener=$<HTMLButtonElement>('studio-talk-open');if(opener)opener.hidden=!talk;
 const host=$('studio-chat');host.hidden=!studioTalkOpen;
 if(studioTalkOpen&&focus)prompt.focus();
}
function replyInKind(source:string,line:string){
 const casual=/(\bбро\b|ахах|погнали|короче)/i.test(source);
 const brief=source.trim().length<=90;
 if(casual&&brief)return `Готово, бро. ${line}`;
 if(casual)return `Собрал. ${line}`;
 if(brief)return `Готово. ${line}`;
 return line;
}
function giveFile(id:string,file:File){
 const input=document.querySelector<HTMLInputElement>(id);
 if(!input||typeof DataTransfer==='undefined')return false;
 const bag=new DataTransfer();bag.items.add(file);input.files=bag.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function renderStudioChat(){
 const host=$('studio-chat'),log=$('studio-chat-log');
 const active=composerRoom!=='home';host.hidden=!active||!studioTalkOpen;if(!active){document.querySelector('.composer-dock')?.classList.remove('studio-talk');return;}
 log.replaceChildren();
 const turns=studioRooms.turns(composerRoom);
 if(!turns.length){const empty=document.createElement('p');empty.className='muted';const caps=studioById(composerRoom)?.capabilities??[];empty.textContent=caps.includes('prose-writing')?'Это чат Prose Studio. Готовый текст останется текстом. Студия пишет слова и не поёт.':caps.includes('mission')?'Сборка сайта и правки файлов запускаются в Chat или Mission Control.':caps.includes('ledger-read')||caps.includes('system-diagnostics')?'Спроси про отчёт. Этот чат обновит студию и не запустит миссию по коду.':'Это отдельный чат студии. Напиши задачу здесь. Настройки выше можно не трогать.';log.append(empty);return;}
 const title=composerRoom==='metatron'?'Metatron':studioById(composerRoom)?.title??'Студия';
 for(const turn of turns){
  const item=document.createElement('article');item.className='chat-message';item.dataset.role=turn.role==='user'?'user':'assistant';
  const heading=document.createElement('h3');heading.className='message-heading';heading.textContent=turn.role==='user'?'Вы':title;
  item.append(heading);
  if(turn.role==='studio'&&turn.text){
   const body=document.createElement('div');fillMarkdownContent(body,turn.text);item.append(body);
   appendAssistantActions(item,turn.text);
  }else{
   const text=document.createElement('p');text.className='message-content';text.textContent=turn.text;item.append(text);
  }
  log.append(item);
 }
 log.scrollTop=log.scrollHeight;
}
function syncComposer(route:Route){
 const next:typeof composerRoom=route.page==='studio'?route.studio:route.page==='metatron'?'metatron':'home';
 const changed=next!==composerRoom;
 if(composerReady&&changed&&!skipComposerSave)saveComposerDraft();
 skipComposerSave=false;
 composerRoom=next;composerReady=true;composerPage=route.page;
 const dock=document.querySelector<HTMLElement>('.composer-dock')!;
 dock.hidden=route.page!=='create'&&route.page!=='mission'&&route.page!=='studio'&&route.page!=='metatron';
 if(changed)prompt.value=composerRoom==='home'?chatHistory.current()?.draft??'':studioRooms.draft(composerRoom);
 prompt.placeholder=route.page==='mission'?'Что сделать…':route.page==='create'?'Ответить':composerRoom==='home'?'Ответить':roomPlaceholder[composerRoom]??'Напиши задачу для этой студии…';
 $<HTMLButtonElement>('attach').hidden=route.page==='mission';
 $('composer-models').hidden=route.page!=='create';
 $<HTMLButtonElement>('submit').title=route.page==='mission'?'Старт · Enter':'Отправить · Enter';
 $<HTMLButtonElement>('submit').setAttribute('aria-label',route.page==='mission'?'Старт':'Отправить сообщение');
 if(changed)studioTalkOpen=false;
 if(composerRoom==='home'){studioTalkOpen=false;$('studio-chat').hidden=true;document.querySelector('.composer-dock')?.classList.remove('studio-talk');}else renderStudioChat();
 setStudioTalk(studioTalkOpen);
 $<HTMLButtonElement>('composer-open-chat').hidden=true;
 workspace.resizePrompt();
}
function renderRoute(route:Route,initial:boolean){
 const studioId=route.page==='studio'?route.studio:'';
 if(!expertOn()&&(route.page==='mission'||route.page==='metatron'||route.page==='connections'||expertStudios.has(studioId))){navigation.navigate({page:'create'});return;}
 currentRoute=route;
 leaveStudio();metatronCleanup();metatronCleanup=()=>{};const id=route.page==='studio'?'studio-page':route.page==='settings'||route.page==='connections'?'settings-page':route.page;
 document.querySelectorAll<HTMLElement>('.view').forEach(el=>el.hidden=el.id!==id);
 const nav=route.page==='studio'?'studios':route.page==='connections'?'settings':route.page;
 document.querySelectorAll('.nav').forEach(el=>{const active=el.getAttribute('data-view')===nav;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 if(route.page==='studio')void renderStudio(route.studio).catch(failure);
 if(route.page==='projects')loadProjects().catch(failure);
 if(route.page==='settings')renderSettingsPage(route);
 if(route.page==='mission'){if(mission&&account){missionPanel.hidden=false;void poll(epoch).catch(failure);}void refreshMissionHistory().catch(failure);}
 if(route.page==='metatron')metatronCleanup=mountMetatronLab({root:$('metatron-page'),api,local,account,getProjectId:()=>project,getMissionId:()=>mission,setMissionId:id=>{mission=id;remember();},notice,failure});
 syncComposer(route);
 const title=route.page==='studio'?studioById(route.studio)!.title:route.page==='settings'?settingsTitle(route.section,route.provider):route.page==='create'?'Чат':route.page==='mission'?'Ход задачи':route.page==='projects'?'Проекты':route.page==='studios'?'Студии':route.page==='metatron'?'Метратрон':route.page==='connections'?'Подключения':'Страница не найдена';
 document.title=`${title} · AZRAIL MNMLL PULSE OS`;
 $('workspace-page-title').textContent=route.page==='create'?(chatHistory.current()?.title??'Новый чат'):title;
 workspace.routeChanged();syncChatUI();
 if(!initial){document.querySelector<HTMLElement>(`#${id} h1`)?.focus({preventScroll:true});$(id).scrollTop=0;}
}
function view(id:'create'|'projects'|'studios'){navigation.navigate({page:id});}
navigation.link(document.querySelector<HTMLAnchorElement>('[data-home]')!,{page:'create'});
document.querySelectorAll<HTMLAnchorElement>('a[data-view]').forEach(el=>navigation.link(el,{page:el.dataset.view as 'create'|'mission'|'projects'|'studios'|'metatron'|'connections'}));
bind('expert-mode',()=>{
 const next=!expertOn();
 applyExpert(next);
 const studioId=currentRoute.page==='studio'?currentRoute.studio:'';
 if(!next&&(currentRoute.page==='mission'||currentRoute.page==='metatron'||currentRoute.page==='connections'||expertStudios.has(studioId)))navigation.navigate({page:'create'});
});
bind('assignment-continue',()=>{
 if(!heldPlan||missionSubmitting)return;
 const message=heldMessage||heldPlan.parts.map(part=>part.text).join(' · ');
 return runPlan(heldPlan,message,true);
});
let imageFrame:'1:1'|'16:9'|'9:16'='1:1';
let imageCount:2|3|4=2;
const upscaleOnce=new Set<string>();
function markFrame(){
 for(const button of $('assignment-frame').querySelectorAll<HTMLButtonElement>('[data-frame]'))button.setAttribute('aria-pressed',button.dataset.frame===imageFrame?'true':'false');
 for(const button of $('assignment-frame').querySelectorAll<HTMLButtonElement>('[data-count]'))button.setAttribute('aria-pressed',button.dataset.count===String(imageCount)?'true':'false');
}
$('assignment-frame').addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-frame]');
 const frame=button?.dataset.frame;
 if(frame!=='1:1'&&frame!=='16:9'&&frame!=='9:16')return;
 imageFrame=frame;
 markFrame();
});
$('assignment-frame').addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-count]');
 const count=Number(button?.dataset.count);
 if(count!==2&&count!==3&&count!==4)return;
 imageCount=count;
 markFrame();
});
let imageReference='';
const clipboardFiles=(data:DataTransfer|null)=>[...(data?.files??[])];
$('prompt').addEventListener('paste',e=>{const files=clipboardFiles((e as ClipboardEvent).clipboardData);if(!files.length)return;e.preventDefault();void attachmentManager.add(files.map((f,i)=>/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)&&/^image\.\w+$/i.test(f.name)?new File([f],`скриншот-${Date.now()}-${i+1}.${f.type.split('/')[1].replace('jpeg','jpg')}`,{type:f.type}):f));});
for(const zone of [$('composer'),$('chat-messages')].filter(Boolean)){
 zone.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();$('composer').classList.add('drop-target');}});
 zone.addEventListener('dragleave',e=>{if(!zone.contains((e as DragEvent).relatedTarget as Node))$('composer').classList.remove('drop-target');});
 zone.addEventListener('drop',e=>{const files=clipboardFiles((e as DragEvent).dataTransfer);if(!files.length)return;e.preventDefault();$('composer').classList.remove('drop-target');void attachmentManager.add(files);});
}
const {uploadedAttachment,attachedImageReference}=createAttachmentUploads((path,init)=>api(path,init),()=>attachmentManager.files());
let sentMarkup={for:'',text:''};
async function attachmentMarkup(message:string):Promise<string>{
 const files=account?attachmentManager.files():[];
 const lines:string[]=[];
 const ids=await Promise.all(files.map(file=>uploadedAttachment(file).catch(()=>'')));
 files.forEach((file,index)=>{
  const name=file.name.replace(/[\[\]()\n]/g,' ').trim().slice(0,80)||'файл';
  const id=ids[index];
  lines.push(id?`${isImageFile(file)?'!':''}[${name}](/api/studio/artifacts/${id})`:`📎 ${name}`);
 });
 const text=lines.length?'\n\n'+lines.join('\n\n'):'';
 sentMarkup={for:message,text};
 return text;
}
$<HTMLInputElement>('assignment-reference').addEventListener('change',()=>{
 const input=$<HTMLInputElement>('assignment-reference');
 const file=input.files?.[0];
 input.value='';
 if(!file)return;
 if(!account){notice('Войдите, чтобы взять свою картинку.');return;}
 const send=async(withProject:boolean)=>{
  const fitted=await shrinkReference(file);
  const headers:Record<string,string>={'Content-Type':'image/jpeg','X-Filename':file.name.replace(/\.\w+$/,'.jpg').slice(0,120),'X-Studio-Id':'image'};
  if(withProject&&project)headers['X-Project-Id']=project;
  return api('/api/studio/artifacts',{method:'POST',headers,body:fitted}) as Promise<{id?:string}>;
 };
 void send(true).catch(()=>send(false)).then(saved=>{
  if(!saved?.id){notice('Картинка не сохранилась.');return;}
  imageReference=saved.id;
  notice('Своя картинка задаёт вид следующей сборки.');
 }).catch(failure);
});
bind('assignment-login',()=>$('account-action').click());
navigation.link($<HTMLAnchorElement>('close-studio'),{page:'studios'});
for(const meta of studios){const link=document.createElement('a');link.textContent=meta.title;link.dataset.studio=meta.id;navigation.link(link,{page:'studio',studio:meta.id});$('context-studios').append(link);}
document.addEventListener('azrail:open-studio',(event:Event)=>{const id=(event as CustomEvent<{studio?:string}>).detail?.studio;if(id&&studioById(id))navigation.navigate({page:'studio',studio:id as StudioId});});
mountHomeCanvas();
mountTerminal(api,()=>project||'',failure,()=>navigation.navigate({page:'settings',section:'agent'}));
bind('attach',()=>{if(!project){project=crypto.randomUUID();remember();}$<HTMLInputElement>('attachments').click();});
const openTokenLogin=()=>{
 dialog('Вход по ключу','<label for="login-token">Ключ</label><input id="login-token" type="password" autocomplete="off" spellcheck="false"><button id="login-save" class="primary">Войти</button>');
 $('login-token').focus();
 bind('login-save',async()=>{
   const value=$<HTMLInputElement>('login-token').value.trim();
   if(!value)throw Error('Введите токен.');
   authToken=value;session(()=>sessionStorage.setItem('pulse.token',authToken));
   try{const me=await api('/api/me');account=me.account;}
   catch(e){authToken='';session(()=>sessionStorage.removeItem('pulse.token'));throw e;}
   $<HTMLDialogElement>('dialog').close();setAccountLabel();syncChatAccount();void refreshComposerModels();await refreshMode();
   await syncServerChats();
   if(mission&&expertOn()){navigation.navigate({page:'mission'});$('mission-panel').hidden=false;await poll(++epoch);}
   notice('Вход выполнен.');
  });
};
bind('account-action',async()=>{
 if(!account){
  if(local)throw Error('Вход доступен после развёртывания приложения.');
  if(oidcConfigured){
   if(!keyLogin){location.assign('/auth/login');return;}
   dialog('Вход','<p>Код придёт на почту.</p><button id="login-mail" class="primary">Войти по почте</button><button id="login-key">Войти ключом</button>');
   bind('login-mail',()=>{location.assign('/auth/login');});
   bind('login-key',openTokenLogin);
   return;
  }
  openTokenLogin();
  return;
 }
 dialog('Ваш аккаунт','<p id="account-name"></p><p id="account-id"></p><button id="logout">Выйти</button>');
 $('account-name').textContent=account.name;$('account-id').textContent=account.id;
 bind('logout',async()=>{
  const wasToken=!!authToken;
  if(wasToken){authToken='';session(()=>sessionStorage.removeItem('pulse.token'))}
  else await api('/auth/logout',{method:'POST'});
  chatHistory.clearScope();
  for(const key of ['pulse.pending','pulse.project','pulse.mission','pulse.image.pending','pulse.identity'])deviceWrite(key,null);
  location.reload();
 });
});
async function refreshAccount(){
 if(local){syncChatAccount();$('local-notice').textContent='Локальный просмотр · WAV/MIDI, аудиоанализ и CSV доступны на устройстве. Для AI и проектов нужен вход в развёрнутое приложение.';$('local-notice').hidden=false;return;}
 const a=await api('/auth/status');account=a.account;oidcConfigured=!!a.configured;if(typeof a.key==='boolean')keyLogin=a.key;
 if(!account&&authToken){try{const me=await api('/api/me');account=me.account;}catch{authToken='';session(()=>sessionStorage.removeItem('pulse.token'))}}
 syncChatAccount();void refreshComposerModels();
 if(account){setAccountLabel();await refreshMode();ensureEventStream();if(mission&&expertOn()){if(composerPage==='create')navigation.navigate({page:'mission'});$('mission-panel').hidden=false;await poll(++epoch);}}
 else if(!oidcConfigured)notice('OIDC не настроен. Войдите по токену через кнопку «Аккаунт» — регистрация внешнего приложения не нужна.');
}
async function refreshMode(){return api('/api/routing-settings');}
function currentModelLabel(){
 const hit=preferredModel?composerModels.find(preferredModel):undefined;
 return hit?modelLabel(hit):(preferredModel?modelDisplayName(preferredModel):'Auto · AZRAIL');
}
function setAccountLabel(){
 const name=account?.name??'';
 $('account-label').textContent=name||'Войти';$('account').setAttribute('aria-label',name?'Аккаунт: '+name:'Войти');
 const avatar=$('account-avatar'),initial=(name.trim()[0]||'A').toUpperCase();
 avatar.replaceChildren();
 if(account?.picture){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.src=account.picture;img.onerror=()=>{img.remove();avatar.textContent=initial;};avatar.append(img);}
 else avatar.textContent=initial;
 $('account-menu-name').textContent=account?(account.id.includes('@')?account.id:name):'';
 $('account-menu-name').hidden=!account;
 $('account-action-label').textContent=account?'Выйти':'Войти';
}
function openSettings(){navigation.navigate({page:'settings'});}

const renderSettingsPage=createSettingsPage({$,local,notice,failure,api,setAccountLabel,navigation,chatHistory,VOICES,expertOn,setChatVoice,refreshMode,openModelPicker,openGlobalMemory,openAssetIntelligence,loadConnections,currentModelLabel,account:()=>account,chatVoice:()=>chatVoice,preferredModel:()=>preferredModel,chatStorage:()=>chatStorage});

bind('settings',()=>openSettings());
createAccountMenu({wrap:$('account-wrap'),button:$<HTMLButtonElement>('account'),menu:$('account-menu')});
function ensureEventStream(){
 if(local||!account||!project){stopEventStream();stopEventStream=()=>{};streamProject='';return;}
 if(streamProject===project)return;
 stopEventStream();streamProject=project;
 stopEventStream=createProjectEventClient({api,projectId:project,onEvent:(event:StreamEvent)=>{
  if(event.missionId&&event.missionId===mission&&!document.hidden){clearTimeout(pollTimer);pollTimer=window.setTimeout(()=>void poll(epoch),120);}
 }});
}

async function refreshMissionHistory(){
 const host=$('mission-history');
 if(!account||!project||local){host.replaceChildren();const note=document.createElement('p');note.className='muted';note.textContent=account?'Недавние миссии появятся после выбора проекта.':'Войдите, чтобы видеть недавние миссии.';host.append(note);return;}
 try{
  const r=await api(`/api/metatron/missions?projectId=${encodeURIComponent(project)}`) as {items?:Array<{id:string;goal:string;status:string;updated_at:string}>};
  const items=(r.items??[]).slice(0,8);host.replaceChildren();
  if(!items.length){const note=document.createElement('p');note.className='muted';note.textContent='Пока нет миссий в этом проекте.';host.append(note);return;}
  for(const item of items){
   const button=document.createElement('button');button.type='button';button.className='mission-history-item';
   if(item.id===mission)button.setAttribute('aria-current','true');
   const title=document.createElement('strong');title.textContent=item.goal.slice(0,120)||'Без названия';
   const meta=document.createElement('small');meta.className='muted';meta.textContent=`${item.status} · ${new Date(item.updated_at).toLocaleString('ru')}`;
   button.append(title,meta);
   button.onclick=()=>{mission=item.id;remember();missionPanel.hidden=false;syncChatUI();void poll(++epoch).catch(failure);void refreshMissionHistory().catch(failure);};
   host.append(button);
  }
 }catch{host.replaceChildren();const note=document.createElement('p');note.className='muted';note.textContent='Не удалось загрузить список миссий.';host.append(note);}
}
async function runMission(goal?:string,opts?:{keepTurn?:boolean;stay?:boolean;nested?:boolean}){
 if(missionSubmitting&&!opts?.keepTurn&&!opts?.nested)return;
 if(!account)throw Error('Войдите в аккаунт, чтобы запустить AZRAIL.');
 if(account.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');
 const message=(goal??prompt.value).trim();if(!message)return;
 if(!opts?.stay&&composerPage!=='mission'){
  skipComposerSave=true;
  if(!opts?.keepTurn){chatHistory.setDraft(message);prompt.value=message;}
  navigation.navigate({page:'mission'});
 }
 // First Mission Control version: text goal only. Attachments stay available later.
 if(!pending){project=project||crypto.randomUUID();pending={key:crypto.randomUUID(),body:JSON.stringify({message,projectId:project,attachments:[],...(preferredModel?{preferredModel}:{}),...(modelMenu.effort()!=='medium'?{effort:modelMenu.effort()}:{})})};}
 remember();
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 const submitted={...pending};
 try{
  const r=await api('/api/mission',{method:'POST',headers:{'Idempotency-Key':submitted.key},body:submitted.body});
  const sent=JSON.parse(submitted.body);mission=r.missionId;pending=null;remember();
  if(opts?.keepTurn)chatHistory.attach(project,mission);
  else chatHistory.accepted(submitted.key,sent.message,project,mission);
  if(!opts?.keepTurn&&prompt.value.trim()===sent.message)prompt.value='';
  if(!opts?.keepTurn)chatHistory.setDraft(prompt.value);
  clearAttachments();workspace.resizePrompt();
  $('mission-panel').hidden=false;$('mission-summary').textContent='Задача принята. Получаю состояние…';$('mission-status').textContent='Задача принята';
  syncChatUI();workspace.toLatest();ensureEventStream();await poll(++epoch);void refreshMissionHistory().catch(failure);
 }
 catch(e){
  // A definite admission rejection is editable. Network errors, 5xx and an
  // in-flight 409 retain the exact request/key: its delivery is uncertain.
  if(e instanceof APIError&&([400,401,403,404,405,413,415,422,429].includes(e.status)||e.code==='project_busy')){pending=null;remember();}
  throw e;
 }
 finally{if(!opts?.nested){missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;}}
}
function safeMediaPath(src:string){
 try{
  const url=new URL(src,location.origin);
  if(url.origin!==location.origin)return '';
  const path=url.pathname+url.search;
  if(/^\/api\/studio\/artifacts\/[A-Za-z0-9._~-]+(?:\?inline=1)?$/.test(path))return path;
  if(/^\/s\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))return url.pathname;
 }catch{/* Чужой адрес в полосу не ставим. */}
 return '';
}
function downloadName(thing:PlanThing,ext:string){
 return thing.title?.includes('.')?thing.title:fileNameFromPhrase(thing.title||'файл',ext);
}
function downloadLink(url:string,name:string){
 const link=document.createElement('a');
 link.href=url;
 link.download=name;
 link.className='icon-download';
 link.title='Скачать';
 link.setAttribute('aria-label','Скачать');
 link.innerHTML=icon('download',18);
 return link;
}
function stageFiles(files:Array<{path:string;text:string}>,name?:string){
 const paths=holdPlain(files,name);
 if(paths.length)document.dispatchEvent(new CustomEvent('azrail:zip-catalog',{detail:paths}));
}
function appendThing(parent:HTMLElement,thing:PlanThing,earlier=false,poster='',against=''){
 const host=document.createElement('div');
 host.className='thing-card';
 host.dataset.key=`${earlier?'old:':''}${thing.type}:${thing.url||thing.lines?.[0]?.slice(0,80)||thing.title||''}`;
 if(thing.type==='image'&&thing.url){
  const row=document.createElement('div');
  row.className=earlier?'assignment-versions':'assignment-pair';
  const draw=(src:string)=>{const img=document.createElement('img');img.src=src;img.alt=thing.title||'Готовая картинка';row.append(img);};
  draw(thing.url);
  if(!earlier)for(const alt of thing.alts??[])draw(alt);
  host.append(row);
  if(!earlier){
   const foot=document.createElement('div');
   foot.className='thing-foot';
   if(thing.caption){const cap=document.createElement('p');cap.className='thing-caption';cap.textContent=thing.caption;foot.append(cap);}
   foot.append(downloadLink(thing.url,downloadName(thing,'png')));
   host.append(foot);
  }
  parent.append(host);return;
 }
 if(thing.type==='audio'&&thing.url){
  const audio=document.createElement('audio');audio.controls=true;audio.src=thing.url;host.append(audio);
  if(!earlier)host.append(downloadLink(thing.url,downloadName(thing,'webm')));
  parent.append(host);return;
 }
 if(thing.type==='page'&&thing.url){
  const frame=document.createElement('iframe');frame.className='chat-preview';frame.src=thing.url;frame.title=thing.title||'Просмотр страницы';frame.setAttribute('sandbox','allow-scripts');host.append(frame);
  const link=document.createElement('a');link.href=thing.url;link.target='_blank';link.rel='noopener';link.textContent=thing.title||'Открыть страницу';host.append(link);
  if(earlier&&thing.url&&thing.lines?.some(line=>line.startsWith('azrail-site\t'))){
   const back=document.createElement('button');back.type='button';back.className='text-button';back.textContent='Вернуть';back.dataset.restore=thing.url;host.append(back);
   const delta=siteDelta(thing.lines?.find(line=>line.startsWith('azrail-site\t')),against);
   if(delta){const diff=document.createElement('p');diff.textContent=delta;host.append(diff);}
  }
  const life=document.createElement('p');life.textContent='Страница живёт 90 дней.';host.append(life);
  const zip=thing.lines?.find(line=>line.startsWith('azrail-zip\t'))?.slice('azrail-zip\t'.length);
  if(zip)host.append(downloadLink(zip,downloadName(thing,'zip')));
  const code=thing.lines?.filter(line=>!line.startsWith('azrail-site\t')&&!line.startsWith('azrail-zip\t')&&!line.startsWith('<!'));
  if(code?.length){const pre=document.createElement('pre');pre.textContent=code.join('\n').slice(0,6000);host.append(pre);}
  parent.append(host);return;
 }
 if(thing.type==='storyboard'&&thing.lines?.length){
  const row=document.createElement('div');
  row.className='assignment-cards';
  if(poster){
   const card=document.createElement('article');
   const label=document.createElement('p');label.className='kicker';label.textContent='Первый кадр';
   const img=document.createElement('img');img.src=poster;img.alt='Первый кадр из готовой картинки';
   card.append(label,img);row.append(card);
  }
  thing.lines.forEach((line,index)=>{
   const card=document.createElement('article');
   const label=document.createElement('p');label.className='kicker';label.textContent=`Кадр ${index+1}`;
   const body=document.createElement('p');body.textContent=line;
   card.append(label,body);row.append(card);
  });
  host.append(row);parent.append(host);return;
 }
 if(thing.type==='file'&&thing.url){
  host.append(downloadLink(thing.url,thing.title||downloadName(thing,'bin')));
  parent.append(host);return;
 }
 if(thing.type==='diagram'&&thing.lines?.length){
  const svg=diagramSvg(document,thing.lines);
  host.append(svg);parent.append(host);return;
 }
 if(thing.type==='note'&&thing.title){const note=document.createElement('p');note.textContent=thing.title;host.append(note);parent.append(host);}
}
function paintThings(parts:Array<{thing?:PlanThing;state?:PlanPart['state'];versions?:PlanThing[]}>){
 const host=$('assignment-thing');host.replaceChildren();
 const poster=parts.find(part=>part.state==='done'&&part.thing?.type==='image'&&part.thing.url)?.thing?.url??'';
 let shown=0;
 for(const part of parts){
  if(part.thing){appendThing(host,part.thing,false,part.thing.type==='storyboard'?poster:'');shown+=1;}
  const against=part.thing?.lines?.find(line=>line.startsWith('azrail-site\t'))??'';
  for(const older of part.versions??[]){appendThing(host,older,true,'',against);shown+=1;}
 }
 if(!shown){const note=document.createElement('p');note.textContent='Пока ничего нет.';host.append(note);}
 pinThingInChat();
}
function pinThingInChat(){
 const source=$('assignment-thing');
 const host=document.getElementById('chat-messages');
 if(!host)return;
 const seen=new Set([...host.querySelectorAll<HTMLElement>(':scope > [data-chat-thing] [data-key]')].map(node=>node.dataset.key||''));
 for(const card of source.querySelectorAll<HTMLElement>(':scope > .thing-card')){
  const key=card.dataset.key||'';
  if(!key||seen.has(key))continue;
  const slot=document.createElement('div');slot.dataset.chatThing='';slot.className='chat-thing';slot.append(card.cloneNode(true));host.append(slot);
  seen.add(key);
 }
}
function harvestStudioThing():PlanThing|undefined{
 const img=document.querySelector<HTMLImageElement>('#studio-result img');
 const image=img?safeMediaPath(img.currentSrc||img.src):'';
 if(image)return{type:'image',url:image,title:img?.alt||'Готовая картинка'};
 const clip=document.querySelector<HTMLMediaElement>('#studio-result audio, #studio-result video');
 const saved=clip?safeMediaPath(clip.currentSrc||clip.src):'';
 if(saved&&clip instanceof HTMLAudioElement)return{type:'audio',url:saved,title:'Трек'};
 if(clip?.src)return{type:'note',title:clip instanceof HTMLVideoElement?'Ролик собран на этом экране.':'Трек собран на этом экране.'};
 return undefined;
}
async function keepPlayer():Promise<PlanThing|undefined>{
 const clip=document.querySelector<HTMLAudioElement>('#music-player, #studio-result audio');
 const src=clip?.currentSrc||clip?.src||'';
 if(!src.startsWith('blob:')||!account)return undefined;
 const send=async(withProject:boolean)=>{
  const blob=await fetch(src).then(r=>r.blob());
  const headers:Record<string,string>={'Content-Type':blob.type||'audio/webm','X-Filename':'track.webm','X-Studio-Id':'music'};
  if(withProject&&project)headers['X-Project-Id']=project;
  return api('/api/studio/artifacts',{method:'POST',headers,body:blob}) as Promise<{url?:string}>;
 };
 try{
  let saved:{url?:string};
  try{saved=await send(true);}catch{saved=await send(false);}
  const url=safeMediaPath(saved.url?`${saved.url}${saved.url.includes('?')?'':'?inline=1'}`:'');
  return url?{type:'audio',url,title:'Трек'}:undefined;
 }catch{return undefined;}
}
async function keepPage():Promise<PlanThing|undefined>{
 if(!account||!project)return undefined;
 try{
  const overview=await api(`/api/projects/${encodeURIComponent(project)}/workbench`) as {files?:Array<{path:string}>};
  const files=overview.files??[];
  if(!files.some(file=>file.path==='index.html'))return undefined;
  const opened=await api(`/api/projects/${encodeURIComponent(project)}/workbench/file?path=${encodeURIComponent('index.html')}`) as {content?:string};
  if(!opened.content)return undefined;
  let style='body{margin:0;font-family:sans-serif}';
  if(files.some(file=>file.path==='styles.css')){
   const css=await api(`/api/projects/${encodeURIComponent(project)}/workbench/file?path=${encodeURIComponent('styles.css')}`) as {content?:string};
   if(css.content)style=css.content;
  }
  const published=await api('/api/studio/web/publish',{method:'POST',body:JSON.stringify({name:'Страница',files:[{path:'index.html',text:opened.content},{path:'styles.css',text:style}]})}) as {url?:string};
  const url=safeMediaPath(String(published.url??''));
  return url?{type:'page',url,title:'Открыть страницу',lines:[opened.content.slice(0,4000)]}:undefined;
 }catch{return undefined;}
}
async function pageSource(){
 if(!account||!project)return null;
 const overview=await api(`/api/projects/${encodeURIComponent(project)}/workbench`) as {files?:Array<{path:string}>};
 const files=overview.files??[];
 if(!files.some(file=>file.path==='index.html'))return null;
 const opened=await api(`/api/projects/${encodeURIComponent(project)}/workbench/file?path=${encodeURIComponent('index.html')}`) as {content?:string;sha256?:string};
 if(!opened.content)return null;
 let css='body{margin:0;font-family:sans-serif}';
 if(files.some(file=>file.path==='styles.css')){
  const style=await api(`/api/projects/${encodeURIComponent(project)}/workbench/file?path=${encodeURIComponent('styles.css')}`) as {content?:string};
  if(style.content)css=style.content;
 }
 return {html:opened.content,css,sha:opened.sha256??''};
}
async function phoneFit(html:string,css:string){
 const frame=document.createElement('iframe');
 frame.setAttribute('sandbox','allow-same-origin');
 frame.style.cssText='position:absolute;left:-9999px;width:390px;height:700px;border:0';
 document.body.append(frame);
 const doc=frame.contentDocument;
 if(!doc){frame.remove();return 'Ширину телефона сейчас не измерить.';}
 doc.open();
 doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
 doc.close();
 await new Promise(resolve=>setTimeout(resolve,40));
 const wide=doc.documentElement.scrollWidth>394;
 frame.remove();
 return wide?'На ширине 390 px текст вылезает.':'На ширине 390 px помещается.';
}
async function downloadProject(){
 if(!account){notice('Войдите, чтобы скачать проект.');return;}
 if(!project){notice('Сначала нужен проект.');return;}
 const {download}=await import('./media');
 download(await blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(project)}`),'azrail-project.zip');
}
async function copyProject(){
 if(!account||account.role==='viewer'){notice('Копию снимает владелец проекта.');return;}
 if(!project){notice('Сначала нужен проект.');return;}
 const result=await api(`/api/projects/${encodeURIComponent(project)}/duplicate`,{method:'POST',body:'{}'}) as {project?:{name?:string};copiedFiles?:number};
 notice(`Копия «${result.project?.name||'проект'}» снята. Файлов: ${result.copiedFiles??0}.`);
}
async function editPageText(){
 if(!account){notice('Войдите, чтобы править текст страницы.');return;}
 if(!project){notice('Сначала нужен проект.');return;}
 const source=await pageSource();
 if(!source){notice('Текста страницы пока нет.');return;}
 const root=dialog('Текст страницы','<label for="page-text">Файл страницы</label><textarea id="page-text" rows="12"></textarea><button id="page-text-save" class="primary" type="button">Сохранить</button>');
 const field=root.querySelector<HTMLTextAreaElement>('#page-text');
 if(field)field.value=source.html;
 root.querySelector<HTMLButtonElement>('#page-text-save')?.addEventListener('click',()=>{
  const content=field?.value??'';
  void api(`/api/projects/${encodeURIComponent(project)}/workbench/files`,{method:'POST',body:JSON.stringify({action:'update',path:'index.html',content,expectedSha256:source.sha})}).then(()=>{
   notice('Текст страницы сохранён.');
   $<HTMLDialogElement>('dialog').close();
  }).catch(error=>{notice(error instanceof APIError&&error.status===409?'Файл изменился. Откройте его ещё раз.':'Текст страницы не сохранился.');});
 });
}
function mountLiveClip(){
 const clip=document.querySelector<HTMLMediaElement>('#studio-result audio, #studio-result video');
 if(!clip?.src.startsWith('blob:'))return;
 const copy=clip.cloneNode(true) as HTMLMediaElement;copy.controls=true;copy.src=clip.src;$('assignment-thing').append(copy);
}
function restoreStoredPlan(content:string,message=''){
 try{
  const stored=JSON.parse(content) as {parts?:Array<{id?:string;kind?:string;text?:string;state?:string;ready?:string;wave?:number;dependsOn?:string[];thing?:PlanThing}>};
  const plan=openStoredPlan(Array.isArray(stored.parts)?stored.parts:[]);
  if(!plan)return;
  heldMessage=message||plan.parts.map(part=>part.text).join(' · ');
  const left=plan.parts.some(part=>part.state!=='done');
  paintPlan(plan,left?'Можно продолжить с того же чата.':'Все части уже собраны.');
 }catch{/* Старая запись плана просто не рисуется. */}
}
let heldPlan:WorkPlan|null=null;
let heldMessage='';
function clearHeldPlan(){
 heldPlan=null;heldMessage='';
 const host=$('assignment-live');host.hidden=true;
 $('assignment-parts').replaceChildren();
 $('assignment-thing').replaceChildren();
 $<HTMLButtonElement>('assignment-continue').hidden=true;
 $('assignment-login').hidden=true;
 $('assignment-frame').hidden=true;
}
function showContinue(plan:WorkPlan|null){
 heldPlan=plan;
 const button=$<HTMLButtonElement>('assignment-continue');
 button.hidden=!plan?.parts.some(part=>part.state!=='done');
 button.disabled=missionSubmitting;
}
function finishedMemory(){
 if(!heldPlan)return '';
 return heldPlan.parts.filter(part=>part.state==='done').map(part=>`${part.kind}: ${part.text}`).join('; ').slice(0,1000);
}
function showRestoredPage(thing:PlanThing){
 const draft=draftFromLine(thing.lines?.find(line=>line.startsWith('azrail-site\t')));
 if(!draft)return false;
 const files=filesForDraft(draft);
 stageFiles(files,fileNameFromPhrase(draft.name,'zip'));
 const html=files.find(file=>file.path==='index.html')?.text??'';
 if(!html.trim())return false;
 document.dispatchEvent(new CustomEvent('azrail:site-preview',{detail:html}));
 workspace.setPreview(true);
 return true;
}
async function restoreHeldPage(url:string){
 if(!url||!heldPlan||missionSubmitting)return;
 const part=[...heldPlan.parts].reverse().find(item=>item.thing?.url===url||item.versions?.some(version=>version.url===url));
 if(!part){notice('Эту страницу в текущем плане уже не найти.');return;}
 if(part.thing?.type==='page'&&part.thing.url===url){
  if(!showRestoredPage(part.thing))notice('Эту страницу не из чего открыть.');
  return;
 }
 const index=part.versions?.findIndex(version=>version.type==='page'&&version.url===url)??-1;
 if(index<0)return;
 const restored=restorePageVersion(part,index);
 if(!restored||!showRestoredPage(restored)){notice('Эту страницу не из чего вернуть.');return;}
 part.ready=`На экране снова «${restored.title||'страница'}».`;
 paintPlan(heldPlan);
 await rememberWork(heldMessage||part.text,heldPlan,true);
}
if(typeof document!=='undefined'){
 document.addEventListener('click',(event)=>{
  const button=event.target instanceof Element?event.target.closest('button[data-restore]'):null;
  if(!(button instanceof HTMLButtonElement))return;
  event.preventDefault();
  void restoreHeldPage(button.dataset.restore??'');
 });
}
async function rememberWork(message:string,plan:WorkPlan,finished:boolean){
 if(!account||local)return;
 const thread=chatHistory.current();if(!thread)return;
 const head=plan.parts[0];
 const pictured=finished?pictureReply(plan.parts):'';
 const summary=pictured||(finished&&head?(plan.parts.length>1?formatPlan(plan):formatAssignment(head)):'');
 try{
  await api('/api/conversations/plan',{method:'POST',body:JSON.stringify({conversationId:thread.id,userText:(message===sentMarkup.for?message+sentMarkup.text:message).slice(0,4000),...(summary?{summary:summary.slice(0,4000)}:{}),plan:planRecord(plan)})});
 }catch{/* Полоса остаётся на этом экране, даже если запись не дошла. */}
}
function showAssignment(plan:Assignment){
 const host=$('assignment-live');
 host.hidden=false;
 host.dataset.kind=plan.kind;
 $('assignment-worker').textContent=plan.worker;
 $('assignment-now').textContent=plan.now;
 $('assignment-ready').textContent=plan.ready;
 $('assignment-next').textContent=plan.next;
 $('assignment-you').textContent=plan.needsYou;
 $('assignment-parts').replaceChildren();
 $('assignment-thing').replaceChildren();
 heldPlan=null;
 $<HTMLButtonElement>('assignment-continue').hidden=true;
 $('assignment-login').hidden=true;
 $('assignment-frame').hidden=true;
}
function paintPlan(plan:WorkPlan,needsYou='Пока не нужно.'){
 const host=$('assignment-live');
 host.hidden=false;
 host.dataset.kind='plan';
 const ready=plan.parts.filter(part=>part.wave===0);
 $('assignment-worker').textContent=plan.parallel?`План · ${plan.parts.length} части, рядом ${ready.length}`:`План · ${plan.parts.length} части`;
 const running=plan.parts.filter(part=>part.state==='running');
 $('assignment-now').textContent=running.length?running.map(part=>`${part.worker}: ${part.text}`).join(' · '):ready.map(part=>part.worker).join(' · ');
 $('assignment-ready').textContent=plan.parts.map(part=>part.ready).join(' ');
 $('assignment-next').textContent=explainIntent(intentFromParts(heldMessage||plan.parts.map(part=>part.text).join(' · '),plan.parts));
 $('assignment-you').textContent=needsYou;
 paintThings(plan.parts);
 const frame=$('assignment-frame');
 frame.hidden=!plan.parts.some(part=>part.kind==='image'&&part.state!=='done');
 markFrame();
 const list=$('assignment-parts');
 list.replaceChildren();
 for(const part of plan.parts){
  const item=document.createElement('li');
  const line=document.createElement('span');
  const place=part.state==='running'?'идёт':part.state==='done'?'готово':part.state==='failed'?'не вышло':part.wave===0?'рядом':'ждёт';
  const why=part.state==='failed'&&part.needsYou&&part.needsYou!=='Пока не нужно.'?` — ${part.needsYou}`:'';
  line.textContent=`${part.worker} — ${place} — ${part.text}${why}`;
  const edit=document.createElement('button');
  edit.type='button';
  edit.className='part-edit';
  edit.textContent='Править';
  edit.dataset.part=part.id;
  edit.onclick=()=>openPartEdit(plan,part.id);
  const other=document.createElement('button');
  other.type='button';
  other.className='part-edit';
  other.textContent='Другая студия';
  other.onclick=()=>openPartKind(plan,part.id);
  item.append(line,edit,other);
  if(part.state==='done'&&part.kind==='image'&&part.thing?.url){
   const grow=document.createElement('button');
   grow.type='button';
   grow.className='part-edit';
   grow.textContent='Увеличить';
   grow.onclick=()=>{
    if(missionSubmitting)return;
    upscaleOnce.add(part.id);
    part.state='waiting';
    part.ready='';
    if(part.thing)part.versions=[part.thing,...(part.versions??[])].slice(0,3);
    delete part.thing;
    const message=heldMessage||plan.parts.map(row=>row.text).join(' · ');
    void runPlan(plan,message,true,part.id).catch(failure);
   };
   item.append(grow);
  }
  if(part.kind==='web'&&part.thing?.type!=='page'){
   const publish=document.createElement('button');
   publish.type='button';
   publish.className='part-edit';
   publish.textContent='Опубликовать';
   publish.onclick=()=>{
    void (async()=>{
     const files=await pageSource();
     const fit=files?await phoneFit(files.html,files.css):'Ширину телефона сейчас не измерить.';
     notice(fit);
     const page=await keepPage();
     if(!page){notice(`Страницу пока не из чего опубликовать. ${fit}`);return;}
     part.thing=page;
     part.ready=`Страница опубликована. Она живёт 90 дней. ${fit}`;
     paintPlan(plan,needsYou);
    })().catch(failure);
   };
   item.append(publish);
   const zip=document.createElement('button');
   zip.type='button';
   zip.className='part-edit';
   zip.textContent='Скачать проект';
   zip.onclick=()=>{void downloadProject().catch(failure);};
   const copy=document.createElement('button');
   copy.type='button';
   copy.className='part-edit';
   copy.textContent='Копия проекта';
   copy.onclick=()=>{void copyProject().catch(failure);};
   const rewrite=document.createElement('button');
   rewrite.type='button';
   rewrite.className='part-edit';
   rewrite.textContent='Править текст';
   rewrite.onclick=()=>{void editPageText().catch(failure);};
   item.append(zip,rewrite);
   if(account?.role!=='viewer')item.append(copy);
  }
  if(part.state==='failed'){
   const retry=document.createElement('button');
   retry.type='button';
   retry.className='part-edit';
   retry.textContent='Повторить';
   retry.dataset.retry=part.id;
   retry.onclick=()=>{
    if(missionSubmitting||!retryPart(plan,part.id))return;
    const message=heldMessage||plan.parts.map(row=>row.text).join(' · ');
    void runPlan(plan,message,true,part.id).catch(failure);
   };
   item.append(retry);
  }
  list.append(item);
 }
 showContinue(plan);
 const login=$<HTMLButtonElement>('assignment-login');
 login.hidden=!needsYou.includes('Войди');
}
function openPartKind(plan:WorkPlan,id:string){
 const part=plan.parts.find(item=>item.id===id);
 if(!part||missionSubmitting)return;
 const item=document.querySelector<HTMLButtonElement>(`#assignment-parts [data-part="${CSS.escape(id)}"]`)?.closest('li');
 if(!item)return;
 item.replaceChildren();
 const pick=document.createElement('select');
 pick.setAttribute('aria-label',`Студия для части ${part.worker}`);
 for(const kind of SWITCH_KINDS){if(kind===part.kind)continue;const option=document.createElement('option');option.value=kind;option.textContent=assignmentForKind(kind).worker;pick.append(option);}
 const go=document.createElement('button');
 go.type='button';
 go.textContent='Собрать в этой студии';
 go.onclick=()=>{
  if(!switchPartKind(plan,id,pick.value as typeof SWITCH_KINDS[number]))return;
  const message=heldMessage||plan.parts.map(row=>row.text).join(' · ');
  void runPlan(plan,message,true,id).catch(failure);
 };
 item.append(pick,go);
 pick.focus();
}
function openPartEdit(plan:WorkPlan,id:string){
 const part=plan.parts.find(item=>item.id===id);
 if(!part||missionSubmitting)return;
 const button=document.querySelector<HTMLButtonElement>(`#assignment-parts [data-part="${CSS.escape(id)}"]`);
 const item=button?.closest('li');
 if(!item)return;
 item.replaceChildren();
 const field=document.createElement('input');
 field.type='text';
 field.value=part.text;
 field.maxLength=500;
 field.setAttribute('aria-label',`Текст части ${part.worker}`);
 const save=document.createElement('button');
 save.type='button';
 save.textContent='Собрать эту часть';
 save.onclick=()=>{
  if(!revisePart(plan,id,field.value))return;
  const message=heldMessage||plan.parts.map(row=>row.text).join(' · ');
  void runPlan(plan,message,true,id).catch(failure);
 };
 item.append(field,save);
 field.focus();
}
function waitForSelector(selector:string,ms=8000){
 return new Promise<boolean>(resolve=>{
  const start=Date.now();
  const tick=()=>{
   if(document.querySelector(selector)){resolve(true);return;}
   if(Date.now()-start>=ms){resolve(false);return;}
   window.setTimeout(tick,40);
  };
  tick();
 });
}
async function runAssignment(plan:Assignment&{versions?:PlanThing[];seed?:number|null;text?:string;fromContext?:boolean},message:string){
 if(attachmentManager.hasPending())throw Error('Дождитесь окончания загрузки вложений.');
 if(attachmentManager.hasFailed())throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');
 const thread=chatHistory.current()??chatHistory.create();
 project=thread.projectId||project||crypto.randomUUID();
 const requestKey=crypto.randomUUID();
 remember();
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 chatHistory.accepted(requestKey,message+await attachmentMarkup(message),project,'');
 if(prompt.value.trim()===message)prompt.value='';chatHistory.setDraft('');workspace.resizePrompt();
 const paint=(next:Assignment,status='completed')=>{showAssignment(next);chatHistory.report(requestKey,formatAssignment(next),status);syncChatUI();workspace.toLatest();};
 try{
  if(!account&&plan.kind!=='music'){paint({...plan,needsYou:'Войди в аккаунт, и я начну это поручение.'});return;}
  if(account?.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');
  showAssignment(plan);
  chatHistory.report(requestKey,plan.kind==='image'?'Собираю картинку…':formatAssignment(plan),'queued');
  syncChatUI();workspace.toLatest();
  const text=(plan.versions?.length||plan.fromContext)&&plan.text?plan.text:message;
  const one=(thing?:PlanThing,state:PlanPart['state']='running'):WorkPlan=>({parallel:false,parts:[{...plan,...(state==='done'&&part.ready?{ready:part.ready}:{}),id:'part-1',text,wave:0,dependsOn:[],state,thing,versions:plan.versions,seed:plan.seed??undefined}]});
  const part:PlanPart={...plan,id:'part-1',text,wave:0,dependsOn:[],state:'running',versions:plan.versions,seed:plan.seed??undefined};
  await rememberWork(message,one(),false);
  await runPlanPart(part);
  paintThings(part.thing?[{thing:part.thing,state:'done',versions:part.versions}]:[]);
  await rememberWork(message,one(part.thing,'done'),true);
  const pictured=pictureReply([part]);
  if(pictured){showAssignment({...plan,ready:part.ready||plan.ready});chatHistory.report(requestKey,pictured,'completed');syncChatUI();workspace.toLatest();}
  else if(part.ready)paint({...plan,ready:part.ready});
  showContinue(one(part.thing,'done'));
  clearAttachments();
 }
 catch(e){
  const text=e instanceof Error?e.message:'Не удалось начать поручение.';
  paint({...plan,needsYou:text},'failed');
  throw e;
 }
 finally{missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;}
}
async function todayNote(plan:WorkPlan){
 const video=plan.parts.some(part=>part.kind==='video')?'Ролик будет раскадровкой, внешняя съёмка не вызывается.':'';
 if(!account||local)return ['После входа будет виден остаток на сегодня.',video].filter(Boolean).join(' ');
 try{
  return [limitsText(await api('/api/limits') as LimitsRead),video].filter(Boolean).join(' ');
 }catch{
  return ['Остаток на сегодня сейчас не прочитан. Потолок чата 200, генерации 500.',video].filter(Boolean).join(' ');
 }
}
async function runPlan(plan:WorkPlan,message:string,resume=false,onlyId=''){
 if(attachmentManager.hasPending())throw Error('Дождитесь окончания загрузки вложений.');
 if(attachmentManager.hasFailed())throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');
 const thread=chatHistory.current()??chatHistory.create();
 project=thread.projectId||project||crypto.randomUUID();
 const requestKey=crypto.randomUUID();
 heldMessage=message;
 remember();
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 if(!resume){
  chatHistory.accepted(requestKey,message+await attachmentMarkup(message),project,'');
  if(prompt.value.trim()===message)prompt.value='';chatHistory.setDraft('');workspace.resizePrompt();
 }
 const estimate=await todayNote(plan);
 const paint=(needsYou?:string)=>{paintPlan(plan,[estimate,needsYou].filter(Boolean).join(' '));if(!resume)chatHistory.report(requestKey,[formatPlan(plan),pictureReply(plan.parts),needsYou].filter(Boolean).join('\n\n'),plan.parts.some(part=>part.state==='failed')?'failed':'completed');syncChatUI();workspace.toLatest();};
 const aimed=onlyId?plan.parts.filter(part=>part.id===onlyId):plan.parts;
 const needsAccount=aimed.some(part=>part.kind!=='music'&&part.state!=='done');
 try{
  if(!account&&needsAccount){paint('Войди в аккаунт, и я начну части, которым нужен вход.');return;}
  if(account?.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');
  const groups=wavesToRun(plan,onlyId||undefined);
  if(!groups.length){paint('Все части уже собраны.');return;}
  await rememberWork(message,plan,false);
  for(const group of groups){
   const runnable=holdBlocked(plan,group);
   if(!runnable.length){
    paint('Следующая часть остановлена: предыдущая не вышла.');
    continue;
   }
   for(const part of runnable)part.state='running';
   paint();
   const jobs:Array<Promise<void>>=[];
   for(const part of runnable)jobs.push(runPlanPart(part));
   const results=await Promise.allSettled(jobs);
   const order=runnable;
   results.forEach((result,index)=>{
    const part=order[index];
    if(!part)return;
    if(result.status==='rejected'){part.state='failed';part.needsYou=result.reason instanceof Error?result.reason.message:'Эта часть не вышла.';}
    else if(part.state==='running')part.state='done';
   });
   // Вложения уходят с поручением; оставленный файл подмешался бы в следующие сообщения.
   clearAttachments();
   paint(plan.parts.some(part=>part.state==='failed')?'Часть плана не вышла. Остальные, которые уже шли рядом, не откатываю.':undefined);
   mountLiveClip();
  }
  await rememberWork(message,plan,true);
  clearAttachments();
 }
 catch(e){
  const text=e instanceof Error?e.message:'Не удалось начать план.';
  paint(text);
  throw e;
 }
 finally{missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;if(heldPlan)showContinue(heldPlan);}
}
const MISSION_BUSY=new Set(['','Задача принята','Составляю план','Выполняю задачу','Проверяю результат','Останавливаю задачу','Обновляю состояние']);
async function settleMission(){
 const start=Date.now();
 let live='';
 while(Date.now()-start<90_000){
  await poll(++epoch);
  live=$('mission-status').textContent?.trim()??'';
  if(live==='Нужно ваше действие')throw Error('Миссия ждёт действие в ходе задачи.');
  if(live==='Работа остановлена'||live==='Задача отменена')throw Error(live);
  if(!MISSION_BUSY.has(live))return live;
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error('Страница ещё собирается. Нажми «Повторить», когда ход задачи закончится.');
}
async function publishChatPage(part:PlanPart){
 const previous=part.versions?.find(item=>item.type==='page');
 const saved=draftFromLine(previous?.lines?.find(line=>line.startsWith('azrail-site\t')));
 const draft=saved?applySiteNote(saved,part.text):draftFromPhrase(part.text);
 if(!draft)throw Error('Эту правку страница не применила. Она умеет сделать чат шире, добавить импульс, усилить слабый вид и оставить одну страницу.');
 const files=filesForDraft(draft);
 const stored=project?await storeSiteFiles(files):false;
 const published=await api('/api/studio/web/publish',{method:'POST',body:JSON.stringify({name:draft.name,files})}) as {url?:string};
 const url=safeMediaPath(String(published.url??''));
 if(!url)throw Error('Страница собрана, но ссылка просмотра не вернулась.');
 stageFiles(files,fileNameFromPhrase(draft.name,'zip'));
 const html=files.find(file=>file.path==='index.html')?.text??'';
 if(html.trim()){document.dispatchEvent(new CustomEvent('azrail:site-preview',{detail:html}));workspace.setPreview(true);}
 let zipUrl='';
 if(account){
  try{
   const packed=siteZip(files);
   const saved=await api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':'application/zip','X-Filename':encodeURIComponent(fileNameFromPhrase(draft.name,'zip')),'X-Studio-Id':'web'},body:packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength) as ArrayBuffer}) as {url?:string};
   zipUrl=safeMediaPath(String(saved.url??''));
  }catch{zipUrl='';}
 }
 part.state='done';
 part.ready=zipUrl?`Страница «${draft.name}» на экране. ZIP проекта в чате.`:(stored?`Страница «${draft.name}» на экране. Файлы записаны в проект, папка site.`:`Страница «${draft.name}» на экране.`);
 part.thing={type:'page',url,title:draft.name,lines:[draftLine(draft),...(zipUrl?[`azrail-zip\t${zipUrl}`]:[])]};
}
async function storeSiteFiles(files:Array<{path:string;text:string}>){
 let written=0;
 for(const file of files){
  const path=`site/${file.path}`;
  try{
   await api(`/api/projects/${encodeURIComponent(project)}/workbench/files`,{method:'POST',body:JSON.stringify({action:'create',path,content:file.text})});
   written+=1;
  }catch(error){
   if(!(error instanceof APIError)||error.status!==409)continue;
   try{
    const opened=await api(`/api/projects/${encodeURIComponent(project)}/workbench/file?path=${encodeURIComponent(path)}`) as {sha256?:string};
    await api(`/api/projects/${encodeURIComponent(project)}/workbench/files`,{method:'POST',body:JSON.stringify({action:'update',path,content:file.text,expectedSha256:opened.sha256??''})});
    written+=1;
   }catch{/* Этот файл не записался. Публикация всё равно покажет страницу. */}
  }
 }
 return written===files.length&&written>0;
}
function artifactId(url:string){
 const match=/\/api\/studio\/artifacts\/([A-Za-z0-9._~-]+)/.exec(url);
 return match?.[1]??'';
}
async function runPlanPart(part:PlanPart){
 if(part.kind==='image'){
  const signed=account;if(!signed)throw Error('Войдите, чтобы собрать изображение.');
  const previous=part.versions?.[0]?.url??'';
  const earlier=artifactId(previous);
  const attachedId=await attachedImageReference();
  if(attachedId){clearAttachments();imageReference='';}
  const chosen=attachedId||imageReference;
  const grow=upscaleOnce.has(part.id);
  upscaleOnce.delete(part.id);
  const reference=grow?earlier:chosen||earlier;
  const follow=!grow&&Boolean(reference);
  const operation=grow?'upscale':follow?'edit':'generate';
  const fresh:ImageRequestBody={prompt:part.text,projectId:project||undefined,aspectRatio:imageFrame,resolution:768,style:'auto',seed:part.seed??null,variations:follow||grow?1:imageCount,operation,...(reference?{referenceArtifactId:reference,identityConsistency:true}:{})};
  const pending=readPendingImage(signed.id);
  let body=fresh;
  let stuck=false;
  if(pending){
   let saved:ImageRequestBody|null=null;
   try{saved=JSON.parse(pending.body) as ImageRequestBody;}catch{saved=null;}
   const same=!!saved&&saved.prompt===fresh.prompt&&(saved.referenceArtifactId??null)===(fresh.referenceArtifactId??null)&&saved.operation===fresh.operation;
   if(same&&saved){body=saved;stuck=pending.body!==JSON.stringify(fresh);}
   else{try{sessionStorage.removeItem('pulse.image.pending');}catch{/* Новая картинка не должна дорисовывать старый запрос. */}}
  }
  const result=await requestImage(signed.id,body,api) as {items?:Array<{name?:string;url?:string;seed?:number|null}>};
  const urls=(result.items??[]).map(item=>safeMediaPath(String(item.url??''))).filter(Boolean);
  const name=fileNameFromPhrase(part.text,'png');
  const seed=result.items?.find(item=>Number.isInteger(item.seed))?.seed;
  if(typeof seed==='number')part.seed=seed;
  part.state='done';
  part.ready=stuck?`Закончила зависшую сборку «${name}».`:grow?`Детализация «${name}» сохранена.`:urls.length>1?`${urls.length} варианта «${name}».`:`Картинка «${name}» сохранена.`;
  if(urls[0])part.thing={type:'image',url:urls[0],title:name,caption:part.text.slice(0,300),...(urls.length>1?{alts:urls.slice(1,3)}:{})};
  return;
 }
 if(part.kind==='music'){
  if(!account)throw Error('Войдите, чтобы собрать трек.');
  const result=await api('/api/studio/music/generate',{method:'POST',body:JSON.stringify({prompt:part.text,instrumental:true})}) as {audioBase64?:string;mime?:string};
  if(typeof result.audioBase64!=='string'||!result.audioBase64)throw Error('Генератор вернул пустой файл.');
  const binary=atob(result.audioBase64);
  const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  const blob=new Blob([bytes],{type:result.mime||'audio/mpeg'});
  const saved=await api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':blob.type,'X-Filename':fileNameFromPhrase(part.text,'mp3'),'X-Studio-Id':'music',...(project?{'X-Project-Id':project}:{})},body:blob}) as {url?:string};
  const url=safeMediaPath(saved.url?`${saved.url}${saved.url.includes('?')?'':'?inline=1'}`:'');
  part.state='done';
  part.ready=url?'Трек в чате.':'Трек собран, ссылка не сохранилась.';
  if(url)part.thing={type:'audio',url,title:fileNameFromPhrase(part.text,'mp3')};
  return;
 }
 if(part.kind==='video'){
  if(!account)throw Error('Войдите, чтобы собрать раскадровку.');
  const result=await api('/api/studio/video/plan',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({prompt:part.text,sceneCount:4,transition:'fade',motion:'pan'})}) as {scenes?:Array<{text?:string}>};
  const scenes=(result.scenes??[]).flatMap(scene=>{const line=scene.text?.trim()??'';return line? [line] : [];}).slice(0,4);
  part.state='done';
  part.ready=scenes.length?`Раскадровка: ${scenes.join(' · ')}`:'Раскадровка запрошена. Внешняя съёмка не вызывается.';
  if(scenes.length)part.thing={type:'storyboard',lines:scenes};
  return;
 }
 if(part.kind==='web'){
  await publishChatPage(part);
  return;
 }
 if(part.kind==='diagram'){
  const model=diagramModel(part.text);
  part.state='done';
  part.ready='Схема в чате.';
  part.thing={type:'diagram',title:'Схема',lines:diagramLines(model)};
  return;
 }
 if(part.kind==='file'){
  if(!account)throw Error('Войдите, чтобы собрать файл.');
  const made=buildOffice(part.text);
  const saved=await api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':made.mime,'X-Filename':encodeURIComponent(made.name),'X-Studio-Id':'data'},body:made.bytes.buffer.slice(made.bytes.byteOffset,made.bytes.byteOffset+made.bytes.byteLength) as ArrayBuffer}) as {url?:string};
  const url=safeMediaPath(String(saved.url??''));
  if(!url)throw Error('Файл собран, но ссылка не сохранилась.');
  part.state='done';
  part.ready=`Файл «${made.name}» в чате.`;
  part.thing={type:'file',url,title:made.name};
  return;
 }
 if(part.kind==='build'){
  await runMission(part.text,{keepTurn:true,stay:true,nested:true});
  const live=await settleMission();
  part.state='done';
  part.ready=live;
  part.thing={type:'note',title:part.ready};
  return;
 }
 part.state='done';
}
async function runPlanScreen(part:PlanPart){
 if(!part.studio||!part.control)throw Error('Для этой части нет экрана студии.');
 navigation.navigate({page:'studio',studio:part.studio});
 const found=await waitForSelector(part.control);
 if(!found)throw Error('Студия не открылась. Отправь фразу ещё раз.');
 prompt.value=part.text;
 const held=missionSubmitting;
 missionSubmitting=false;
 try{await runStudioRoom();}
 finally{missionSubmitting=held;}
 const thing=harvestStudioThing();
 const stored=part.kind==='music'&&thing?.type!=='audio'?await keepPlayer()??thing:thing;
 if(stored?.type==='audio')stored.title=fileNameFromPhrase(part.text,'webm');
 if(stored)part.thing=stored;
 part.state='done';
}
const WORK_REQUEST=/(?:сдела|созда|постро|собер|нарису|рисуй|сгенер|сочин|разработ|сайт|страниц|лендинг|логотип|трек|музык|видео|картинк|изображен|проект|задач|миссия|план)/iu;
const slowPlan=<T,>(work:Promise<T>,ms:number)=>Promise.race([work,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Планировщик отвечает долго.')),ms))]);
async function chosenPlan(message:string):Promise<WorkPlan|null>{
 const localPlan=planWork(message);
 if(localPlan?.parts.some(part=>part.kind==='file'||part.kind==='diagram'))return localPlan;
 if(local||!account||(account.role!=='admin'&&!account.operator))return localPlan;
 if(!WORK_REQUEST.test(message))return localPlan;
 try{
  const memory=finishedMemory();
  const drafted=await slowPlan(api('/api/plan',{method:'POST',body:JSON.stringify({message,...(memory?{memory}:{})})}),2500) as {fallback?:boolean;parts?:Array<{text?:string;kind?:string;after?:boolean}>};
  if(drafted.fallback)return planWork(message);
  if(!Array.isArray(drafted.parts)||drafted.parts.length===0)return keepAskedMedia(message,null);
  return keepAskedMedia(message,groundWorkPlan(message,workPlanFromDraft(drafted.parts)??planWork(message)));
 }catch{return planWork(message);}
}
function noteLocal(message:string,reply:string){
 const thread=chatHistory.current()??chatHistory.create();
 const requestKey=crypto.randomUUID();
 project=thread.projectId||project||crypto.randomUUID();
 chatHistory.accepted(requestKey,message,project,thread.id);
 chatHistory.report(requestKey,reply,'completed');
 prompt.value='';chatHistory.setDraft('');workspace.resizePrompt();syncChatUI();workspace.toLatest();
}
async function saveFromScreen(kind:'file'|'zip',message:string){
 const path=activePath();
 const text=document.querySelector<HTMLTextAreaElement>('#home-code')?.value??'';
 const packed=kind==='zip'?await bytesForArchive(path,text):bytesForFile(path,text);
 if(!packed){noteLocal(message,'Сначала открой файл из архива или собери страницу.');return;}
 saveBytes(packed.name,packed.bytes);
 noteLocal(message,`Скачал ${packed.name}. ${packed.note}`);
}
function revealHeld(message:string){
 if(!/открой|покажи|выведи|прочитай|посмотри|глянь/iu.test(message))return '';
 const path=askedPaths(message).map(matchHeldPath).find((item):item is string=>Boolean(item))??'';
 if(!path)return '';
 document.dispatchEvent(new CustomEvent('azrail:zip-open',{detail:path}));
 workspace.setPreview(true);
 return path;
}
const chatCommands=createChatCommands({
 api:(path,init)=>api(path,init),noteLocal:(m,r)=>noteLocal(m,r),notice:(t,p)=>notice(t,p),
 signedIn:()=>!!account,project:()=>project,voice:()=>chatVoice,preferredModel:()=>preferredModel,
 setPreferredModel:slug=>setPreferredModel(slug),
 models:()=>pickerModels().map(m=>({slug:m.slug,label:modelLabel(m),free:!!m.freeAllowlisted&&m.availability!=='unavailable'})),
 labelOf:slug=>{const here=composerModels.find(slug);return here?modelLabel(here):(slug?modelDisplayName(slug):'Auto · AZRAIL');},
});
async function runChat(){
 if(missionSubmitting)return;
 const message=prompt.value.trim();if(!message)return;
 const opened=revealHeld(message);
 const only=openOnlyPath(message);
 if(only&&opened){noteLocal(message,`Открыл ${opened}.`);return;}
 if(only&&sourceIsHeld()&&!opened){noteLocal(message,`В открытых файлах нет ${only}.`);return;}
 const local=localCommandOf(message);
 if(local==='quota'){
  let read:LimitsRead|null=null;
  if(account&&!isLocalPage)try{read=await api('/api/limits') as LimitsRead;}catch{read=null;}
  noteLocal(message,account&&!isLocalPage?limitsText(read):'После входа будет виден остаток на сегодня.');return;
 }
 if(local==='save-zip'){await saveFromScreen('zip',message);return;}
 if(local==='save-file'){await saveFromScreen('file',message);return;}
 if(await chatCommands(message))return;
 const studioKind=studioIntent(message,attachmentManager.files());
 if(studioKind){
  try{
   if(!account)throw Error('Войдите, чтобы открыть этот отчёт.');
   if(studioKind==='ledger')noteLocal(message,ledgerSummary(await api('/api/studio/ledger?limit=200')));
   else if(studioKind==='budget')noteLocal(message,budgetSummary(await api('/api/studio/budget')));
   else if(studioKind==='pulse')noteLocal(message,pulseSummary(await api('/api/studio/pulse')));
   else if(studioKind==='data'){
    const file=attachmentManager.files().find(item=>/\.(?:csv|tsv)$/i.test(item.name))!;
    if(file.size>2_000_000)throw Error('Таблица должна быть не больше 2 МБ.');
    const {parseDataset}=await import('./data');
    noteLocal(message,dataSummary(file.name,parseDataset(await file.text()).analysis));
    clearAttachments();
   }else{
    const file=attachmentManager.files().find(item=>/\.(?:wav|mp3|flac|ogg|m4a|aac|webm)$/i.test(item.name))!;
    const {analyzeAudio}=await import('./media');
    noteLocal(message,audioSummary(file.name,await analyzeAudio(file)));
    clearAttachments();
   }
  }catch(e){noteLocal(message,e instanceof Error?e.message:'Не удалось собрать отчёт.');}
  return;
 }
 if(wantsZipOfReply(message)){
  const last=[...(chatHistory.current()?.turns??[])].reverse().find(turn=>turn.status==='completed'&&filesFromReply(turn.reply).length>0);
  const bytes=last?zipOfReply(last.reply):null;
  if(last&&bytes){
   saveBytes('azrail-files.zip',bytes);
   noteLocal(message,`Собрал azrail-files.zip: ${filesFromReply(last.reply).map(file=>file.path).join(', ')}.`);
   return;
  }
 }
 if(local==='restore-file'){
  const field=document.querySelector<HTMLTextAreaElement>('#home-code');
  const back=restoreFileShot(activePath(),field?.value??'');
  if(!back){noteLocal(message,'Прошлой правки файла на экране нет.');return;}
  document.dispatchEvent(new CustomEvent('azrail:file-shown',{detail:back}));
  noteLocal(message,`На экране снова ${back.path}.`);
  return;
 }
 if(local==='run-tests'){
  try{
   const r=await api('/api/trial/sandbox',{method:'POST',body:JSON.stringify({projectId:project||''})}) as {note?:string;output?:string};
   noteLocal(message,String(r.note||r.output||'Готово.'));
  }catch(e){noteLocal(message,e instanceof Error?e.message:'Команды в контейнере выключены.');}
  return;
 }
 if(local==='blocked-commands'||local==='blocked-deploy'){noteLocal(message,blockedReply[local]);return;}
 const skills=skillsReply(message);
 if(wantsPageRestore(message)){
  const restored=takeBackPage(heldPlan);
  if(restored){
   const shown=showRestoredPage(restored);
   const thread=chatHistory.current()??chatHistory.create();
   const requestKey=crypto.randomUUID();
   project=thread.projectId||project||crypto.randomUUID();
   const name=restored.title||'страница';
   const reply=shown?`На экране снова «${name}».`:'Эту страницу не из чего открыть.';
   chatHistory.accepted(requestKey,message,project,thread.id);
   chatHistory.report(requestKey,reply,'completed');
   prompt.value='';chatHistory.setDraft('');workspace.resizePrompt();
   if(heldPlan){paintPlan(heldPlan);void rememberWork(heldMessage||message,heldPlan,true);}
   syncChatUI();workspace.toLatest();
   return;
  }
 }
 if(skills){
  const thread=chatHistory.current()??chatHistory.create();
  const requestKey=crypto.randomUUID();
  project=thread.projectId||project||crypto.randomUUID();
  chatHistory.accepted(requestKey,message,project,thread.id);
  chatHistory.report(requestKey,skills,'completed');
  prompt.value='';chatHistory.setDraft('');workspace.resizePrompt();syncChatUI();workspace.toLatest();
  return;
 }
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 let handed=false;
 try{
 const draw=drawRequest(message,{hasImage:attachmentManager.files().some(isImageFile),previous:contextPrompt(chatHistory.current()?.turns.at(-1))});
 if(draw){handed=true;await runAssignment({...assignmentForKind('image'),text:draw.text,fromContext:draw.text!==message},message);return;}
 let planned=followUpPlan(message,heldPlan)??await chosenPlan(message);
 if(planned&&planned.parts.length===1&&planned.parts[0].kind==='build')planned=null;
 // Сайт по приложенному файлу: конструктор файл не читает, поэтому разбор и код уходят в чат, где файл виден.
 if(planned&&planned.parts.length===1&&['web','page'].includes(planned.parts[0].kind)&&attachmentManager.files().some(file=>!isImageFile(file)))planned=null;
 if(planned&&planned.parts.length>1){handed=true;await runPlan(planned,message);return;}
 if(planned&&planned.parts.length===1){handed=true;await runAssignment(planned.parts[0],message);return;}
 if(!account)throw Error('Войдите в аккаунт, чтобы писать в Chat.');
 if(account.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');
 if(account.role!=='admin'&&!account.operator)throw Error('Chat пока открыт только владельцу.');
 if(attachmentManager.hasPending())throw Error('Дождитесь окончания загрузки вложений.');
 if(attachmentManager.hasFailed())throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');
 const thread=chatHistory.current()??chatHistory.create();
 // Keep the thread's project so attach() does not jump to another chat.
 project=thread.projectId||project||crypto.randomUUID();
 // One Chat thread = one server conversation (stable memory across turns).
 const conversationId=thread.id;
 const requestKey=crypto.randomUUID();
 remember();
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 const shown=message+await attachmentMarkup(message);chatHistory.accepted(requestKey,shown,project,conversationId);
 const sentRefs=attachmentRefs;clearAttachments();
 chatHistory.report(requestKey,'','queued');
 if(prompt.value.trim()===message)prompt.value='';chatHistory.setDraft(prompt.value);workspace.resizePrompt();
 syncChatUI();workspace.toLatest();
 try{
  const body=chatRequestBody({message:shown,projectId:project,conversationId,voice:chatVoice,attachments:sentRefs,preferredModel:preferredModel||undefined,effort:modelMenu.effort()});
  const r=await api('/api/chat',{method:'POST',headers:{'Idempotency-Key':requestKey},body});
  const {reply:full,status}=chatReplyOf(r);
  const shownCode=status==='completed'?htmlBlockOf(full):null;
  const reply=shownCode?shownCode.text:full;
  if(shownCode){document.dispatchEvent(new CustomEvent('azrail:site-preview',{detail:shownCode.html}));workspace.setPreview(true);}
  chatHistory.report(requestKey,reply,status);
  syncChatUI();workspace.toLatest();
  void syncServerChats();
 }
 catch(e){
  const {daily,text}=chatFailureOf(e);
  chatHistory.report(requestKey,text,'failed');
  syncChatUI();workspace.toLatest();
  if(daily)notice(text,true);
  else throw e;
 }
 finally{if(!handed){missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;}}
 }finally{if(!handed){missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;}}
}
$('composer').onsubmit=e=>{
 e.preventDefault();
 if(composerPage==='create'){runChat().catch(failure);return;}
 if(composerPage==='mission'){runMission().catch(failure);return;}
 runStudioRoom().catch(failure);
};
const promptStudios=new Set(['image','music','video']);
const fileStudios=new Set(['audio','als','data']);
function writeStudioPrompt(text:string){
 const field=document.querySelector<HTMLTextAreaElement>('#studio-text');if(!field)return false;
 field.value=text.slice(0,field.maxLength>0?field.maxLength:text.length);field.dispatchEvent(new Event('input',{bubbles:true}));return true;
}
async function clickControl(id:string){
 const button=document.getElementById(id) as HTMLButtonElement|null;
 if(!button||button.disabled)return false;
 await Promise.resolve(button.onclick?.call(button,new Event('click') as unknown as PointerEvent));
 return true;
}
function handStudioFile(){
 const input=document.querySelector<HTMLInputElement>('#studio-file');
 if(!input||input.files?.[0]||typeof DataTransfer==='undefined')return !!input?.files?.[0];
 const file=attachmentManager.files()[0];if(!file)return false;
 const bag=new DataTransfer();bag.items.add(file);input.files=bag.files;input.dispatchEvent(new Event('change',{bubbles:true})); return true;
}
async function runStudioRoom(){
 if(missionSubmitting)return;
 const room=composerRoom;if(room==='home')return;
 const message=prompt.value.trim();if(!message)return;
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 if(composerPage==='studio'||composerPage==='metatron')setStudioTalk(true);
 const title=room==='metatron'?'Metatron':studioById(room)?.title??'Студия';
 prompt.value='';studioRooms.setDraft(room,'');workspace.resizePrompt();
 studioRooms.push(room,'user',message);
 const reply=studioRooms.push(room,'studio','Принимаю задачу…');
 renderStudioChat();
 try{
  if(attachmentManager.hasPending())throw Error('Дождитесь окончания загрузки вложений.');
  if(attachmentManager.hasFailed())throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');
  const caps=new Set(studioById(room)?.capabilities??[]);
  if(caps.has('prose-writing')){
   const field=document.querySelector<HTMLTextAreaElement>('#prose-prompt');
   if(!field){studioRooms.replace(room,reply.id,'Поле текста ещё открывается. Отправь сообщение ещё раз.');return;}
   const finished=/\[[^\]]{2,80}\]/.test(message)||message.length>700;
   const choice=[...document.querySelectorAll<HTMLButtonElement>('#prose-modes button')].find(button=>button.textContent===(finished?'Оставить как есть':'Три направления'));
   choice?.click();
   field.value=message.slice(0,field.maxLength>0?field.maxLength:message.length);
   field.dispatchEvent(new Event('input',{bubbles:true}));
   const started=await clickControl('prose-run');
   const status=document.querySelector('#prose-status')?.textContent?.trim()||'Текст на экране студии.';
   const preview=document.querySelector('#prose-results pre')?.textContent?.trim().slice(0,1200)??'';
   studioRooms.replace(room,reply.id,started?[status,preview].filter(Boolean).join('\n\n'):'Не удалось собрать текст. Поле уже заполнено, нажми «Собрать» выше.');
   return;
  }
  if(caps.has('ledger-read')||caps.has('system-diagnostics')){
   if(!account&&caps.has('ledger-read')){studioRooms.replace(room,reply.id,'Отчёт по расходам откроется после входа. Миссию по коду отсюда не запускаю.');return;}
   const started=await clickControl('studio-run');
   const report=($('studio-result').textContent??'').replace(/\s+/g,' ').trim().slice(0,500);
   studioRooms.replace(room,reply.id,started&&report?`Отчёт «${title}» обновлён.\n\n${report}`:`Отчёт «${title}» сейчас не собрался. Миссию по коду отсюда не запускаю.`);
   return;
  }
  if(room==='music'){
   const {setDirectionFlags}=await import('./music-direction');
   setDirectionFlags({wish:message});
   const wishField=document.querySelector<HTMLTextAreaElement>('#music-shelf-wish');if(wishField)wishField.value=message;
   const file=attachmentManager.files()[0];
   let heard='';
   try{
    if(file&&/\.(als|xml)$/i.test(file.name)){
     const input=document.querySelector<HTMLInputElement>('#music-als-file') as HTMLInputElement & {pending?:Promise<void>};
     if(giveFile('music-als-file',file)){await input?.pending?.catch(()=>undefined);heard='Проект принял как карту.';}
    }else if(file){
     const input=document.querySelector<HTMLInputElement>('#music-direction-file') as HTMLInputElement & {pending?:Promise<void>};
     if(giveFile('music-direction-file',file)){await input?.pending?.catch(()=>undefined);heard='Трек принял как ориентир.';}
    }
    const started=await clickControl('music-listen-build');
    const statusText=document.querySelector('#music-direction-status')?.textContent??'';
    const line=statusText.includes('Готово')?`${heard} Файл генератора в плеере. Длина как вышла.`.trim():statusText.includes('Ключ')?'Бриф на месте. Ключ генератора ещё не в воркере, в чат его не клади.':started&&statusText?statusText:'Экран трека ещё не принял задачу. Напиши ещё раз, когда студия откроется.';
    studioRooms.replace(room,reply.id,replyInKind(message,line));
   }catch{studioRooms.replace(room,reply.id,replyInKind(message,'Сборка не дошла до конца. Экран трека не менялся.'));}
   return;
  }
  if(promptStudios.has(room)){
   writeStudioPrompt(message);
   const run=document.getElementById('studio-run') as HTMLButtonElement|null;
   if(!account){studioRooms.replace(room,reply.id,'Текст уже в поле студии. Войди в аккаунт и отправь ещё раз, чтобы студия собрала результат.');return;}
   if(run?.disabled){studioRooms.replace(room,reply.id,'Сейчас у этого аккаунта нет права запустить студию. Текст сохранён в её поле.');return;}
   if(room==='video'){
    await clickControl('video-build-scenes');
    const shots=[...document.querySelectorAll<HTMLTextAreaElement>('.video-shot-prompt')].map(item=>item.value.trim()).filter(Boolean).slice(0,8);
    studioRooms.replace(room,reply.id,shots.length?`Серии готовы в Video Studio:\n${shots.map((shot,index)=>`${index+1}. ${shot}`).join('\n')}\nЗапускаю рендер. Длину ролика берёт настройка Duration выше.`:'Запускаю рендер в Video Studio.');
    renderStudioChat();void clickControl('studio-run');return;
   }
   void clickControl('studio-run');
   studioRooms.replace(room,reply.id,room==='image'?'Собираю изображение в Image Studio. Размер, стиль и модель берутся из настроек выше, результат появится там же.':'Собираю трек в Music Studio. Темп и тональность берутся из настроек выше, WAV и MIDI появятся в результате.');
   return;
  }
  if(fileStudios.has(room)){
   const ready=handStudioFile();
   if(!ready){studioRooms.replace(room,reply.id,'Прикрепи файл кнопкой + или выбери его в поле выше, потом отправь сообщение ещё раз.');return;}
   if(room==='als'&&!account){studioRooms.replace(room,reply.id,'Файл на месте. Чтобы разобрать Ableton-проект, войди в аккаунт и отправь ещё раз.');return;}
   const started=await clickControl('studio-run');
   studioRooms.replace(room,reply.id,started?'Файл принят. Отчёт появится в студии выше.':'Студия не смогла начать разбор. Проверь файл и право доступа.');
   return;
  }
  studioRooms.replace(room,reply.id,caps.has('mission')?'Сборка сайта и правки файлов запускаются в Chat или Mission Control. Этот чат файлы проекта не пишет.':'Этот чат не запускает миссию по коду. Задачу для проекта отправь в Chat или Mission Control.');
 }finally{missionSubmitting=false;$<HTMLButtonElement>('submit').disabled=false;if(composerRoom===room)renderStudioChat();}
}
bind('composer-open-chat',()=>navigation.navigate({page:'create'}));
bind('studio-talk-open',()=>setStudioTalk(true,true));
bind('studio-talk-close',()=>setStudioTalk(false));
prompt.addEventListener('focus',()=>{if(composerRoom!=='home'&&(composerPage==='studio'||composerPage==='metatron'))setStudioTalk(true);});
async function poll(version=epoch){
 clearTimeout(pollTimer);if(!mission||document.hidden)return;
 const observedMission=mission;
 try {
  const r=await api(`/api/mission?missionId=${encodeURIComponent(observedMission)}`);if(version!==epoch||observedMission!==mission)return;pollFailures=0;
  const state=renderMission(document,r,!!account?.operator);
  const previous=chatHistory.current()?.turns.find(t=>t.missionId===observedMission)?.status;
  chatHistory.report(observedMission,$('mission-summary').textContent??'',state.status);
  const assignment=$('assignment-live');
  if(assignment.dataset.kind==='web'||assignment.dataset.kind==='build'||assignment.dataset.kind==='plan'){
   const live=$('mission-status').textContent?.trim();
   if(live)$('assignment-now').textContent=live;
  }
  $('context-status').textContent=$('mission-status').textContent;syncChatUI();
  if(previous!==state.status&&!state.active&&!$('mission-panel').hidden)void refreshContextFiles();
  if(state.active)pollTimer=window.setTimeout(()=>void poll(version),3000);
 }
 catch(e){if(version!==epoch)return;pollFailures++;$('mission-connection').textContent=e instanceof APIError&&e.status===401?'Сессия завершена. Войдите снова, чтобы продолжить просмотр.':'Связь прервана. Задача может продолжать работу на сервере. Повторная отправка не выполняется.';if(!(e instanceof APIError&&[401,403,404].includes(e.status))&&pollFailures<6)pollTimer=window.setTimeout(()=>void poll(version),Math.min(30000,3000*2**pollFailures));}
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){clearTimeout(pollTimer);return;}
 poll().catch(failure);
 if(account&&!local)void syncServerChats();
});
bind('resume',()=>poll(++epoch));
bind('cancel',async()=>{if(mission){await api('/api/mission/cancel',{method:'POST',body:JSON.stringify({missionId:mission,projectId:project})});await poll(++epoch);}});
bind('export-project',async()=>{if(!project)throw Error('Выберите проект.');const {download}=await import('./media');download(await blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(project)}`),'azrail-project.zip');});
bind('mission-download',()=>$('export-project').click());
bind('recover',async()=>{if(!mission)throw Error('Выберите миссию.');const r=await api('/api/mission/recover',{method:'POST',body:JSON.stringify({projectId:project,missionId:mission})});notice(r.resumed?'Миссия возобновлена.':r.reason);await poll(++epoch);});
bind('permit-sandbox',async()=>{if(!account?.operator)throw Error('Разрешение Sandbox выдаёт оператор платформы.');const c=await api('/api/studio/capabilities');if(!c.sandbox)throw Error('Sandbox отсутствует в этом профиле. Нужен Paid-профиль Cloudflare.');await api('/api/admin/permissions',{method:'POST',body:JSON.stringify({projectId:project,capability:'sandbox',enabled:true})});notice('Sandbox разрешён для этого проекта. Его использование тарифицируется отдельно.');});

function openProjectFromCenter(item:ProjectSummary){
 if((pending||missionSubmitting)&&project!==item.id){notice('Предыдущая отправка требует проверки. Повторите её перед сменой проекта.',true);return;}
 chatHistory.setDraft(prompt.value);resetMissionView();if(project!==item.id)clearAttachments();rememberProjectTitle(item.id,item.name);project=item.id;mission=item.missionId??'';
 const thread=chatHistory.attach(project,mission);if(!thread.turns.length)thread.title=item.name;prompt.value=thread.draft;
 remember();ensureEventStream();
 const studio=item.studioId&&studioById(item.studioId as StudioId)?item.studioId as StudioId:null;
 if(mission)navigation.navigate({page:'mission'});
 else if(studio)navigation.navigate({page:'studio',studio});
 else view('create');
 $('mission-panel').hidden=!mission;syncChatUI();if(mission)poll(epoch).catch(failure);prompt.focus();
}
async function loadProjects(){
 await renderProjectCenter({account,local,selectedProjectId:project,api,blobAPI,onOpen:openProjectFromCenter,notice,failure,dialog,closeDialog:()=>$<HTMLDialogElement>('dialog').close()});
}
for(const studio of studios.filter(item=>item.id!=='audio'&&item.id!=='als')){
 const el=document.createElement('a');el.className='card';el.dataset.studio=studio.id;el.dataset.icon=studio.icon;
 if(expertStudios.has(studio.id))el.dataset.expert='';
 const small=document.createElement('small'),h=document.createElement('h3'),p=document.createElement('p'),action=document.createElement('span');
 small.textContent=studio.type;h.textContent=studio.title;p.textContent=studio.description;action.className='card-action';action.textContent=studio.action+' ↗';
 el.append(small,h,p,action);navigation.link(el,{page:'studio',studio:studio.id});$('studio-list').append(el);
}
function studioContext(meta:ReturnType<typeof studioById>,token:number,runToken:number,signal?:AbortSignal):StudioModuleContext{
 if(!meta)throw Error('Студия не найдена.');
 return {
  meta,controls:$('studio-controls'),result:$('studio-result'),account,projectId:project,composer,missionPanel,api,blobAPI,notice,failure,signal,currentProjectId:()=>project,startMission:async message=>{await runMission(message);},dialog,closeDialog:()=>$<HTMLDialogElement>('dialog').close(),
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
  const field=controls.querySelector<HTMLTextAreaElement|HTMLInputElement>('#studio-text, #prose-prompt');
  if(field){field.value=item.prompt;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();notice(`Подсказка добавлена: ${item.label}`);return;}
  prompt.value=item.prompt;
  if(meta.capabilities.includes('ledger-read')||meta.capabilities.includes('system-diagnostics')){if(run&&!run.disabled)run.click();notice('Обновляю отчёт этой студии.');return;}
  notice('Текст в нижней строке. Сборка файлов запускается из Chat или Mission Control.');
 });
 void loadSystemSuggestions(suggestionContext).then(items=>{if(token===studioEpoch&&items.length)suggestion.update({...suggestionContext,remoteSuggestions:items});});
 const toolbar=mountStudioToolbar({host:$('studio-toolbar'),meta,state,run,stop:()=>{if(['RUNNING','PAUSED'].includes(state.get())){state.set('CANCELLING');cleanupMedia();state.set('READY');notice('Операция остановлена.');}},openHistory:()=>{const button=$<HTMLButtonElement>('project-history');if(project&&account)button.click();else notice('История проекта появится после выбора сохранённого проекта.');},openCompare:()=>{void openCompareCenter().catch(failure);},openReview:()=>{void openReviewHistory().catch(failure);},openHelp:()=>openSettings(),loadModels:account&&meta.capabilities.includes('mission')?async()=>{const catalog=await api('/api/model-catalog') as {models?:Array<{slug:string;task?:string;freeAllowlisted?:boolean;reviewed?:boolean;provider?:string;capabilities?:string[];contextWindow?:number|null;speedProfile?:'fast'|'balanced'|'quality'|'unknown';costProfile?:'free-allowlisted'|'policy-gated'|'unknown';availability?:'available'|'unavailable'}>};return catalog.models??[];}:undefined,getPreferredModel:()=>preferredModel,setPreferredModel:model=>{setPreferredModel(model);suggestion.update({surface:id,projectId:project||undefined,activeModel:model||'AUTO',capabilities:meta.capabilities,hasResult:!!result.textContent?.trim()});notice(model?`Модель закреплена: ${model}`:'AUTO router включён.');}});
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
  catch(error){if(current()){if(abort.signal.aborted){if(state.get()!=='READY')state.set('READY');moduleFrame.setStatus('idle');moduleFrame.recordHistory('Run cancelled');result.textContent='Операция остановлена. Параметры сохранены.';return;}state.set('FAILED');moduleFrame.setError(error,()=>run.click());renderRecoveryError(result,error,{retry:()=>run.click(),restore:()=>{draftCleanup();void renderStudio(id);},openLogs:()=>{if(project&&mission){navigation.navigate({page:'mission'});missionPanel.hidden=false;return poll(++epoch);}notice('Логи миссии появятся после запуска задачи.');},report:()=>{prompt.value=`Проверь ошибку в ${meta.title}: ${error instanceof Error?error.message:String(error)}`;navigation.navigate({page:'mission'});prompt.focus();}});throw error;}}
  finally{lastModuleRunMs=Math.max(0,Math.round(performance.now()-moduleStarted));moduleFrame.setResourceUsage({runs:moduleRuns,last_ms:lastModuleRunMs});run.disabled=false;toolbar.setRunEnabled(true);if(current())result.setAttribute('aria-busy','false');suggestion.update({surface:id,projectId:project||undefined,activeModel:preferredModel||'AUTO',capabilities:meta.capabilities,hasResult:true});}
 }).catch(failure);
}
const voiceInput=mountVoiceInput({button:$<HTMLButtonElement>('voice'),prompt,api,canUse:()=>!!account,notice,failure});
const commandPalette=mountCommandPalette(()=>[
 {id:'new-chat',label:'Новый чат',keywords:['new','chat'],run:newChat},
 {id:'open-create',label:'Open Chat',keywords:['chat','create','dialog'],run:()=>navigation.navigate({page:'create'})},
 {id:'open-mission',label:'Ход задачи',keywords:['mission','azrail','control','goal'],run:()=>navigation.navigate({page:'mission'})},
 {id:'open-projects',label:'Open Projects',keywords:['projects','project'],run:()=>navigation.navigate({page:'projects'})},
 {id:'open-metatron',label:'Open Metatron Lab',keywords:['metatron','agents','mission graph','operations'],run:()=>navigation.navigate({page:'metatron'})},
 {id:'open-connections',label:'Open Connections',keywords:['connectors','integrations'],run:()=>navigation.navigate({page:'settings',section:'connections'})},
 ...(expertOn()?studios.filter(meta=>meta.id!=='audio'&&meta.id!=='als').map(meta=>({id:`studio-${meta.id}`,label:`Open ${meta.title}`,keywords:[meta.description,meta.id],run:()=>navigation.navigate({page:'studio',studio:meta.id})})):[]),
 {id:'run-mission',label:'Начать ход задачи',keywords:['run','mission','start'],disabled:()=>!prompt.value.trim(),run:()=>{if(composerPage!=='mission')navigation.navigate({page:'mission'});composer.dispatchEvent(new Event('submit',{cancelable:true}));}},
 {id:'stop-mission',label:'Stop mission',keywords:['cancel','abort'],disabled:()=>!mission,run:()=>$( 'cancel' ).click()},
 {id:'history',label:'Open project history',keywords:['history','versions'],disabled:()=>!project||!account,run:()=>$( 'project-history' ).click()},
 {id:'asset-library',label:'Open Asset Intelligence Library',keywords:['assets','library','images','audio','documents'],disabled:()=>!account,run:()=>openAssetIntelligence().catch(failure)},
 {id:'global-memory',label:'Open Global Memory',keywords:['memory','context','knowledge','ttl','scope'],disabled:()=>!account,run:()=>openGlobalMemory().catch(failure)},
 {id:'system-history',label:'Open System History / Undo',keywords:['history','undo','events','tasks'],disabled:()=>!project||!account,run:()=>openSystemHistory().catch(failure)},
 {id:'series-g-readiness',label:'Open Browser QA / Real E2E readiness',keywords:['browser','qa','e2e','series g'],disabled:()=>!account,run:()=>openSystemReadiness().catch(failure)},
 {id:'compare-mode',label:'Open Compare Mode · A | B',keywords:['compare','a b','versions','before after'],disabled:()=>!account,run:()=>openCompareCenter().catch(failure)},
 {id:'professional-review',label:'Open Professional Review',keywords:['review','quality','critical','major','minor','safe fix'],disabled:()=>!account,run:()=>openReviewHistory().catch(failure)},
 {id:'shortcuts',label:'Open shortcuts',keywords:['help','keyboard','settings'],run:()=>navigation.navigate({page:'settings',section:'shortcuts'})},
]);
bind('commands',()=>commandPalette.open());
navigation.render(true);
refreshAccount().catch(failure).then(()=>{if(!local&&account)navigation.render(true);}).catch(failure);
// Avoid keeping a previous large export reachable after leaving its studio.
window.addEventListener('pagehide',()=>{stopEventStream();saveComposerDraft();workspace.destroy();draftCleanup();cleanupMedia();voiceInput.destroy();commandPalette.destroy();lastBlob=null;});
void lastBlob;

document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||e.keyCode===229)return;if(e.key==='Enter'&&!e.shiftKey&&!e.altKey&&document.activeElement===prompt){e.preventDefault();$<HTMLFormElement>('composer').requestSubmit();}if(e.altKey&&['1','2','3'].includes(e.key)){e.preventDefault();view((['create','projects','studios'] as const)[Number(e.key)-1]);}});


async function loadConnections(host:HTMLElement=$('connections-page')){
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
       resetMissionView();clearAttachments();project=target;mission='';const thread=chatHistory.attach(project,mission);prompt.value=thread.draft;remember();ensureEventStream();view('create');syncChatUI();
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
