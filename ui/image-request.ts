export type ImageOperation='generate'|'variation'|'edit'|'upscale'|'inpaint'|'outpaint'|'remove'|'replace'|'background-replace';
export type ImageRequestBody={prompt:string;projectId?:string;aspectRatio:string;resolution:number;style:string;seed?:number|null;variations:number;operation:ImageOperation;referenceArtifactId?:string|null;maskArtifactId?:string|null;styleLock?:boolean;identityConsistency?:boolean;brandConstraints?:string[];structuralMode?:boolean;restoration?:boolean;requestedModel?:string|null};
type Pending={account:string;key:string;body:string};
const storageKey='pulse.image.pending';
export function readPendingImage(account:string):Pending|null {try{const p=JSON.parse(sessionStorage.getItem(storageKey)??'null');return p?.account===account&&typeof p.key==='string'&&typeof p.body==='string'?p:null;}catch{return null;}}
export async function requestImage(account:string,input:ImageRequestBody,api:(path:string,options:RequestInit)=>Promise<any>){
 const body=JSON.stringify(input),old=readPendingImage(account);
 if(old&&old.body!==body)throw Error('Предыдущая генерация могла быть принята. Сначала восстановите или завершите её с тем же ключом.');
 const pending=old??{account,key:crypto.randomUUID(),body};
 sessionStorage.setItem(storageKey,JSON.stringify(pending));
 try{const result=await api('/api/studio/image',{method:'POST',headers:{'Idempotency-Key':pending.key},body:pending.body});sessionStorage.removeItem(storageKey);return result;}
 catch(e){const status=(e as {status?:number})?.status;if(status&&[400,401,403,404,405,409,413,415,422,429].includes(status))sessionStorage.removeItem(storageKey);throw e;}
}
