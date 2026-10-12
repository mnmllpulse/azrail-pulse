import type { Env } from '../types';
import { AccessError } from './accounts';
import {IMAGE_ADVANCED_OPERATIONS,advancedPromptDirectives,imageOperationProviderSupport,parseImageAdvancedControls,type ImageAdvancedOperation,type ImageAdvancedControls} from './image-intelligence';

export const IMAGE_STYLES=['auto','cinematic','editorial','minimal','product','illustration','3d','dark-techno'] as const;
export const IMAGE_ASPECTS=['1:1','16:9','9:16','4:3','3:4','3:2','2:3'] as const;
export const IMAGE_RESOLUTIONS=[512,768,1024] as const;
export const IMAGE_OPERATIONS=IMAGE_ADVANCED_OPERATIONS;
export type ImageStyle=typeof IMAGE_STYLES[number];
export type ImageAspect=typeof IMAGE_ASPECTS[number];
export type ImageResolution=typeof IMAGE_RESOLUTIONS[number];
export type ImageOperation=ImageAdvancedOperation;

export type ImageStudioRequest=ImageAdvancedControls & {
 prompt:string;
 projectId:string;
 aspectRatio:ImageAspect;
 resolution:ImageResolution;
 style:ImageStyle;
 seed:number|null;
 variations:number;
 operation:ImageOperation;
 referenceArtifactId:string|null;
};

const STYLE_HINTS:Record<ImageStyle,string>={
 auto:'',
 cinematic:'cinematic composition, controlled dramatic light, premium production design',
 editorial:'editorial art direction, refined typography-free composition, magazine-grade styling',
 minimal:'minimal composition, disciplined negative space, precise geometry, restrained palette',
 product:'premium product photography, controlled studio light, precise materials, clean background',
 illustration:'high-end editorial illustration, coherent shapes, deliberate texture, strong visual hierarchy',
 '3d':'high-end 3D render, physically plausible materials, precise global illumination, clean composition',
 'dark-techno':'dark minimal techno visual language, sculptural form, deep black space, restrained violet light, premium underground aesthetic',
};

const RATIO:Record<ImageAspect,[number,number]>={
 '1:1':[1,1], '16:9':[16,9], '9:16':[9,16], '4:3':[4,3], '3:4':[3,4], '3:2':[3,2], '2:3':[2,3],
};

function oneOf<T extends readonly string[]>(value:unknown,allowed:T,label:string):T[number]{
 const v=typeof value==='string'?value.trim():'';
 if(!(allowed as readonly string[]).includes(v))throw new AccessError(`Некорректный ${label}.`,400);
 return v as T[number];
}

export function imageDimensions(aspect:ImageAspect,resolution:ImageResolution){
 const [rw,rh]=RATIO[aspect],wide=rw>=rh;
 const long=resolution,short=Math.max(256,Math.round((long*Math.min(rw,rh)/Math.max(rw,rh))/16)*16);
 return wide?{width:long,height:short}:{width:short,height:long};
}

export function parseImageStudioRequest(body:Record<string,unknown>):ImageStudioRequest{
 const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
 if(!prompt||prompt.length>4000)throw new AccessError('Нужен запрос до 4 000 символов.',400);
 const projectId=typeof body.projectId==='string'?body.projectId.trim():'';
 const aspectRatio=oneOf(body.aspectRatio??'1:1',IMAGE_ASPECTS,'формат кадра');
 const resolution=Number(body.resolution??1024);
 if(!IMAGE_RESOLUTIONS.includes(resolution as ImageResolution))throw new AccessError('Некорректное разрешение.',400);
 const style=oneOf(body.style??'auto',IMAGE_STYLES,'стиль');
 const variations=Math.trunc(Number(body.variations??1));
 if(!Number.isSafeInteger(variations)||variations<1||variations>4)throw new AccessError('Можно создать от 1 до 4 вариантов.',400);
 let seed:number|null=null;
 if(body.seed!==undefined&&body.seed!==null&&String(body.seed).trim()!==''){
  const n=Math.trunc(Number(body.seed));
  if(!Number.isSafeInteger(n)||n<0||n>2147483647)throw new AccessError('Seed должен быть целым числом от 0 до 2147483647.',400);
  seed=n;
 }
 const operation=oneOf(body.operation??'generate',IMAGE_OPERATIONS,'режим изображения');
 const referenceArtifactId=typeof body.referenceArtifactId==='string'&&body.referenceArtifactId.trim()?body.referenceArtifactId.trim():null;
 if(operation!=='generate'&&!referenceArtifactId)throw new AccessError('Для этого режима выберите reference image.',400);
 if(referenceArtifactId&&!/^[a-f0-9-]{36}$/i.test(referenceArtifactId))throw new AccessError('Некорректный reference image.',400);
 const advanced=parseImageAdvancedControls(body,operation,referenceArtifactId);
 return {prompt,projectId,aspectRatio,resolution:resolution as ImageResolution,style,seed,variations,operation,referenceArtifactId,...advanced};
}

export function selectImageModel(input:Pick<ImageStudioRequest,'operation'|'referenceArtifactId'|'resolution'|'requestedModel'>):string{
 if(input.requestedModel)return input.requestedModel;
 // AUTO router: fast default for simple generation, quality/reference model otherwise.
 return input.referenceArtifactId||input.operation!=='generate'||input.resolution===1024
  ? '@cf/black-forest-labs/flux-2-klein-9b'
  : '@cf/black-forest-labs/flux-2-klein-4b';
}

export function effectiveImagePrompt(input:ImageStudioRequest,variationIndex:number){
 const parts=[input.prompt];
 if(STYLE_HINTS[input.style])parts.push(STYLE_HINTS[input.style]);
 if(input.operation==='variation')parts.push('Create a controlled variation of input image 0 while preserving the core subject and visual identity.');
 if(input.operation==='edit')parts.push('Edit input image 0 according to the instruction while preserving unrelated details.');
 if(input.operation==='upscale')parts.push('Recreate input image 0 at higher fidelity, preserving composition, subject identity and color relationships; add detail without inventing a new scene.');
 parts.push(...advancedPromptDirectives(input));
 if(input.variations>1)parts.push(`Variation ${variationIndex+1} of ${input.variations}; make it meaningfully distinct without leaving the brief.`);
 return parts.join('. ');
}

export async function loadReferenceImage(env:Env,accountId:string,artifactId:string){
 const row=await env.AZRAIL_D1.prepare(`SELECT id,r2_key,mime,bytes,name FROM studio_artifacts WHERE id=? AND account_id=?`)
  .bind(artifactId,accountId).first<{id:string;r2_key:string;mime:string;bytes:number;name:string}>();
 if(!row)throw new AccessError('Reference image не найден.',404);
 if(!/^image\/(png|jpeg|webp)$/i.test(row.mime))throw new AccessError('Reference должен быть PNG, JPEG или WEBP.',400);
 if(row.bytes>4*1024*1024)throw new AccessError('Reference image слишком большой. Используйте оптимизированную копию до 4 MB.',413);
 const object=await env.AZRAIL_R2.get(row.r2_key);
 if(!object)throw new AccessError('Reference object отсутствует в R2.',404);
 const bytes=new Uint8Array(await object.arrayBuffer());
 if(bytes.length>4*1024*1024)throw new AccessError('Reference image слишком большой.',413);
 return {bytes,mime:row.mime,name:row.name};
}

function fromBase64(value:string){
 const cleaned=value.replace(/^data:image\/[a-z0-9.+-]+;base64,/i,'');
 if(cleaned.length>24*1024*1024)throw new Error('Ответ image provider превышает лимит.');
 const binary=atob(cleaned),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}

export function detectImage(bytes:Uint8Array){
 if(bytes.length>12*1024*1024)throw new Error('Ответ image provider превышает лимит.');
 const jpeg=bytes.length>4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.length>=33&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const webp=bytes.length>=16&&new TextDecoder().decode(bytes.subarray(0,4))==='RIFF'&&new TextDecoder().decode(bytes.subarray(8,12))==='WEBP';
 if(!jpeg&&!png&&!webp)throw new Error('Провайдер вернул неподдерживаемый формат изображения.');
 return jpeg?{mime:'image/jpeg',extension:'jpg'}:png?{mime:'image/png',extension:'png'}:{mime:'image/webp',extension:'webp'};
}

export async function runImageProvider(env:Env,input:ImageStudioRequest,variationIndex:number,reference?:{bytes:Uint8Array;mime:string},onDispatch?:()=>void){
 const support=imageOperationProviderSupport(input.operation,input.structuralMode);if(!support.ready)throw new AccessError(support.reason,409);
 const model=selectImageModel(input),{width,height}=imageDimensions(input.aspectRatio,input.operation==='upscale'?1024:input.resolution);
 const form=new FormData();
 form.append('prompt',effectiveImagePrompt(input,variationIndex));
 form.append('width',String(width));form.append('height',String(height));
 const variationSeed=input.seed===null?null:(input.seed+variationIndex)%2147483648;
 if(variationSeed!==null)form.append('seed',String(variationSeed));
 if(reference){
  const buffer=reference.bytes.buffer.slice(reference.bytes.byteOffset,reference.bytes.byteOffset+reference.bytes.byteLength) as ArrayBuffer;
  form.append('input_image_0',new Blob([buffer],{type:reference.mime}),'reference');
 }
 const serialized=new Response(form),contentType=serialized.headers.get('content-type');
 if(!serialized.body||!contentType)throw new Error('Не удалось подготовить multipart image request.');
 onDispatch?.();
 const result=await (env.AI as unknown as {run:(model:string,input:unknown)=>Promise<unknown>}).run(model,{multipart:{body:serialized.body,contentType}});
 const image=(result&&typeof result==='object'&&typeof (result as {image?:unknown}).image==='string')?(result as {image:string}).image:null;
 if(!image)throw new Error('Image provider не вернул base64 image.');
 const bytes=fromBase64(image),format=detectImage(bytes);
 return {model,width,height,seed:variationSeed,bytes,...format};
}
