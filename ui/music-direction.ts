import type {FileTone} from './file-tone';
import type {StudioModuleContext} from './studio-types';
import {spokenFrom,spokenFromRecording,vocalLine,vocalPhrases,type SpokenLine} from './dry-speech';
import {fillGrownSection,moveStoryBlock,placeStoryNotes,storyBlocks,storyWithIntro,tenMinuteStory,swapStoryBlocks,toggleStoryMute,type MusicInput,type MusicMood,type MusicNote,type MusicRenderOptions,type MusicScale,type RenderedSection,type StoryBlock} from './media';
import {concatSlices,formatBytes,lengthenSection,PROJECT_FILE_LIMIT,referenceGain,shelfFromAnalysis,SHELF_CAP,tenMinuteMemory,type ShelfPiece} from './music-pro';
import {formatMaster,type StudioReading} from './studio-master';
import type {AudioMeasurements} from './audio-analysis';
import type {MusicTrackDetailed} from './music-intelligence-runtime';
import {camelotFor} from '../src/lib/music-intelligence';
import {remixBrief,type RemixBriefInput} from './music-brief';
import {mountListenPlayer} from './music-player';
import {PROSE_HANDOFF_KEY,readProseHandoff} from '../src/lib/prose-compose';
import {uploadStudioArtifact} from './studio-modules/shared';

const STORAGE_KEY='pulse.music.direction.v1';
const REMIX_KEY='pulse.music.remix.v1';
let stopListen:(()=>void)|null=null;
const PHRASE_KEY='pulse.music.phrase.v1';
const directionFlags={hookLift:false,professional:false,wish:'',roles:[] as string[]};
let fileTone:FileTone|null=null;
export function setDirectionFlags(next:{hookLift?:boolean;professional?:boolean;wish?:string;roles?:string[]}){if(next.hookLift!=null)directionFlags.hookLift=next.hookLift;if(next.professional!=null)directionFlags.professional=next.professional;if(next.wish!=null)directionFlags.wish=next.wish;if(next.roles)directionFlags.roles=next.roles.slice(0,8);}
const ROOTS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
const SECTION_RU:Record<string,string>={intro:'Вступление',groove:'Грув',build:'Развитие',breakdown:'Спад','pre-drop':'Перед дропом',drop:'Дроп',bridge:'Переход',outro:'Завершение',custom:'Фрагмент'};
type DirectionId='house'|'techno';
type SketchId='soft'|'dark'|'energy';
export type DirectionPrefs={
 bpm:number|null;keyRoot:string;scale:MusicScale;direction:DirectionId;mood:MusicMood;
 likes:{rhythm:boolean;bass:boolean;atmosphere:boolean;energy:boolean};
 fragment:{start:number;end:number}|null;fileName:string;
};
export type SketchPlan={id:SketchId;title:string;blurb:string;input:MusicInput};
type SavedDirection={
 version:1;fileName:string;bpm:number|null;keyRoot:string;scale:MusicScale;bpmConfidence:number|null;keyConfidence:number|null;
 bass:string;brightness:string;dynamics:string;sections:Array<{label:string;start:number;end:number}>;
 likes:DirectionPrefs['likes'];direction:DirectionId;mood:MusicMood;fragmentStart:string;fragmentEnd:string;savedAt:number;
};
type SketchAudio={wav:Blob;midi:Blob;seconds:number;sessionBpm:number;sessionKey:string;sessionScale:string;bars:number;parts:string[];notes:MusicNote[];rms:number;master:StudioReading;sections?:RenderedSection[]};
type SketchVersion={n:number;url:string;rms:number;wav:Blob};
const versions=new Map<SketchId,SketchVersion[]>();
type MusicPart=MusicNote['part'];
const PART_NAMES:Record<MusicPart,string>={bass:'бас',lead:'мелодия',pad:'аккорды',arp:'арпеджио'};
const PIN_LABELS:Record<MusicPart,string>={bass:'бас',lead:'мелодию',pad:'аккорды',arp:'арпеджио'};
const pins=new Map<SketchId,Set<MusicPart>>();

let analysisAbort:AbortController|null=null;
let renderAbort:AbortController|null=null;
let referenceUrl:string|null=null;
let referenceLufs:number|null=null;
let phraseRecording:SpokenLine|null=null;
const sketchUrls=new Map<string,string>();
const shelfAudio=new Map<string,string>();

function storage(){try{return window.localStorage;}catch{return null;}}
function deviceMemory(){const value=(navigator as Navigator&{deviceMemory?:number}).deviceMemory;return typeof value==='number'?value:undefined;}
class RenderReplaced extends Error{}
function beginRender(){renderAbort?.abort();renderAbort=new AbortController();const stop=document.querySelector<HTMLButtonElement>('#music-direction-stop');if(stop)stop.hidden=false;return renderAbort.signal;}
function endRender(signal?:AbortSignal){if(signal&&renderAbort?.signal!==signal)return;const stop=document.querySelector<HTMLButtonElement>('#music-direction-stop');if(stop)stop.hidden=true;}
function renderStopped(error:unknown,signal?:AbortSignal):Error|null{if(error instanceof RenderReplaced)return null;if(signal?.aborted&&renderAbort?.signal!==signal)return null;if(signal?.aborted)return Error('Сборка остановлена.');return error instanceof Error?error:Error(String(error));}
function currentPhrase(){return vocalLine(storage()?.getItem(PHRASE_KEY)??'')??vocalLine(readProseHandoff(storage()?.getItem(PROSE_HANDOFF_KEY)??null)?.text??'');}
function phraseSpeech(plan:SketchPlan):SpokenLine|null{if(plan.input.arrangement!=='section-story')return null;if(phraseRecording)return phraseRecording;const lines=vocalPhrases(storage()?.getItem(PHRASE_KEY)||readProseHandoff(storage()?.getItem(PROSE_HANDOFF_KEY)??null)?.text||'');const spoken=lines[0]?spokenFrom(lines[0]):null;if(!spoken)return null;const reply=lines[1]?spokenFrom(lines[1]):null;return {...spoken,phrase:`${spoken.phrase} · сухое произнесение`,reply:reply?{...reply,phrase:reply.phrase}:null};}
function pct(value:number|null){return value==null?'уверенность не посчитана':`уверенность ${Math.round(value*100)}%`;}
function bassText(measurements:AudioMeasurements){
 const sub=measurements.bands.find(band=>band.label==='SUB')?.energyPercent??null;
 const low=measurements.bands.find(band=>band.label==='LOW')?.energyPercent??null;
 if(sub==null&&low==null)return '—';
 return `${((sub??0)+(low??0)).toFixed(0)}% энергии низа`;
}
function brightnessText(hz:number|null){
 if(hz==null)return '—';
 const tone=hz<1800?'темнее':hz<3500?'средняя':'ярче';
 return `${tone}, ${Math.round(hz)} Гц`;
}
function dynamicsText(measurements:AudioMeasurements){
 if(measurements.loudnessRangeLu!=null)return `${measurements.loudnessRangeLu.toFixed(1)} LU диапазон`;
 if(measurements.crestDb!=null)return `${measurements.crestDb.toFixed(1)} дБ крест`;
 return '—';
}
function parseDetectedKey(label:string|null){
 const match=/^([A-G](?:#|b)?)\s+(major|minor)$/i.exec(label?.trim()??'');
 if(!match)return null;
 const root=match[1].replace('b','#');
 if(!ROOTS.includes(root as typeof ROOTS[number]))return null;
 return {root,scale:match[2].toLowerCase() as MusicScale};
}
function camelotLabel(label:string|null){
 const parsed=parseDetectedKey(label);
 if(!parsed||(parsed.scale!=='major'&&parsed.scale!=='minor'))return null;
 return camelotFor(parsed.root,parsed.scale);
}
function readPack(root:HTMLElement){
 const text=(id:string)=>root.ownerDocument.getElementById(id)?.textContent?.replace(/\s+/g,' ').trim()??'';
 const bpmText=text('als-bpm');
 const key=text('als-key');
 const name=text('als-filename');
 const roles=text('als-roles').replace(/^Роли\s*/,'').slice(0,240);
 const form=text('als-locators').replace(/^Структура\s*/,'').slice(0,360);
 return {bpm:/^\d+(?:\.\d+)?$/.test(bpmText)?Number(bpmText):null,key:key&&key!=='—'&&key!=='Ошибка'?key:null,name:name&&name!=='—'?name:'',roles,form};
}
function rememberedBrief():RemixBriefInput|null{
 try{const parsed=JSON.parse(storage()?.getItem(REMIX_KEY)??'');if(!parsed||parsed.version!==1)return null;return parsed.input;}catch{return null;}
}
function rememberBrief(input:RemixBriefInput){storage()?.setItem(REMIX_KEY,JSON.stringify({version:1,input,savedAt:Date.now()}));}
function liveBrief(root:HTMLElement,detailed:MusicTrackDetailed|null,fileName:string){
 const pack=readPack(root);
 const audioForm=(detailed?.analysis.sections??[]).slice(0,8).map(section=>`${SECTION_RU[section.kind]??section.label} ${Math.round(section.startSeconds)}–${Math.round(section.endSeconds)}с`).join(', ');
 const current:RemixBriefInput={
  wish:directionFlags.wish.trim(),
  fileName:fileName||pack.name,
  bpm:fileName?detailed?.measurements.bpm??null:pack.bpm,
  keyLabel:fileName?detailed?.measurements.detectedKey??null:pack.key,
  camelot:fileName?(detailed?.analysis.camelot||camelotLabel(detailed?.measurements.detectedKey??null)):camelotLabel(pack.key),
  form:[audioForm,pack.form].filter(Boolean).join('. '),
  pack:[pack.name,pack.roles].filter(Boolean).join('. '),
  durationSeconds:detailed?.measurements.durationSeconds??null,
 };
 const past=rememberedBrief();
 const input=fileName||detailed||pack.name||!past?current:{...past,wish:current.wish||past.wish};
 rememberBrief(input);
 return remixBrief(input);
}
function factLine(root:HTMLElement,detailed:MusicTrackDetailed|null,fileName:string){
 const pack=readPack(root);
 const bpm=fileName?detailed?.measurements.bpm??null:pack.bpm;
 const key=fileName?detailed?.measurements.detectedKey??null:pack.key;
 const camelot=fileName?(detailed?.analysis.camelot||camelotLabel(key)):camelotLabel(key);
 const form=(detailed?.analysis.sections??[]).slice(0,6).map(section=>SECTION_RU[section.kind]??section.label).join(' · ')||pack.form;
 const name=fileName||pack.name||'Без файла';
 return [name,bpm==null?'Темп —':`${Math.round(bpm)} BPM`,key&&camelot?`${key} · ${camelot}`:key||'Тональность —',form].filter(Boolean).join(' · ');
}
function mixSeed(text:string,variant:number,salt:number){
 let hash=2166136261^salt;
 for(const char of text)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return ((hash+variant*997)>>>0)&0x7fffffff;
}
function likesPrompt(likes:DirectionPrefs['likes']){
 const parts:string[]=[];
 if(likes.rhythm)parts.push('новый грув в том же ритмическом направлении');
 if(likes.bass)parts.push('новая басовая партия похожей плотности');
 if(likes.atmosphere)parts.push('новая мелодия и атмосфера, без копии референса');
 if(likes.energy)parts.push('похожее развитие энергии');
 return parts.length?parts.join(', '):'новые партии в выбранном направлении';
}
export function sketchRequest(prefs:DirectionPrefs,id:SketchId,variant:number):SketchPlan{
 const genre='melodic-techno' as const;
 const plans:Record<SketchId,Omit<SketchPlan,'input'>&{mood:MusicMood;pattern:MusicInput['pattern'];arrangement:MusicInput['arrangement'];synth:MusicInput['synthPreset'];salt:number}>={
  soft:{id:'soft',title:'Мягче',blurb:'Один широкий пэд, без аккордовой стопки.',mood:'atmospheric',pattern:'chords',arrangement:'minimal-evolution',synth:'warm-pad',salt:11},
  dark:{id:'dark',title:'Темнее',blurb:'Глубокий бас, напряжённая мелодия.',mood:'dark',pattern:'bassline',arrangement:'minimal-evolution',synth:'sub',salt:29},
  energy:{id:'energy',title:'Энергичнее',blurb:'Плотные ударные, активное арпеджио.',mood:'driving',pattern:'arpeggio',arrangement:'intro-build-drop',synth:'dark-pulse',salt:47},
 };
 const plan=plans[id];
 const fragment=prefs.fragment?` Фрагмент настроения: ${prefs.fragment.start.toFixed(1)}–${prefs.fragment.end.toFixed(1)} с.`:'';
 const wish=directionFlags.wish.trim()?` Пожелание: ${directionFlags.wish.trim()} Мелодия новая.`:'';
 const prompt=`${prefs.direction==='house'?'Melodic House':'Melodic Techno'}. ${likesPrompt(prefs.likes)}. Настроение запроса: ${prefs.mood}.${fragment}${wish} Оригинальные партии, не копия мелодии.`;
 return {id:plan.id,title:plan.title,blurb:plan.blurb,input:{
  prompt,bpm:prefs.bpm,keyRoot:prefs.keyRoot||'auto',scale:prefs.scale,bars:16,timeSignature:'4/4',genre,mood:plan.mood,pattern:plan.pattern,arrangement:plan.arrangement,synthPreset:plan.synth,seed:mixSeed(`${prefs.fileName}:${id}`,variant,plan.salt),
 }};
}
export function sketchRequests(prefs:DirectionPrefs,variant=0){return (['soft','dark','energy'] as const).map(id=>sketchRequest(prefs,id,variant));}
export function developedRequest(plan:SketchPlan,bpm?:number|null):SketchPlan{
 const tempo=bpm??plan.input.bpm;
 if(tempo==null||!Number.isFinite(tempo))throw Error('Сначала нужен темп сессии.');
 const story=tenMinuteStory(tempo,plan.input.timeSignature),bars=story.reduce((sum,block)=>sum+block.bars,0);
 const lines=[`${plan.input.prompt} Структура: вступление, развитие, первый дроп, брейк, основной дроп, завершение.`];
 if(directionFlags.wish.trim())lines.push(`Пожелание: ${directionFlags.wish.trim()} Мелодия новая.`);
 if(directionFlags.professional)lines.push('Низ в моно, пик не выше -1.0 dBTP, хук меняется по секциям.');
 if(directionFlags.roles.length)lines.push(`Характер с полки: ${directionFlags.roles.join(', ')}.`);
 return {...plan,input:{...plan.input,bpm:tempo,bars,arrangement:'section-story',story,hookLift:directionFlags.hookLift||plan.input.hookLift,prompt:lines.join(' ')}};
}
export function partChangeText(keep:MusicPart[]){
 const all:MusicPart[]=['bass','lead','pad','arp'];
 const stay=all.filter(part=>keep.includes(part)).map(part=>PART_NAMES[part]);
 const change=all.filter(part=>!keep.includes(part)).map(part=>PART_NAMES[part]);
 return `Останется: ${stay.join(', ')||'—'}. Перепишу: ${change.join(', ')||'—'}. Ударные идут за структурой.`;
}
const ALL_PARTS:MusicPart[]=['bass','lead','pad','arp'];
const PART_WORDS:[MusicPart,RegExp][]=[['bass',/бас/],['lead',/мелод|лид|хук/],['pad',/аккорд|пэд/],['arp',/арпедж|арп/]];
const SECTION_WORDS:[string,RegExp][]=[['drop-1',/перв\w*\s+дроп/],['drop-2',/втор\w*\s+дроп|основн\w*\s+дроп/],['intro',/вступ/],['rise',/развит/],['break',/брейк/],['outro',/заверш|аутро/]];
const TAIL_BARS=[4,8,16,32];
export type SectionMove={id:string;direction:-1|1};
export type MusicCommand={keep:MusicPart[];rewrite:MusicPart[];mood?:MusicMood;synth?:MusicInput['synthPreset'];introBars?:number;dropLevel?:number;lastBars?:number;sectionMute?:string;sectionMove?:SectionMove;sectionSwap?:[string,string];lengthen?:string;phrase?:string;summary:string};
function mentionedSections(clause:string){const found:string[]=[];for(const [id,pattern] of SECTION_WORDS)if(pattern.test(clause)&&!found.includes(id))found.push(id);return found;}
function sectionLabel(id:string){return storyBlocks().find(block=>block.id===id)?.label??id;}
export function interpretMusicCommand(raw:string):MusicCommand{
 const phraseMatch=/^фраза\s*:\s*(.+)$/i.exec(raw.trim());
 if(phraseMatch){const phrase=vocalLine(phraseMatch[1]??'');if(!phrase)throw Error('Фраза: от 4 до 8 слов.');return {keep:[],rewrite:[],phrase,summary:`Фраза заменена: ${phrase}. Музыка остаётся.`};}
 const text=raw.trim().toLowerCase().replace(/ё/g,'е');
 if(!text)throw Error('Напиши, что изменить.');
 const clauses=text.split(/,| и | но /).map(clause=>clause.trim()).filter(Boolean);
 const keep:MusicPart[]=[],rewrite:MusicPart[]=[];
 let mood:MusicMood|undefined,synth:MusicInput['synthPreset']|undefined,introBars:number|undefined,dropLevel:number|undefined,lastBars:number|undefined,holdGain=false,sectionMute:string|undefined,sectionMove:SectionMove|undefined,sectionSwap:[string,string]|undefined,lengthen:string|undefined;
 const swapped=mentionedSections(text);
 if(/поменяй|местами/.test(text)&&swapped.length===2)sectionSwap=[swapped[0],swapped[1]];
 for(const clause of clauses){
  const sections=mentionedSections(clause),hasPart=PART_WORDS.some(([,pattern])=>pattern.test(clause));
  if(/без/.test(clause)&&/громк/.test(clause)||/не\s+громче/.test(clause))holdGain=true;
  if(/сократ|короче|ужми/.test(clause)&&/вступ/.test(clause))introBars=4;
  if(/длинн|растяни/.test(clause)&&/вступ/.test(clause))introBars=12;
  if(/длинн|растяни/.test(clause)&&/дроп/.test(clause)&&!/вступ/.test(clause))lengthen=/перв/.test(clause)?'drop-1':'drop-2';
  if(/последн|хвост|конец/.test(clause)){
   const count=clause.match(/(\d+)/);
   if(count){const bars=Number(count[1]);if(!TAIL_BARS.includes(bars))throw Error('Хвост могу переписать на 4, 8, 16 или 32 такта.');lastBars=bars;}
   else lastBars=16;
  }
  if(/дроп/.test(clause)&&/мощ|плотн|тяжел|гущ/.test(clause)&&!/заглуш|глуши|выключи/.test(clause))dropLevel=1.25;
  if(/дроп/.test(clause)&&/тише|легче|мягч/.test(clause)&&!/заглуш|глуши|выключи/.test(clause))dropLevel=.75;
  if(/воздух|стекл/.test(clause)){synth='glass';if(!rewrite.includes('pad'))rewrite.push('pad');}
  if(/тепл/.test(clause)){synth='warm-pad';if(!hasPart&&!rewrite.includes('pad'))rewrite.push('pad');}
  if(/кислот/.test(clause)){synth='acid';if(!hasPart&&!rewrite.includes('lead'))rewrite.push('lead');}
  if(/суб/.test(clause)){synth='sub';if(!hasPart&&!rewrite.includes('bass'))rewrite.push('bass');}
  if(/пульс/.test(clause))synth='dark-pulse';
  for(const [part,pattern] of PART_WORDS){
   if(!pattern.test(clause))continue;
   if(/остав|закреп|не трогай/.test(clause)){if(!keep.includes(part))keep.push(part);}
   if(/переделай|перепиш|замени|обнов|нов|другой|другим|груст|темн|мрачн|светл|ярк|радост|тепл|кислот/.test(clause)){if(!rewrite.includes(part))rewrite.push(part);}
  }
  if(/груст|темн|мрачн/.test(clause))mood='dark';
  else if(/светл|ярк|радост/.test(clause))mood='euphoric';
  else if(/спокой|мягк/.test(clause)&&!/дроп/.test(clause))mood='atmospheric';
  else if(/энерг|драйв/.test(clause))mood='driving';
  if(mood&&!hasPart&&!rewrite.includes('lead'))rewrite.push('lead');
  if(mood&&hasPart&&!/остав|закреп|не трогай/.test(clause))for(const [part,pattern] of PART_WORDS)if(pattern.test(clause)&&!rewrite.includes(part))rewrite.push(part);
  if(!sectionSwap&&/заглуш|глуши|выключи/.test(clause)&&sections.length===1)sectionMute=sections[0];
  if(!sectionSwap&&!hasPart&&sections.length===1&&/ниже|вниз/.test(clause))sectionMove={id:sections[0],direction:1};
  if(!sectionSwap&&!hasPart&&sections.length===1&&/выше|наверх/.test(clause))sectionMove={id:sections[0],direction:-1};
 }
 for(const part of rewrite){const at=keep.indexOf(part);if(at>=0)keep.splice(at,1);}
 const structural=sectionMute||sectionMove||sectionSwap||lengthen;
 if(!lastBars)for(const part of ALL_PARTS)if(!rewrite.includes(part)&&!keep.includes(part)&&(rewrite.length||keep.length||synth||introBars!=null||dropLevel!=null||structural))keep.push(part);
 if(!rewrite.length&&!keep.length&&introBars==null&&dropLevel==null&&lastBars==null&&!synth&&!structural)throw Error('Не понял команду. Например: «Бас оставь, мелодию сделай грустнее» или «Заглуши брейк».');
 const named=(parts:MusicPart[])=>parts.map(part=>PART_NAMES[part]).join(', ')||'—';
 const bits:string[]=[];
 if(sectionSwap)bits.push(`${sectionLabel(sectionSwap[0])} и ${sectionLabel(sectionSwap[1])} меняются местами.`);
 const neuter=(id:string)=>/вступ|развит|заверш/.test(sectionLabel(id).toLowerCase());
 if(sectionMute)bits.push(`${sectionLabel(sectionMute)} ${neuter(sectionMute)?'заглушено':'заглушен'}. Остальные секции остаются.`);
 if(sectionMove)bits.push(`${sectionLabel(sectionMove.id)} ${neuter(sectionMove.id)?'сдвинуто':'сдвинут'} ${sectionMove.direction>0?'ниже':'выше'}.`);
 if(lengthen)bits.push(`${sectionLabel(lengthen)} длиннее за счёт соседа. Общая длина остаётся.`);
 if(lastBars)bits.push(`Перепишу только последние ${lastBars} тактов. Всё до них останется.`);
 else if(rewrite.length)bits.push(partChangeText(keep));
 else if(!structural)bits.push(`Партии остаются: ${named(keep.length?keep:ALL_PARTS)}.`);
 if(introBars===4)bits.push('Вступление короче: 4 такта, общая длина не растёт.');
 if(introBars===12)bits.push('Вступление длиннее: 12 тактов, общая длина не растёт.');
 if(dropLevel!=null&&dropLevel>1)bits.push(holdGain?'Основной дроп плотнее. Громкость микса не поднимается.':'Основной дроп плотнее.');
 if(dropLevel!=null&&dropLevel<1)bits.push('Основной дроп легче: ударные реже. Громкость микса не поднимается.');
 if(synth==='glass')bits.push('Больше воздуха в аккордах.');
 if(synth==='warm-pad')bits.push('Аккорды теплее.');
 if(synth==='acid')bits.push('Звук кислотный.');
 if(synth==='sub')bits.push('Бас уходит в суб.');
 if(synth==='dark-pulse')bits.push('Пульс жёстче.');
 if(mood==='dark')bits.push('Мелодия темнее.');
 if(mood==='euphoric')bits.push('Мелодия светлее.');
 if(mood==='atmospheric')bits.push('Мелодия спокойнее.');
 if(mood==='driving')bits.push('Мелодия жёстче по движению.');
 return {keep:lastBars?[]:keep,rewrite,mood,synth,introBars,dropLevel,lastBars,sectionMute,sectionMove,sectionSwap,lengthen,summary:bits.join(' ')};
}

function field(doc:Document,label:string,control:HTMLElement){const wrap=doc.createElement('label');const name=doc.createElement('span');name.className='lbl';name.textContent=label;wrap.append(name,control);return wrap;}
function paintWave(canvas:HTMLCanvasElement,data:Array<{min:number;max:number}>,fragment:{start:number;end:number}|null,duration:number){
 const dpr=Math.max(1,Math.min(2,canvas.ownerDocument.defaultView?.devicePixelRatio||1));
 const width=Math.max(280,canvas.clientWidth||640),height=88;
 canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);canvas.style.width='100%';canvas.style.height='88px';
 const ctx=canvas.getContext('2d');if(!ctx||!data.length)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#111';ctx.fillRect(0,0,width,height);
 if(fragment&&duration>0){const x1=Math.max(0,fragment.start/duration*width),x2=Math.min(width,fragment.end/duration*width);ctx.fillStyle='rgba(255,118,77,.28)';ctx.fillRect(Math.min(x1,x2),0,Math.max(2,Math.abs(x2-x1)),height);}
 ctx.strokeStyle='#c4abff';ctx.lineWidth=1;ctx.beginPath();
 data.forEach((point,index)=>{const x=data.length<2?0:index*width/(data.length-1);ctx.moveTo(x,(1-point.max)*height/2);ctx.lineTo(x,(1-point.min)*height/2);});
 ctx.stroke();
}
function readPrefs(root:ParentNode,fileName:string):DirectionPrefs{
 const bpmRaw=root.querySelector<HTMLInputElement>('#music-direction-bpm')?.value.trim()??'';
 const bpm=bpmRaw?Number(bpmRaw):null;
 if(bpmRaw&&(!Number.isFinite(bpm)||bpm!<60||bpm!>180))throw Error('BPM для идей: 60–180 или оставьте поле пустым.');
 const keyRoot=root.querySelector<HTMLSelectElement>('#music-direction-key')?.value??'';
 const scale=(root.querySelector<HTMLSelectElement>('#music-direction-scale')?.value||'minor') as MusicScale;
 const direction=(root.querySelector<HTMLSelectElement>('#music-direction-style')?.value==='techno'?'techno':'house') as DirectionId;
 const mood=(root.querySelector<HTMLSelectElement>('#music-direction-mood')?.value||'hypnotic') as MusicMood;
 const likes={
  rhythm:!!root.querySelector<HTMLInputElement>('#music-like-rhythm')?.checked,
  bass:!!root.querySelector<HTMLInputElement>('#music-like-bass')?.checked,
  atmosphere:!!root.querySelector<HTMLInputElement>('#music-like-atmosphere')?.checked,
  energy:!!root.querySelector<HTMLInputElement>('#music-like-energy')?.checked,
 };
 const startRaw=root.querySelector<HTMLInputElement>('#music-direction-from')?.value.trim()??'';
 const endRaw=root.querySelector<HTMLInputElement>('#music-direction-to')?.value.trim()??'';
 let fragment:DirectionPrefs['fragment']=null;
 if(startRaw||endRaw){
  const start=Number(startRaw),end=Number(endRaw);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Фрагмент: укажите начало и конец в секундах, конец позже начала.');
  fragment={start,end};
 }
 return {bpm,keyRoot,scale,direction,mood,likes,fragment,fileName};
}
function remember(root:ParentNode,saved:SavedDirection){storage()?.setItem(STORAGE_KEY,JSON.stringify(saved));root.querySelector<HTMLElement>('#music-direction-saved')?.replaceChildren(document.createTextNode(`Сохранено в браузере · ${new Date(saved.savedAt).toLocaleString()}`));}
function readSaved():SavedDirection|null{
 const raw=storage()?.getItem(STORAGE_KEY);if(!raw)return null;
 try{const parsed=JSON.parse(raw) as SavedDirection;if(parsed.version!==1)return null;return parsed;}catch{return null;}
}
function revokeReference(){if(referenceUrl){URL.revokeObjectURL(referenceUrl);referenceUrl=null;}}
function revokeSketch(id:string){const url=sketchUrls.get(id);if(url){URL.revokeObjectURL(url);sketchUrls.delete(id);}}
export function cleanupMusicDirection(){stopListen?.();stopListen=null;analysisAbort?.abort();analysisAbort=null;renderAbort?.abort();renderAbort=null;phraseRecording=null;referenceLufs=null;pins.clear();revokeReference();for(const id of [...sketchUrls.keys()])revokeSketch(id);for(const list of versions.values())for(const version of list)URL.revokeObjectURL(version.url);versions.clear();for(const url of new Set(shelfAudio.values()))URL.revokeObjectURL(url);shelfAudio.clear();}

function reportView(root:HTMLElement,doc:Document,fileName:string,measurements:AudioMeasurements|null,sections:SavedDirection['sections'],saved?:Partial<SavedDirection>){
 const host=root.querySelector<HTMLElement>('#music-direction-report');if(!host)return;
 host.hidden=false;host.replaceChildren();
 const title=doc.createElement('h3');title.textContent=measurements?'Разбор референса':'Сохранённый разбор';host.append(title);
 const file=doc.createElement('p');file.className='filename';file.textContent=fileName||'Файл не выбран';host.append(file);
 if(!measurements){const note=doc.createElement('p');note.className='muted';note.textContent='Файл в браузере не хранится. Перетащите его снова, чтобы услышать. Идеи можно собрать из сохранённых параметров.';host.append(note);}
 else{
  const audio=doc.createElement('audio');audio.id='music-direction-player';audio.controls=true;if(referenceUrl)audio.src=referenceUrl;host.append(audio);
  const canvas=doc.createElement('canvas');canvas.id='music-direction-wave';canvas.setAttribute('aria-label','Форма волны референса');host.append(canvas);
 }
 const grid=doc.createElement('div');grid.className='meta';
 const cell=(label:string,value:string,extra='')=>{const box=doc.createElement('div');const name=doc.createElement('div');name.className='lbl';name.textContent=label;const strong=doc.createElement('div');strong.className='val';strong.textContent=value;box.append(name,strong);if(extra){const small=doc.createElement('div');small.className='lbl';small.textContent=extra;box.append(small);}grid.append(box);};
 const detected=parseDetectedKey(measurements?.detectedKey??null)??(saved?.keyRoot?{root:saved.keyRoot,scale:saved.scale??'minor'}:null);
 cell('Темп',measurements?.bpm==null?(saved?.bpm==null?'—':String(saved.bpm)):measurements.bpm.toFixed(1),pct(measurements?.bpmConfidence??saved?.bpmConfidence??null));
 cell('Тональность',measurements?.detectedKey??(detected?`${detected.root} ${detected.scale}`:'—'),pct(measurements?.keyConfidence??saved?.keyConfidence??null));
 cell('Бас',measurements?bassText(measurements):saved?.bass??'—');
 cell('Яркость',measurements?brightnessText(measurements.spectralCentroidHz):saved?.brightness??'—');
 cell('Динамика',measurements?dynamicsText(measurements):saved?.dynamics??'—');
 host.append(grid);
 if(sections.length){const list=doc.createElement('div');list.className='music-segments';for(const section of sections){const row=doc.createElement('div');row.textContent=`${section.label} · ${section.start.toFixed(1)}–${section.end.toFixed(1)} с`;list.append(row);}host.append(list);}
 const fix=doc.createElement('div');fix.className='music-direction-fix';
 const bpm=doc.createElement('input');bpm.id='music-direction-bpm';bpm.type='number';bpm.min='60';bpm.max='180';bpm.placeholder='не найден';if(saved?.bpm!=null)bpm.value=String(saved.bpm);else if(measurements?.bpm!=null)bpm.value=String(Math.round(measurements.bpm));
 const key=doc.createElement('select');key.id='music-direction-key';const auto=doc.createElement('option');auto.value='';auto.textContent='как получится';key.append(auto);for(const root of ROOTS){const option=doc.createElement('option');option.value=root;option.textContent=root;key.append(option);}key.value=saved?.keyRoot||detected?.root||'';
 const scale=doc.createElement('select');scale.id='music-direction-scale';for(const [value,label] of [['minor','minor'],['major','major'],['dorian','dorian'],['phrygian','phrygian']] as const){const option=doc.createElement('option');option.value=value;option.textContent=label;scale.append(option);}scale.value=saved?.scale||detected?.scale||'minor';
 fix.append(field(doc,'Темп для идей',bpm),field(doc,'Тональность для идей',key),field(doc,'Лад для идей',scale));
 const from=doc.createElement('input');from.id='music-direction-from';from.type='number';from.min='0';from.step='0.1';from.placeholder='с';from.value=saved?.fragmentStart??'';
 const to=doc.createElement('input');to.id='music-direction-to';to.type='number';to.min='0';to.step='0.1';to.placeholder='по';to.value=saved?.fragmentEnd??'';
 fix.append(field(doc,'Фрагмент с, с',from),field(doc,'Фрагмент по, с',to));
 host.append(fix);
 const hint=doc.createElement('p');hint.className='muted';hint.textContent=measurements?.bpm==null&&measurements?.detectedKey==null?'Темп и тональность не определены. Можно вписать свои или оставить пустыми: студия подберёт их для новых партий и подпишет, что именно собрала.':'Приблизительные значения можно исправить. Референс задаёт направление, мелодию студия не копирует.';
 host.append(hint);
 if(measurements){
  const mark=doc.createElement('button');mark.type='button';mark.textContent='Мне нравится настроение именно здесь';
  mark.onclick=()=>{const player=root.querySelector<HTMLAudioElement>('#music-direction-player');const start=player?.currentTime??0;from.value=start.toFixed(1);to.value=Math.min(measurements.durationSeconds,start+8).toFixed(1);paintWave(root.querySelector('canvas')!,measurements.waveform,fragmentOf(from.value,to.value),measurements.durationSeconds);};
  from.oninput=()=>paintWave(root.querySelector('canvas')!,measurements.waveform,fragmentOf(from.value,to.value),measurements.durationSeconds);
  to.oninput=()=>paintWave(root.querySelector('canvas')!,measurements.waveform,fragmentOf(from.value,to.value),measurements.durationSeconds);
  host.append(mark);
  requestAnimationFrame(()=>paintWave(root.querySelector('canvas')!,measurements.waveform,fragmentOf(from.value,to.value),measurements.durationSeconds));
 }
}
function fragmentOf(startRaw:string,endRaw:string){const start=Number(startRaw),end=Number(endRaw);return Number.isFinite(start)&&Number.isFinite(end)&&end>start?{start,end}:null;}
function summaryFrom(root:ParentNode,detailed:MusicTrackDetailed|null,fileName:string):SavedDirection{
 const prefs=readPrefs(root,fileName);
 const measurements=detailed?.measurements??null;
 return {version:1,fileName,bpm:prefs.bpm,keyRoot:prefs.keyRoot,scale:prefs.scale,bpmConfidence:measurements?.bpmConfidence??null,keyConfidence:measurements?.keyConfidence??null,bass:measurements?bassText(measurements):'—',brightness:measurements?brightnessText(measurements.spectralCentroidHz):'—',dynamics:measurements?dynamicsText(measurements):'—',sections:(detailed?.analysis.sections??[]).map(section=>({label:SECTION_RU[section.kind]??section.label,start:section.startSeconds,end:section.endSeconds})),likes:prefs.likes,direction:prefs.direction,mood:prefs.mood,fragmentStart:root.querySelector<HTMLInputElement>('#music-direction-from')?.value??'',fragmentEnd:root.querySelector<HTMLInputElement>('#music-direction-to')?.value??'',savedAt:Date.now()};
}

async function produce(context:StudioModuleContext,plan:SketchPlan,previous?:{notes:MusicNote[];bars:number;tailBars?:number},keep:MusicPart[]=[],options?:MusicRenderOptions){
 const {composeMusicSession,keepMusicParts,renderMusicSession,rewriteTail}=await import('./media');
 const composed=composeMusicSession(plan.input);
 const total=composed.bars*composed.beatsPerBar;
 const notes=previous?.tailBars?rewriteTail(previous.notes,composed.notes,Math.max(0,total-previous.tailBars*composed.beatsPerBar),total):previous&&keep.length?keepMusicParts(previous.notes,composed.notes,keep,previous.bars,composed.bars,composed.beatsPerBar):composed.notes;
 let result;
 try{result=await renderMusicSession(plan.input,notes,'mix',phraseSpeech(plan),fileTone?{...options,tone:fileTone}:options);}
 catch(error){const stopped=renderStopped(error,options?.signal);if(!stopped)throw new RenderReplaced();if(options?.signal?.aborted)throw stopped;throw error;}
 const parts=[...new Set(result.session.notes.map(note=>note.part))];
 return {wav:result.wav,midi:result.midi,seconds:result.seconds,sessionBpm:result.session.bpm,sessionKey:result.session.keyRoot,sessionScale:result.session.scale,bars:result.session.bars,parts,notes:result.session.notes,rms:result.rms,master:result.master,sections:result.sections} satisfies SketchAudio;
}
function pushVersion(id:SketchId,audio:SketchAudio){
 const list=versions.get(id)??[];
 const url=URL.createObjectURL(audio.wav);
 list.push({n:(list.at(-1)?.n??0)+1,url,rms:audio.rms,wav:audio.wav});
 while(list.length>4){const old=list.shift();if(old)URL.revokeObjectURL(old.url);}
 versions.set(id,list);
 return list;
}
function partLabel(parts:string[]){
 const names:Record<string,string>={lead:'мелодия',bass:'бас',pad:'аккорды',arp:'арпеджио'};
 return ['ударные',...parts.map(part=>names[part]??part)].join(', ');
}
function sketchCard(context:StudioModuleContext,root:HTMLElement,prefs:()=>DirectionPrefs,id:SketchId,audio:SketchAudio,variant:number,plan:SketchPlan){
 const doc=root.ownerDocument;
 const history=pushVersion(id,audio);const url=history[history.length-1]?.url??'';
 let card=root.querySelector<HTMLElement>(`#music-sketch-${id}`);
 if(!card){card=doc.createElement('article');card.className='music-sketch';card.id=`music-sketch-${id}`;root.querySelector('#music-direction-sketches')?.append(card);}
 card.replaceChildren();
 const title=doc.createElement('h3');title.textContent=plan.title;const blurb=doc.createElement('p');blurb.textContent=plan.blurb;card.append(title,blurb);
 const facts=doc.createElement('p');facts.textContent=`${audio.sessionBpm} BPM · ${audio.sessionKey} ${audio.sessionScale} · ${audio.bars} тактов · ${audio.seconds.toFixed(0)} с · WAV ${formatBytes(audio.wav.size)}`;card.append(facts);
 const hookLine=doc.createElement('p');hookLine.className='muted';hookLine.textContent=fileTone?'Тембр с присланного файла: цикл баса и цикл тела. Пэд идёт одной нотой.':'Хук этого эскиза переходит в полный трек. Семя то же. Пришли аудиофайл, чтобы снять с него тембр.';card.append(hookLine);
 const reading=doc.createElement('p');reading.className='muted';reading.textContent=formatMaster(audio.master);card.append(reading);
 const player=doc.createElement('audio');player.controls=true;player.src=url;card.append(player);
 const mix=doc.createElement('p');mix.className='muted';mix.textContent=`В миксе: ${partLabel(audio.parts)}.`;card.append(mix);
 const pinRow=doc.createElement('div');pinRow.className='toolbar';
 const kept=pins.get(id)??new Set<MusicPart>();
 for(const part of ['bass','lead','pad','arp'] as const){const pin=doc.createElement('button');pin.type='button';pin.textContent=`Закрепить ${PIN_LABELS[part]}`;pin.setAttribute('aria-pressed',kept.has(part)?'true':'false');pin.onclick=()=>{const next=new Set(pins.get(id)??[]);if(next.has(part))next.delete(part);else next.add(part);pins.set(id,next);pin.setAttribute('aria-pressed',next.has(part)?'true':'false');const note=card.querySelector('.music-sketch-note');if(note)note.textContent=partChangeText([...next]);};pinRow.append(pin);}
 card.append(pinRow);
 const blocks=plan.input.story;
 const commitStory=async(nextBlocks:StoryBlock[],summary?:string)=>{
  const source=blocks??nextBlocks;const beats=plan.input.timeSignature==='4/4'?4:3;
  const next:SketchPlan={...plan,input:{...plan.input,story:nextBlocks,arrangement:'section-story',bars:nextBlocks.reduce((sum,block)=>sum+block.bars,0)}};
  const {composeMusicSession}=await import('./media');
  const notes=fillGrownSection(placeStoryNotes(audio.notes,source,nextBlocks,beats),composeMusicSession(next.input).notes,source,nextBlocks,beats);
  const reusable=audio.sections?.length?nextBlocks.every(block=>audio.sections?.some(slice=>slice.id===block.id&&slice.bars===block.bars)):false;
  if(reusable&&audio.sections){
   const mixed=concatSlices(nextBlocks.map(block=>({id:block.id,muted:block.muted})),audio.sections,128);
   const {wavFromChannels}=await import('./audio-codecs');
   const wav=wavFromChannels([mixed.left,mixed.right],44100);
   let sum=0;for(let index=0;index<mixed.left.length;index+=64)sum+=mixed.left[index]**2+(mixed.right[index]??0)**2;
   const rms=Math.sqrt(sum/Math.max(1,Math.ceil(mixed.left.length/64)*2));
   if(!context.current())return;
   sketchCard(context,root,prefs,id,{...audio,wav,seconds:mixed.left.length/44100,bars:next.input.bars,notes,rms,master:{...audio.master,integratedLufs:null,truePeakDbTP:null,low:null,mid:null,air:null},sections:audio.sections},variant,next);
   const host=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(host)host.textContent=summary??nextBlocks.map(block=>`${block.label}${block.muted?' глухо':''}`).join(' → ');
   return;
  }
  const signal=beginRender();
  try{
   context.notice('Собираю секции заново.');
   const {renderMusicSession}=await import('./media');
   const result=await renderMusicSession(next.input,notes,'mix',phraseSpeech(next),{signal,onProgress:(label,index,total)=>{const status=root.querySelector('#music-direction-status');if(status)status.textContent=`Собираю ${label} · ${index} из ${total}`;}});
   if(!context.current())return;
   const parts=[...new Set(result.session.notes.map(note=>note.part))];
   sketchCard(context,root,prefs,id,{wav:result.wav,midi:result.midi,seconds:result.seconds,sessionBpm:result.session.bpm,sessionKey:result.session.keyRoot,sessionScale:result.session.scale,bars:result.session.bars,parts,notes:result.session.notes,rms:result.rms,master:result.master,sections:result.sections},variant,next);
   const host=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(host)host.textContent=summary??nextBlocks.map(block=>`${block.label}${block.muted?' глухо':''}`).join(' → ');
  }catch(error){const stopped=renderStopped(error,signal);if(!stopped)return;throw stopped;}
  finally{endRender(signal);}
 };
 if(blocks?.length){
  const list=doc.createElement('div');list.className='music-sections';
  blocks.forEach((block,index)=>{const row=doc.createElement('div');row.className='toolbar';const name=doc.createElement('span');name.textContent=`${block.label} · ${block.bars} тактов${block.muted?' · глухо':''}`;const up=doc.createElement('button');up.type='button';up.textContent='Выше';up.disabled=index===0;up.onclick=()=>{void commitStory(moveStoryBlock(blocks,index,-1)).catch(error=>{if(!(error instanceof RenderReplaced))context.failure(error);});};const down=doc.createElement('button');down.type='button';down.textContent='Ниже';down.disabled=index===blocks.length-1;down.onclick=()=>{void commitStory(moveStoryBlock(blocks,index,1)).catch(error=>{if(!(error instanceof RenderReplaced))context.failure(error);});};const mute=doc.createElement('button');mute.type='button';mute.textContent='Глушить';mute.setAttribute('aria-pressed',block.muted?'true':'false');mute.onclick=()=>{void commitStory(toggleStoryMute(blocks,index)).catch(error=>{if(!(error instanceof RenderReplaced))context.failure(error);});};row.append(name,up,down,mute);list.append(row);});
  card.append(list);
 }
 const bar=doc.createElement('div');bar.className='toolbar';
 const button=(label:string,run:()=>Promise<void>|void)=>{const el=doc.createElement('button');el.type='button';el.textContent=label;el.onclick=()=>{if(el.disabled)return;el.disabled=true;Promise.resolve(run()).catch(error=>{if(!(error instanceof RenderReplaced))context.failure(error);}).finally(()=>{el.disabled=false;});};bar.append(el);return el;};
 const keptNow=()=>[...(pins.get(id)??[])];
 button('Развить в полный трек',async()=>{const memory=tenMinuteMemory(deviceMemory());if(!memory.ok)throw Error(memory.text);if(memory.text)context.notice(memory.text);const signal=beginRender();try{context.notice('Собираю трек на 10:00. Кнопку второй раз жать не нужно: секции идут по очереди.');await new Promise(resolve=>setTimeout(resolve,30));const keep=keptNow();const next=developedRequest(sketchRequest(prefs(),id,variant),audio.sessionBpm);const rendered=await produce(context,next,{notes:audio.notes,bars:audio.bars},keep,{signal,onProgress:(label,index,total)=>{const status=root.querySelector('#music-direction-status');if(status)status.textContent=`Собираю ${label} · ${index} из ${total}`;}});if(!context.current())return;sketchCard(context,root,prefs,id,rendered,variant,next);let cursor=0;const structure=(next.input.story??[]).map(block=>{const from=cursor;cursor+=block.bars;return `${block.label} ${from+1}–${cursor}`;}).join(' → ');const note=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(note)note.textContent=`${partChangeText(keep)} Структура: ${structure}. Длина ${rendered.seconds.toFixed(0)} с. Файл ${formatBytes(rendered.wav.size)}.`;}finally{endRender(signal);}});
 button('Крутить дроп',()=>{const story=plan.input.story??[];const drop=story.find(block=>block.id==='drop-1')??story.find(block=>block.id==='drop-2');if(!drop){player.loop=true;void player.play();context.notice('Кручу эскиз целиком. Дроп появится после «Развить».');return;}const barSeconds=(plan.input.timeSignature==='4/4'?4:3)*60/audio.sessionBpm;let from=0;for(const block of story){if(block.id===drop.id)break;from+=block.bars*barSeconds;}const to=from+drop.bars*barSeconds;player.loop=false;player.currentTime=from;player.ontimeupdate=()=>{if(player.currentTime>=to-.05)player.currentTime=from;};void player.play();context.notice('Кручу дроп. Полный трек на 10:00 ещё не обязателен.');});
 button('Ещё вариант',async()=>{const keep=keptNow();const base=sketchRequest(prefs(),id,variant+1);const next={...base,input:{...base.input,bars:plan.input.bars,arrangement:plan.input.arrangement,story:plan.input.story,introBars:plan.input.introBars,dropLevel:plan.input.dropLevel,hookLift:plan.input.hookLift}};const rendered=await produce(context,next,{notes:audio.notes,bars:audio.bars},keep);if(!context.current())return;sketchCard(context,root,prefs,id,rendered,variant+1,next);const note=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(note)note.textContent=partChangeText(keep);});
 button('Сохранить идею',()=>saveIdea(context,root,prefs(),audio,plan.input));
 button('WAV',()=>import('./media').then(media=>media.download(audio.wav,`azrail-${id}.wav`)));
 button('AIFF',async()=>{context.notice('Собираю AIFF 24 бит.');const {trackFile}=await import('./audio-codecs');const {download}=await import('./media');download(await trackFile(audio.wav,'aiff'),`azrail-${id}.aiff`);});
 button('FLAC',async()=>{context.notice('Собираю FLAC без потери.');const {trackFile}=await import('./audio-codecs');const {download}=await import('./media');download(await trackFile(audio.wav,'flac'),`azrail-${id}.flac`);});
 button('MP3',async()=>{context.notice('Собираю MP3 320.');const {mp3Bitrate,trackFile}=await import('./audio-codecs');const {download}=await import('./media');const file=await trackFile(audio.wav,'mp3');const rate=mp3Bitrate(new Uint8Array(await file.arrayBuffer()));if(rate!==320)throw Error('Файл не 320 кбит/с. Скачивание остановлено.');let air='верх: —';try{const ctx=new AudioContext();const decoded=await ctx.decodeAudioData(await file.arrayBuffer());const {measurePCM}=await import('./audio-analysis');const measured=await measurePCM(Array.from({length:decoded.numberOfChannels},(_,channel)=>decoded.getChannelData(channel)),decoded.sampleRate);const band=measured.bands.find(item=>item.label==='AIR');air=band&&(band.energyPercent??0)>=1?'верх есть':'верх: —';await ctx.close();}catch{air='верх: —';}context.notice(`MP3 ${rate} кбит/с. ${air}.`);download(file,`azrail-${id}.mp3`);});
 button('Все форматы',async()=>{const {mp3Bitrate,trackFile}=await import('./audio-codecs');const {download}=await import('./media');download(audio.wav,`azrail-${id}.wav`);context.notice('WAV 24 бит скачан. Собираю AIFF.');download(await trackFile(audio.wav,'aiff'),`azrail-${id}.aiff`);context.notice('AIFF скачан. Собираю FLAC.');download(await trackFile(audio.wav,'flac'),`azrail-${id}.flac`);context.notice('FLAC скачан. Собираю MP3 320.');const file=await trackFile(audio.wav,'mp3');const rate=mp3Bitrate(new Uint8Array(await file.arrayBuffer()));if(rate!==320)throw Error('Файл не 320 кбит/с. Скачивание остановлено.');download(file,`azrail-${id}.mp3`);context.notice('Четыре файла одного мастера: WAV, AIFF, FLAC и MP3 320.');});
 button('MIDI',()=>import('./media').then(media=>media.download(audio.midi,`azrail-${id}.mid`)));
 button('Слова',()=>{const hand=readProseHandoff(storage()?.getItem(PROSE_HANDOFF_KEY)??null);if(!hand){context.notice('Слов для трека пока нет. Собери их в Prose Studio.');return;}import('./media').then(media=>media.download(new Blob([hand.text],{type:'text/plain;charset=utf-8'}),`azrail-${id}-words.txt`));});
 button('Дорожка фразы',async()=>{const memory=plan.input.bars>32?tenMinuteMemory(deviceMemory()):{ok:true,text:''};if(!memory.ok)throw Error(memory.text);const {renderMusicSession,download}=await import('./media');context.notice('Собираю дорожку фразы.');const rendered=await renderMusicSession(plan.input.arrangement==='section-story'?plan.input:{...plan.input,arrangement:'section-story',story:plan.input.story??storyBlocks()},audio.notes,'vocal',phraseSpeech({...plan,input:{...plan.input,arrangement:'section-story',story:plan.input.story??storyBlocks()}}));download(rendered.wav,`azrail-${id}-vocal.wav`);});
 button('Слушать фразу',async()=>{const phrase=currentPhrase();const spoken=phraseRecording??(phrase?spokenFrom(phrase):null);if(!spoken)throw Error('Фразы нет. Напиши «Фраза: …» или положи слова.');const {wavFromChannels}=await import('./audio-codecs');const blob=wavFromChannels([spoken.samples],spoken.rate);const url=URL.createObjectURL(blob);player.src=url;player.loop=false;player.ontimeupdate=null;void player.play();context.notice(phraseRecording?'Слушаешь запись фразы отдельно от микса.':'Слушаешь сухое произнесение отдельно от микса. Это не певец.');});
 button('Низ в моно',async()=>{const ctx=new AudioContext();const decoded=await ctx.decodeAudioData(await audio.wav.arrayBuffer());const source=ctx.createBufferSource();source.buffer=decoded;const low=ctx.createBiquadFilter(),high=ctx.createBiquadFilter(),split=ctx.createChannelSplitter(2),mono=ctx.createGain(),merge=ctx.createChannelMerger(2);low.type='lowpass';low.frequency.value=100;high.type='highpass';high.frequency.value=100;mono.gain.value=.5;source.connect(high);high.connect(ctx.destination);source.connect(low);low.connect(split);split.connect(mono,0);split.connect(mono,1);mono.connect(merge,0,0);mono.connect(merge,0,1);merge.connect(ctx.destination);source.start();context.notice('Слушаешь низ в моно. Файл не меняется.');});
 button('Как референс',()=>{const gain=referenceGain(referenceLufs,audio.master.integratedLufs);player.volume=gain.volume;context.notice(gain.text);});
 button('Дорожки',async()=>{const memory=plan.input.bars>32?tenMinuteMemory(deviceMemory()):{ok:true,text:''};if(!memory.ok)throw Error(memory.text);if(memory.text)context.notice(memory.text);const {renderMusicSession,download}=await import('./media');const {pcmFromWav,wavFromChannels}=await import('./audio-codecs');const {bounceToMaster}=await import('./music-pro');context.notice('Собираю дорожки этой сборки.');const vocal=phraseSpeech(plan);const signal=beginRender();let rendered;try{rendered=await renderMusicSession(plan.input,audio.notes,'mix',vocal,{print:true,signal});}catch(error){const stopped=renderStopped(error,signal);if(stopped)throw stopped;return;}finally{endRender(signal);}if(!context.current()||!rendered)return;if(rendered.prints?.length){const pcm=await pcmFromWav(audio.wav),frames=Math.floor(pcm.samples.length/pcm.channels),scale=pcm.bits===24?8388608:32768,masterL=new Float32Array(frames),masterR=new Float32Array(frames);for(let index=0;index<frames;index++){masterL[index]=(pcm.samples[index*pcm.channels]??0)/scale;masterR[index]=(pcm.samples[index*pcm.channels+(pcm.channels>1?1:0)]??0)/scale;}const aligned=rendered.prints[0]?.left.length===frames;const left=aligned?bounceToMaster(rendered.prints.map(stem=>stem.left),masterL):rendered.prints.map(stem=>stem.left);const right=aligned?bounceToMaster(rendered.prints.map(stem=>stem.right),masterR):rendered.prints.map(stem=>stem.right);for(let index=0;index<rendered.prints.length;index++){const stem=rendered.prints[index]!;download(wavFromChannels([left[index]!,right[index]!],44100),`azrail-${id}-${stem.stem}.wav`);await new Promise(resolve=>setTimeout(resolve,400));}context.notice(aligned?'Дорожки скачаны. Их сумма совпадает с файлом на карточке. Это не разложение чужого файла.':'Дорожки скачаны. Их сумма совпадает с новой сборкой. Это не разложение чужого файла.');return;}const stems=[['drums','ударные'],['bass','бас'],['pad','аккорды'],['lead','мелодия'],['arp','арпеджио'],['vocal','фраза']] as const;for(const [stem,name] of stems){context.notice(`Собираю дорожку: ${name}`);const line=stem==='vocal'?phraseSpeech(plan.input.arrangement==='section-story'?plan:{...plan,input:{...plan.input,arrangement:'section-story',story:plan.input.story??storyBlocks()}}):undefined;if(stem==='vocal'&&!line){context.notice('Фразы нет, дорожку фразы пропускаю.');continue;}const vocalInput=plan.input.arrangement==='section-story'?plan.input:{...plan.input,arrangement:'section-story' as const,story:plan.input.story??storyBlocks()};const part=await renderMusicSession(stem==='vocal'?vocalInput:plan.input,audio.notes,stem,line);if(!context.current())return;download(part.wav,`azrail-${id}-${stem}.wav`);await new Promise(resolve=>setTimeout(resolve,400));}});
 card.append(bar);
 const commandRow=doc.createElement('div');commandRow.className='toolbar';
 const commandInput=doc.createElement('input');commandInput.type='text';commandInput.placeholder='Бас оставь, мелодию сделай грустнее';commandInput.maxLength=400;
 const apply=doc.createElement('button');apply.type='button';apply.textContent='Применить';
 apply.onclick=()=>{Promise.resolve(applyCommand()).catch(error=>{if(!(error instanceof RenderReplaced))context.failure(error);});};
 commandRow.append(commandInput,apply);card.append(commandRow);
 const versionRow=doc.createElement('div');versionRow.className='toolbar';
 for(const version of history){const pick=doc.createElement('button');pick.type='button';pick.textContent=`Версия ${version.n}`;pick.onclick=()=>{player.src=version.url;};versionRow.append(pick);}
 const compare=doc.createElement('button');compare.type='button';compare.textContent='Сравнить громкость';
 compare.onclick=()=>{const pair=history.slice(-2);const left=pair[0],right=pair[1];if(!left||!right){context.notice('Нужны две версии.');return;}void import('./media').then(({matchPlaybackGain})=>{const gain=matchPlaybackGain(left.rms,right.rms);let a=card.querySelector<HTMLAudioElement>('.music-compare-a'),b=card.querySelector<HTMLAudioElement>('.music-compare-b');if(!a||!b){a=doc.createElement('audio');b=doc.createElement('audio');a.className='music-compare-a';b.className='music-compare-b';a.controls=true;b.controls=true;card.append(a,b);}a.src=left.url;b.src=right.url;a.volume=gain.a;b.volume=gain.b;void a.play();void b.play();const note=card.querySelector('.music-sketch-note');if(note)note.textContent='Две последние версии. Более громкая приглушена до тихой, громкость не поднимается.';});};
 versionRow.append(compare);card.append(versionRow);
 const note=doc.createElement('p');note.className='music-sketch-note muted';card.append(note);
 async function applyCommand(){
  const command=interpretMusicCommand(commandInput.value);
  if(command.phrase){
   storage()?.setItem(PHRASE_KEY,command.phrase);
   phraseRecording=null;
   if(plan.input.arrangement!=='section-story'){const host=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(host)host.textContent=`${command.summary} В эскизе фразы нет, она войдёт в полный трек.`;return;}
   const signal=beginRender();
   try{const rendered=await produce(context,plan,{notes:audio.notes,bars:audio.bars},ALL_PARTS,{signal,onProgress:(label,index,total)=>{const status=root.querySelector('#music-direction-status');if(status)status.textContent=`Собираю фразу · ${label} · ${index} из ${total}`;}});if(!context.current())return;sketchCard(context,root,prefs,id,rendered,variant,plan);const host=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(host)host.textContent=command.summary;}
   finally{endRender(signal);}
   return;
  }
  const structural=command.sectionMute||command.sectionMove||command.sectionSwap||command.lengthen;
  const musical=command.rewrite.length>0||command.mood!=null||command.synth!=null||command.introBars!=null||command.dropLevel!=null||command.lastBars!=null;
  if(structural&&!musical){
   if(!plan.input.story?.length)throw Error('Секции есть у полного трека. Сначала нажми «Развить».');
   let nextBlocks=plan.input.story;
   if(command.lengthen)nextBlocks=lengthenSection(nextBlocks,command.lengthen);
   if(command.sectionSwap)nextBlocks=swapStoryBlocks(nextBlocks,command.sectionSwap[0],command.sectionSwap[1]);
   if(command.sectionMute){const index=nextBlocks.findIndex(block=>block.id===command.sectionMute);if(index<0)throw Error('Этой секции в треке нет.');nextBlocks=toggleStoryMute(nextBlocks,index);}
   const sectionMove=command.sectionMove;if(sectionMove){const index=nextBlocks.findIndex(block=>block.id===sectionMove.id);if(index<0)throw Error('Этой секции в треке нет.');const moved=moveStoryBlock(nextBlocks,index,sectionMove.direction);if(moved.every((block,at)=>block.id===nextBlocks[at]?.id))throw Error('Секция уже на краю.');nextBlocks=moved;}
   pins.set(id,new Set(command.keep));
   await commitStory(nextBlocks,command.summary);
   return;
  }
  pins.set(id,new Set(command.keep));
  const base=sketchRequest(prefs(),id,variant+1);
  const wantsStory=command.dropLevel!=null||command.introBars!=null;
  const story=wantsStory?storyWithIntro(plan.input.story,command.introBars??plan.input.introBars):plan.input.story;
 const next:SketchPlan={...base,input:{...base.input,bars:story?.length?story.reduce((sum,block)=>sum+block.bars,0):plan.input.bars,arrangement:wantsStory?'section-story':plan.input.arrangement,mood:command.mood??plan.input.mood,synthPreset:command.synth??plan.input.synthPreset,introBars:command.introBars??plan.input.introBars,dropLevel:command.dropLevel??plan.input.dropLevel,story,prompt:`${plan.input.prompt} ${command.summary}`}};
  const rendered=await produce(context,next,{notes:audio.notes,bars:audio.bars,tailBars:command.lastBars},command.keep);
  if(!context.current())return;
  sketchCard(context,root,prefs,id,rendered,variant+1,next);
  const host=root.querySelector(`#music-sketch-${id} .music-sketch-note`);
  if(host)host.textContent=command.summary;
 }
}
async function saveIdea(context:StudioModuleContext,root:HTMLElement,prefs:DirectionPrefs,audio:SketchAudio,input:MusicInput){
 const saved:SavedDirection={version:1,fileName:prefs.fileName,bpm:audio.sessionBpm,keyRoot:audio.sessionKey,scale:audio.sessionScale as MusicScale,bpmConfidence:null,keyConfidence:null,bass:'—',brightness:'—',dynamics:'—',sections:[],likes:prefs.likes,direction:prefs.direction,mood:prefs.mood,fragmentStart:prefs.fragment?String(prefs.fragment.start):'',fragmentEnd:prefs.fragment?String(prefs.fragment.end):'',savedAt:Date.now()};
 remember(root,saved);
 const {download}=await import('./media');
 download(audio.wav,`azrail-${prefs.direction}.wav`);
 download(audio.midi,`azrail-${prefs.direction}.mid`);
 context.notice(`Идея сохранена в этом браузере. WAV ${formatBytes(audio.wav.size)} и MIDI скачаны на диск.`);
 if(!context.account||context.account.role==='viewer')return;
 const wavFits=audio.wav.size<=PROJECT_FILE_LIMIT,midiFits=audio.midi.size<=PROJECT_FILE_LIMIT;
 if(!wavFits)context.notice(`WAV ${formatBytes(audio.wav.size)} скачан на диск и в проект не входит: предел 50 МБ.`);
 context.notice(wavFits?'Сохраняю WAV, MIDI и параметры в проект…':'Сохраняю параметры проекта. Большой WAV остаётся на диске.');
 const wav=wavFits?(await uploadStudioArtifact(context,audio.wav,`azrail-${prefs.direction}.wav`,'music')).id:null;
 const midi=midiFits?(await uploadStudioArtifact(context,audio.midi,`azrail-${prefs.direction}.mid`,'music')).id:null;
 await context.api('/api/studio/music/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:context.projectId||'',prompt:input.prompt,genre:input.genre,mood:input.mood,bpm:audio.sessionBpm,keyRoot:audio.sessionKey,scale:audio.sessionScale,bars:audio.bars,timeSignature:input.timeSignature,pattern:input.pattern,arrangement:input.arrangement,synthPreset:input.synthPreset,seed:input.seed??0,wavArtifactId:wav,midiArtifactId:midi})});
 context.notice(wavFits?'Идея есть в браузере, на диске и в проекте.':'Параметры есть в проекте. WAV остался на диске: он больше 50 МБ.');
}

export function mountMusicDirection(context:StudioModuleContext){
 const composer=context.controls.querySelector('.music-composer');if(!composer||composer.querySelector('#music-direction'))return;
 const advanced=composer.ownerDocument.createElement('div');advanced.id='music-direction-advanced-panel';advanced.hidden=true;
 while(composer.firstChild)advanced.append(composer.firstChild);
 const root=composer.ownerDocument.createElement('section');root.className='music-direction';root.id='music-direction';
 root.innerHTML=`<div class="music-direction-start"><section id="music-listen" class="music-listen"><canvas id="music-listen-wave" width="960" height="168" aria-label="Волна"></canvas><div class="music-listen-transport"><button id="music-listen-play" type="button">Слушать</button><span id="music-listen-time">0:00 / 0:00</span><label>Громкость<input id="music-listen-volume" type="range" min="0" max="1" step="0.01" value="0.85"></label></div><div class="music-listen-sources" id="music-listen-sources" hidden><button id="music-listen-pack" type="button">Пак</button><button id="music-listen-result" type="button">Сборка</button></div><p id="music-listen-facts" class="muted">Кинь трек или проект. Здесь прослушка. Сборка идёт генератором по ключу, длина как выйдет.</p><div class="toolbar"><button id="music-listen-copy" type="button">Скопировать бриф</button><button id="music-listen-build" class="primary" type="button">Собрать</button></div></section><div id="music-prose-words" hidden></div><h3>Файл</h3><label class="music-drop" id="music-drop">Перетащи MP3 — создадим трек в похожем направлении<input id="music-direction-file" type="file" accept="audio/*,.mp3,.wav,.aiff,.aif,.flac" hidden></label></div><p id="music-direction-status" class="muted"></p><details id="music-bench" class="music-bench"><summary>Разбор</summary><div id="music-direction-report" hidden></div><div class="toolbar"><button id="music-direction-scratch" type="button">Создать с нуля</button><button id="music-direction-resume" type="button">Продолжить мой проект</button><button id="music-direction-advanced" type="button" aria-expanded="false">Сложные настройки</button></div><p class="muted">Референс задаёт направление. Студия сочиняет новые партии и не копирует мелодию. Ориентир — длинный melodic house и techno. Готовый трек: WAV и AIFF 24 бит, FLAC без потери, MP3 320 кбит/с. Ниже 320 скачивания нет. Дорожки — WAV партий эскиза, не разложение загруженного файла. Полка собирает до 20 звуков: ориентир из файла и наш звук в этом характере. Исходный синтезатор из микса не извлекается. Сложный разбор Ableton и ручная генерация открываются отдельно.</p><div id="music-direction-choices"><h3>Что взять из референса</h3><div class="choices"><label><input id="music-like-rhythm" type="checkbox" checked> Ритм и грув</label><label><input id="music-like-bass" type="checkbox" checked> Характер баса</label><label><input id="music-like-atmosphere" type="checkbox" checked> Атмосфера и мелодичность</label><label><input id="music-like-energy" type="checkbox"> Развитие энергии</label></div><div class="music-direction-fix"><label>Направление<select id="music-direction-style"><option value="house">Melodic House</option><option value="techno">Melodic Techno</option></select></label><label>Настроение<select id="music-direction-mood"><option value="hypnotic">Гипнотическое</option><option value="atmospheric">Спокойное</option><option value="dark">Тёмное</option><option value="euphoric">Эйфория</option><option value="driving">Движущееся</option></select></label></div><div class="toolbar"><button id="music-direction-ideas" class="primary" type="button">Собрать три идеи</button></div><p class="muted">Три эскиза по 16 тактов. «Развить» собирает те же шесть секций на 10:00. Число тактов берётся из темпа. Закреплённая партия повторяется, остальные пишутся заново. Секции можно поднять, опустить и заглушить. Общая длина остаётся 10:00.</p><p id="music-direction-saved" class="muted"></p></div><div id="music-direction-sketches" class="music-sketches"></div></details>`;
 composer.append(root,advanced);
 const words=root.querySelector<HTMLElement>('#music-prose-words')!;
 const paintWords=()=>{
  const handoff=readProseHandoff(storage()?.getItem(PROSE_HANDOFF_KEY)??null);
  words.replaceChildren();
  if(!handoff){words.hidden=true;return;}
  words.hidden=false;
  const title=root.ownerDocument.createElement('h3');title.textContent=handoff.title?`Слова для трека · ${handoff.title}`:'Слова для трека';
  const body=root.ownerDocument.createElement('pre');body.textContent=handoff.text;
  const note=root.ownerDocument.createElement('p');note.className='muted';note.textContent='Это текст из Prose Studio. Лист целиком студия не поёт. В полный трек может войти одна короткая фраза.';
  const clear=root.ownerDocument.createElement('button');clear.type='button';clear.textContent='Убрать слова';clear.onclick=()=>{storage()?.removeItem(PROSE_HANDOFF_KEY);paintWords();};
  words.append(title,body,note,clear);
 };
 paintWords();
 const status=root.querySelector<HTMLElement>('#music-direction-status')!;
 const file=root.querySelector<HTMLInputElement>('#music-direction-file')!;
 const drop=root.querySelector<HTMLElement>('#music-drop')!;
 let detailed:MusicTrackDetailed|null=null;
 let fileName='';
 const listen=mountListenPlayer(root,{brief:()=>liveBrief(root,detailed,fileName),api:context.api,onStatus:text=>{status.textContent=text;},failure:context.failure,instrumental:()=>!/голос|вокал|спой/i.test(directionFlags.wish),remember:()=>{}});
 const onPack=()=>listen.setFacts(factLine(root,detailed,fileName));
 root.ownerDocument.addEventListener('pulse-als-parsed',onPack);
 stopListen=()=>{root.ownerDocument.removeEventListener('pulse-als-parsed',onPack);listen.dispose();};
 if(rememberedBrief())listen.setFacts('Прошлый бриф помню. Кинь файл снова, если хочешь его услышать.');
 const prefs=()=>readPrefs(root,fileName);
 const runFile=async(next:File)=>{
  if(next.size>30*1024*1024)throw Error('Аудиофайл должен быть меньше 30 МБ.');
  analysisAbort?.abort();const local=new AbortController();analysisAbort=local;fileName=next.name;detailed=null;fileTone=null;
  revokeReference();referenceUrl=URL.createObjectURL(next);
  status.textContent=`Разбираю ${next.name}…`;
  listen.setFacts(factLine(root,null,next.name));
  try{
   const {analyzeMusicFile}=await import('./music-intelligence-runtime');
   const result=await analyzeMusicFile(next,local.signal,progress=>{status.textContent=`Разбираю ${next.name}… ${Math.round(progress*100)}%`;});
   if(local.signal.aborted||!context.current())return;
   detailed=result;referenceLufs=result.measurements.integratedLufs;
   try{const {toneFromFile}=await import('./file-tone');fileTone=await toneFromFile(next);}catch{fileTone=null;}
   status.textContent=fileTone?'Разбор готов. Тембр снят с файла: цикл баса и цикл тела.':'Разбор готов. Устойчивый цикл в файле не нашёлся, тембр записи в эскиз не попал.';
   const sections=result.analysis.sections.map(section=>({label:SECTION_RU[section.kind]??section.label,start:section.startSeconds,end:section.endSeconds}));
   reportView(root,root.ownerDocument,next.name,result.measurements,sections,{bpm:result.measurements.bpm==null?null:Math.round(result.measurements.bpm),keyRoot:parseDetectedKey(result.measurements.detectedKey)?.root??'',scale:parseDetectedKey(result.measurements.detectedKey)?.scale??'minor'});
   remember(root,{...summaryFrom(root,result,next.name),bass:bassText(result.measurements),brightness:brightnessText(result.measurements.spectralCentroidHz),dynamics:dynamicsText(result.measurements),sections});
   if(referenceUrl)await listen.load(referenceUrl,factLine(root,detailed,fileName),'pack');
  }catch(error){if(local.signal.aborted)return;status.textContent='';throw error;}
 };
 file.onchange=()=>{const next=file.files?.[0];const job=next?runFile(next):Promise.resolve();(file as HTMLInputElement & {pending?:Promise<void>}).pending=job;void job.catch(error=>{if(!analysisAbort?.signal.aborted)context.failure(error);});};
 drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-over');});
 drop.addEventListener('dragleave',()=>drop.classList.remove('is-over'));
 drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('is-over');const next=event.dataTransfer?.files?.[0];if(next)void runFile(next).catch(context.failure);});
 root.querySelector<HTMLButtonElement>('#music-direction-scratch')!.onclick=()=>{advanced.hidden=false;root.querySelector<HTMLButtonElement>('#music-direction-advanced')!.setAttribute('aria-expanded','true');context.controls.querySelector<HTMLTextAreaElement>('#studio-text')?.focus();context.notice('Ручная генерация открыта. Референс для неё не обязателен.');};
 root.querySelector<HTMLButtonElement>('#music-direction-advanced')!.onclick=()=>{advanced.hidden=!advanced.hidden;root.querySelector<HTMLButtonElement>('#music-direction-advanced')!.setAttribute('aria-expanded',String(!advanced.hidden));};
 root.querySelector<HTMLButtonElement>('#music-direction-resume')!.onclick=()=>{
  const saved=readSaved();if(!saved){context.notice('Сохранённой идеи пока нет.');return;}
  fileName=saved.fileName;
  const style=root.querySelector<HTMLSelectElement>('#music-direction-style');if(style)style.value=saved.direction;
  const mood=root.querySelector<HTMLSelectElement>('#music-direction-mood');if(mood)mood.value=saved.mood;
  (['rhythm','bass','atmosphere','energy'] as const).forEach(key=>{const box=root.querySelector<HTMLInputElement>(`#music-like-${key}`);if(box)box.checked=saved.likes[key];});
  reportView(root,root.ownerDocument,saved.fileName,null,saved.sections,saved);
  status.textContent='Проект восстановлен из этого браузера.';
  context.notice('Параметры идеи восстановлены. Аудиофайл нужно перетащить снова, если хочешь его услышать.');
 };
 root.querySelector<HTMLButtonElement>('#music-direction-ideas')!.onclick=()=>(async()=>{
  const button=root.querySelector<HTMLButtonElement>('#music-direction-ideas')!;button.disabled=true;status.textContent='Собираю три идеи…';
  const sketches=root.querySelector<HTMLElement>('#music-direction-sketches')!;sketches.replaceChildren();
  const signal=beginRender();
  try{
   const current=prefs();
   for(const id of ['soft','dark','energy'] as const){if(signal.aborted||!context.current())return;const plan=sketchRequest(current,id,0);const rendered=await produce(context,plan,undefined,[],{signal,onProgress:()=>{status.textContent=`Собираю идею «${plan.title}»…`;}});if(!context.current())return;sketchCard(context,root,prefs,id,rendered,0,plan);const note=root.querySelector(`#music-sketch-${id} .music-sketch-note`);if(note)note.textContent=partChangeText([...(pins.get(id)??[])]);}
   status.textContent=fileTone?'Три идеи готовы. Тембр снят с файла.':'Три идеи готовы. Можно развить одну, запросить другой вариант или сохранить.';
   remember(root,summaryFrom(root,detailed,fileName));
  }catch(error){if(error instanceof RenderReplaced)return;status.textContent='';context.failure(error);}finally{button.disabled=false;endRender(signal);}
 })();
 const stop=root.ownerDocument.createElement('button');stop.id='music-direction-stop';stop.type='button';stop.hidden=true;stop.textContent='Остановить сборку';stop.onclick=()=>renderAbort?.abort();status.after(stop);
 const phraseFile=root.ownerDocument.createElement('input');phraseFile.type='file';phraseFile.accept='audio/*,.wav,.aiff,.aif';phraseFile.hidden=true;
 const phraseButton=root.ownerDocument.createElement('button');phraseButton.type='button';phraseButton.textContent='Загрузить сухую фразу';phraseButton.onclick=()=>phraseFile.click();
 phraseFile.onchange=()=>{const next=phraseFile.files?.[0];if(!next)return;void (async()=>{const ctx=new AudioContext();try{const decoded=await ctx.decodeAudioData(await next.arrayBuffer());const left=decoded.getChannelData(0),right=decoded.numberOfChannels>1?decoded.getChannelData(1):left;const mono=new Float32Array(left.length);for(let index=0;index<left.length;index++)mono[index]=((left[index]??0)+(right[index]??0))/2;const spoken=spokenFromRecording(mono,decoded.sampleRate,currentPhrase()??'фраза из записи держится на хуке');if(!spoken)throw Error('Запись слишком короткая для фразы.');phraseRecording=spoken;storage()?.setItem(PHRASE_KEY,spoken.phrase.replace(/ · запись$/,''));context.notice('Фраза взята из записи и режется на хук. Это не певец и не копия чужого вокала.');}finally{await ctx.close();}})().catch(context.failure);};
 const phraseRow=root.ownerDocument.createElement('div');phraseRow.className='toolbar';phraseRow.append(phraseButton,phraseFile);root.querySelector('#music-bench')?.append(phraseRow);
 const shelfHost=root.ownerDocument.createElement('section');shelfHost.id='music-shelf';shelfHost.className='music-direction';
 shelfHost.innerHTML='<h3>Полка звуков</h3><p class="muted">Готовый микс не разбирается на исходные синтезаторы. Карточка «ориентир из файла» только для слуха. «Наш звук» — новая короткая партия в том же характере. В скачивание чужой кусок сам не попадает.</p>';
 const shelfDrop=root.ownerDocument.createElement('label');shelfDrop.className='music-drop';shelfDrop.textContent='Перетащи несколько готовых треков';
 const shelfInput=root.ownerDocument.createElement('input');shelfInput.type='file';shelfInput.accept='audio/*,.mp3,.wav,.aiff,.aif,.flac';shelfInput.multiple=true;shelfInput.hidden=true;shelfDrop.append(shelfInput);
 const shelfList=root.ownerDocument.createElement('div');shelfList.className='music-sketches';
 const wish=root.ownerDocument.createElement('textarea');wish.id='music-shelf-wish';wish.maxLength=400;wish.placeholder='Хочу такой бас, а аккорд пусть звучит шире';wish.rows=3;
 const hintRow=root.ownerDocument.createElement('div');hintRow.className='toolbar';
 const melodic=root.ownerDocument.createElement('button');melodic.type='button';melodic.textContent='Мелодичнее';
 const professional=root.ownerDocument.createElement('button');professional.type='button';professional.textContent='Профессиональнее';
 const assemble=root.ownerDocument.createElement('button');assemble.type='button';assemble.className='primary';assemble.textContent='Эскиз с полки';
 hintRow.append(melodic,professional,assemble);
 shelfHost.append(shelfDrop,shelfList,wish,hintRow);
 root.querySelector('#music-direction-sketches')?.after(shelfHost);
 const pieces:ShelfPiece[]=[];
 const selected=new Set<string>();
 const paintShelf=()=>{shelfList.replaceChildren();if(!pieces.length){const empty=root.ownerDocument.createElement('p');empty.className='muted';empty.textContent=`Полка пустая. Можно положить до ${SHELF_CAP} звуков.`;shelfList.append(empty);return;}for(const piece of pieces){const card=root.ownerDocument.createElement('article');card.className='music-sketch';const title=root.ownerDocument.createElement('h3');title.textContent=piece.title;const detail=root.ownerDocument.createElement('p');detail.className='muted';detail.textContent=`${piece.detail} ${piece.bpm==null?'Темп —':`${piece.bpm.toFixed(0)} BPM`} · ${piece.keyRoot??'тональность —'}.`;const row=root.ownerDocument.createElement('div');row.className='toolbar';if(piece.kind==='ours'){const box=root.ownerDocument.createElement('input');box.type='checkbox';box.checked=selected.has(piece.id);box.onchange=()=>{if(box.checked)selected.add(piece.id);else selected.delete(piece.id);setDirectionFlags({roles:[...selected].map(item=>pieces.find(found=>found.id===item)?.role??'').filter(Boolean)});};const label=root.ownerDocument.createElement('label');label.append(box,root.ownerDocument.createTextNode(' Взять характер'));row.append(label);}const listen=root.ownerDocument.createElement('button');listen.type='button';listen.textContent='Слушать';listen.onclick=()=>{void (async()=>{if(piece.kind==='reference'){const url=shelfAudio.get(piece.id);if(!url)throw Error('Файл ориентира уже закрыт. Перетащи его на полку снова.');const audio=root.ownerDocument.createElement('audio');audio.controls=true;audio.src=url;card.append(audio);void audio.play();context.notice('Слушаешь ориентир из файла. В новый трек он не копируется.');return;}const {renderMusicSession}=await import('./media');const rendered=await renderMusicSession({prompt:`Новая партия ${piece.role}. Мелодия не копируется.`,bpm:piece.bpm,keyRoot:piece.keyRoot||'auto',scale:'minor',bars:2,timeSignature:'4/4',genre:'melodic-techno',mood:'hypnotic',pattern:piece.role==='bass'?'bassline':piece.role==='hook'?'pulse':'chords',arrangement:'loop',synthPreset:piece.role==='bass'?'sub':'warm-pad',seed:mixSeed(piece.id,1,3)},undefined,piece.role==='hat'?'drums':'mix');const url=URL.createObjectURL(rendered.wav);const audio=root.ownerDocument.createElement('audio');audio.controls=true;audio.src=url;card.append(audio);void audio.play();context.notice('Это наш звук в характере ориентира, не кусок чужого трека.');})().catch(context.failure);};row.append(listen);card.append(title,detail,row);shelfList.append(card);}};
 const addFiles=async(list:FileList|File[])=>{for(const file of [...list]){if(pieces.length>=SHELF_CAP){context.notice('На полке уже 20 звуков.');break;}if(file.size>30*1024*1024){context.notice(`${file.name} больше 30 МБ и на полку не берётся.`);continue;}status.textContent=`Слушаю характер ${file.name}…`;const {analyzeMusicFile}=await import('./music-intelligence-runtime');const result=await analyzeMusicFile(file);const detected=parseDetectedKey(result.measurements.detectedKey);const added=shelfFromAnalysis(file.name,result.measurements.bpm,detected?.root??null,pieces.length);if(added.some(piece=>piece.kind==='reference')){const url=URL.createObjectURL(file);for(const piece of added)if(piece.kind==='reference')shelfAudio.set(piece.id,url);}pieces.push(...added);}if(pieces.length>SHELF_CAP)pieces.length=SHELF_CAP;paintShelf();status.textContent=`На полке ${pieces.length} из ${SHELF_CAP}.`;};
 shelfInput.onchange=()=>{if(shelfInput.files?.length)void addFiles(shelfInput.files).catch(context.failure);};
 shelfDrop.addEventListener('dragover',event=>{event.preventDefault();});
 shelfDrop.addEventListener('drop',event=>{event.preventDefault();const files=event.dataTransfer?.files;if(files?.length)void addFiles(files).catch(context.failure);});
 melodic.onclick=()=>{setDirectionFlags({hookLift:true});if(!wish.value.trim())wish.value='Подними хук во втором дропе и открой фразу в брейке.';setDirectionFlags({wish:wish.value});context.notice('Мелодичнее: хук во втором дропе выше, фраза в брейке открытее. Мелодия остаётся новой.');};
 professional.onclick=()=>{setDirectionFlags({professional:true});if(!wish.value.trim())wish.value='Низ в моно, пик не выше -1.0 dBTP, десять минут не один луп.';setDirectionFlags({wish:wish.value});context.notice('Профессиональнее: низ в моно, пик не выше -1.0 dBTP, секции не повторяют один луп.');};
 wish.onchange=()=>setDirectionFlags({wish:wish.value});
 assemble.onclick=()=>{void (async()=>{const memory=tenMinuteMemory(deviceMemory());if(!memory.ok)throw Error(memory.text);setDirectionFlags({wish:wish.value});const signal=beginRender();assemble.disabled=true;try{if(memory.text)context.notice(memory.text);status.textContent='Собираю трек с полки…';const current=prefs();const sketch=sketchRequest(current,'energy',0);const short=await produce(context,sketch,undefined,[],{signal});const full=developedRequest({...sketch,input:{...sketch.input,bpm:short.sessionBpm}},short.sessionBpm);const rendered=await produce(context,full,{notes:short.notes,bars:short.bars},[],{signal,onProgress:(label,index,total)=>{status.textContent=`Собираю ${label} · ${index} из ${total}`;}});if(!context.current())return;sketchCard(context,root,prefs,'energy',rendered,0,full);status.textContent='Трек с полки собран. Мелодия новая, характер взят только из отмеченных наших звуков.';}finally{assemble.disabled=false;endRender(signal);}})().catch(error=>{if(!(error instanceof RenderReplaced))context.failure(error);});};
 paintShelf();
}
