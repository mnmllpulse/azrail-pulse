import type {StudioModuleContext} from './studio-types';
import {composeProse,PROSE_HANDOFF_KEY,proseHandoff,proseLongLines,type ProseDraft,type ProseMode,type ProseSection,type ProseTone} from '../src/lib/prose-compose';
import {fileNameFromPhrase} from './planner';

export type {ProseDraft,ProseMode,ProseSection,ProseTone};
export {composeProse,proseHandoff,proseLongLines,readProseHandoff,shapeProseRequest,PROSE_HANDOFF_KEY} from '../src/lib/prose-compose';
export type ProseIdea={id:string;mode:ProseMode;tone:ProseTone;title:string;text:string;sections:ProseSection[];savedAt:number};

const BANK_KEY='pulse.prose.bank.v1';
const MODES:Array<{id:ProseMode;label:string}>=[{id:'keep',label:'Оставить как есть'},{id:'directions',label:'Три направления'},{id:'short',label:'Коротко'},{id:'picture',label:'Для картинки'},{id:'reel',label:'Ролик 5–10 секунд'}];
const TONES:Array<{id:ProseTone;label:string}>=[{id:'plain',label:'Как есть'},{id:'darker',label:'Мрачнее'},{id:'stricter',label:'Строже'},{id:'quieter',label:'Тише'}];
function readBank():ProseIdea[]{
 try{const parsed=JSON.parse(window.localStorage.getItem(BANK_KEY)??'[]');return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.text==='string').slice(0,30):[];}catch{return [];}
}
function writeBank(items:ProseIdea[]){window.localStorage.setItem(BANK_KEY,JSON.stringify(items.slice(0,30)));}

let rootNode:HTMLElement|null=null;
export function cleanupProseStudio(){rootNode=null;}

export function mountProseStudio(context:StudioModuleContext){
 const doc=context.controls.ownerDocument;
 const root=doc.createElement('section');
 root.className='prose-studio';
 root.id='prose-studio';
 root.innerHTML=`<div class="section-heading"><h3>Prose Studio</h3><span class="muted">слова для трека</span></div><p class="muted">Одна фраза собирается в текст. Готовая вещь с секциями в скобках остаётся как есть, пока сам не выберешь другой режим. Собранный текст сразу лежит в Music Studio. Студия пишет слова и не поёт. Платные модели не вызываются.</p><label class="prose-request">Запрос<textarea id="prose-prompt" maxlength="8000" placeholder="Ночной город, один огонь в окне"></textarea></label><div class="prose-modes" id="prose-modes"></div><div class="prose-tones" id="prose-tones"></div><p class="muted">Тон меняет «Три направления», короткую фразу, картинку и ролик. «Оставить как есть» тон не трогает.</p><div class="toolbar"><button id="prose-run" class="primary" type="button">Собрать</button></div><p id="prose-status" class="muted"></p><div id="prose-results" class="prose-results"></div><h3>Банк идей</h3><div id="prose-bank"></div>`;
 context.controls.append(root);
 rootNode=root;
 let mode:ProseMode='directions';
 let modeTouched=false;
 let tone:ProseTone='plain';
 const modes=root.querySelector<HTMLElement>('#prose-modes')!;
 const tones=root.querySelector<HTMLElement>('#prose-tones')!;
 const status=root.querySelector<HTMLElement>('#prose-status')!;
 const results=root.querySelector<HTMLElement>('#prose-results')!;
 const bank=root.querySelector<HTMLElement>('#prose-bank')!;
 const prompt=root.querySelector<HTMLTextAreaElement>('#prose-prompt')!;
 const paintChoices=(host:HTMLElement,items:Array<{id:string;label:string}>,current:string,set:(id:string)=>void)=>{
  host.replaceChildren();
  for(const item of items){const button=doc.createElement('button');button.type='button';button.textContent=item.label;button.setAttribute('aria-pressed',item.id===current?'true':'false');button.onclick=()=>{set(item.id);paintChoices(host,items,item.id,set);};host.append(button);}
 };
 paintChoices(modes,MODES,mode,id=>{mode=id as ProseMode;modeTouched=true;});
 paintChoices(tones,TONES,tone,id=>{tone=id as ProseTone;});
 const renderBank=()=>{
  const items=readBank();
  bank.replaceChildren();
  if(!items.length){const empty=doc.createElement('p');empty.className='muted';empty.textContent='Сохранённых идей пока нет.';bank.append(empty);return;}
  for(const item of items){const card=doc.createElement('article');card.className='prose-card';const title=doc.createElement('h3');title.textContent=item.title;const body=doc.createElement('p');body.textContent=item.text;card.append(title,body);bank.append(card);}
 };
 const giveToMusic=(draft:ProseDraft)=>{window.localStorage.setItem(PROSE_HANDOFF_KEY,JSON.stringify(proseHandoff(draft)));};
 const giveToImage=(draft:ProseDraft)=>{window.localStorage.setItem('pulse.image.phrase',draft.text.slice(0,4000));};
 const renderDrafts=(drafts:ProseDraft[],source:string,used:ProseMode)=>{
  results.replaceChildren();
  const first=drafts[0];if(first)giveToMusic(first);
  if(first&&used==='picture')giveToImage(first);
  const parked=first?` В Music Studio лежит «${first.title}». Студия эти слова не поёт.${used==='picture'?' Фраза для картинки лежит в Image Studio.':''}`:'';
  status.textContent=(source==='kept'?'Это твой текст. Секции и ремарки в скобках сохранены. Тон его не меняет.':source==='model'?'Три варианта написала модель.':used==='directions'?'Три направления собраны на устройстве. Мрачнее снимает восклицания и усилители и не дописывает мрак. Текст в поле не изменён. Войди в аккаунт, чтобы модель написала полные варианты.':'Черновик собран на устройстве из твоей фразы. Войди в аккаунт, чтобы модель написала полные варианты.')+parked;
  for(const draft of drafts){
   const card=doc.createElement('article');card.className='prose-card';
   const title=doc.createElement('h3');title.textContent=draft.title;
   const body=doc.createElement('pre');body.textContent=draft.text;
   card.append(title,body);
   if(draft.sections.length){const list=doc.createElement('ul');for(const section of draft.sections){const li=doc.createElement('li');li.textContent=`${section.name}: ${section.line}`;list.append(li);}card.append(list);}
   const bar=doc.createElement('div');bar.className='toolbar';
   const copy=doc.createElement('button');copy.type='button';copy.textContent='Скопировать';copy.onclick=()=>{void navigator.clipboard?.writeText(draft.text).then(()=>context.notice('Текст скопирован.')).catch(()=>context.notice('Не удалось скопировать. Текст остаётся в карточке.'));};
   const save=doc.createElement('button');save.type='button';save.textContent='В банк';save.onclick=()=>{const items=readBank();items.unshift({id:crypto.randomUUID(),mode,tone,title:draft.title,text:draft.text,sections:draft.sections,savedAt:Date.now()});writeBank(items);renderBank();context.notice('Идея в банке этого браузера.');};
   const rhythm=doc.createElement('button');rhythm.type='button';rhythm.textContent='Проверить ритм';rhythm.onclick=()=>{const long=proseLongLines(draft.text);context.notice(long.length?long.map(row=>`Строка ${row.index}: ${row.syllables} слогов.`).join(' '):'Длинных строк нет.');};
   const hand=doc.createElement('button');hand.type='button';hand.textContent='В Music Studio';hand.onclick=()=>{giveToMusic(draft);context.notice(`«${draft.title}» теперь в Music Studio. Студия эти слова не поёт.`);};
   const draw=doc.createElement('button');draw.type='button';draw.textContent='В Image Studio';draw.onclick=()=>{giveToImage(draft);context.notice('Фраза лежит в поле Image Studio.');};
   const open=doc.createElement('a');open.href='/studios/music';open.textContent='Открыть Music Studio';
   const file=document.createElement('button');file.type='button';file.textContent='Скачать txt';file.onclick=()=>{const blob=new Blob([draft.text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=fileNameFromPhrase(draft.title||'текст','txt');link.click();URL.revokeObjectURL(url);};
   bar.append(copy,file,save,rhythm,hand,draw,open);
   card.append(bar);results.append(card);
  }
 };
 root.querySelector<HTMLButtonElement>('#prose-run')!.onclick=()=>run().catch(context.failure);
 async function run(){
  let drafts:ProseDraft[];
  const finished=/^\s*\[[^\]\n]{1,80}\]\s*$/m.test(prompt.value);
  const used:ProseMode=!modeTouched&&finished?'keep':mode;
  try{drafts=composeProse(prompt.value,used,used==='keep'?'plain':tone);}
  catch(error){status.textContent=error instanceof Error?error.message:'Текст не собрался.';results.replaceChildren();return;}
  renderDrafts(drafts,used==='keep'?'kept':'device',used);
  if(!context.account||used==='keep')return;
  status.textContent='Модель переписывает три варианта…';
  try{
   const remote=await context.api('/api/studio/prose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt.value,mode:used,tone})}) as {variants?:ProseDraft[]};
   if(!context.current()||!rootNode)return;
   if(!remote.variants||remote.variants.length!==3)throw Error('Модель вернула не три варианта.');
   renderDrafts(remote.variants,'model',used);
  }catch(error){if(!context.current())return;status.textContent='Модель не ответила. На экране черновик с устройства. Он уже лежит в Music Studio. Студия эти слова не поёт.';context.notice(error instanceof Error?error.message:'Модель не ответила.');}
 }
 renderBank();
}
