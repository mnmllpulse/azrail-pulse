export type FileCycle={samples:Float32Array;fund:number};
export type FileTone={bass:FileCycle;body:FileCycle};

function biquad(input:Float32Array,rate:number,freq:number,kind:'low'|'high'){
 const out=new Float32Array(input.length),q=.707,w0=2*Math.PI*Math.min(freq,rate*.45)/rate,cos=Math.cos(w0),sin=Math.sin(w0),alpha=sin/(2*q);
 const b0=kind==='low'?(1-cos)/2:(1+cos)/2,b1=kind==='low'?1-cos:-(1+cos),b2=b0,a0=1+alpha,a1=-2*cos,a2=1-alpha;
 let x1=0,x2=0,y1=0,y2=0;
 for(let i=0;i<input.length;i++){
  const x=input[i]??0,y=(b0/a0)*x+(b1/a0)*x1+(b2/a0)*x2-(a1/a0)*y1-(a2/a0)*y2;
  x2=x1;x1=x;y2=y1;y1=y;out[i]=y;
 }
 return out;
}
function decimate(input:Float32Array,factor:number){
 const out=new Float32Array(Math.floor(input.length/factor));
 for(let i=0;i<out.length;i++)out[i]=input[i*factor]??0;
 return out;
}
function bestCycle(detect:Float32Array,detectRate:number,full:Float32Array,fullRate:number,factor:number,minHz:number,maxHz:number):FileCycle|null{
 const minLag=Math.max(2,Math.floor(detectRate/maxHz)),maxLag=Math.floor(detectRate/minHz),win=Math.floor(detectRate*.18);
 if(detect.length<win+maxLag+2)return null;
 let bestScore=0,bestLag=0,bestAt=0;
 const hop=Math.max(1,Math.floor(detectRate*.3));
 for(let at=0;at+win+maxLag<detect.length;at+=hop){
  let energy=0;
  for(let i=0;i<win;i+=4)energy+=(detect[at+i]??0)**2;
  if(energy<.002)continue;
  for(let lag=minLag;lag<=maxLag;lag++){
   let corr=0,norm=0;
   for(let i=0;i<win;i+=2){const a=detect[at+i]??0,b=detect[at+i+lag]??0;corr+=a*b;norm+=a*a;}
   const score=norm>1e-8?corr/norm:0;
   if(score>bestScore){bestScore=score;bestLag=lag;bestAt=at;}
  }
 }
 if(bestScore<.45||bestLag<2)return null;
 const fullLag=Math.max(8,Math.round(bestLag*factor)),fullAt=Math.min(Math.max(0,full.length-fullLag),Math.max(0,Math.round(bestAt*factor)));
 const samples=new Float32Array(fullLag);
 let mean=0;
 for(let i=0;i<fullLag;i++)mean+=full[fullAt+i]??0;
 mean/=fullLag;
 let peak=0;
 for(let i=0;i<fullLag;i++){samples[i]=(full[fullAt+i]??0)-mean;peak=Math.max(peak,Math.abs(samples[i]));}
 if(peak<1e-4)return null;
 const fade=Math.min(12,Math.floor(fullLag/8));
 for(let i=0;i<fade;i++){const w=i/fade;samples[i]*=w;samples[fullLag-1-i]*=w;}
 for(let i=0;i<fullLag;i++)samples[i]=samples[i]/peak*.9;
 return {samples,fund:fullRate/fullLag};
}
export function cyclesFromMix(mono:Float32Array,sampleRate:number):FileTone|null{
 if(mono.length<sampleRate*.6||sampleRate<8000)return null;
 const start=Math.floor(mono.length*.25),length=Math.min(mono.length-start,Math.floor(sampleRate*8)),slice=mono.subarray(start,start+length);
 const factor=Math.max(1,Math.round(sampleRate/8000)),detectRate=Math.round(sampleRate/factor);
 const bassFull=biquad(slice,sampleRate,160,'low'),bodyFull=biquad(biquad(slice,sampleRate,2200,'low'),sampleRate,180,'high');
 const bass=bestCycle(decimate(bassFull,factor),detectRate,bassFull,sampleRate,factor,35,140);
 const body=bestCycle(decimate(bodyFull,factor),detectRate,bodyFull,sampleRate,factor,90,900);
 if(!bass&&!body)return null;
 return {bass:bass??body!,body:body??bass!};
}
export async function toneFromFile(file:File):Promise<FileTone|null>{
 const ctx=new AudioContext();
 try{
  const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
  const left=decoded.getChannelData(0),right=decoded.numberOfChannels>1?decoded.getChannelData(1):left,mono=new Float32Array(left.length);
  for(let i=0;i<left.length;i++)mono[i]=((left[i]??0)+(right[i]??0))/2;
  return cyclesFromMix(mono,decoded.sampleRate);
 }finally{await ctx.close();}
}
