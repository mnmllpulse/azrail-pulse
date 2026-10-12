import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {inputFile,requiredFile,runButton} from './shared';
const meta=studioMeta('audio');
export const studioModule:StudioModule={
 ...meta,
 mount(context){
  context.controls.innerHTML=`<div class="audio-lab-shell"><section class="audio-lab-input"><p class="muted">Professional offline mastering analysis. Integrated LUFS, Short-term LUFS, Loudness Range, True Peak estimate, RMS, Crest Factor, stereo correlation/width, clipping, silence, DC offset, spectral balance, BPM, key, Waveform, Spectrogram and Reference Comparison.</p>${inputFile('audio/*')}<label for="audio-reference">Reference track <span class="muted">optional</span></label><input id="audio-reference" type="file" accept="audio/*"><p class="context-note">Файлы анализируются локально на устройстве: моно/стерео, до 30 МБ и 15 минут на файл. Ничего не загружается в Cloudflare без отдельного действия.</p>${runButton}</section></div>`;
  context.mountDraft(!!context.account,{scope:context.account?.id??'local',writable:context.account?.role!=='viewer'});
 },
 async run(context){
  const source=requiredFile(context),reference=context.controls.querySelector<HTMLInputElement>('#audio-reference')?.files?.[0];
  const {analyzeAudio}=await import('../media');if(!context.current())return;
  context.notice('Audio Lab: измеряю loudness, dynamics, stereo, spectrum, BPM и key…');
  const result=await analyzeAudio(source,context.signal),comparison=reference?await analyzeAudio(reference,context.signal):undefined;if(!context.current())return;
  const {renderAudioReport}=await import('../audio-analysis');if(context.current())renderAudioReport(context.result,result,comparison);
 }
};
