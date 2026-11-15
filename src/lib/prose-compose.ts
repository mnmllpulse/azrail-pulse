export const PROSE_LIMIT=8000;
export const PROSE_MODES=['keep','directions','short','picture','reel'] as const;
export const PROSE_TONES=['plain','darker','stricter','quieter'] as const;
export type ProseMode=typeof PROSE_MODES[number];
export type ProseTone=typeof PROSE_TONES[number];
export type ProseSection={name:string;line:string};
export type ProseDraft={title:string;text:string;sections:ProseSection[]};
export const PROSE_HANDOFF_KEY='pulse.prose.handoff.v1';
export type ProseHandoff={version:1;title:string;text:string;sections:ProseSection[];savedAt:number};
export function proseHandoff(draft:ProseDraft):ProseHandoff{return {version:1,title:draft.title,text:draft.text,sections:draft.sections,savedAt:Date.now()};}
export function readProseHandoff(raw:string|null):ProseHandoff|null{
 if(!raw)return null;
 try{
  const parsed=JSON.parse(raw) as Partial<ProseHandoff>;
  if(!parsed||parsed.version!==1||typeof parsed.text!=='string'||!parsed.text.trim())return null;
  const sections=Array.isArray(parsed.sections)?parsed.sections.filter((item):item is ProseSection=>!!item&&typeof item.name==='string'&&typeof item.line==='string'&&!!item.name.trim()&&!!item.line.trim()).slice(0,24):[];
  return {version:1,title:typeof parsed.title==='string'?parsed.title:'',text:parsed.text,sections,savedAt:typeof parsed.savedAt==='number'?parsed.savedAt:0};
 }catch{return null;}
}

function stripFiller(line:string){return line.replace(/(?:^|\s)(?:очень|просто|как бы|на самом деле|действительно|вообще|типа|короче|ну)(?=\s|$)/gi,' ');}
const HEADER=/^\s*\[([^\]\n]{1,80})\]\s*$/;
const REMARK=/^\s*\(/;

function words(text:string){return text.split(/\s+/).filter(Boolean);}
function shorten(text:string,count:number){const list=words(text);return (list.length<=count?list:list.slice(0,count)).join(' ');}
function sentences(text:string){const parts=text.split(/[.!?…]+/).map(part=>part.trim()).filter(Boolean);return parts.length?parts:[text];}
function clean(raw:string){
 const text=raw.replace(/\r\n/g,'\n').trim();
 if(!text)throw Error('Напиши, о чём текст.');
 if(text.length>PROSE_LIMIT)throw Error('Текст до 8000 символов.');
 return text;
}
export function shapeProseRequest(raw:string,tone:ProseTone){
 const text=clean(raw).replace(/\s+/g,' ').trim();
 let next=text;
 if(tone==='darker')next=next.replace(/!+/g,'.');
 if(tone!=='plain')next=stripFiller(next);
 return next.replace(/\s+/g,' ').trim();
}
type Block={name:string;rows:string[]};
function blocksOf(text:string):Block[]{
 const blocks:Block[]=[];
 let current:Block|null=null;
 const preface:string[]=[];
 for(const raw of text.split('\n')){
  const line=raw.trim();
  if(!line)continue;
  const header=line.match(HEADER);
  if(header){current={name:header[1].trim(),rows:[]};blocks.push(current);continue;}
  if(!current)preface.push(line);
  else current.rows.push(line);
 }
 if(preface.length)blocks.unshift({name:'Шапка',rows:preface});
 return blocks;
}
function asDraft(title:string,blocks:Block[]):ProseDraft{
 const sections=blocks.map(block=>({name:block.name,line:block.rows.join('\n')}));
 return {title,text:sections.map(section=>`[${section.name}]\n${section.line}`).join('\n\n'),sections};
}
function keepProse(raw:string):ProseDraft{
 const text=clean(raw);
 const blocks=blocksOf(text);
 if(!blocks.some(block=>block.name!=='Шапка'))return {title:'Как есть',text,sections:[]};
 return asDraft('Как есть',blocks);
}
function mapSung(rows:string[],map:(line:string)=>string){return rows.map(line=>REMARK.test(line)?line:map(line));}
function toneLine(line:string,tone:ProseTone){
 let next=line;
 if(tone==='darker')next=next.replace(/!+/g,'.');
 if(tone!=='plain')next=stripFiller(next);
 next=next.replace(/[ ]+/g,' ').trim();
 if(tone==='quieter')next=shorten(next,8);
 return next;
}
function withTone(blocks:Block[],tone:ProseTone){return blocks.map(block=>({...block,rows:mapSung(block.rows,line=>toneLine(line,tone))}));}
function dropName(name:string){return /drop|дроп|peak|main/i.test(name);}
export function composeProse(raw:string,mode:ProseMode,tone:ProseTone='plain'):ProseDraft[]{
 if(mode==='keep')return [keepProse(raw)];
 const text=clean(raw);
 if(mode==='directions'){
  const blocks=blocksOf(text);
  const source=blocks.some(block=>block.name!=='Шапка')?blocks:[{name:'Текст',rows:text.split('\n').map(line=>line.trim()).filter(Boolean)}];
  const shaped=withTone(source,tone);
  const soft=shaped.map(block=>({...block,rows:mapSung(block.rows,line=>line.replace(/!+/g,'.'))}));
  const dark=shaped.map(block=>({...block,rows:mapSung(block.rows,line=>stripFiller(line.replace(/!+/g,'.')).replace(/[ ]+/g,' ').trim())}));
  const hasDrop=shaped.some(block=>dropName(block.name));
  const short=shaped.map((block,index)=>{
   const target=hasDrop?dropName(block.name):index===shaped.length-1;
   if(!target)return block;
   let used=false;
   const rows=block.rows.flatMap(line=>{
    if(REMARK.test(line))return [line];
    if(used)return [];
    used=true;
    return [shorten(line.replace(/!+/g,'.'),4)];
   });
   return {...block,rows};
  });
  const third=hasDrop?'Короче на дропе':'Короче в конце';
  return [asDraft('Мягче',soft),asDraft('Мрачнее',dark),asDraft(third,short)];
 }
 const flat=shapeProseRequest(raw,tone);
 const lines=sentences(flat);
 const hook=shorten(lines[0]??flat,tone==='quieter'?6:10);
 const image=lines[1]??hook;
 if(mode==='short')return [
  {title:'Короче',text:hook,sections:[]},
  {title:'Прямее',text:shorten(flat,tone==='quieter'?8:14),sections:[]},
  {title:'Название',text:shorten(hook,4),sections:[]},
 ];
 if(mode==='picture')return [
  {title:'Кадр',text:`Кадр: ${hook}. Свет низкий, фон пустой.`,sections:[]},
  {title:'Обложка',text:`Обложка: ${shorten(hook,6)}. Один предмет, много тёмного поля.`,sections:[]},
  {title:'Без лишнего',text:`На картинке только: ${shorten(image,8)}. Без текста, без толпы, без неона.`,sections:[]},
 ];
 return [
  {title:'Три удара',text:`0–3 с: ${shorten(hook,6)}.\n3–7 с: ${shorten(image,8)}.\n7–10 с: одна короткая фраза.`,sections:[]},
  {title:'Тише к концу',text:`0–3 с: ${shorten(hook,4)}.\n3–7 с: пауза.\n7–10 с: ${shorten(hook,3)}.`,sections:[]},
  {title:'Один кадр',text:`0–10 с: ${shorten(hook,8)}. Камера не двигается.`,sections:[]},
 ];
}
export function proseLongLines(text:string){
 return text.split('\n').map((line,index)=>({index:index+1,line,syllables:(line.toLowerCase().match(/[аеёиоуыэюяaeiouy]+/g)??[]).length})).filter(row=>row.syllables>14);
}
