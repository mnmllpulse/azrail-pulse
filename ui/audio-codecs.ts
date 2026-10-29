export type Pcm={sampleRate:number;channels:number;bits:16|24;samples:Int32Array};

function textAt(view:DataView,offset:number,size:number){let out='';for(let i=0;i<size;i++)out+=String.fromCharCode(view.getUint8(offset+i));return out;}
function writeText(view:DataView,offset:number,text:string){for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));}
function quantize24(sample:number){const x=Math.max(-1,Math.min(1,sample));const q=Math.round(x<0?x*8388608:x*8388607);return Math.max(-8388608,Math.min(8388607,q));}

export function wavFromChannels(channels:Float32Array[],sampleRate:number):Blob{
 const count=channels.length,n=channels[0]?.length??0,dataBytes=n*count*3,header=new ArrayBuffer(44),view=new DataView(header);
 writeText(view,0,'RIFF');view.setUint32(4,36+dataBytes,true);writeText(view,8,'WAVE');writeText(view,12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sampleRate,true);
 view.setUint32(28,sampleRate*count*3,true);view.setUint16(32,count*3,true);view.setUint16(34,24,true);writeText(view,36,'data');view.setUint32(40,dataBytes,true);
 const parts:BlobPart[]=[header],frames=16384;
 for(let start=0;start<n;start+=frames){
  const length=Math.min(frames,n-start),raw=new Uint8Array(length*count*3);
  for(let i=0;i<length;i++)for(let c=0;c<count;c++){const q=quantize24(channels[c]?.[start+i]??0),at=(i*count+c)*3;raw[at]=q&255;raw[at+1]=(q>>8)&255;raw[at+2]=(q>>16)&255;}
  parts.push(raw);
 }
 return new Blob(parts,{type:'audio/wav'});
}

export function wavFromPcm(pcm:Pcm):Blob{
 const width=pcm.bits===24?3:2,dataBytes=pcm.samples.length*width,header=new ArrayBuffer(44),view=new DataView(header);
 writeText(view,0,'RIFF');view.setUint32(4,36+dataBytes,true);writeText(view,8,'WAVE');writeText(view,12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,pcm.channels,true);view.setUint32(24,pcm.sampleRate,true);
 view.setUint32(28,pcm.sampleRate*pcm.channels*width,true);view.setUint16(32,pcm.channels*width,true);view.setUint16(34,pcm.bits,true);writeText(view,36,'data');view.setUint32(40,dataBytes,true);
 const parts:BlobPart[]=[header],step=16384*pcm.channels;
 for(let start=0;start<pcm.samples.length;start+=step){
  const count=Math.min(step,pcm.samples.length-start),raw=new Uint8Array(count*width),out=new DataView(raw.buffer);
  for(let i=0;i<count;i++){
   const sample=pcm.samples[start+i]??0;
   if(pcm.bits===16)out.setInt16(i*2,Math.max(-32768,Math.min(32767,sample)),true);
   else{const q=Math.max(-8388608,Math.min(8388607,sample));raw[i*3]=q&255;raw[i*3+1]=(q>>8)&255;raw[i*3+2]=(q>>16)&255;}
  }
  parts.push(raw);
 }
 return new Blob(parts,{type:'audio/wav'});
}

export async function pcmFromWav(blob:Blob):Promise<Pcm>{
 const view=new DataView(await blob.arrayBuffer());
 if(textAt(view,0,4)!=='RIFF'||textAt(view,8,4)!=='WAVE')throw Error('Это не WAV.');
 let offset=12,channels=0,sampleRate=0,bits:16|24=16,dataOffset=-1,dataBytes=0;
 while(offset+8<=view.byteLength){
  const id=textAt(view,offset,4),size=view.getUint32(offset+4,true);
  if(id==='fmt '){channels=view.getUint16(offset+10,true);sampleRate=view.getUint32(offset+12,true);const depth=view.getUint16(offset+22,true);if(depth!==16&&depth!==24)throw Error('WAV здесь читается как 16 или 24 бит.');bits=depth;}
  else if(id==='data'){dataOffset=offset+8;dataBytes=size;break;}
  offset+=8+size+(size&1);
 }
 if(dataOffset<0||channels<1)throw Error('В WAV нет звука.');
 const width=bits===24?3:2,count=Math.floor(dataBytes/width),samples=new Int32Array(count);
 for(let i=0;i<count;i++){
  if(bits===16)samples[i]=view.getInt16(dataOffset+i*2,true);
  else{let value=view.getUint8(dataOffset+i*3)|(view.getUint8(dataOffset+i*3+1)<<8)|(view.getUint8(dataOffset+i*3+2)<<16);if(value&0x800000)value|=~0xffffff;samples[i]=value;}
 }
 return {sampleRate,channels,bits,samples};
}

const RATE_44100=[0x40,0x0e,0xac,0x44,0,0,0,0,0,0];
function extended80(rate:number){if(rate===44100)return RATE_44100;if(rate===48000)return [0x40,0x0e,0xbb,0x80,0,0,0,0,0,0];throw Error('AIFF собирается на 44100 или 48000 Гц.');}

export function aiffFromPcm(pcm:Pcm):Blob{
 const width=pcm.bits===24?3:2,frames=pcm.samples.length/pcm.channels,soundBytes=pcm.samples.length*width,fileSize=54+soundBytes,head=new ArrayBuffer(54),view=new DataView(head);
 writeText(view,0,'FORM');view.setUint32(4,fileSize-8);writeText(view,8,'AIFF');writeText(view,12,'COMM');view.setUint32(16,18);view.setUint16(20,pcm.channels);view.setUint32(22,frames);view.setUint16(26,pcm.bits);
 extended80(pcm.sampleRate).forEach((byte,index)=>view.setUint8(28+index,byte));
 writeText(view,38,'SSND');view.setUint32(42,8+soundBytes);view.setUint32(46,0);view.setUint32(50,0);
 const parts:BlobPart[]=[head],step=16384*pcm.channels;
 for(let start=0;start<pcm.samples.length;start+=step){
  const count=Math.min(step,pcm.samples.length-start),raw=new Uint8Array(count*width);
  for(let i=0;i<count;i++){
   const sample=pcm.samples[start+i]??0;
   if(pcm.bits===16){const q=Math.max(-32768,Math.min(32767,sample));raw[i*2]=(q>>8)&255;raw[i*2+1]=q&255;}
   else{const q=Math.max(-8388608,Math.min(8388607,sample));raw[i*3]=(q>>16)&255;raw[i*3+1]=(q>>8)&255;raw[i*3+2]=q&255;}
  }
  parts.push(raw);
 }
 return new Blob(parts,{type:'audio/aiff'});
}

function crc8(data:Uint8Array){let crc=0;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc&0x80)?((crc<<1)^0x07)&0xff:(crc<<1)&0xff;}return crc;}
function crc16(data:Uint8Array){let crc=0;for(const byte of data){crc^=byte<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x8005)&0xffff:(crc<<1)&0xffff;}return crc;}
function utf8Frame(n:number){if(n<128)return [n];if(n<2048)return [0xc0|(n>>6),0x80|(n&63)];return [0xe0|(n>>12),0x80|((n>>6)&63),0x80|(n&63)];}

function flacFrame(pcm:Pcm,offset:number,block:number,index:number){
 const width=pcm.bits===24?3:2,rateCode=pcm.sampleRate===44100?9:13,blockCode=block===4096?12:7,sampleCode=pcm.bits===24?6:4;
 const header=[0xff,0xf8,(blockCode<<4)|rateCode,((pcm.channels===1?0:1)<<4)|(sampleCode<<1),...utf8Frame(index)];
 if(blockCode===7)header.push((block-1)>>8,(block-1)&255);
 if(rateCode===13)header.push((pcm.sampleRate>>8)&255,pcm.sampleRate&255);
 header.push(crc8(Uint8Array.from(header)));
 const body=new Uint8Array(header.length+pcm.channels*(1+block*width));
 body.set(header);
 let cursor=header.length;
 for(let channel=0;channel<pcm.channels;channel++){
  body[cursor++]=0x02;
  for(let i=0;i<block;i++){
   const sample=pcm.samples[(offset+i)*pcm.channels+channel]??0;
   if(pcm.bits===24){const q=Math.max(-8388608,Math.min(8388607,sample));body[cursor++]=(q>>16)&255;body[cursor++]=(q>>8)&255;body[cursor++]=q&255;}
   else{body[cursor++]=sample>>8&255;body[cursor++]=sample&255;}
  }
 }
 const framed=body.subarray(0,cursor),footer=new Uint8Array(cursor+2),sum=crc16(framed);
 footer.set(framed);footer[cursor]=sum>>8;footer[cursor+1]=sum&255;
 return footer;
}

export function flacFromPcm(pcm:Pcm):Blob{
 if(pcm.channels<1||pcm.channels>2)throw Error('FLAC здесь собирается в моно или стерео.');
 const frames:Uint8Array[]=[];let offset=0,index=0,min=0,max=0,minBlock=0,maxBlock=0,total=pcm.samples.length/pcm.channels;
 while(offset<total){
  const block=Math.min(4096,total-offset),frame=flacFrame(pcm,offset,block,index);
  if(!min||frame.length<min)min=frame.length;if(frame.length>max)max=frame.length;
  if(!minBlock||block<minBlock)minBlock=block;if(block>maxBlock)maxBlock=block;
  frames.push(frame);offset+=block;index++;
 }
 const info=new Uint8Array(38);info[0]=0x80;info[3]=34;
 const view=new DataView(info.buffer);
 view.setUint16(4,minBlock);view.setUint16(6,maxBlock);
 view.setUint8(8,(min>>16)&255);view.setUint8(9,(min>>8)&255);view.setUint8(10,min&255);
 view.setUint8(11,(max>>16)&255);view.setUint8(12,(max>>8)&255);view.setUint8(13,max&255);
 const packed=(BigInt(pcm.sampleRate)<<44n)|(BigInt(pcm.channels-1)<<41n)|(BigInt(pcm.bits-1)<<36n)|BigInt(total);
 view.setUint32(14,Number((packed>>32n)&0xffffffffn));view.setUint32(18,Number(packed&0xffffffffn));
 const parts=[new Uint8Array([0x66,0x4c,0x61,0x43]),info,...frames];
 return new Blob(parts as BlobPart[],{type:'audio/flac'});
}

function clamp16(sample:number){return Math.max(-32768,Math.min(32767,sample));}
type LameEncoder={encodeBuffer:(left:Int16Array,right?:Int16Array)=>Uint8Array;flush:()=>Uint8Array};
export async function mp3FromPcm(pcm:Pcm):Promise<Blob>{
 const lame=await import('@breezystack/lamejs') as {Mp3Encoder?:new(channels:number,rate:number,kbps:number)=>LameEncoder;default?:{Mp3Encoder?:new(channels:number,rate:number,kbps:number)=>LameEncoder}};
 const Encoder=lame.Mp3Encoder??lame.default?.Mp3Encoder;
 if(!Encoder)throw Error('Кодировщик MP3 не загрузился.');
 const encoder=new Encoder(pcm.channels,pcm.sampleRate,320),frames=pcm.samples.length/pcm.channels,shift=pcm.bits===24?8:0,step=1152,left=new Int16Array(step),right=new Int16Array(step),chunks:Uint8Array[]=[];
 for(let i=0;i<frames;i+=step){
  const count=Math.min(step,frames-i);
  for(let s=0;s<count;s++){const at=(i+s)*pcm.channels;left[s]=clamp16((pcm.samples[at]??0)>>shift);if(pcm.channels>1)right[s]=clamp16((pcm.samples[at+1]??0)>>shift);}
  const block=encoder.encodeBuffer(left.subarray(0,count),pcm.channels>1?right.subarray(0,count):undefined);
  if(block.length)chunks.push(block);
 }
 const tail=encoder.flush();if(tail.length)chunks.push(tail);
 if(!chunks.length)throw Error('MP3 получился пустым.');
 return new Blob(chunks as BlobPart[],{type:'audio/mpeg'});
}

const MP3_BITRATES=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0];
export function mp3Bitrate(bytes:Uint8Array){
 const end=Math.min(bytes.length-3,8192);
 for(let index=0;index<end;index++){
  if(bytes[index]!==0xff||((bytes[index+1]??0)&0xe0)!==0xe0)continue;
  const header=bytes[index+1]??0,bits=bytes[index+2]??0;
  if(((header>>3)&3)!==3||((header>>1)&3)!==1)continue;
  return MP3_BITRATES[(bits>>4)&15]||null;
 }
 return null;
}
export async function trackFile(wav:Blob,format:'aiff'|'flac'|'mp3'){
 const pcm=await pcmFromWav(wav);
 if(format==='aiff')return aiffFromPcm(pcm);
 if(format==='flac')return flacFromPcm(pcm);
 return mp3FromPcm(pcm);
}
