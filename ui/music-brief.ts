export type RemixBriefInput={
 wish:string;
 fileName:string;
 bpm:number|null;
 keyLabel:string|null;
 camelot:string|null;
 form:string;
 pack:string;
 durationSeconds:number|null;
};

export function remixBrief(input:RemixBriefInput){
 const wish=input.wish.trim();
 const tempo=input.bpm!=null&&Number.isFinite(input.bpm)?`${Math.round(input.bpm)} BPM, measured.`:'Tempo was not measured. Do not invent one.';
 const key=input.keyLabel&&input.camelot?`${input.keyLabel}, Camelot ${input.camelot}, measured.`:'Key was not measured. Choose a key that fits the form.';
 const form=input.form.trim()||'Form was not measured. Keep a techno shape with an intro, a rise, a break, and a drop.';
 const pack=input.pack.trim()?` Pack map: ${input.pack.trim()}`:'';
 const note=wish?` The producer asked: ${wish}`:'';
 const length=input.durationSeconds!=null&&Number.isFinite(input.durationSeconds)&&input.durationSeconds>0?`Reference length is ${Math.round(input.durationSeconds)} seconds. Use it only as a hint.`:'Reference length was not measured.';
 return [
  'This is a remix.',
  'The reference is architecture only: a new melody and new synths.',
  'Do not copy the reference melody, vocal, or preset.',
  tempo,
  key,
  `Form: ${form}`,
  length,
  'Choose the length from the form. Do not pad the track to ten minutes.',
  'Instrumental melodic techno unless the producer asked for a voice.',
  `${input.fileName||'No file name'}.${pack}${note}`,
 ].join(' ');
}
