import type {Env} from '../types';

export type SpeechToTextRequest={audio:ArrayBuffer;mimeType?:string;language?:string;signal?:AbortSignal};
export type SpeechToTextResult={text:string;provider:string;model:string;language?:string|null};

/** Provider-neutral speech contract. UI recording lifecycle is intentionally separate. */
export interface SpeechToTextAdapter {
 readonly id:string;
 transcribe(input:SpeechToTextRequest,onDispatch?:()=>void):Promise<SpeechToTextResult>;
}

function extractTranscript(result:unknown):string{
 if(typeof result==='string')return result.trim();
 if(result&&typeof result==='object'){
  const row=result as Record<string,unknown>;
  for(const key of ['text','transcription','transcript'])if(typeof row[key]==='string'&&row[key].trim())return row[key].trim();
 }
 throw new Error('Speech provider не вернул текстовую расшифровку.');
}

export class CloudflareSpeechToTextAdapter implements SpeechToTextAdapter {
 readonly id='cloudflare-workers-ai';
 constructor(private readonly env:Env,private readonly model='@cf/openai/whisper'){}
 async transcribe(input:SpeechToTextRequest,onDispatch?:()=>void):Promise<SpeechToTextResult>{
  if(input.signal?.aborted)throw new DOMException('Операция отменена.','AbortError');
  onDispatch?.();
  const provider=this.env.AI as unknown as {run:(model:string,input:unknown,options?:unknown)=>Promise<unknown>};
  // Keep binary input compact. Provider options stay behind this adapter so a future
  // Deepgram/AssemblyAI implementation does not leak into the route or UI lifecycle.
  const result=await provider.run(this.model,input.audio as never,input.signal?{signal:input.signal}:undefined);
  return {text:extractTranscript(result),provider:this.id,model:this.model,language:input.language??null};
 }
}
