import { formatBytes } from '../src/shared/format';
export type AttachmentState='queued'|'uploading'|'ready'|'failed';
type InputType='zip'|'pdf'|'docx'|'github'|'text'|'json'|'image'|'audio'|'video'|'code'|'unknown';
export interface AttachmentRef{r2Key?:string;fileName:string;inputType:InputType;size?:number;mimeType?:string;}
export interface ManagedAttachment{
 id:string;file:File;state:AttachmentState;progress:number;error?:string;ref?:AttachmentRef;
}

type Deps={
 root:HTMLElement;
 input:HTMLInputElement;
 getProjectId:()=>string;
 api:(path:string,options?:RequestInit)=>Promise<any>;
 onChange?:(refs:AttachmentRef[])=>void;
 failure:(e:unknown)=>void;
};

const MAX_FILES=12;
const MAX_BYTES=50*1024*1024;
const ACCEPTED=['zip','pdf','docx','js','ts','tsx','jsx','html','css','py','md','json','txt','png','jpg','jpeg','webp','svg','mp3','wav','m4a','mp4','mov','webm'];
function id(){return crypto.randomUUID();}
function ext(name:string){return name.split('.').pop()?.toLowerCase()??'';}
const bytes=(n:number)=>formatBytes(n,{compactKb:true});
function kind(file:File){const e=ext(file.name);if(['png','jpg','jpeg','webp','svg'].includes(e))return 'IMAGE';if(['mp3','wav','m4a'].includes(e))return 'AUDIO';if(['mp4','mov','webm'].includes(e))return 'VIDEO';if(e==='zip')return 'ZIP';if(['pdf','docx'].includes(e))return 'DOC';if(['js','ts','tsx','jsx','html','css','py','md','json','txt'].includes(e))return 'TEXT';return e.toUpperCase()||'FILE';}

export function createAttachmentManager(deps:Deps){
 const items:ManagedAttachment[]=[];
 const refs=()=>items.filter(i=>i.state==='ready'&&i.ref).map(i=>i.ref!) as AttachmentRef[];
 function notify(){deps.onChange?.(refs());}
 function render(){
  deps.root.replaceChildren();
  if(!items.length){deps.root.hidden=true;notify();return;}deps.root.hidden=false;
  for(const item of items){
   const row=document.createElement('div');row.className='attachment-card';row.dataset.state=item.state;
   const icon=document.createElement('span');icon.className='attachment-kind';icon.textContent=kind(item.file);
   const body=document.createElement('div');body.className='attachment-body';
   const name=document.createElement('strong');name.textContent=item.file.name;
   const meta=document.createElement('small');meta.textContent=`${bytes(item.file.size)} · ${item.state==='queued'?'в очереди':item.state==='uploading'?`загрузка ${item.progress}%`:item.state==='ready'?'готово':item.error||'ошибка'}`;
   body.append(name,meta);
   if(item.state==='uploading'){const p=document.createElement('progress');p.max=100;p.value=item.progress;p.setAttribute('aria-label',`Загрузка ${item.file.name}`);body.append(p);}
   const actions=document.createElement('div');actions.className='attachment-actions';
   if(item.state==='failed'){const retry=document.createElement('button');retry.type='button';retry.textContent='Повторить';retry.onclick=()=>void upload(item);actions.append(retry);}
   const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='×';remove.setAttribute('aria-label',`Удалить ${item.file.name}`);remove.onclick=()=>{const i=items.indexOf(item);if(i>=0)items.splice(i,1);render();};actions.append(remove);
   row.append(icon,body,actions);deps.root.append(row);
  }
  notify();
 }
 function validate(file:File){if(!ACCEPTED.includes(ext(file.name)))throw Error(`Тип файла ${file.name} не поддерживается.`);if(file.size>MAX_BYTES)throw Error(`${file.name}: максимум 50 MB.`);}
 async function upload(item:ManagedAttachment){
  try{
   item.state='uploading';item.progress=15;item.error=undefined;render();
   const projectId=deps.getProjectId();if(!projectId)throw Error('Сначала выберите или создайте проект.');
   const form=new FormData();form.set('file',item.file);form.set('projectId',projectId);item.progress=45;render();
   const result=await deps.api('/api/upload',{method:'POST',body:form});item.progress=100;
   item.ref={r2Key:result.r2Key,fileName:result.fileName,inputType:result.inputType as InputType,size:result.size,mimeType:item.file.type||'application/octet-stream'};
   item.state='ready';render();
  }catch(e){item.state='failed';item.error=e instanceof Error?e.message:String(e);render();}
 }
 async function add(files:File[]){
  try{
   if(items.length+files.length>MAX_FILES)throw Error(`Можно прикрепить до ${MAX_FILES} файлов за один запрос.`);
   for(const file of files){validate(file);items.push({id:id(),file,state:'queued',progress:0});}
   render();
   for(const item of items.filter(i=>i.state==='queued'))await upload(item);
  }catch(e){deps.failure(e);}
  finally{deps.input.value='';}
 }
 deps.input.onchange=()=>void add([...deps.input.files??[]]);
 deps.root.addEventListener('dragover',e=>{e.preventDefault();deps.root.classList.add('drop-target');});
 deps.root.addEventListener('dragleave',()=>deps.root.classList.remove('drop-target'));
 deps.root.addEventListener('drop',e=>{e.preventDefault();deps.root.classList.remove('drop-target');void add([...e.dataTransfer!.files]);});
 return {refs,add,clear(){items.splice(0);render();},hasPending(){return items.some(i=>i.state==='queued'||i.state==='uploading');},hasFailed(){return items.some(i=>i.state==='failed');},count(){return items.length;}};
}
