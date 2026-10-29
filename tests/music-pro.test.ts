import {describe,expect,it} from 'vitest';
import {tenMinuteStory} from '../ui/media';
import {bounceToMaster,concatSlices,lengthenSection,referenceGain,shelfFromAnalysis,tenMinuteMemory} from '../ui/music-pro';

describe('music studio shelf and section edits',()=>{
 it('moves bars to a drop without changing the total',()=>{
  const story=tenMinuteStory(124,'4/4');
  const next=lengthenSection(story,'drop-2');
  expect(next.reduce((sum,block)=>sum+block.bars,0)).toBe(story.reduce((sum,block)=>sum+block.bars,0));
  expect(next.find(block=>block.id==='drop-2')!.bars).toBeGreaterThan(story.find(block=>block.id==='drop-2')!.bars);
 });
 it('reorders rendered sections and keeps a muted section silent',()=>{
  const first={id:'intro',bars:1,left:Float32Array.from([.2,.2]),right:Float32Array.from([.2,.2])};
  const second={id:'drop-1',bars:1,left:Float32Array.from([.4,.4]),right:Float32Array.from([.4,.4])};
  const moved=concatSlices([{id:'drop-1'},{id:'intro',muted:true}],[first,second]);
  expect(moved.left[0]).toBeCloseTo(.4);
  expect(moved.left[1]).toBeCloseTo(.4);
  expect(moved.left[2]).toBe(0);
  expect(moved.left[3]).toBe(0);
  expect(moved.right[2]).toBe(0);
  expect(()=>concatSlices([{id:'missing'}],[first])).toThrow(/секции/);
 });
 it('bounces part files so their sum is the master',()=>{
  const master=Float32Array.from([.3,-.2,.5,0]);
  const bounced=bounceToMaster([Float32Array.from([.2,-.1,.2,0]),Float32Array.from([.1,-.1,.3,0])],master);
  for(let index=0;index<master.length;index++)expect((bounced[0][index]+bounced[1][index])).toBeCloseTo(master[index]);
 });
 it('never turns a reference up and tells the truth about memory',()=>{
  expect(referenceGain(-8,-6).volume).toBeLessThan(1);
  expect(referenceGain(-10,-14).volume).toBe(1);
  expect(referenceGain(null,-8).volume).toBe(1);
  expect(tenMinuteMemory(2).ok).toBe(false);
  expect(tenMinuteMemory(4).ok).toBe(true);
  expect(tenMinuteMemory(4).text).toContain('400');
  expect(tenMinuteMemory(undefined).ok).toBe(true);
  expect(tenMinuteMemory(8).text).toBe('');
 });
 it('keeps twenty sounds and labels file character separately from our sound',()=>{
  const shelf=['one.mp3','two.mp3','three.mp3'].reduce<ReturnType<typeof shelfFromAnalysis>>((all,name)=>all.concat(shelfFromAnalysis(name,124,'A',all.length)),[]);
  expect(shelf).toHaveLength(20);
  expect(shelfFromAnalysis('four.mp3',null,null,20)).toEqual([]);
  expect(shelf.filter(piece=>piece.kind==='reference').every(piece=>piece.title.includes('ориентир из файла'))).toBe(true);
  expect(shelf.filter(piece=>piece.kind==='ours').every(piece=>piece.title.includes('наш звук'))).toBe(true);
  expect(shelf.every(piece=>piece.detail.includes('не'))).toBe(true);
 });
});
