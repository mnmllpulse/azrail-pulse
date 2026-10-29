import type {StudioModuleContext} from './studio-types';
import {BLOCK_LABEL,applyBlock,applyPlan,blankSite,blockSnapshot,designFiles,nextFiles,previewDocument,proposeSite,reasonSite,siteFiles,siteText,slugPage,variantSites,zipStore,SITE_BLOCKS,type SiteBlock,type SiteFlow,type SiteFont,type SiteGoal,type SitePage,type SitePalette,type SiteRead,type SiteStyle,type SiteTemplate} from './web-site';

const KEY='pulse.web.flow.v1';
const LIBRARY='pulse.web.projects.v1';
const STEPS=['brief','reason','structure','design','content','preview'] as const;
type Step=typeof STEPS[number];
const STEP_TITLE:Record<Step,string>={brief:'Бриф',reason:'Почему',structure:'Структура',design:'Дизайн',content:'Контент',preview:'Превью'};
const GOALS:Array<[SiteGoal,string]>=[['leads','Заявки'],['sales','Услуга'],['portfolio','Портфолио'],['launch','Запуск']];
const STYLES:Array<[SiteStyle,string]>=[['dark','Тёмный минимал'],['clean','Чистый'],['premium','Премиум'],['other','Другой']];
const PALETTES:Array<[SitePalette,string]>=[['ink','Чернила'],['sand','Песок'],['forest','Хвоя'],['wine','Вино'],['bolt','Акцент']];
const FONTS:Array<[SiteFont,string]>=[['grotesk','Гротеск'],['serif','Антиква']];
const TEMPLATES:Array<[SiteTemplate,string]>=[['dark','Тёмный минимал'],['clean','Чистый премиум'],['bold','Смелый'],['corporate','Корпоративный'],['creative','Креативный']];
const STYLE_PALETTE:Record<SiteStyle,SitePalette>={dark:'ink',clean:'sand',premium:'wine',other:'ink'};

function bucket(){try{return localStorage;}catch{return null;}}
let persistFlow=()=>{};
function readFlow():{step:Step;flow:SiteFlow}|null{
 try{
  const raw=JSON.parse(bucket()?.getItem(KEY)??'null');
  if(!raw||raw.version!==1||!STEPS.includes(raw.step)||!raw.flow||!Array.isArray(raw.flow.pages))return null;
  if(!raw.flow.pages.every((page:SitePage)=>page&&typeof page.id==='string'&&typeof page.file==='string'&&typeof page.title==='string'&&Array.isArray(page.blocks)))return null;
  const base=blankSite();
  const flow={...base,...raw.flow,pages:raw.flow.pages,edits:raw.flow.edits??{},hidden:Array.isArray(raw.flow.hidden)?raw.flow.hidden:[]} as SiteFlow;
  return {step:raw.step,flow};
 }catch{return null;}
}
function writeFlow(step:Step,flow:SiteFlow){try{bucket()?.setItem(KEY,JSON.stringify({version:1,step,flow}));}catch{}}
type SavedSite={id:string;name:string;at:number;flow:SiteFlow;history:Array<{at:number;template:string;name:string}>};
function readLibrary():SavedSite[]{try{const raw=JSON.parse(bucket()?.getItem(LIBRARY)??'[]');return Array.isArray(raw)?raw.slice(0,20):[];}catch{return [];}}
function saveLibrary(flow:SiteFlow){
 const id=flow.projectId||`site-${Date.now().toString(36)}`;
 const next={...flow,projectId:id};
 const items=readLibrary().filter(item=>item.id!==id);
 const previous=readLibrary().find(item=>item.id===id);
 const history=[{at:Date.now(),template:next.template,name:next.name},...(previous?.history??[])].slice(0,8);
 items.unshift({id,name:next.name||'Без названия',at:Date.now(),flow:next,history});
 try{bucket()?.setItem(LIBRARY,JSON.stringify(items.slice(0,20)));}catch{}
 return next;
}
const BLOCKS_KEY='pulse.web.blocks.v1';
type KeptBlock={id:string;label:string;block:SiteBlock;copy:Record<string,string>};
function readBlocks():KeptBlock[]{try{const raw=JSON.parse(bucket()?.getItem(BLOCKS_KEY)??'[]');return Array.isArray(raw)?raw.filter(item=>item&&typeof item.label==='string'&&typeof item.block==='string'&&item.copy&&typeof item.copy==='object').slice(0,24):[];}catch{return [];}}
function keepBlock(flow:SiteFlow,pageId:string,block:SiteBlock){
 const items=readBlocks();
 items.unshift({id:`${Date.now().toString(36)}`,label:`${flow.name.trim()||'Блок'} · ${BLOCK_LABEL[block]}`,block,copy:blockSnapshot(flow,pageId,block)});
 try{bucket()?.setItem(BLOCKS_KEY,JSON.stringify(items.slice(0,24)));}catch{}
}

function button(doc:Document,label:string,className=''){const el=doc.createElement('button');el.type='button';el.textContent=label;if(className)el.className=className;return el;}
function field(doc:Document,label:string,value:string,onInput:(value:string)=>void,multiline=false){
 const wrap=doc.createElement('label');wrap.className='web-flow-field';wrap.append(doc.createTextNode(label));
 const input=multiline?doc.createElement('textarea'):doc.createElement('input');
 if('rows' in input)input.rows=4;
 input.value=value;input.addEventListener('input',()=>{onInput(input.value);persistFlow();});wrap.append(input);return wrap;
}

export function mountWebFlow(context:StudioModuleContext){
 const host=context.controls.querySelector<HTMLElement>('#web-flow');
 if(!host)return ()=>{};
 const saved=readFlow();
 let step:Step=saved?.step??'brief';
 let flow:SiteFlow=saved?.flow??blankSite();
 persistFlow=()=>writeFlow(step,flow);
 let device:'desktop'|'mobile'='desktop';
 let editing:{key:string;text:string}|null=null;
 let choices:SiteFlow[]=[];
 let published:string[]=[];
 let insight='';
 const onEdit=(event:MessageEvent)=>{const data=event.data;if(!data||data.type!=='azrail-site-edit'||typeof data.key!=='string')return;editing={key:data.key,text:String(data.text??'')};if(step==='preview')paint();};
 window.addEventListener('message',onEdit);
 const paint=()=>{
  writeFlow(step,flow);
  host.replaceChildren();
  const rail=host.ownerDocument.createElement('aside');rail.className='web-flow-rail';
  const name=host.ownerDocument.createElement('strong');name.textContent=flow.name.trim()||'Без названия';
  const back=button(host.ownerDocument,'Назад');back.id='web-flow-back';back.disabled=step==='brief';back.onclick=()=>{const index=STEPS.indexOf(step);if(index>0){step=STEPS[index-1];paint();}};
  rail.append(name);
  for(const item of STEPS){const el=button(host.ownerDocument,STEP_TITLE[item]);el.className='web-flow-step';if(item===step)el.setAttribute('aria-current','step');el.onclick=()=>{if(item!=='brief'&&!ready()){status('Сначала название и описание.');return;}step=item;paint();};rail.append(el);}
  rail.append(back);
  const library=host.ownerDocument.createElement('div');library.className='web-library';
  for(const item of readLibrary().slice(0,6)){const open=button(host.ownerDocument,item.name);open.onclick=()=>{flow={...blankSite(),...item.flow,pages:item.flow.pages,edits:item.flow.edits??{},hidden:Array.isArray(item.flow.hidden)?item.flow.hidden:[],reason:item.flow.reason??blankSite().reason};step='preview';paint();};const copy=button(host.ownerDocument,'Копия');copy.onclick=()=>{flow=saveLibrary({...blankSite(),...item.flow,projectId:`site-${Date.now().toString(36)}`,name:`${item.name} копия`,hidden:Array.isArray(item.flow.hidden)?item.flow.hidden:[]});step='preview';paint();};library.append(open,copy);}
  rail.append(library);
  const main=host.ownerDocument.createElement('div');main.className='web-flow-main';main.id=`web-step-${step}`;
  if(step==='brief')paintBrief(main);
  if(step==='reason')paintReason(main);
  if(step==='structure')paintStructure(main);
  if(step==='design')paintDesign(main);
  if(step==='content')paintContent(main);
  if(step==='preview')paintPreview(main);
  host.append(rail,main);
 };
 const ready=()=>flow.name.trim().length>1&&flow.business.trim().length>8;
 const status=(text:string)=>context.notice(text,true);
 const next=(to:Step)=>{
  if(!ready()){status('Нужны название проекта и короткое описание бизнеса.');return;}
  if(to==='design'&&!flow.paletteTouched)flow={...flow,palette:STYLE_PALETTE[flow.style]};
  step=to;paint();
 };
 function paintBrief(main:HTMLElement){
  const doc=main.ownerDocument;
  const title=doc.createElement('h2');title.textContent='Бриф';
  const note=doc.createElement('p');note.className='muted';note.textContent='Коротко: что за дело, цель и для кого. Две-три ссылки конкурентов студия читает на следующем шаге: структура и слабые места. Тексты чужих сайтов не копирует.';
  const grid=doc.createElement('div');grid.className='web-flow-grid';
  grid.append(
   field(doc,'Название проекта',flow.name,value=>{flow={...flow,name:value};},false),
   field(doc,'Описание бизнеса',flow.business,value=>{flow={...flow,business:value};},true),
   field(doc,'Для кого',flow.audience,value=>{flow={...flow,audience:value};},false),
  );
  const goal=doc.createElement('div');goal.className='web-choice';
  for(const [id,label] of GOALS){const el=button(doc,label);el.setAttribute('aria-pressed',String(flow.goal===id));el.onclick=()=>{flow={...flow,goal:id};paint();};goal.append(el);}
  const style=doc.createElement('div');style.className='web-choice';
  for(const [id,label] of STYLES){const el=button(doc,label);el.setAttribute('aria-pressed',String(flow.style===id));el.onclick=()=>{flow={...flow,style:id,paletteTouched:false};paint();};style.append(el);}
  grid.append(goal,style);
  if(flow.style==='other')grid.append(field(doc,'Какой стиль',flow.styleNote,value=>{flow={...flow,styleNote:value};},false));
  grid.append(field(doc,'Ссылки на конкурентов',flow.references,value=>{flow={...flow,references:value};},true));
  const go=button(doc,'Далее','primary');go.id='web-flow-next';go.onclick=()=>{
   if(!ready()){status('Нужны название проекта и короткое описание бизнеса.');return;}
   if(!context.account){const next=proposeSite(flow);flow=saveLibrary({...next,reason:reasonSite(next,[])});step='reason';status(`Вывод из брифа, структура под ${flow.trade}. Войди, если тексты должна написать модель и если нужно открыть ссылки.`);paint();return;}
   void (async()=>{
    const urls=[...flow.references.matchAll(/https:\/\/\S+/g)].map(item=>item[0]).slice(0,3);
    let reads:SiteRead[]=[];
    if(urls.length){try{const report=await context.api('/api/studio/web/competitors',{method:'POST',body:JSON.stringify({urls})}) as {reads?:SiteRead[]};reads=(report.reads??[]).slice(0,3);}catch(error){status(error instanceof Error?error.message:'Ссылки не открылись.');}}
    let next=proposeSite(flow);
    try{const plan=await context.api('/api/studio/web/generate',{method:'POST',body:JSON.stringify({name:flow.name,business:flow.business,audience:flow.audience,goal:flow.goal,style:flow.style,reason:reasonSite(next,reads).weak})});next=applyPlan(flow,plan);status(reads.length?'Структуру написала модель после разбора ссылок.':'Структуру и тексты написала модель. Проверь и поправь.');}
    catch(error){status(error instanceof Error?`${error.message} Структура собрана по брифу.`:'Модель не ответила. Структура собрана по брифу.');}
    flow=saveLibrary({...next,reason:reasonSite(next,reads)});step='reason';paint();
   })();
  };
  main.append(title,note,grid,go);
 }
 function paintReason(main:HTMLElement){
  const doc=main.ownerDocument;
  const reason=flow.reason?.weak?flow.reason:reasonSite(flow,[]);
  const title=doc.createElement('h2');title.textContent='Почему этот сайт';
  const note=doc.createElement('p');note.className='muted';note.textContent=reason.source==='pages'?'Разбор по открытым страницам. Чужие тексты в сайт не переносятся.':'Конкуренты не открыты. Ниже вывод из брифа и цели.';
  const board=doc.createElement('div');board.className='web-reason';
  for(const [label,text] of [['Слабое место',reason.weak],['Акцент',reason.accent],['Как это решает сайт',reason.solve]] as const){const card=doc.createElement('article');const strong=doc.createElement('strong');strong.textContent=label;const line=doc.createElement('p');line.textContent=text;card.append(strong,line);board.append(card);}
  const go=button(doc,'Далее','primary');go.id='web-flow-next';go.onclick=()=>next('structure');
  main.append(title,note,board,go);
 }
 function paintStructure(main:HTMLElement){
  const doc=main.ownerDocument;
  const title=doc.createElement('h2');title.textContent='Структура';
  const note=doc.createElement('p');note.className='muted';note.textContent=flow.trade?`Собрано под ${flow.trade}. Шаблон «${TEMPLATES.find(item=>item[0]===flow.template)?.[1]??flow.template}». Страницы можно поправить.`:'Оставь нужные страницы. Под каждой — блоки. Пустую страницу студия не собирает.';
  main.append(title,note);
  for(const page of flow.pages){
   const card=doc.createElement('article');card.className='web-page';
   const head=doc.createElement('label');const box=doc.createElement('input');box.type='checkbox';box.checked=page.on;box.onchange=()=>{if(page.on&&flow.pages.filter(item=>item.on).length<=1){box.checked=true;status('Нужна хотя бы одна страница.');return;}flow={...flow,pages:flow.pages.map(item=>item.id===page.id?{...item,on:box.checked}:item)};paint();};
   head.append(box,doc.createTextNode(` ${page.title}`));card.append(head);
   const blocks=doc.createElement('div');blocks.className='web-choice';
   for(const id of SITE_BLOCKS){const el=button(doc,BLOCK_LABEL[id]);const on=page.blocks.includes(id);el.setAttribute('aria-pressed',String(on));el.onclick=()=>{if(id==='hero'){status('Герой остаётся на странице.');return;}const blocks=toggleBlock(page,id);flow={...flow,pages:flow.pages.map(item=>item.id===page.id?{...item,blocks}:item)};paint();};blocks.append(el);}
   card.append(blocks);
   if(page.custom){const remove=button(doc,'Убрать страницу');remove.onclick=()=>{flow={...flow,pages:flow.pages.filter(item=>item.id!==page.id)};paint();};card.append(remove);}
   main.append(card);
  }
  const add=doc.createElement('div');add.className='toolbar';
  const input=doc.createElement('input');input.id='web-flow-new-page';input.maxLength=40;input.placeholder='Новая страница';
  const create=button(doc,'Добавить');create.onclick=()=>{const titleText=input.value.trim();if(titleText.length<2){status('Назови страницу.');return;}const taken=new Set(flow.pages.map(page=>page.id));const id=slugPage(titleText,taken);const file=`${id}.html`;flow={...flow,pages:[...flow.pages,{id,title:titleText,file,on:true,custom:true,blocks:['hero','cta']}]};paint();};
  add.append(input,create);main.append(add);
  const kept=readBlocks();
  if(kept.length){
   const shelf=doc.createElement('div');shelf.className='web-choice';
   const label=doc.createElement('p');label.className='muted';label.textContent='Свои блоки';
   main.append(label,shelf);
   for(const item of kept){const use=button(doc,item.label);use.onclick=()=>{if(!SITE_BLOCKS.includes(item.block))return;const home=flow.pages.find(page=>page.on)?.id??'home';flow=applyBlock(flow,home,item.block,item.copy);status('Блок вставлен на первую страницу.');paint();};shelf.append(use);}
  }
  const go=button(doc,'Далее','primary');go.id='web-flow-next';go.onclick=()=>next('design');main.append(go);
 }
 function paintDesign(main:HTMLElement){
  const doc=main.ownerDocument;
  const title=doc.createElement('h2');title.textContent='Дизайн';
  const note=doc.createElement('p');note.className='muted';note.textContent='Пять шаблонов. В каждом спокойное появление, переход и ховер. Движение выключается, если система просит меньше анимации.';
  const templates=doc.createElement('div');templates.className='web-choice';
  for(const [id,label] of TEMPLATES){const el=button(doc,label);el.setAttribute('aria-pressed',String(flow.template===id));el.onclick=()=>{flow={...flow,template:id};paint();};templates.append(el);}
  const colors=doc.createElement('div');colors.className='web-choice';
  for(const [id,label] of PALETTES){const el=button(doc,label);el.setAttribute('aria-pressed',String(flow.palette===id));el.onclick=()=>{flow={...flow,palette:id,paletteTouched:true};paint();};colors.append(el);}
  const fonts=doc.createElement('div');fonts.className='web-choice';
  for(const [id,label] of FONTS){const el=button(doc,label);el.setAttribute('aria-pressed',String(flow.font===id));el.onclick=()=>{flow={...flow,font:id};paint();};fonts.append(el);}
  const sample=doc.createElement('div');sample.className='web-swatch';sample.dataset.palette=flow.palette;sample.dataset.font=flow.font;
  const sampleTitle=doc.createElement('strong');sampleTitle.textContent=flow.name.trim()||'Название';
  const sampleButton=doc.createElement('span');sampleButton.textContent='Кнопка';
  const sampleCard=doc.createElement('p');sampleCard.textContent='Карточка держит короткий текст и не кричит.';
  sample.append(sampleTitle,sampleCard,sampleButton);
  const go=button(doc,'Далее','primary');go.id='web-flow-next';go.onclick=()=>next('content');
  main.append(title,note,templates,colors,fonts,sample,go);
 }
 function paintContent(main:HTMLElement){
  const doc=main.ownerDocument;
  const title=doc.createElement('h2');title.textContent='Контент';
  const note=doc.createElement('p');note.className='muted';note.textContent='Тексты собраны из брифа. Отзывы и кейсы — пустые места: имена и чужие работы студия не придумывает.';
  main.append(title,note);
  for(const page of flow.pages.filter(item=>item.on)){
   const card=doc.createElement('details');card.className='web-page';card.open=page.id==='home';
   const summary=doc.createElement('summary');summary.textContent=page.title;card.append(summary);
   const meta=`${page.id}:meta.description`;
   card.append(field(doc,'Мета-описание',siteText(flow,meta)||siteText(flow,`${page.id}:hero.lead`),value=>{flow={...flow,edits:{...flow.edits,[meta]:value}};writeFlow(step,flow);},true));
   const keys=contentKeys(page);
   for(const key of keys){const full=`${page.id}:${key.id}`;card.append(field(doc,key.label,siteText(flow,full),value=>{flow={...flow,edits:{...flow.edits,[full]:value}};writeFlow(step,flow);},key.long));}
   main.append(card);
  }
  const go=button(doc,'Собрать сайт','primary');go.id='web-flow-next';go.onclick=()=>next('preview');main.append(go);
 }
 function paintPreview(main:HTMLElement){
  const doc=main.ownerDocument;
  const title=doc.createElement('h2');title.textContent='Превью';
  const note=doc.createElement('p');note.className='muted';note.textContent='Кликни текст в макете и поправь его здесь. Блоки двигаются и прячутся без возврата назад. HTML и Next скачиваются отдельно. Ссылка публикации открывается на этом адресе.';
  const tools=doc.createElement('div');tools.className='toolbar';
  const desktop=button(doc,'Desktop');desktop.setAttribute('aria-pressed',String(device==='desktop'));desktop.onclick=()=>{device='desktop';paint();};
  const mobile=button(doc,'Mobile');mobile.setAttribute('aria-pressed',String(device==='mobile'));mobile.onclick=()=>{device='mobile';paint();};
  const download=button(doc,'Скачать код','primary');download.id='web-flow-download';download.onclick=()=>saveZip(siteFiles(flow),'site-html.zip','HTML и CSS скачаны.');
  const nextZip=button(doc,'Скачать Next');nextZip.onclick=()=>saveZip(nextFiles(flow),'site-next.zip','Next.js проект скачан.');
  const publish=button(doc,'Опубликовать');publish.id='web-flow-publish';publish.onclick=()=>{void publishLink(flow).catch(context.failure);};
  const intoProject=button(doc,'В проект');intoProject.onclick=()=>{void publishSite().catch(context.failure);};
  const handoff=button(doc,'Макет');handoff.onclick=()=>saveZip(designFiles(flow),'site-design.zip','Макет для дизайнера скачан: токены, кадры и SVG. В Figma сам не попадает.');
  const variants=button(doc,'Три варианта');variants.onclick=()=>{choices=variantSites(flow);paint();};
  const linksForClient=button(doc,'Ссылки клиенту');linksForClient.onclick=()=>{void publishChoices().catch(context.failure);};
  tools.append(desktop,mobile,download,nextZip,handoff,publish,intoProject,variants,linksForClient);
  const colors=doc.createElement('div');colors.className='web-choice';
  for(const [id,label] of PALETTES){const el=button(doc,label);el.setAttribute('aria-pressed',String(flow.palette===id));el.onclick=()=>{flow={...flow,palette:id,paletteTouched:true};paint();};colors.append(el);}
  const blocks=doc.createElement('div');blocks.className='web-block-edit';
  for(const page of flow.pages.filter(item=>item.on))for(const block of page.blocks){const key=`${page.id}:${block}`;const row=doc.createElement('div');const label=doc.createElement('span');label.textContent=`${page.title} · ${BLOCK_LABEL[block]}`;const up=button(doc,'Выше');up.onclick=()=>moveBlock(page.id,block,-1);const down=button(doc,'Ниже');down.onclick=()=>moveBlock(page.id,block,1);const hide=button(doc,flow.hidden.includes(key)?'Показать':'Скрыть');hide.onclick=()=>{flow={...flow,hidden:flow.hidden.includes(key)?flow.hidden.filter(item=>item!==key):[...flow.hidden,key]};paint();};const keep=button(doc,'В библиотеку');keep.onclick=()=>{keepBlock(flow,page.id,block);status('Блок сохранён. Его можно вставить на шаге структуры.');};row.append(label,up,down,hide,keep);blocks.append(row);}
  const editor=doc.createElement('div');
  if(editing){const input=doc.createElement('input');input.value=siteText(flow,editing.key);input.oninput=()=>{if(!editing)return;flow={...flow,edits:{...flow.edits,[editing.key]:input.value}};writeFlow(step,flow);};const apply=button(doc,'В макет');apply.onclick=()=>{editing=null;paint();};editor.append(input,apply);}
  for(const item of choices){const pick=button(doc,TEMPLATES.find(template=>template[0]===item.template)?.[1]??item.template);pick.onclick=()=>{flow={...item,projectId:flow.projectId};choices=[];paint();};tools.append(pick);}
  const links=doc.createElement('div');
  for(const url of published){const anchor=doc.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noreferrer';anchor.textContent=url;const notes=doc.createElement('a');notes.href=`${url}notes`;notes.target='_blank';notes.rel='noreferrer';notes.textContent='Комментарии';const stats=button(doc,'Статистика');stats.onclick=()=>{void loadInsight(url).catch(context.failure);};links.append(anchor,notes,stats);}
  if(insight){const line=doc.createElement('p');line.className='muted';line.textContent=insight;links.append(line);}
  const stage=doc.createElement('div');stage.className='web-flow-stage';stage.dataset.device=device;
  const frame=doc.createElement('iframe');frame.title='Превью сайта';frame.sandbox='allow-scripts allow-forms';frame.srcdoc=previewDocument(flow);
  stage.append(frame);
  main.append(title,note,tools,colors,editor,blocks,links,stage);
 }
 function saveZip(files:ReturnType<typeof siteFiles>,name:string,message:string){void import('./media').then(({download:save})=>{save(new Blob([zipStore(files)],{type:'application/zip'}),name);context.notice(message);});}
 async function publishLink(target:SiteFlow){
  if(!context.account)throw Error('Войди, чтобы получить ссылку. Код можно скачать без входа.');
  const result=await context.api('/api/studio/web/publish',{method:'POST',body:JSON.stringify({name:target.name,files:siteFiles(target)})}) as {url?:string};
  if(!result.url)throw Error('Ссылка не вернулась.');
  published=[...published,result.url];
  flow=saveLibrary(flow);
  context.notice('Сайт открыт по ссылке на этом адресе.');
  paint();
 }
 async function publishChoices(){
  if(!context.account)throw Error('Войди, чтобы отправить клиенту ссылки. Код можно скачать без входа.');
  const set=[flow,...variantSites(flow).slice(0,2)];
  const urls:string[]=[];
  for(const item of set){
   const result=await context.api('/api/studio/web/publish',{method:'POST',body:JSON.stringify({name:item.name,files:siteFiles(item)})}) as {url?:string};
   if(result.url)urls.push(result.url);
  }
  published=urls;
  flow=saveLibrary(flow);
  context.notice('Три ссылки готовы. Комментарий клиент пишет на странице комментариев у каждой.');
  paint();
 }
 async function loadInsight(url:string){
  const id=url.match(/\/s\/([a-z0-9]{8,32})\//)?.[1]??'';
  if(!id)throw Error('Ссылка без номера сайта.');
  const [stats,notes]=await Promise.all([
   context.api(`/api/studio/web/stats?id=${id}`) as Promise<{visits?:number;scroll?:Record<string,number>;clicks?:Record<string,number>;note?:string}>,
   context.api(`/api/studio/web/notes?id=${id}`) as Promise<{items?:Array<{name?:string;text?:string}>}>,
  ]);
  const scroll=Object.entries(stats.scroll??{}).map(([depth,count])=>`${depth}%: ${count}`).join(', ')||'ещё нет';
  const clicks=Object.entries(stats.clicks??{}).map(([key,count])=>`${key}: ${count}`).join(', ')||'ещё нет';
  const comments=(notes.items??[]).slice(0,6).map(item=>`${item.name||'Без имени'}: ${item.text||''}`).join(' | ')||'комментариев нет';
  insight=`Открытия: ${stats.visits??0}. Долистали ${scroll}. Нажатия ${clicks}. ${stats.note??''} Комментарии: ${comments}`;
  paint();
 }
 async function publishSite(){
  const projectId=context.currentProjectId?.()||context.projectId;
  if(!context.account)throw Error('Войди в аккаунт, чтобы записать сайт в проект.');
  if(!projectId)throw Error('Открой проект. Код можно скачать и без него.');
  const files=siteFiles(flow).map(file=>({path:`site/${file.path}`,text:file.text}));
  for(const file of files){
   try{await context.api(`/api/projects/${encodeURIComponent(projectId)}/workbench/files`,{method:'POST',body:JSON.stringify({action:'create',path:file.path,content:file.text})});}
   catch(error){
    const failed=(error as {status?:number}).status;
    if(failed!==409)throw error;
    const opened=await context.api(`/api/projects/${encodeURIComponent(projectId)}/workbench/file?path=${encodeURIComponent(file.path)}`) as {sha256?:string};
    await context.api(`/api/projects/${encodeURIComponent(projectId)}/workbench/files`,{method:'POST',body:JSON.stringify({action:'update',path:file.path,content:file.text,expectedSha256:opened.sha256??''})});
   }
  }
  context.notice('Сайт записан в проект, папка site.');
 }
 function moveBlock(pageId:string,block:SiteBlock,dir:-1|1){
  flow={...flow,pages:flow.pages.map(page=>{
   if(page.id!==pageId)return page;
   const index=page.blocks.indexOf(block);const nextIndex=index+dir;
   if(index<0||nextIndex<0||nextIndex>=page.blocks.length)return page;
   const blocks=page.blocks.slice();const [item]=blocks.splice(index,1);blocks.splice(nextIndex,0,item!);
   return {...page,blocks};
  })};
  paint();
 }
 paint();
 return ()=>window.removeEventListener('message',onEdit);
}

function toggleBlock(page:SitePage,id:SiteBlock){
 const has=page.blocks.includes(id);
 const blocks=has?page.blocks.filter(item=>item!==id):[...page.blocks,id];
 return blocks.length?blocks:page.blocks;
}
function contentKeys(page:SitePage){
 const keys:Array<{id:string;label:string;long?:boolean}>=[];
 for(const block of page.blocks){
  if(block==='hero')keys.push({id:'hero.kicker',label:'Надзаголовок'},{id:'hero.title',label:'Заголовок'},{id:'hero.lead',label:'Текст героя',long:true},{id:'hero.cta',label:'Кнопка'});
  if(block==='benefits'){keys.push({id:'benefits.title',label:'Заголовок преимуществ'});for(const n of [1,2,3])keys.push({id:`benefits.${n}.title`,label:`Преимущество ${n}`},{id:`benefits.${n}.text`,label:`Текст ${n}`,long:true});}
  if(block==='process'){keys.push({id:'process.title',label:'Заголовок процесса'});for(const n of [1,2,3])keys.push({id:`process.${n}.title`,label:`Шаг ${n}`},{id:`process.${n}.text`,label:`Описание ${n}`,long:true});}
  if(block==='reviews')for(const n of [1,2,3])keys.push({id:`reviews.${n}.title`,label:`Отзыв ${n}, подпись`},{id:`reviews.${n}.text`,label:`Отзыв ${n}, текст`,long:true});
  if(block==='services'){keys.push({id:'services.title',label:'Заголовок услуг'});for(const n of [1,2,3])keys.push({id:`services.${n}.title`,label:`Услуга ${n}`},{id:`services.${n}.text`,label:`Описание ${n}`,long:true});}
  if(block==='cases')for(const n of [1,2,3])keys.push({id:`cases.${n}.title`,label:`Кейс ${n}`},{id:`cases.${n}.text`,label:`Кейс ${n}, текст`,long:true});
  if(block==='contact')keys.push({id:'contact.title',label:'Заголовок контактов'},{id:'contact.text',label:'Пояснение',long:true});
  if(block==='cta')keys.push({id:'cta.title',label:'Призыв'},{id:'cta.text',label:'Текст призыва',long:true},{id:'cta.button',label:'Кнопка призыва'});
 }
 return keys;
}
