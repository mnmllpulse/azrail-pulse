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

/** POST a generated blob to /api/studio/artifacts on behalf of a studio. */
export function uploadStudioArtifact(context:StudioModuleContext,blob:Blob,name:string,studioId:string,opts:{contentType?:string;signal?:AbortSignal}={}):Promise<{id:string}>{
 return context.api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':opts.contentType??blob.type,'X-Filename':encodeURIComponent(name),'X-Project-Id':context.projectId??'','X-Studio-Id':studioId},body:blob,...(opts.signal?{signal:opts.signal}:{})}) as Promise<{id:string}>;
}
