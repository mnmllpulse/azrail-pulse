export type ModuleStatus='idle'|'loading'|'running'|'paused'|'retrying'|'success'|'warning'|'failure';
export type ModuleFrameAction='collapse'|'expand'|'duplicate'|'delete'|'pin'|'lock'|'rename'|'move'|'settings'|'reset'|'undo'|'redo'|'retry'|'history';
export type ModuleResourceUsage=Record<string,string|number>;
export type ModuleHistoryEntry={id:string;at:number;kind:'state'|'action'|'undo'|'redo'|'error'|'resource';label:string;snapshot?:Record<string,string|boolean>};
export type ModuleDefinition={
 id:string;
 type:string;
 title:string;
 status:ModuleStatus;
 capabilities:string[];
 actions:ModuleFrameAction[];
 permissions:string[];
 resourceUsage?:ModuleResourceUsage;
 history?:ModuleHistoryEntry[];
 workspaceId?:string;
};
export type ModuleWorkspace={id:string;label:string};
export type ModuleActionContext={definition:ModuleDefinition;root:HTMLElement;controller:ModuleFrameController};
export type ModuleActionPlugin={
 id:string;
 label:string;
 title:string;
 permission?:string;
 capability?:string;
 shortcut?:string;
 destructive?:boolean;
 order?:number;
 run:(context:ModuleActionContext)=>void|Promise<void>;
};
export type ModuleShortcut={id:string;label:string;keys:string;run:()=>void|Promise<void>;permission?:string;capability?:string};
export type ModuleFrameOptions={
 definition?:Partial<ModuleDefinition>;
 onDuplicate?:()=>void|Promise<void>;
 onDelete?:()=>void|Promise<void>;
 onRename?:(title:string)=>void|Promise<void>;
 onMove?:(workspaceId:string)=>void|Promise<void>;
 onSettings?:()=>void|Promise<void>;
 onHistory?:(history:readonly ModuleHistoryEntry[])=>void|Promise<void>;
 onRetry?:()=>void|Promise<void>;
 canDelete?:boolean;
 canDuplicate?:boolean;
 permissions?:readonly string[];
 workspaces?:readonly ModuleWorkspace[];
 shortcuts?:readonly ModuleShortcut[];
 pluginActionIds?:readonly string[];
 persistKey?:string;
};
export type ModuleFrameController={
 destroy:()=>void;
 reset:()=>void;
 undo:()=>boolean;
 redo:()=>boolean;
 setLocked:(locked:boolean)=>void;
 setCollapsed:(collapsed:boolean)=>void;
 setPinned:(pinned:boolean)=>void;
 setStatus:(status:ModuleStatus,label?:string)=>void;
 setError:(error:unknown,retry?:()=>void|Promise<void>)=>void;
 clearError:()=>void;
 setResourceUsage:(usage:ModuleResourceUsage)=>void;
 recordHistory:(label:string,kind?:ModuleHistoryEntry['kind'])=>void;
 getHistory:()=>readonly ModuleHistoryEntry[];
 registerAction:(action:ModuleActionPlugin)=>()=>void;
};

type Field=HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
type Snapshot=Record<string,string|boolean>;
const editableSelector='input:not([type=file]):not([type=password]),textarea,select';
const pluginActions=new Map<string,ModuleActionPlugin>();
const HISTORY_LIMIT=80;
const SNAPSHOT_LIMIT=60;

export function registerUniversalModuleAction(action:ModuleActionPlugin){
 if(!action.id.trim())throw new Error('Module action id is required.');
 if(pluginActions.has(action.id))throw new Error(`Module action already registered: ${action.id}`);
 const id=action.id.trim();pluginActions.set(id,{...action,id});
 return()=>{pluginActions.delete(id);};
}
export function listUniversalModuleActions(){return [...pluginActions.values()].map(action=>({...action}));}

function shortcutMatches(event:KeyboardEvent,keys:string){
 const parts=keys.toLowerCase().split('+').map(v=>v.trim()).filter(Boolean),key=parts.at(-1)??'';
 const meta=parts.includes('cmd')||parts.includes('meta'),ctrl=parts.includes('ctrl'),alt=parts.includes('alt'),shift=parts.includes('shift');
 const eventKey=event.key.toLowerCase();
 const keyMatch=key==='enter'?event.key==='Enter':key==='escape'?event.key==='Escape':eventKey===key;
 return keyMatch&&event.metaKey===meta&&event.ctrlKey===ctrl&&event.altKey===alt&&event.shiftKey===shift;
}
function safeStorageGet(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function safeStorageSet(key:string,value:string){try{localStorage.setItem(key,value);}catch{}}
function safeParse<T>(value:string|null,fallback:T):T{if(!value)return fallback;try{return JSON.parse(value) as T;}catch{return fallback;}}
function labelStatus(status:ModuleStatus){return status.replace('_',' ');}
function actionHistory(kind:ModuleHistoryEntry['kind'],label:string,snapshot?:Snapshot):ModuleHistoryEntry{return{id:crypto.randomUUID(),at:Date.now(),kind,label,snapshot};}

export function mountModuleFrameActions(host:HTMLElement,moduleId:string,options:ModuleFrameOptions={}):ModuleFrameController{
 const sourceNodes=[...host.childNodes];
 if(!sourceNodes.length)return emptyController();
 const root=document.createElement('section');
 root.className='module-frame';
 host.replaceChildren(root);
 root.append(...sourceNodes);
 const persistKey=options.persistKey??`azrail.module.${moduleId}`;
 const saved=safeParse<{title?:string;collapsed?:boolean;locked?:boolean;pinned?:boolean;workspaceId?:string;history?:ModuleHistoryEntry[]}>(safeStorageGet(persistKey),{});
 const definition:ModuleDefinition={
  id:options.definition?.id??moduleId,
  type:options.definition?.type??'module',
  title:saved.title??options.definition?.title??'MODULE',
  status:options.definition?.status??'idle',
  capabilities:[...(options.definition?.capabilities??[])],
  actions:[...(options.definition?.actions??['collapse','expand','duplicate','delete','pin','lock','rename','move','settings','reset','undo','redo','retry','history'])],
  permissions:[...(options.permissions??options.definition?.permissions??[])],
  resourceUsage:{...(options.definition?.resourceUsage??{})},
  history:[...(saved.history??options.definition?.history??[])].slice(-HISTORY_LIMIT),
  workspaceId:saved.workspaceId??options.definition?.workspaceId??options.workspaces?.[0]?.id??'default',
 };
 root.dataset.moduleId=moduleId;root.dataset.workspace=definition.workspaceId??'default';
 const frameChildren=[...root.children] as HTMLElement[];
 const bar=document.createElement('div');bar.className='module-frame-actions';bar.setAttribute('aria-label','Действия модуля');
 const grip=document.createElement('button');grip.type='button';grip.className='module-grip';grip.textContent='⋮⋮';grip.title='Drag handle / Grip';grip.setAttribute('aria-label','Перетащить модуль');grip.draggable=true;
 const title=document.createElement('span');title.className='module-frame-label';title.textContent=definition.title;
 const workspace=document.createElement('span');workspace.className='module-workspace-label';workspace.textContent=definition.workspaceId??'default';workspace.title='Workspace';workspace.hidden=(options.workspaces?.length??0)<2;
 const status=document.createElement('span');status.className='module-status';status.textContent=labelStatus(definition.status);status.dataset.status=definition.status;status.title='Live status';
 const resource=document.createElement('span');resource.className='module-resource-usage';resource.title='Resource Usage';
 const actionHost=document.createElement('div');actionHost.className='module-frame-buttons module-frame-buttons-primary';
 const more=document.createElement('details');more.className='module-frame-more';const moreSummary=document.createElement('summary');moreSummary.textContent='•••';moreSummary.title='More module actions';moreSummary.setAttribute('aria-label','Дополнительные действия модуля');const moreHost=document.createElement('div');moreHost.className='module-frame-more-menu';more.append(moreSummary,moreHost);
 const panel=document.createElement('section');panel.className='module-frame-panel';panel.hidden=true;
 const errorBox=document.createElement('section');errorBox.className='module-frame-error';errorBox.hidden=true;errorBox.setAttribute('role','alert');
 bar.append(grip,title,workspace,status,resource,actionHost,more);root.prepend(errorBox,panel,bar);
 const content=frameChildren;
 const fields=()=>[...root.querySelectorAll<Field>(editableSelector)].filter(field=>!bar.contains(field)&&!panel.contains(field)&&!!field.id);
 const capture=():Snapshot=>Object.fromEntries(fields().map(field=>[field.id,field instanceof HTMLInputElement&&(field.type==='checkbox'||field.type==='radio')?field.checked:field.value]));
 const restore=(snapshot:Snapshot)=>{for(const field of fields()){if(!(field.id in snapshot))continue;const next=snapshot[field.id];if(field instanceof HTMLInputElement&&(field.type==='checkbox'||field.type==='radio'))field.checked=Boolean(next);else field.value=String(next);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}};
 const initial=capture(),undoStack:Snapshot[]=[initial],redoStack:Snapshot[]=[];
 let collapsed=Boolean(saved.collapsed),locked=Boolean(saved.locked),pinned=Boolean(saved.pinned),destroyed=false,inputTimer=0,retrying:undefined|(()=>void|Promise<void>);
 const dynamicActions=new Map<string,ModuleActionPlugin>();
 const hasPermission=(permission?:string)=>!permission||definition.permissions.includes(permission)||definition.permissions.includes('*');
 const hasCapability=(capability?:string)=>!capability||definition.capabilities.includes(capability)||definition.capabilities.includes('*');
 const hasCoreAction=(id:string)=>!(['collapse','expand','duplicate','delete','pin','lock','rename','move','settings','reset','undo','redo','retry','history'] as string[]).includes(id)||definition.actions.includes(id as ModuleFrameAction);
 const persist=()=>safeStorageSet(persistKey,JSON.stringify({title:definition.title,collapsed,locked,pinned,workspaceId:definition.workspaceId,history:definition.history?.slice(-HISTORY_LIMIT).map(({snapshot,...entry})=>entry)}));
 const pushHistory=(entry:ModuleHistoryEntry)=>{definition.history??=[];definition.history.push(entry);if(definition.history.length>HISTORY_LIMIT)definition.history.splice(0,definition.history.length-HISTORY_LIMIT);persist();};
 const recordHistory=(label:string,kind:ModuleHistoryEntry['kind']='action')=>pushHistory(actionHistory(kind,label,capture()));
 const renderResource=()=>{const entries=Object.entries(definition.resourceUsage??{});resource.hidden=!entries.length;resource.textContent=entries.map(([key,value])=>`${key} ${value}`).join(' · ');};
 const renderStatus=(next:ModuleStatus,label?:string)=>{definition.status=next;status.textContent=label??labelStatus(next);status.dataset.status=next;root.dataset.status=next;root.setAttribute('aria-busy',String(next==='loading'||next==='running'||next==='retrying'));};
 const setCollapsed=(next:boolean)=>{collapsed=next;root.dataset.collapsed=String(next);for(const child of content)child.hidden=next;collapse.textContent=next?'Expand':'Collapse';collapse.title=next?'Expand module':'Collapse module';persist();};
 const setLocked=(next:boolean)=>{locked=next;root.dataset.locked=String(next);for(const control of root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|HTMLButtonElement>('input,textarea,select,button'))if(!bar.contains(control)&&!panel.contains(control)&&control!==retryButton)control.disabled=next;lock.textContent=next?'Unlock':'Lock';persist();};
 const setPinned=(next:boolean)=>{pinned=next;root.dataset.pinned=String(next);pin.textContent=pinned?'Unpin':'Pin';persist();};
 const commitSnapshot=(label:string)=>{const snap=capture(),last=undoStack.at(-1);if(JSON.stringify(last)===JSON.stringify(snap))return;undoStack.push(snap);if(undoStack.length>SNAPSHOT_LIMIT)undoStack.shift();redoStack.length=0;pushHistory(actionHistory('state',label,snap));updateUndoButtons();};
 const undo=()=>{if(undoStack.length<2)return false;const current=undoStack.pop()!;redoStack.push(current);const previous=undoStack.at(-1)!;restore(previous);pushHistory(actionHistory('undo','Undo',previous));updateUndoButtons();return true;};
 const redo=()=>{const next=redoStack.pop();if(!next)return false;undoStack.push(next);restore(next);pushHistory(actionHistory('redo','Redo',next));updateUndoButtons();return true;};
 const reset=()=>{restore(initial);commitSnapshot('Reset to defaults');};
 const button=(id:string,label:string,tip:string,fn:()=>void|Promise<void>,permission?:string,placement:'primary'|'more'='more')=>{const b=document.createElement('button');b.type='button';b.dataset.moduleAction=id;b.textContent=label;b.title=tip;const allowed=hasPermission(permission)&&hasCoreAction(id);b.disabled=!allowed;b.hidden=!allowed;b.setAttribute('aria-disabled',String(!allowed));b.onclick=()=>{if(!allowed)return;Promise.resolve(fn()).then(()=>{if(id!=='undo'&&id!=='redo')recordHistory(label);if(placement==='more')more.open=false;}).catch(error=>setError(error));};(placement==='primary'?actionHost:moreHost).append(b);return b;};
 const renderHistoryPanel=()=>{panel.hidden=false;panel.dataset.panel='history';const entries=[...(definition.history??[])].reverse().slice(0,40);panel.innerHTML=`<div class="module-panel-head"><strong>Module History</strong><button type="button" data-close>Close</button></div>${entries.length?`<ol class="module-history-list">${entries.map(entry=>`<li><time>${new Date(entry.at).toLocaleTimeString()}</time><span>${escapeText(entry.label)}</span><small>${entry.kind}</small></li>`).join('')}</ol>`:'<p class="muted">История модуля пока пуста.</p>'}`;panel.querySelector<HTMLButtonElement>('[data-close]')!.onclick=()=>panel.hidden=true;};
 const renderSettingsPanel=()=>{panel.hidden=false;panel.dataset.panel='settings';const workspaces=options.workspaces??[];panel.innerHTML=`<div class="module-panel-head"><strong>Module Settings</strong><button type="button" data-close>Close</button></div><div class="module-settings-grid"><label><input type="checkbox" data-setting="collapsed" ${collapsed?'checked':''}> Collapsed</label><label><input type="checkbox" data-setting="pinned" ${pinned?'checked':''}> Pinned</label><label><input type="checkbox" data-setting="locked" ${locked?'checked':''}> Locked</label>${workspaces.length>1?`<label>Workspace<select data-setting="workspace">${workspaces.map(item=>`<option value="${escapeAttr(item.id)}" ${item.id===definition.workspaceId?'selected':''}>${escapeText(item.label)}</option>`).join('')}</select></label>`:''}</div><dl class="module-contract"><dt>Type</dt><dd>${escapeText(definition.type)}</dd><dt>Capabilities</dt><dd>${escapeText(definition.capabilities.join(', ')||'none')}</dd><dt>Permissions</dt><dd>${escapeText(definition.permissions.join(', ')||'none')}</dd></dl>`;panel.querySelector<HTMLButtonElement>('[data-close]')!.onclick=()=>panel.hidden=true;panel.querySelector<HTMLInputElement>('[data-setting="collapsed"]')!.onchange=e=>setCollapsed((e.currentTarget as HTMLInputElement).checked);panel.querySelector<HTMLInputElement>('[data-setting="pinned"]')!.onchange=e=>setPinned((e.currentTarget as HTMLInputElement).checked);panel.querySelector<HTMLInputElement>('[data-setting="locked"]')!.onchange=e=>setLocked((e.currentTarget as HTMLInputElement).checked);const select=panel.querySelector<HTMLSelectElement>('[data-setting="workspace"]');if(select)select.onchange=()=>moveWorkspace(select.value);};
 const clearError=()=>{root.dataset.error='false';errorBox.hidden=true;errorBox.replaceChildren();retrying=undefined;if(definition.status==='failure'||definition.status==='retrying')renderStatus('idle');};
 const setError=(error:unknown,retry?:()=>void|Promise<void>)=>{const message=error instanceof Error?error.message:String(error);retrying=retry;renderStatus('failure');root.dataset.error='true';errorBox.hidden=false;errorBox.replaceChildren();const text=document.createElement('span');text.textContent=message;errorBox.append(text);if(retry){const b=document.createElement('button');b.type='button';b.textContent='Retry';b.onclick=()=>{renderStatus('retrying');Promise.resolve(retry()).catch(next=>setError(next,retry));};errorBox.append(b);}pushHistory(actionHistory('error',message,capture()));};
 const moveWorkspace=async(workspaceId:string)=>{if(workspaceId===definition.workspaceId)return;if(!options.onMove)throw new Error('Move between workspaces is not available for this module instance.');await options.onMove(workspaceId);definition.workspaceId=workspaceId;workspace.textContent=workspaceId;root.dataset.workspace=workspaceId;persist();recordHistory(`Moved to ${workspaceId}`);};
 const collapse=button('collapse','Collapse','Collapse / Expand',()=>setCollapsed(!collapsed),'module.view','primary');
 const pin=button('pin','Pin','Pin module',()=>setPinned(!pinned),'module.view','primary');
 const lock=button('lock','Lock','Lock module controls',()=>setLocked(!locked),'module.configure');
 const undoButton=button('undo','Undo','Undo module field change',()=>{if(!undo())throw new Error('Nothing to undo.');},'module.configure');
 const redoButton=button('redo','Redo','Redo module field change',()=>{if(!redo())throw new Error('Nothing to redo.');},'module.configure');
 const historyButton=button('history','History','Open Module History',async()=>{renderHistoryPanel();await options.onHistory?.(definition.history??[]);},'module.view');
 button('settings','Settings','Open Module Settings',async()=>{renderSettingsPanel();await options.onSettings?.();},'module.view');
 button('reset','Reset','Reset to defaults',reset,'module.configure');
 button('rename','Rename','Rename module instance',async()=>{const next=prompt('Новое название модуля',definition.title)?.trim();if(!next||next===definition.title)return;await options.onRename?.(next);definition.title=next;title.textContent=next;persist();},'module.configure');
 if((options.workspaces?.length??0)>1&&options.onMove)button('move','Move','Move between workspaces',()=>renderSettingsPanel(),'module.configure');
 if(options.canDuplicate&&options.onDuplicate)button('duplicate','Duplicate','Duplicate module',options.onDuplicate,'module.manage');
 if(options.canDelete&&options.onDelete)button('delete','Delete','Delete module',options.onDelete,'module.manage');
 let retryButton:HTMLButtonElement|null=null;
 if(options.onRetry){retryButton=button('retry','Retry','Retry failed module operation',async()=>{renderStatus('retrying');await options.onRetry?.();},'module.execute','primary');retryButton.hidden=true;}
 const coreController:ModuleFrameController={destroy,reset,undo,redo,setLocked,setCollapsed,setPinned,setStatus:(next,label)=>{renderStatus(next,label);if(retryButton)retryButton.hidden=next!=='failure';if(next!=='failure')clearErrorVisualOnly();},setError,clearError,setResourceUsage:usage=>{definition.resourceUsage={...usage};renderResource();pushHistory(actionHistory('resource','Resource usage updated'));},recordHistory,getHistory:()=>[...(definition.history??[])],registerAction};
 function updateUndoButtons(){undoButton.disabled=!hasPermission('module.configure')||undoStack.length<2;redoButton.disabled=!hasPermission('module.configure')||redoStack.length<1;}
 function clearErrorVisualOnly(){root.dataset.error='false';errorBox.hidden=true;errorBox.replaceChildren();retrying=undefined;}
 function registerAction(action:ModuleActionPlugin){if(dynamicActions.has(action.id))throw new Error(`Module action already mounted: ${action.id}`);dynamicActions.set(action.id,action);if(!hasPermission(action.permission)||!hasCapability(action.capability))return()=>dynamicActions.delete(action.id);const b=button(action.id,action.label,action.title,()=>action.run({definition,root:root,controller:coreController}),action.permission);if(action.destructive)b.classList.add('danger');return()=>{dynamicActions.delete(action.id);b.remove();};}
 for(const id of options.pluginActionIds??[]){const action=pluginActions.get(id);if(action)registerAction(action);}
 renderResource();renderStatus(definition.status);setCollapsed(collapsed);setPinned(pinned);setLocked(locked);updateUndoButtons();
 const onInput=()=>{window.clearTimeout(inputTimer);inputTimer=window.setTimeout(()=>commitSnapshot('Field change'),180);};root.addEventListener('input',onInput,true);root.addEventListener('change',onInput,true);
 const onKey=(event:KeyboardEvent)=>{if(!root.contains(document.activeElement)&&!root.matches(':hover'))return;const shortcuts:ModuleShortcut[]=[{id:'collapse',label:'Collapse / Expand',keys:'Alt+Shift+C',run:()=>setCollapsed(!collapsed),permission:'module.view'},{id:'lock',label:'Lock / Unlock',keys:'Alt+Shift+L',run:()=>setLocked(!locked),permission:'module.configure'},{id:'pin',label:'Pin / Unpin',keys:'Alt+Shift+P',run:()=>setPinned(!pinned),permission:'module.view'},{id:'history',label:'History',keys:'Alt+Shift+H',run:renderHistoryPanel,permission:'module.view'},{id:'undo',label:'Undo',keys:'Alt+Shift+Z',run:undo,permission:'module.configure'},{id:'redo',label:'Redo',keys:'Alt+Shift+Y',run:redo,permission:'module.configure'},...(options.shortcuts??[])];for(const shortcut of shortcuts){if(shortcutMatches(event,shortcut.keys)&&hasPermission(shortcut.permission)&&hasCapability(shortcut.capability)){event.preventDefault();Promise.resolve(shortcut.run()).catch(setError);return;}}for(const action of dynamicActions.values())if(action.shortcut&&shortcutMatches(event,action.shortcut)&&hasPermission(action.permission)&&hasCapability(action.capability)){event.preventDefault();Promise.resolve(action.run({definition,root:root,controller:coreController})).catch(setError);return;}};document.addEventListener('keydown',onKey);
 const parent=root.parentElement;let dragging=false;
 const onDragStart=(event:DragEvent)=>{dragging=true;root.classList.add('module-dragging');event.dataTransfer?.setData('text/plain',definition.id);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';};
 const onDragEnd=()=>{dragging=false;root.classList.remove('module-dragging');};
 const onDragOver=(event:DragEvent)=>{if(!dragging||!parent)return;event.preventDefault();const over=(event.target as HTMLElement).closest<HTMLElement>('.module-frame');if(!over||over===root||over.parentElement!==parent)return;const box=over.getBoundingClientRect(),before=event.clientY<box.top+box.height/2;parent.insertBefore(root,before?over:over.nextSibling);};
 const onDrop=(event:DragEvent)=>{if(!dragging)return;event.preventDefault();recordHistory('Module reordered by drag handle');};
 grip.addEventListener('dragstart',onDragStart);grip.addEventListener('dragend',onDragEnd);parent?.addEventListener('dragover',onDragOver);parent?.addEventListener('drop',onDrop);
 recordHistory('ModuleFrame mounted','state');
 function destroy(){if(destroyed)return;destroyed=true;window.clearTimeout(inputTimer);root.removeEventListener('input',onInput,true);root.removeEventListener('change',onInput,true);document.removeEventListener('keydown',onKey);grip.removeEventListener('dragstart',onDragStart);grip.removeEventListener('dragend',onDragEnd);parent?.removeEventListener('dragover',onDragOver);parent?.removeEventListener('drop',onDrop);bar.remove();panel.remove();errorBox.remove();for(const child of content)child.hidden=false;host.replaceChildren(...root.childNodes);}
 return coreController;
}

function emptyController():ModuleFrameController{return{destroy:()=>{},reset:()=>{},undo:()=>false,redo:()=>false,setLocked:()=>{},setCollapsed:()=>{},setPinned:()=>{},setStatus:()=>{},setError:()=>{},clearError:()=>{},setResourceUsage:()=>{},recordHistory:()=>{},getHistory:()=>[],registerAction:()=>()=>{}};}
function escapeText(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));}
function escapeAttr(value:string){return escapeText(value).replace(/`/g,'&#96;');}
