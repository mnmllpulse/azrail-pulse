export type VoiceState='idle'|'recording'|'paused'|'processing'|'editable'|'failed';
type API=(path:string,options?:RequestInit)=>Promise<any>;
export type VoiceInputOptions={button:HTMLButtonElement;prompt:HTMLTextAreaElement;api:API;canUse:()=>boolean;notice:(message:string,persist?:boolean)=>void;failure:(error:unknown)=>void};

const MIC_SVG='<svg width="18" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function writeAscii(view:DataView,offset:number,text:string){for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));}
function encodeWav(samples:Float32Array,sampleRate:number):Blob{
 const target=16000,ratio=sampleRate/target,length=Math.max(1,Math.floor(samples.length/ratio));
 const pcm=new Int16Array(length);
 for(let i=0;i<length;i++){const s=Math.max(-1,Math.min(1,samples[Math.min(samples.length-1,Math.floor(i*ratio))]??0));pcm[i]=s<0?s*0x8000:s*0x7fff;}
 const buffer=new ArrayBuffer(44+pcm.length*2),view=new DataView(buffer);
 writeAscii(view,0,'RIFF');view.setUint32(4,36+pcm.length*2,true);writeAscii(view,8,'WAVE');writeAscii(view,12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,target,true);
 view.setUint32(28,target*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);writeAscii(view,36,'data');view.setUint32(40,pcm.length*2,true);
 let offset=44;for(let i=0;i<pcm.length;i++,offset+=2)view.setInt16(offset,pcm[i]!,true);
 return new Blob([buffer],{type:'audio/wav'});
}
async function recordingToWav(blob:Blob):Promise<Blob>{
 const ctx=new AudioContext();
 try{
  const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
  const mono=new Float32Array(decoded.length);
  for(let c=0;c<decoded.numberOfChannels;c++){const data=decoded.getChannelData(c);for(let i=0;i<data.length;i++)mono[i]=(mono[i]??0)+data[i]/decoded.numberOfChannels;}
  return encodeWav(mono,decoded.sampleRate);
 }catch{throw Error('Браузер не смог прочитать запись. Скажите фразу чуть дольше и повторите.');}
 finally{await ctx.close().catch(()=>{});}
}
function pickAudioMime():string{
 const candidates=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg'];
 return candidates.find(t=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported(t))??'';
}

function micError(error:unknown):Error{
 if(error instanceof DOMException||(error&&typeof error==='object'&&'name' in error)){
  const name=String((error as {name?:string}).name||'');
  if(name==='NotAllowedError'||name==='PermissionDeniedError')return Error('Доступ к микрофону запрещён. Разрешите микрофон для этого сайта в настройках браузера.');
  if(name==='NotFoundError'||name==='DevicesNotFoundError')return Error('Микрофон не найден. Подключите устройство ввода и повторите.');
  if(name==='NotReadableError'||name==='TrackStartError')return Error('Микрофон занят другим приложением. Закройте его и повторите.');
  if(name==='SecurityError')return Error('Микрофон доступен только по HTTPS в поддерживаемом браузере.');
 }
 return error instanceof Error?error:Error(String(error));
}

export function mountVoiceInput(options:VoiceInputOptions){
 let recorder:MediaRecorder|null=null,stream:MediaStream|null=null,chunks:BlobPart[]=[],lastBlob:Blob|null=null,state:VoiceState='idle',timeout=0,cancelled=false;
 const iconHtml=options.button.innerHTML.trim()||MIC_SVG;
 const panel=document.createElement('div');panel.className='voice-panel';panel.hidden=true;panel.setAttribute('role','group');panel.setAttribute('aria-label','Голосовой ввод');
 const status=document.createElement('strong'),transcript=document.createElement('textarea');transcript.rows=2;transcript.maxLength=20000;transcript.placeholder='Расшифровка появится здесь — можно править перед вставкой.';
 const actions=document.createElement('div');actions.className='toolbar';panel.append(status,transcript,actions);
 // Keep the panel inside the composer so it stays visible above the dock footnote.
 const composer=options.button.closest('#composer');
 if(composer)composer.insertBefore(panel,composer.querySelector('textarea'));
 else options.button.parentElement?.parentElement?.after(panel);
 const make=(label:string,fn:()=>void|Promise<void>)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=(event)=>{event.preventDefault();event.stopPropagation();void Promise.resolve(fn()).catch(err=>options.failure(micError(err)));};actions.append(b);return b;};
 const pause=make('Пауза',()=>{if(recorder?.state==='recording')recorder.pause();});
 const resume=make('Продолжить',()=>{if(recorder?.state==='paused')recorder.resume();});
 const stop=make('Готово',()=>{if(recorder&&['recording','paused'].includes(recorder.state))recorder.stop();});
 const retry=make('Повторить',()=>lastBlob?transcribe(lastBlob):undefined);
 const use=make('Вставить в чат',()=>{applyTranscript();reset(false);});
 const cancel=make('Отмена',()=>reset(true));
 function applyTranscript(){
  const text=transcript.value.trim();
  if(!text)return;
  options.prompt.value=[options.prompt.value.trim(),text].filter(Boolean).join('\n');
  options.prompt.dispatchEvent(new Event('input',{bubbles:true}));
  options.prompt.focus();
 }
 function render(next:VoiceState){
  state=next;panel.hidden=next==='idle';
  status.textContent=({idle:'',recording:'Идёт запись… нажмите микрофон или «Готово»',paused:'Пауза',processing:'Расшифровка…',editable:'Текст готов — можно править',failed:'Не удалось распознать речь'})[next];
  pause.hidden=next!=='recording';resume.hidden=next!=='paused';stop.hidden=!['recording','paused'].includes(next);
  retry.hidden=!['editable','failed'].includes(next)||!lastBlob;use.hidden=next!=='editable';
  cancel.hidden=next==='idle'||next==='processing';
  transcript.hidden=!['editable','failed'].includes(next);transcript.disabled=next==='processing';
  // Preserve mic SVG; state is shown via data-attr + aria, not textContent wipe.
  if(!options.button.querySelector('svg'))options.button.innerHTML=iconHtml;
  options.button.dataset.voiceState=next;
  options.button.setAttribute('aria-pressed',String(next==='recording'||next==='paused'));
  options.button.setAttribute('aria-label',next==='idle'?'Записать голосовой запрос':next==='recording'||next==='paused'?'Остановить запись и расшифровать':'Голосовой ввод');
  options.button.title=next==='recording'||next==='paused'?'Остановить и расшифровать':'Голосовой ввод';
 }
 function stopMedia(){clearTimeout(timeout);timeout=0;stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;}
 function reset(abort:boolean){
  if(abort)cancelled=true;
  if(abort&&recorder&&['recording','paused'].includes(recorder.state))try{recorder.stop();}catch{}
  stopMedia();chunks=[];
  if(abort){lastBlob=null;transcript.value='';}
  render('idle');
 }
 async function transcribe(blob:Blob){
  render('processing');
  try{
   const wav=await recordingToWav(blob);
   const result=await options.api('/api/studio/voice',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID(),'Content-Type':'audio/wav'},body:wav});
   transcript.value=String(result?.text??'').trim();
   if(!transcript.value)throw Error('Провайдер не вернул расшифровку.');
   applyTranscript();
   render('editable');
   options.notice('Готово. Текст уже в поле сообщения — можно править и отправить.');
  }catch(error){render('failed');throw micError(error);}
 }
 async function start(){
  if(!options.canUse())throw Error('Для распознавания речи войдите в аккаунт.');
  if(!window.isSecureContext)throw Error('Микрофон доступен только по HTTPS.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Этот браузер не даёт доступ к микрофону.');
  if(typeof MediaRecorder==='undefined')throw Error('Запись звука в этом браузере недоступна.');
  if(state!=='idle'){panel.hidden=false;return;}
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});}
  catch(error){throw micError(error);}
  cancelled=false;chunks=[];lastBlob=null;transcript.value='';
  const mime=pickAudioMime();
  try{recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);}
  catch(error){stopMedia();throw micError(error);}
  const active=recorder;
  active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  active.onpause=()=>render('paused');
  active.onresume=()=>render('recording');
  active.onerror=()=>{options.failure(Error('Ошибка записи микрофона.'));reset(true);};
  active.onstop=()=>{
   clearTimeout(timeout);stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;
   if(cancelled){chunks=[];return;}
   const type=active.mimeType||mime||'audio/webm';
   lastBlob=new Blob(chunks,{type});
   if(!lastBlob.size){options.failure(Error('Запись пустая. Удержите микрофон чуть дольше и повторите.'));render('failed');return;}
   void transcribe(lastBlob).catch(err=>options.failure(micError(err)));
  };
  active.start(250);
  render('recording');
  timeout=window.setTimeout(()=>{if(active.state==='recording'||active.state==='paused')active.stop();},60_000);
  options.notice('Говорите. Повторное нажатие на микрофон — остановить и расшифровать.');
 }
 function toggle(){
  if(state==='idle')void start().catch(err=>options.failure(micError(err)));
  else if(state==='recording'||state==='paused'){if(recorder)recorder.stop();}
  else if(state==='processing')options.notice('Ещё расшифровываю…',true);
  else panel.hidden=!panel.hidden;
 }
 options.button.onclick=()=>toggle();
 render('idle');
 return{destroy(){reset(true);panel.remove();options.button.onclick=null;delete options.button.dataset.voiceState;},getState:()=>state};
}
