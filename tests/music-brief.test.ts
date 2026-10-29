import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {remixBrief} from '../ui/music-brief';
import {generateRemoteMusic} from '../src/unified/music-remote';

describe('remix brief',()=>{
 it('keeps a measured camelot and does not invent a tempo or a ten minute target',()=>{
  const brief=remixBrief({wish:'бас злее',fileName:'pack.als',bpm:124,keyLabel:'A minor',camelot:'8A',form:'Intro, Drop, Break',pack:'kick, bass, pad',durationSeconds:472});
  expect(brief).toContain('remix');
  expect(brief).toContain('124 BPM, measured');
  expect(brief).toContain('Camelot 8A');
  expect(brief).toContain('бас злее');
  expect(brief).toContain('472 seconds');
  expect(brief).not.toContain('10:00');
  expect(brief).not.toContain('128');
 });
 it('leaves the tempo empty when the parser did not measure it',()=>{
  const brief=remixBrief({wish:'',fileName:'track.mp3',bpm:null,keyLabel:null,camelot:null,form:'',pack:'',durationSeconds:null});
  expect(brief).toContain('Tempo was not measured');
  expect(brief).not.toMatch(/\d+\s+BPM, measured/);
 });
 it('does not call the generator without a key and does not send a fixed length',async()=>{
  const source=readFileSync('src/unified/music-remote.ts','utf8');
  expect(source).not.toContain('music_length_ms');
  expect(source).not.toContain('600000');
  await expect(generateRemoteMusic({} as never,{prompt:'Instrumental melodic techno remix with a new melody.',instrumental:true})).rejects.toThrow(/Ключ/);
 });
 it('returns the stored take and does not send a second paid generation',async()=>{
  const saved=new Map<string,string>();
  const kv={get:async(key:string)=>saved.get(key)??null,put:async(key:string,value:string)=>{saved.set(key,value);}};
  let calls=0;
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>{calls+=1;return new Response(Uint8Array.from([1,2,3]),{status:200,headers:{'content-type':'audio/mpeg'}});};
  try{
   const env={ELEVENLABS_API_KEY:'secret',AZRAIL_KV:kv} as never;
   const body={prompt:'Instrumental melodic techno remix with a new melody.',instrumental:true,accountId:'acct'};
   const first=await generateRemoteMusic(env,body);
   const second=await generateRemoteMusic(env,body);
   expect(calls).toBe(1);
   expect(second.audioBase64).toBe(first.audioBase64);
   expect(second.reused).toBe(true);
   saved.clear();
   await kv.put('media-job:running',JSON.stringify({status:'running',startedAt:Date.now(),providerCalls:1}));
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('acct\n1\nInstrumental melodic techno remix with a new melody.'));
   const id=`media-job:${[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}`;
   saved.set(id,JSON.stringify({status:'running',startedAt:Date.now(),providerCalls:1}));
   await expect(generateRemoteMusic(env,body)).rejects.toThrow(/Второй платный запуск/);
   expect(calls).toBe(1);
  }finally{globalThis.fetch=previous;}
 });
});
