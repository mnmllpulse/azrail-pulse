import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import type {StudioModuleContext} from '../ui/studio-types';

const windows:Window[]=[];
afterEach(()=>{for(const w of windows)w.close();windows.length=0;vi.unstubAllGlobals();});

function realm(){
 const w=new Window({url:'https://azrail-pulse.mnmllpulse.workers.dev/studios/audio',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 windows.push(w);
 vi.stubGlobal('window',w);
 vi.stubGlobal('document',w.document);
 vi.stubGlobal('HTMLElement',w.HTMLElement);
 vi.stubGlobal('Event',w.Event);
 vi.stubGlobal('File',w.File);
 vi.stubGlobal('DataTransfer',w.DataTransfer);
 return w;
}

describe('Audio Lab compact card',()=>{
 it('shows measured duration, rate and channels, and leaves BPM and key blank when they were not detected',async()=>{
  const w=realm();
  const {studioModule,fillAudioSummary}=await import('../ui/studio-modules/audio');
  const controls=w.document.createElement('div');
  const result=w.document.createElement('div');
  w.document.body.append(controls,result);
  const context={controls,result,account:null,mountDraft:()=>()=>{},current:()=>true,notice(){},failure(){},setLastBlob(){},setMediaCleanup(){}} as unknown as StudioModuleContext;
  studioModule.mount(context);
  expect(controls.querySelector('#audio-select')?.textContent).toBe('Открыть аудио');
  expect(controls.querySelector('#audio-result')?.hasAttribute('hidden')).toBe(true);
  expect(controls.innerHTML).not.toContain('~128');
  expect(controls.innerHTML).not.toContain('~-14');
  expect(controls.querySelector('.audio-note')?.textContent).toContain('громкость LUFS');
  expect(controls.querySelector('.audio-note')?.textContent).not.toContain('Integrated LUFS');
  fillAudioSummary(controls,{durationSeconds:3.26,sampleRate:44100,channels:2,bpm:null,detectedKey:null,integratedLufs:null,waveform:[{min:-0.2,max:0.4},{min:-0.1,max:0.2}]});
  expect(controls.querySelector('#a-dur')?.textContent).toBe('3.3 s');
  expect(controls.querySelector('#a-sr')?.textContent).toBe('44100 Hz');
  expect(controls.querySelector('#a-ch')?.textContent).toBe('2');
  expect(controls.querySelector('#a-lufs')?.textContent).toBe('—');
  expect(controls.querySelector('#a-bpm')?.textContent).toBe('—');
  expect(controls.querySelector('#a-key')?.textContent).toBe('—');
  fillAudioSummary(controls,{durationSeconds:3.26,sampleRate:44100,channels:2,bpm:null,detectedKey:null,integratedLufs:-12.34,waveform:[{min:-0.2,max:0.4},{min:-0.1,max:0.2}]});
  expect(controls.querySelector('#a-lufs')?.textContent).toBe('-12.3 LUFS');
  const run=vi.fn();
  (controls.querySelector('#studio-run') as HTMLButtonElement).onclick=run;
  const source=controls.querySelector<HTMLInputElement>('#studio-file')!;
  const reference=controls.querySelector<HTMLInputElement>('#audio-reference')!;
  const sourceTransfer=new w.DataTransfer();
  sourceTransfer.items.add(new w.File([new Uint8Array([1])],'take.wav'));
  source.files=sourceTransfer.files;
  const referenceTransfer=new w.DataTransfer();
  referenceTransfer.items.add(new w.File([new Uint8Array([2])],'ref.wav'));
  reference.files=referenceTransfer.files;
  reference.dispatchEvent(new w.Event('change'));
  expect(run).toHaveBeenCalled();
  expect(controls.querySelector('#audio-result')?.hasAttribute('hidden')).toBe(false);
  const canvas=controls.querySelector('canvas') as HTMLCanvasElement;
  expect(canvas.width).toBeGreaterThan(0);
  (controls.querySelector('#audio-clear') as HTMLButtonElement).click();
  expect(controls.querySelector('#audio-result')?.hasAttribute('hidden')).toBe(true);
  expect(controls.querySelector('#audio-name')?.textContent).toBe('Файл не выбран');
  expect(result.textContent).toContain('Audio Lab:');
 });
});
