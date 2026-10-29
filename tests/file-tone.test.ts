import {describe,expect,it} from 'vitest';
import {cyclesFromMix} from '../ui/file-tone';

function tone(hz:number,rate:number,seconds:number,gain=1){
 const data=new Float32Array(Math.floor(rate*seconds));
 for(let i=0;i<data.length;i++)data[i]=Math.sin(2*Math.PI*hz*i/rate)*gain;
 return data;
}
describe('file tone',()=>{
 it('takes a bass cycle and a body cycle from a mix',()=>{
  const rate=22050,low=tone(55,rate,2,.8),high=tone(330,rate,2,.45),mix=low.map((sample,index)=>sample+(high[index]??0));
  const taken=cyclesFromMix(mix,rate);
  expect(taken).not.toBeNull();
  expect(taken!.bass.fund).toBeGreaterThan(48);
  expect(taken!.bass.fund).toBeLessThan(64);
  expect(taken!.body.fund).toBeGreaterThan(280);
  expect(taken!.body.fund).toBeLessThan(380);
  expect(taken!.bass.samples.length).toBeGreaterThan(8);
 });
 it('leaves noise without a cycle',()=>{
  const mix=new Float32Array(22050);let state=1;
  for(let i=0;i<mix.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;mix[i]=state/4294967296*2-1;}
  expect(cyclesFromMix(mix,22050)).toBeNull();
 });
});
