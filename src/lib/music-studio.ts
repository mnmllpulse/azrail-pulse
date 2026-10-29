import { oneOf as guardOneOf } from './input-guards';
import {AccessError} from './accounts';

export const MUSIC_GENRES=['dark-minimal','melodic-techno','ambient','industrial','cinematic'] as const;
export const MUSIC_MOODS=['hypnotic','driving','dark','euphoric','atmospheric'] as const;
export const MUSIC_SCALES=['minor','major','dorian','phrygian'] as const;
const MUSIC_KEYS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
export const MUSIC_TIME_SIGNATURES=['4/4','3/4','6/8'] as const;
export const MUSIC_PATTERNS=['pulse','arpeggio','bassline','chords','ambient'] as const;
export const MUSIC_ARRANGEMENTS=['loop','intro-build-drop','minimal-evolution','section-story'] as const;
export const MUSIC_SYNTH_PRESETS=['dark-pulse','warm-pad','glass','sub','acid'] as const;

export type MusicSessionRequest={
 projectId:string;
 prompt:string;
 genre:typeof MUSIC_GENRES[number];
 mood:typeof MUSIC_MOODS[number];
 bpm:number;
 keyRoot:typeof MUSIC_KEYS[number];
 scale:typeof MUSIC_SCALES[number];
 bars:number;
 timeSignature:typeof MUSIC_TIME_SIGNATURES[number];
 pattern:typeof MUSIC_PATTERNS[number];
 arrangement:typeof MUSIC_ARRANGEMENTS[number];
 synthPreset:typeof MUSIC_SYNTH_PRESETS[number];
 seed:number;
 wavArtifactId:string|null;
 midiArtifactId:string|null;
};

const oneOf=<T extends readonly string[]>(value:unknown,allowed:T,label:string):T[number]=>guardOneOf(value,allowed,`Некорректный ${label}.`);
function uuid(value:unknown,label:string){
 if(value===undefined||value===null||value==='')return null;
 const v=String(value).trim();
 if(!/^[a-f0-9-]{36}$/i.test(v))throw new AccessError(`Некорректный ${label}.`,400);
 return v;
}
export function parseMusicSessionRequest(body:Record<string,unknown>):MusicSessionRequest{
 const projectId=typeof body.projectId==='string'?body.projectId.trim():'';
 const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
 if(!prompt||prompt.length>4000)throw new AccessError('Нужна музыкальная идея до 4 000 символов.',400);
 const bpm=Math.trunc(Number(body.bpm));
 if(!Number.isSafeInteger(bpm)||bpm<60||bpm>180)throw new AccessError('BPM должен быть от 60 до 180.',400);
 const bars=Math.trunc(Number(body.bars));
 if(!Number.isSafeInteger(bars)||bars<1||bars>640)throw new AccessError('Длина должна быть от 1 до 640 тактов.',400);
 const seed=Math.trunc(Number(body.seed));
 if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)throw new AccessError('Некорректный seed сессии.',400);
 return {
  projectId,prompt,
  genre:oneOf(body.genre,MUSIC_GENRES,'жанр'),
  mood:oneOf(body.mood,MUSIC_MOODS,'mood'),
  bpm,
  keyRoot:oneOf(body.keyRoot,MUSIC_KEYS,'тональный центр'),
  scale:oneOf(body.scale,MUSIC_SCALES,'лад'),
  bars,
  timeSignature:oneOf(body.timeSignature,MUSIC_TIME_SIGNATURES,'размер'),
  pattern:oneOf(body.pattern,MUSIC_PATTERNS,'pattern'),
  arrangement:oneOf(body.arrangement,MUSIC_ARRANGEMENTS,'arrangement'),
  synthPreset:oneOf(body.synthPreset,MUSIC_SYNTH_PRESETS,'synth preset'),
  seed,
  wavArtifactId:uuid(body.wavArtifactId,'WAV artifact'),
  midiArtifactId:uuid(body.midiArtifactId,'MIDI artifact'),
 };
}
