import type {StudioMeta} from '../studio-types';
import type {StudioRunState,StudioStateController} from './studio-state';
import {studioStateLabel} from './studio-state';

type ModelOption={slug:string;task?:string;freeAllowlisted?:boolean;reviewed?:boolean;provider?:string;capabilities?:string[];contextWindow?:number|null;speedProfile?:'fast'|'balanced'|'quality'|'unknown';costProfile?:'free-allowlisted'|'policy-gated'|'unknown';availability?:'available'|'unavailable'};
export type StudioToolbarOptions={
 host:HTMLElement;
 meta:StudioMeta;
 state:StudioStateController;
 run:HTMLButtonElement|null;
 stop:()=>void;
 openHistory:()=>void;
 openCompare:()=>void;
 openReview:()=>void;
 openHelp:()=>void;
 loadModels?:()=>Promise<ModelOption[]>;
 getPreferredModel:()=>string;
 setPreferredModel:(model:string)=>void;
};

export function mountStudioToolbar(options:StudioToolbarOptions){
 const {host,meta,state}=options;host.replaceChildren();host.className='studio-toolbar';
 const left=document.createElement('div');left.className='studio-toolbar-left';
 const stateChip=document.createElement('span');stateChip.className='studio-state-chip';stateChip.setAttribute('role','status');
 const sync=document.createElement('span');sync.className='studio-sync-state';sync.textContent='Local state';sync.title='Статус сохранения/синхронизации';
 left.append(stateChip,sync);
 const right=document.createElement('div');right.className='studio-toolbar-actions';
 const button=(label:string,title:string,fn:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.onclick=fn;right.append(b);return b;};
 const undo=button('↶','Undo',()=>document.dispatchEvent(new CustomEvent('azrail:studio-undo')));undo.disabled=true;
 const redo=button('↷','Redo',()=>document.dispatchEvent(new CustomEvent('azrail:studio-redo')));redo.disabled=true;
 const history=button('History','История проекта',options.openHistory);history.disabled=false;
 const tools=document.createElement('details');tools.className='studio-tools-menu';const summary=document.createElement('summary');summary.textContent='Tools';summary.title='Compare Mode и Professional Review';const menu=document.createElement('div');menu.className='studio-tools-menu-panel';const compare=document.createElement('button');compare.type='button';compare.textContent='A | B Compare';compare.onclick=()=>{tools.open=false;options.openCompare();};const review=document.createElement('button');review.type='button';review.textContent='Professional Review';review.onclick=()=>{tools.open=false;options.openReview();};menu.append(compare,review);tools.append(summary,menu);right.append(tools);
 const help=button('?','Подсказки и горячие клавиши',options.openHelp);
 let modelSelect:HTMLSelectElement|null=null;
 if(meta.capabilities.includes('mission')){
  modelSelect=document.createElement('select');modelSelect.className='studio-model-select';modelSelect.title='Model quick switcher';modelSelect.setAttribute('aria-label','Модель');
  const auto=document.createElement('option');auto.value='';auto.textContent='AUTO · model router';auto.title='AZRAIL выберет модель по задаче, capabilities и policy.';modelSelect.append(auto);modelSelect.value=options.getPreferredModel();
  const info=document.createElement('span');info.className='studio-model-info';info.textContent='AUTO';
  const describe=(model:ModelOption)=>{const context=model.contextWindow?`${Math.round(model.contextWindow/1024)}K`:'context ?';const caps=(model.capabilities?.length?model.capabilities:[model.task??'unknown']).slice(0,3).join(', ');return `${model.provider??'provider ?'} · ${caps} · ${context} · speed ${model.speedProfile??'unknown'} · cost ${model.costProfile??'unknown'} · ${model.availability??'available'}`;};
  let loaded:ModelOption[]=[];const syncInfo=()=>{const selected=loaded.find(item=>item.slug===modelSelect!.value);info.textContent=selected?describe(selected):'AUTO · capability-aware routing';};
  modelSelect.onchange=()=>{options.setPreferredModel(modelSelect!.value);syncInfo();};right.append(modelSelect,info);
  if(options.loadModels)void options.loadModels().then(models=>{loaded=models;for(const model of models.filter(item=>item.availability!=='unavailable').slice(0,80)){if([...modelSelect!.options].some(option=>option.value===model.slug))continue;const option=document.createElement('option');option.value=model.slug;const context=model.contextWindow?` · ${Math.round(model.contextWindow/1024)}K`:'';option.textContent=`${model.freeAllowlisted?'FREE · ':''}${model.provider??''} · ${model.slug}${context}`;option.title=describe(model);modelSelect!.append(option);}modelSelect!.value=options.getPreferredModel();syncInfo();}).catch(()=>{info.textContent='Model catalog unavailable';});
 }
 const runMirror=button(meta.action,'Run',()=>options.run?.click());runMirror.classList.add('primary');runMirror.disabled=!options.run||options.run.disabled;
 const stop=button('Stop','Остановить текущую операцию',options.stop);stop.hidden=true;
 host.append(left,right);
 const unsubscribe=state.subscribe((next:StudioRunState)=>{stateChip.textContent=studioStateLabel[next];stateChip.dataset.state=next.toLowerCase();const active=next==='RUNNING'||next==='PAUSED'||next==='CANCELLING';runMirror.hidden=active;stop.hidden=!active;});
 const draftListener=(event:Event)=>{const detail=(event as CustomEvent<{status:string;canUndo:boolean;canRedo:boolean}>).detail;if(!detail)return;sync.textContent=detail.status;undo.disabled=!detail.canUndo;redo.disabled=!detail.canRedo;};
 document.addEventListener('azrail:draft-status',draftListener as EventListener);
 return {destroy(){unsubscribe();document.removeEventListener('azrail:draft-status',draftListener as EventListener);host.replaceChildren();},setRunEnabled(enabled:boolean){runMirror.disabled=!enabled;},setSyncStatus(status:string){sync.textContent=status;},modelSelect,history,help};
}
