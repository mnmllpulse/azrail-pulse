export type SiteGoal='leads'|'sales'|'image'|'portfolio'|'launch';
export type SiteStyle='dark'|'clean'|'premium'|'other';
export type SitePalette='ink'|'sand'|'forest'|'wine'|'bolt';
export type SiteFont='grotesk'|'serif';
export type SiteTemplate='dark'|'clean'|'bold'|'corporate'|'creative';
export type SiteBlock='hero'|'benefits'|'process'|'reviews'|'services'|'cases'|'contact'|'cta';

export type SitePage={
 id:string;
 title:string;
 file:string;
 on:boolean;
 blocks:SiteBlock[];
 custom?:boolean;
};

export type SiteRead={title:string;navCount:number;headingCount:number;tone:'dark'|'light';weak:string};
export type SiteReason={source:'brief'|'pages';weak:string;accent:string;solve:string;reads:SiteRead[]};
export type SiteFlow={
 name:string;
 business:string;
 audience:string;
 goal:SiteGoal;
 style:SiteStyle;
 styleNote:string;
 references:string;
 pages:SitePage[];
 palette:SitePalette;
 font:SiteFont;
 template:SiteTemplate;
 trade:string;
 projectId:string;
 hidden:string[];
 paletteTouched:boolean;
 edits:Record<string,string>;
 reason:SiteReason;
};

export type SiteFile={path:string;text:string};

const GOALS:Record<SiteGoal,string>={leads:'заявки',sales:'продажа услуги',image:'имидж',portfolio:'портфолио',launch:'запуск'};
const GOAL_ACCENT:Record<SiteGoal,string>={
 leads:'Акцент на доверии и простом шаге к заявке.',
 sales:'Акцент на составе услуги, без лишних разделов.',
 portfolio:'Акцент на работах и спокойном тоне.',
 launch:'Акцент на предложении и одном запуске.',
 image:'Акцент на тоне, без давления продажи.',
};
const TEMPLATE_NAME:Record<SiteTemplate,string>={dark:'тёмный минимал',clean:'чистый премиум',bold:'смелый',corporate:'корпоративный',creative:'креативный'};
const STYLES:Record<SiteStyle,{kicker:string;palette:SitePalette}>={
 dark:{kicker:'Тёмный минимал',palette:'ink'},
 clean:{kicker:'Чистый тон',palette:'sand'},
 premium:{kicker:'Премиум',palette:'wine'},
 other:{kicker:'Свой тон',palette:'ink'},
};
const PALETTES:Record<SitePalette,{bg:string;ink:string;muted:string;line:string;card:string;accent:string;accentInk:string}>={
 ink:{bg:'#0c0b10',ink:'#f4f1ea',muted:'#b7b0c2',line:'#2c2836',card:'#16141d',accent:'#c4abff',accentInk:'#140f1c'},
 sand:{bg:'#f7f3ec',ink:'#1c1915',muted:'#5e584f',line:'#e4dccf',card:'#fffaf4',accent:'#8a5a32',accentInk:'#fffaf4'},
 forest:{bg:'#101613',ink:'#e7f0ea',muted:'#b7c7be',line:'#24302a',card:'#17201b',accent:'#d5efe0',accentInk:'#102018'},
 wine:{bg:'#140d10',ink:'#f6efe9',muted:'#d2c2c6',line:'#3a242c',card:'#1c1216',accent:'#e7b7c4',accentInk:'#1a0d12'},
 bolt:{bg:'#10110d',ink:'#f6f6ef',muted:'#c8c8b8',line:'#2c2e24',card:'#181910',accent:'#e2f08a',accentInk:'#16180d'},
};

export const SITE_BLOCKS:SiteBlock[]=['hero','benefits','process','reviews','services','cases','contact','cta'];
export const BLOCK_LABEL:Record<SiteBlock,string>={hero:'Герой',benefits:'Преимущества',process:'Процесс',reviews:'Отзывы',services:'Услуги',cases:'Кейсы',contact:'Контакты',cta:'Призыв'};

export function blankSite():SiteFlow{
 return {
  name:'',business:'',audience:'',goal:'leads',style:'premium',styleNote:'',references:'',
  pages:[
   {id:'home',title:'Главная',file:'index.html',on:true,blocks:['hero','benefits','process','reviews','cta']},
   {id:'services',title:'Услуги',file:'services.html',on:true,blocks:['hero','services','cta']},
   {id:'cases',title:'Кейсы',file:'cases.html',on:true,blocks:['hero','cases','cta']},
   {id:'about',title:'О компании',file:'about.html',on:true,blocks:['hero','process','cta']},
   {id:'contact',title:'Контакты',file:'contact.html',on:true,blocks:['hero','contact']},
  ],
  palette:'wine',font:'serif',template:'creative',trade:'',projectId:'',hidden:[],paletteTouched:false,edits:{},
  reason:{source:'brief',weak:'',accent:'',solve:'',reads:[]},
 };
}

export function slugPage(title:string,taken:Set<string>){
 const base=(title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24))||'page';
 let id=base,n=2;
 while(taken.has(id)){id=`${base}-${n}`;n++;}
 return id;
}
function sitePage(id:string,title:string,file:string,blocks:SiteBlock[]):SitePage{return {id,title,file,on:true,blocks};}
const HOME:SiteBlock[]=['hero','benefits','process','cta'];
function goalPages(goal:SiteGoal):SitePage[]{
 if(goal==='sales')return [sitePage('home','Главная','index.html',['hero','services','benefits','cta']),sitePage('service','Услуга','service.html',['hero','services']),sitePage('scope','Состав','scope.html',['hero','process']),sitePage('contact','Заявка','contact.html',['hero','contact'])];
 if(goal==='portfolio'||goal==='image')return [sitePage('home','Главная','index.html',['hero','cases','cta']),sitePage('work','Работы','work.html',['hero','cases']),sitePage('approach','Подход','approach.html',['hero','process']),sitePage('contact','Контакт','contact.html',['hero','contact'])];
 if(goal==='launch')return [sitePage('home','Главная','index.html',['hero','benefits','cta']),sitePage('offer','Предложение','offer.html',['hero','services']),sitePage('contact','Старт','contact.html',['hero','contact'])];
 return [sitePage('home','Главная','index.html',['hero','process','benefits','cta']),sitePage('path','Как идём','path.html',['hero','process']),sitePage('contact','Заявка','contact.html',['hero','contact'])];
}
function accentHome(pages:SitePage[],goal:SiteGoal){
 const lead:SiteBlock[]=goal==='sales'?['hero','services','benefits','cta']:goal==='portfolio'||goal==='image'?['hero','cases','process','cta']:goal==='launch'?['hero','benefits','cta']:['hero','process','benefits','cta'];
 return pages.map((page,index)=>{
  if(index)return page;
  const extra=page.blocks.filter(block=>!lead.includes(block)&&block!=='reviews');
  return {...page,blocks:[...lead,...extra].filter((block,at,list)=>list.indexOf(block)===at).slice(0,6)};
 });
}
export function reasonSite(flow:SiteFlow,reads:SiteRead[]):SiteReason{
 const accent=GOAL_ACCENT[flow.goal]??GOAL_ACCENT.leads;
 const names=flow.pages.filter(page=>page.on).map(page=>page.title).slice(0,6).join(', ');
 const solve=`Стиль «${TEMPLATE_NAME[flow.template]}». Страницы: ${names}.`;
 const cleanReads=reads.slice(0,3).map(item=>({title:clean(item.title||'Сайт',80),navCount:item.navCount,headingCount:item.headingCount,tone:item.tone,weak:clean(item.weak,160)}));
 if(!cleanReads.length)return {source:'brief',weak:'Конкуренты не открыты. Вывод собран из брифа и цели.',accent,solve,reads:[]};
 return {source:'pages',weak:cleanReads.map(item=>`${item.title}: ${item.weak}.`).join(' '),accent,solve,reads:cleanReads};
}
export function proposeSite(flow:SiteFlow):SiteFlow{
 const text=`${flow.name} ${flow.business} ${flow.audience} ${flow.styleNote}`.toLowerCase();
 let template:SiteTemplate=flow.style==='dark'?'dark':flow.style==='clean'?'clean':flow.style==='premium'?'creative':'bold';
 let trade='общее дело';
 let matched=false;
 let pages=goalPages(flow.goal);
 if(/атель|одежд|fashion|пальто|коллекц/.test(text)){matched=true;template='creative';trade='ателье';pages=[sitePage('home','Главная','index.html',['hero','benefits','cases','cta']),sitePage('collection','Коллекция','collection.html',['hero','services']),sitePage('about','О доме','about.html',['hero','process']),sitePage('contact','Запись','contact.html',['hero','contact'])];}
 else if(/юриди|адвокат|нотари|правов/.test(text)){matched=true;template='corporate';trade='юридическая практика';pages=[sitePage('home','Главная','index.html',HOME),sitePage('practice','Практика','practice.html',['hero','services']),sitePage('about','О бюро','about.html',['hero','process']),sitePage('contact','Консультация','contact.html',['hero','contact'])];}
 else if(/кафе|ресторан|кухн|меню|еда/.test(text)){matched=true;template='dark';trade='кухня';pages=[sitePage('home','Главная','index.html',['hero','benefits','cta']),sitePage('menu','Меню','menu.html',['hero','services']),sitePage('room','Зал','room.html',['hero','cases']),sitePage('contact','Бронь','contact.html',['hero','contact'])];}
 else if(/клиник|врач|стомат|медицин/.test(text)){matched=true;template='clean';trade='клиника';pages=[sitePage('home','Главная','index.html',HOME),sitePage('services','Услуги','services.html',['hero','services']),sitePage('visit','Приём','visit.html',['hero','process']),sitePage('contact','Запись','contact.html',['hero','contact'])];}
 else if(/девелоп|архит|интерьер|квартир/.test(text)){matched=true;template='clean';trade='архитектура';pages=[sitePage('home','Главная','index.html',['hero','benefits','cta']),sitePage('projects','Проекты','projects.html',['hero','cases']),sitePage('studio','Студия','studio.html',['hero','process']),sitePage('contact','Контакты','contact.html',['hero','contact'])];}
 if(matched)pages=accentHome(pages,flow.goal);
 const palette:SitePalette=template==='bold'?'bolt':template==='corporate'||template==='clean'?'sand':template==='dark'?'ink':'wine';
 const font:SiteFont=template==='corporate'||template==='clean'||template==='bold'?'grotesk':'serif';
 return {...flow,template,trade,pages,palette,font,paletteTouched:true,hidden:[],edits:{}};
}
export type SitePlan={template?:SiteTemplate;palette?:SitePalette;font?:SiteFont;trade?:string;pages?:Array<{title?:string;blocks?:string[]}>;copy?:Record<string,string>};
const TEMPLATE_SET=new Set<SiteTemplate>(['dark','clean','bold','corporate','creative']);
const PALETTE_SET=new Set<SitePalette>(['ink','sand','forest','wine','bolt']);
export function applyPlan(flow:SiteFlow,plan:SitePlan):SiteFlow{
 const base=proposeSite(flow);
 const template=plan.template&&TEMPLATE_SET.has(plan.template)?plan.template:base.template;
 const palette=plan.palette&&PALETTE_SET.has(plan.palette)?plan.palette:base.palette;
 const font=plan.font==='grotesk'||plan.font==='serif'?plan.font:base.font;
 const pagesSoFar:string[]=[];
 const pages=Array.isArray(plan.pages)?plan.pages.slice(0,6).flatMap(page=>{
  const title=clean(String(page?.title??''),40);
  if(title.length<2)return [];
  const id=pagesSoFar.length?slugPage(title,new Set(pagesSoFar)):'home';
  pagesSoFar.push(id);
  const blocks=(page.blocks??[]).filter((block):block is SiteBlock=>SITE_BLOCKS.includes(block as SiteBlock));
  return [sitePage(id,title,id==='home'?'index.html':`${id}.html`,blocks.length?blocks:['hero','cta'])];
 }):[];
 const edits:Record<string,string>={};
 for(const [key,value] of Object.entries(plan.copy??{})){
  if(!/^[a-z0-9-]+:[a-z0-9.]+$/.test(key))continue;
  const text=clean(String(value),320);
  if(text)edits[key]=text;
 }
 return {...base,template,palette,font,trade:clean(plan.trade??base.trade,40)||base.trade,pages:pages.length?pages:base.pages,edits};
}
export type ReferenceRead={title:string;headings:string[];nav:string[];tone:'dark'|'light';template:SiteTemplate};
export function applyReference(flow:SiteFlow,report:ReferenceRead):SiteFlow{
 const nav=report.nav.map(item=>clean(item,32)).filter(item=>item.length>1).slice(0,6);
 const taken:string[]=[];
 const pages=nav.length>=2?nav.map(title=>{const id=taken.length?slugPage(title,new Set(taken)):'home';taken.push(id);return sitePage(id,title,id==='home'?'index.html':`${id}.html`,id===taken[taken.length-1]&&taken.length===nav.length?['hero','contact']:['hero','benefits','cta']);}):flow.pages;
 const template=TEMPLATE_SET.has(report.template)?report.template:flow.template;
 return {...flow,template,pages,name:flow.name.trim()||clean(report.title,80),styleNote:`По ссылке тон ${report.tone==='dark'?'тёмный':'светлый'}. Разделов: ${nav.length||report.headings.length}. Тексты ссылки в сайт не копируются.`,paletteTouched:false,edits:{}};
}
export function variantSites(flow:SiteFlow):SiteFlow[]{
 const templates=(['dark','clean','bold','corporate','creative'] as SiteTemplate[]).filter(template=>template!==flow.template).slice(0,3);
 return templates.map(template=>{
  const next=proposeSite(flow);
  const palette:SitePalette=template==='bold'?'bolt':template==='corporate'||template==='clean'?'sand':template==='dark'?'ink':'wine';
  const font:SiteFont=template==='corporate'||template==='clean'||template==='bold'?'grotesk':'serif';
  return {...next,template,palette,font};
 });
}

function clean(value:string,max:number){
 const text=value.replace(/\s+/g,' ').trim();
 if(text.length<=max)return text;
 const cut=text.slice(0,max);
 const stop=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf(' '));
 return (stop>40?cut.slice(0,stop):cut).trim();
}
function esc(value:string){
 return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
}
function onPages(flow:SiteFlow){return flow.pages.filter(page=>page.on);}
function ctaLabel(goal:SiteGoal){return goal==='sales'?'Смотреть услугу':goal==='portfolio'||goal==='image'?'Смотреть работы':goal==='launch'?'Смотреть запуск':'Оставить заявку';}
function contactFile(flow:SiteFlow){return onPages(flow).find(page=>page.blocks.includes('contact'))?.file??onPages(flow)[0]?.file??'index.html';}

export function composedCopy(flow:SiteFlow){
 const name=clean(flow.name,80)||'Проект';
 const business=clean(flow.business,280)||'Коротко о деле, без лишних слов.';
 const audience=clean(flow.audience,120);
 const who=audience?` Для ${audience}.`:'';
 const goal=GOALS[flow.goal];
 const kicker=flow.trade||(flow.style==='other'&&flow.styleNote.trim()?clean(flow.styleNote,42):STYLES[flow.style].kicker);
 const button=ctaLabel(flow.goal);
 const out:Record<string,string>={};
 for(const page of onPages(flow)){
  const key=(field:string)=>`${page.id}:${field}`;
  out[key('hero.kicker')]=page.id==='home'?kicker:page.title;
  out[key('hero.title')]=page.id==='home'?name:page.title;
  out[key('hero.lead')]=page.id==='home'?`${business}${who}`:page.id==='contact'?`Напишите ${name}. Цель сайта — ${goal}.`:`${page.title} ${name}. ${business}`;
  out[key('hero.cta')]=button;
  out[key('benefits.title')]='Почему это держится';
  out[key('benefits.1.title')]=flow.goal==='sales'?'Состав на виду':'Один следующий шаг';
  out[key('benefits.1.text')]=flow.goal==='sales'?`${name} показывает, что входит в предложение.`:`${name} ведёт к цели: ${goal}.`;
  out[key('benefits.2.title')]='Тон без шума';
  out[key('benefits.2.text')]=`${kicker}. Текст короткий, блоки не спорят друг с другом.`;
  out[key('benefits.3.title')]=audience?'Понятно своей аудитории':'Понятно с первого экрана';
  out[key('benefits.3.text')]=audience?`Собрано для ${audience}.`:`Собрано вокруг одной задачи: ${goal}.`;
  out[key('process.title')]='Как идём';
  out[key('process.1.title')]='Разбор';
  out[key('process.1.text')]=audience?`Смотрим, что нужно ${audience}.`:'Смотрим задачу и тон.';
  out[key('process.2.title')]='Сборка';
  out[key('process.2.text')]=`Страницы ${name} собираются под ${goal}.`;
  out[key('process.3.title')]='Запуск';
  out[key('process.3.text')]='Макет можно скачать и поставить на свою отправку формы.';
  out[key('reviews.title')]='Отзывы';
  for(const n of [1,2,3]){
   out[key(`reviews.${n}.title`)]=`Черновик ${n}`;
   out[key(`reviews.${n}.text`)]='Сюда встанет реальная фраза клиента. Имя и цитату студия не выдумывает.';
  }
  out[key('services.title')]='Услуги';
  out[key('services.1.title')]='Основное';
  out[key('services.1.text')]=business;
  out[key('services.2.title')]='Как это устроено';
  out[key('services.2.text')]=`${name} объясняет состав работы простым языком.`;
  out[key('services.3.title')]='С чего начать';
  out[key('services.3.text')]=`Первый шаг ведёт к цели: ${goal}.`;
  out[key('cases.title')]='Кейсы';
  for(const n of [1,2,3]){
   out[key(`cases.${n}.title`)]=`Место для кейса ${n}`;
   out[key(`cases.${n}.text`)]=`Сюда встанет реальная работа ${name}. Пока это каркас, не чужой проект.`;
  }
  out[key('contact.title')]='Написать';
  out[key('contact.text')]=`Форма — макет. Она не отправляет письма, пока вы не подключите свою отправку.`;
  out[key('contact.button')]='Это макет формы';
  out[key('cta.title')]=flow.goal==='image'?`Тон ${name}`:`${name}: ${goal}`;
  out[key('cta.text')]=audience?`Если вы ${audience}, следующий шаг уже на экране.`:'Следующий шаг уже на экране.';
  out[key('cta.button')]=button;
 }
 return out;
}

export function siteText(flow:SiteFlow,key:string){
 const edited=flow.edits[key];
 if(typeof edited==='string')return edited;
 return composedCopy(flow)[key]??'';
}

function paletteFor(flow:SiteFlow){return PALETTES[flow.palette]??PALETTES.ink;}

export function siteCss(flow:SiteFlow){
 const color=paletteFor(flow);
 const display=flow.font==='serif'?'Palatino,"Palatino Linotype",Georgia,serif':'"Segoe UI",system-ui,sans-serif';
 const body=flow.font==='serif'?'"Segoe UI",system-ui,sans-serif':display;
 return `:root{--bg:${color.bg};--ink:${color.ink};--muted:${color.muted};--line:${color.line};--card:${color.card};--accent:${color.accent};--accent-ink:${color.accentInk};--display:${display};--body:${body}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.55 var(--body)}a{color:inherit}img{max-width:100%}
.nav{display:flex;justify-content:space-between;align-items:center;gap:18px;max-width:1120px;margin:0 auto;padding:22px 24px}.logo{font:500 18px/1 var(--display);letter-spacing:.04em;text-decoration:none}.nav nav{display:flex;flex-wrap:wrap;gap:8px 16px}.nav a{min-height:44px;display:inline-flex;align-items:center;text-decoration:none;color:var(--muted)}.nav a[aria-current="page"],.nav a:hover{color:var(--ink)}
.hero,.band,.block{max-width:1120px;margin:0 auto;padding:28px 24px 8px}.hero{padding-top:48px;padding-bottom:36px}.kicker{margin:0 0 12px;color:var(--accent);letter-spacing:.14em;text-transform:uppercase;font-size:12px}.hero h1,.block h2,.band h2{margin:0;font:500 64px/1.02 var(--display);letter-spacing:-.03em}.hero .lead{max-width:640px;margin:18px 0 0;font-size:20px;color:var(--muted)}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:28px;padding:0 22px;border:0;border-radius:999px;background:var(--accent);color:var(--accent-ink);text-decoration:none;font:600 16px/1 var(--body);cursor:pointer}.button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:22px}.card,.quote,.step{padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--card)}.card h3,.quote strong,.step h3{margin:0 0 8px;font:500 22px/1.2 var(--display)}.card p,.quote p,.step p{margin:0;color:var(--muted)}.quote small{display:block;margin-bottom:8px;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;font-size:11px}
.steps{display:grid;gap:12px;margin-top:22px}.step{display:grid;grid-template-columns:64px minmax(0,1fr);gap:16px;align-items:start}.step b{font:500 28px/1 var(--display);color:var(--accent)}
.band{margin:36px auto;padding:36px 28px;border-radius:28px;background:var(--card);border:1px solid var(--line)}.band h2{font-size:42px}.band p{max-width:560px;color:var(--muted)}
.contact{display:grid;gap:12px;max-width:520px;margin-top:22px}.contact label{display:grid;gap:6px;color:var(--muted);font-size:14px}.contact input,.contact textarea{width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);font:inherit}.note{color:var(--muted);font-size:14px}
footer{max-width:1120px;margin:0 auto;padding:28px 24px 48px;color:var(--muted);display:flex;justify-content:space-between;gap:12px}
@media(max-width:800px){.hero h1,.block h2{font-size:40px}.grid,.step{grid-template-columns:1fr}.nav{align-items:flex-start;flex-direction:column}.band h2{font-size:32px}.t-creative .card:nth-child(2){transform:none}}
@media(prefers-reduced-motion:no-preference){.block,.band,.card,.step,.quote{animation:rise .55s ease both}.card:nth-child(2){animation-delay:.06s}.card:nth-child(3){animation-delay:.12s}a,.button,.card{transition:color .2s ease,background .2s ease,border-color .2s ease,transform .2s ease}.card:hover{transform:translateY(-2px)}.button:hover,.nav a:hover{transform:translateY(-1px)}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.hero,.block,.band,.card,.step,.quote{animation:none}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
${templateCss(flow.template)}
`;
}
function templateCss(template:SiteTemplate){
 if(template==='dark')return `body.t-dark .hero{min-height:78vh;display:flex;flex-direction:column;justify-content:flex-end}body.t-dark .hero h1{font-size:clamp(52px,8vw,96px)}`;
 if(template==='clean')return `body.t-clean .hero h1,body.t-clean .block h2{font-size:clamp(36px,5vw,52px);font-weight:500;letter-spacing:-.03em}body.t-clean .button,body.t-clean .card,body.t-clean .band{border-radius:0}body.t-clean .card{background:transparent}`;
 if(template==='bold')return `body.t-bold .hero{max-width:none;margin:0;padding:14vh 8vw;background:var(--accent);color:var(--accent-ink)}body.t-bold .hero .kicker,body.t-bold .hero .lead{color:var(--accent-ink)}body.t-bold .hero h1{font-size:clamp(64px,11vw,128px);line-height:.88;letter-spacing:-.05em}body.t-bold .button{border-radius:0;background:var(--bg);color:var(--ink)}`;
 if(template==='corporate')return `body.t-corporate .nav{border-bottom:1px solid var(--line)}body.t-corporate .hero h1{font-size:clamp(34px,4vw,48px)}body.t-corporate .grid{grid-template-columns:repeat(4,minmax(0,1fr))}@media(max-width:800px){body.t-corporate .grid{grid-template-columns:1fr}}`;
 return `body.t-creative .hero h1{font-family:Palatino,Georgia,serif;font-style:italic}body.t-creative .grid{grid-template-columns:1.3fr .85fr .85fr}body.t-creative .card:nth-child(2){transform:translateY(28px)}@media(max-width:800px){body.t-creative .grid{grid-template-columns:1fr}}`;
}

function field(flow:SiteFlow,page:string,key:string){return esc(siteText(flow,`${page}:${key}`));}

function renderBlocks(flow:SiteFlow,page:SitePage){
 const parts:string[]=[];
 const contact=contactFile(flow);
 const text=(key:string)=>`<span data-copy="${page.id}:${key}">${field(flow,page.id,key)}</span>`;
 for(const block of page.blocks){
  if((flow.hidden??[]).includes(`${page.id}:${block}`))continue;
  if(block==='hero')parts.push(`<section class="hero" data-block="${page.id}:hero"><p class="kicker">${text('hero.kicker')}</p><h1>${text('hero.title')}</h1><p class="lead">${text('hero.lead')}</p><a class="button" href="${esc(contact)}">${text('hero.cta')}</a></section>`);
  if(block==='benefits')parts.push(`<section class="block" data-block="${page.id}:benefits"><h2>${text('benefits.title')}</h2><div class="grid">${[1,2,3].map(n=>`<article class="card"><h3>${text(`benefits.${n}.title`)}</h3><p>${text(`benefits.${n}.text`)}</p></article>`).join('')}</div></section>`);
  if(block==='process')parts.push(`<section class="block" data-block="${page.id}:process"><h2>${text('process.title')}</h2><div class="steps">${[1,2,3].map(n=>`<article class="step"><b>0${n}</b><div><h3>${text(`process.${n}.title`)}</h3><p>${text(`process.${n}.text`)}</p></div></article>`).join('')}</div></section>`);
  if(block==='reviews')parts.push(`<section class="block" data-block="${page.id}:reviews"><h2>${text('reviews.title')}</h2><div class="grid">${[1,2,3].map(n=>`<article class="quote"><small>Черновик</small><strong>${text(`reviews.${n}.title`)}</strong><p>${text(`reviews.${n}.text`)}</p></article>`).join('')}</div></section>`);
  if(block==='services')parts.push(`<section class="block" data-block="${page.id}:services"><h2>${text('services.title')}</h2><div class="grid">${[1,2,3].map(n=>`<article class="card"><h3>${text(`services.${n}.title`)}</h3><p>${text(`services.${n}.text`)}</p></article>`).join('')}</div></section>`);
  if(block==='cases')parts.push(`<section class="block" data-block="${page.id}:cases"><h2>${text('cases.title')}</h2><div class="grid">${[1,2,3].map(n=>`<article class="card"><h3>${text(`cases.${n}.title`)}</h3><p>${text(`cases.${n}.text`)}</p></article>`).join('')}</div></section>`);
  if(block==='contact')parts.push(`<section class="block" data-block="${page.id}:contact"><h2>${text('contact.title')}</h2><p class="note">${text('contact.text')}</p><form class="contact"><label>Имя<input name="name" autocomplete="name"></label><label>Почта<input name="email" type="email" autocomplete="email"></label><label>Сообщение<textarea name="message" rows="5"></textarea></label><button class="button" type="button">${text('contact.button')}</button></form></section>`);
  if(block==='cta')parts.push(`<section class="band" data-block="${page.id}:cta"><h2>${text('cta.title')}</h2><p>${text('cta.text')}</p><a class="button" href="${esc(contact)}">${text('cta.button')}</a></section>`);
 }
 return parts.join('\n');
}

function describe(flow:SiteFlow,page:SitePage){
 const custom=siteText(flow,`${page.id}:meta.description`);
 return clean(custom||siteText(flow,`${page.id}:hero.lead`)||siteText(flow,'home:hero.lead'),160);
}
function shell(flow:SiteFlow,page:SitePage,cssHref:string){
 const name=esc(clean(flow.name,80)||'Проект');
 const title=esc(page.id==='home'?`${clean(flow.name,80)||'Проект'}`:`${page.title} · ${clean(flow.name,80)||'Проект'}`);
 const description=esc(describe(flow,page));
 const nav=onPages(flow).map(item=>`<a href="${esc(item.file)}"${item.id===page.id?' aria-current="page"':''}>${esc(item.title)}</a>`).join('');
 const note=flow.references.trim()?`<!-- examples: ${esc(clean(flow.references,400))} -->`:'' ;
 return `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${title}</title>\n<meta name="description" content="${description}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${description}">\n<meta property="og:type" content="website">\n<link rel="stylesheet" href="${esc(cssHref)}">\n</head>\n<body class="t-${flow.template}">\n${note}<header class="nav"><a class="logo" href="index.html">${name}</a><nav aria-label="Разделы">${nav}</nav></header>\n<main>\n${renderBlocks(flow,page)}\n</main>\n<footer><span>${name}</span><span>Собрано в Web Studio</span></footer>\n</body>\n</html>\n`;
}

export function siteFiles(flow:SiteFlow):SiteFile[]{
 const pages=onPages(flow);
 const files:SiteFile[]=[{path:'styles.css',text:siteCss(flow)}];
 for(const page of pages)files.push({path:page.file,text:shell(flow,page,'styles.css')});
 if(!files.some(file=>file.path==='index.html')&&pages[0])files.push({path:'index.html',text:shell(flow,{...pages[0],file:'index.html'},'styles.css')});
 return files;
}

export function previewDocument(flow:SiteFlow){
 const pages=onPages(flow);
 const name=esc(clean(flow.name,80)||'Проект');
 const nav=pages.map(page=>`<a href="#${esc(page.id)}">${esc(page.title)}</a>`).join('');
 const body=pages.map(page=>`<article id="${esc(page.id)}">${renderBlocks(flow,page)}</article>`).join('');
 const description=esc(describe(flow,pages[0]??{id:'home',title:'Главная',file:'index.html',on:true,blocks:['hero']}));
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><meta name="description" content="${description}"><style>${siteCss(flow)}</style></head><body class="t-${flow.template}"><header class="nav"><a class="logo" href="#${esc(pages[0]?.id??'home')}">${name}</a><nav aria-label="Разделы">${nav}</nav></header><main>${body}</main><script>document.addEventListener('click',function(event){var node=event.target&&event.target.closest?event.target.closest('[data-copy]'):null;if(!node)return;event.preventDefault();parent.postMessage({type:'azrail-site-edit',key:node.getAttribute('data-copy'),text:node.textContent||''},'*');});</script></body></html>`;
}

function u16(view:DataView,offset:number,value:number){view.setUint16(offset,value,true);}
function u32(view:DataView,offset:number,value:number){view.setUint32(offset,value,true);}
const CRC_TABLE=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(data:Uint8Array){let c=0xffffffff;for(const byte of data)c=CRC_TABLE[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}

export function zipStore(files:SiteFile[]){
 const encoder=new TextEncoder();
 const parts:Uint8Array[]=[];
 const central:Uint8Array[]=[];
 let offset=0;
 for(const file of files){
  const name=encoder.encode(file.path);
  const data=encoder.encode(file.text);
  const crc=crc32(data);
  const local=new Uint8Array(30+name.length);
  const view=new DataView(local.buffer);
  u32(view,0,0x04034b50);u16(view,4,20);u16(view,6,0x0800);u16(view,8,0);u16(view,10,0);u16(view,12,0);u32(view,14,crc);u32(view,18,data.length);u32(view,22,data.length);u16(view,26,name.length);u16(view,28,0);
  local.set(name,30);
  parts.push(local,data);
  const dir=new Uint8Array(46+name.length);
  const dirView=new DataView(dir.buffer);
  u32(dirView,0,0x02014b50);u16(dirView,4,20);u16(dirView,6,20);u16(dirView,8,0x0800);u16(dirView,10,0);u16(dirView,12,0);u16(dirView,14,0);u32(dirView,16,crc);u32(dirView,20,data.length);u32(dirView,24,data.length);u16(dirView,28,name.length);u16(dirView,30,0);u16(dirView,32,0);u16(dirView,34,0);u16(dirView,36,0);u32(dirView,38,0);u32(dirView,42,offset);
  dir.set(name,46);
  central.push(dir);
  offset+=local.length+data.length;
 }
 const dirSize=central.reduce((sum,part)=>sum+part.length,0);
 const end=new Uint8Array(22);
 const endView=new DataView(end.buffer);
 u32(endView,0,0x06054b50);u16(endView,8,files.length);u16(endView,10,files.length);u32(endView,12,dirSize);u32(endView,16,offset);
 const all=[...parts,...central,end];
 const blob=new Uint8Array(all.reduce((sum,part)=>sum+part.length,0));
 let cursor=0;
 for(const part of all){blob.set(part,cursor);cursor+=part.length;}
 return blob;
}

export function nextFiles(flow:SiteFlow):SiteFile[]{
 const name=clean(flow.name,80)||'Сайт';
 const description=clean(siteText(flow,'home:meta.description')||siteText(flow,'home:hero.lead'),160);
 const layout=[
  "import './globals.css';",
  "import type {ReactNode} from 'react';",
  `export const metadata={title:${JSON.stringify(name)},description:${JSON.stringify(description)}};`,
  "export default function RootLayout({children}:{children:ReactNode}){",
  ' return <html lang="ru"><body className="t-'+flow.template+'">{children}</body></html>;',
  '}',
 ].join('\n');
 const files:SiteFile[]=[
  {path:'package.json',text:JSON.stringify({name:'site',private:true,scripts:{dev:'next dev',build:'next build',start:'next start'},dependencies:{next:'15.5.4',react:'19.1.0','react-dom':'19.1.0'}},null,2)},
  {path:'next.config.ts',text:"import type {NextConfig} from 'next';\nconst config:NextConfig={reactStrictMode:true};\nexport default config;\n"},
  {path:'app/globals.css',text:siteCss(flow)},
  {path:'app/layout.tsx',text:layout+'\n'},
  {path:'README.md',text:`# ${name}\n\nNext.js проект из Web Studio. Тексты собраны из брифа. Отзывы и кейсы без реальной цитаты остаются черновиком. Форма не отправляет письма.\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`},
 ];
 for(const page of onPages(flow)){
  const body=renderBlocks(flow,page).replace(/ data-copy="[^"]*"/g,'').replace(/ class=/g,' className=').replace(/ autocomplete=/g,' autoComplete=').replace(/ rows=/g,' rows=').replace(/<(input|textarea|br|hr)([^>]*?)>/g,'<$1$2 />');
  const route=page.file==='index.html'?'app/page.tsx':`app/${page.file.replace(/\.html$/,'')}/page.tsx`;
  files.push({path:route,text:'export default function Page(){return <main>'+body+'</main>;}\n'});
 }
 return files;
}

export function blockSnapshot(flow:SiteFlow,pageId:string,block:SiteBlock){
 const prefix=`${pageId}:${block}`;
 const copy:Record<string,string>={};
 for(const [key,value] of Object.entries({...composedCopy(flow),...flow.edits}))if(key.startsWith(`${prefix}.`))copy[key.slice(pageId.length+1)]=value;
 return copy;
}
export function applyBlock(flow:SiteFlow,pageId:string,block:SiteBlock,copy:Record<string,string>):SiteFlow{
 const pages=flow.pages.map(page=>page.id!==pageId||page.blocks.includes(block)?page:{...page,blocks:[...page.blocks,block]});
 const edits={...flow.edits};
 for(const [key,value] of Object.entries(copy)){
  if(!/^[a-z]+\.[a-z0-9.]+$/.test(key))continue;
  const text=clean(String(value),320);
  if(text)edits[`${pageId}:${key}`]=text;
 }
 return {...flow,pages,edits};
}
function pageSvg(flow:SiteFlow,page:SitePage){
 const color=paletteFor(flow);
 const blocks=page.blocks.filter(block=>!(flow.hidden??[]).includes(`${page.id}:${block}`));
 const height=180+blocks.length*180;
 const rows=blocks.map((block,index)=>{
  const y=120+index*180;
  const raw=(siteText(flow,`${page.id}:${block}.title`)||siteText(flow,`${page.id}:hero.title`)||BLOCK_LABEL[block]).slice(0,80);
  return `<rect x="80" y="${y}" width="1280" height="150" rx="18" fill="${color.card}" stroke="${color.line}"/><text x="110" y="${y+46}" fill="${color.accent}" font-size="14">${esc(BLOCK_LABEL[block])}</text><text x="110" y="${y+88}" fill="${color.ink}" font-size="28">${esc(raw)}</text>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${height}" viewBox="0 0 1440 ${height}"><rect width="1440" height="${height}" fill="${color.bg}"/><text x="80" y="72" fill="${color.ink}" font-size="40">${esc(page.title)}</text>${rows}</svg>\n`;
}
export function designFiles(flow:SiteFlow):SiteFile[]{
 const color=paletteFor(flow);
 const frames=onPages(flow).map(page=>({title:page.title,blocks:page.blocks.filter(block=>!(flow.hidden??[]).includes(`${page.id}:${block}`)).map(block=>({block,text:siteText(flow,`${page.id}:${block}.title`)||siteText(flow,`${page.id}:hero.title`)}))}));
 const files:SiteFile[]=[
  {path:'tokens.json',text:JSON.stringify({name:clean(flow.name,80),template:flow.template,font:flow.font,palette:flow.palette,color},null,2)+'\n'},
  {path:'frames.json',text:JSON.stringify({frames},null,2)+'\n'},
  {path:'README.md',text:'Макет для дизайнера: tokens.json, frames.json и SVG по страницам. Файл сам в Figma не открывается.\n'},
 ];
 for(const page of onPages(flow))files.push({path:`${page.id}.svg`,text:pageSvg(flow,page)});
 return files;
}
