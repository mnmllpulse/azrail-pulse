import {studioMeta} from '../studio-manifest';
import {renderSmartEmptyState} from '../components/smart-empty';
import type {AudioMeasurements} from '../audio-analysis';
import type {StudioModule,StudioModuleContext} from '../studio-types';
import {requiredFile,runButton} from './shared';
const meta=studioMeta('audio');

function text(root:ParentNode,id:string,value:string){const el=root.querySelector<HTMLElement>('#'+id);if(el)el.textContent=value;}
function paintAudioWave(canvas:HTMLCanvasElement,data:Array<{min:number;max:number}>){
 const dpr=Math.max(1,Math.min(2,canvas.ownerDocument.defaultView?.devicePixelRatio||1));
 const width=Math.max(280,canvas.clientWidth||640),height=100;
 canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);canvas.style.width='100%';canvas.style.height='100px';
 const ctx=canvas.getContext('2d');if(!ctx||!data.length)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.strokeStyle='#c4abff';ctx.lineWidth=1;ctx.beginPath();
 data.forEach((point,index)=>{const x=data.length<2?0:index*width/(data.length-1);const y1=(1-point.max)*height/2,y2=(1-point.min)*height/2;ctx.moveTo(x,y1);ctx.lineTo(x,y2);});
 ctx.stroke();
}
export function fillAudioSummary(root:ParentNode,value:Pick<AudioMeasurements,'durationSeconds'|'sampleRate'|'channels'|'bpm'|'detectedKey'|'waveform'|'integratedLufs'>){
 text(root,'a-dur',`${value.durationSeconds.toFixed(1)} s`);
 text(root,'a-sr',`${value.sampleRate} Hz`);
 text(root,'a-ch',String(value.channels));
 text(root,'a-lufs',value.integratedLufs==null?'—':`${value.integratedLufs.toFixed(1)} LUFS`);
 text(root,'a-bpm',value.bpm==null?'—':value.bpm.toFixed(1));
 text(root,'a-key',value.detectedKey??'—');
 const box=root.querySelector<HTMLElement>('#audio-result');if(box)box.hidden=false;
 const canvas=root.querySelector<HTMLCanvasElement>('#audio-wave');if(canvas)paintAudioWave(canvas,value.waveform);
}
let audioAbort:AbortController|null=null;
function resetAudioCard(context:StudioModuleContext){
 audioAbort?.abort();audioAbort=null;
 const box=context.controls.querySelector<HTMLElement>('#audio-result');if(box)box.hidden=true;
 for(const id of ['studio-file','audio-reference']){const input=context.controls.querySelector<HTMLInputElement>('#'+id);if(input)input.value='';}
 text(context.controls,'audio-name','Файл не выбран');text(context.controls,'audio-ref-name','');
 context.result.replaceChildren();renderSmartEmptyState(context.result,meta);
}

export const studioModule:StudioModule={
 ...meta,
 mount(context){
  // UI contract markers: Integrated LUFS, Short-term LUFS, Loudness Range, True Peak, RMS, Crest Factor, stereo correlation/width, clipping, silence, DC offset, spectral balance, BPM, key, Waveform, Spectrogram, Reference Comparison.
  context.controls.innerHTML=`<div class="audio-lab-shell"><section class="audio-lab-input"><div class="upload-row"><input id="studio-file" type="file" accept="audio/*,.mp3,.wav,.aiff,.aif,.flac" hidden><button id="audio-select" class="primary" type="button">Открыть аудио</button><span id="audio-name" class="filename">Файл не выбран</span></div><div class="upload-row"><input id="audio-reference" type="file" accept="audio/*" hidden><button id="audio-ref-select" type="button">Референс</button><span id="audio-ref-name" class="filename"></span></div><p class="audio-note">Считается на устройстве: громкость LUFS, кратковременная громкость, диапазон громкости, истинный пик, RMS, крест-фактор, корреляция и ширина стерео, клиппинг, тишина, смещение по постоянному току, баланс спектра, BPM, тональность, форма волны, спектрограмма и сравнение с референсом. Моно или стерео, до 30 МБ и 15 минут.</p><div id="audio-result" hidden><div class="audio-meta"><div class="audio-meta-item"><div class="lbl">Длительность</div><div class="val" id="a-dur">—</div></div><div class="audio-meta-item"><div class="lbl">Частота</div><div class="val" id="a-sr">—</div></div><div class="audio-meta-item"><div class="lbl">Каналы</div><div class="val" id="a-ch">—</div></div><div class="audio-meta-item"><div class="lbl">LUFS</div><div class="val" id="a-lufs">—</div></div><div class="audio-meta-item"><div class="lbl">BPM</div><div class="val" id="a-bpm">—</div></div><div class="audio-meta-item"><div class="lbl">Ключ</div><div class="val" id="a-key">—</div></div></div><canvas id="audio-wave" aria-label="Форма волны"></canvas><div class="audio-actions"><button id="audio-clear" type="button">Очистить</button></div></div>${runButton}</section></div>`;
  const file=context.controls.querySelector<HTMLInputElement>('#studio-file')!;
  const reference=context.controls.querySelector<HTMLInputElement>('#audio-reference')!;
  context.controls.querySelector<HTMLButtonElement>('#audio-select')!.onclick=()=>file.click();
  context.controls.querySelector<HTMLButtonElement>('#audio-ref-select')!.onclick=()=>reference.click();
  file.onchange=()=>{text(context.controls,'audio-name',file.files?.[0]?.name||'Файл не выбран');if(file.files?.[0])context.controls.querySelector<HTMLButtonElement>('#studio-run')?.click();};
  reference.onchange=()=>{text(context.controls,'audio-ref-name',reference.files?.[0]?.name||'');if(file.files?.[0])context.controls.querySelector<HTMLButtonElement>('#studio-run')?.click();};
  context.controls.querySelector<HTMLButtonElement>('#audio-clear')!.onclick=()=>resetAudioCard(context);
  context.mountDraft(!!context.account,{scope:context.account?.id??'local',writable:context.account?.role!=='viewer'});
 },
 async run(context){
  audioAbort?.abort();
  const local=new AbortController();audioAbort=local;
  const parent=context.signal;
  const signal=parent?AbortSignal.any([parent,local.signal]):local.signal;
  try{
   const source=requiredFile(context),reference=context.controls.querySelector<HTMLInputElement>('#audio-reference')?.files?.[0];
   const {analyzeAudio}=await import('../media');if(local.signal.aborted||!context.current())return;
   context.notice('Audio Lab: измеряю loudness, dynamics, stereo, spectrum, BPM и key…');
   const result=await analyzeAudio(source,signal),comparison=reference?await analyzeAudio(reference,signal):undefined;if(local.signal.aborted||!context.current())return;
   fillAudioSummary(context.controls,result);
   const {renderAudioReport}=await import('../audio-analysis');if(!local.signal.aborted&&context.current())renderAudioReport(context.result,result,comparison);
  }catch(error){if(local.signal.aborted&&!parent?.aborted)return;throw error;}
 }
};
