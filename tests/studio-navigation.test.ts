import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {readRoute,routePath} from '../ui/navigation';
import {studios} from '../ui/studios';
import {mountStudioDraft} from '../ui/studio-draft';
import {parseCSV,analyzeCSV} from '../ui/data';
const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
const html=()=>readFileSync('index.html','utf8');
const windows:Window[]=[];
afterEach(async()=>{for(const w of windows){w.dispatchEvent(new w.Event('pagehide'));await w.happyDOM.abort();w.close();}windows.length=0;vi.unstubAllGlobals();});
function open(url='file:///preview/index.html',fetcher?:Window['fetch']){
 const w=new Window({url,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});windows.push(w);
 // HTTP is mocked below; prevent project-event sockets from reaching the real
 // app.example.com host and scheduling reconnects during happyDOM.abort().
 Object.defineProperty(w,'WebSocket',{value:undefined,configurable:true});
 w.document.write(html().replace(/<script>[\s\S]*?<\/script>/g,''));w.HTMLElement.prototype.scrollIntoView=()=>{};
 if(fetcher)w.fetch=fetcher;else w.fetch=(async()=>new w.Response(JSON.stringify({account:null,configured:true}),{headers:{'Content-Type':'application/json'}}))as any;
 w.eval(html().match(/<script>([\s\S]*?)<\/script>/)![1]);return w;
}
it.each(studios)('$id opens on its own hosted page, rather than in the studio catalog',async(studio)=>{
 const w=open(`https://app.example.com/studios/${studio.id}`);await settle();
 expect(w.location.pathname).toBe(`/studios/${studio.id}`);
 expect(w.document.getElementById('studio-page')?.hidden).toBe(false);
 expect(w.document.getElementById('studios')?.hidden).toBe(true);
 expect(w.document.getElementById('create')?.hidden).toBe(true);
 expect(w.document.getElementById('studio-title')?.textContent).toBe(studio.title);
 expect(w.document.title).toContain(studio.title);
 expect(w.document.querySelector('[data-view="studios"]')?.getAttribute('aria-current')).toBe('page');
 expect(w.document.getElementById('close-studio')?.getAttribute('href')).toBe('/studios');
 const composer=w.document.getElementById('composer');
 expect(w.document.querySelector('.composer-dock')?.hidden).toBe(false);
 expect(w.document.getElementById('studio-controls')?.contains(composer)).toBe(false);
 expect(w.document.getElementById('attach')&&w.document.getElementById('voice')&&w.document.getElementById('composer-model')&&w.document.getElementById('submit')).toBeTruthy();
});
it('standalone links, browser Back/Forward and reload retain a studio address',async()=>{
 const w=open();(w.document.querySelector('[data-view="studios"]')as any).click();
 (w.document.querySelector('#studio-list [data-studio="music"]')as any).click();
 expect(w.location.hash).toBe('#/studios/music');expect(w.document.getElementById('studios')?.hidden).toBe(true);
 w.history.back();await settle();expect(w.document.getElementById('studios')?.hidden).toBe(false);
 w.history.forward();await settle();expect(w.document.getElementById('studio-title')?.textContent).toBe('Music Studio');
 const reloaded=open(w.location.href);expect(reloaded.document.getElementById('studio-title')?.textContent).toBe('Music Studio');
});
it('the bottom composer stays on studios, Mission Control and Metatron and hides on project lists',async()=>{
 const w=open('file:///preview/index.html#/studios/web');await settle();const composer=w.document.getElementById('composer')!;
 const dock=composer.closest('.composer-dock') as HTMLElement;
 expect(dock.hidden).toBe(false);
 expect(w.document.querySelector('.workspace-center')?.contains(dock)).toBe(true);
 expect(w.document.getElementById('studio-controls')?.contains(composer)).toBe(false);
 expect(w.document.getElementById('studio-controls')?.contains(w.document.getElementById('mission-panel'))).toBe(false);
 expect(w.document.getElementById('attachments')?.hasAttribute('accept')).toBe(false);
 const prompt=w.document.getElementById('prompt')as any;prompt.value='Мой музыкальный лейбл';prompt.dispatchEvent(new w.Event('input'));
 (w.document.querySelector('[data-home]')as any).click();
 expect(dock.hidden).toBe(false);expect(prompt.value).toBe('');
 (w.document.querySelector('#studio-list [data-studio="web"]')as any).click();await settle();
 expect(prompt.value).toBe('Мой музыкальный лейбл');
 (w.document.querySelector('[data-view="projects"]')as any).click();expect(dock.hidden).toBe(true);
 (w.document.querySelector('[data-view="studios"]')as any).click();expect(dock.hidden).toBe(true);
 (w.document.querySelector('[data-view="mission"]')as any).click();await settle();expect(dock.hidden).toBe(false);
 expect(w.document.getElementById('mission')?.hidden).toBe(false);
 expect(w.document.querySelector('#mission h1')?.textContent).toBe('AZRAIL');
 expect(w.document.getElementById('mission-panel')?.closest('#mission')).toBeTruthy();
 (w.document.querySelector('[data-view="metatron"]')as any).click();await settle();expect(dock.hidden).toBe(false);
});
it('Mission Control route is readable and home no longer owns the mission panel',()=>{
 expect(readRoute(new URL('https://example.com/mission'))).toEqual({page:'mission'});
 expect(routePath({page:'mission'})).toBe('/mission');
 const html=readFileSync('ui/app.html','utf8');
 expect(html).toContain('data-view="mission"');
 expect(html).toContain('Mission Control');
 expect(html).toMatch(/id="mission"[\s\S]*?id="mission-panel"/);
 expect(html.match(/id="create"[\s\S]*?<\/section>/)?.[0]??'').not.toContain('mission-panel');
});
it('each studio keeps its own bottom chat and a prompt there feeds that studio',async()=>{
 const w=open('file:///preview/index.html#/studios/image');await settle();
 const prompt=w.document.getElementById('prompt') as any;
 expect(w.document.getElementById('studio-chat')?.hidden).toBe(true);
 expect(w.document.getElementById('studio-talk-open')?.hidden).toBe(false);
 (w.document.getElementById('studio-talk-open') as any).click();await settle();
 expect(w.document.getElementById('studio-chat')?.hidden).toBe(false);
 (w.document.getElementById('studio-talk-close') as any).click();await settle();
 expect(w.document.getElementById('studio-chat')?.hidden).toBe(true);
 expect(prompt.placeholder).toContain('картинку');
 prompt.value='Фиолетовая луна';prompt.dispatchEvent(new w.Event('input',{bubbles:true}));
 (w.document.querySelector('#studio-list [data-studio="music"]') as any).click();await settle();
 expect(prompt.placeholder).toContain('трек');expect(prompt.value).toBe('');
 expect(w.document.getElementById('studio-chat-log')?.textContent).toContain('отдельный чат');
 (w.document.querySelector('#studio-list [data-studio="image"]') as any).click();await settle();
 expect(prompt.value).toBe('Фиолетовая луна');
 w.document.getElementById('composer')!.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();await settle();
 expect((w.document.getElementById('studio-text') as any).value).toBe('Фиолетовая луна');
 expect(w.document.getElementById('studio-chat-log')?.textContent).toContain('Фиолетовая луна');
 expect(w.document.getElementById('chat-messages')?.textContent??'').not.toContain('Фиолетовая луна');
 (w.document.querySelector('#studio-list [data-studio="music"]') as any).click();await settle();
 expect(w.document.getElementById('studio-chat-log')?.textContent??'').not.toContain('Фиолетовая луна');
});
it('studio chats keep their own job and do not start a code mission',async()=>{
 const calls:string[]=[];
 const w=open('file:///preview/index.html#/studios/prose');await settle();
 w.fetch=(async(path:any,options:any={})=>{calls.push(`${options.method??'GET'} ${path}`);return new w.Response(JSON.stringify({account:null,configured:true}),{headers:{'Content-Type':'application/json'}});}) as any;
 const prompt=w.document.getElementById('prompt') as any;
 prompt.value='[Drop]\n(Ритм)\nЭкстази в темноте.';
 w.document.getElementById('composer')!.dispatchEvent(new w.Event('submit',{cancelable:true}));
 await settle();await settle();
 expect((w.document.getElementById('prose-prompt') as any).value).toContain('Экстази');
 expect(w.document.getElementById('prose-results')?.textContent).toContain('[Drop]');
 expect(w.document.getElementById('prose-results')?.textContent).toContain('(Ритм)');
 expect(w.document.getElementById('studio-chat-log')?.textContent).toContain('не поёт');
 expect(calls.some(call=>String(call).includes('/api/mission'))).toBe(false);
 (w.document.querySelector('#studio-list [data-studio="web"]') as any).click();await settle();
 prompt.value='Собери сайт лейбла';
 w.document.getElementById('composer')!.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 expect(w.document.getElementById('studio-chat-log')?.textContent).toContain('Mission Control');
 expect(calls.some(call=>String(call).includes('/api/mission'))).toBe(false);
 (w.document.querySelector('#studio-list [data-studio="ledger"]') as any).click();await settle();
 prompt.value='Сколько потратили?';
 w.document.getElementById('composer')!.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 expect(w.document.getElementById('studio-chat-log')?.textContent).toContain('после входа');
 expect(calls.some(call=>String(call).includes('/api/mission'))).toBe(false);
});
it('image, video and web keep the first screen to one field and tuck the rest behind a button',async()=>{
 const w=open('file:///preview/index.html#/studios/image');await settle();
 expect(w.document.getElementById('studio-text')).toBeTruthy();
 expect(w.document.getElementById('image-advanced')?.hidden).toBe(true);
 (w.document.getElementById('image-advanced-toggle') as any).click();
 expect(w.document.getElementById('image-advanced')?.hidden).toBe(false);
 (w.document.querySelector('#studio-list [data-studio="video"]') as any).click();await settle();
 expect(w.document.getElementById('studio-text')).toBeTruthy();
 expect(w.document.getElementById('video-advanced')?.hidden).toBe(true);
 expect(w.document.getElementById('video-build-scenes')).toBeTruthy();
 (w.document.getElementById('video-advanced-toggle') as any).click();
 expect(w.document.getElementById('video-advanced')?.hidden).toBe(false);
 (w.document.querySelector('#studio-list [data-studio="web"]') as any).click();await settle();
 expect((w.document.querySelector('.web-workbench') as HTMLElement|null)?.hidden).toBe(true);
 (w.document.getElementById('web-advanced-toggle') as any).click();
 expect((w.document.querySelector('.web-workbench') as HTMLElement|null)?.hidden).toBe(false);
});
it('module edits survive leaving and reopening without leaking into another module',async()=>{
 const w=open('file:///preview/index.html#/studios/music');await settle();const input=w.document.getElementById('studio-text')as any;
 input.value='Dark melodic house';input.dispatchEvent(new w.Event('input'));
 (w.document.querySelector('#studio-list [data-studio="video"]')as any).click();await settle();
 expect((w.document.getElementById('studio-text')as any).value).toBe('Dark minimal pulse moving through an abstract city at night.');
 (w.document.querySelector('#studio-list [data-studio="music"]')as any).click();await settle();
 expect((w.document.getElementById('studio-text')as any).value).toBe('Dark melodic house');
});
it('an async report cannot overwrite the result area of a different page',async()=>{
 const w=open('file:///preview/index.html#/studios/data');await settle();let finish!:(text:string)=>void;
 Object.defineProperty(w.document.getElementById('studio-file'),'files',{value:[{size:10,text:()=>new Promise<string>(r=>{finish=r;})}]});
 (w.document.getElementById('studio-run')as any).click();await settle();expect(finish).toBeTypeOf('function');
 w.location.hash='#/studios/audio';w.dispatchEvent(new w.HashChangeEvent('hashchange'));finish('x,y\n1,2');await settle();
 expect(w.document.getElementById('studio-title')?.textContent).toBe('Audio Lab');
 expect(w.document.getElementById('studio-result')?.textContent).toContain('Audio Lab:');expect(w.document.getElementById('studio-result')?.textContent).not.toMatch(/Data Studio|строк/i);
 expect(w.document.getElementById('studio-result')?.hasAttribute('aria-busy')).toBe(false);
});
it('unknown module URLs show an explicit not-found page',()=>{
 const w=open('file:///preview/index.html#/studios/not-a-module');expect(w.document.getElementById('not-found')?.hidden).toBe(false);
 expect(w.document.getElementById('studio-page')?.hidden).toBe(true);
 expect(readRoute(new URL('https://example.com/studios/toString'))).toEqual({page:'not-found'});
 expect(readRoute(new URL('https://example.com/studio/music/'))).toEqual({page:'studio',studio:'music'});
 expect(routePath({page:'studio',studio:'web'})).toBe('/studios/web');
});
it('the active standalone build has no globe, WebGL renderer or remote asset dependency',()=>{
 const source=html();expect(source).not.toContain('id="globe"');expect(source).not.toContain('WebGLRenderer');
 const markup=source.replace(/<script>[\s\S]*?<\/script>/g,'');expect(markup).not.toMatch(/<script[^>]+src=/);expect(markup).not.toMatch(/<link[^>]+stylesheet/);
 const meta=JSON.parse(readFileSync('.work/ui-metafile.json','utf8'));expect(Object.keys(meta.inputs).some(name=>/node_modules\/three\//.test(name))).toBe(false);
});
it('an automatic server draft reload does not silently overwrite another-tab revision',async()=>{
 const w=new Window({url:'https://app.example.com'});windows.push(w);vi.stubGlobal('document',w.document);vi.stubGlobal('CustomEvent',w.CustomEvent);
 const host=w.document.createElement('div');host.innerHTML='<input id="studio-text" value="Initial">';w.document.body.append(host);
 const api=vi.fn().mockResolvedValueOnce({revision:1,values:{'studio-text':'Saved'}}).mockResolvedValue({revision:2,values:{'studio-text':'Other tab'}});
 let clean=mountStudioDraft(host as any,'music',api,true,{scope:'account-a'});await settle();
 const field=host.querySelector('input')!;field.value='My unsaved edit';field.dispatchEvent(new w.Event('input'));clean();
 clean=mountStudioDraft(host as any,'music',api,true,{scope:'account-a'});await settle();
 expect(field.value).toBe('My unsaved edit');expect(host.textContent).toContain('другая версия');
 const save=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Сохранить черновик')!;expect(save.disabled).toBe(true);
 const writes=api.mock.calls.filter(call=>call.length>1);
 expect(writes.length).toBeLessThanOrEqual(1);
 if(writes[0])expect(JSON.parse(String(writes[0][1]?.body))).toEqual({baseRevision:1,values:{'studio-text':'My unsaved edit'}});
 clean();
});
it('studio undo and redo survive leaving and coming back',()=>{
 const w=new Window({url:'https://app.example.com'});windows.push(w);vi.stubGlobal('document',w.document);vi.stubGlobal('CustomEvent',w.CustomEvent);
 const host=w.document.createElement('div');host.innerHTML='<input id="studio-text" value="Initial">';w.document.body.append(host);
 const api=vi.fn();let clean=mountStudioDraft(host as any,'music',api,false,{scope:'account-a'});
 const field=host.querySelector('input')!;
 field.value='One';field.dispatchEvent(new w.Event('input'));field.value='Two';field.dispatchEvent(new w.Event('input'));clean();field.value='lost';
 clean=mountStudioDraft(host as any,'music',api,false,{scope:'account-a'});
 expect(field.value).toBe('Two');
 const buttons=()=>Array.from(host.querySelectorAll('button'));
 buttons().find(b=>b.textContent==='↶ Отменить')!.click();expect(field.value).toBe('One');
 buttons().find(b=>b.textContent==='↶ Отменить')!.click();expect(field.value).toBe('Initial');
 buttons().find(b=>b.textContent==='↷ Повторить')!.click();expect(field.value).toBe('One');
 buttons().find(b=>b.textContent==='↷ Повторить')!.click();expect(field.value).toBe('Two');
 clean();
});
it('per-account local draft keys do not expose a previous account prompt',()=>{
 const w=new Window({url:'https://app.example.com'});windows.push(w);vi.stubGlobal('document',w.document);vi.stubGlobal('CustomEvent',w.CustomEvent);
 const host=w.document.createElement('div');host.innerHTML='<input id="studio-text" value="Default">';w.document.body.append(host);
 const api=vi.fn();let clean=mountStudioDraft(host as any,'music',api,false,{scope:'account-a'});
 const field=host.querySelector('input')!;field.value='Private title';field.dispatchEvent(new w.Event('input'));clean();field.value='Default';
 clean=mountStudioDraft(host as any,'music',api,false,{scope:'account-b'});expect(field.value).toBe('Default');clean();
});
it.each(['\uFEFFname;value\r\n"a;b";2\r\n','name\tvalue\r"a\tb"\t2\r'])('CSV handles spreadsheet BOM and separators: %s',source=>{
 const result=analyzeCSV(source);expect(result.rows).toBe(1);expect(result.columns.map(c=>c.name)).toEqual(['name','value']);expect(result.columns[1].mean).toBe(2);
});
it('CSV bounds cell allocation and rejects malformed quoting rather than guessing',()=>{
 expect(()=>parseCSV('x'.repeat(1)+','.repeat(256))).toThrow('столбцов');
 expect(()=>parseCSV('x,y\n"abc"oops,1')).toThrow('закрывающей');expect(()=>parseCSV('x,y\nab"c,1')).toThrow('Кавычка');
});
it('CSV averages large finite numbers without overflowing the sum',()=>{expect(analyzeCSV('x\n1e308\n1e308').columns[0].mean).toBe(1e308);});
it('two submit events while a mission is pending dispatch only one request',async()=>{
 let posts=0,finish!:(response:Response)=>void;
 const w=open('https://app.example.com/',(async(path:any,options:any={})=>{
  if(path==='/auth/status')return Response.json({account:{id:'a',name:'A'},configured:true});
  if(path==='/api/routing-settings')return Response.json({policy:{allowThirdPartyModels:false}});
  if(String(path).startsWith('/api/metatron/missions'))return Response.json({items:[]});
  if(path==='/api/mission'&&options.method==='POST'){posts++;return new Promise<Response>(resolve=>{finish=resolve;});}
  return Response.json({mission:{status:'completed'},result:{summary:'Готово'}});
 })as any);await settle();
 (w.document.querySelector('[data-view="mission"]') as any).click();await settle();
 (w.document.getElementById('prompt')as any).value='Создай сайт';const form=w.document.getElementById('composer')!;
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
 expect(posts).toBe(1);finish(Response.json({missionId:'one'}, {status:202}));await settle();
 expect(w.sessionStorage.getItem('pulse.pending')).toBeNull();
});
it('a non-JSON HTTP rejection still releases the pending image key',async()=>{
 const w=open('https://app.example.com/studios/image',(async(path:any,options:any={})=>{
  if(path==='/auth/status')return Response.json({account:{id:'a',name:'A'},configured:true});
  if(path==='/api/routing-settings')return Response.json({policy:{allowThirdPartyModels:false}});
  if(path==='/api/studio/image'&&options.method==='POST')return new Response('<html>rate limited</html>',{status:429});
  return Response.json({revision:0,values:{}});
 })as any);await settle();(w.document.getElementById('studio-text')as any).value='Dark house cover';
 (w.document.getElementById('studio-run')as any).click();await settle();
 expect(w.sessionStorage.getItem('pulse.image.pending')).toBeNull();expect(w.document.getElementById('studio-result')?.textContent).toContain('429');
 expect(w.document.querySelector('#studio-result html')).toBeNull();
});
