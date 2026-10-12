import {describe,expect,it} from 'vitest';
import {composeMusicSession,composeNotes} from '../ui/media';
import {parseMusicSessionRequest} from '../src/lib/music-studio';

describe('professional Music Studio',()=>{
 it('builds deterministic bounded arrangements',()=>{
  const input={prompt:'dark warehouse pulse',bpm:124,keyRoot:'F',scale:'minor' as const,bars:8,timeSignature:'4/4' as const,genre:'dark-minimal' as const,mood:'hypnotic' as const,pattern:'arpeggio' as const,arrangement:'intro-build-drop' as const,synthPreset:'dark-pulse' as const};
  const a=composeMusicSession(input),b=composeMusicSession(input);
  expect(a).toEqual(b);expect(a.notes.length).toBeGreaterThan(20);expect(a.notes.every(n=>n.start>=0&&n.start+n.length<=32)).toBe(true);
 });
 it('resolves Auto BPM and key deterministically',()=>{
  const input={prompt:'atmospheric signal',bpm:null,keyRoot:'auto',scale:'dorian' as const,bars:4,timeSignature:'3/4' as const,genre:'ambient' as const,mood:'atmospheric' as const,pattern:'ambient' as const,arrangement:'minimal-evolution' as const,synthPreset:'warm-pad' as const};
  const a=composeMusicSession(input),b=composeMusicSession(input);
  expect(a.bpm).toBe(b.bpm);expect(a.keyRoot).toBe(b.keyRoot);expect(a.bpm).toBeGreaterThanOrEqual(60);expect(a.bpm).toBeLessThanOrEqual(180);
 });
 it('preserves the legacy composeNotes compatibility contract',()=>{const a=composeNotes('orbit',124,8);expect(a.bpm).toBe(124);expect(a.bars).toBe(8);expect(a.notes.every(n=>n.start+n.length<=32)).toBe(true);});
 it('validates durable session metadata',()=>{
  const parsed=parseMusicSessionRequest({projectId:'',prompt:'Pulse',genre:'dark-minimal',mood:'driving',bpm:126,keyRoot:'F#',scale:'minor',bars:8,timeSignature:'4/4',pattern:'pulse',arrangement:'loop',synthPreset:'acid',seed:7,wavArtifactId:null,midiArtifactId:null});
  expect(parsed.bpm).toBe(126);expect(parsed.keyRoot).toBe('F#');expect(()=>parseMusicSessionRequest({...parsed,bpm:300})).toThrow();
 });
});
