import type { StudioDraftBody } from '../src/shared/schemas';
type Values=Record<string,string>;
type API=(path:string,options?:RequestInit)=>Promise<any>;
interface Options {scope?:string;writable?:boolean;preferCurrent?:boolean;}
interface CachedDraft {values:Values;revision:number;dirty:boolean;}
/** Local history and per-module session drafts never rewind server project data. */
export function mountStudioDraft(host:HTMLElement,id:string,api:API,cloud:boolean,options:Options={}):()=>void {
 const fields=[...host.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input:not([type=file]):not([type=password]),textarea,select')].filter(e=>!!e.id);
 if(!fields.length)return()=>{};
 const read=()=>Object.fromEntries(fields.map(e=>[e.id,e.value]));
 const defaults=read(),storageKey=`pulse.draft.${options.scope??'local'}.${id}`;
 const storage=()=>host.ownerDocument.defaultView!.sessionStorage;
 const valid=(values:unknown):values is Values=>!!values&&typeof values==='object'&&!Array.isArray(values)&&Object.entries(values).every(([key,value])=>{
  const field=fields.find(f=>f.id===key);const max=field&&'maxLength' in field&&field.maxLength>0?field.maxLength:20000;
  return !!field&&typeof value==='string'&&value.length<=max;
 });
 let cached:CachedDraft|null=null;
 try{const value=JSON.parse(storage().getItem(storageKey)??'null');if(valid(value?.values)&&Number.isSafeInteger(value.revision)&&value.revision>=0&&typeof value.dirty==='boolean')cached=value;}catch{}
 if(cached&&!(options.preferCurrent&&fields.some(field=>field.value.trim()!=='')))for(const field of fields)if(typeof cached.values[field.id]==='string')field.value=cached.values[field.id];
 let states:Values[]=[read()],at=0,revision=cached?.revision??0,dirty=cached?.dirty??false;
 let loaded=!cloud,saving=false,loading=false,disposed=false;
 const writable=options.writable!==false;
 const emitStatus=(message:string)=>document.dispatchEvent(new CustomEvent('azrail:draft-status',{detail:{status:message,canUndo:at>0,canRedo:at<states.length-1}}));
 const writeCache=()=>{try{storage().setItem(storageKey,JSON.stringify({values:read(),revision,dirty}));}catch{}};
 const bar=document.createElement('div');bar.className='toolbar draft-toolbar';
 const status=document.createElement('span');status.className='muted';status.setAttribute('role','status');status.textContent=cloud?'Загружаю черновик…':cached?'Черновик восстановлен в этой вкладке':'Черновик в этой вкладке';
 const button=(name:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=action;bar.append(b);return b;};
 const apply=(values:Values)=>{for(const field of fields)if(typeof values[field.id]==='string')field.value=values[field.id];update();};
 const record=()=>{const next=read();if(JSON.stringify(states[at])===JSON.stringify(next))return;states=states.slice(0,at+1);states.push(next);if(states.length>40)states.shift();at=states.length-1;dirty=true;writeCache();status.textContent='Есть несохранённые изменения';update();};
 const history=(position:number)=>{at=position;apply(states[at]);dirty=true;writeCache();status.textContent='Есть несохранённые изменения';};
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
   // An automatic load cannot silently adopt a newer revision and overwrite it.
   if(!explicit&&dirty&&revision!==r.revision){loaded=false;status.textContent='На сервере другая версия. Ваш текст сохранён в этой вкладке. Загрузите сохранённый черновик перед записью.';return;}
   revision=r.revision;loaded=true;
   if((explicit||!dirty)&&Object.keys(r.values).length&&start===JSON.stringify(read())){
    apply(r.values);states=[read()];at=0;dirty=false;status.textContent='Черновик загружен';
   }else status.textContent=dirty?'Ваши правки восстановлены в форме':r.revision?'Черновик на сервере; ваши правки сохранены в форме':'Новый черновик';
   writeCache();
  }catch{if(!disposed)status.textContent='Не удалось загрузить черновик. Повторите загрузку.';}
  finally{loading=false;if(!disposed)update();}
 }
 async function persist(){
  if(!writable||!loaded||saving||loading||disposed)return;saving=true;update();const values=read();
  try{
   const r=await api(`/api/studio/drafts/${id}`,{method:'PUT',body:JSON.stringify({baseRevision:revision,values} satisfies StudioDraftBody)});if(disposed)return;
   revision=r.revision;dirty=JSON.stringify(values)!==JSON.stringify(read());writeCache();status.textContent=dirty?'Сохранено; есть новые правки':'Сохранено на сервере';
  }catch(e){if(!disposed)status.textContent=e instanceof Error?e.message:'Не удалось сохранить';}
  finally{saving=false;if(!disposed)update();}
 }
 const onUndo=()=>{if(at)history(at-1);};const onRedo=()=>{if(at<states.length-1)history(at+1);};
 document.addEventListener('azrail:studio-undo',onUndo);document.addEventListener('azrail:studio-redo',onRedo);
 fields.forEach(f=>f.addEventListener('input',record));update();if(cloud)void load();
 return()=>{if(disposed)return;record();writeCache();disposed=true;document.removeEventListener('azrail:studio-undo',onUndo);document.removeEventListener('azrail:studio-redo',onRedo);fields.forEach(f=>f.removeEventListener('input',record));bar.remove();};
}
