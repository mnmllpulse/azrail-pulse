import type { StudioDraftBody } from '../src/shared/schemas';
type Values=Record<string,string>;
type API=(path:string,options?:RequestInit)=>Promise<any>;
interface Options {scope?:string;writable?:boolean;preferCurrent?:boolean;}
interface CachedDraft {values:Values;revision:number;dirty:boolean;states?:Values[];at?:number;}
/** Local history never rewinds server project files. The stack itself survives a closed tab or a power cut. */
export function mountStudioDraft(host:HTMLElement,id:string,api:API,cloud:boolean,options:Options={}):()=>void {
 const fields=[...host.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input:not([type=file]):not([type=password]),textarea,select')].filter(e=>!!e.id);
 if(!fields.length)return()=>{};
 const read=()=>Object.fromEntries(fields.map(e=>[e.id,e.value]));
 const defaults=read(),storageKey=`pulse.draft.${options.scope??'local'}.${id}`;
 const view=()=>host.ownerDocument.defaultView;
 const memory=new Map<string,string>();
 const bucket=()=>{
  const win=view();
  try{if(win?.localStorage)return win.localStorage;}catch{/* opaque origin */}
  try{if(win?.sessionStorage)return win.sessionStorage;}catch{/* opaque origin */}
  return {getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);}};
 };
 const valid=(values:unknown):values is Values=>!!values&&typeof values==='object'&&!Array.isArray(values)&&Object.entries(values).every(([key,value])=>{
  const field=fields.find(f=>f.id===key);const max=field&&'maxLength' in field&&field.maxLength>0?field.maxLength:20000;
  return !!field&&typeof value==='string'&&value.length<=max;
 });
 const validStack=(states:unknown,at:unknown):states is Values[]=>Array.isArray(states)&&states.length>0&&states.length<=40&&states.every(valid)&&Number.isInteger(at)&&(at as number)>=0&&(at as number)<states.length;
 let cached:CachedDraft|null=null;
 try{
  const raw=bucket().getItem(storageKey)??view()?.sessionStorage.getItem(storageKey);
  const value=JSON.parse(raw??'null');
  if(valid(value?.values)&&Number.isSafeInteger(value.revision)&&value.revision>=0&&typeof value.dirty==='boolean')cached=value;
 }catch{}
 if(cached&&!(options.preferCurrent&&fields.some(field=>field.value.trim()!=='')))for(const field of fields)if(typeof cached.values[field.id]==='string')field.value=cached.values[field.id];
 let states:Values[]=[read()];
 let at=0,restoredStack=false;
 if(cached&&validStack(cached.states,cached.at)&&typeof cached.at==='number'){states=cached.states;at=cached.at;restoredStack=true;}
 if(restoredStack&&!(options.preferCurrent&&fields.some(field=>field.value.trim()!==''))){const snap=states[at];if(snap)for(const field of fields)if(typeof snap[field.id]==='string')field.value=snap[field.id];}
 let revision=cached?.revision??0,dirty=cached?.dirty??false;
 let loaded=!cloud,saving=false,loading=false,disposed=false;
 const writable=options.writable!==false;
 const emitStatus=(message:string)=>document.dispatchEvent(new CustomEvent('azrail:draft-status',{detail:{status:message,canUndo:at>0,canRedo:at<states.length-1}}));
 const writeCache=()=>{try{bucket().setItem(storageKey,JSON.stringify({values:states[at]??read(),revision,dirty,states,at}));}catch{}};
 const bar=document.createElement('div');bar.className='toolbar draft-toolbar';
 const status=document.createElement('span');status.className='muted';status.setAttribute('role','status');status.textContent=cloud?'Загружаю черновик…':cached?'Проект восстановлен на устройстве':'Проект сохранится на устройстве';
 const button=(name:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=action;bar.append(b);return b;};
 const apply=(values:Values)=>{for(const field of fields)if(typeof values[field.id]==='string')field.value=values[field.id];update();};
 const record=()=>{const next=read();if(JSON.stringify(states[at])===JSON.stringify(next))return;states=states.slice(0,at+1);states.push(next);if(states.length>40)states.shift();at=states.length-1;dirty=true;writeCache();status.textContent='Есть несохранённые изменения';update();};
 const history=(position:number)=>{at=position;apply(states[at]);dirty=true;writeCache();status.textContent=`Откат ${at+1} из ${states.length}`;};
 const undo=button('↶ Отменить',()=>{if(at)history(at-1);});
 const redo=button('↷ Повторить',()=>{if(at<states.length-1)history(at+1);});
 button('Сбросить',()=>{apply(defaults);record();});
 const save=button('Сохранить черновик',()=>{void persist();});save.hidden=!cloud||!writable;
 const reload=button('Загрузить сохранённый',()=>{void load(true);});reload.hidden=!cloud;
 bar.append(status);host.append(bar);
 function update(){undo.disabled=!at;redo.disabled=at>=states.length-1;save.disabled=!writable||!loaded||saving||loading;reload.disabled=saving||loading;emitStatus(status.textContent||'Local state');}
 async function load(explicit=false){
  if(loading||saving||disposed)return;loading=true;update();const start=JSON.stringify(read());
  try{
   const r=await api(`/api/studio/drafts/${id}`);if(disposed)return;
   if(!Number.isSafeInteger(r.revision)||r.revision<0||!valid(r.values))throw Error('Некорректный черновик сервера.');
   if(!explicit&&dirty&&revision!==r.revision){loaded=false;status.textContent='На сервере другая версия. Ваш проект сохранён на устройстве. Загрузите сохранённый черновик перед записью.';return;}
   revision=r.revision;loaded=true;
   if((explicit||!dirty)&&Object.keys(r.values).length&&start===JSON.stringify(read())){
    apply(r.values);states=[read()];at=0;dirty=false;status.textContent='Черновик загружен';
   }else status.textContent=dirty?'Ваши правки и откаты восстановлены':r.revision?'Черновик на сервере; ваши правки сохранены':'Новый черновик';
   writeCache();
  }catch{if(!disposed)status.textContent='Не удалось загрузить черновик. Повторите загрузку.';}
  finally{loading=false;if(!disposed)update();}
 }
 async function persist(snapshot?:Values){
  if(!writable||!loaded||saving||loading||(disposed&&!snapshot))return;
  saving=true;if(!disposed)update();const values=snapshot??read();
  try{
   const r=await api(`/api/studio/drafts/${id}`,{method:'PUT',body:JSON.stringify({baseRevision:revision,values} satisfies StudioDraftBody)});
   if(r?.values&&JSON.stringify(r.values)!==JSON.stringify(values)){dirty=true;writeCache();if(!disposed){loaded=false;status.textContent='На сервере другая версия. Ваш проект сохранён на устройстве. Загрузите сохранённый черновик перед записью.';}return;}
   revision=r.revision;dirty=snapshot?false:JSON.stringify(values)!==JSON.stringify(read());
   if(snapshot)states[at]=values;
   writeCache();if(!disposed)status.textContent=dirty?'Сохранено; есть новые правки':'Сохранено на сервере';
  }catch(e){if(!disposed)status.textContent=e instanceof Error?e.message:'Не удалось сохранить';}
  finally{saving=false;if(!disposed)update();}
 }
 const onUndo=()=>{if(at)history(at-1);};const onRedo=()=>{if(at<states.length-1)history(at+1);};
 document.addEventListener('azrail:studio-undo',onUndo);document.addEventListener('azrail:studio-redo',onRedo);
 fields.forEach(f=>{f.addEventListener('input',record);f.addEventListener('change',record);});
 const flush=()=>{record();writeCache();if(writable&&loaded&&dirty&&!saving&&!loading)void persist(read());};
 const win=view();win?.addEventListener('pagehide',flush);
 update();if(cloud)void load();
 return()=>{if(disposed)return;record();writeCache();const shouldSave=writable&&loaded&&dirty&&!saving&&!loading;const snapshot=read();disposed=true;win?.removeEventListener('pagehide',flush);document.removeEventListener('azrail:studio-undo',onUndo);document.removeEventListener('azrail:studio-redo',onRedo);fields.forEach(f=>{f.removeEventListener('input',record);f.removeEventListener('change',record);});bar.remove();if(shouldSave)void persist(snapshot);};
}
