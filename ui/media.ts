import { clamp } from '../src/shared/format';
import { wavFromChannels } from './audio-codecs';
import type { SpokenLine } from './dry-speech';
import type { FileTone } from './file-tone';
import { readMaster } from './studio-master';
export function download(blob:Blob,name:string){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function hash(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
const KEY_ROOTS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
const SCALE_INTERVALS={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10]} as const;
export type MusicGenre='dark-minimal'|'melodic-techno'|'ambient'|'industrial'|'cinematic';
export type MusicMood='hypnotic'|'driving'|'dark'|'euphoric'|'atmospheric';
export type MusicScale=keyof typeof SCALE_INTERVALS;
export type MusicTimeSignature='4/4'|'3/4'|'6/8';
export type MusicPattern='pulse'|'arpeggio'|'bassline'|'chords'|'ambient';
export type MusicArrangement='loop'|'intro-build-drop'|'minimal-evolution'|'section-story';
export type MusicSynthPreset='dark-pulse'|'warm-pad'|'glass'|'sub'|'acid';
export type MusicNote={pitch:number;start:number;length:number;velocity:number;part:'lead'|'bass'|'pad'|'arp'};
export type StoryBlock={id:string;label:string;bars:number;level:number;muted?:boolean};
export type MusicInput={prompt:string;bpm:number|null;keyRoot:string;scale:MusicScale;bars:number;timeSignature:MusicTimeSignature;genre:MusicGenre;mood:MusicMood;pattern:MusicPattern;arrangement:MusicArrangement;synthPreset:MusicSynthPreset;seed?:number|null;introBars?:number;dropLevel?:number;story?:StoryBlock[];hookLift?:boolean;renderOrigin?:number;riser?:boolean};
export type MusicRenderOptions={single?:boolean;raw?:boolean;tail?:boolean;print?:boolean;signal?:AbortSignal;onProgress?:(label:string,index:number,total:number)=>void;tone?:FileTone|null};
export type PrintedStem={stem:string;name:string;left:Float32Array;right:Float32Array};
export type RenderedSection={id:string;bars:number;left:Float32Array;right:Float32Array};
export type MusicStem='mix'|'drums'|'vocal'|MusicNote['part'];
export type ResolvedMusicSession=Omit<MusicInput,'bpm'|'keyRoot'|'seed'> & {bpm:number;keyRoot:string;seed:number;beatsPerBar:number;notes:MusicNote[]};

function beatsPerBar(signature:MusicTimeSignature){return signature==='4/4'?4:3;}
function genreBpm(genre:MusicGenre,seed:number){const ranges:Record<MusicGenre,[number,number]>={
 'dark-minimal':[122,130],'melodic-techno':[120,128],ambient:[72,104],industrial:[126,138],cinematic:[84,118],
};const [a,b]=ranges[genre];return a+(seed%(b-a+1));}
const MAX_MUSIC_BARS=640;
export function storyBlocks(introBars?:number):StoryBlock[]{const intro=introBars==null?8:Math.max(4,Math.min(12,Math.trunc(introBars)));const delta=8-intro;return [{id:'intro',label:'Вступление',bars:intro,level:.46},{id:'rise',label:'Развитие',bars:8+delta,level:.64},{id:'drop-1',label:'Первый дроп',bars:16,level:.9},{id:'break',label:'Брейк',bars:8,level:.38},{id:'drop-2',label:'Основной дроп',bars:16,level:1},{id:'outro',label:'Завершение',bars:8,level:.52}];}
export function tenMinuteBars(bpm:number,signature:MusicTimeSignature='4/4'){const tempo=Math.trunc(bpm);if(!Number.isInteger(tempo)||tempo<60||tempo>180)throw Error('BPM 60–180 или Auto.');return Math.max(6,Math.min(MAX_MUSIC_BARS,Math.round(600*tempo/(60*beatsPerBar(signature)))));}
export function tenMinuteStory(bpm:number,signature:MusicTimeSignature='4/4'):StoryBlock[]{const total=tenMinuteBars(bpm,signature),weights=[1,1,2,1,2,1],raw=weights.map(weight=>total*weight/8),bars=raw.map(value=>Math.floor(value));let left=total-bars.reduce((sum,value)=>sum+value,0);const order=raw.map((value,index)=>({index,frac:value-Math.floor(value)})).sort((a,b)=>b.frac-a.frac||a.index-b.index);for(let step=0;step<left;step++)bars[order[step%order.length]!.index]++;const spec=[{id:'intro',label:'Вступление',level:.46},{id:'rise',label:'Развитие',level:.64},{id:'drop-1',label:'Первый дроп',level:.9},{id:'break',label:'Брейк',level:.38},{id:'drop-2',label:'Основной дроп',level:1},{id:'outro',label:'Завершение',level:.52}];return spec.map((section,index)=>({...section,bars:bars[index]!}));}
function blockRanges(blocks:StoryBlock[]){let cursor=0;return blocks.map(block=>{const from=cursor;cursor+=Math.max(1,Math.trunc(block.bars));return {...block,from,to:cursor,muted:!!block.muted};});}
export function storyBlockLevel(blocks:StoryBlock[],bar:number){const ranges=blockRanges(blocks),found=ranges.find(section=>bar>=section.from&&bar<section.to)??ranges[ranges.length-1];return found?.muted?0:found?.level??.5;}
export function storyWithIntro(blocks:StoryBlock[]|undefined,introBars?:number){const sized=storyBlocks(introBars);if(!blocks?.length)return sized;if(introBars==null)return blocks;const total=blocks.reduce((sum,block)=>sum+block.bars,0),sizedTotal=sized.reduce((sum,block)=>sum+block.bars,0);if(total===sizedTotal){const bars=new Map(sized.map(block=>[block.id,block.bars]));return blocks.map(block=>bars.has(block.id)?{...block,bars:bars.get(block.id)!}:block);}const intro=Math.max(1,Math.min(total-blocks.length+1,Math.trunc(introBars))),current=blocks.find(block=>block.id==='intro')?.bars??intro,delta=intro-current;return blocks.map(block=>block.id==='intro'?{...block,bars:intro}:block.id==='rise'?{...block,bars:Math.max(1,block.bars-delta)}:block);}
export function moveStoryBlock(blocks:StoryBlock[],index:number,direction:-1|1){const next=index+direction;if(index<0||next<0||index>=blocks.length||next>=blocks.length)return blocks;const copy=blocks.slice();const [item]=copy.splice(index,1);copy.splice(next,0,item!);return copy;}
export function toggleStoryMute(blocks:StoryBlock[],index:number){return blocks.map((block,at)=>at===index?{...block,muted:!block.muted}:block);}
export function swapStoryBlocks(blocks:StoryBlock[],idA:string,idB:string){const a=blocks.findIndex(block=>block.id===idA),b=blocks.findIndex(block=>block.id===idB);if(a<0||b<0)throw Error('Этой секции в треке нет.');if(Math.abs(a-b)!==1)throw Error('Поменять можно соседние секции.');return moveStoryBlock(blocks,Math.min(a,b),1);}
export function placeStoryNotes(notes:MusicNote[],fromBlocks:StoryBlock[],toBlocks:StoryBlock[],beatsPerBar:number){
 const beat=Math.max(1,Math.trunc(beatsPerBar)),source=blockRanges(fromBlocks).map(block=>({...block,fromBeat:block.from*beat,toBeat:block.to*beat})),target=blockRanges(toBlocks).map(block=>({...block,fromBeat:block.from*beat,toBeat:block.to*beat})),placed:MusicNote[]=[];
 for(const block of target){if(block.muted)continue;const origin=source.find(section=>section.id===block.id);if(!origin)continue;const shift=block.fromBeat-origin.fromBeat;for(const note of notes){if(note.start<origin.fromBeat||note.start>=origin.toBeat)continue;const start=note.start+shift,room=Math.min(origin.toBeat-note.start,block.toBeat-start),length=Math.min(note.length,room);if(start>=block.fromBeat&&start<block.toBeat&&length>0)placed.push({...note,start,length});}}
 return placed.sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
export function fillGrownSection(placed:MusicNote[],fresh:MusicNote[],previous:StoryBlock[],next:StoryBlock[],beatsPerBar:number){
 const beat=Math.max(1,Math.trunc(beatsPerBar)),before=blockRanges(previous),after=blockRanges(next),extra:MusicNote[]=[];
 for(const block of after){const origin=before.find(section=>section.id===block.id);if(!origin)continue;const added=(block.to-block.from)-(origin.to-origin.from);if(added<=0)continue;const from=(block.to-added)*beat,to=block.to*beat;for(const note of fresh)if(note.start>=from&&note.start<to)extra.push(note);}
 return [...placed,...extra].sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
export function storySections(bars:number,introBars?:number){
 const plan=storyBlocks(introBars),total=plan.reduce((sum,section)=>sum+section.bars,0),count=Math.max(1,Math.trunc(bars));
 let cursor=0;
 return plan.map((section,index)=>{const length=index===plan.length-1?Math.max(0,count-cursor):Math.max(1,Math.round(section.bars/total*count));const from=cursor;cursor=Math.min(count,cursor+length);return {label:section.label,from,to:cursor,level:section.level};});
}
function storyLevel(bar:number,bars:number,introBars?:number){const sections=storySections(bars,introBars);return sections.find(section=>bar>=section.from&&bar<section.to)?.level??sections[sections.length-1]?.level??.5;}
function arrangementLevel(kind:MusicArrangement,bar:number,bars:number,introBars?:number,story?:StoryBlock[]){
 if(kind==='loop')return 1;
 if(kind==='section-story'&&story?.length)return storyBlockLevel(story,bar);
 if(kind==='section-story')return storyLevel(bar,bars,introBars);
 const x=bars<=1?1:bar/(bars-1);
 if(kind==='intro-build-drop')return x<.25?.52:x<.58?.72:x<.78?1:.9;
 return .62+.28*Math.sin((x+.1)*Math.PI);
}
function pitchFor(root:number,scale:readonly number[],degree:number,octave=4){const d=((degree%scale.length)+scale.length)%scale.length,oct=Math.floor(degree/scale.length);return 12*(octave+1)+root+scale[d]+12*oct;}
export function hookDegrees(seed:number):number[]{
 let state=seed>>>0;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return [0,2,4,7,4,2,5,3].map(step=>step+(rnd()>.72?2:0));
}
export function answerDegrees(seed:number){const hook=hookDegrees(seed);return hook.map((step,index)=>(step+[2,4,0,3,5,1,4,2][index])%12);}
function sectionSwing(id?:string){if(id==='drop-2')return .06;if(id==='drop-1')return .05;if(id==='rise')return .04;if(id==='break')return .02;if(id==='intro'||id==='outro')return .025;return .045;}
function sidechainDepth(id?:string){if(id==='drop-1'||id==='drop-2')return .18;if(id==='break')return .8;if(id==='intro'||id==='outro')return .5;return .15;}
export function composeMusicSession(input:MusicInput):ResolvedMusicSession{
 const prompt=input.prompt.trim()||'Midnight pulse',bars=Math.trunc(input.bars);
 if(!Number.isInteger(bars)||bars<1||bars>MAX_MUSIC_BARS)throw Error('Длина 1–640 тактов.');
 const configSeed=hash(JSON.stringify({prompt,genre:input.genre,mood:input.mood,scale:input.scale,bars,timeSignature:input.timeSignature,pattern:input.pattern,arrangement:input.arrangement,synthPreset:input.synthPreset}));
 const seed=input.seed==null?configSeed&0x7fffffff:Math.trunc(input.seed);
 if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw Error('Seed должен быть от 0 до 2147483647.');
 const bpm=input.bpm==null||input.bpm===0?genreBpm(input.genre,seed):Math.trunc(input.bpm);
 if(!Number.isInteger(bpm)||bpm<60||bpm>180)throw Error('BPM 60–180 или Auto.');
 const rootName=input.keyRoot==='auto'?KEY_ROOTS[seed%KEY_ROOTS.length]:input.keyRoot;
 const root=KEY_ROOTS.indexOf(rootName as typeof KEY_ROOTS[number]);if(root<0)throw Error('Некорректная тональность.');
 const scale=SCALE_INTERVALS[input.scale],bpb=beatsPerBar(input.timeSignature),total=bars*bpb,notes:MusicNote[]=[],hook=hookDegrees(seed),answer=answerDegrees(seed),ranges=input.arrangement==='section-story'&&input.story?.length?blockRanges(input.story):[],bassRoll=[0,0,7,0,3,10,0,7];
 const add=(part:MusicNote['part'],pitch:number,start:number,length:number,velocity:number)=>{if(start<0||start>=total)return;notes.push({part,pitch:clamp(Math.round(pitch),24,96),start,length:Math.min(length,total-start),velocity:clamp(velocity,.12,.95)});};
 for(let bar=0;bar<bars;bar++){
  const base=bar*bpb,level=arrangementLevel(input.arrangement,bar,bars,input.introBars,input.story),rootDegree=[0,5,3,6][bar%4],section=ranges.find(item=>bar>=item.from&&bar<item.to);
  if(input.arrangement==='loop'){
   add('pad',pitchFor(root,scale,rootDegree,3),base,Math.max(.5,bpb-.08),.16+.1*level);
   add('pad',pitchFor(root,scale,rootDegree+2,3),base,.5*bpb,.1+.06*level);
   add('pad',pitchFor(root,scale,rootDegree+4,4),base+bpb*.5,Math.max(.5,bpb*.5),.08+.05*level);
   const eighths=Math.max(1,Math.round(bpb*2));
   for(let step=0;step<eighths;step++){
    const start=base+step*.5;if(start>=total)break;
    const degree=bassRoll[(bar*eighths+step)%bassRoll.length],accent=step%2?0:1;
    add('bass',pitchFor(root,scale,degree,2),start,.22,.16+.14*level+accent*.08);
   }
   const motif=hook,grid=bpb/motif.length,part=input.pattern==='arpeggio'?'arp':'lead',octave=input.pattern==='bassline'?3:5;
   for(let i=0;i<motif.length;i++){
    const start=base+i*grid;if(start>=total)break;
    add(part,pitchFor(root,scale,motif[i]+rootDegree,octave),start,Math.max(.12,grid*.86),.34+.2*level);
   }
   continue;
  }
  const zoneStart=section?section.from:bar<bars*.25?0:bar<bars*.5?Math.floor(bars*.25):bar<bars*.75?Math.floor(bars*.5):Math.floor(bars*.75);
  const id=section?.id??(bar<bars*.25?'intro':bar<bars*.5?'rise':bar<bars*.75?'drop-1':'drop-2');
  const local=bar-zoneStart,zone=Math.max(1,section?section.to-section.from:id==='drop-2'?bars-zoneStart:Math.floor(bars*.25)||1);
  const endBeat=(section?section.to:Math.min(bars,zoneStart+zone+2))*bpb;
  const eighths=Math.max(1,Math.round(bpb*2));
  if(id!=='intro'&&id!=='break'){
   for(let step=0;step<eighths;step++){
    const start=base+step*.5;if(start>=total)break;
    const degree=bassRoll[(bar*eighths+step)%bassRoll.length],quiet=id==='outro';
    add('bass',pitchFor(root,scale,degree,2),start,.22,quiet?0.18:.2+.16*level+(step%2?0:.08));
   }
  }
  const pluck=id==='drop-1'||id==='drop-2'||id==='break';
  const themeHold=Math.min(16,Math.max(2,Math.floor(zone/2)));
  const theme=id==='drop-2'||id==='outro'||(id==='drop-1'&&local>=zone-themeHold);
  const line=theme&&(id==='outro'?local%4===0:local%2===0);
  if(!pluck&&!line&&local%2===0){
   const held=Math.min(bpb*1.8,endBeat-base);
   add('pad',pitchFor(root,scale,rootDegree,3),base,held,.2+.08*level);
  }
  if(pluck&&!line&&(id!=='break'||local%2===0)){
   add('arp',pitchFor(root,scale,[0,7,3,10][bar%4],5),base+.5,.16,.28+.08*level);
   add('arp',pitchFor(root,scale,[7,3,10,0][bar%4],5),base+2.5,.14,.22+.06*level);
  }
  if(line){
   const motif=(id==='drop-1'?hook:answer).filter((_,index)=>index%4===0),span=Math.min(bpb,Math.max(bpb*.5,endBeat-base)),grid=span/Math.max(1,motif.length),octave=(input.pattern==='bassline'?4:5)+(id==='drop-2'&&input.hookLift?1:0)+(id==='outro'?-1:0),gain=(id==='outro'?0.62:1)*(.4+.16*level);
   for(let i=0;i<motif.length;i++){
    const start=base+i*grid;if(start>=endBeat||start>=total)break;
    add('lead',pitchFor(root,scale,motif[i]+rootDegree,octave),start,Math.min(Math.max(.3,grid*.82),endBeat-start),gain);
   }
  }
 }
 notes.sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
 return {...input,prompt,bars,bpm,keyRoot:rootName,seed,beatsPerBar:bpb,notes};
}
export function keepMusicParts(previous:MusicNote[],fresh:MusicNote[],keep:Array<MusicNote['part']>,sourceBars:number,targetBars:number,beatsPerBar:number){
 if(!keep.length)return fresh.slice();
 const source=Math.max(1,Math.trunc(sourceBars))*beatsPerBar,target=Math.max(1,Math.trunc(targetBars))*beatsPerBar,kept:MusicNote[]=[];
 for(let offset=0;offset<target;offset+=source)for(const note of previous){if(!keep.includes(note.part))continue;const start=note.start+offset;if(start<0||start>=target)continue;kept.push({...note,start,length:Math.min(note.length,target-start)});}
 return [...kept,...fresh.filter(note=>!keep.includes(note.part))].sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
export function rewriteTail(previous:MusicNote[],fresh:MusicNote[],fromBeat:number,totalBeats:number){
 const head=previous.filter(note=>note.start<fromBeat).map(note=>({...note,length:Math.min(note.length,Math.max(.05,fromBeat-note.start))}));
 const tail=fresh.filter(note=>note.start>=fromBeat&&note.start<totalBeats);
 return [...head,...tail].sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
export function matchPlaybackGain(a:number,b:number){if(!(a>0)||!(b>0))return {a:1,b:1};const target=Math.min(a,b);return {a:Math.min(1,target/a),b:Math.min(1,target/b)};}
function bufferRms(buffer:AudioBuffer){const data=buffer.getChannelData(0);let sum=0;for(let i=0;i<data.length;i++)sum+=data[i]*data[i];return Math.sqrt(sum/Math.max(1,data.length));}

export function composeNotes(prompt:string,bpm:number,bars:number){
 const session=composeMusicSession({prompt,bpm,keyRoot:'F',scale:'minor',bars,timeSignature:'4/4',genre:'dark-minimal',mood:'hypnotic',pattern:'pulse',arrangement:'loop',synthPreset:'dark-pulse'});
 return {notes:session.notes,bpm:session.bpm,bars:session.bars};
}

function presetVoice(preset:MusicSynthPreset,part:MusicNote['part']){
 const base={type:'triangle' as OscillatorType,cutoff:1800,attack:.008,release:.12};
 if(part==='bass')return {type:'sine' as OscillatorType,cutoff:700,attack:.006,release:.16};
 if(part==='pad'||preset==='warm-pad')return {type:'sine' as OscillatorType,cutoff:1200,attack:.08,release:.45};
 if(preset==='glass')return {type:'sine' as OscillatorType,cutoff:4200,attack:.004,release:.28};
 if(preset==='sub')return {type:'sine' as OscillatorType,cutoff:620,attack:.006,release:.2};
 if(preset==='acid')return {type:'sawtooth' as OscillatorType,cutoff:2200,attack:.004,release:.09};
 return base;
}
function waveformPeaks(buffer:AudioBuffer,points=192){const data=buffer.getChannelData(0),out:number[]=[];for(let p=0;p<points;p++){const a=Math.floor(p*data.length/points),b=Math.max(a+1,Math.floor((p+1)*data.length/points));let peak=0;for(let i=a;i<b;i++)peak=Math.max(peak,Math.abs(data[i]));out.push(peak);}return out;}
function shotBuffer(ctx:BaseAudioContext,seconds:number,write:(data:Float32Array,sampleRate:number)=>void){const length=Math.max(1,Math.floor(ctx.sampleRate*seconds)),buffer=ctx.createBuffer(1,length,ctx.sampleRate);write(buffer.getChannelData(0),ctx.sampleRate);return buffer;}
export function kickFundamentalHz(rootName:string){const root=KEY_ROOTS.indexOf(rootName as typeof KEY_ROOTS[number]);if(root<0)return 55;let best=55,distance=Infinity;for(let midi=24+root;midi<=60;midi+=12){const hz=440*2**((midi-69)/12);if(hz<40||hz>70)continue;const next=Math.abs(hz-55);if(next<distance){best=hz;distance=next;}}return best;}
function kickShot(ctx:BaseAudioContext,seed:number,fundamental:number){const fund=Math.max(40,Math.min(70,fundamental)),clickHz=1700+(seed%180);return shotBuffer(ctx,.4,(data,rate)=>{let sub=0,body=0,click=0;for(let i=0;i<data.length;i++){const t=i/rate,bodyHz=150*Math.exp(-t/.04)+fund;sub+=2*Math.PI*fund/rate;body+=2*Math.PI*bodyHz/rate;click+=2*Math.PI*clickHz/rate;const clickAmp=t<.014?Math.exp(-t/.0028):0;data[i]=Math.tanh(Math.sin(sub)*Math.exp(-t/.13)*.95+Math.sin(body)*Math.exp(-t/.05)*.78+Math.sin(click)*clickAmp*.55);}});}
function clapShot(ctx:BaseAudioContext,seed:number){return shotBuffer(ctx,.18,(data,rate)=>{let state=seed>>>0;for(let i=0;i<data.length;i++){const t=i/rate;state=(Math.imul(state,1664525)+1013904223)>>>0;const noise=(state/4294967296)*2-1;let burst=0;for(const at of [0,.011,.024])if(t>=at&&t<at+.04)burst+=Math.exp(-(t-at)/.018);data[i]=noise*Math.min(1,burst)*.7;}});}
function metalShot(ctx:BaseAudioContext,seed:number,seconds:number,grow=false){return shotBuffer(ctx,seconds,(data,rate)=>{const partials=[6400,8600,10900,13400];const phases=partials.map(()=>0);let state=seed>>>0;for(let i=0;i<data.length;i++){const t=i/rate,env=grow?Math.min(1,t/Math.max(.05,seconds)):Math.exp(-t/(seconds*.32));state=(Math.imul(state,1664525)+1013904223)>>>0;let y=((state/4294967296)*2-1)*.4;partials.forEach((hz,index)=>{phases[index]+=2*Math.PI*hz/rate;y+=Math.sin(phases[index])*.2;});data[i]=y*env;}});}
function tomShot(ctx:BaseAudioContext,hz:number){return shotBuffer(ctx,.22,(data,rate)=>{let phase=0;for(let i=0;i<data.length;i++){const t=i/rate,freq=hz*(1+2.2*Math.exp(-t/.04));phase+=2*Math.PI*freq/rate;data[i]=Math.sin(phase)*Math.exp(-t/.08);}});}
function scheduleDrums(ctx:OfflineAudioContext,session:ResolvedMusicSession,beat:number,master:GainNode,side:GainNode,stem:MusicStem){
 const totalBeats=session.bars*session.beatsPerBar,kickEvery=session.genre==='ambient'?2:1,ranges=session.story?.length?blockRanges(session.story):[];
 const sectionAt=(bar:number)=>ranges.find(section=>bar>=section.from&&bar<section.to);
 const kick=kickShot(ctx,session.seed,kickFundamentalHz(session.keyRoot)),clap=clapShot(ctx,session.seed+9),hat=metalShot(ctx,session.seed+3,.07),openHat=metalShot(ctx,session.seed+5,.22),ride=metalShot(ctx,session.seed+7,.16),crash=metalShot(ctx,session.seed+11,.7),reverse=metalShot(ctx,session.seed+13,.9,true),shaker=metalShot(ctx,session.seed+15,.05),tomLow=tomShot(ctx,140),tomHigh=tomShot(ctx,210),down=metalShot(ctx,session.seed+19,.4);
 const play=(buffer:AudioBuffer,when:number,gainValue:number)=>{const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;gain.gain.setValueAtTime(Math.max(.001,gainValue),when);gain.gain.exponentialRampToValueAtTime(.001,when+buffer.duration);src.connect(gain);gain.connect(master);src.start(when);src.stop(when+buffer.duration+.01);};
 for(let beatIndex=0;beatIndex<Math.floor(totalBeats);beatIndex+=kickEvery){
  const bar=Math.floor(beatIndex/session.beatsPerBar),beatInBar=beatIndex%session.beatsPerBar,level=arrangementLevel(session.arrangement,bar,session.bars,session.introBars,session.story),section=sectionAt(bar);
  if(level<=0)continue;
  const songBar=bar+(session.renderOrigin??0),swing=beatInBar%2===1?beat*sectionSwing(section?.id):0,t=beatIndex*beat+swing,inBreak=section?.id==='break';
  const nextDrop=ranges.find(item=>item.from===bar+1&&(item.id==='drop-1'||item.id==='drop-2'));
  const beforeDrop=(session.riser&&bar===session.bars-1)||(!session.riser&&!!nextDrop);
  const boundary=!!section&&songBar>0&&bar===section.from&&beatInBar===0;
  if(boundary){play(crash,beatIndex*beat,.22*Math.max(level,.45));play(down,beatIndex*beat+beat,.16*Math.max(level,.4));}
  if(beforeDrop&&beatInBar===0)play(reverse,beatIndex*beat,.2*Math.max(level,.4));
  if(inBreak)continue;
  const hole=beforeDrop&&beatInBar===session.beatsPerBar-1;
  if(!hole)play(kick,t,1.15*Math.max(level,.85));
  if(stem==='mix'&&!hole){const duck=sidechainDepth(section?.id),release=Math.min(.16,beat*.75);side.gain.setValueAtTime(1,t);side.gain.linearRampToValueAtTime(duck,t+Math.min(.02,release*.4));side.gain.linearRampToValueAtTime(1,t+release);}
  const zone=section?.id??(session.arrangement==='loop'?'loop':bar<session.bars*.25?'intro':bar<session.bars*.5?'rise':bar<session.bars*.75?'drop-1':'drop-2');
  const clapBeats=session.beatsPerBar>=4?[1,3]:[1];
  const hats=zone==='rise'||zone==='drop-1'||zone==='drop-2'||zone==='loop';
  if((zone==='drop-1'||zone==='drop-2'||zone==='loop')&&clapBeats.includes(beatInBar))play(clap,t,.42*level);
  if(hats&&beatInBar%2===1)play(hat,t,zone==='loop'?0.3:.28*level);
  if((zone==='drop-1'||zone==='drop-2'||zone==='loop')&&beatInBar===2){play(openHat,t,.26*level);if(zone!=='loop')play(ride,t,.1*level);}
  if(hats&&zone!=='loop'&&beatInBar%2===0)play(hat,t+beat*.5,.12*level);
  if((zone==='rise'||zone==='drop-1'||zone==='drop-2')&&beatInBar%2===0)play(shaker,t+beat*.5,.14*level);
  const lastBeat=beatInBar===session.beatsPerBar-1,fill16=(songBar+1)%16===0,fill8=(songBar+1)%8===0;
  if(lastBeat&&!hole&&(fill16||fill8)){const steps=fill16?8:4;for(let step=0;step<steps;step++)play(step%2?tomHigh:tomLow,t+step*beat/steps,.24*level);}
 }
}
function scheduleSpoken(ctx:OfflineAudioContext,session:ResolvedMusicSession,spoken:SpokenLine,beat:number,side:GainNode){
 if(!spoken.slices.length||session.arrangement!=='section-story'||!session.story?.length)return;
 const makeBuffer=(line:SpokenLine)=>{const audio=ctx.createBuffer(1,line.samples.length,line.rate);audio.copyToChannel(new Float32Array(line.samples),0);return audio;};
 const mainBuffer=makeBuffer(spoken),replyBuffer=spoken.reply?makeBuffer(spoken.reply):null;
 const bus=ctx.createGain(),hp=ctx.createBiquadFilter(),delay=ctx.createDelay(1.5),feedback=ctx.createGain(),wet=ctx.createGain();
 hp.type='highpass';hp.frequency.value=250;delay.delayTime.value=Math.min(1.2,beat*.75);feedback.gain.value=.28;wet.gain.value=.32;
 bus.connect(hp);hp.connect(side);hp.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(side);
 const breath=shotBuffer(ctx,.07,(data,rate)=>{let state=session.seed>>>0;for(let i=0;i<data.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;const t=i/rate;data[i]=((state/4294967296)*2-1)*Math.sin(Math.PI*Math.min(1,t/.07))*.2;}});
 const scale=SCALE_INTERVALS[session.scale],root=KEY_ROOTS.indexOf(session.keyRoot as typeof KEY_ROOTS[number]),hook=hookDegrees(session.seed);
 if(root<0)return;
 const play=(line:SpokenLine,audio:AudioBuffer,when:number,sliceIndex:number,pitch:number,gain:number,support=false)=>{const slice=line.slices[sliceIndex%line.slices.length];if(!slice)return;const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=audio;src.playbackRate.value=Math.max(.5,Math.min(2,(440*2**((pitch-69)/12))/140));g.gain.setValueAtTime(Math.max(.0001,gain),Math.max(0,when));src.connect(g);g.connect(bus);src.start(Math.max(0,when),slice.from/line.rate,Math.max(.05,(slice.to-slice.from)/line.rate));if(!support&&sliceIndex===0){const air=ctx.createBufferSource(),airGain=ctx.createGain();air.buffer=breath;airGain.gain.value=gain*.35;air.connect(airGain);airGain.connect(bus);air.start(Math.max(0,when-.06));}if(!support){const twin=ctx.createBufferSource(),twinGain=ctx.createGain();twin.buffer=audio;twin.playbackRate.value=src.playbackRate.value;twinGain.gain.value=gain*.42;twin.connect(twinGain);twinGain.connect(bus);twin.start(Math.max(0,when+.022),slice.from/line.rate,Math.max(.05,(slice.to-slice.from)/line.rate));}};
 for(const section of blockRanges(session.story)){
  if(section.muted)continue;
  const line=section.id==='drop-2'&&spoken.reply?spoken.reply:spoken,audio=line===spoken.reply&&replyBuffer?replyBuffer:mainBuffer;
  const gain=section.id==='break'?0.26:section.id==='drop-2'?0.24:section.id==='drop-1'?0.2:section.id==='outro'?0.1:section.id==='rise'?0.07:0.04;
  if(section.id==='intro'){play(line,audio,Math.max(section.from,section.to-1)*session.beatsPerBar*beat,line.slices.length-1,pitchFor(root,scale,hook[0]??0,5),gain);continue;}
  if(section.id==='rise'){play(line,audio,Math.max(section.from,section.to-2)*session.beatsPerBar*beat,0,pitchFor(root,scale,hook[0]??0,5),gain);continue;}
  for(let bar=section.from;bar<section.to;bar+=4){const rootDegree=[0,5,3,6][bar%4]??0,fade=section.id==='outro'?gain*(1-(bar-section.from)/Math.max(1,section.to-section.from)):gain,when=(index:number)=>(bar*session.beatsPerBar+session.beatsPerBar*index/line.slices.length)*beat,pitch=(index:number)=>pitchFor(root,scale,(hook[index%hook.length]??0)+rootDegree,5);line.slices.forEach((_,index)=>{play(line,audio,when(index),index,pitch(index),fade);if(section.id==='drop-2')play(line,audio,when(index),index,pitch(index)+7,fade*.22,true);});}
 }
}
function stereoBuffer(source:AudioBuffer){const copy=new OfflineAudioContext(2,source.length,source.sampleRate).createBuffer(2,source.length,source.sampleRate);copy.copyToChannel(new Float32Array(source.getChannelData(0)),0);copy.copyToChannel(new Float32Array(source.getChannelData(1)),1);return copy;}
const PRINT_PAIRS:[number,string,string][]=[[2,'drums','ударные'],[4,'bass','бас'],[6,'pad','аккорды'],[8,'lead','мелодия'],[10,'arp','арпеджио'],[12,'vocal','фраза']];
async function printedStems(source:AudioBuffer,heard:AudioBuffer,raw:boolean):Promise<PrintedStem[]>{const stems=PRINT_PAIRS.map(([channel,stem,name])=>({stem,name,left:source.getChannelData(channel).slice(),right:source.getChannelData(channel+1).slice()}));if(raw)return stems;const {bounceToMaster}=await import('./music-pro');const left=bounceToMaster(stems.map(item=>item.left),heard.getChannelData(0)),right=bounceToMaster(stems.map(item=>item.right),heard.getChannelData(1));return stems.map((item,index)=>({...item,left:left[index]!,right:right[index]!}));}
function bouncePrints(chunks:PrintedStem[][],order:Array<{id:string}>,heard:AudioBuffer,concat:(order:Array<{id:string}>,slices:Array<{id:string;bars:number;left:Float32Array;right:Float32Array}>,fade:number)=>{left:Float32Array;right:Float32Array},bounce:(stems:Float32Array[],master:Float32Array)=>Float32Array[]){const mixed=chunks[0]!.map((_,stem)=>concat(order,chunks.map((chunk,index)=>({id:order[index]!.id,bars:1,left:chunk[stem]!.left,right:chunk[stem]!.right})),128));const left=bounce(mixed.map(item=>item.left),heard.getChannelData(0)),right=bounce(mixed.map(item=>item.right),heard.getChannelData(1));return chunks[0]!.map((item,index)=>({stem:item.stem,name:item.name,left:left[index]!,right:right[index]!}));}
async function renderStoryChunks(input:MusicInput,notes:MusicNote[]|undefined,vocal:SpokenLine|null|undefined,options:MusicRenderOptions|undefined){
 const composed=composeMusicSession(input),session=notes?{...composed,notes}:composed,ranges=blockRanges(input.story??[]),sections:RenderedSection[]=[],chunkPrints:PrintedStem[][]=[];
 for(let index=0;index<ranges.length;index++){
  options?.signal?.throwIfAborted();
  const block=ranges[index]!;
  options?.onProgress?.(block.label,index+1,ranges.length);
  await new Promise(resolve=>setTimeout(resolve,16));
  const from=block.from*session.beatsPerBar,to=block.to*session.beatsPerBar,bars=Math.max(1,block.to-block.from);
  const shifted=session.notes.filter(note=>note.start>=from&&note.start<to).map(note=>({...note,start:note.start-from,length:Math.min(note.length,to-note.start)}));
  const next=ranges[index+1],partial:MusicInput={...input,bars,bpm:session.bpm,keyRoot:session.keyRoot,seed:session.seed,renderOrigin:block.from,riser:next?.id==='drop-1'||next?.id==='drop-2',story:[{id:block.id,label:block.label,bars,level:block.level}]};
  const rendered=await renderMusicSession(partial,shifted,'mix',vocal,{...options,single:true,raw:true,tail:index===ranges.length-1});
  const left=rendered.buffer.getChannelData(0).slice(),right=rendered.buffer.getChannelData(1).slice();
  sections.push({id:block.id,bars,left,right});
  if(rendered.prints)chunkPrints.push(rendered.prints);
 }
 const {bounceToMaster,concatSlices}=await import('./music-pro');
 const mixed=concatSlices(ranges.map(block=>({id:block.id})),sections,128);
 const ctx=new OfflineAudioContext(2,mixed.left.length,44100),buffer=ctx.createBuffer(2,mixed.left.length,44100);
 buffer.copyToChannel(new Float32Array(mixed.left),0);buffer.copyToChannel(new Float32Array(mixed.right),1);
 const reading=await readMaster(buffer,vocal?.phrase??'—');
 const prints=chunkPrints.length===ranges.length&&chunkPrints[0]?bouncePrints(chunkPrints,ranges.map(block=>({id:block.id})),buffer,concatSlices,bounceToMaster):undefined;
 return {wav:wave(buffer),midi:midi(session),seconds:mixed.left.length/44100,waveform:waveformPeaks(buffer),session,rms:bufferRms(buffer),master:reading,buffer,sections,prints};
}
export async function renderMusicSession(input:MusicInput,notes?:MusicNote[],stem:MusicStem='mix',vocal?:SpokenLine|null,options?:MusicRenderOptions){
 options?.signal?.throwIfAborted();
 if(!options?.single&&stem==='mix'&&(input.story?.length??0)>1&&input.bars>32)return renderStoryChunks(input,notes,vocal,options);
 const composed=composeMusicSession(input),session=notes?{...composed,notes}:composed,played=stem==='vocal'?[]:stem==='mix'||stem==='drums'?session.notes:session.notes.filter(note=>note.part===stem),beat=60/session.bpm,totalBeats=session.bars*session.beatsPerBar,duration=totalBeats*beat+(options?.tail===false?0.05:1);
 const frames=Math.ceil(duration*44100);let ctx:OfflineAudioContext;try{ctx=new OfflineAudioContext(options?.print&&stem==='mix'?14:2,frames,44100);if(options?.print&&stem==='mix'&&ctx.destination.channelCount<14)throw Error(`print-channels-${ctx.destination.channelCount}`);}catch(error){if(!options?.print)throw error;try{ctx=new OfflineAudioContext(2,frames,44100);}catch(fallback){throw Error(`print-fail ${error instanceof Error?error.message:error} | ${fallback instanceof Error?fallback.message:fallback}`);}}
 const printing=ctx.destination.channelCount>=14,master=ctx.createGain(),side=ctx.createGain();
 const drumBus=ctx.createGain(),bassBus=ctx.createGain(),padBus=ctx.createGain(),leadBus=ctx.createGain(),arpBus=ctx.createGain(),vocalBus=ctx.createGain();
 if(printing){drumBus.connect(master);bassBus.connect(side);padBus.connect(side);leadBus.connect(side);arpBus.connect(side);vocalBus.connect(side);}
 const lowShelf=ctx.createBiquadFilter(),highShelf=ctx.createBiquadFilter(),drive=ctx.createGain(),clip=ctx.createWaveShaper();
 const low=ctx.createBiquadFilter(),high=ctx.createBiquadFilter(),split=ctx.createChannelSplitter(2),mono=ctx.createGain(),merge=ctx.createChannelMerger(2);
 const curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*2.3)/Math.tanh(2.3);}clip.curve=curve;clip.oversample='2x';
 master.gain.value=.7;side.gain.value=1;drive.gain.value=1.7;
 lowShelf.type='lowshelf';lowShelf.frequency.value=90;lowShelf.gain.value=1.2;highShelf.type='highshelf';highShelf.frequency.value=7000;highShelf.gain.value=5.5;
 low.type='lowpass';low.frequency.value=100;high.type='highpass';high.frequency.value=100;mono.gain.value=.5;
 side.connect(master);master.connect(lowShelf);lowShelf.connect(highShelf);highShelf.connect(drive);drive.connect(clip);clip.connect(low);clip.connect(high);low.connect(split);split.connect(mono,0);split.connect(mono,1);mono.connect(merge,0,0);mono.connect(merge,0,1);
 if(printing){const out=ctx.createGain();out.channelCount=2;out.channelCountMode='explicit';out.channelInterpretation='discrete';merge.connect(out);high.connect(out);const outSplit=ctx.createChannelSplitter(2);out.connect(outSplit);outSplit.connect(ctx.destination,0,0);outSplit.connect(ctx.destination,1,1);const tap=(bus:GainNode,channel:number)=>{bus.channelCount=2;bus.channelCountMode='explicit';bus.channelInterpretation='speakers';const splitter=ctx.createChannelSplitter(2);bus.connect(splitter);splitter.connect(ctx.destination,0,channel);splitter.connect(ctx.destination,1,channel+1);};tap(drumBus,2);tap(bassBus,4);tap(padBus,6);tap(leadBus,8);tap(arpBus,10);tap(vocalBus,12);}else{merge.connect(ctx.destination);high.connect(ctx.destination);}
 const space=ctx.createGain(),near=ctx.createDelay(1.2),far=ctx.createDelay(1.2),spaceFeedback=ctx.createGain(),room=ctx.createConvolver();
 near.delayTime.value=Math.min(.5,beat*.375);far.delayTime.value=Math.min(.9,beat*.75);spaceFeedback.gain.value=.22;
 const impulseLength=Math.floor(ctx.sampleRate*1.1),impulse=ctx.createBuffer(2,impulseLength,ctx.sampleRate);let impulseState=session.seed>>>0;
 for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<impulseLength;i++){impulseState=(Math.imul(impulseState,1664525)+1013904223)>>>0;data[i]=((impulseState/4294967296)*2-1)*(1-i/impulseLength)**3*.35;}}
 room.buffer=impulse;space.connect(near);space.connect(far);near.connect(spaceFeedback);far.connect(spaceFeedback);spaceFeedback.connect(far);far.connect(room);near.connect(room);room.connect(master);
 const ranges=session.story?.length?blockRanges(session.story):[],bassCurve=new Float32Array(256);for(let i=0;i<256;i++){const x=i/127.5-1;bassCurve[i]=Math.tanh(x*2.4)/Math.tanh(2.4);}
 const tone=options?.tone??null,cycleBuffer=(cycle:FileTone['bass'])=>{const rate=Math.max(8000,Math.round(cycle.fund*cycle.samples.length)),buffer=ctx.createBuffer(1,cycle.samples.length,rate);buffer.copyToChannel(new Float32Array(cycle.samples),0);return buffer;};
 const bassCycle=tone?cycleBuffer(tone.bass):null,bodyCycle=tone?cycleBuffer(tone.body):null;
 if(stem!=='drums'&&stem!=='vocal')for(const n of played){
  const voice=presetVoice(session.synthPreset,n.part),bar=Math.floor(n.start/session.beatsPerBar),section=ranges.find(item=>bar>=item.from&&bar<item.to),pos=section?(bar-section.from)/Math.max(1,section.to-section.from):0;
  const bassOff=n.part==='bass'&&Math.abs((n.start%1)-.5)<.02,otherOff=(n.part==='lead'||n.part==='arp')&&Math.floor(n.start)%2===1,swing=bassOff||otherOff?beat*sectionSwing(section?.id):0,t=n.start*beat+swing,end=t+n.length*beat,cycle=tone?(n.part==='bass'?tone.bass:tone.body):null,taken=cycle?(n.part==='bass'?bassCycle:bodyCycle):null,o=taken?null:ctx.createOscillator(),src=taken?ctx.createBufferSource():null,g=ctx.createGain(),f=ctx.createBiquadFilter();
  const freq=440*2**((n.pitch-69)/12);
  if(o){o.type=n.part==='bass'||n.part==='pad'?'sine':'sawtooth';o.frequency.value=freq;if(session.synthPreset==='glass'&&n.part!=='bass'&&n.part!=='pad')o.detune.value=(n.pitch%2?5:-5);o.connect(f);}
  if(src&&taken&&cycle){src.buffer=taken;src.loop=true;src.playbackRate.value=Math.max(.25,Math.min(4,freq/cycle.fund));src.connect(f);}
  let cutoff=taken?(n.part==='pad'?1800:n.part==='arp'?3200:n.part==='lead'?4200:900):n.part==='pad'?1100:n.part==='arp'?2400:n.part==='lead'?3600:voice.cutoff;
  if(!taken&&section&&n.part==='lead')cutoff=section.id==='drop-2'?5200:section.id==='drop-1'?4200:1800;
  if(section?.id==='break'&&n.part==='arp')cutoff=1600+pos*1800;
  const open=n.part==='arp'?0.08:n.part==='lead'?0.42:0.18;
  f.type='lowpass';f.frequency.setValueAtTime(Math.max(140,cutoff*(taken?n.part==='bass'?0.7:0.55:n.part==='bass'?0.35:n.part==='pad'?0.45:0.28)),t);f.frequency.exponentialRampToValueAtTime(Math.max(180,n.part==='bass'?(taken?700:220):cutoff),Math.min(end,t+Math.max(.05,open)));f.Q.value=n.part==='arp'?11:n.part==='pad'?0.5:n.part==='lead'?1.2:.7;f.connect(g);g.connect(printing?n.part==='bass'?bassBus:n.part==='pad'?padBus:n.part==='arp'?arpBus:leadBus:side);
  if(!taken&&session.arrangement==='loop'&&(n.part==='lead'||n.part==='arp'||n.part==='pad')&&o){const twin=ctx.createOscillator();twin.type='sawtooth';twin.frequency.value=o.frequency.value;twin.detune.value=n.part==='pad'?-14:n.pitch%2?14:-14;twin.connect(f);twin.start(t);twin.stop(end+.02);if(n.part!=='pad'){const send=ctx.createGain();send.gain.value=n.part==='arp'||section?.id==='break'?0.16:section?.id==='drop-2'?0.34:0.18;g.connect(send);send.connect(section?.id==='break'?near:far);}}
  const stack=session.arrangement!=='loop'&&(n.part==='lead'||n.part==='arp'||n.part==='pad')?0.4:1,attack=n.part==='pad'?0.28:n.part==='arp'?0.004:n.part==='lead'?0.02:voice.attack,body=(n.part==='arp'?n.velocity*.28:n.part==='lead'?n.velocity*.62:n.velocity*.78)*stack,peak=Math.max(.001,n.velocity*stack);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+attack);g.gain.setValueAtTime(Math.max(.001,body),Math.max(t+attack,end-Math.min(voice.release,Math.max(.02,(end-t)*.4))));g.gain.exponentialRampToValueAtTime(.0001,end);if(src){src.start(t);src.stop(end+.02);}else o?.start(t),o?.stop(end+.02);
  if(!taken&&n.part==='bass'&&n.velocity>=.3&&o){const mid=ctx.createOscillator(),midGain=ctx.createGain(),midFilter=ctx.createBiquadFilter(),shape=ctx.createWaveShaper();mid.type='sine';mid.frequency.value=o.frequency.value*2;shape.curve=bassCurve;shape.oversample='2x';midFilter.type='lowpass';midFilter.frequency.setValueAtTime(180,t);const pluck=Math.min(end-.008,t+.03);if(pluck>t+.005){midFilter.frequency.exponentialRampToValueAtTime(420,pluck);midFilter.frequency.exponentialRampToValueAtTime(240,end);}mid.connect(midFilter);midFilter.connect(shape);shape.connect(midGain);midGain.connect(printing?bassBus:side);midGain.gain.setValueAtTime(.0001,t);midGain.gain.exponentialRampToValueAtTime(Math.max(.001,n.velocity*.16),t+Math.max(.008,voice.attack));midGain.gain.exponentialRampToValueAtTime(.0001,end);mid.start(t);mid.stop(end+.02);}
 }
 if(stem==='mix'||stem==='drums')scheduleDrums(ctx,session,beat,printing?drumBus:master,side,stem);
 if(stem==='mix'&&session.arrangement!=='loop'){const air=shotBuffer(ctx,Math.min(8,Math.max(.5,duration*.35)),(data,rate)=>{let state=(session.seed+23)>>>0;for(let i=0;i<data.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;data[i]=((state/4294967296)*2-1)*.35;}});const airFilter=ctx.createBiquadFilter(),airGain=ctx.createGain(),airSource=ctx.createBufferSource();airFilter.type='highpass';airFilter.frequency.value=7800;airGain.gain.value=.05;airSource.buffer=air;airSource.connect(airFilter);airFilter.connect(airGain);airGain.connect(printing?leadBus:master);const from=duration*.62;airSource.start(from);airSource.stop(Math.min(duration,from+air.duration));}
 if((stem==='mix'||stem==='vocal')&&vocal)scheduleSpoken(ctx,session,vocal,beat,printing?vocalBus:side);
 if(stem==='vocal'&&!vocal)throw Error('Фразы нет. Напиши «Фраза: …» или положи слова из Prose.');
 const renderedBuffer=await ctx.startRendering();
 const heard=printing?stereoBuffer(renderedBuffer):renderedBuffer;
 const reading=options?.raw?{integratedLufs:null,truePeakDbTP:null,low:null,mid:null,air:null,vocal:vocal?.phrase??'—',gainDb:0}:await readMaster(heard,vocal?.phrase??'—');
 let prints:PrintedStem[]|undefined;if(printing){try{prints=await printedStems(renderedBuffer,heard,options?.raw===true);}catch{prints=undefined;}}
 return {wav:wave(heard),midi:midi(session),seconds:duration,waveform:waveformPeaks(heard),session,rms:bufferRms(heard),master:reading,buffer:heard,sections:undefined as RenderedSection[]|undefined,prints};
}
export function wave(buffer:AudioBuffer){return wavFromChannels(Array.from({length:buffer.numberOfChannels},(_,channel)=>buffer.getChannelData(channel)),buffer.sampleRate);}
function variableLength(n:number){const bytes=[n&127];while(n>>=7)bytes.unshift((n&127)|128);return bytes;}
function midi(session:ResolvedMusicSession){const events:Array<{t:number;order:number;bytes:number[]}>=[],ticks=480;const channels:Record<MusicNote['part'],number>={lead:0,bass:1,pad:2,arp:3};for(const n of session.notes){const channel=channels[n.part],velocity=Math.round(clamp(n.velocity,0,1)*110);events.push({t:Math.round(n.start*ticks),order:1,bytes:[0x90|channel,n.pitch,velocity]},{t:Math.round((n.start+n.length)*ticks),order:0,bytes:[0x80|channel,n.pitch,0]});}events.sort((a,b)=>a.t-b.t||a.order-b.order);const tempo=Math.round(60000000/session.bpm),[num,denText]=session.timeSignature.split('/').map(Number),denPow=Math.round(Math.log2(denText));const data=[0,255,3,11,...[...'AZRAIL MUSIC'].map(c=>c.charCodeAt(0)),0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255,0,255,88,4,num,denPow,24,8];let last=0;for(const e of events){data.push(...variableLength(e.t-last),...e.bytes);last=e.t;}data.push(0,255,47,0);const n=data.length;return new Blob([new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255,...data])],{type:'audio/midi'});}

export async function analyzeAudio(file:File,signal?:AbortSignal){if(file.size>30*1024*1024)throw Error('Аудиофайл должен быть меньше 30 МБ.');signal?.throwIfAborted();const ctx=new AudioContext();try{const buffer=await ctx.decodeAudioData(await file.arrayBuffer());signal?.throwIfAborted();const {measurePCM}=await import('./audio-analysis');return await measurePCM(Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),buffer.sampleRate,signal);}finally{await ctx.close();}}
export async function renderVideo(title:string,canvas:HTMLCanvasElement,signal:AbortSignal){
 if(!('MediaRecorder'in window)||!canvas.captureStream)throw Error('Этот браузер не поддерживает запись видео Canvas.');
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error('Для WebM нужен браузер с поддержкой MediaRecorder.');
 canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d')!,stream=canvas.captureStream(24),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000}),chunks:BlobPart[]=[];
 return new Promise<Blob>((resolve,reject)=>{let raf=0;const start=performance.now();function clean(){cancelAnimationFrame(raf);stream.getTracks().forEach(t=>t.stop());signal.removeEventListener('abort',abort);}function abort(){if(recorder.state!=='inactive')recorder.stop();clean();reject(Error('Запись остановлена'));}
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{clean();if(!signal.aborted)resolve(new Blob(chunks,{type:mime}));};recorder.onerror=()=>{clean();reject(Error('Ошибка записи видео'));};signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
 const draw=()=>{const t=(performance.now()-start)/1000;ctx.fillStyle='#09090f';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#8360b0';for(let i=0;i<18;i++){const height=40+150*(.5+.5*Math.sin(t*1.2+i*.55));ctx.globalAlpha=.3+.7*i/18;ctx.fillRect(810+i*20,360-height/2,5,height);}ctx.globalAlpha=1;ctx.fillStyle='#b8a0d2';ctx.font='18px sans-serif';ctx.fillText('MNMLL PULSE / ORIGINAL MOTION',75,120);ctx.fillStyle='#f0e9f7';ctx.font='600 52px Arial, sans-serif';const lines=title.match(/.{1,23}(?:\s|$)|.{1,23}/g)??['Моя идея'];lines.slice(0,4).forEach((line,i)=>ctx.fillText(line.trim(),75,315+i*65,610));ctx.font='17px sans-serif';ctx.fillStyle='#a38ab8';ctx.fillText('AZRAIL × PULSE',75,625);if(t>=8){recorder.stop();return;}raf=requestAnimationFrame(draw);};recorder.start();draw();
 });
}
