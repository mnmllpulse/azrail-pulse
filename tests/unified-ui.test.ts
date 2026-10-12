import {it,expect} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
it('standalone HTML opens locally and studio navigation works without fetching assets',async()=>{
 const html=readFileSync('index.html','utf8');
 const markup=html.replace(/<script>[\s\S]*?<\/script>/g,'');
 expect(markup).not.toMatch(/<script[^>]+src=/);expect(markup).not.toMatch(/<link[^>]+stylesheet/);
 const window=new Window({url:'file:///phone/index.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 window.document.write(html.replace(/<script>[\s\S]*?<\/script>/g,''));
 window.requestIdleCallback=()=>0;window.HTMLElement.prototype.scrollIntoView=()=>{};
 const code=html.match(/<script>([\s\S]*?)<\/script>/)![1];
 window.eval(code);
 expect(window.document.querySelector('h1')?.textContent).toContain('Одна идея');
 (window.document.querySelector('[data-view="studios"]') as any).click();
 expect(window.document.getElementById('studios')?.hidden).toBe(false);
 expect(window.document.querySelectorAll('#studio-list .card')).toHaveLength(9);
 (window.document.querySelector('[data-studio="music"]') as any).click();
 expect(window.document.getElementById('studio-title')?.textContent).toBe('Музыка');
 expect(window.document.getElementById('bpm')).not.toBeNull();
 const localNotice=window.document.getElementById('local-notice')?.textContent;
 expect(localNotice).toContain('Локальный просмотр');
 expect(window.document.getElementById('notice')?.hidden).toBe(true);
 (window.document.querySelector('[data-home]') as any).click();
 expect(window.document.getElementById('create')?.hidden).toBe(false);
 expect(window.document.querySelector('[data-view="create"]')?.getAttribute('aria-current')).toBe('page');
 expect(window.document.querySelector('[data-view="studios"]')?.hasAttribute('aria-current')).toBe(false);
 await window.happyDOM.abort();window.close();
});

it.each(['rejected','uncertain'] as const)('mission retry after %s delivery preserves only uncertain requests',async(mode)=>{
 const html=readFileSync('index.html','utf8');
 const window=new Window({url:'https://mnmllpulse.com',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 window.document.write(html.replace(/<script>[\s\S]*?<\/script>/g,''));
 window.requestIdleCallback=()=>0;window.HTMLElement.prototype.scrollIntoView=()=>{};
 const calls:Array<{key:string;body:string}>=[];
 const reply=(data:unknown,status=200)=>new window.Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 window.fetch=(async(path:any,options:any={})=>{
  if(path==='/auth/status')return reply({account:{id:'user-a',name:'Пользователь'},configured:true});
  if(path==='/api/routing-settings')return reply({policy:{allowThirdPartyModels:false}});
  if(path==='/api/mission'&&options.method==='POST'){
   calls.push({key:new window.Headers(options.headers).get('Idempotency-Key')!,body:options.body});
   if(calls.length===1){if(mode==='uncertain')throw new Error('Connection lost');return reply({error:'Исправьте запрос'},400);}
   return reply({missionId:'mission-a'},202);
  }
  if(String(path).startsWith('/api/mission?'))return reply({mission:{status:'completed'},result:{summary:'Готово'}});
  throw new Error(`Unexpected request ${path}`);
 }) as any;
 const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
 try{
  window.eval(html.match(/<script>([\s\S]*?)<\/script>/)![1]);await settle();
  const prompt=window.document.getElementById('prompt') as any;
  const form=window.document.getElementById('composer')!;
  prompt.value='Первый запрос';form.dispatchEvent(new window.Event('submit',{cancelable:true}));await settle();
  expect(calls).toHaveLength(1);
  expect(window.sessionStorage.getItem('pulse.pending')!==null).toBe(mode==='uncertain');
  prompt.value='Исправленный запрос';form.dispatchEvent(new window.Event('submit',{cancelable:true}));await settle();
  expect(calls).toHaveLength(2);
  expect(calls[1].key===calls[0].key).toBe(mode==='uncertain');
  expect(JSON.parse(calls[1].body).message).toBe(mode==='uncertain'?'Первый запрос':'Исправленный запрос');
  expect(window.sessionStorage.getItem('pulse.pending')).toBeNull();
 }finally{await window.happyDOM.abort();window.close();}
});
