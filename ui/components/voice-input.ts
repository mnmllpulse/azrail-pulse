export type VoiceState='idle'|'recording'|'paused'|'processing'|'editable'|'failed';
type API=(path:string,options?:RequestInit)=>Promise<any>;
export type VoiceInputOptions={button:HTMLButtonElement;prompt:HTMLTextAreaElement;api:API;canUse:()=>boolean;notice:(message:string,persist?:boolean)=>void;failure:(error:unknown)=>void};

export function mountVoiceInput(options:VoiceInputOptions){
 let recorder:MediaRecorder|null=null,stream:MediaStream|null=null,chunks:BlobPart[]=[],lastBlob:Blob|null=null,state:VoiceState='idle',timeout=0,cancelled=false;
 const panel=document.createElement('div');panel.className='voice-panel';panel.hidden=true;panel.setAttribute('role','group');panel.setAttribute('aria-label','Голосовой ввод');
 const status=document.createElement('strong'),transcript=document.createElement('textarea');transcript.rows=2;transcript.maxLength=20000;transcript.placeholder='Расшифровка появится здесь и останется редактируемой.';
 const actions=document.createElement('div');actions.className='toolbar';panel.append(status,transcript,actions);options.button.parentElement?.parentElement?.after(panel);
 const make=(label:string,fn:()=>void|Promise<void>)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(options.failure);actions.append(b);return b;};
 const pause=make('Pause',()=>{if(recorder?.state==='recording')recorder.pause();});
 const resume=make('Resume',()=>{if(recorder?.state==='paused')recorder.resume();});
 const stop=make('Transcribe',()=>{if(recorder&&['recording','paused'].includes(recorder.state))recorder.stop();});
 const retry=make('Retry',()=>lastBlob?transcribe(lastBlob):undefined);
 const use=make('Use transcript',()=>{const text=transcript.value.trim();if(text){options.prompt.value=[options.prompt.value.trim(),text].filter(Boolean).join(' ');options.prompt.dispatchEvent(new Event('input',{bubbles:true}));options.prompt.focus();}reset(false);});
 const cancel=make('Cancel',()=>reset(true));
 function render(next:VoiceState){state=next;panel.hidden=next==='idle';status.textContent=({idle:'',recording:'Recording',paused:'Paused',processing:'Transcribing…',editable:'Editable transcript',failed:'Transcription failed'})[next];pause.hidden=next!=='recording';resume.hidden=next!=='paused';stop.hidden=!['recording','paused'].includes(next);retry.hidden=!['editable','failed'].includes(next)||!lastBlob;use.hidden=next!=='editable';transcript.hidden=!['editable','failed'].includes(next);transcript.disabled=next==='processing';options.button.textContent=next==='idle'?'◉':next==='recording'?'■':'◫';options.button.setAttribute('aria-label',next==='idle'?'Записать голосовой запрос':'Открыт голосовой ввод');}
 function stopMedia(){clearTimeout(timeout);timeout=0;stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;}
 function reset(abort:boolean){if(abort)cancelled=true;if(abort&&recorder&&['recording','paused'].includes(recorder.state))try{recorder.stop();}catch{}stopMedia();chunks=[];if(abort){lastBlob=null;transcript.value='';}render('idle');}
 async function transcribe(blob:Blob){render('processing');try{const result=await options.api('/api/studio/voice',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID(),'Content-Type':blob.type||'audio/webm'},body:blob});transcript.value=String(result?.text??'').trim();if(!transcript.value)throw Error('Провайдер не вернул расшифровку.');render('editable');options.notice('Расшифровка готова. Отредактируйте текст или добавьте его в запрос.');}catch(error){render('failed');throw error;}}
 async function start(){
  if(!options.canUse())throw Error('Для распознавания речи войдите в аккаунт.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Микрофон доступен по HTTPS в поддерживаемом браузере.');
  if(state!=='idle'){panel.hidden=false;return;}
  stream=await navigator.mediaDevices.getUserMedia({audio:true});cancelled=false;chunks=[];lastBlob=null;transcript.value='';
  try{recorder=new MediaRecorder(stream);}catch(error){stopMedia();throw error;}
  const active=recorder;active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};active.onpause=()=>render('paused');active.onresume=()=>render('recording');
  active.onstop=()=>{clearTimeout(timeout);stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;if(cancelled){chunks=[];return;}lastBlob=new Blob(chunks,{type:active.mimeType||'audio/webm'});void transcribe(lastBlob).catch(options.failure);};
  active.start(500);render('recording');timeout=window.setTimeout(()=>{if(active.state==='recording'||active.state==='paused')active.stop();},60_000);options.notice('Запись началась. Доступны Pause, Resume, Transcribe и Cancel.');
 }
 options.button.onclick=()=>{if(state==='idle')void start().catch(options.failure);else panel.hidden=!panel.hidden;};
 render('idle');
 return{destroy(){reset(true);panel.remove();options.button.onclick=null;},getState:()=>state};
}
