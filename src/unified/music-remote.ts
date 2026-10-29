import type { Env } from '../types';
import { AccessError } from '../lib/accounts';
import { musicGenerateInput } from '../lib/api-contract';
import { parseInput } from '../lib/validation';

const LEASE_MS = 15 * 60 * 1000;

type StoredJob = {status:'running'|'done'|'failed';startedAt:number;providerCalls:number;mime?:string;audioBase64?:string};

async function jobKey(account:string,prompt:string,instrumental:boolean){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${account}\n${instrumental?'1':'0'}\n${prompt}`));
 const hex=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 return `media-job:${hex}`;
}

export async function generateRemoteMusic(env:Env,body:Record<string,unknown>){
 const key=env.ELEVENLABS_API_KEY?.trim();
 if(!key)throw new AccessError('Ключ генератора не вставлен. Его кладут секретом воркера, не в чат.',503);
 const parsed=parseInput(musicGenerateInput,body);
 const prompt=parsed.prompt;
 const instrumental=parsed.instrumental!==false;
 const account=parsed.accountId||'account';
 const store=env.AZRAIL_KV;
 const id=store?await jobKey(account,prompt,instrumental):'';
 const now=Date.now();
 if(store&&id){
  const raw=await store.get(id);
  if(raw){
   const existing=JSON.parse(raw) as StoredJob;
   if(existing.status==='done'&&existing.audioBase64)return {provider:'elevenlabs' as const,mime:existing.mime||'audio/mpeg',audioBase64:existing.audioBase64,reused:true,providerCalls:existing.providerCalls};
   if(existing.status==='running'&&now-existing.startedAt<LEASE_MS)throw new AccessError('Генерация уже идёт. Второй платный запуск не отправлен.',409);
  }
  await store.put(id,JSON.stringify({status:'running',startedAt:now,providerCalls:1} satisfies StoredJob));
 }
 let response:Response;
 try{
  response=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',{
   method:'POST',
   headers:{'xi-api-key':key,'Content-Type':'application/json'},
   body:JSON.stringify({prompt,model_id:'music_v2',force_instrumental:instrumental}),
  });
 }catch{
  if(store&&id)await store.put(id,JSON.stringify({status:'failed',startedAt:now,providerCalls:0} satisfies StoredJob));
  throw new AccessError('Генератор не ответил. Повтор того же брифа можно отправить.',503);
 }
 if(!response.ok){
  if(store&&id)await store.put(id,JSON.stringify({status:'failed',startedAt:now,providerCalls:1} satisfies StoredJob));
  const detail=await response.text();
  throw new AccessError(detail.slice(0,280)||`Генератор ответил ${response.status}.`,502);
 }
 const bytes=new Uint8Array(await response.arrayBuffer());
 let binary='';
 for(let index=0;index<bytes.length;index+=8192)binary+=String.fromCharCode(...bytes.subarray(index,index+8192));
 const audioBase64=btoa(binary);
 const mime=response.headers.get('content-type')||'audio/mpeg';
 if(store&&id)await store.put(id,JSON.stringify({status:'done',startedAt:now,providerCalls:1,mime,audioBase64} satisfies StoredJob));
 return {provider:'elevenlabs' as const,mime,audioBase64,reused:false,providerCalls:1};
}
