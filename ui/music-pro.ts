import type {StoryBlock} from './media';

export const SHELF_CAP=20;
export const PROJECT_FILE_LIMIT=50*1024*1024;
export type ShelfRole='bass'|'chord'|'hat'|'hook';
export type ShelfPiece={id:string;source:string;kind:'reference'|'ours';title:string;detail:string;keyRoot:string|null;bpm:number|null;role:ShelfRole};

export function formatBytes(bytes:number){
 if(!Number.isFinite(bytes)||bytes<0)return '—';
 if(bytes<1024)return `${Math.round(bytes)} Б`;
 if(bytes<1024*1024)return `${(bytes/1024).toFixed(0)} КБ`;
 return `${(bytes/(1024*1024)).toFixed(1)} МБ`;
}
export function tenMinuteMemory(deviceMemory?:number){
 if(deviceMemory==null||!Number.isFinite(deviceMemory)||deviceMemory<=0)return {ok:true,text:'Память устройства не сообщена. На 10:00 может понадобиться около 400 МБ.'};
 if(deviceMemory<=2)return {ok:false,text:'Этот телефон не удержит трек на 10:00. Собери эскиз или открой студию на компьютере.'};
 if(deviceMemory<=4)return {ok:true,text:'Памяти мало. 10:00 может занять около 400 МБ и идти долго.'};
 return {ok:true,text:''};
}
export function lengthenSection(blocks:StoryBlock[],id:string,take=8):StoryBlock[]{
 const index=blocks.findIndex(block=>block.id===id);
 if(index<0)throw Error('Этой секции в треке нет.');
 const neighbors=[index-1,index+1].filter(at=>at>=0&&at<blocks.length&&(blocks[at]?.bars??0)>4);
 const donor=neighbors.sort((a,b)=>(blocks[b]?.bars??0)-(blocks[a]?.bars??0))[0];
 if(donor==null)throw Error('Соседней секции не хватает тактов.');
 const moved=Math.min(take,(blocks[donor]?.bars??0)-4);
 if(moved<1)throw Error('Соседней секции не хватает тактов.');
 return blocks.map((block,at)=>at===index?{...block,bars:block.bars+moved}:at===donor?{...block,bars:block.bars-moved}:block);
}
export function concatSlices(order:Array<{id:string;muted?:boolean}>,slices:Array<{id:string;bars:number;left:Float32Array;right:Float32Array}>,fadeSamples=0){
 const map=new Map(slices.map(slice=>[slice.id,slice]));
 const chosen=order.map(item=>{
  const slice=map.get(item.id);
  if(!slice)throw Error('Этой секции в собранном треке нет.');
  if(!item.muted)return slice;
  return {id:slice.id,bars:slice.bars,left:new Float32Array(slice.left.length),right:new Float32Array(slice.right.length)};
 });
 const total=chosen.reduce((sum,slice)=>sum+slice.left.length,0),left=new Float32Array(total),right=new Float32Array(total);
 let at=0;
 for(const slice of chosen){
  left.set(slice.left,at);right.set(slice.right,at);
  if(fadeSamples>0){const fade=Math.min(fadeSamples,Math.floor(slice.left.length/2));for(let index=0;index<fade;index++){const gain=index/fade;left[at+index]*=gain;right[at+index]*=gain;left[at+slice.left.length-1-index]*=gain;right[at+slice.right.length-1-index]*=gain;}}
  at+=slice.left.length;
 }
 return {left,right};
}
export function bounceToMaster(stems:Float32Array[],master:Float32Array){
 const out=stems.map(stem=>new Float32Array(master.length));
 for(let index=0;index<master.length;index++){
  let sum=0;
  for(const stem of stems)sum+=stem[index]??0;
  const ratio=Math.abs(sum)>1e-8?master[index]/sum:0;
  for(let stem=0;stem<stems.length;stem++)out[stem][index]=(stems[stem][index]??0)*ratio;
 }
 return out;
}
export function referenceGain(referenceLufs:number|null,trackLufs:number|null){
 if(referenceLufs==null||trackLufs==null)return {volume:1,text:'Нужны измеренные LUFS референса и трека. Громкость не поднимается.'};
 const delta=referenceLufs-trackLufs;
 if(delta>=0)return {volume:1,text:'Трек тише референса. Громкость не поднимается.'};
 return {volume:Math.max(.05,10**(delta/20)),text:'Трек громче. Приглушил до референса, выше не поднимаю.'};
}
const SHELF_ROLES:Array<[ShelfRole,string]>=[['bass','Бас'],['chord','Аккорд'],['hat','Хэт'],['hook','Хук']];
export function shelfFromAnalysis(fileName:string,bpm:number|null,keyRoot:string|null,existing:number):ShelfPiece[]{
 const room=Math.max(0,SHELF_CAP-existing),pieces:ShelfPiece[]=[];
 for(const [role,title] of SHELF_ROLES){
  if(pieces.length>=room)break;
  pieces.push({id:`${fileName}:ref:${role}:${existing+pieces.length}`,source:fileName,kind:'reference',title:`${title} · ориентир из файла`,detail:'Это описание характера. Оригинальный синтезатор из микса не извлекается.',keyRoot,bpm,role});
  if(pieces.length>=room)break;
  pieces.push({id:`${fileName}:ours:${role}:${existing+pieces.length}`,source:fileName,kind:'ours',title:`${title} · наш звук в этом характере`,detail:'Короткая новая партия. Мелодия референса не копируется.',keyRoot,bpm,role});
 }
 return pieces;
}
