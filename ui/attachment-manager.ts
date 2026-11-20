import { formatBytes } from '../src/shared/format';
import { fileIconName } from './attachment-chip';
import { iconElement } from './icons';
export type AttachmentState='queued'|'uploading'|'ready'|'failed';
type InputType='zip'|'pdf'|'docx'|'github'|'text'|'json'|'image'|'audio'|'video'|'code'|'unknown';
export interface AttachmentRef{r2Key?:string;fileName:string;inputType:InputType;size?:number;mimeType?:string;}
export interface ManagedAttachment{
 id:string;file:File;state:AttachmentState;progress:number;error?:string;ref?:AttachmentRef;preview?:string;
}

type Deps={
 root:HTMLElement;
 input:HTMLInputElement;
 getProjectId:()=>string;
 api:(path:string,options?:RequestInit)=>Promise<any>;
 onChange?:(refs:AttachmentRef[])=>void;
 onAdded?:(files:File[])=>void;
 failure:(e:unknown)=>void;
};

const MAX_FILES=12;
const MAX_BYTES=50*1024*1024;
const BLOCKED=new Set(['exe','bat','cmd','msi','dll']);
function id(){return crypto.randomUUID();}
function ext(name:string){return name.split('.').pop()?.toLowerCase()??'';}
const bytes=(n:number)=>formatBytes(n,{compactKb:true});
function kind(file:File){const e=ext(file.name);if(['png','jpg','jpeg','webp','svg'].includes(e))return 'IMAGE';if(['mp3','wav','m4a'].includes(e))return 'AUDIO';if(['mp4','mov','webm'].includes(e))return 'VIDEO';if(e==='zip')return 'ZIP';if(['pdf','docx'].includes(e))return 'DOC';if(['js','ts','tsx','jsx','html','css','py','md','json','txt'].includes(e))return 'TEXT';return e.toUpperCase()||'FILE';}

export function createAttachmentManager(deps:Deps){
 const items:ManagedAttachment[]=[];
 const refs=()=>items.filter(i=>i.state==='ready'&&i.ref?.r2Key).map(i=>i.ref!) as AttachmentRef[];
 function notify(){deps.onChange?.(refs());}
 function revoke(item:ManagedAttachment){if(item.preview){URL.revokeObjectURL(item.preview);item.preview=undefined;}}
 function removeButton(item:ManagedAttachment){const remove=document.createElement('button');remove.type='button';remove.className='attachment-tile-remove';remove.append(iconElement('close',14));remove.title='Убрать';remove.setAttribute('aria-label',`Убрать ${item.file.name}`);remove.onclick=e=>{e.stopPropagation();const i=items.indexOf(item);if(i>=0){revoke(item);items.splice(i,1);}render();};return remove;}
 function tile(item:ManagedAttachment){
  const box=document.createElement('div');box.className='attachment-tile';box.dataset.state=item.state;
  if(isImage(item.file)){
   box.classList.add('is-image');
   const open=document.createElement('button');open.type='button';open.className='attachment-tile-open';open.setAttribute('aria-label',`Посмотреть ${item.file.name}`);open.append(thumb(item));
   open.onclick=()=>{const url=URL.createObjectURL(item.file);window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000);};
   box.append(open);
  }else{
   box.classList.add('is-file');
   const icon=iconElement(fileIconName(item.file.name),18);icon.classList.add('attachment-kind');
   const text=document.createElement('span');text.className='attachment-tile-text';
   const name=document.createElement('strong');name.textContent=item.file.name;name.title=item.file.name;
   const type=document.createElement('small');type.textContent=kind(item.file);
   text.append(name,type);box.append(icon,text);
  }
  box.append(removeButton(item));
  return box;
 }
 function thumb(item:ManagedAttachment){const img=document.createElement('img');img.className='attachment-thumb';img.alt='';img.src=item.preview??=URL.createObjectURL(item.file);return img;}
 function render(){
  deps.root.replaceChildren();
  if(!items.length){deps.root.hidden=true;notify();return;}deps.root.hidden=false;
  for(const item of items){
   if(item.state==='ready'){deps.root.append(tile(item));continue;}
   const row=document.createElement('div');row.className='attachment-card';row.dataset.state=item.state;
   const icon=iconElement(isImage(item.file)?'image':fileIconName(item.file.name),18);icon.classList.add('attachment-kind');icon.title=kind(item.file);
   const body=document.createElement('div');body.className='attachment-body';
   const name=document.createElement('strong');name.textContent=item.file.name;
   const meta=document.createElement('small');meta.textContent=`${bytes(item.file.size)} · ${item.state==='queued'?'в очереди':item.state==='uploading'?`загрузка ${item.progress}%`:item.error||'ошибка'}`;
   meta.title=meta.textContent;body.append(name,meta);
   if(item.state==='uploading'){const p=document.createElement('progress');p.max=100;p.value=item.progress;p.setAttribute('aria-label',`Загрузка ${item.file.name}`);body.append(p);}
   const actions=document.createElement('div');actions.className='attachment-actions';
   if(isImage(item.file)&&item.state!=='failed'){const view=document.createElement('button');view.type='button';view.className='text-button attachment-preview';view.append(iconElement('eye',16));view.title=`Посмотреть ${item.file.name}`;view.setAttribute('aria-label',`Посмотреть ${item.file.name}`);view.onclick=()=>{const url=URL.createObjectURL(item.file);window.open(url,'_blank','noopener');window.setTimeout(()=>URL.revokeObjectURL(url),60000);};actions.append(view);}
   if(item.state==='failed'){const retry=document.createElement('button');retry.type='button';retry.textContent='Повторить';retry.onclick=()=>void upload(item);actions.append(retry);}
   const remove=document.createElement('button');remove.type='button';remove.className='text-button attachment-remove';remove.append(iconElement('close',16));remove.setAttribute('aria-label',`Удалить ${item.file.name}`);remove.onclick=()=>{const i=items.indexOf(item);if(i>=0){revoke(item);items.splice(i,1)};render();};actions.append(remove);
   row.append(isImage(item.file)?thumb(item):icon,body,actions);deps.root.append(row);
  }
  notify();
 }
 function validate(file:File){const e=ext(file.name);if(e&&BLOCKED.has(e))throw Error(`${file.name}: программы (.exe, .bat, .cmd, .msi, .dll) прикрепить нельзя.`);if(file.size>MAX_BYTES)throw Error(`${file.name}: максимум 50 MB.`);}
 function isImage(file:File){return /^image\//i.test(file.type)||/\.(png|jpe?g|webp|gif)$/i.test(file.name);}
 async function upload(item:ManagedAttachment){
  const local:AttachmentRef={fileName:item.file.name,inputType:'image',size:item.file.size,mimeType:item.file.type||'image/png'};
  if(isImage(item.file)&&!deps.getProjectId()){
   item.state='ready';item.progress=100;item.ref=local;render();
   return;
  }
  try{
   item.state='uploading';item.progress=15;item.error=undefined;render();
   const projectId=deps.getProjectId();if(!projectId)throw Error('Сначала выберите или создайте проект.');
   const form=new FormData();form.set('file',item.file);form.set('projectId',projectId);item.progress=45;render();
   const result=await deps.api('/api/upload',{method:'POST',body:form});item.progress=100;
   item.ref={r2Key:result.r2Key,fileName:result.fileName,inputType:result.inputType as InputType,size:result.size,mimeType:item.file.type||'application/octet-stream'};
   item.state='ready';render();
  }catch(e){
   if(isImage(item.file)){item.state='ready';item.progress=100;item.ref=local;item.error=undefined;render();return;}
   item.state='failed';item.error=e instanceof Error?e.message:String(e);render();
  }
 }
 async function add(files:File[]){
  try{
   if(items.length+files.length>MAX_FILES)throw Error(`Можно прикрепить до ${MAX_FILES} файлов за один запрос.`);
   for(const file of files){validate(file);items.push({id:id(),file,state:'queued',progress:0});}
   deps.onAdded?.(files);
   render();
   for(const item of items.filter(i=>i.state==='queued'))await upload(item);
  }catch(e){deps.failure(e);}
  finally{deps.input.value='';}
 }
 deps.input.onchange=()=>void add([...deps.input.files??[]]);
 deps.root.addEventListener('dragover',e=>{e.preventDefault();deps.root.classList.add('drop-target');});
 deps.root.addEventListener('dragleave',()=>deps.root.classList.remove('drop-target'));
 deps.root.addEventListener('drop',e=>{e.preventDefault();deps.root.classList.remove('drop-target');void add([...e.dataTransfer!.files]);});
 return {refs,files:()=>items.map(item=>item.file),add,clear(){items.forEach(revoke);items.splice(0);render();},hasPending(){return items.some(i=>i.state==='queued'||i.state==='uploading');},hasFailed(){return items.some(i=>i.state==='failed');},count(){return items.length;}};
}
