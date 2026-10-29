import {AccessError} from './accounts';
import {extractText} from './model-router';
import {isNeuronPaidModel} from './neuron-paid';
import type {Env} from '../types';

const MODEL='@cf/openai/gpt-oss-20b';
const TEMPLATES=['dark','clean','bold','corporate','creative'] as const;
const PALETTES=['ink','sand','forest','wine','bolt'] as const;
const BLOCKS=['hero','benefits','process','reviews','services','cases','contact','cta'] as const;

export async function generateSitePlan(env:Env,body:Record<string,unknown>,onDispatch?:()=>void){
 if(isNeuronPaidModel(MODEL))throw new AccessError('Платная модель для сайта не вызывается.',403);
 const name=clip(body.name,80);
 const business=clip(body.business,600);
 if(name.length<2||business.length<8)throw new AccessError('Для генерации нужны название и описание.',400);
 const audience=clip(body.audience,160);
 const goal=clip(body.goal,20)||'leads';
 const style=clip(body.style,20)||'premium';
 const reason=clip(body.reason,400);
 const system='Верни только JSON {"template":"dark|clean|bold|corporate|creative","palette":"ink|sand|forest|wine|bolt","font":"grotesk|serif","trade":"","pages":[{"title":"","blocks":["hero"]}],"copy":{"home:hero.title":"","home:meta.description":""}}. Страницы под цель: заявки, продажа услуги, портфолио или запуск. Тексты короткие, на языке запроса, из описания клиента. Не копируй чужие сайты, слоганы и отзывы. Не выдумывай имена клиентов. Отзыв, если он есть, помечай как черновик без имени. meta.description — одно предложение до 160 знаков.';
 const user=`Название: ${name}. Описание: ${business}. Для кого: ${audience||'не сказано'}. Цель: ${goal}. Стиль: ${style}. Вывод студии: ${reason||'конкуренты не открыты'}.`;
 onDispatch?.();
 const output=await (env.AI as unknown as {run:(model:string,body:unknown)=>Promise<unknown>}).run(MODEL,{messages:[{role:'system',content:system},{role:'user',content:user}],max_tokens:1400,temperature:.4});
 return normalizePlan(extractText(output));
}

export function normalizePlan(text:string){
 let parsed:unknown;
 const fenced=text.replace(/```(?:json)?/gi,'').trim();
 try{parsed=JSON.parse(fenced.match(/\{[\s\S]*\}/)?.[0]??fenced);}catch{throw new AccessError('Модель не вернула структуру сайта.',502);}
 if(!parsed||typeof parsed!=='object')throw new AccessError('Модель не вернула структуру сайта.',502);
 const row=parsed as Record<string,unknown>;
 const template=TEMPLATES.includes(row.template as typeof TEMPLATES[number])?row.template:'creative';
 const palette=PALETTES.includes(row.palette as typeof PALETTES[number])?row.palette:'wine';
 const font=row.font==='grotesk'||row.font==='serif'?row.font:'serif';
 const pages=Array.isArray(row.pages)?row.pages.slice(0,6).flatMap(item=>{
  if(!item||typeof item!=='object')return [];
  const title=clip((item as {title?:unknown}).title,40);
  if(title.length<2)return [];
  const blocks=Array.isArray((item as {blocks?:unknown}).blocks)?(item as {blocks:unknown[]}).blocks.filter((block):block is typeof BLOCKS[number]=>BLOCKS.includes(block as typeof BLOCKS[number])).slice(0,8):['hero'];
  return [{title,blocks}];
 }):[];
 if(!pages.length)throw new AccessError('Модель не назвала страницы.',502);
 const copy:Record<string,string>={};
 if(row.copy&&typeof row.copy==='object')for(const [key,value] of Object.entries(row.copy).slice(0,80)){const text=clip(value,320);if(/^[a-z0-9-]+:[a-z0-9.]+$/.test(key)&&text)copy[key]=text;}
 return {template,palette,font,trade:clip(row.trade,40),pages,copy};
}

function clip(value:unknown,max:number){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}

export function referenceFromHtml(html:string){
 const title=textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');
 const headings=[...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map(match=>textOf(match[1])).filter(Boolean).slice(0,8);
 const nav=[...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(match=>textOf(match[1])).filter(item=>item.length>1&&item.length<32).slice(0,8);
 const tone=/dark|theme-black|background:\s*#(?:0|1)/i.test(html.slice(0,4000))?'dark' as const:'light' as const;
 const template=tone==='dark'?'dark' as const:nav.length>5?'corporate' as const:'clean' as const;
 return {title:title.slice(0,80),headings,nav,tone,template};
}

function textOf(value:string){return value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}

export function readWeakness(report:{nav:string[];headings:string[];tone:'dark'|'light'}){
 const notes:string[]=[];
 if(report.nav.length>=6)notes.push('меню длинное');
 else if(report.nav.length>0&&report.nav.length<=2)notes.push('в меню мало разделов');
 if(report.headings.length>=6)notes.push('заголовков на странице много');
 else if(report.headings.length<=1)notes.push('услуга почти не разложена заголовками');
 if(!notes.length)notes.push(report.tone==='dark'?'тон тёмный':'тон светлый');
 return notes.join(', ');
}

export function summarizeReference(html:string){
 const page=referenceFromHtml(html);
 return {title:page.title,navCount:page.nav.length,headingCount:page.headings.length,tone:page.tone,weak:readWeakness(page)};
}

export async function readCompetitorPages(urls:unknown){
 const list=Array.isArray(urls)?urls.filter((item):item is string=>typeof item==='string').slice(0,3):[];
 if(!list.length)throw new AccessError('Нужна хотя бы одна https-ссылка.',400);
 const reads=[];
 for(const url of list){
  try{
   const page=await readReferencePage(url);
   reads.push({title:page.title,navCount:page.nav.length,headingCount:page.headings.length,tone:page.tone,weak:readWeakness(page)});
  }catch(error){
   reads.push({title:clip(url,80),navCount:0,headingCount:0,tone:'light' as const,weak:error instanceof AccessError?error.message:'Страница не открылась.'});
  }
 }
 return {reads};
}

export async function readReferencePage(urlValue:unknown){
 const url=typeof urlValue==='string'?urlValue.trim():'';
 let parsed:URL;
 try{parsed=new URL(url);}catch{throw new AccessError('Нужна обычная https-ссылка.',400);}
 if(parsed.protocol!=='https:')throw new AccessError('Ссылка должна быть https.',400);
 if(privateHost(parsed.hostname))throw new AccessError('Эту ссылку студия не открывает.',400);
 const response=await fetch(parsed.toString(),{redirect:'follow',headers:{accept:'text/html'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new AccessError('Страница примера не открылась.',502);
 const type=response.headers.get('content-type')??'';
 if(!type.includes('text/html'))throw new AccessError('По ссылке не страница.',400);
 const html=(await response.text()).slice(0,120000);
 return referenceFromHtml(html);
}

function privateHost(host:string){
 const name=host.toLowerCase();
 if(name==='localhost'||name.endsWith('.local')||name==='0.0.0.0')return true;
 const match=/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(name);
 if(!match)return false;
 const [a,b]=[Number(match[1]),Number(match[2])];
 return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168);
}

type SiteFile={path:string;text:string};
export async function publishSite(env:Env,account:string,body:Record<string,unknown>){
 const name=clip(body.name,80)||'Сайт';
 const files=Array.isArray(body.files)?body.files.flatMap(item=>{
  if(!item||typeof item!=='object')return [];
  const path=clip((item as {path?:unknown}).path,80);
  const text=typeof (item as {text?:unknown}).text==='string'?(item as {text:string}).text:'';
  if(!/^(?:[a-z0-9-]+\/)*[a-z0-9.-]+\.(?:html|css)$/.test(path)||path.includes('..'))return [];
  return text.length&&text.length<80_000?[{path,text}]:[];
 }):[];
 if(!files.some(file=>file.path==='index.html')||files.length>12)throw new AccessError('В публикации нужны index.html и styles.css.',400);
 if(files.reduce((sum,file)=>sum+file.text.length,0)>400_000)throw new AccessError('Сайт слишком большой для публикации.',413);
 const id=crypto.randomUUID().replace(/-/g,'').slice(0,16);
 const record={id,name,account,createdAt:Date.now(),files};
 await env.AZRAIL_KV.put(`web-site:${id}`,JSON.stringify(record),{expirationTtl:60*60*24*90});
 const listKey=`web-sites:${account}`;
 const previous=await env.AZRAIL_KV.get(listKey);
 const list=previous?JSON.parse(previous) as Array<{id:string;name:string;createdAt:number}>:[];
 list.unshift({id,name,createdAt:record.createdAt});
 await env.AZRAIL_KV.put(listKey,JSON.stringify(list.slice(0,30)));
 return {id,url:`/s/${id}/`};
}

export async function listPublishedSites(env:Env,account:string){
 const raw=await env.AZRAIL_KV.get(`web-sites:${account}`);
 const items=raw?JSON.parse(raw) as Array<{id:string;name:string;createdAt:number}>:[];
 return {items:items.map(item=>({...item,url:`/s/${item.id}/`}))};
}

type Stats={visits:number;scroll:Record<string,number>;clicks:Record<string,number>};
type Note={at:number;name:string;text:string};
function emptyStats():Stats{return {visits:0,scroll:{},clicks:{}};}
async function loadStats(env:Env,id:string){
 const raw=await env.AZRAIL_KV.get(`web-stats:${id}`);
 if(!raw)return emptyStats();
 try{
  const parsed=JSON.parse(raw) as Partial<Stats>;
  return {visits:Number(parsed.visits)||0,scroll:parsed.scroll&&typeof parsed.scroll==='object'?parsed.scroll:{},clicks:parsed.clicks&&typeof parsed.clicks==='object'?parsed.clicks:{}};
 }catch{return emptyStats();}
}
async function saveStats(env:Env,id:string,stats:Stats){await env.AZRAIL_KV.put(`web-stats:${id}`,JSON.stringify(stats),{expirationTtl:60*60*24*90});}
async function loadNotes(env:Env,id:string){
 const raw=await env.AZRAIL_KV.get(`web-notes:${id}`);
 if(!raw)return [] as Note[];
 try{const parsed=JSON.parse(raw) as Note[];return Array.isArray(parsed)?parsed.slice(0,40):[];}catch{return [];}
}
async function ownedSite(env:Env,account:string,id:string){
 if(!/^[a-z0-9]{8,32}$/.test(id))throw new AccessError('Сайт не найден.',404);
 const raw=await env.AZRAIL_KV.get(`web-site:${id}`);
 if(!raw)throw new AccessError('Сайт не найден.',404);
 const site=JSON.parse(raw) as {account?:string;name?:string};
 if(site.account!==account)throw new AccessError('Сайт не найден.',404);
 return site;
}
export async function publishedStats(env:Env,account:string,id:string){
 await ownedSite(env,account,id);
 const stats=await loadStats(env,id);
 return {visits:stats.visits,scroll:stats.scroll,clicks:stats.clicks,note:'Открытия страниц по ссылке. Это не уникальные люди. Долистали и нажатия пишет сама страница.'};
}
export async function publishedNotes(env:Env,account:string,id:string){
 await ownedSite(env,account,id);
 return {items:await loadNotes(env,id)};
}
function sameSite(request:Request){
 const site=request.headers.get('sec-fetch-site');
 return !site||site==='same-origin'||site==='none';
}
function plain(body:string,status=200){return new Response(body,{status,headers:{'content-type':'text/plain; charset=utf-8','x-content-type-options':'nosniff'}});}
async function recordEvent(env:Env,id:string,request:Request){
 if(!sameSite(request))return plain('Чужой источник.',403);
 const raw=await request.text();
 if(raw.length>2000)return plain('Слишком большое тело.',413);
 let body:Record<string,unknown>;
 try{body=JSON.parse(raw) as Record<string,unknown>;}catch{return plain('Нужен JSON.',400);}
 const stats=await loadStats(env,id);
 if(body.kind==='scroll'){
  const depth=body.depth===100||body.depth===75||body.depth===50||body.depth===25?String(body.depth):'';
  if(depth)stats.scroll[depth]=(stats.scroll[depth]??0)+1;
 }else if(body.kind==='click'){
  const target=typeof body.target==='string'&&/^[a-z0-9:_-]{1,48}$/i.test(body.target)?body.target:'';
  if(target&&(stats.clicks[target]||Object.keys(stats.clicks).length<24))stats.clicks[target]=(stats.clicks[target]??0)+1;
 }else return plain('Неизвестное событие.',400);
 await saveStats(env,id,stats);
 return new Response(null,{status:204});
}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));}
async function notesPage(env:Env,id:string){
 const notes=await loadNotes(env,id);
 const items=notes.map(note=>`<article><strong>${escapeHtml(note.name||'Без имени')}</strong><p>${escapeHtml(note.text)}</p></article>`).join('')||'<p>Комментариев пока нет.</p>';
 const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Комментарии</title><style>body{margin:0;background:#14120f;color:#f6f1ea;font:18px/1.5 system-ui,sans-serif}main{max-width:640px;margin:0 auto;padding:32px 20px}textarea,input,button{width:100%;font:inherit}textarea,input{margin:8px 0 14px;padding:12px;border:1px solid #3a342c;border-radius:12px;background:transparent;color:inherit}button{min-height:48px;border:0;border-radius:999px;background:#e7d7c4;color:#1a140f}article{padding:12px 0;border-top:1px solid #3a342c}</style></head><body><main><h1>Комментарий к варианту</h1><form method="post"><label>Имя<input name="name" maxlength="40"></label><label>Комментарий<textarea name="text" maxlength="400" required></textarea></label><button type="submit">Отправить</button></form>${items}</main></body></html>`;
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'",'x-content-type-options':'nosniff','cache-control':'no-store'}});
}
async function saveNote(env:Env,id:string,request:Request){
 if(!sameSite(request))return plain('Чужой источник.',403);
 const raw=await request.text();
 if(raw.length>4000)return plain('Слишком большое тело.',413);
 const form=new URLSearchParams(raw);
 const name=clip(form.get('name'),40);
 const text=clip(form.get('text'),400);
 if(text.length<2)return plain('Напишите комментарий.',400);
 const notes=await loadNotes(env,id);
 notes.unshift({at:Date.now(),name,text});
 await env.AZRAIL_KV.put(`web-notes:${id}`,JSON.stringify(notes.slice(0,40)),{expirationTtl:60*60*24*90});
 return new Response(null,{status:303,headers:{location:`/s/${id}/notes`}});
}
function beacon(id:string,nonce:string){
 return `<script nonce="${nonce}">(function(){var sent=0;function post(b){fetch(${JSON.stringify(`/s/${id}/event`)},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b),keepalive:true}).catch(function(){});}addEventListener("scroll",function(){var h=document.documentElement,max=h.scrollHeight-innerHeight,depth=max<=0?100:Math.round(scrollY/max*100),bucket=depth>=90?100:depth>=75?75:depth>=50?50:depth>=25?25:0;if(bucket>sent){sent=bucket;post({kind:"scroll",depth:bucket});}},{passive:true});document.addEventListener("click",function(e){var n=e.target&&e.target.closest&&e.target.closest("[data-block],a.button,button");if(!n)return;post({kind:"click",target:String(n.getAttribute("data-block")||(n.tagName==="A"?"link":"button")).slice(0,48)});});})();</script>`;
}
export async function publishedSiteResponse(env:Env,request:Request){
 const url=new URL(request.url);
 const match=url.pathname.match(/^\/s\/([a-z0-9]{8,32})(\/[^?#]*)?$/);
 if(!match)return null;
 const id=match[1];
 const rest=(match[2]||'/').replace(/\/+$/,'')||'/';
 const raw=await env.AZRAIL_KV.get(`web-site:${id}`);
 if(!raw)return plain('Сайт не найден.',404);
 if(request.method==='POST'&&rest==='/event')return recordEvent(env,id,request);
 if((request.method==='GET'||request.method==='HEAD')&&rest==='/notes')return notesPage(env,id);
 if(request.method==='POST'&&rest==='/notes')return saveNote(env,id,request);
 if(request.method!=='GET'&&request.method!=='HEAD')return plain('Метод не поддерживается.',405);
 const site=JSON.parse(raw) as {files?:SiteFile[]};
 const name=rest==='/'?'index.html':rest.slice(1);
 const file=(site.files??[]).find(item=>item.path===name);
 if(!file)return plain('Файл не найден.',404);
 if(!name.endsWith('.html'))return new Response(file.text,{headers:{'content-type':'text/css; charset=utf-8','content-security-policy':"default-src 'none'",'x-content-type-options':'nosniff','cache-control':'public, max-age=60'}});
 if(request.method==='GET'){try{const stats=await loadStats(env,id);stats.visits+=1;await saveStats(env,id,stats);}catch{/* счётчик не блокирует страницу */}}
 const nonce=crypto.randomUUID().replace(/-/g,'');
 const html=file.text.replace(/<head>/i,`<head><base href="/s/${id}/">${beacon(id,nonce)}`).replace(/<\/body>/i,`<p class="note"><a href="/s/${id}/notes">Комментарий к варианту</a></p></body>`);
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','content-security-policy':`default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'`,'x-content-type-options':'nosniff','cache-control':'public, max-age=60'}});
}
