import { oneOf as guardOneOf } from './input-guards';
import {AccessError} from './accounts';

export const VIDEO2_CAMERA_MOVES=['static','pan','tilt','dolly-in','dolly-out','zoom-in','zoom-out','orbit'] as const;
export const VIDEO2_TRANSITIONS=['cut','fade','slide','wipe','dissolve'] as const;
export const VIDEO2_MODELS=['auto','local-canvas'] as const;
export const VIDEO2_EXPORT_PROFILES=['web-16:9','social-9:16','social-1:1','presentation-16:9','master-4k'] as const;
export type Video2CameraMove=typeof VIDEO2_CAMERA_MOVES[number];
export type Video2Transition=typeof VIDEO2_TRANSITIONS[number];
export type Video2Model=typeof VIDEO2_MODELS[number];
export type Video2ExportProfile=typeof VIDEO2_EXPORT_PROFILES[number];

export type Video2Keyframe={zoom:number;x:number;y:number;rotation:number};
export type Video2Shot={
 id:string;
 title:string;
 prompt:string;
 caption:string;
 model:Video2Model;
 camera:Video2CameraMove;
 transition:Video2Transition;
 transitionDuration:number;
 start:Video2Keyframe;
 end:Video2Keyframe;
};
export type Video2Continuity={character:string;clothing:string;lighting:string;location:string;camera:string;props:string;colorPalette:string};
export type Video2Grading={brightness:number;contrast:number;saturation:number;hue:number};
export type Video2StoryboardInput={
 projectId:string;
 title:string;
 prompt:string;
 aspectRatio:'16:9'|'9:16'|'1:1';
 resolution:'720p'|'1080p'|'2160p';
 exportProfile:Video2ExportProfile;
 shots:Video2Shot[];
 continuity:Video2Continuity;
 referenceCount:number;
 tracks:{voiceOver:boolean;music:boolean;sfx:boolean};
 captions:{enabled:boolean;source:'scene-script'};
 grading:Video2Grading;
};

const str=(value:unknown,max:number,label:string)=>{const result=typeof value==='string'?value.trim():'';if(result.length>max)throw new AccessError(`${label} слишком длинный.`,400);return result;};
const num=(value:unknown,min:number,max:number,label:string)=>{const result=Number(value);if(!Number.isFinite(result)||result<min||result>max)throw new AccessError(`Некорректное значение ${label}.`,400);return result;};
const oneOf=<T extends readonly string[]>(value:unknown,allowed:T,label:string):T[number]=>guardOneOf(value,allowed,`Некорректное значение ${label}.`,true);
function keyframe(value:unknown):Video2Keyframe{const row=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};return{zoom:num(row.zoom??1,.5,2,'zoom'),x:num(row.x??0,-1,1,'keyframe x'),y:num(row.y??0,-1,1,'keyframe y'),rotation:num(row.rotation??0,-45,45,'rotation')};}
function continuity(value:unknown):Video2Continuity{const row=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};return{character:str(row.character,300,'character'),clothing:str(row.clothing,300,'clothing'),lighting:str(row.lighting,300,'lighting'),location:str(row.location,300,'location'),camera:str(row.camera,300,'camera'),props:str(row.props,300,'props'),colorPalette:str(row.colorPalette,300,'color palette')};}
function grading(value:unknown):Video2Grading{const row=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};return{brightness:num(row.brightness??100,50,150,'brightness'),contrast:num(row.contrast??100,50,150,'contrast'),saturation:num(row.saturation??100,0,200,'saturation'),hue:num(row.hue??0,-180,180,'hue')};}
function shots(value:unknown):Video2Shot[]{
 if(!Array.isArray(value)||value.length<1||value.length>12)throw new AccessError('Storyboard должен содержать 1–12 shots.',400);
 return value.map((raw,index)=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AccessError('Некорректный shot.',400);
  const row=raw as Record<string,unknown>;
  return{
   id:str(row.id,80,'shot id')||`shot-${index+1}`,
   title:str(row.title,100,'shot title')||`Shot ${index+1}`,
   prompt:str(row.prompt,600,'shot prompt')||`Shot ${index+1}`,
   caption:str(row.caption,240,'caption'),
   model:oneOf(row.model??'auto',VIDEO2_MODELS,'shot model'),
   camera:oneOf(row.camera??'static',VIDEO2_CAMERA_MOVES,'camera movement'),
   transition:oneOf(row.transition??'cut',VIDEO2_TRANSITIONS,'transition'),
   transitionDuration:num(row.transitionDuration??.25,0,1.5,'transition duration'),
   start:keyframe(row.start),
   end:keyframe(row.end),
  };
 });
}
export function parseVideo2StoryboardRequest(body:Record<string,unknown>):Video2StoryboardInput{
 const projectId=str(body.projectId,80,'projectId');if(!projectId)throw new AccessError('Выберите Project.',400);
 const tracksRaw=body.tracks&&typeof body.tracks==='object'&&!Array.isArray(body.tracks)?body.tracks as Record<string,unknown>:{};
 const captionsRaw=body.captions&&typeof body.captions==='object'&&!Array.isArray(body.captions)?body.captions as Record<string,unknown>:{};
 const referenceCount=Number(body.referenceCount??0);if(!Number.isInteger(referenceCount)||referenceCount<0||referenceCount>4)throw new AccessError('Reference Video Board поддерживает 0–4 видео.',400);
 return{
  projectId,
  title:str(body.title,120,'title')||'Untitled Video',
  prompt:str(body.prompt,4000,'prompt'),
  aspectRatio:oneOf(body.aspectRatio,['16:9','9:16','1:1'] as const,'aspect ratio'),
  resolution:oneOf(body.resolution,['720p','1080p','2160p'] as const,'resolution'),
  exportProfile:oneOf(body.exportProfile,VIDEO2_EXPORT_PROFILES,'export profile'),
  shots:shots(body.shots),
  continuity:continuity(body.continuity),
  referenceCount,
  tracks:{voiceOver:tracksRaw.voiceOver===true,music:tracksRaw.music===true,sfx:tracksRaw.sfx===true},
  captions:{enabled:captionsRaw.enabled!==false,source:'scene-script'},
  grading:grading(body.grading),
 };
}
