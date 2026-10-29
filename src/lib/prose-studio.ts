import {AccessError} from './accounts';
import {extractText} from './model-router';
import {isNeuronPaidModel} from './neuron-paid';
import {composeProse,PROSE_LIMIT,PROSE_MODES,PROSE_TONES,type ProseDraft,type ProseSection} from './prose-compose';
import type {Env} from '../types';

export {PROSE_MODES,PROSE_TONES};
export const PROSE_MODEL='@cf/openai/gpt-oss-20b';
export type {ProseDraft,ProseMode,ProseSection,ProseTone} from './prose-compose';

const asString=(value:unknown)=>typeof value==='string'?value.trim():'';
function oneOf<T extends readonly string[]>(value:unknown,allowed:T,label:string):T[number]{
 const text=asString(value);
 if(!allowed.includes(text))throw new AccessError(`Некорректное значение: ${label}.`,400);
 return text as T[number];
}
export function parseProseRequest(body:Record<string,unknown>){
 const prompt=asString(body.prompt);
 if(!prompt||prompt.length>PROSE_LIMIT)throw new AccessError('Запрос для Prose Studio: 1–8000 символов.',400);
 const mode=oneOf(body.mode,PROSE_MODES,'режим');
 const tone=body.tone==null||body.tone===''?'plain':oneOf(body.tone,PROSE_TONES,'тон');
 return {prompt,mode,tone};
}
function sectionsOf(value:unknown):ProseSection[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,24).map(item=>{if(!item||typeof item!=='object')return null;const row=item as Record<string,unknown>,name=asString(row.name).slice(0,80),line=asString(row.line).slice(0,8000);return name&&line?{name,line}:null;}).filter((item):item is ProseSection=>!!item);
}
export function proseVariantsFromModel(text:string):ProseDraft[]{
 let parsed:unknown;
 const fenced=text.replace(/```(?:json)?/gi,'').trim();
 try{parsed=JSON.parse(fenced.match(/\{[\s\S]*\}/)?.[0]??fenced);}catch{throw new AccessError('Модель вернула не текст вариантов.',502);}
 const rows=parsed&&typeof parsed==='object'&&Array.isArray((parsed as {variants?:unknown}).variants)?(parsed as {variants:unknown[]}).variants:[];
 if(rows.length!==3)throw new AccessError('Модель вернула не три варианта.',502);
 return rows.map((item,index)=>{if(!item||typeof item!=='object')throw new AccessError('Вариант модели пустой.',502);const row=item as Record<string,unknown>,body=asString(row.text).slice(0,8000);if(!body)throw new AccessError('Вариант модели пустой.',502);return {title:asString(row.title).slice(0,80)||`Вариант ${index+1}`,text:body,sections:sectionsOf(row.sections)};});
}
export async function buildProse(env:Env,input:ReturnType<typeof parseProseRequest>,onDispatch?:()=>void){
 if(isNeuronPaidModel(PROSE_MODEL))throw new AccessError('Платная модель для текста не вызывается.',403);
 if(input.mode==='keep')return {model:null,source:'kept' as const,variants:composeProse(input.prompt,'keep','plain')};
 const system='Верни только JSON {"variants":[{"title":"","text":"","sections":[{"name":"","line":""}]}]}. Три оригинальных варианта. Не копируй чужие песни, цитаты и слоганы. Без пафоса и без киберпанка. Язык запроса сохрани. Для directions сохрани названия секций из запроса. Ремарки в скобках оставь ремарками. Не добавляй мрачных прилагательных. Дроп, если он есть, в одном варианте оставь одной короткой фразой. Для short, picture и reel sections оставь пустым массивом.';
 const user=`Режим: ${input.mode}. Тон: ${input.tone}. Тон darker убирает восклицания и усилители, не дописывает мрак. Тон stricter убирает воду. Тон quieter короче. Запрос: ${input.prompt}`;
 onDispatch?.();
 const output=await (env.AI as unknown as {run:(model:string,body:unknown)=>Promise<unknown>}).run(PROSE_MODEL,{messages:[{role:'system',content:system},{role:'user',content:user}],max_tokens:input.mode==='directions'?1800:900,temperature:.4});
 return {model:PROSE_MODEL,source:'model' as const,variants:proseVariantsFromModel(extractText(output))};
}
