import type {StudioApi} from './studio-types';

export type ListenSource='pack'|'result';

export function mountListenPlayer(root:ParentNode,deps:{
 brief:()=>string;
 api:StudioApi;
 onStatus:(text:string)=>void;
 failure:(error:unknown)=>void;
 instrumental:()=>boolean;
 remember:(brief:string)=>void;
}){
 const doc=root.ownerDocument;
 if(!doc)return {load:async()=>{},setFacts(){},dispose(){}};
 const audio=doc.createElement('audio');
 audio.id='music-listen-audio';
 audio.preload='metadata';
 const host=root.querySelector<HTMLElement>('#music-listen');
 host?.prepend(audio);
 const canvas=root.querySelector<HTMLCanvasElement>('#music-listen-wave');
 const play=root.querySelector<HTMLButtonElement>('#music-listen-play');
 const time=root.querySelector<HTMLElement>('#music-listen-time');
 const volume=root.querySelector<HTMLInputElement>('#music-listen-volume');
 const facts=root.querySelector<HTMLElement>('#music-listen-facts');
 const sources=root.querySelector<HTMLElement>('#music-listen-sources');
 const packButton=root.querySelector<HTMLButtonElement>('#music-listen-pack');
 const resultButton=root.querySelector<HTMLButtonElement>('#music-listen-result');
 const copy=root.querySelector<HTMLButtonElement>('#music-listen-copy');
 const build=root.querySelector<HTMLButtonElement>('#music-listen-build');
 let peaks:number[]=[];
 let packUrl='';
 let resultUrl='';
 let active:ListenSource|''='';
 let frame=0;
 const clock=(seconds:number)=>{const whole=Math.max(0,Math.floor(seconds)||0);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;};
 const paint=()=>{
  const pen=canvas?.getContext('2d');if(!canvas||!pen)return;
  const width=canvas.width,height=canvas.height;
  pen.clearRect(0,0,width,height);
  pen.fillStyle='#15131c';pen.fillRect(0,0,width,height);
  const slot=width/Math.max(peaks.length,1);
  peaks.forEach((peak,index)=>{
   const bar=Math.max(2,peak*(height-18));
   pen.fillStyle='#c4abff';
   pen.fillRect(index*slot+1,(height-bar)/2,Math.max(1,slot-2),bar);
  });
  if(audio.duration&&Number.isFinite(audio.duration)){
   pen.fillStyle='#d7c4ff';
   pen.fillRect((audio.currentTime/audio.duration)*width,0,2,height);
  }
 };
 const tick=()=>{
  cancelAnimationFrame(frame);
  if(time)time.textContent=`${clock(audio.currentTime)} / ${clock(audio.duration)}`;
  paint();
  if(!audio.paused)frame=requestAnimationFrame(tick);
 };
 const draw=async(url:string)=>{
  peaks=[];
  try{
   const buffer=await fetch(url).then(response=>response.arrayBuffer());
   const context=new AudioContext();
   try{
    const decoded=await context.decodeAudioData(buffer.slice(0));
    const data=decoded.getChannelData(0);
    const bars=180;
    const step=Math.max(1,Math.floor(data.length/bars));
    for(let index=0;index<bars;index++){
     let peak=0;
     const start=index*step;
     for(let offset=0;offset<step;offset+=16)peak=Math.max(peak,Math.abs(data[start+offset]??0));
     peaks.push(peak);
    }
   }finally{await context.close();}
  }catch{peaks=[];}
  paint();
 };
 const show=(url:string,source:ListenSource)=>{
  active=source;
  if(sources)sources.hidden=!(packUrl&&resultUrl);
  packButton?.setAttribute('aria-pressed',String(active==='pack'));
  resultButton?.setAttribute('aria-pressed',String(active==='result'));
  audio.src=url;
  tick();
  return draw(url);
 };
 const load=(url:string,line:string,source:ListenSource)=>{
  if(source==='pack')packUrl=url;else resultUrl=url;
  if(facts)facts.textContent=line;
  return show(url,source);
 };
 play?.addEventListener('click',()=>{
  if(!audio.src){deps.onStatus('Сначала кинь трек или собери.');return;}
  if(audio.paused)void audio.play().catch(deps.failure);else audio.pause();
 });
 audio.addEventListener('play',()=>{if(play)play.textContent='Пауза';tick();});
 audio.addEventListener('pause',()=>{if(play)play.textContent='Слушать';tick();});
 audio.addEventListener('timeupdate',tick);
 volume?.addEventListener('input',()=>{audio.volume=Number(volume.value);});
 canvas?.addEventListener('click',event=>{
  if(!audio.duration||!Number.isFinite(audio.duration))return;
  const rect=canvas.getBoundingClientRect();
  const ratio=rect.width? (event.clientX-rect.left)/rect.width : 0;
  audio.currentTime=Math.min(audio.duration,Math.max(0,ratio*audio.duration));
  tick();
 });
 packButton?.addEventListener('click',()=>{if(packUrl)void show(packUrl,'pack');});
 resultButton?.addEventListener('click',()=>{if(resultUrl)void show(resultUrl,'result');});
 copy?.addEventListener('click',()=>{
  const prompt=deps.brief();
  deps.remember(prompt);
  const clip=navigator.clipboard?.writeText(prompt);
  if(!clip){deps.onStatus('Бриф на экране.');if(facts)facts.textContent=prompt;return;}
  void clip.then(()=>deps.onStatus('Бриф скопирован.')).catch(()=>{deps.onStatus('Бриф на экране.');if(facts)facts.textContent=prompt;});
 });
 if(build)build.onclick=()=>(async()=>{
  build.disabled=true;
  try{
   const prompt=deps.brief();
   deps.remember(prompt);
   deps.onStatus('Собираю у генератора. Длину он выбирает сам.');
   const result=await deps.api('/api/studio/music/generate',{method:'POST',body:JSON.stringify({prompt,instrumental:deps.instrumental()}),signal:AbortSignal.timeout(180000)});
   if(typeof result?.audioBase64!=='string'||!result.audioBase64)throw Error('Генератор вернул пустой файл.');
   const binary=atob(result.audioBase64);
   const bytes=new Uint8Array(binary.length);
   for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
   const blob=new Blob([bytes],{type:typeof result.mime==='string'?result.mime:'audio/mpeg'});
   if(resultUrl.startsWith('blob:'))URL.revokeObjectURL(resultUrl);
   const url=URL.createObjectURL(blob);
   await load(url,'Сборка ElevenLabs. Длина как вышла. Мелодия новая, пак был только картой.','result');
   deps.onStatus('Готово. Файл генератора в плеере.');
  }catch(error){
   deps.onStatus(error instanceof Error?error.message:'Сборка не дошла.');
   deps.failure(error);
  }finally{build.disabled=false;}
 })();
 return {load,setFacts(line:string){if(facts)facts.textContent=line;},dispose(){cancelAnimationFrame(frame);audio.pause();audio.removeAttribute('src');if(resultUrl.startsWith('blob:'))URL.revokeObjectURL(resultUrl);}};
}
