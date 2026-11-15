import {AccessError} from './accounts';

export const IMAGE_ADVANCED_OPERATIONS=['generate','variation','edit','upscale','inpaint','outpaint','remove','replace','background-replace'] as const;
export type ImageAdvancedOperation=typeof IMAGE_ADVANCED_OPERATIONS[number];

export type ImageAdvancedControls={
 maskArtifactId:string|null;
 styleLock:boolean;
 identityConsistency:boolean;
 brandConstraints:string[];
 structuralMode:boolean;
 restoration:boolean;
 requestedModel:string|null;
};

const IMAGE_PROVIDER_MODELS=['@cf/black-forest-labs/flux-2-klein-4b','@cf/black-forest-labs/flux-2-klein-9b'] as const;
const UUID=/^[a-f0-9-]{36}$/i;
const PROVIDER_NATIVE=new Set<ImageAdvancedOperation>(['generate','variation','edit','upscale']);
const MASK_REQUIRED=new Set<ImageAdvancedOperation>(['inpaint','remove','replace']);

function boundedStrings(value:unknown,maxItems:number,maxLength:number,label:string){
 if(value===undefined||value===null)return [] as string[];
 if(!Array.isArray(value))throw new AccessError(`${label}: ожидается список.`,400);
 if(value.length>maxItems)throw new AccessError(`${label}: максимум ${maxItems}.`,400);
 return value.map((item,index)=>{if(typeof item!=='string')throw new AccessError(`${label} ${index+1}: ожидается текст.`,400);const v=item.trim();if(!v||v.length>maxLength)throw new AccessError(`${label} ${index+1}: максимум ${maxLength} символов.`,400);return v;});
}

export function parseImageAdvancedControls(body:Record<string,unknown>,operation:ImageAdvancedOperation,referenceArtifactId:string|null):ImageAdvancedControls{
 const maskArtifactId=typeof body.maskArtifactId==='string'&&body.maskArtifactId.trim()?body.maskArtifactId.trim():null;
 if(maskArtifactId&&!UUID.test(maskArtifactId))throw new AccessError('Некорректный mask artifact.',400);
 if(MASK_REQUIRED.has(operation)&&!maskArtifactId)throw new AccessError('Для выбранной region-операции нужна сохранённая mask.',400);
 const styleLock=body.styleLock===true,identityConsistency=body.identityConsistency===true,structuralMode=body.structuralMode===true,restoration=body.restoration===true;
 if(identityConsistency&&!referenceArtifactId)throw new AccessError('Character/Product Consistency требует reference image.',400);
 const brandConstraints=boundedStrings(body.brandConstraints,8,240,'Brand constraint');
 const requestedModel=typeof body.requestedModel==='string'&&body.requestedModel.trim()?body.requestedModel.trim():null;
 if(requestedModel&&!(IMAGE_PROVIDER_MODELS as readonly string[]).includes(requestedModel))throw new AccessError('Выбранная image model пока не разрешена Image Studio.',400);
 return {maskArtifactId,styleLock,identityConsistency,brandConstraints,structuralMode,restoration,requestedModel};
}

export function imageOperationProviderSupport(operation:ImageAdvancedOperation,structuralMode=false){
 if(structuralMode)return {ready:false as const,code:'STRUCTURAL_OUTPUT_REQUIRED',reason:'Structural UI Mode не должен превращать интерфейс/таблицу в растр. Используйте структурный Web Studio pipeline.'};
 if(PROVIDER_NATIVE.has(operation))return {ready:true as const,code:'READY'};
 return {ready:false as const,code:'MASK_PROVIDER_REQUIRED',reason:'Операция подготовлена, но требует подтверждённой mask-capable image model. Обычный edit prompt намеренно не используется как подмена.'};
}

export function advancedPromptDirectives(input:ImageAdvancedControls){
 const out:string[]=[];
 if(input.styleLock)out.push('Preserve the established project visual language, palette, lighting logic, material treatment and composition grammar.');
 if(input.identityConsistency)out.push('Preserve the identity of the referenced character or product; do not change defining geometry, proportions, marks or distinctive visual attributes.');
 if(input.brandConstraints.length)out.push(`Brand constraints: ${input.brandConstraints.join('; ')}`);
 if(input.restoration)out.push('Perform restoration as part of the upscale: reduce compression artifacts and noise while preserving real edges and avoiding invented text or details.');
 return out;
}

