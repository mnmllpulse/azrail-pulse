import type {StudioModuleContext} from '../studio-types';

export const runButton='<div class="toolbar"><button id="studio-run" class="primary" type="button"></button></div>';
export const inputFile=(accept:string)=>`<label for="studio-file">Выберите файл</label><input id="studio-file" type="file" accept="${accept}">`;

export function requiredFile(context:StudioModuleContext){
 const input=context.controls.querySelector<HTMLInputElement>('#studio-file');
 const file=input?.files?.[0];
 if(!file)throw Error('Выберите файл.');
 return file;
}

export function fieldValue(context:StudioModuleContext,id:string){return context.controls.querySelector<HTMLInputElement|HTMLTextAreaElement>(`#${id}`)?.value??'';}
export function numberValue(context:StudioModuleContext,id:string){return Number(fieldValue(context,id));}

export function exportResult(context:StudioModuleContext,blob:Blob,name:string,kind:'audio'|'video'|'image'){
 context.setLastBlob(blob);
 const url=URL.createObjectURL(blob),result=context.result;result.replaceChildren();
 const media=document.createElement(kind==='image'?'img':kind);media.setAttribute('src',url);
 context.setMediaCleanup(()=>{if(media instanceof HTMLMediaElement)media.pause();media.removeAttribute('src');URL.revokeObjectURL(url);});
 if(kind==='image'){media.className='result-image';media.setAttribute('alt','Сгенерированное изображение');}else media.setAttribute('controls','');result.append(media);
 const bar=document.createElement('div');bar.className='toolbar';const dl=document.createElement('button');dl.textContent='Скачать файл';dl.onclick=()=>{import('../media').then(m=>m.download(blob,name)).catch(context.failure);};bar.append(dl);
 if(context.account&&context.account.role!=='viewer'){
  const save=document.createElement('button');save.textContent='Сохранить в проектах';save.onclick=()=>{
   if(save.disabled)return;save.disabled=true;
   context.api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':blob.type,'X-Filename':encodeURIComponent(name),'X-Project-Id':context.projectId,'X-Studio-Id':context.meta.id},body:blob})
    .then(()=>{save.textContent='Сохранено';context.notice('Файл сохранён.');}).catch(error=>{save.disabled=false;context.failure(error);});
  };bar.append(save);
 }
 result.append(bar);
}

export function moduleBase<T extends {id:any}>(meta:T){return meta;}
