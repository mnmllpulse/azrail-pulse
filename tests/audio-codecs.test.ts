import {describe,expect,it} from 'vitest';
import {aiffFromPcm,flacFromPcm,mp3Bitrate,mp3FromPcm,pcmFromWav,wavFromPcm,type Pcm} from '../ui/audio-codecs';

const pcm:Pcm={sampleRate:44100,channels:2,bits:16,samples:Int32Array.from([1000,-1000,2000,-2000,3000,-3000])};
const wide:Pcm={sampleRate:44100,channels:2,bits:24,samples:Int32Array.from([256000,-256000,400000,-400000])};

function wav(data:Pcm){
 const bytes=new ArrayBuffer(44+data.samples.length*2),view=new DataView(bytes);
 const text=(at:number,value:string)=>[...value].forEach((char,index)=>view.setUint8(at+index,char.charCodeAt(0)));
 text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,data.channels,true);view.setUint32(24,data.sampleRate,true);view.setUint32(28,data.sampleRate*data.channels*2,true);view.setUint16(32,data.channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,data.samples.length*2,true);
 for(let i=0;i<data.samples.length;i++)view.setInt16(44+i*2,data.samples[i],true);
 return new Blob([bytes],{type:'audio/wav'});
}

describe('track files',()=>{
 it('reads the wav it was given and writes a Mac AIFF',async()=>{
  const back=await pcmFromWav(wav(pcm));
  expect([...back.samples]).toEqual([...pcm.samples]);
  const aiff=new DataView(await aiffFromPcm(pcm).arrayBuffer());
  expect(String.fromCharCode(aiff.getUint8(0),aiff.getUint8(1),aiff.getUint8(2),aiff.getUint8(3))).toBe('FORM');
  expect(String.fromCharCode(aiff.getUint8(8),aiff.getUint8(9),aiff.getUint8(10),aiff.getUint8(11))).toBe('AIFF');
  expect(aiff.getInt16(54)).toBe(1000);
 });
 it('writes a flac container with the same samples',async()=>{
  const bytes=new Uint8Array(await flacFromPcm(pcm).arrayBuffer());
  expect(String.fromCharCode(...bytes.slice(0,4))).toBe('fLaC');
  expect(bytes.includes(0x03)&&bytes.includes(0xe8)).toBe(true);
  expect(bytes[42]).toBe(0xff);
 });
 it('writes an mp3 frame',async()=>{
  const tone=new Int16Array(1152*2);
  for(let i=0;i<1152;i++){const sample=Math.round(Math.sin(i/12)*8000);tone[i*2]=sample;tone[i*2+1]=sample;}
  const bytes=new Uint8Array(await (await mp3FromPcm({sampleRate:44100,channels:2,samples:tone})).arrayBuffer());
  expect(bytes.length).toBeGreaterThan(100);
  expect(bytes[0]).toBe(0xff);
  expect(bytes[2]>>4).toBe(14);
 });
 it('keeps a 24-bit master and does not offer a lower mp3',async()=>{
  const back=await pcmFromWav(wavFromPcm(wide));
  expect(back.bits).toBe(24);
  expect([...back.samples]).toEqual([...wide.samples]);
  const aiff=new DataView(await aiffFromPcm(wide).arrayBuffer());
  expect(aiff.getUint16(26)).toBe(24);
  const flac=new Uint8Array(await flacFromPcm(wide).arrayBuffer());
  expect(String.fromCharCode(...flac.slice(0,4))).toBe('fLaC');
  expect((flac[45]>>1)&7).toBe(6);
  const mp3=new Uint8Array(await (await mp3FromPcm(wide)).arrayBuffer());
  expect(mp3[0]).toBe(0xff);
  expect(mp3[2]>>4).toBe(14);
  expect(mp3Bitrate(mp3)).toBe(320);
  expect(mp3Bitrate(new Uint8Array([0xff,0xfb,0x90,0]))).toBe(128);
 });
});
