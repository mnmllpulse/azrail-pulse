import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import type {StudioModuleContext} from '../ui/studio-types';

const windows:Window[]=[];
afterEach(()=>{for(const w of windows)w.close();windows.length=0;vi.unstubAllGlobals();});

function realm(){
 const w=new Window({url:'https://azrail-pulse.mnmllpulse.workers.dev/studios/music',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 windows.push(w);
 vi.stubGlobal('window',w);
 vi.stubGlobal('document',w.document);
 vi.stubGlobal('HTMLElement',w.HTMLElement);
 vi.stubGlobal('Event',w.Event);
 vi.stubGlobal('File',w.File);
 return w;
}

const report={
 bpm:126,timeSignature:'4/4',keyRoot:'C',keyScale:'Whole Tone',
 locators:[{name:'Intro',timeBeats:0},{name:'Drop',timeBeats:64}],
 samples:[{name:'kick.wav',missing:false},{name:'gone.wav',missing:true}],
 roleSummary:{rhythm:1,bass:1,unknown:1},
 tracks:[
  {name:'Kick',role:'rhythm/kick',type:'midi',clipCount:1,volume:0.5,devices:[{name:'Compressor'}]},
  {name:'Sub',role:'bass/sub',type:'midi',clipCount:2,volume:null,devices:[]},
  {name:'Somebody',role:'unknown',type:'audio',clipCount:0},
 ],
 warnings:['BPM взят из Tempo/Manual.'],
};

describe('Music Studio Ableton result card',()=>{
 it('fills BPM, key, tracks, roles and locators, and hides them when another file is chosen',async()=>{
  const w=realm();
  const {studioModule}=await import('../ui/studio-modules/music');
  const controls=w.document.createElement('div');
  const result=w.document.createElement('div');
  w.document.body.append(controls,result);
  const api=vi.fn(async(path:string)=>{
   if(path==='/api/studio/als')return report;
   return {items:[]};
  });
  const context={
   meta:studioModule,controls,result,account:null,projectId:'',composer:w.document.createElement('form'),missionPanel:w.document.createElement('div'),
   api,blobAPI:vi.fn(),notice:vi.fn(),failure:vi.fn(),mountDraft:vi.fn(),setMediaCleanup:vi.fn(),setLastBlob:vi.fn(),current:()=>true,
  } as unknown as StudioModuleContext;
  await studioModule.mount(context);
  const card=controls.querySelector<HTMLElement>('#als-result')!;
  expect(card.hidden).toBe(true);
  expect(controls.querySelector('#als-bpm')?.textContent).toBe('—');
  expect(controls.querySelector('#als-analyze')).toBeNull();
  expect(controls.querySelector('#music-als-report')).toBeNull();
  expect(controls.querySelector<HTMLInputElement>('#music-als-file')?.hidden).toBe(true);
  expect(controls.querySelector('#music-parse-als')?.textContent).toBe('Открыть .als');
  const choose=(name:string)=>{
   const input=controls.querySelector<HTMLInputElement>('#music-als-file')!;
   const transfer=new w.DataTransfer();
   transfer.items.add(new w.File([new Uint8Array([1])],name));
   input.files=transfer.files;
   input.dispatchEvent(new w.Event('change'));
  };
  choose('set.als');
  await vi.waitFor(()=>expect(card.hidden).toBe(false));
  expect(controls.querySelector('#als-bpm')?.textContent).toBe('126');
  expect(controls.querySelector('#als-key')?.textContent).toBe('C Whole Tone');
  expect(controls.querySelector('#als-tracks')?.textContent).toBe('3');
  expect(controls.querySelector('#als-roles')?.textContent).toContain('rhythm: 1');
  expect(controls.querySelector('#als-roles')?.textContent).toContain('bass: 1');
  expect(controls.querySelector('#als-roles')?.textContent).toContain('unknown: 1');
  expect(controls.querySelector('#als-status')?.textContent).toBe('Анализ завершён');
  expect(controls.querySelector('#als-filename')?.textContent).toBe('set.als');
  expect(controls.querySelector('#als-size')?.textContent).toBe('0.00 MB');
  expect(controls.querySelector('#als-time')?.textContent).toBe('4/4');
  expect(controls.querySelector('#als-locators')?.textContent).toContain('0.0 — Intro');
  expect(controls.querySelector('#als-locators')?.textContent).toContain('64.0 — Drop');
  expect(controls.querySelector('#als-samples')?.textContent).toContain('kick.wav');
  expect(controls.querySelector('#als-samples')?.textContent).toContain('gone.wav · нет файла');
  expect(controls.querySelector('#als-recommendations')?.textContent).toContain('Sidechain на бас от кика');
  expect(controls.querySelector('#als-recommendations')?.textContent).toContain('Low cut ниже 30 Гц на мастер');
  expect(controls.querySelector('#als-recommendations')?.textContent).not.toContain('лимитер');
  expect(controls.querySelector('#als-recommendations')?.textContent).not.toContain('вокал');
  expect(controls.querySelector('#als-devices')?.textContent).toContain('Kick: Compressor');
  expect(controls.querySelector('#als-devices')?.textContent).not.toContain('Somebody');
  expect(controls.querySelector('#als-volumes')?.textContent).toContain('Kick: -4.6 dB');
  expect(controls.querySelector('#als-volumes')?.textContent).not.toContain('NaN');
  expect(controls.querySelector('#als-volumes')?.textContent).not.toContain('Sub');
  expect(controls.querySelector('#als-types')?.textContent).toContain('Somebody: audio');
  expect(controls.querySelector('#als-clips')?.textContent).toContain('Sub: 2');
  expect(controls.querySelector('#als-warnings')?.textContent).toContain('Предупреждения');
  expect(controls.querySelector('#als-warnings')?.textContent).toContain('BPM взят из Tempo/Manual.');
  expect(controls.querySelector('#music-apply-als')?.textContent).toBe('Перенести BPM и ключ');
  choose('next.als');
  await vi.waitFor(()=>expect(card.hidden).toBe(false));
  expect(controls.querySelector('#als-bpm')?.textContent).toBe('126');
  expect(api).toHaveBeenCalledTimes(2);
  const second=controls.querySelector<HTMLInputElement>('#music-als-file-2')!;
  const transfer=new w.DataTransfer();
  transfer.items.add(new w.File([new Uint8Array([2])],'other.als'));
  second.files=transfer.files;
  second.dispatchEvent(new w.Event('change'));
  await vi.waitFor(()=>expect(controls.querySelector<HTMLElement>('#compare-box')?.hidden).toBe(false));
  expect(controls.querySelector('#compare-box')?.textContent).toContain('next.als');
  expect(controls.querySelector('#compare-box')?.textContent).toContain('other.als');
  expect(controls.querySelector('#als-filename2-display')?.textContent).toBe('other.als');
  expect(controls.querySelector('#compare-box')?.textContent).toContain('Отличия');
  expect(controls.querySelector('#compare-box')?.textContent).toContain('Роли совпадают');
  expect(controls.querySelector('#compare-box')?.textContent).toContain('Сэмплы совпадают');
  expect(controls.querySelector('#compare-box')?.textContent).toContain('Устройства совпадают');
  expect(api).toHaveBeenCalledTimes(3);
  const writeText=vi.fn(async()=>'');
  vi.stubGlobal('navigator',{clipboard:{writeText}});
  (controls.querySelector<HTMLButtonElement>('#als-copy')!).click();
  await vi.waitFor(()=>expect(writeText).toHaveBeenCalledWith(['Файл: next.als','BPM: 126','Ключ: C Whole Tone','Размер: 4/4','Дорожек: 3','Роли:','rhythm: Kick','bass: Sub','unknown: Somebody','Структура:','0.0 — Intro','64.0 — Drop','Рекомендации:','Sidechain на бас от кика','Low cut ниже 30 Гц на мастер','Предупреждения:','BPM взят из Tempo/Manual.'].join('\n')));
  expect(controls.querySelector('#als-copy')?.textContent).toBe('Скопировано');
  const createObjectURL=vi.fn(()=>'blob:als');
  vi.stubGlobal('URL',{createObjectURL,revokeObjectURL:vi.fn()});
  (controls.querySelector<HTMLButtonElement>('#als-midi')!).click();
  const midiBlob=createObjectURL.mock.calls.at(-1)?.[0] as Blob;
  expect(midiBlob.type).toBe('audio/midi');
  const midiBytes=new Uint8Array(await midiBlob.arrayBuffer());
  expect(String.fromCharCode(...midiBytes.slice(0,4))).toBe('MThd');
  const tempo=Math.round(60000000/126).toString(16).padStart(6,'0');
  const midiHex=[...midiBytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  expect(midiHex).toContain(`ff5103${tempo}`);
  expect(midiHex).not.toContain('ff51030727de');
  expect(midiHex).toContain('ff580404021808');
  expect(midiHex).toContain('90');
  (controls.querySelector<HTMLButtonElement>('#als-export')!).click();
  expect(createObjectURL).toHaveBeenCalled();
  (controls.querySelector<HTMLButtonElement>('#als-clear')!).click();
  expect(card.hidden).toBe(true);
  expect(controls.querySelector<HTMLElement>('#compare-box')?.hidden).toBe(true);
  expect(controls.querySelector('#als-roles')?.textContent).toBe('');
  expect(controls.querySelector('#als-devices')?.textContent).toBe('');
 });
 it('shows the error card when analysis fails and does not invent a time signature',async()=>{
  const w=realm();
  const {studioModule,fillAlsResult}=await import('../ui/studio-modules/music');
  const controls=w.document.createElement('div');
  w.document.body.append(controls);
  const failure=vi.fn();
  const context={
   meta:studioModule,controls,result:w.document.createElement('div'),account:null,projectId:'',composer:w.document.createElement('form'),missionPanel:w.document.createElement('div'),
   api:vi.fn(async()=>{throw Error('broken');}),blobAPI:vi.fn(),notice:vi.fn(),failure,mountDraft:vi.fn(),setMediaCleanup:vi.fn(),setLastBlob:vi.fn(),current:()=>true,
  } as unknown as StudioModuleContext;
  await studioModule.mount(context);
  fillAlsResult({bpm:null,key:null,time_signature:null,total_tracks:0,tracks:[],role_summary:{},locators:[],warnings:[]},controls);
  expect(controls.querySelector('#als-time')?.textContent).toBe('—');
  const input=controls.querySelector<HTMLInputElement>('#music-als-file')!;
  const transfer=new w.DataTransfer();
  transfer.items.add(new w.File([new Uint8Array([1])],'broken.als'));
  input.files=transfer.files;
  input.dispatchEvent(new w.Event('change'));
  await vi.waitFor(()=>expect(failure).toHaveBeenCalled());
  expect(controls.querySelector<HTMLElement>('#als-result')?.hidden).toBe(false);
  expect(controls.querySelector('#als-status')?.textContent).toBe('Ошибка анализа');
  expect(controls.querySelector('#als-bpm')?.textContent).toBe('Ошибка');
  expect(controls.querySelector('#als-roles')?.textContent).toBe('Не удалось разобрать файл');
  expect(controls.querySelector('#als-devices')?.textContent).toBe('');
 });
});
