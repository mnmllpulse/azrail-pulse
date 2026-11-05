import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {autoChatTitle,createChatHistory,messagesToTurns,renderChatMessages} from '../ui/chat-history';

const windows:Window[]=[];
const html=()=>readFileSync('index.html','utf8');
const settle=async()=>{await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));};
afterEach(async()=>{for(const w of windows){w.dispatchEvent(new w.Event('pagehide'));await w.happyDOM.abort();w.close();}windows.length=0;vi.unstubAllGlobals();});
function open(options:{width?:number;hosted?:boolean;fetcher?:(w:Window)=>Window['fetch'];storage?:Record<string,string>}={}){
 const w=new Window({url:options.hosted?'https://workspace.example.com/':'file:///preview/index.html',width:options.width??1440,height:900,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});windows.push(w);
 Object.defineProperty(w,'WebSocket',{value:undefined,configurable:true});
 w.document.write(html().replace(/<script>[\s\S]*?<\/script>/g,''));w.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const [key,value] of Object.entries(options.storage??{}))w.sessionStorage.setItem(key,value);
 if(options.fetcher)w.fetch=options.fetcher(w);
 w.eval(html().match(/<script>([\s\S]*?)<\/script>/)![1]);return w;
}
function node(w:Window,id:string){return w.document.getElementById(id)!;}
function type(w:Window,text:string){const p=node(w,'prompt') as any;p.value=text;p.dispatchEvent(new w.Event('input',{bubbles:true}));}
function submit(w:Window){node(w,'composer').dispatchEvent(new w.Event('submit',{cancelable:true}));}
async function openMission(w:Window){if(w.document.documentElement.dataset.expert!=='on'){(w.document.getElementById('expert-mode') as any).click();await settle();}(w.document.querySelector('[data-view="mission"]') as any).click();await settle();}
function response(w:Window,data:unknown,status=200){return new w.Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});}
function api(w:Window,onMission:(init:any)=>Promise<any>,onChat?:(init:any)=>Promise<any>){return (async(path:any,init:any={})=>{
 if(path==='/auth/status')return response(w,{account:{id:'account-a',name:'A',role:'admin',operator:true},configured:true});
 if(path==='/api/routing-settings')return response(w,{policy:{allowThirdPartyModels:false}});
 if(path==='/api/model-catalog')return response(w,{models:[{slug:'text-model',task:'text-generation',reviewed:true,freeAllowlisted:true},{slug:'image-model',task:'text-to-image',reviewed:true}]});
 if(String(path).startsWith('/api/metatron/missions'))return response(w,{items:[]});
 if(path==='/api/conversations')return response(w,{success:true,conversations:[]});
 if(String(path).startsWith('/api/chat?'))return response(w,{success:true,messages:[]});
 if(path==='/api/chat'&&init.method==='POST')return onChat?onChat(init):response(w,{success:true,conversationId:'c1',result:{status:'done',summary:'Проверенный ответ'}});
 if(path==='/api/mission'&&init.method==='POST')return onMission(init);
 if(String(path).startsWith('/api/mission?'))return response(w,{mission:{status:'completed'},result:{summary:'Проверенный ответ'}});
 throw new Error(`No test endpoint: ${path}`);
 }) as Window['fetch'];}

it('has unique IDs and separates the message viewport, composer, navigation and context',()=>{
 const w=open(),ids=Array.from(w.document.querySelectorAll('[id]')).map(el=>el.id);
 expect(new Set(ids).size).toBe(ids.length);
 expect(node(w,'chat-scroll').contains(node(w,'composer'))).toBe(false);
 expect(node(w,'create').contains(node(w,'composer'))).toBe(false);
 expect(w.document.querySelector('.workspace-center')?.contains(node(w,'composer'))).toBe(true);
 expect((node(w,'composer').closest('.composer-dock') as HTMLElement).hidden).toBe(false);
 expect(node(w,'mission-panel').contains(node(w,'mission-output'))).toBe(true);
 expect(node(w,'context-panel').hidden).toBe(true);
 (node(w,'context-toggle') as any).click();
 expect(node(w,'context-panel').hidden).toBe(false);
 expect(node(w,'main').inert).toBe(false);
 expect(node(w,'context-toggle').getAttribute('aria-expanded')).toBe('true');
 (node(w,'context-close') as any).click();
 expect(w.document.activeElement?.id).toBe('context-toggle');
});

it('mobile navigation closes with Escape and releases focus and the center pane',()=>{
 const w=open({width:390});
 expect(node(w,'sidebar-toggle').getAttribute('aria-expanded')).toBe('false');
 (node(w,'sidebar-toggle') as any).click();
 expect(node(w,'sidebar-backdrop').hidden).toBe(false);
 expect(node(w,'main').parentElement?.inert).toBe(true);
 expect(w.document.activeElement?.id).toBe('new-chat');
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 expect(node(w,'sidebar-backdrop').hidden).toBe(true);
 expect(node(w,'main').parentElement?.inert).toBe(false);
 expect(w.document.activeElement?.id).toBe('sidebar-toggle');
});

it('restores a separate draft for each tab-local chat and searches their titles',async()=>{
 const w=open();type(w,'Черновик первого диалога');
 const id=w.document.querySelector<HTMLButtonElement>('[data-chat-id]')!.dataset.chatId;
 (node(w,'new-chat') as any).click();await settle();type(w,'Второй черновик');
 (w.document.querySelector(`[data-chat-id="${id}"]`) as any).click();
 expect((node(w,'prompt') as any).value).toBe('Черновик первого диалога');
 expect(node(w,'chat-count').textContent).toBe('2');
 const search=node(w,'chat-search') as any;search.value='несуществующий диалог';search.dispatchEvent(new w.Event('input'));
 expect(node(w,'chat-list').children.length).toBe(0);expect(node(w,'chat-history-empty').textContent).toContain('не найдены');
});

it('auto-grows the composer to a limit and shrinks it after clearing',()=>{
 const w=open(),p=node(w,'prompt');
 Object.defineProperty(p,'scrollHeight',{get:()=>400,configurable:true});type(w,'Много строк');expect(p.style.height).toBe('200px');expect(p.style.overflowY).toBe('auto');
 Object.defineProperty(p,'scrollHeight',{get:()=>20,configurable:true});type(w,'');expect(p.style.height).toBe('48px');expect(p.style.overflowY).toBe('hidden');
});

it('opening a studio from mobile navigation returns to an interactive center pane',async()=>{
 const w=open({width:390});
 (node(w,'sidebar-toggle') as any).click();
 expect(node(w,'main').parentElement?.inert).toBe(true);
 (w.document.querySelector('a[data-view="studios"]') as any).click();await settle();
 expect(node(w,'main').parentElement?.inert).toBe(false);
 expect(node(w,'studios').hidden).toBe(false);
 (w.document.querySelector('#studio-list [data-studio="music"]') as any).click();await settle();
 expect(node(w,'studio-title').textContent).toBe('Music Studio');
});

it('home Chat sends /api/chat and keeps Missions separate',async()=>{
 let chatCalls=0,missionCalls=0;
 const w=open({hosted:true,fetcher:w=>api(w,async()=>{missionCalls++;return response(w,{missionId:'m-home'},202);},async()=>{chatCalls++;return response(w,{success:true,conversationId:'c1',result:{status:'done',summary:'Привет!'}});})});await settle();
 expect(w.document.querySelector('[data-view="create"]')?.textContent).toContain('Чат');
 expect(node(w,'chat-welcome').textContent).toContain('AZRAIL');
 expect(node(w,'composer-models-label').textContent).toBe('Models');
 type(w,'привет бро');submit(w);await settle();
 expect(chatCalls).toBe(1);expect(missionCalls).toBe(0);
 expect(node(w,'chat-messages').textContent).toContain('привет бро');
 expect(node(w,'chat-messages').textContent).toContain('Привет!');
 expect((node(w,'prompt') as any).value).toBe('');
});

it('Enter submits from Mission Control, Shift+Enter and IME composition do not submit',async()=>{
 let calls=0;const w=open({hosted:true,fetcher:w=>api(w,async()=>{calls++;return response(w,{missionId:`m-${calls}`},202);})});await settle();
 await openMission(w);type(w,'Запрос');node(w,'prompt').focus();
 node(w,'prompt').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',shiftKey:true,bubbles:true,cancelable:true}));
 node(w,'prompt').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));await settle();expect(calls).toBe(0);
 node(w,'prompt').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await settle();
 expect(calls).toBe(1);expect(node(w,'chat-messages').textContent).toContain('Запрос');expect((node(w,'prompt') as any).value).toBe('');
 expect(Array.from((node(w,'composer-model') as any).options).map((o:any)=>o.value)).toEqual(['','text-model','image-model']);
 expect(node(w,'mission').hidden).toBe(false);expect(node(w,'mission-panel').hidden).toBe(false);
});

it('a second mission keeps the previous answer and new chat invalidates old polling',async()=>{
 let count=0;const w=open({hosted:true,fetcher:w=>api(w,async()=>response(w,{missionId:`m-${++count}`},202))});await settle();
 await openMission(w);type(w,'Первый вопрос');submit(w);await settle();type(w,'Уточнение');submit(w);await settle();
 expect(node(w,'chat-messages').querySelectorAll('[data-role="user"]')).toHaveLength(2);
 expect(node(w,'chat-messages').querySelectorAll('[data-role="assistant"]').length).toBeGreaterThanOrEqual(1);
 expect(node(w,'chat-messages').textContent).toContain('Проверенный ответ');
 expect(node(w,'chat-count').textContent).toBe('1');
 const old=w.document.querySelector<HTMLButtonElement>('[data-chat-id]')!.dataset.chatId;
 (node(w,'new-chat') as any).click();await settle();
 expect(node(w,'mission-panel').hidden).toBe(true);expect(node(w,'chat-messages').textContent).toBe('');
 (w.document.querySelector(`[data-chat-id="${old}"]`) as any).click();await settle();
 expect(node(w,'chat-messages').textContent).toContain('Первый вопрос');expect(node(w,'mission-panel').hidden).toBe(false);
 expect(node(w,'mission').hidden).toBe(false);
});

it('does not switch chats during uncertain delivery or duplicate the accepted user message',async()=>{
 let count=0;const w=open({hosted:true,fetcher:w=>api(w,async()=>{if(++count===1)throw Error('Network lost');return response(w,{missionId:'m1'},202);})});await settle();
 await openMission(w);type(w,'Изначальный запрос');submit(w);await settle();
 (node(w,'new-chat') as any).click();await settle();expect(w.sessionStorage.getItem('pulse.pending')).not.toBeNull();
 await openMission(w);type(w,'Редактирование после обрыва');submit(w);await settle();
 expect(node(w,'chat-messages').querySelectorAll('[data-role="user"]')).toHaveLength(1);
 expect(node(w,'chat-messages').textContent).toContain('Изначальный запрос');
 expect((node(w,'prompt') as any).value).toBe('Редактирование после обрыва');
});

it('an old mission response cannot reopen a panel after starting a new chat',async()=>{
 let finish!:(value:any)=>void;
 const w=open({hosted:true,fetcher:w=>{
  const standard=api(w,async()=>response(w,{missionId:'m1'},202));
  return (async(path:any,init:any)=>String(path).startsWith('/api/mission?')?new Promise(resolve=>{finish=resolve;}):standard(path,init)) as Window['fetch'];
 }});await settle();await openMission(w);type(w,'Запрос');submit(w);await settle();
 // Submission stays guarded until its first status fetch returns.
 (node(w,'new-chat') as any).click();await settle();expect(node(w,'chat-count').textContent).toBe('1');
 finish(response(w,{mission:{status:'completed'},result:{summary:'Первый ответ'}}));await settle();
 (node(w,'resume') as any).click();await settle();
 (node(w,'new-chat') as any).click();await settle();
 finish(response(w,{mission:{status:'completed'},result:{summary:'Устаревший ответ'}}));await settle();
 expect(node(w,'mission-panel').hidden).toBe(true);expect(node(w,'mission-summary').textContent).toBe('');
});

it('stores histories per account and recovers from malformed or unavailable storage',()=>{
 const w=new Window();windows.push(w);
 const store=createChatHistory(w.sessionStorage as unknown as Storage);store.setScope('a');store.setDraft('Приватный черновик');store.accepted('key','<img src=x onerror=alert(1)>','p','m');store.report('m','Ответ','completed');
 store.setScope('b');expect(store.list()).toEqual([]);store.setScope('a');expect(store.list()).toHaveLength(1);
 const host=w.document.createElement('div');renderChatMessages(host as any,store.current(),'');expect(host.querySelector('img')).toBeNull();expect(host.textContent).toContain('<img');
 w.sessionStorage.setItem('pulse.chats.v1.bad','{');store.setScope('bad');expect(store.list()).toEqual([]);
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}} as unknown as Storage;
 const warning=vi.fn(),fallback=createChatHistory(broken,warning);fallback.setScope('x');fallback.setDraft('Still editable');expect(fallback.current()?.draft).toBe('Still editable');expect(warning).toHaveBeenCalledTimes(1);
});

it('Chat turn reports by requestKey so «Думаю…» clears without a missionId',()=>{
 const w=new Window();windows.push(w);
 const store=createChatHistory(w.sessionStorage as unknown as Storage);store.setScope('chat');
 const thread=store.create();
 store.accepted('rk-1','Привет','proj',thread.id);
 expect(store.current()?.turns[0]?.status).toBe('queued');
 const host=w.document.createElement('div');
 renderChatMessages(host as any,store.current(),'');
 expect(host.textContent).toContain('Думаю…');
 store.report('rk-1','Ответ готов','completed');
 renderChatMessages(host as any,store.current(),'');
 expect(host.textContent).toContain('Ответ готов');
 expect(host.textContent).not.toContain('Думаю…');
});

it('merges server conversations and hydrates turns so devices share Chat history',()=>{
 const w=new Window();windows.push(w);
 const store=createChatHistory(w.sessionStorage as unknown as Storage);store.setScope('owner');
 store.mergeRemote([{id:'phone-chat',project_id:'p1',preview:'Привет с телефона брат',last_message_at:'2026-10-15T10:00:00.000Z',message_count:2}]);
 expect(store.list().map(t=>t.id)).toContain('phone-chat');
 expect(store.list()[0]?.title).toBe('Привет с телефона');
 store.hydrate('phone-chat',[{id:'m1',role:'user',content:'Привет с телефона брат'},{id:'m2',role:'assistant',content:'На связи'}]);
 expect(store.select('phone-chat')?.turns).toHaveLength(1);
 expect(store.current()?.turns[0]?.reply).toBe('На связи');
 expect(autoChatTitle('Раз два три четыре')).toBe('Раз два три');
 store.rename('phone-chat','Мой проект');store.setPinned('phone-chat',true);
 expect(store.current()?.title).toBe('Мой проект');expect(store.current()?.pinned).toBe(true);
 expect(store.list()[0]?.id).toBe('phone-chat');
});
