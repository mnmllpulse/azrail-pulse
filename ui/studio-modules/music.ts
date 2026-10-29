import {studioMeta} from '../studio-manifest';
import type {StudioModule,StudioModuleContext} from '../studio-types';
import {errorMessage,renderPanelError,renderPanelLoading} from '../components/panel-state';
import type {MusicInput,ResolvedMusicSession,MusicNote} from '../media';
import {formatMaster,type StudioReading} from '../studio-master';
import {fieldValue, uploadStudioArtifact} from './shared';
import {cleanupMusicIntelligencePanel,mountMusicIntelligencePanel} from '../music-intelligence-panel';
import {cleanupMusicDirection,mountMusicDirection} from '../music-direction';
import {analyzeMusicFile} from '../music-intelligence-runtime';
import {reviewRenderIteration} from '../../src/lib/music-intelligence';
import {MELODIC_HOUSE_TECHNO} from '../../src/lib/als-music-parser';
const meta=studioMeta('music');
type RenderedMusic={wav:Blob;midi:Blob;seconds:number;waveform:number[];session:ResolvedMusicSession;master?:StudioReading};
type SavedSession={id:string;projectId:string|null;prompt:string;genre:string;mood:string;bpm:number;keyRoot:string;scale:string;bars:number;timeSignature:string;pattern:string;arrangement:string;synthPreset:string;seed:number;wavArtifactId:string|null;midiArtifactId:string|null;createdAt:number};
let current:RenderedMusic|null=null,mediaUrl:string|null=null;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function value(context:StudioModuleContext,id:string){return fieldValue(context,id).trim();}
function input(context:StudioModuleContext):MusicInput{
 const bpmText=value(context,'bpm');
 return {prompt:value(context,'studio-text'),bpm:bpmText?Number(bpmText):null,keyRoot:value(context,'music-key'),scale:value(context,'music-scale') as MusicInput['scale'],bars:Number(value(context,'bars')),timeSignature:value(context,'music-time-signature') as MusicInput['timeSignature'],genre:value(context,'music-genre') as MusicInput['genre'],mood:value(context,'music-mood') as MusicInput['mood'],pattern:value(context,'music-pattern') as MusicInput['pattern'],arrangement:value(context,'music-arrangement') as MusicInput['arrangement'],synthPreset:value(context,'music-synth') as MusicInput['synthPreset']};
}
function setField(context:StudioModuleContext,id:string,next:string|number){const field=context.controls.querySelector<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>(`#${id}`);if(field){field.value=String(next);field.dispatchEvent(new Event('input',{bubbles:true}));}}
function loadSettings(context:StudioModuleContext,item:SavedSession){setField(context,'studio-text',item.prompt);setField(context,'bpm',item.bpm);setField(context,'music-key',item.keyRoot);setField(context,'music-scale',item.scale);setField(context,'bars',item.bars);setField(context,'music-time-signature',item.timeSignature);setField(context,'music-genre',item.genre);setField(context,'music-mood',item.mood);setField(context,'music-pattern',item.pattern);setField(context,'music-arrangement',item.arrangement);setField(context,'music-synth',item.synthPreset);context.notice('Сессия загружена. Нажмите Generate, чтобы пересобрать WAV/MIDI локально.');}
function drawWaveform(canvas:HTMLCanvasElement,peaks:number[]){const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1)),width=Math.max(320,canvas.clientWidth||720),height=150;canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);ctx.fillStyle='#0a090d';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#6d557f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,height/2);ctx.lineTo(width,height/2);ctx.stroke();ctx.strokeStyle='#b99bd1';ctx.lineWidth=1.4;for(let i=0;i<peaks.length;i++){const x=i/(peaks.length-1)*width,h=Math.max(1,peaks[i]*(height*.42));ctx.beginPath();ctx.moveTo(x,height/2-h);ctx.lineTo(x,height/2+h);ctx.stroke();}}
function noteColor(part:MusicNote['part']){return part==='bass'?'#785d91':part==='pad'?'#4f4461':part==='arp'?'#c4a9df':'#9d78b9';}
function drawPianoRoll(canvas:HTMLCanvasElement,session:ResolvedMusicSession){const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1)),width=Math.max(320,canvas.clientWidth||720),height=240;canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);ctx.fillStyle='#0a090d';ctx.fillRect(0,0,width,height);const total=session.bars*session.beatsPerBar,minPitch=Math.min(...session.notes.map(n=>n.pitch),36),maxPitch=Math.max(...session.notes.map(n=>n.pitch),72),range=Math.max(12,maxPitch-minPitch+1);ctx.strokeStyle='#28222f';ctx.lineWidth=1;for(let b=0;b<=total;b++){const x=b/total*width;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}for(let p=0;p<=range;p+=3){const y=p/range*height;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}for(const n of session.notes){const x=n.start/total*width,w=Math.max(2,n.length/total*width),y=height-(n.pitch-minPitch+1)/range*height,h=Math.max(3,height/range*.78);ctx.fillStyle=noteColor(n.part);ctx.globalAlpha=.45+n.velocity*.5;ctx.fillRect(x,y,w,h);}ctx.globalAlpha=1;}
function renderResult(context:StudioModuleContext,result:RenderedMusic){if(mediaUrl)URL.revokeObjectURL(mediaUrl);mediaUrl=URL.createObjectURL(result.wav);context.setLastBlob(result.wav);context.setMediaCleanup(()=>{if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}});const s=result.session;context.result.innerHTML=`<div class="music-result-head"><div><small>SESSION</small><strong>${escape(s.keyRoot)} ${escape(s.scale)} · ${s.bpm} BPM · ${s.bars} bars · ${escape(s.timeSignature)}</strong></div><div><small>ARRANGEMENT</small><strong>${escape(s.arrangement)} · ${escape(s.synthPreset)}</strong></div></div><p class="muted">${escape(result.master?formatMaster(result.master):'24 бит · 44.1 кГц · MP3 320 · вокал: —')}</p><audio id="music-player" controls></audio><div class="music-visual-grid"><section><div class="section-heading"><h3>Waveform</h3><span class="muted">${result.seconds.toFixed(1)} s</span></div><canvas id="music-waveform"></canvas></section><section><div class="section-heading"><h3>Piano Roll</h3><span class="muted">${s.notes.length} notes</span></div><canvas id="music-piano-roll"></canvas></section></div><div id="music-result-actions" class="toolbar"></div><section id="music-render-review" class="music-render-review"><div class="section-heading"><h3>Render → Analyze → Improve</h3><span>measured WAV loop</span></div><p class="muted">Analyzing rendered WAV…</p></section>`;
 const audio=context.result.querySelector<HTMLAudioElement>('#music-player')!;audio.src=mediaUrl;
 requestAnimationFrame(()=>{drawWaveform(context.result.querySelector<HTMLCanvasElement>('#music-waveform')!,result.waveform);drawPianoRoll(context.result.querySelector<HTMLCanvasElement>('#music-piano-roll')!,s);});
 const actions=context.result.querySelector<HTMLElement>('#music-result-actions')!;
 const button=(label:string,action:()=>void|Promise<void>)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{Promise.resolve(action()).catch(context.failure);};actions.append(b);return b;};
 button('Download WAV',()=>import('../media').then(m=>m.download(result.wav,'azrail-music.wav')));
 button('Download AIFF',async()=>{context.notice('Собираю AIFF 24 бит.');const {trackFile}=await import('../audio-codecs');const {download}=await import('../media');download(await trackFile(result.wav,'aiff'),'azrail-music.aiff');});
 button('Download FLAC',async()=>{context.notice('Собираю FLAC без потери.');const {trackFile}=await import('../audio-codecs');const {download}=await import('../media');download(await trackFile(result.wav,'flac'),'azrail-music.flac');});
 button('Download MP3',async()=>{context.notice('Собираю MP3 320.');const {mp3Bitrate,trackFile}=await import('../audio-codecs');const {download}=await import('../media');const file=await trackFile(result.wav,'mp3');const rate=mp3Bitrate(new Uint8Array(await file.arrayBuffer()));if(rate!==320)throw Error('Файл не 320 кбит/с. Скачивание остановлено.');download(file,'azrail-music.mp3');context.notice(`MP3 ${rate} кбит/с.`);});
 button('Download all',async()=>{const {mp3Bitrate,trackFile}=await import('../audio-codecs');const {download}=await import('../media');download(result.wav,'azrail-music.wav');download(await trackFile(result.wav,'aiff'),'azrail-music.aiff');download(await trackFile(result.wav,'flac'),'azrail-music.flac');const file=await trackFile(result.wav,'mp3');const rate=mp3Bitrate(new Uint8Array(await file.arrayBuffer()));if(rate!==320)throw Error('Файл не 320 кбит/с. Скачивание остановлено.');download(file,'azrail-music.mp3');context.notice('WAV, AIFF, FLAC и MP3 320 скачаны из одного мастера.');});
 button('Download MIDI',()=>import('../media').then(m=>m.download(result.midi,'azrail-music.mid')));
 button('Analyze render',()=>analyzeRender(context,result));
 if(context.account&&context.account.role!=='viewer')button('Save session',()=>saveSession(context,result));
}
async function analyzeRender(context:StudioModuleContext,result:RenderedMusic){const host=context.result.querySelector<HTMLElement>('#music-render-review');if(!host)return;host.innerHTML='<div class="section-heading"><h3>Render → Analyze → Improve</h3><span>measured WAV loop</span></div><p class="muted">Measuring rendered WAV…</p>';try{const file=new File([result.wav],'azrail-render.wav',{type:'audio/wav'}),detailed=await analyzeMusicFile(file),targetLufsField=context.controls.querySelector<HTMLInputElement>('#music-target-lufs'),targetLufs=targetLufsField?.value.trim()?Number(targetLufsField.value):null,mode=result.session.scale==='major'?'major':result.session.scale==='minor'?'minor':null,review=reviewRenderIteration(detailed.analysis,{bpm:result.session.bpm,keyRoot:result.session.keyRoot,mode,targetLufs:Number.isFinite(targetLufs)?targetLufs:null});host.innerHTML=`<div class="section-heading"><h3>Render → Analyze → Improve</h3><span>${review.passed?'PASS':'REVIEW'}</span></div><div class="music-profile-summary"><span>BPM ${detailed.analysis.metrics.bpm?.toFixed(1)??'—'}</span><span>Key ${escape(detailed.analysis.metrics.keyRoot&&detailed.analysis.metrics.mode?`${detailed.analysis.metrics.keyRoot} ${detailed.analysis.metrics.mode}`:'—')}</span><span>LUFS ${detailed.analysis.metrics.integratedLufs?.toFixed(1)??'—'}</span><span>True peak ${detailed.analysis.metrics.truePeakDb?.toFixed(2)??'—'} dBTP</span><span>Correlation ${detailed.analysis.metrics.correlation?.toFixed(2)??'—'}</span></div><div class="music-matrix-scroll"><table class="music-reference-table"><thead><tr><th>Check</th><th>Status</th><th>Measured</th><th>Target</th><th>Next action</th></tr></thead><tbody>${review.checks.map(c=>`<tr><td>${escape(c.code)}</td><td>${c.status}</td><td>${escape(c.measured)}</td><td>${escape(c.target)}</td><td>${escape(c.action??'—')}</td></tr>`).join('')}</tbody></table></div><ol>${review.nextActions.map(a=>`<li>${escape(a)}</li>`).join('')}</ol><div class="toolbar"><button id="music-render-again" type="button">Render next iteration</button></div><p class="muted">Review uses measured audio only. It does not claim artistic quality or copy reference masters.</p>`;host.querySelector<HTMLButtonElement>('#music-render-again')!.onclick=()=>context.controls.querySelector<HTMLButtonElement>('#studio-run')?.click();}catch(error){host.innerHTML=`<div class="section-heading"><h3>Render → Analyze → Improve</h3><span>FAILED</span></div><p class="error">${escape(error instanceof Error?error.message:String(error))}</p>`;context.failure(error);}}

const uploadArtifact=(context:StudioModuleContext,blob:Blob,name:string)=>uploadStudioArtifact(context,blob,name,'music');
async function saveSession(context:StudioModuleContext,result:RenderedMusic){if(!context.account)throw Error('Войдите, чтобы сохранить сессию.');context.notice('Сохраняю WAV, MIDI и параметры сессии…');let wavId:string|null=null,midiId:string|null=null;try{wavId=(await uploadArtifact(context,result.wav,'azrail-music.wav')).id;midiId=(await uploadArtifact(context,result.midi,'azrail-music.mid')).id;}catch(error){if(wavId)context.api(`/api/studio/artifacts/${wavId}`,{method:'DELETE'}).catch(()=>{});throw error;}const s=result.session;await context.api('/api/studio/music/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:context.projectId||'',prompt:s.prompt,genre:s.genre,mood:s.mood,bpm:s.bpm,keyRoot:s.keyRoot,scale:s.scale,bars:s.bars,timeSignature:s.timeSignature,pattern:s.pattern,arrangement:s.arrangement,synthPreset:s.synthPreset,seed:s.seed,wavArtifactId:wavId,midiArtifactId:midiId})});context.notice('Music session сохранена вместе с WAV и MIDI.');await refreshHistory(context);}
async function downloadSaved(context:StudioModuleContext,artifactId:string,name:string){const blob=await context.blobAPI(`/api/studio/artifacts/${artifactId}`);const {download}=await import('../media');download(blob,name);}
async function loadHistory(context:StudioModuleContext){const host=context.controls.querySelector<HTMLElement>('#music-history');if(!host)return;renderPanelLoading(host,'Загружаю Music sessions…');if(!context.account){host.innerHTML='<p class="muted">Войдите, чтобы видеть сохранённые Music sessions.</p>';return;}const q=context.projectId?`?projectId=${encodeURIComponent(context.projectId)}`:'';const response=await context.api('/api/studio/music/sessions'+q) as {items:SavedSession[]};host.replaceChildren();if(!response.items.length){host.innerHTML='<p class="muted">Сохранённых Music sessions пока нет.</p>';return;}for(const item of response.items){const card=document.createElement('article');card.className='music-session-card';card.innerHTML=`<div><strong>${escape(item.keyRoot)} ${escape(item.scale)} · ${item.bpm} BPM</strong><small>${escape(item.genre)} · ${escape(item.mood)} · ${item.bars} bars · ${escape(item.timeSignature)}</small><p>${escape(item.prompt)}</p></div>`;const bar=document.createElement('div');bar.className='music-mini-actions';const btn=(label:string,fn:()=>void|Promise<void>,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=()=>Promise.resolve(fn()).catch(context.failure);bar.append(b);};btn('Load',()=>loadSettings(context,item));btn('WAV',()=>downloadSaved(context,item.wavArtifactId!,'azrail-music.wav'),!item.wavArtifactId);btn('MIDI',()=>downloadSaved(context,item.midiArtifactId!,'azrail-music.mid'),!item.midiArtifactId);card.append(bar);host.append(card);}}
async function refreshHistory(context:StudioModuleContext):Promise<void>{const host=context.controls.querySelector<HTMLElement>('#music-history');if(!host)return;try{await loadHistory(context);}catch(error){renderPanelError(host,errorMessage(error),()=>refreshHistory(context));context.failure(error);}}
function studioScale(name:string|null):string|null{if(!name)return null;const n=name.toLowerCase();if(n.includes('phrygian'))return 'phrygian';if(n.includes('dorian'))return 'dorian';if(n.includes('major'))return 'major';if(n.includes('minor'))return 'minor';return null;}
type MusicAlsReport={bpm:number|null;timeSignature:string|null;keyRoot:string|null;keyScale:string|null;locators?:Array<{name:string;timeBeats:number}>;samples?:Array<{name?:string;path?:string|null;missing?:boolean}>;roleSummary?:Record<string,number>;warnings?:string[];tracks:Array<{name:string;role?:string;type:string;clipCount:number;volume?:number|null;colorGroup?:string;devices?:Array<{name:string}|string>}>};
type AlsCardTrack={name:string;role:string;type:string;devices:string[];volume:number|null;clip_count:number};
type AlsCardResult={filename?:string|null;size?:number|null;bpm?:number|null;key?:string|null;time_signature?:string|null;total_tracks?:number|null;role_summary?:Record<string,string[]>;locators?:Array<{name:string;time?:number;timeBeats?:number}>;samples?:string[];tracks?:AlsCardTrack[];recommendations?:string[];warnings?:string[]};
const ALS_RESULT_HTML=`<div id="als-result" class="als-result" hidden>
  <div id="als-status"></div>
  <div class="als-meta">
    <div class="als-meta-item"><div class="lbl">Файл</div><div class="val" id="als-filename">—</div></div>
    <div class="als-meta-item"><div class="lbl">Размер файла</div><div class="val" id="als-size">—</div></div>
    <div class="als-meta-item"><div class="lbl">BPM</div><div class="val" id="als-bpm">—</div></div>
    <div class="als-meta-item"><div class="lbl">Ключ</div><div class="val" id="als-key">—</div></div>
    <div class="als-meta-item"><div class="lbl">Размер</div><div class="val" id="als-time">—</div></div>
    <div class="als-meta-item"><div class="lbl">Дорожек</div><div class="val" id="als-tracks">—</div></div>
  </div>
  <div id="als-roles" class="section"></div>
  <div id="als-locators" class="section"></div>
  <div id="als-samples" class="section"></div>
  <div id="als-devices" class="section"></div>
  <div id="als-volumes" class="section"></div>
  <div id="als-types" class="section"></div>
  <div id="als-clips" class="section"></div>
  <div id="als-recommendations" class="section"></div>
  <div id="als-warnings" class="section"></div>
  <div class="als-actions">
    <button id="music-apply-als" type="button">Перенести BPM и ключ</button>
    <button id="als-export" type="button">Экспорт JSON</button>
    <button id="als-midi" type="button">Экспорт MIDI-шаблона</button>
    <button id="als-copy" type="button">Скопировать</button>
    <button id="als-clear" type="button">Очистить</button>
  </div>
</div>`;
let alsCardState:AlsCardResult|null=null;
function alsById(root:ParentNode,id:string){return root.querySelector<HTMLElement>(`#${id}`)??(typeof document!=='undefined'?document.getElementById(id):null);}
function alsHeading(doc:Document,text:string){const heading=doc.createElement('h3');heading.textContent=text;return heading;}
function alsSampleLabel(sample:{name?:string;path?:string|null;missing?:boolean}){const name=sample.name||(sample.path?sample.path.split(/[/\\]/).pop():'')||'sample';return sample.missing?`${name} · нет файла`:name;}
function alsRecommendations(tracks:AlsCardTrack[],role_summary:Record<string,string[]>){
 const out:string[]=[];
 const kick=tracks.some(track=>track.role.split('/').includes('kick'));
 if(role_summary.bass&&(role_summary.rhythm||kick))out.push('Sidechain на бас от кика');
 if(kick)out.push('Low cut ниже 30 Гц на мастер');
 if(role_summary.vocal)out.push('Реверб + дилей на вокал');
 return out;
}
function alsCardResult(report:MusicAlsReport,file?:{name:string;size:number}):AlsCardResult{
 const role_summary:Record<string,string[]>={};
 const tracks:AlsCardTrack[]=report.tracks.map(track=>{
  const role=track.role??'unknown';
  const category=role.split('/')[0]||'unknown';
  (role_summary[category]??=[]).push(track.name);
  return {name:track.name,role,type:track.type,devices:(track.devices??[]).map(device=>typeof device==='string'?device:device.name).filter(Boolean).slice(0,5),volume:typeof track.volume==='number'?track.volume:null,clip_count:track.clipCount||0};
 });
 const key=[report.keyRoot,report.keyScale].filter(Boolean).join(' ');
 return {filename:file?.name??null,size:file?.size??null,bpm:report.bpm,key:key||null,time_signature:report.timeSignature,total_tracks:report.tracks.length,role_summary,locators:report.locators,samples:(report.samples??[]).slice(0,80).map(alsSampleLabel),tracks,recommendations:alsRecommendations(tracks,role_summary),warnings:report.warnings??[]};
}
function alsVolumeLabel(value:number){
 if(!Number.isFinite(value))return '—';
 if(value<=0)return '−∞ dB';
 if(value>1.2)return value.toFixed(2);
 const unity=0.85;
 const db=value>=unity?((value-unity)/(1-unity))*6:20*Math.log10(value/unity);
 const rounded=Math.round(db*10)/10;
 return `${rounded>0?'+':''}${rounded.toFixed(1)} dB`;
}
function alsReportText(result:AlsCardResult){
 const roles=Object.entries(result.role_summary??{}).map(([role,names])=>`${role}: ${names.join(', ')}`);
 const markers=(result.locators??[]).map(loc=>{const beat=loc.timeBeats??loc.time;return typeof beat==='number'?`${beat.toFixed(1)} — ${loc.name}`:loc.name;});
 return [
  `Файл: ${result.filename||'—'}`,`BPM: ${result.bpm??'—'}`,`Ключ: ${result.key??'—'}`,`Размер: ${result.time_signature||'—'}`,`Дорожек: ${result.total_tracks??'—'}`,
  'Роли:',...(roles.length?roles:['—']),
  'Структура:',...(markers.length?markers:['—']),
  'Рекомендации:',...((result.recommendations??[]).length?result.recommendations!:['—']),
  'Предупреждения:',...((result.warnings??[]).length?result.warnings!:['—']),
 ].join('\n');
}
function midiU16(value:number){return [(value>>>8)&255,value&255];}
function midiU32(value:number){return [(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255];}
function midiText(type:number,text:string){const bytes=[...new TextEncoder().encode(text)].slice(0,80);return [0x00,0xff,type,bytes.length,...bytes];}
function midiVlq(value:number){let next=Math.max(0,value);const bytes=[next&127];next>>=7;while(next>0){bytes.unshift((next&127)|128);next>>=7;}return bytes;}
function midiNote(delta:number,pitch:number,duration:number){return [...midiVlq(delta),0x90,pitch,96,...midiVlq(duration),0x80,pitch,0];}
function alsTimeSignature(signature:string|null|undefined){
 const match=/^(\d{1,2})\/(1|2|4|8|16)$/.exec(signature??'');
 if(!match)return [];
 const numerator=Number(match[1]),denominator=Number(match[2]);
 if(numerator<1||numerator>32)return [];
 return [0x00,0xff,0x58,0x04,numerator,Math.round(Math.log2(denominator)),24,8];
}
function alsTemplateNotes(role:string,signature:string|null|undefined,key:string|null|undefined){
 const match=/^(\d{1,2})\/(1|2|4|8|16)$/.exec(signature??'');
 if(!match){
  const names:Record<string,number>={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
  const root=names[key?.split(' ')[0]??''];
  const pitch=role==='bass'?(root===undefined?36:36+root):role==='rhythm'?36:root===undefined?60:60+root;
  return midiNote(0,pitch,480);
 }
 const numerator=Number(match[1]),denominator=Number(match[2]);
 const beat=Math.round(480*4/denominator),bar=numerator*beat;
 const names:Record<string,number>={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
 const rootName=key?.split(' ')[0]??'';
 const root=names[rootName];
 const pitch=role==='bass'?(root===undefined?36:36+root):role==='rhythm'?36:root===undefined?60:60+root;
 const events:number[]=[];
 let cursor=0;
 const add=(start:number,duration:number,note=pitch)=>{events.push(...midiNote(start-cursor,note,duration));cursor=start+duration;};
 if(role==='rhythm'){const steps=Math.max(1,Math.round(bar/beat));for(let i=0;i<steps;i++)add(i*beat,Math.max(1,Math.floor(beat/2)),i%2?38:36);}
 else if(role==='bass'){add(0,beat);if(bar>=beat*2)add(beat*2,beat);}
 else add(0,Math.min(bar,beat*4));
 return events;
}
function alsMidiTemplate(result:AlsCardResult){
 const end=[0x00,0xff,0x2f,0x00];
 const tempo:number[]=[];
 if(typeof result.bpm==='number'&&result.bpm>=20&&result.bpm<=999){const us=Math.round(60_000_000/result.bpm);tempo.push(0x00,0xff,0x51,0x03,(us>>>16)&255,(us>>>8)&255,us&255);}
 const signature=alsTimeSignature(result.time_signature);
 const first=[...midiText(0x03,result.filename||'Ableton template'),...signature,...tempo,...end];
 const roles=Object.keys(result.role_summary??{});
 const named=(roles.length?roles:['template']).map(role=>[...midiText(0x03,role),...alsTemplateNotes(role,result.time_signature,result.key),...end]);
 const tracks=[first,...named].map(events=>[0x4d,0x54,0x72,0x6b,...midiU32(events.length),...events]);
 const header=[0x4d,0x54,0x68,0x64,...midiU32(6),...midiU16(1),...midiU16(tracks.length),...midiU16(480)];
 return new Uint8Array([...header,...tracks.flat()]);
}
function resetAlsCard(root:ParentNode,hidden=true){
 const card=alsById(root,'als-result');if(card)card.hidden=hidden;
 for(const id of ['als-roles','als-locators','als-samples','als-devices','als-volumes','als-types','als-clips','als-recommendations']){const el=alsById(root,id);if(el)el.innerHTML='';}
 const compare=alsById(root,'compare-box');if(compare){compare.hidden=true;compare.replaceChildren();}
 const secondName=alsById(root,'als-filename2-display');if(secondName)secondName.textContent='';
 const warnings=alsById(root,'als-warnings');if(warnings)warnings.textContent='';
 const status=alsById(root,'als-status');if(status)status.textContent='';
 for(const id of ['als-filename','als-size','als-bpm','als-key','als-time','als-tracks']){const el=alsById(root,id);if(el)el.textContent='—';}
 const copy=alsById(root,'als-copy');if(copy)copy.textContent='Скопировать';
}
export function fillAlsResult(result:AlsCardResult,root:ParentNode=document){
 const bpm=alsById(root,'als-bpm'),key=alsById(root,'als-key'),tracks=alsById(root,'als-tracks'),rolesEl=alsById(root,'als-roles'),card=alsById(root,'als-result');
 if(!bpm||!key||!tracks||!rolesEl||!card)return;
 alsCardState=result;
 const doc=rolesEl.ownerDocument;
 const status=alsById(root,'als-status');if(status)status.textContent='Анализ завершён';
 const filename=alsById(root,'als-filename');if(filename)filename.textContent=result.filename||'—';
 const sizeEl=alsById(root,'als-size');if(sizeEl)sizeEl.textContent=typeof result.size==='number'?(result.size/1024/1024).toFixed(2)+' MB':'—';
 bpm.textContent=result.bpm==null?'—':String(result.bpm);
 key.textContent=result.key??'—';
 const time=alsById(root,'als-time');if(time)time.textContent=result.time_signature||'—';
 tracks.textContent=result.total_tracks==null?'—':String(result.total_tracks);
 rolesEl.innerHTML='';
 const roleEntries=Object.entries(result.role_summary??{});
 if(roleEntries.length){rolesEl.appendChild(alsHeading(doc,'Роли'));for(const [role,names] of roleEntries){const div=doc.createElement('div');div.textContent=`${role}: ${names.length}`;rolesEl.appendChild(div);}}
 const locatorsEl=alsById(root,'als-locators');
 if(locatorsEl){
  locatorsEl.innerHTML='';
  const markers=result.locators??[];
  if(markers.length)locatorsEl.appendChild(alsHeading(doc,'Структура'));
  for(const loc of markers){const div=doc.createElement('div');const beat=loc.timeBeats??loc.time;div.textContent=typeof beat==='number'?`${beat.toFixed(1)} — ${loc.name}`:loc.name;locatorsEl.appendChild(div);}
 }
 const samplesEl=alsById(root,'als-samples');
 if(samplesEl){
  samplesEl.innerHTML='';
  const names=result.samples??[];
  if(names.length){samplesEl.appendChild(alsHeading(doc,'Сэмплы'));for(const name of names){const div=doc.createElement('div');div.textContent=name;samplesEl.appendChild(div);}}
 }
 const devEl=alsById(root,'als-devices');
 if(devEl){
  devEl.innerHTML='';
  const lines=(result.tracks??[]).filter(track=>track.devices.length).map(track=>`${track.name}: ${track.devices.join(', ')}`);
  if(lines.length){devEl.appendChild(alsHeading(doc,'Устройства'));for(const line of lines){const div=doc.createElement('div');div.textContent=line;devEl.appendChild(div);}}
 }
 const volEl=alsById(root,'als-volumes');
 if(volEl){
  volEl.innerHTML='';
  const lines=(result.tracks??[]).filter(track=>typeof track.volume==='number').map(track=>`${track.name}: ${alsVolumeLabel(track.volume!)}`);
  if(lines.length){volEl.appendChild(alsHeading(doc,'Громкость'));for(const line of lines){const div=doc.createElement('div');div.textContent=line;volEl.appendChild(div);}}
 }
 const typeEl=alsById(root,'als-types');
 if(typeEl){
  typeEl.innerHTML='';
  const rows=result.tracks??[];
  if(rows.length){typeEl.appendChild(alsHeading(doc,'Типы'));for(const track of rows){const div=doc.createElement('div');div.textContent=`${track.name}: ${track.type}`;typeEl.appendChild(div);}}
 }
 const clipsEl=alsById(root,'als-clips');
 if(clipsEl){
  clipsEl.innerHTML='';
  const rows=result.tracks??[];
  if(rows.length){clipsEl.appendChild(alsHeading(doc,'Клипы'));for(const track of rows){const div=doc.createElement('div');div.textContent=`${track.name}: ${track.clip_count||0}`;clipsEl.appendChild(div);}}
 }
 const adviceEl=alsById(root,'als-recommendations');
 if(adviceEl){
  adviceEl.innerHTML='';
  const lines=result.recommendations??[];
  if(lines.length){adviceEl.appendChild(alsHeading(doc,'Рекомендации'));for(const line of lines){const div=doc.createElement('div');div.textContent=line;adviceEl.appendChild(div);}}
 }
 const warnEl=alsById(root,'als-warnings');
 if(warnEl){
  warnEl.replaceChildren();
  const lines=result.warnings??[];
  if(lines.length){warnEl.appendChild(alsHeading(doc,'Предупреждения'));for(const line of lines){const div=doc.createElement('div');div.textContent=line;warnEl.appendChild(div);}}
 }
 card.hidden=false;
 const view=card.ownerDocument.defaultView;
 if(view)view.document.dispatchEvent(new view.CustomEvent('pulse-als-parsed'));
}
export function showAlsError(root:ParentNode=document){
 alsCardState=null;
 resetAlsCard(root,false);
 const status=alsById(root,'als-status');if(status)status.textContent='Ошибка анализа';
 const bpm=alsById(root,'als-bpm');if(bpm)bpm.textContent='Ошибка';
 const roles=alsById(root,'als-roles');if(roles){const div=roles.ownerDocument.createElement('div');div.textContent='Не удалось разобрать файл';roles.appendChild(div);}
}
export function hideAlsResult(root:ParentNode=document){const card=alsById(root,'als-result');if(card)card.hidden=true;}
function missingNames(left:string[],right:string[]){const have=new Set(right);return left.filter(name=>!have.has(name));}
function showAlsCompare(root:ParentNode,first:AlsCardResult,second:AlsCardResult){
 const box=alsById(root,'compare-box');if(!box)return;
 const doc=box.ownerDocument;
 box.replaceChildren();
 const devices=(item:AlsCardResult)=>[...new Set((item.tracks??[]).flatMap(track=>track.devices))];
 for(const item of [first,second]){
  const col=doc.createElement('div');
  const title=doc.createElement('h3');title.textContent=item.filename||'—';col.append(title);
  const roles=Object.entries(item.role_summary??{}).map(([role,names])=>`${role}: ${names.join(', ')}`).join('; ')||'—';
  const samples=(item.samples??[]).slice(0,8).join(', ')||'—';
  const gear=devices(item).slice(0,8).join(', ')||'—';
  for(const line of [`BPM: ${item.bpm??'—'}`,`Ключ: ${item.key??'—'}`,`Дорожек: ${item.total_tracks??'—'}`,`Роли: ${roles}`,`Сэмплы: ${samples}`,`Устройства: ${gear}`]){const p=doc.createElement('p');p.textContent=line;col.append(p);}
  box.append(col);
 }
 const diff=doc.createElement('div');diff.className='als-diff';
 const heading=doc.createElement('h3');heading.textContent='Отличия';diff.append(heading);
 const diffLine=(label:string,left:string[],right:string[])=>{
  const onlyLeft=missingNames(left,right).slice(0,8),onlyRight=missingNames(right,left).slice(0,8);
  if(!onlyLeft.length&&!onlyRight.length)return `${label} совпадают`;
  return `${label}: только в первом — ${onlyLeft.join(', ')||'—'}; только во втором — ${onlyRight.join(', ')||'—'}`;
 };
 const lines=[
  `BPM: ${first.bpm??'—'} → ${second.bpm??'—'}`,
  `Ключ: ${first.key??'—'} → ${second.key??'—'}`,
  diffLine('Роли',Object.keys(first.role_summary??{}),Object.keys(second.role_summary??{})),
  diffLine('Сэмплы',first.samples??[],second.samples??[]),
  diffLine('Устройства',devices(first),devices(second)),
 ];
 for(const line of lines){const p=doc.createElement('p');p.textContent=line;diff.append(p);}
 box.append(diff);
 box.hidden=false;
}
function saveAlsBlob(blob:Blob,name:string){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);}
async function requestAls(context:StudioModuleContext,file:File){
 const headers:Record<string,string>={'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(file.name)};if(context.projectId)headers['X-Project-Id']=context.projectId;
 return await context.api('/api/studio/als',{method:'POST',headers,body:file,signal:context.signal}) as MusicAlsReport;
}
function bindMusicTools(context:StudioModuleContext){
 const template=MELODIC_HOUSE_TECHNO;
 context.controls.querySelector<HTMLButtonElement>('#music-apply-melodic')!.onclick=()=>{setField(context,'studio-text',template.prompt);setField(context,'music-genre',template.genre);setField(context,'music-mood',template.mood);setField(context,'bpm',template.bpm);setField(context,'music-key',template.keyRoot);setField(context,'music-scale',template.scale);setField(context,'bars',template.bars);setField(context,'music-time-signature',template.timeSignature);setField(context,'music-pattern',template.pattern);setField(context,'music-arrangement',template.arrangement);setField(context,'music-synth',template.synthPreset);context.notice('Шаблон Melodic House & Techno перенесён в композер. Нажмите Generate.');};
 const file=context.controls.querySelector<HTMLInputElement>('#music-als-file')!;
 context.controls.querySelector<HTMLButtonElement>('#music-parse-als')!.onclick=()=>file.click();
 file.addEventListener('change',()=>{
  const chosen=file.files?.[0];
  const label=alsById(context.controls,'als-file-label');if(label)label.textContent=chosen?.name||'Файл не выбран';
  hideAlsResult(context.controls);const compare=alsById(context.controls,'compare-box');if(compare){compare.hidden=true;compare.replaceChildren();}
  const job=chosen?parseMusicAls(context,context.controls):Promise.resolve();(file as HTMLInputElement & {pending?:Promise<void>}).pending=job;void job.catch(context.failure);
 });
 context.controls.querySelector<HTMLButtonElement>('#als-compare')!.onclick=()=>context.controls.querySelector<HTMLInputElement>('#music-als-file-2')?.click();
 context.controls.querySelector<HTMLInputElement>('#music-als-file-2')!.addEventListener('change',()=>{void compareMusicAls(context,context.controls).catch(context.failure);});
 context.controls.querySelector<HTMLButtonElement>('#als-export')!.onclick=()=>{
  if(!alsCardState)return;
  saveAlsBlob(new Blob([JSON.stringify(alsCardState,null,2)],{type:'application/json'}),`${(alsCardState.filename||'ableton').replace(/[\\/:*?"<>|]+/g,'_')}-analysis.json`);
 };
 context.controls.querySelector<HTMLButtonElement>('#als-midi')!.onclick=()=>{
  if(!alsCardState)return;
  saveAlsBlob(new Blob([alsMidiTemplate(alsCardState).buffer as ArrayBuffer],{type:'audio/midi'}),`${(alsCardState.filename||'ableton').replace(/[\\/:*?"<>|]+/g,'_')}-template.mid`);
 };
 context.controls.querySelector<HTMLButtonElement>('#als-copy')!.onclick=()=>{
  if(!alsCardState)return;
  const text=alsReportText(alsCardState);
  const btn=context.controls.querySelector<HTMLButtonElement>('#als-copy');
  const done=()=>{if(!btn)return;btn.textContent='Скопировано';setTimeout(()=>{btn.textContent='Скопировать';},1500);};
  const clipboard=navigator.clipboard?.writeText(text);
  if(clipboard)void clipboard.then(done).catch(()=>context.notice('Не удалось скопировать отчёт.'));
  else context.notice('Буфер обмена недоступен.');
 };
 context.controls.querySelector<HTMLButtonElement>('#music-apply-als')!.onclick=()=>{
  if(!alsCardState){context.notice('Сначала разберите проект.');return;}
  if(typeof alsCardState.bpm==='number')setField(context,'bpm',Math.round(alsCardState.bpm));
  const root=alsCardState.key?.split(' ')[0]??'';
  const scale=studioScale(alsCardState.key??null);
  if(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].includes(root))setField(context,'music-key',root);
  if(scale)setField(context,'music-scale',scale);
  if(alsCardState.time_signature==='4/4'||alsCardState.time_signature==='3/4'||alsCardState.time_signature==='6/8')setField(context,'music-time-signature',alsCardState.time_signature);
  context.notice('BPM, тональность и размер из ALS перенесены в композер, если студия их поддерживает.');
 };
 context.controls.querySelector<HTMLButtonElement>('#als-clear')!.onclick=()=>{alsCardState=null;resetAlsCard(context.controls);for(const id of ['#music-als-file','#music-als-file-2']){const input=context.controls.querySelector<HTMLInputElement>(id);if(input)input.value='';}const label=alsById(context.controls,'als-file-label');if(label)label.textContent='Файл не выбран';const second=alsById(context.controls,'als-filename2-display');if(second)second.textContent='';};
}
async function compareMusicAls(context:StudioModuleContext,block:HTMLElement){
 const file=block.querySelector<HTMLInputElement>('#music-als-file-2')?.files?.[0];
 const label=alsById(block,'als-filename2-display');
 if(!file)return;
 if(label)label.textContent=file.name;
 if(!alsCardState){context.notice('Сначала разберите первый проект.');return;}
 if(file.size>12*1024*1024)throw Error('ALS должен быть не больше 12 МБ.');
 const second=alsCardResult(await requestAls(context,file),file);
 showAlsCompare(block,alsCardState,second);
}
async function parseMusicAls(context:StudioModuleContext,block:HTMLElement){
 const file=block.querySelector<HTMLInputElement>('#music-als-file')?.files?.[0];
 if(!file){showAlsError(block);throw Error('Выберите .als или .xml.');}
 if(file.size>12*1024*1024){showAlsError(block);throw Error('ALS должен быть не больше 12 МБ.');}
 const label=alsById(block,'als-file-label');if(label)label.textContent=`Разбираю ${file.name}…`;
 try{
  const report=await requestAls(context,file);
  fillAlsResult(alsCardResult(report,file),block);
  if(label)label.textContent=file.name;
 }catch(error){if(label)label.textContent=file.name;showAlsError(block);throw error;}
}
export const studioModule:StudioModule={
 ...meta,
 async mount(context){current=null;if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}
  const template=MELODIC_HOUSE_TECHNO;
  context.controls.innerHTML=`<div class="music-studio-shell"><section class="music-composer"><section class="music-als-box"><div class="section-heading"><h3>Парсер Ableton (.als)</h3><span class="muted">видно сразу в Music Studio</span></div><p>Выбери файл проекта Ableton. Парсер покажет BPM, тональность и роль каждой дорожки: kick, bass, pad, vocal.</p><input id="music-als-file" type="file" accept=".als,.xml,application/octet-stream" hidden><div class="toolbar"><button id="music-parse-als" class="primary" type="button">Открыть .als</button><span id="als-file-label" class="filename">Файл не выбран</span></div><input id="music-als-file-2" type="file" accept=".als,.xml,application/octet-stream" hidden><div class="toolbar"><button id="als-compare" type="button">Сравнить со вторым .als</button><span id="als-filename2-display" class="muted"></span></div>${ALS_RESULT_HTML}<div id="compare-box" class="compare" hidden></div></section><section class="music-als-box"><div class="section-heading"><h3>Шаблон Melodic House & Techno</h3><span class="muted">${template.bpm} BPM · ${template.bpmRange[0]}–${template.bpmRange[1]}</span></div><p>Частоты и карта трека на 6–7 минут. Кнопка ставит 124 BPM и A minor в форму ниже.</p><div class="music-matrix-scroll"><table class="music-reference-table"><thead><tr><th>Полоса</th><th>Роль в миксе</th></tr></thead><tbody>${template.bands.map(b=>`<tr><td>${escape(b.range)}</td><td>${escape(b.role)}</td></tr>`).join('')}</tbody></table></div><div class="music-matrix-scroll"><table class="music-reference-table"><thead><tr><th>Секция</th><th>Такты</th><th>Время</th><th>Задача</th></tr></thead><tbody>${template.sections.map(s=>`<tr><td>${escape(s.name)}</td><td>${escape(s.bars)}</td><td>${escape(s.clock)}</td><td>${escape(s.intent)}</td></tr>`).join('')}</tbody></table></div><div class="toolbar"><button id="music-apply-melodic" type="button">Поставить шаблон в форму</button></div></section><p class="muted">Дальше обычная генерация: промпт, жанр, Generate.</p><label for="studio-text">Промпт</label><textarea id="studio-text" rows="3" maxlength="4000" placeholder="Dark hypnotic warehouse pulse, restrained tension, late-night energy">Midnight pulse</textarea><div class="music-options"><label>Genre<select id="music-genre"><option value="dark-minimal">Dark Minimal</option><option value="melodic-techno">Melodic Techno</option><option value="ambient">Ambient</option><option value="industrial">Industrial</option><option value="cinematic">Cinematic</option></select></label><label>Mood<select id="music-mood"><option value="hypnotic">Hypnotic</option><option value="driving">Driving</option><option value="dark">Dark</option><option value="euphoric">Euphoric</option><option value="atmospheric">Atmospheric</option></select></label><label>BPM<input id="bpm" type="number" min="60" max="180" placeholder="Auto"></label><label>Key<select id="music-key"><option value="auto">Auto</option><option>C</option><option>C#</option><option>D</option><option>D#</option><option>E</option><option>F</option><option>F#</option><option>G</option><option>G#</option><option>A</option><option>A#</option><option>B</option></select></label><label>Scale<select id="music-scale"><option value="minor">Minor</option><option value="major">Major</option><option value="dorian">Dorian</option><option value="phrygian">Phrygian</option></select></label><label>Bars<input id="bars" type="number" min="1" max="640" value="8"></label><label>Time signature<select id="music-time-signature"><option>4/4</option><option>3/4</option><option>6/8</option></select></label><label>Pattern<select id="music-pattern"><option value="pulse">Pulse</option><option value="arpeggio">Arpeggio</option><option value="bassline">Bassline</option><option value="chords">Chords</option><option value="ambient">Ambient</option></select></label><label>Arrangement<select id="music-arrangement"><option value="intro-build-drop">Intro → Build → Drop</option><option value="section-story">Вступление → дроп → брейк → дроп</option><option value="minimal-evolution">Minimal Evolution</option><option value="loop">Loop</option></select></label><label>Synth preset<select id="music-synth"><option value="dark-pulse">Dark Pulse</option><option value="warm-pad">Warm Pad</option><option value="glass">Glass</option><option value="sub">Sub</option><option value="acid">Acid</option></select></label><label>Target LUFS<input id="music-target-lufs" type="number" min="-24" max="-6" step="0.5" placeholder="Optional"></label></div><div class="toolbar"><button id="studio-run" class="primary" type="button">Generate</button></div><p class="muted music-engine-note">No fake cloud music model: WAV/MIDI render locally in the browser; Cloudflare is used only for authenticated storage/session metadata when you save.</p></section><section class="music-history"><div class="section-heading"><h3>Sessions</h3><button id="music-refresh-history" type="button">Refresh</button></div><div id="music-history"></div></section></div>`;
  context.controls.querySelector<HTMLButtonElement>('#music-refresh-history')!.onclick=()=>void refreshHistory(context);
  bindMusicTools(context);
  mountMusicIntelligencePanel(context);
  mountMusicDirection(context);
  context.mountDraft(!!context.account,{scope:context.account?.id??'local',writable:context.account?.role!=='viewer'});await refreshHistory(context);
 },
 async run(context){const {renderMusicSession}=await import('../media');const result=await renderMusicSession(input(context));if(!context.current())return;current=result;renderResult(context,result);await analyzeRender(context,result);},
 cleanup(){current=null;cleanupMusicDirection();cleanupMusicIntelligencePanel();if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}}
};
