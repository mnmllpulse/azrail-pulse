import {AccessError} from './accounts';
import {extractText} from './model-router';
import type {Env} from '../types';

export const VIDEO_ASPECTS=['16:9','9:16','1:1'] as const;
export const VIDEO_RESOLUTIONS=['720p','1080p','2160p'] as const;
export const VIDEO_DURATIONS=[4,8,12] as const;
export const VIDEO_FPS=[24,30] as const;
export const VIDEO_TRANSITIONS=['cut','fade','slide','wipe','dissolve'] as const;
export const VIDEO_MOTIONS=['static','zoom','pan','tilt','dolly','orbit','pulse'] as const;
export const VIDEO_EXPORT_PRESETS=['web','social','presentation'] as const;
export type VideoAspect=typeof VIDEO_ASPECTS[number];
export type VideoResolution=typeof VIDEO_RESOLUTIONS[number];
export type VideoTransition=typeof VIDEO_TRANSITIONS[number];
export type VideoMotion=typeof VIDEO_MOTIONS[number];
export type VideoExportPreset=typeof VIDEO_EXPORT_PRESETS[number];
export type VideoScene={id:string;text:string;transition:VideoTransition;motion:VideoMotion;imageArtifactId?:string|null};
export type VideoSessionInput={projectId:string;prompt:string;aspectRatio:VideoAspect;resolution:VideoResolution;durationSeconds:number;fps:number;transition:VideoTransition;motionPreset:VideoMotion;exportPreset:VideoExportPreset;scenes:VideoScene[];videoArtifactId:string;hasAudio:boolean;imageCount:number};

const asString=(v:unknown)=>typeof v==='string'?v.trim():'';
function oneOf<T extends readonly string[]>(value:unknown,allowed:T,label:string):T[number]{const v=asString(value);if(!(allowed as readonly string[]).includes(v))throw new AccessError(`Некорректное значение ${label}.`,400);return v as T[number];}
function intOneOf(value:unknown,allowed:readonly number[],label:string){const n=Number(value);if(!Number.isInteger(n)||!allowed.includes(n))throw new AccessError(`Некорректное значение ${label}.`,400);return n;}
function parseScenes(value:unknown,defaultTransition:VideoTransition,defaultMotion:VideoMotion):VideoScene[]{
 if(!Array.isArray(value)||value.length<1||value.length>8)throw new AccessError('Video timeline должен содержать 1–8 сцен.',400);
 return value.map((raw,index)=>{if(!raw||typeof raw!=='object')throw new AccessError('Некорректная сцена.',400);const row=raw as Record<string,unknown>,text=asString(row.text);if(!text||text.length>180)throw new AccessError('Текст сцены должен быть 1–180 символов.',400);const imageArtifactId=asString(row.imageArtifactId)||null;if(imageArtifactId&&!/^[a-f0-9-]{36}$/i.test(imageArtifactId))throw new AccessError('Некорректный image artifact.',400);return {id:asString(row.id).slice(0,80)||`scene-${index+1}`,text,transition:row.transition?oneOf(row.transition,VIDEO_TRANSITIONS,'transition'):defaultTransition,motion:row.motion?oneOf(row.motion,VIDEO_MOTIONS,'motion preset'):defaultMotion,imageArtifactId};});
}
export function parseVideoSessionRequest(body:Record<string,unknown>):VideoSessionInput{
 const projectId=asString(body.projectId),prompt=asString(body.prompt);if(prompt.length>4000)throw new AccessError('Prompt слишком длинный.',400);
 const aspectRatio=oneOf(body.aspectRatio,VIDEO_ASPECTS,'aspect ratio'),resolution=oneOf(body.resolution,VIDEO_RESOLUTIONS,'resolution');
 const durationSeconds=intOneOf(body.durationSeconds,VIDEO_DURATIONS,'duration'),fps=intOneOf(body.fps,VIDEO_FPS,'FPS');
 const transition=oneOf(body.transition,VIDEO_TRANSITIONS,'transition'),motionPreset=oneOf(body.motionPreset,VIDEO_MOTIONS,'motion preset'),exportPreset=oneOf(body.exportPreset,VIDEO_EXPORT_PRESETS,'export preset');
 const videoArtifactId=asString(body.videoArtifactId);if(!/^[a-f0-9-]{36}$/i.test(videoArtifactId))throw new AccessError('Нужен video artifact.',400);
 const imageCount=Number(body.imageCount??0);if(!Number.isInteger(imageCount)||imageCount<0||imageCount>8)throw new AccessError('Некорректное число изображений.',400);
 return {projectId,prompt,aspectRatio,resolution,durationSeconds,fps,transition,motionPreset,exportPreset,scenes:parseScenes(body.scenes,transition,motionPreset),videoArtifactId,hasAudio:body.hasAudio===true,imageCount};
}

export function parseVideoPlanRequest(body:Record<string,unknown>){
 const prompt=asString(body.prompt);if(!prompt||prompt.length>2000)throw new AccessError('Prompt для Scene Builder должен быть 1–2000 символов.',400);
 const sceneCount=Number(body.sceneCount);if(!Number.isInteger(sceneCount)||sceneCount<1||sceneCount>8)throw new AccessError('Scene Builder поддерживает 1–8 сцен.',400);
 const transition=oneOf(body.transition,VIDEO_TRANSITIONS,'transition'),motion=oneOf(body.motion,VIDEO_MOTIONS,'motion preset');
 return {prompt,sceneCount,transition,motion};
}

function fallbackText(prompt:string,count:number){
 const cleaned=prompt.replace(/\s+/g,' ').trim();const pieces=cleaned.split(/[.!?;]+/).map(x=>x.trim()).filter(Boolean);
 return Array.from({length:count},(_,i)=>pieces[i%Math.max(1,pieces.length)]||cleaned||`Scene ${i+1}`);
}
function normalizePlanJson(text:string,count:number,transition:VideoTransition,motion:VideoMotion,prompt:string):VideoScene[]{
 let parsed:unknown;try{const match=text.match(/\[[\s\S]*\]/);parsed=JSON.parse(match?.[0]??text);}catch{return fallbackText(prompt,count).map((t,i)=>({id:`scene-${i+1}`,text:t.slice(0,180),transition,motion}));}
 if(!Array.isArray(parsed))return fallbackText(prompt,count).map((t,i)=>({id:`scene-${i+1}`,text:t.slice(0,180),transition,motion}));
 const scenes:VideoScene[]=[];for(let i=0;i<count;i++){const raw=parsed[i] as Record<string,unknown>|undefined,text=asString(raw?.text)||fallbackText(prompt,count)[i];scenes.push({id:`scene-${i+1}`,text:text.slice(0,180),transition,motion});}return scenes;
}
export async function buildVideoScenePlan(env:Env,input:ReturnType<typeof parseVideoPlanRequest>,onDispatch?:()=>void){
 const model='@cf/openai/gpt-oss-20b';const system='Return ONLY a JSON array. You are a concise video scene planner. Each array item must be {"text":"short on-screen scene text"}. No markdown. Preserve the user intent. Avoid camera jargon unless the prompt asks for it.';
 const user=`Create exactly ${input.sceneCount} scenes for this brief. Each text <= 140 characters. Brief: ${input.prompt}`;
 onDispatch?.();const output=await (env.AI as unknown as {run:(model:string,input:unknown)=>Promise<unknown>}).run(model,{messages:[{role:'system',content:system},{role:'user',content:user}],max_tokens:650,temperature:.4});
 const text=extractText(output);return {model,scenes:normalizePlanJson(text,input.sceneCount,input.transition,input.motion,input.prompt)};
}
