import {renderMission} from './mission-view';
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
import {mountStudioToolbar} from './components/studio-toolbar';
import {createStudioStateController} from './components/studio-state';
import {renderSmartEmptyState} from './components/smart-empty';
import {mountModuleFrameActions} from './components/module-frame';
import {renderRecoveryError} from './components/error-recovery';
import {mountVoiceInput} from './components/voice-input';
import {PROVIDER_TOKENS, clearProviderToken, hasProviderToken, saveProviderToken} from './provider-tokens';
import {mountCommandPalette} from './components/command-palette';
import {mountMetatronLab} from './metatron-lab';
import {openUniversalCompareCenter} from './components/universal-compare';
import {groupModelsByProvider,isChatCapableModel,isNeuronPaidModel,modelDisplayName,providerFromSlug,providerIconPath,providerInitial,resolveModelIcon} from './model-display';
import {appendAssistantActions,copyText,shareText,speakText} from './chat-actions';
import {fillMarkdownContent} from './chat-markdown';
import {formatAssignment,skillsReply,type Assignment} from './assignment';
import {readPendingImage,requestImage,type ImageRequestBody} from './image-request';
import {explainIntent,intentFromParts} from '../src/lib/intent-contract';
import {formatPlan,fileNameFromPhrase,followUpPlan,groundWorkPlan,holdBlocked,keepAskedMedia,openStoredPlan,pictureReply,planRecord,planWork,restorePageVersion,retryPart,revisePart,takeBackPage,wantsPageRestore,wavesToRun,workPlanFromDraft,type PlanPart,type PlanThing,type WorkPlan} from './planner';
import {activePath,archiveMarks,askedPaths,bytesForArchive,bytesForFile,holdArchive,holdPlain,matchHeldPath,openOnlyPath,restoreFileShot,saveBytes,siteFromZip,sourceIsHeld} from './zip-site';
import {applySiteNote,draftFromLine,draftFromPhrase,draftLine,filesForDraft,siteDelta,siteZip} from './chat-site';
import {diagramLines,diagramModel} from './diagram';
import {buildOffice} from '../src/lib/office-file';
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
const attachmentManager=createAttachmentManager({root:$('attachment-manager'),input:$<HTMLInputElement>('attachments'),getProjectId:()=>project,api,failure,onAdded:files=>{void previewAttachedSite(files);},onChange:refs=>{attachmentRefs=refs;$('attachment-names').textContent=refs.length?`${refs.length} файл(ов) готово`:'';syncContextPanel();}});
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
function setPreferredModel(model:string){preferredModel=model;try{if(model)sessionStorage.setItem('pulse.preferredModel',model);else sessionStorage.removeItem('pulse.preferredModel');}catch{}const select=$<HTMLSelectElement>('composer-model');if(model&&!Array.from(select.options).some(o=>o.value===model)){const option=document.createElement('option');option.value=model;option.textContent=modelDisplayName(model);option.title=model;select.append(option);}select.value=model;if(typeof syncModelsButton==='function')syncModelsButton();syncContextPanel();}
function setChatVoice(voice:ChatVoice){chatVoice=voice;try{sessionStorage.setItem('pulse.voice',voice);}catch{}syncChatUI();notice(`Голос: ${VOICES[voice].name}. Серый говорит ниже, Люмен выше, Ария мягче.`);}

let chatStorage:Storage|undefined;
try{chatStorage={getItem:key=>deviceValue(key),setItem:(key,value)=>{deviceWrite(key,value);},removeItem:key=>deviceWrite(key,null),key:()=>null,length:0,clear(){}} as Storage;}catch{}
const chatHistory=createChatHistory(chatStorage,()=>notice('История доступна в памяти, но хранилище устройства заполнено или недоступно.',true));
const studioRooms=createStudioRooms(chatStorage);
chatHistory.setScope(local?'local':'guest');
let openContextPanel=()=>{};
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
async function persistChatMeta(id:string,patch:{title?:string;pinned?:boolean;archived?:boolean;projectId?:string|null}){
 if(!account||local)return;
 try{await api('/api/conversations',{method:'PATCH',body:JSON.stringify({id,...patch})});}catch{/* Local rename/pin still kept. */}
}
function renameChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const next=window.prompt('Название чата',thread.title);
 if(next===null)return;
 const title=next.replace(/\s+/g,' ').trim().slice(0,90);if(!title){notice('Название не может быть пустым.',true);return;}
 chatHistory.rename(id,title);syncChatUI(false);void persistChatMeta(id,{title});
}
function togglePinChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const pinned=!thread.pinned;chatHistory.setPinned(id,pinned);syncChatUI(false);void persistChatMeta(id,{pinned});
}
function toggleArchiveChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const archived=!thread.archived;chatHistory.setArchived(id,archived);syncChatUI(false);void persistChatMeta(id,{archived});
 notice(archived?'Чат в архиве.':'Чат возвращён из архива.');
}
async function deleteChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 if(!window.confirm(`Удалить чат «${thread.title}»?`))return;
 chatHistory.remove(id);
 if(account&&!local){try{await api(`/api/chat?conversationId=${encodeURIComponent(id)}`,{method:'DELETE'});}catch{/* Local removal still applies. */}}
 if(chatHistory.current())openChat(chatHistory.current()!.id);else newChat();
 notice('Чат удалён.');
}
async function shareChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const lines=thread.turns.flatMap(t=>[`Вы: ${t.user}`,t.reply?`AZRAIL: ${t.reply}`:null]).filter(Boolean) as string[];
 const text=`${thread.title}\n\n${lines.join('\n\n')}\n\n${location.origin}/?chat=${encodeURIComponent(id)}`;
 const ok=await shareText(text,thread.title);
 notice(ok?'Чат готов к отправке / скопирован.':'Не удалось поделиться чатом.',!ok);
}
function addChatToProject(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const next=window.prompt('ID проекта (оставьте пустым, чтобы отвязать)',thread.projectId||project||'');
 if(next===null)return;
 const projectId=next.trim()||null;
 chatHistory.setProject(id,projectId??'');
 if(thread.id===chatHistory.current()?.id){project=projectId??'';remember();}
 syncChatUI(false);void persistChatMeta(id,{projectId});
 notice(projectId?'Чат добавлен в проект.':'Чат отвязан от проекта.');
}
let deferredInstallPrompt:any=null;
window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredInstallPrompt=e;});
async function addChatToHomeScreen(){
 if(deferredInstallPrompt){
  deferredInstallPrompt.prompt();
  try{await deferredInstallPrompt.userChoice;}catch{/* cancelled */}
  deferredInstallPrompt=null;
  notice('Ярлык AZRAIL можно добавить на главный экран.');
  return;
 }
 const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
 notice(isIos
  ?'На iPhone: «Поделиться» → «На экран Домой».'
  :'В меню браузера выберите «Установить приложение» / «Добавить на главный экран».',true);
}
function closeChatMenus(){document.querySelectorAll('.chat-menu').forEach(el=>el.remove());}
function placeFloatingMenu(menu:HTMLElement,anchor:HTMLElement){
 document.body.append(menu);
 const rect=anchor.getBoundingClientRect();
 const width=Math.min(280,window.innerWidth-24);
 menu.style.position='fixed';
 menu.style.width=`${width}px`;
 menu.style.maxHeight='min(46dvh,280px)';
 menu.style.overflow='auto';
 menu.style.zIndex='80';
 menu.style.left=`${Math.max(12,Math.min(rect.left,window.innerWidth-width-12))}px`;
 if(rect.bottom+200>window.innerHeight-12){menu.style.top='auto';menu.style.bottom=`${Math.max(12,window.innerHeight-rect.top+6)}px`;}
 else{menu.style.top=`${rect.bottom+6}px`;menu.style.bottom='auto';}
}
function openChatMenu(id:string,anchor:HTMLElement){
 closeChatMenus();
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const menu=document.createElement('div');menu.className='chat-menu';menu.setAttribute('role','menu');
 const item=(label:string,action:()=>void,danger=false)=>{
  const btn=document.createElement('button');btn.type='button';btn.className=danger?'chat-menu-item danger':'chat-menu-item';btn.setAttribute('role','menuitem');btn.textContent=label;
  btn.onclick=(e)=>{e.stopPropagation();closeChatMenus();action();};
  menu.append(btn);
 };
 item('Переименовать чат',()=>renameChat(id));
 item('Удалить чат',()=>{void deleteChat(id);},true);
 item(thread.archived?'Разархивировать чат':'Архивировать чат',()=>toggleArchiveChat(id));
 item('Поделиться чатом',()=>{void shareChat(id);});
 item(thread.pinned?'Открепить чат':'Закрепить чат',()=>togglePinChat(id));
 item('Добавить в проект',()=>addChatToProject(id));
 item('Добавить на главный экран',()=>{void addChatToHomeScreen();});
 const row=anchor.closest('.chat-row')||anchor.parentElement;if(row)row.append(menu);
 const onDoc=(e:MouseEvent)=>{if(!menu.contains(e.target as Node)&&e.target!==anchor){closeChatMenus();document.removeEventListener('click',onDoc,true);}};
 window.setTimeout(()=>document.addEventListener('click',onDoc,true),0);
}
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
  onCopy:()=>notice('Ответ скопирован.'),
  onShare:()=>notice('Ответ готов к отправке.'),
  onSpeak:()=>{},
  onMore:(text,anchor)=>{
   closeChatMenus();
   const menu=document.createElement('div');menu.className='chat-menu message-more-menu';menu.setAttribute('role','menu');
   const mk=(label:string,fn:()=>void)=>{const b=document.createElement('button');b.type='button';b.className='chat-menu-item';b.textContent=label;b.onclick=()=>{closeChatMenus();fn();};menu.append(b);};
   mk('Копировать',()=>{void copyText(text).then(ok=>notice(ok?'Скопировано.':'Не удалось скопировать.'));});
   mk('Озвучить',()=>speakText(text));
   mk('Поделиться',()=>{void shareText(text);});
   mk('Выделить всё',()=>{void copyText(text);});
   placeFloatingMenu(menu,anchor);
   const onDoc=(e:MouseEvent)=>{if(!menu.contains(e.target as Node)&&e.target!==anchor){closeChatMenus();document.removeEventListener('click',onDoc,true);}};
   window.setTimeout(()=>document.addEventListener('click',onDoc,true),0);
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
type CatalogModel={slug:string;displayName?:string;freeAllowlisted?:boolean;reviewed?:boolean;task?:string;capabilities?:string[];availability?:string;provider?:string;icon?:string|null;description?:string};
let catalogModels:CatalogModel[]=[];
/** Full registry for the Models picker (exactly the server catalog, no truncation). */
function pickerModels(){return catalogModels.filter(m=>m.availability!=='unavailable'&&typeof m.slug==='string');}
function modelLabel(m:CatalogModel){return m.displayName||modelDisplayName(m.slug);}
function syncModelsButton(){
 const current=$('composer-models-current'),icon=$<HTMLImageElement>('composer-models-icon');
 const hit=preferredModel?catalogModels.find(m=>m.slug===preferredModel):undefined;
 current.textContent=hit?modelLabel(hit):(preferredModel?modelDisplayName(preferredModel):'Auto · AZRAIL');
 const src=hit?resolveModelIcon(hit):(preferredModel?providerIconPath(providerFromSlug(preferredModel)):undefined);
 if(src){icon.src=src;icon.hidden=false;}else{icon.removeAttribute('src');icon.hidden=true;}
 $<HTMLSelectElement>('composer-model').value=preferredModel;
}
function modelPickerMark(provider:string,icon?:string){
 const mark=document.createElement('span');mark.className='model-picker-mark';mark.setAttribute('aria-hidden','true');
 if(icon){const img=document.createElement('img');img.alt='';img.width=18;img.height=18;img.src=icon;img.onerror=()=>{img.remove();mark.dataset.fallback='';mark.textContent=providerInitial(provider);};mark.append(img);}
 else{mark.dataset.fallback='';mark.textContent=providerInitial(provider);}
 return mark;
}
function fillComposerModels(){
 const select=$<HTMLSelectElement>('composer-model');select.replaceChildren();
 const auto=document.createElement('option');auto.value='';auto.textContent='Auto · AZRAIL';select.append(auto);
 for(const model of pickerModels()){
  if(typeof model.slug!=='string'||Array.from(select.options).some(o=>o.value===model.slug))continue;
  const option=document.createElement('option');
  option.value=model.slug; // full slug in code/value
  option.textContent=`${isNeuronPaidModel(model.slug)?'Нейроны':model.freeAllowlisted?'Free':'Paid'} · ${modelLabel(model)}`;
  option.title=model.slug;
  select.append(option);
 }
 if(preferredModel&&!Array.from(select.options).some(o=>o.value===preferredModel)){
  const option=document.createElement('option');option.value=preferredModel;option.textContent=modelDisplayName(preferredModel);option.title=preferredModel;select.append(option);
 }
 select.value=preferredModel;syncModelsButton();
}
function openModelPicker(){
 const models=pickerModels();
 dialog('Models',`<div class="model-picker"><div class="model-picker-toolbar"><input id="model-picker-search" class="model-picker-search" type="search" placeholder="Поиск модели…" maxlength="120"><span id="model-picker-count" class="model-picker-count">${models.length} моделей</span></div><div id="model-picker-list" class="model-picker-list"></div></div>`);
 const list=$('model-picker-list'),search=$<HTMLInputElement>('model-picker-search'),count=$('model-picker-count');
 const paint=()=>{
  const q=search.value.trim().toLocaleLowerCase();
  list.replaceChildren();
  const auto=document.createElement('button');auto.type='button';auto.className='model-picker-item';if(!preferredModel)auto.setAttribute('aria-current','true');
  const autoBody=document.createElement('span');autoBody.className='model-picker-body';
  autoBody.innerHTML='<strong>Auto · AZRAIL</strong><small>Подберём сами</small>';
  const autoBadge=document.createElement('span');autoBadge.className='model-picker-badge free';autoBadge.textContent='Auto';
  auto.append(modelPickerMark('AZRAIL'),autoBody,autoBadge);
  auto.onclick=()=>{setPreferredModel('');$<HTMLDialogElement>('dialog').close();syncModelsButton();};
  list.append(auto);
  let shown=0;
  for(const group of groupModelsByProvider(models)){
   const visible=group.models.filter(model=>{
    const label=modelLabel(model),provider=model.provider||providerFromSlug(model.slug);
    return !q||`${label} ${provider} ${model.slug} ${model.task||''}`.toLocaleLowerCase().includes(q);
   });
   if(!visible.length)continue;
   const section=document.createElement('div');section.className='model-picker-group';
   const heading=document.createElement('div');heading.className='model-picker-group-title';heading.textContent=`${group.provider} · ${visible.length}`;
   section.append(heading);
   for(const model of visible){
    const label=modelLabel(model),provider=model.provider||providerFromSlug(model.slug);
    const chatOk=isChatCapableModel(model);
    const row=document.createElement('button');row.type='button';row.className='model-picker-item';
    if(preferredModel===model.slug)row.setAttribute('aria-current','true');
    row.title=model.slug;
    const body=document.createElement('span');body.className='model-picker-body';
    const title=document.createElement('strong');title.textContent=label;
    const neuron=isNeuronPaidModel(model.slug);
    const meta=document.createElement('small');meta.textContent=`${provider}${model.task?` · ${model.task}`:''}${neuron?' · 7 Paid · лимит 10 000 нейронов':''}${chatOk?'':' · не для чата'}`;
    body.append(title,meta);
    const badge=document.createElement('span');badge.className=`model-picker-badge ${neuron?'neuron':model.freeAllowlisted?'free':'paid'}`;badge.textContent=neuron?'Нейроны':model.freeAllowlisted?'Free':'Paid';
    row.append(modelPickerMark(provider,resolveModelIcon(model)),body,badge);
    row.onclick=()=>{
     setPreferredModel(model.slug);
     $<HTMLDialogElement>('dialog').close();
     syncModelsButton();
     if(neuron)notice('Это одна из 7 моделей Workers Paid. AZRAIL её не вызывает: после 10 000 нейронов в сутки идёт доплата.',true);
     else if(!chatOk)notice('Модель выбрана. Для чата AZRAIL подставит текстовую модель автоматически.',true);
    };
    section.append(row);shown++;
   }
   list.append(section);
  }
  count.textContent=q?`${shown} из ${models.length}`:`${models.length} моделей`;
  if(!shown){const empty=document.createElement('p');empty.className='muted';empty.textContent='Ничего не найдено.';list.append(empty);}
 };
 search.oninput=paint;paint();search.focus();
}
async function refreshComposerModels(){
 if(!account||local){catalogModels=[];fillComposerModels();$('composer-models-open').title='Автовыбор. Каталог моделей доступен после входа.';return;}
 const identity=account.id;
 try{
  const catalog=await api('/api/model-catalog');if(account?.id!==identity)return;
  catalogModels=Array.isArray(catalog.models)?catalog.models:[];
  fillComposerModels();
  $('composer-models-open').title=`Models · ${pickerModels().length}`;
 }catch{$('composer-models-open').title='Каталог недоступен. Вы можете выбрать Auto.';fillComposerModels();}
}
bind('composer-models-open',()=>openModelPicker());
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
$<HTMLSelectElement>('composer-model').onchange=()=>setPreferredModel($<HTMLSelectElement>('composer-model').value);
prompt.addEventListener('input',()=>{saveComposerDraft();syncChatUI(false);});

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
function dialog(title:string,html:string){$('dialog-title').textContent=title;const content=$('dialog-content');content.innerHTML=html;const dlg=$<HTMLDialogElement>('dialog');if(!dlg.open)dlg.showModal();return content;}
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
 prompt.placeholder=route.page==='mission'?'Что сделать…':route.page==='create'?'Опиши, что нужно получить…':composerRoom==='home'?'Опиши, что нужно получить…':roomPlaceholder[composerRoom]??'Напиши задачу для этой студии…';
 $<HTMLButtonElement>('attach').hidden=route.page==='mission';
 $('composer-models').hidden=true;
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
 leaveStudio();metatronCleanup();metatronCleanup=()=>{};const id=route.page==='studio'?'studio-page':route.page;
 document.querySelectorAll<HTMLElement>('.view').forEach(el=>el.hidden=el.id!==id);
 const nav=route.page==='studio'?'studios':route.page;
 document.querySelectorAll('.nav').forEach(el=>{const active=el.getAttribute('data-view')===nav;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 if(route.page==='studio')void renderStudio(route.studio).catch(failure);
 if(route.page==='projects')loadProjects().catch(failure);
 if(route.page==='connections')loadConnections().catch(failure);
 if(route.page==='mission'){if(mission&&account){missionPanel.hidden=false;void poll(epoch).catch(failure);}void refreshMissionHistory().catch(failure);}
 if(route.page==='metatron')metatronCleanup=mountMetatronLab({root:$('metatron-page'),api,local,account,getProjectId:()=>project,getMissionId:()=>mission,setMissionId:id=>{mission=id;remember();},notice,failure});
 syncComposer(route);
 const title=route.page==='studio'?studioById(route.studio)!.title:route.page==='create'?'Чат':route.page==='mission'?'Ход задачи':route.page==='projects'?'Проекты':route.page==='studios'?'Студии':route.page==='metatron'?'Метратрон':route.page==='connections'?'Подключения':'Страница не найдена';
 document.title=`${title} · AZRAIL MNMLL PULSE OS`;
 $('workspace-page-title').textContent=route.page==='create'?(chatHistory.current()?.title??'Новый чат'):title;
 workspace.routeChanged();syncChatUI();
 if(!initial){document.querySelector<HTMLElement>(`#${id} h1`)?.focus({preventScroll:true});$(id).scrollTop=0;}
}
function view(id:'create'|'projects'|'studios'){navigation.navigate({page:id});}
navigation.link(document.querySelector<HTMLAnchorElement>('[data-home]')!,{page:'create'});
document.querySelectorAll<HTMLAnchorElement>('[data-view]').forEach(el=>navigation.link(el,{page:el.dataset.view as 'create'|'mission'|'projects'|'studios'|'metatron'|'connections'}));
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
const attachedReferences=new WeakMap<File,string>();
async function attachedImageReference():Promise<string>{
 const file=attachmentManager.files().find(item=>/^image\//i.test(item.type)||/\.(png|jpe?g|webp|gif)$/i.test(item.name));
 if(!file)return '';
 const known=attachedReferences.get(file);if(known)return known;
 const headers:Record<string,string>={'Content-Type':file.type||'image/png','X-Filename':encodeURIComponent(file.name.slice(0,120)),'X-Studio-Id':'image'};
 const saved=await api('/api/studio/artifacts',{method:'POST',headers,body:file}) as {id?:string};
 if(!saved?.id)return '';
 attachedReferences.set(file,saved.id);
 return saved.id;
}
$<HTMLInputElement>('assignment-reference').addEventListener('change',()=>{
 const input=$<HTMLInputElement>('assignment-reference');
 const file=input.files?.[0];
 input.value='';
 if(!file)return;
 if(!account){notice('Войдите, чтобы взять свою картинку.');return;}
 const send=async(withProject:boolean)=>{
  const headers:Record<string,string>={'Content-Type':file.type||'image/png','X-Filename':file.name.slice(0,120),'X-Studio-Id':'image'};
  if(withProject&&project)headers['X-Project-Id']=project;
  return api('/api/studio/artifacts',{method:'POST',headers,body:file}) as Promise<{id?:string}>;
 };
 void send(true).catch(()=>send(false)).then(saved=>{
  if(!saved?.id){notice('Картинка не сохранилась.');return;}
  imageReference=saved.id;
  notice('Своя картинка задаёт вид следующей сборки.');
 }).catch(failure);
});
bind('assignment-login',()=>$('account').click());
navigation.link($<HTMLAnchorElement>('close-studio'),{page:'studios'});
for(const meta of studios){const link=document.createElement('a');link.textContent=meta.title;link.dataset.studio=meta.id;navigation.link(link,{page:'studio',studio:meta.id});$('context-studios').append(link);}
document.addEventListener('azrail:open-studio',(event:Event)=>{const id=(event as CustomEvent<{studio?:string}>).detail?.studio;if(id&&studioById(id))navigation.navigate({page:'studio',studio:id as StudioId});});
mountHomeCanvas();
bind('attach',()=>{if(!project){project=crypto.randomUUID();remember();}$<HTMLInputElement>('attachments').click();});
const openTokenLogin=()=>{
 dialog('Вход по ключу','<label for="login-token">Ключ</label><input id="login-token" type="password" autocomplete="off" spellcheck="false"><button id="login-save" class="primary">Войти</button>');
 $('login-token').focus();
 bind('login-save',async()=>{
   const value=$<HTMLInputElement>('login-token').value.trim();
   if(!value)throw Error('Введите токен.');
   authToken=value;try{sessionStorage.setItem('pulse.token',authToken);}catch{}
   try{const me=await api('/api/me');account=me.account;}
   catch(e){authToken='';try{sessionStorage.removeItem('pulse.token');}catch{};throw e;}
   $<HTMLDialogElement>('dialog').close();$('account').textContent=account!.name;syncChatAccount();void refreshComposerModels();await refreshMode();
   await syncServerChats();
   if(mission&&expertOn()){navigation.navigate({page:'mission'});$('mission-panel').hidden=false;await poll(++epoch);}
   notice('Вход выполнен.');
  });
};
bind('account',async()=>{
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
  if(wasToken){authToken='';try{sessionStorage.removeItem('pulse.token');}catch{}}
  else await api('/auth/logout',{method:'POST'});
  chatHistory.clearScope();
  for(const key of ['pulse.pending','pulse.project','pulse.mission','pulse.image.pending','pulse.identity'])deviceWrite(key,null);
  location.reload();
 });
});
async function refreshAccount(){
 if(local){syncChatAccount();$('local-notice').textContent='Локальный просмотр · WAV/MIDI, аудиоанализ и CSV доступны на устройстве. Для AI и проектов нужен вход в развёрнутое приложение.';$('local-notice').hidden=false;return;}
 const a=await api('/auth/status');account=a.account;oidcConfigured=!!a.configured;if(typeof a.key==='boolean')keyLogin=a.key;
 if(!account&&authToken){try{const me=await api('/api/me');account=me.account;}catch{authToken='';try{sessionStorage.removeItem('pulse.token');}catch{}}}
 syncChatAccount();void refreshComposerModels();
 if(account){$('account').textContent=account.name;await refreshMode();ensureEventStream();if(mission&&expertOn()){if(composerPage==='create')navigation.navigate({page:'mission'});$('mission-panel').hidden=false;await poll(++epoch);}}
 else if(!oidcConfigured)notice('OIDC не настроен. Войдите по токену через кнопку «Аккаунт» — регистрация внешнего приложения не нужна.');
}
async function refreshMode(){return api('/api/routing-settings');}
function currentModelLabel(){
 const hit=preferredModel?catalogModels.find(m=>m.slug===preferredModel):undefined;
 return hit?modelLabel(hit):(preferredModel?modelDisplayName(preferredModel):'Auto · AZRAIL');
}
function openSettings(){
 const root=dialog('Настройки','');
 root.replaceChildren();
 root.className='settings-sheet';
 const block=(title:string)=>{const section=document.createElement('section');section.className='settings-block';const h=document.createElement('h3');h.textContent=title;section.append(h);root.append(section);return section;};
 const voiceBox=block('Голос');
 const voiceNote=document.createElement('p');voiceNote.className='muted';voiceNote.textContent='Один голос на следующий ответ. Прошлый тон чата он не копирует.';voiceBox.append(voiceNote);
 (Object.keys(VOICES) as ChatVoice[]).forEach(id=>{
  const button=document.createElement('button');button.type='button';button.className='settings-choice';
  button.textContent=`${chatVoice===id?'✓ ':''}${VOICES[id].name} · ${VOICES[id].line}`;
  if(chatVoice===id)button.setAttribute('aria-current','true');
  button.onclick=()=>{setChatVoice(id);openSettings();};
  voiceBox.append(button);
 });
 const modelBox=block('Модель');
 const modelButton=document.createElement('button');modelButton.type='button';modelButton.className='settings-choice';
 modelButton.textContent=`Выбрать модель · ${currentModelLabel()}`;
 modelButton.onclick=()=>{if(!account){notice('Войдите, чтобы открыть каталог моделей.',true);return;}openModelPicker();};
 modelBox.append(modelButton);
 const keys=block('Клавиши');
 for(const line of ['Ctrl / ⌘ + K — поиск команд.','Enter или Ctrl / ⌘ + Enter — отправить. Shift + Enter — новая строка.','Alt + 1 — диалог. Alt + 2 — проекты. Alt + 3 — студии.','Escape — закрыть окно или боковую панель.']){const p=document.createElement('p');p.textContent=line;keys.append(p);}
 const tokens=block('Токены сторонних моделей');
 const tokenNote=document.createElement('p');tokenNote.className='muted';tokenNote.textContent='Ключ остаётся только в этой вкладке и не уходит в чат. Вызовы этих провайдеров сейчас выключены, чтобы не списать деньги. OpenRouter одним ключом открывает длинный список чужих моделей.';tokens.append(tokenNote);
 for(const provider of PROVIDER_TOKENS){
  const row=document.createElement('div');row.className='provider-token';
  const title=document.createElement('strong');title.textContent=provider.name;
  const status=document.createElement('small');status.textContent=hasProviderToken(provider.id)?'Ключ сохранён в этой вкладке':'Ключ не задан';
  row.append(title,status);
  if(provider.note){const note=document.createElement('p');note.className='muted';note.textContent=provider.note;row.append(note);}
  const input=document.createElement('input');input.type='password';input.autocomplete='off';input.maxLength=400;input.placeholder=hasProviderToken(provider.id)?'Новый ключ заменит сохранённый':'Вставьте ключ';input.setAttribute('aria-label',`Ключ ${provider.name}`);
  const actions=document.createElement('div');actions.className='toolbar';
  const save=document.createElement('button');save.type='button';save.textContent='Сохранить ключ';
  save.onclick=()=>{const value=input.value.trim();if(!value){notice('Вставьте ключ в поле.',true);return;}saveProviderToken(provider.id,value);input.value='';notice(`Ключ ${provider.name} сохранён в этой вкладке. Вызовы провайдера остаются выключены.`);openSettings();};
  const clear=document.createElement('button');clear.type='button';clear.textContent='Удалить';clear.disabled=!hasProviderToken(provider.id);
  clear.onclick=()=>{clearProviderToken(provider.id);notice(`Ключ ${provider.name} удалён из этой вкладки.`);openSettings();};
  actions.append(save,clear);row.append(input,actions);tokens.append(row);
 }
 if(!account)return;
 const trial=block('Пробный лимит');
 const trialNote=document.createElement('p');trialNote.className='muted';trialNote.textContent='Сейчас всё выключено. Озвучка — 10 раз, потом сама гаснет и говорит браузер. Тесты в контейнере — 3 раза, потом гаснут. Выкладка из чата не включается.';trial.append(trialNote);
 void api('/api/trial').then(r=>{
  const canSave=account?.role==='admin'||!!account?.operator;
  const speech=document.createElement('label');const speechBox=document.createElement('input');speechBox.type='checkbox';speechBox.checked=!!r.speech;speech.append(speechBox,document.createTextNode(` Озвучка ElevenLabs, осталось ${r.speechLeft} из ${r.limits.speech}`));
  const sandbox=document.createElement('label');const sandboxBox=document.createElement('input');sandboxBox.type='checkbox';sandboxBox.checked=!!r.sandbox;sandbox.append(sandboxBox,document.createTextNode(` Тесты в контейнере, осталось ${r.sandboxLeft} из ${r.limits.sandbox}`));
  const closed=document.createElement('p');closed.textContent='Выкладка из чата закрыта. Лимит — 0.';
  const save=document.createElement('button');save.type='button';save.className='primary';save.textContent='Сохранить пробный лимит';save.disabled=!canSave;
  save.onclick=()=>{void api('/api/admin/trial',{method:'POST',body:JSON.stringify({speech:speechBox.checked,sandbox:sandboxBox.checked})}).then(()=>{notice('Пробный лимит сохранён.');openSettings();}).catch(failure);};
  trial.append(speech,sandbox,closed,save);
 }).catch(()=>{const p=document.createElement('p');p.className='muted';p.textContent='Пробный лимит сейчас не прочитался.';trial.append(p);});
 const limits=block('Лимиты');
 limits.append(document.createTextNode('Загрузка…'));
 void refreshMode().then(r=>{
  limits.replaceChildren();
  const h=document.createElement('h3');h.textContent='Лимиты';limits.append(h);
  const label=document.createElement('label');const box=document.createElement('input');box.type='checkbox';box.id='third-party';box.checked=!!r.policy.allowThirdPartyModels;label.append(box,document.createTextNode(' Сторонние AI-модели'));
  const budgetLabel=document.createElement('label');budgetLabel.htmlFor='budget';budgetLabel.textContent='Месячный лимит платных моделей, USD';
  const budget=document.createElement('input');budget.id='budget';budget.type='number';budget.min='0';budget.step='1';budget.value=String(r.policy.monthlyBudgetUsd);
  const info=document.createElement('p');info.id='budget-info';info.textContent=`Учтено и зарезервировано: $${r.committedUsd.toFixed(4)}. План: ${r.workersPlan}.`;
  const warn=document.createElement('p');warn.className='muted';warn.textContent='OFF блокирует сторонние модели. Семь моделей Workers Paid AZRAIL не вызывает.';
  const save=document.createElement('button');save.type='button';save.className='primary';save.id='save-mode';save.textContent='Сохранить лимиты';save.disabled=!account?.operator;
  if(!account?.operator)info.textContent+=' Изменения доступны оператору платформы.';
  save.onclick=()=>{void api('/api/admin/routing-settings',{method:'POST',body:JSON.stringify({allowThirdPartyModels:box.checked,monthlyBudgetUsd:Number(budget.value)})}).then(()=>refreshMode()).then(()=>notice('Настройки сохранены на сервере.')).catch(failure);};
  limits.append(label,budgetLabel,budget,info,warn,save);
 }).catch(()=>{limits.replaceChildren();const h=document.createElement('h3');h.textContent='Лимиты';const p=document.createElement('p');p.className='muted';p.textContent='Лимиты сейчас не прочитались.';limits.append(h,p);});
}
bind('settings',()=>openSettings());
function ensureEventStream(){
 if(local||!account||!project){stopEventStream();stopEventStream=()=>{};streamProject='';return;}
 if(streamProject===project)return;
 stopEventStream();streamProject=project;
 stopEventStream=createProjectEventClient({api,projectId:project,onEvent:(event:StreamEvent)=>{
  if(event.missionId&&event.missionId===mission&&!document.hidden){clearTimeout(pollTimer);pollTimer=window.setTimeout(()=>void poll(epoch),120);}
 }});
}
bind('about',()=>dialog('AZRAIL × MNMLL PULSE','<p>Мультиагентное ядро AZRAIL и творческие инструменты PULSE в одном приложении. У каждого модуля студий своя страница.</p><p>Текст и голос → миссия → файлы проекта → проверка. Результат не получает статус готовности к публикации без успешной проверки кода.</p><p>Музыка здесь — локальный procedural synthesis. Video Studio использует AI только для Scene Builder, а preview/WebM рендерит локально через Canvas + MediaRecorder. Cloudflare Stream/Veo не выдаются за подключённые, пока binding не настроен и не проверен.</p>'));
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
 if(!pending){project=project||crypto.randomUUID();pending={key:crypto.randomUUID(),body:JSON.stringify({message,projectId:project,attachments:[],...(preferredModel?{preferredModel}:{})})};}
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
 link.textContent='Скачать';
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
  if(!earlier)host.append(downloadLink(thing.url,downloadName(thing,'png')));
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
  const model=diagramModel(thing.lines.join('\n'));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 640 160');
  svg.setAttribute('width','100%');
  svg.setAttribute('role','img');
  const count=Math.max(model.nodes.length,1);
  const place=new Map(model.nodes.map((name,index)=>[name,{x:count===1?250:24+index*(520/Math.max(count-1,1)),y:62}]));
  for(const [from,to] of model.edges){
   const start=place.get(from);const end=place.get(to);if(!start||!end)continue;
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');
   line.setAttribute('x1',String(start.x+88));line.setAttribute('y1',String(start.y+16));
   line.setAttribute('x2',String(end.x));line.setAttribute('y2',String(end.y+16));
   line.setAttribute('stroke','#8b7cff');line.setAttribute('stroke-width','2');svg.append(line);
  }
  for(const name of model.nodes){
   const point=place.get(name);if(!point)continue;
   const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
   rect.setAttribute('x',String(point.x));rect.setAttribute('y',String(point.y));
   rect.setAttribute('width','112');rect.setAttribute('height','32');rect.setAttribute('rx','6');
   rect.setAttribute('fill','#12121a');rect.setAttribute('stroke','#8b7cff');
   const label=document.createElementNS('http://www.w3.org/2000/svg','text');
   label.textContent=name;label.setAttribute('x',String(point.x+8));label.setAttribute('y',String(point.y+21));
   label.setAttribute('fill','#f4f1ea');label.setAttribute('font-size','12');
   svg.append(rect,label);
  }
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
  await api('/api/conversations/plan',{method:'POST',body:JSON.stringify({conversationId:thread.id,userText:message.slice(0,4000),...(summary?{summary:summary.slice(0,4000)}:{}),plan:planRecord(plan)})});
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
  item.append(line,edit);
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
async function runAssignment(plan:Assignment&{versions?:PlanThing[];seed?:number|null;text?:string},message:string){
 if(attachmentManager.hasPending())throw Error('Дождитесь окончания загрузки вложений.');
 if(attachmentManager.hasFailed())throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');
 const thread=chatHistory.current()??chatHistory.create();
 project=thread.projectId||project||crypto.randomUUID();
 const requestKey=crypto.randomUUID();
 remember();
 missionSubmitting=true;$<HTMLButtonElement>('submit').disabled=true;
 chatHistory.accepted(requestKey,message,project,'');
 if(prompt.value.trim()===message)prompt.value='';chatHistory.setDraft('');workspace.resizePrompt();
 const paint=(next:Assignment,status='completed')=>{showAssignment(next);chatHistory.report(requestKey,formatAssignment(next),status);syncChatUI();workspace.toLatest();};
 try{
  if(!account&&plan.kind!=='music'){paint({...plan,needsYou:'Войди в аккаунт, и я начну это поручение.'});return;}
  if(account?.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');
  showAssignment(plan);
  chatHistory.report(requestKey,plan.kind==='image'?'Собираю картинку…':formatAssignment(plan),'queued');
  syncChatUI();workspace.toLatest();
  const text=plan.versions?.length&&plan.text?plan.text:message;
  const one=(thing?:PlanThing,state:PlanPart['state']='running'):WorkPlan=>({parallel:false,parts:[{...plan,id:'part-1',text,wave:0,dependsOn:[],state,thing,versions:plan.versions,seed:plan.seed??undefined}]});
  const part:PlanPart={...plan,id:'part-1',text,wave:0,dependsOn:[],state:'running',versions:plan.versions,seed:plan.seed??undefined};
  await rememberWork(message,one(),false);
  await runPlanPart(part);
  paintThings(part.thing?[{thing:part.thing,state:'done',versions:part.versions}]:[]);
  await rememberWork(message,one(part.thing,'done'),true);
  const pictured=pictureReply([part]);
  if(pictured){showAssignment({...plan,ready:part.ready||plan.ready});chatHistory.report(requestKey,pictured,'completed');syncChatUI();workspace.toLatest();}
  else if(part.ready)paint({...plan,ready:part.ready});
  showContinue(one(part.thing,'done'));
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
  const read=await api('/api/limits') as {chat?:{left:number;limit:number}|null;generation?:{left:number;limit:number}|null};
  const chat=read.chat?`Чат: осталось ${read.chat.left} из ${read.chat.limit}.`:'Остаток чата сейчас не прочитан. Потолок 200.';
  const generation=read.generation?`Генерация: осталось ${read.generation.left} из ${read.generation.limit}.`:'Остаток генерации сейчас не прочитан. Потолок 500.';
  return [chat,generation,video].filter(Boolean).join(' ');
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
  chatHistory.accepted(requestKey,message,project,'');
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
   paint(plan.parts.some(part=>part.state==='failed')?'Часть плана не вышла. Остальные, которые уже шли рядом, не откатываю.':undefined);
   mountLiveClip();
  }
  await rememberWork(message,plan,true);
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
  const attachedId=imageReference?'':await attachedImageReference().catch(()=>'');
  const chosen=imageReference||attachedId;
  const grow=upscaleOnce.has(part.id);
  upscaleOnce.delete(part.id);
  const reference=grow?earlier:chosen||earlier;
  const operation=grow?'upscale':earlier&&!chosen?'edit':'generate';
  const fresh:ImageRequestBody={prompt:part.text,projectId:project||undefined,aspectRatio:imageFrame,resolution:768,style:'auto',seed:part.seed??null,variations:grow?1:imageCount,operation,...(reference?{referenceArtifactId:reference}:{})};
  const pending=readPendingImage(signed.id);
  let body=fresh;
  let stuck=false;
  if(pending){
   try{
    const saved=JSON.parse(pending.body) as ImageRequestBody;
    if(saved&&typeof saved.prompt==='string'){body=saved;stuck=pending.body!==JSON.stringify(fresh);}
   }catch{/* Битый хвост не подменяет новую фразу. */}
  }
  const result=await requestImage(signed.id,body,api) as {items?:Array<{name?:string;url?:string;seed?:number|null}>};
  const urls=(result.items??[]).map(item=>safeMediaPath(String(item.url??''))).filter(Boolean);
  const name=fileNameFromPhrase(part.text,'png');
  const seed=result.items?.find(item=>Number.isInteger(item.seed))?.seed;
  if(typeof seed==='number')part.seed=seed;
  part.state='done';
  if(attachedId)clearAttachments();
  part.ready=stuck?`Закончила зависшую сборку «${name}».`:grow?`Детализация «${name}» сохранена.`:urls.length>1?`${urls.length} варианта «${name}».`:`Картинка «${name}» сохранена.`;
  if(urls[0])part.thing={type:'image',url:urls[0],title:name,...(urls.length>1?{alts:urls.slice(1,3)}:{})};
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
async function chosenPlan(message:string):Promise<WorkPlan|null>{
 const localPlan=planWork(message);
 if(localPlan?.parts.some(part=>part.kind==='file'||part.kind==='diagram'))return localPlan;
 if(local||!account||(account.role!=='admin'&&!account.operator))return localPlan;
 try{
  const memory=finishedMemory();
  const drafted=await api('/api/plan',{method:'POST',body:JSON.stringify({message,...(memory?{memory}:{})})}) as {fallback?:boolean;parts?:Array<{text?:string;kind?:string;after?:boolean}>};
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
async function runChat(){
 if(missionSubmitting)return;
 const message=prompt.value.trim();if(!message)return;
 const opened=revealHeld(message);
 const only=openOnlyPath(message);
 if(only&&opened){noteLocal(message,`Открыл ${opened}.`);return;}
 if(only&&sourceIsHeld()&&!opened){noteLocal(message,`В открытых файлах нет ${only}.`);return;}
 if(/^скачай(?:те)?\s+(?:этот\s+|текущий\s+)?архив[.!?]?$/iu.test(message)){await saveFromScreen('zip',message);return;}
 if(/^скачай(?:те)?\s+(?:этот\s+|текущий\s+)?файл[.!?]?$/iu.test(message)){await saveFromScreen('file',message);return;}
 if(/^верни\s+файл[.!?]?$/iu.test(message)){
  const field=document.querySelector<HTMLTextAreaElement>('#home-code');
  const back=restoreFileShot(activePath(),field?.value??'');
  if(!back){noteLocal(message,'Прошлой правки файла на экране нет.');return;}
  document.dispatchEvent(new CustomEvent('azrail:file-shown',{detail:back}));
  noteLocal(message,`На экране снова ${back.path}.`);
  return;
 }
 if(/^(?:запусти|выполни|прогони)\s+тесты[.!?]?$/iu.test(message)){
  try{
   const r=await api('/api/trial/sandbox',{method:'POST',body:JSON.stringify({projectId:project||''})}) as {note?:string;output?:string};
   noteLocal(message,String(r.note||r.output||'Готово.'));
  }catch(e){noteLocal(message,e instanceof Error?e.message:'Команды в контейнере выключены.');}
  return;
 }
 if(/^(?:запусти|выполни|прогони)\s+(?:npm|сборку|сервер|dev|команд\p{L}*)[.!?]?$/iu.test(message)){noteLocal(message,'Произвольные команды закрыты пробным лимитом. В настройках можно включить только прогон тестов, не больше 3 раз.');return;}
 if(/^(?:выложи|задеплой|сделай\s+push|отправь\s+в\s+github)[.!?]?$/iu.test(message)){noteLocal(message,'Выкладка из чата закрыта. Пробный лимит на неё — ноль, токен GitHub её не запускает.');return;}
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
 let planned=followUpPlan(message,heldPlan)??await chosenPlan(message);
 if(planned&&planned.parts.length===1&&planned.parts[0].kind==='build')planned=null;
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
 chatHistory.accepted(requestKey,message,project,conversationId);
 chatHistory.report(requestKey,'','queued');
 if(prompt.value.trim()===message)prompt.value='';chatHistory.setDraft(prompt.value);workspace.resizePrompt();
 syncChatUI();workspace.toLatest();
 try{
  const body=JSON.stringify({message,projectId:project,conversationId,voice:chatVoice,attachments:attachmentRefs,...(preferredModel?{preferredModel}:{})});
  const r=await api('/api/chat',{method:'POST',headers:{'Idempotency-Key':requestKey},body});
  const reply=String(r.result?.summary||r.result?.error||r.error||'Пустой ответ.');
  const status=r.result?.status==='failed'||r.success===false?'failed':'completed';
  chatHistory.report(requestKey,reply,status);
  clearAttachments();syncChatUI();workspace.toLatest();
  void syncServerChats();
 }
 catch(e){
  const daily=e instanceof APIError&&(e.code==='chat_daily_limit'||e.code==='provider_daily_limit'||/лимит/i.test(e.message));
  const text=daily?(e instanceof Error&&e.message?e.message:'Лимит моделей на сегодня. Попробуйте позже.'):e instanceof Error?e.message:'Не удалось получить ответ.';
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
 {id:'open-connections',label:'Open Connections',keywords:['connectors','integrations'],run:()=>navigation.navigate({page:'connections'})},
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
 {id:'shortcuts',label:'Open shortcuts',keywords:['help','keyboard','settings'],run:()=>openSettings()},
]);
bind('commands',()=>commandPalette.open());
navigation.render(true);
refreshAccount().then(()=>{if(!local&&account)navigation.render(true);}).catch(failure);
// Avoid keeping a previous large export reachable after leaving its studio.
window.addEventListener('pagehide',()=>{stopEventStream();saveComposerDraft();workspace.destroy();draftCleanup();cleanupMedia();voiceInput.destroy();commandPalette.destroy();lastBlob=null;});
void lastBlob;

document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||e.keyCode===229)return;if(e.key==='Enter'&&!e.shiftKey&&!e.altKey&&document.activeElement===prompt){e.preventDefault();$<HTMLFormElement>('composer').requestSubmit();}if(e.altKey&&['1','2','3'].includes(e.key)){e.preventDefault();view((['create','projects','studios'] as const)[Number(e.key)-1]);}});


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
