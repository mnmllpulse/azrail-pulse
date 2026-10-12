import { clamp } from '../src/shared/format';
export function download(blob:Blob,name:string){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function hash(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
const KEY_ROOTS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
const SCALE_INTERVALS={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10]} as const;
export type MusicGenre='dark-minimal'|'melodic-techno'|'ambient'|'industrial'|'cinematic';
export type MusicMood='hypnotic'|'driving'|'dark'|'euphoric'|'atmospheric';
export type MusicScale=keyof typeof SCALE_INTERVALS;
export type MusicTimeSignature='4/4'|'3/4'|'6/8';
export type MusicPattern='pulse'|'arpeggio'|'bassline'|'chords'|'ambient';
export type MusicArrangement='loop'|'intro-build-drop'|'minimal-evolution';
export type MusicSynthPreset='dark-pulse'|'warm-pad'|'glass'|'sub'|'acid';
export type MusicNote={pitch:number;start:number;length:number;velocity:number;part:'lead'|'bass'|'pad'|'arp'};
export type MusicInput={prompt:string;bpm:number|null;keyRoot:string;scale:MusicScale;bars:number;timeSignature:MusicTimeSignature;genre:MusicGenre;mood:MusicMood;pattern:MusicPattern;arrangement:MusicArrangement;synthPreset:MusicSynthPreset;seed?:number|null};
export type ResolvedMusicSession=Omit<MusicInput,'bpm'|'keyRoot'|'seed'> & {bpm:number;keyRoot:string;seed:number;beatsPerBar:number;notes:MusicNote[]};

function beatsPerBar(signature:MusicTimeSignature){return signature==='4/4'?4:3;}
function genreBpm(genre:MusicGenre,seed:number){const ranges:Record<MusicGenre,[number,number]>={
 'dark-minimal':[122,130],'melodic-techno':[120,128],ambient:[72,104],industrial:[126,138],cinematic:[84,118],
};const [a,b]=ranges[genre];return a+(seed%(b-a+1));}
function arrangementLevel(kind:MusicArrangement,bar:number,bars:number){
 if(kind==='loop')return 1;
 const x=bars<=1?1:bar/(bars-1);
 if(kind==='intro-build-drop')return x<.25?.52:x<.58?.72:x<.78?1:.9;
 return .62+.28*Math.sin((x+.1)*Math.PI);
}
function pitchFor(root:number,scale:readonly number[],degree:number,octave=4){const d=((degree%scale.length)+scale.length)%scale.length,oct=Math.floor(degree/scale.length);return 12*(octave+1)+root+scale[d]+12*oct;}
export function composeMusicSession(input:MusicInput):ResolvedMusicSession{
 const prompt=input.prompt.trim()||'Midnight pulse',bars=Math.trunc(input.bars);
 if(!Number.isInteger(bars)||bars<1||bars>16)throw Error('Длина 1–16 тактов.');
 const configSeed=hash(JSON.stringify({prompt,genre:input.genre,mood:input.mood,scale:input.scale,bars,timeSignature:input.timeSignature,pattern:input.pattern,arrangement:input.arrangement,synthPreset:input.synthPreset}));
 const seed=input.seed==null?configSeed&0x7fffffff:Math.trunc(input.seed);
 if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw Error('Seed должен быть от 0 до 2147483647.');
 let state=seed>>>0;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const bpm=input.bpm==null||input.bpm===0?genreBpm(input.genre,seed):Math.trunc(input.bpm);
 if(!Number.isInteger(bpm)||bpm<60||bpm>180)throw Error('BPM 60–180 или Auto.');
 const rootName=input.keyRoot==='auto'?KEY_ROOTS[seed%KEY_ROOTS.length]:input.keyRoot;
 const root=KEY_ROOTS.indexOf(rootName as typeof KEY_ROOTS[number]);if(root<0)throw Error('Некорректная тональность.');
 const scale=SCALE_INTERVALS[input.scale],bpb=beatsPerBar(input.timeSignature),total=bars*bpb,notes:MusicNote[]=[];
 const add=(part:MusicNote['part'],pitch:number,start:number,length:number,velocity:number)=>{if(start<0||start>=total)return;notes.push({part,pitch:clamp(Math.round(pitch),24,96),start,length:Math.min(length,total-start),velocity:clamp(velocity,.12,.95)});};
 for(let bar=0;bar<bars;bar++){
  const base=bar*bpb,level=arrangementLevel(input.arrangement,bar,bars),rootDegree=[0,5,3,6][bar%4];
  add('pad',pitchFor(root,scale,rootDegree,3),base,Math.max(.5,bpb-.08),.18+.14*level);
  for(let beat=0;beat<Math.ceil(bpb);beat++){
   if(base+beat>=total)break;
   const bassDegree=input.genre==='melodic-techno'&&beat===Math.floor(bpb-1)?2:rootDegree;
   add('bass',pitchFor(root,scale,bassDegree,2),base+beat,.42,.28+.25*level);
  }
  const grid=input.pattern==='ambient'?1:input.pattern==='chords'?bpb:input.pattern==='bassline'?.5:.5;
  const steps=Math.max(1,Math.floor(bpb/grid));
  for(let i=0;i<steps;i++){
   const start=base+i*grid;if(start>=total)break;
   const gate=input.pattern==='ambient'?.76:input.pattern==='chords'?Math.max(.5,bpb-.15):.32;
   const chance=input.pattern==='ambient'?.62:input.pattern==='chords'?1:.78*level+.08;
   if(rnd()>chance)continue;
   const degree=input.pattern==='arpeggio'?[0,2,4,6][i%4]+rootDegree:input.pattern==='bassline'?rootDegree+(i%2?2:0):rootDegree+Math.floor(rnd()*scale.length);
   const octave=input.pattern==='bassline'?3:input.pattern==='ambient'?4:4+(rnd()>.84?1:0);
   add(input.pattern==='arpeggio'?'arp':'lead',pitchFor(root,scale,degree,octave),start,gate,.28+rnd()*.35*level);
  }
 }
 notes.sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
 return {...input,prompt,bars,bpm,keyRoot:rootName,seed,beatsPerBar:bpb,notes};
}

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
export async function renderMusicSession(input:MusicInput){
 const session=composeMusicSession(input),beat=60/session.bpm,totalBeats=session.bars*session.beatsPerBar,duration=totalBeats*beat+1;
 const ctx=new OfflineAudioContext(2,Math.ceil(duration*44100),44100),master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
 master.gain.value=.3;compressor.threshold.value=-15;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.18;master.connect(compressor);compressor.connect(ctx.destination);
 for(const n of session.notes){const voice=presetVoice(session.synthPreset,n.part),o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter(),t=n.start*beat,end=t+n.length*beat;o.type=voice.type;o.frequency.value=440*2**((n.pitch-69)/12);if(session.synthPreset==='glass'&&n.part!=='bass')o.detune.value=(n.pitch%2?5:-5);f.type='lowpass';f.frequency.value=voice.cutoff;f.Q.value=session.synthPreset==='acid'?8:.8;o.connect(f);f.connect(g);g.connect(master);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,n.velocity),t+voice.attack);g.gain.setValueAtTime(Math.max(.001,n.velocity*.82),Math.max(t+voice.attack,end-voice.release));g.gain.exponentialRampToValueAtTime(.0001,end);o.start(t);o.stop(end+.02);}
 const kickEvery=session.genre==='ambient'?2:1;for(let beatIndex=0;beatIndex<Math.floor(totalBeats);beatIndex+=kickEvery){const bar=Math.floor(beatIndex/session.beatsPerBar),level=arrangementLevel(session.arrangement,bar,session.bars);if(level<.6&&beatIndex%2)continue;const t=beatIndex*beat,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(128,t);o.frequency.exponentialRampToValueAtTime(44,t+.12);g.gain.setValueAtTime(.55*level,t);g.gain.exponentialRampToValueAtTime(.001,t+.24);o.connect(g);g.connect(master);o.start(t);o.stop(t+.26);}
 const buffer=await ctx.startRendering();return {wav:wave(buffer),midi:midi(session),seconds:duration,waveform:waveformPeaks(buffer),session};
}
export async function renderMusic(prompt:string,bpm:number,bars:number){return renderMusicSession({prompt,bpm,keyRoot:'F',scale:'minor',bars,timeSignature:'4/4',genre:'dark-minimal',mood:'hypnotic',pattern:'pulse',arrangement:'loop',synthPreset:'dark-pulse'});}
export function wave(buffer:AudioBuffer){const channels=buffer.numberOfChannels,n=buffer.length,bytes=new ArrayBuffer(44+n*channels*2),v=new DataView(bytes);const text=(p:number,s:string)=>[...s].forEach((c,i)=>v.setUint8(p+i,c.charCodeAt(0)));text(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,bytes.byteLength-44,true);const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));for(let i=0;i<n;i++)for(let c=0;c<channels;c++){const x=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(44+(i*channels+c)*2,x*(x<0?32768:32767),true);}return new Blob([bytes],{type:'audio/wav'});}
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
