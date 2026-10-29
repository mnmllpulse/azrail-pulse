const RATE=44100;
const SPOKEN_HZ=140;
const VOWELS:Record<string,[number,number,number]>={
 а:[800,1200,2500],о:[500,900,2400],у:[350,760,2200],э:[530,1840,2480],е:[400,2000,2600],и:[320,2300,3000],ы:[400,1400,2400],ю:[360,1900,2500],я:[700,1500,2500],
};

export type SpokenLine={phrase:string;rate:number;samples:Float32Array;slices:Array<{from:number;to:number}>;reply?:SpokenLine|null};

export function spokenFromRecording(samples:Float32Array,rate:number,phrase:string):SpokenLine|null{
 const line=vocalLine(phrase)??'фраза из записи держится на хуке';
 const words=line.split(' ').length;
 const mono=toRate(samples,rate,RATE);
 const use=mono.subarray(0,Math.min(mono.length,RATE*8));
 const size=Math.floor(use.length/words);
 if(size<RATE*.04)return null;
 const slices:SpokenLine['slices']=[];
 for(let index=0;index<words;index++)slices.push({from:index*size,to:index===words-1?use.length:(index+1)*size});
 return {phrase:`${line} · запись`,rate:RATE,samples:use.slice(),slices};
}
function toRate(samples:Float32Array,rate:number,nextRate:number){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)return new Float32Array(0);
 if(Math.abs(rate-nextRate)<2)return samples;
 const next=Math.max(1,Math.floor(samples.length*nextRate/rate)),out=new Float32Array(next);
 for(let index=0;index<next;index++){const src=index*rate/nextRate,a=Math.floor(src),b=Math.min(samples.length-1,a+1),t=src-a;out[index]=(samples[a]??0)*(1-t)+(samples[b]??0)*t;}
 return out;
}
export function vocalLine(text:string){
 const words=text.replace(/\[[^\]]{0,80}\]/g,' ').replace(/[()"«»]/g,' ').split(/\s+/).map(word=>word.trim()).filter(word=>/[A-Za-zА-Яа-яЁё]/.test(word));
 if(words.length<4)return null;
 return words.slice(0,8).join(' ');
}

function tone(formants:[number,number,number],frames:number){
 const out=new Float32Array(frames);
 for(let i=0;i<frames;i++){
  const t=i/RATE,env=Math.sin(Math.PI*i/Math.max(1,frames-1)),pulse=.45+.55*Math.sin(2*Math.PI*SPOKEN_HZ*t);
  let y=0;for(const frequency of formants)y+=Math.sin(2*Math.PI*frequency*t);
  out[i]=y/formants.length*pulse*env*.32;
 }
 return out;
}
function noise(frames:number){
 const out=new Float32Array(frames);let state=0x123456;
 for(let i=0;i<frames;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;const env=Math.sin(Math.PI*i/Math.max(1,frames-1));out[i]=((state/4294967296)*2-1)*env*.22;}
 return out;
}
function letter(char:string){
 const formants=VOWELS[char];
 if(formants)return tone(formants,Math.floor(RATE*.09));
 if(/[бвгджзйклмнпрстфхцчшщa-z]/i.test(char))return noise(Math.floor(RATE*.045));
 return new Float32Array(0);
}
function speakWord(word:string){
 const parts=[...word.toLowerCase().replace(/ё/g,'е')].map(letter).filter(part=>part.length);
 if(!parts.length)return new Float32Array(0);
 const total=parts.reduce((sum,part)=>sum+part.length,0),out=new Float32Array(total);
 let at=0;for(const part of parts){out.set(part,at);at+=part.length;}
 return out;
}

export function vocalPhrases(text:string){
 const parts=text.split(/[.!?\n]+/).map(part=>vocalLine(part)).filter((part):part is string=>!!part);
 const unique:string[]=[];
 for(const part of parts)if(!unique.includes(part))unique.push(part);
 if(unique.length>=2)return unique.slice(0,2);
 const one=vocalLine(text);
 return one?[one]:[];
}
export function spokenFrom(phrase:string):SpokenLine|null{
 const words=phrase.trim().split(/\s+/).filter(Boolean);
 if(words.length<4||words.length>8)return null;
 const chunks:Float32Array[]=[],slices:Array<{from:number;to:number}>=[];
 let cursor=0;
 for(const word of words){
  const body=speakWord(word);
  if(body.length<RATE*.04)return null;
  slices.push({from:cursor,to:cursor+body.length});
  chunks.push(body);
  const gap=new Float32Array(Math.floor(RATE*.04));
  chunks.push(gap);
  cursor+=body.length+gap.length;
 }
 const samples=new Float32Array(cursor);let at=0;
 for(const chunk of chunks){samples.set(chunk,at);at+=chunk.length;}
 return {phrase,rate:RATE,samples,slices};
}
