export type StudioReading={integratedLufs:number|null;truePeakDbTP:number|null;low:boolean|null;mid:boolean|null;air:boolean|null;vocal:string;gainDb?:number};

export function masterGainDb(integrated:number|null,truePeak:number|null){
 let gain=0;
 if(truePeak!=null&&truePeak>-1)gain=-1-truePeak;
 if(integrated!=null){
  const shifted=integrated+gain;
  if(shifted>-7)gain+=-8-shifted;
  else if(shifted<-9){const room=truePeak==null?0:-1-(truePeak+gain);gain+=Math.min(-8-shifted,Math.max(0,room));}
 }
 if(truePeak!=null&&truePeak+gain>-1)gain=-1-truePeak;
 return gain;
}

export function formatMaster(reading:StudioReading){
 const num=(value:number|null,digits:number,unit:string)=>value==null?'—':`${value.toFixed(digits)} ${unit}`;
 const flag=(value:boolean|null,name:string)=>value==null?`${name} —`:value?name:`${name} нет`;
 return `24 бит · 44.1 кГц · MP3 320 · ${num(reading.integratedLufs,1,'LUFS')} · пик ${num(reading.truePeakDbTP,1,'dBTP')} · ${flag(reading.low,'низ')} · ${flag(reading.mid,'середина')} · ${flag(reading.air,'верх')} · вокал: ${reading.vocal}`;
}

export async function readMaster(buffer:AudioBuffer,vocal:string):Promise<StudioReading>{
 const empty=():StudioReading=>({integratedLufs:null,truePeakDbTP:null,low:null,mid:null,air:null,vocal,gainDb:0});
 try{
  const {measurePCM}=await import('./audio-analysis');
  const channels=()=>Array.from({length:buffer.numberOfChannels},(_,index)=>buffer.getChannelData(index));
  let gainDb=0;
  const apply=(step:number)=>{if(Math.abs(step)<0.04)return;gainDb+=step;const linear=10**(step/20);for(const data of channels())for(let i=0;i<data.length;i++)data[i]*=linear;};
  let measured=await measurePCM(channels(),buffer.sampleRate);
  apply(masterGainDb(measured.integratedLufs,measured.truePeakDbTP));
  measured=await measurePCM(channels(),buffer.sampleRate);
  if(measured.truePeakDbTP!=null&&measured.truePeakDbTP>-1){apply(-1-measured.truePeakDbTP);measured=await measurePCM(channels(),buffer.sampleRate);}
  const energy=(labels:string[])=>{const rows=measured.bands.filter(band=>labels.includes(band.label));if(!rows.length||rows.every(band=>band.energyPercent==null))return null;return rows.some(band=>(band.energyPercent??0)>=1);};
  return {integratedLufs:measured.integratedLufs,truePeakDbTP:measured.truePeakDbTP,low:energy(['SUB','LOW']),mid:energy(['LOW MID','HIGH MID']),air:energy(['AIR']),vocal,gainDb};
 }catch{return empty();}
}
