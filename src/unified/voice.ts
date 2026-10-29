import type {Env} from '../types';

export type SpeechToTextRequest={audio:ArrayBuffer;mimeType?:string;language?:string;signal?:AbortSignal};
export type SpeechToTextResult={text:string;provider:string;model:string;language?:string|null};

/** Provider-neutral speech contract. UI recording lifecycle is intentionally separate. */
export interface SpeechToTextAdapter {
 readonly id:string;
 transcribe(input:SpeechToTextRequest,onDispatch?:()=>void):Promise<SpeechToTextResult>;
}

function extractTranscript(result:unknown,depth=0):string{
 if(typeof result==='string')return result.trim();
 if(result&&typeof result==='object'){
  const row=result as Record<string,unknown>;
  for(const key of ['text','transcription','transcript']){
   const value=row[key];
   if(typeof value==='string'&&value.trim())return value.trim();
  }
  if(Array.isArray(row.words)){
   const words=row.words.map(word=>typeof word==='string'?word:(word&&typeof word==='object'&&typeof (word as {word?:unknown}).word==='string'?(word as {word:string}).word:'')).filter(Boolean);
   if(words.length)return words.join(' ').trim();
  }
  if(depth<2)for(const key of ['result','response','output'])if(row[key]&&typeof row[key]==='object'){
   try{return extractTranscript(row[key],depth+1);}catch{/* try the next shape */}
  }
 }
 throw new Error('Speech provider не вернул текстовую расшифровку.');
}

/** Base64 without spreading the whole file into a giant number[] (OOM risk). */
function audioToBase64(audio:ArrayBuffer):string{
 if(typeof Buffer!=='undefined')return Buffer.from(audio).toString('base64');
 const bytes=new Uint8Array(audio);
 let binary='';
 const chunk=0x8000;
 for(let i=0;i<bytes.length;i+=chunk){
  binary+=String.fromCharCode.apply(null,Array.from(bytes.subarray(i,i+chunk)));
 }
 return btoa(binary);
}

export class CloudflareSpeechToTextAdapter implements SpeechToTextAdapter {
 readonly id='cloudflare-workers-ai';
 constructor(private readonly env:Env,private readonly model='@cf/openai/whisper-large-v3-turbo'){}
 async transcribe(input:SpeechToTextRequest,onDispatch?:()=>void):Promise<SpeechToTextResult>{
  if(input.signal?.aborted)throw new DOMException('Операция отменена.','AbortError');
  if(!input.audio.byteLength)throw new Error('Аудиозапись пуста.');
  onDispatch?.();
  const provider=this.env.AI as unknown as {run:(model:string,input:unknown,options?:unknown)=>Promise<unknown>};
  // Workers AI whisper expects { audio: base64|number[] }, not a raw ArrayBuffer.
  const result=await provider.run(
   this.model,
   {audio:audioToBase64(input.audio),language:input.language??'ru'},
   input.signal?{signal:input.signal}:undefined,
  );
  return {text:extractTranscript(result),provider:this.id,model:this.model,language:input.language??null};
 }
}
