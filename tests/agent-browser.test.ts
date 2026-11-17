import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {childPath,crumbs,createAgentBrowser,LIST_LIMIT,parentPath,parseListing} from '../ui/agent-browser';

describe('agent browser helpers',()=>{
  it('parses listings: folders first, sorted, closed names skipped',()=>{
    expect(parseListing('b.txt\nsrc/\n\na.md\nui/\n')).toEqual([{name:'src',dir:true},{name:'ui',dir:true},{name:'a.md',dir:false},{name:'b.txt',dir:false}]);
    expect(parseListing('')).toEqual([]);
  });
  it('builds child, parent and breadcrumb paths without ".."',()=>{
    expect(childPath('','src')).toBe('src');
    expect(childPath('src','ui')).toBe('src/ui');
    expect(parentPath('src/ui')).toBe('src');
    expect(parentPath('src')).toBe('');
    expect(parentPath('')).toBe('');
    expect(crumbs('src/ui')).toEqual([{label:'Папка агента',path:''},{label:'src',path:'src'},{label:'ui',path:'src/ui'}]);
  });
});

let win:Window|undefined;
afterEach(()=>{vi.unstubAllGlobals();win?.close();win=undefined;});

type Tree=Record<string,string>;
const setup=(tree:Tree,state:{enabled?:boolean;connected?:boolean}={enabled:true,connected:true},reads:Record<string,string>={})=>{
  win=new Window({url:'https://azrail.example/'});
  vi.stubGlobal('document',win.document);
  const calls:Array<{kind:string;path:string}>=[];
  const jobs=new Map<string,{kind:string;path:string}>();
  let n=0;
  const api=vi.fn(async(path:string,init?:RequestInit)=>{
    if(path==='/api/agent/status')return {...state,jobs:[]};
    if(path==='/api/agent/jobs'){const body=JSON.parse(String(init?.body));const id=`j${++n}`;jobs.set(id,body);calls.push(body);return {job:{id,kind:body.kind,path:body.path,status:'queued',result:null,error:null}};}
    const id=path.split('/').pop()!;const job=jobs.get(id)!;
    if(job.kind==='list')return {job:{id,...job,status:job.path in tree?'done':'failed',result:tree[job.path]??null,error:job.path in tree?null:'Нет такой папки.'}};
    return {job:{id,...job,status:'done',result:reads[job.path]??'',error:null}};
  });
  const picks:Array<{path:string;kind:string}>=[];
  const ownJobs=new Set<string>();
  const browser=createAgentBrowser({api,sleep:async()=>{},onSelect:s=>picks.push(s),failure:vi.fn(),ownJobs});
  win.document.body.append(browser.element as unknown as Node);
  const doc=win.document;
  const rows=()=>Array.from(doc.querySelectorAll<HTMLButtonElement>('.agent-browser-entry'));
  const crumbBtns=()=>Array.from(doc.querySelectorAll<HTMLButtonElement>('.agent-browser-crumb'));
  const flush=()=>new Promise(r=>setTimeout(r,0));
  return {browser,api,calls,picks,ownJobs,doc,rows,crumbBtns,flush};
};

describe('agent browser',()=>{
  it('opens the root and renders folders before files',async()=>{
    const t=setup({'':'src/\nREADME.md\ndocs/'});
    await t.browser.open('');
    expect(t.rows().map(r=>r.textContent)).toEqual(['▸docs/','▸src/','·README.md']);
    expect(t.picks.at(-1)).toEqual({path:'',kind:'list'});
    expect(t.ownJobs.size).toBe(1);
  });
  it('navigates into a folder, up and via breadcrumbs',async()=>{
    const t=setup({'':'src/','src':'ui/\nindex.ts','src/ui':'app.ts'});
    await t.browser.open('');
    t.rows()[0].click();await t.flush();await t.flush();
    expect(t.calls.at(-1)).toEqual({kind:'list',path:'src'});
    expect(t.crumbBtns().map(b=>b.textContent)).toEqual(['Папка агента','src']);
    expect(t.rows().map(r=>r.textContent)).toEqual(['↑ Вверх','▸ui/','·index.ts']);
    t.rows()[1].click();await t.flush();await t.flush();
    expect(t.calls.at(-1)).toEqual({kind:'list',path:'src/ui'});
    t.rows()[0].click();await t.flush();await t.flush();
    expect(t.calls.at(-1)).toEqual({kind:'list',path:'src'});
    t.crumbBtns()[0].click();await t.flush();await t.flush();
    expect(t.calls.at(-1)).toEqual({kind:'list',path:''});
  });
  it('opens a file in a read-only preview and reports the selection',async()=>{
    const t=setup({'':'a.txt'},undefined,{'a.txt':'привет'});
    await t.browser.open('');
    t.rows()[0].click();await t.flush();await t.flush();
    expect(t.calls.at(-1)).toEqual({kind:'read',path:'a.txt'});
    expect(t.picks.at(-1)).toEqual({path:'a.txt',kind:'read'});
    const area=t.doc.querySelector<HTMLTextAreaElement>('.agent-browser-preview textarea')!;
    expect(area.value).toBe('привет');
    expect(area.readOnly).toBe(true);
  });
  it('explains a disabled or disconnected agent without creating jobs',async()=>{
    for(const [state,text] of [[{enabled:false},'выключен'],[{enabled:true,connected:false},'не запущен']] as const){
      const t=setup({'':''},state);
      await t.browser.open('');
      expect(t.doc.querySelector('.agent-browser-list')!.textContent).toContain(text);
      expect(t.calls).toEqual([]);
    }
  });
  it('shows the agent error for a failed listing',async()=>{
    const t=setup({'':'x/'});
    await t.browser.open('missing');
    expect(t.doc.querySelector('.agent-browser-list')!.textContent).toContain('Нет такой папки.');
  });
  it('says so when a folder is empty or truncated',async()=>{
    const empty=setup({'':''});
    await empty.browser.open('');
    expect(empty.doc.querySelector('.agent-browser-list')!.textContent).toContain('пуста');
    const big=setup({'':Array.from({length:LIST_LIMIT},(_,i)=>`f${i}.txt`).join('\n')});
    await big.browser.open('');
    expect(big.doc.querySelector('.agent-browser-list')!.textContent).toContain(`первые ${LIST_LIMIT}`);
  });
  it('treats entry names as text, not markup',async()=>{
    const t=setup({'':'<img src=x onerror=alert(1)>.txt'});
    await t.browser.open('');
    expect(t.doc.querySelector('.agent-browser-list img')).toBeNull();
    expect(t.rows()[0].textContent).toContain('<img');
  });
});

describe('agent settings form',()=>{
  const mount=async(state:Record<string,unknown>)=>{
    const {agentSettings}=await import('../ui/local-agent');
    win=new Window({url:'https://azrail.example/'});
    vi.stubGlobal('document',win.document);
    vi.stubGlobal('location',win.location);
    const posted:any[]=[];
    const api=vi.fn(async(path:string,init?:RequestInit)=>{
      if(path==='/api/agent/status')return state;
      if(path==='/api/agent/jobs'&&init?.method==='POST'){const body=JSON.parse(String(init.body));posted.push(body);return {job:{id:`j${posted.length}`,kind:body.kind,path:body.path,status:'queued',result:null,error:null}};}
      const id=path.split('/').pop()!;
      return {job:{id,kind:'list',path:'',status:'done',result:'src/\na.txt',error:null}};
    });
    const host=agentSettings(api,vi.fn(),vi.fn());
    win.document.body.append(host as unknown as Node);
    for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,0));
    return {host,api,posted,doc:win.document};
  };
  it('shows the browser and a whitelist select for commands when the agent is connected',async()=>{
    const t=await mount({enabled:true,connected:true,expiresAt:Date.now()+3600_000,jobs:[]});
    expect(t.doc.querySelector('.agent-browser')).not.toBeNull();
    expect(t.doc.querySelectorAll('.agent-browser-entry').length).toBeGreaterThan(0);
    const [kind,command]=Array.from(t.doc.querySelectorAll<HTMLSelectElement>('.settings-block select'));
    kind.value='run';kind.dispatchEvent(new t.doc.defaultView!.Event('change'));
    expect(command.hidden).toBe(false);
    expect(Array.from(command.options).map(o=>o.value)).toContain('npm_test');
    const send=Array.from(t.doc.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent==='Поставить задачу')!;
    command.value='git_status';
    send.click();
    await new Promise(r=>setTimeout(r,0));
    expect(t.posted.at(-1)).toEqual({kind:'run',path:'git_status'});
  });
  it('does not render the browser for a disabled agent',async()=>{
    const t=await mount({enabled:false,connected:false,expiresAt:null,jobs:[]});
    expect(t.doc.querySelector('.agent-browser')).toBeNull();
  });
});

describe('agent setup and path conversion',()=>{
  type S={enabled:boolean;connected:boolean;root:string|null;expiresAt:number|null;jobs:unknown[]};
  const mountLive=async(initial:Partial<S>)=>{
    const {agentSettings}=await import('../ui/local-agent');
    win=new Window({url:'https://azrail.example/settings/agent'});
    vi.stubGlobal('document',win.document);
    vi.stubGlobal('location',win.location);
    vi.stubGlobal('localStorage',win.localStorage);
    const state:S={enabled:false,connected:false,root:null,expiresAt:null,jobs:[],...initial};
    const posted:any[]=[];
    const notice=vi.fn();
    const api=vi.fn(async(path:string,init?:RequestInit)=>{
      if(path==='/api/agent/status')return {...state};
      if(path==='/api/agent/enable'){state.enabled=true;state.expiresAt=Date.now()+3600_000;return {token:'azagent_'+'a'.repeat(64)};}
      if(path==='/api/agent/jobs'&&init?.method==='POST'){const b=JSON.parse(String(init.body));posted.push(b);return {job:{id:`j${posted.length}`,kind:b.kind,path:b.path,status:'queued',result:null,error:null}};}
      const id=path.split('/').pop()!;
      return {job:{id,kind:'list',path:'',status:'done',result:'src/\na.ts',error:null}};
    });
    const host=agentSettings(api,notice,vi.fn());
    win.document.body.append(host as unknown as Node);
    const tick=async(n=10)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
    await tick();
    const doc=win.document;
    const button=(text:string)=>Array.from(doc.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent===text)!;
    return {state,posted,notice,api,doc,tick,button};
  };
  it('after enabling shows the key once with a command that follows the typed folder',async()=>{
    const t=await mountLive({});
    t.button('Включить на 1 час').click();
    await t.tick();
    const setup=t.doc.querySelector('.agent-setup')!;
    expect(setup).not.toBeNull();
    const box=setup.querySelector('textarea')!;
    expect(box.value).toContain('azagent_'+'a'.repeat(64));
    expect(box.value).toContain('(Get-Location).Path');
    const input=setup.querySelector<HTMLInputElement>('input')!;
    input.value='C:\\Users\\Tech No\\azrail-pulse';
    input.dispatchEvent(new win!.Event('input'));
    expect(box.value).toContain("AZRAIL_ROOT='C:\\Users\\Tech No\\azrail-pulse'");
    expect(win!.localStorage.getItem('pulse.agentRoot')).toBe('C:\\Users\\Tech No\\azrail-pulse');
  });
  it('without a fresh key explains that the key is shown once',async()=>{
    const t=await mountLive({enabled:true,expiresAt:Date.now()+3600_000});
    expect(t.doc.querySelector('.agent-setup')).toBeNull();
    expect(t.doc.body.textContent).toContain('Ключ показывается один раз');
  });
  it('shows the agent folder once connected and hides the setup panel',async()=>{
    const t=await mountLive({enabled:true,connected:true,root:'C:\\Users\\Tech No\\azrail-pulse',expiresAt:Date.now()+3600_000});
    expect(t.doc.querySelector('.agent-setup')).toBeNull();
    expect(t.doc.body.textContent).toContain('Агент подключён, папка: C:\\Users\\Tech No\\azrail-pulse');
    expect(t.doc.querySelector('.agent-browser-root')?.textContent).toBe('Папка агента: C:\\Users\\Tech No\\azrail-pulse');
  });
  it('converts an absolute path inside the folder and blocks one outside it',async()=>{
    const t=await mountLive({enabled:true,connected:true,root:'C:\\Users\\Tech No\\azrail-pulse',expiresAt:Date.now()+3600_000});
    const [kind]=Array.from(t.doc.querySelectorAll<HTMLSelectElement>('.settings-block select'));
    kind.value='read';kind.dispatchEvent(new win!.Event('change'));
    const pathInput=t.doc.querySelector<HTMLInputElement>('input[aria-label="Путь относительно папки агента"]')!;
    pathInput.value='C:\\Users\\Tech No\\azrail-pulse\\src\\a.ts';
    t.button('Поставить задачу').click();
    await t.tick();
    expect(t.posted.at(-1)).toEqual({kind:'read',path:'src/a.ts'});
    const before=t.posted.length;
    pathInput.value='C:\\Windows\\System32';
    t.button('Поставить задачу').click();
    await t.tick();
    expect(t.posted).toHaveLength(before);
    expect(t.notice).toHaveBeenLastCalledWith(expect.stringContaining('вне папки агента'),true);
  });
  it('repaints by itself when the agent connects',async()=>{
    vi.useFakeTimers({toFake:['setInterval','clearInterval']});
    try{
      const t=await mountLive({enabled:true,expiresAt:Date.now()+3600_000});
      expect(t.doc.body.textContent).toContain('ещё не подключился');
      t.state.connected=true;t.state.root='C:\\proj';
      await vi.advanceTimersByTimeAsync(3100);
      await t.tick();
      expect(t.doc.body.textContent).toContain('Агент подключён, папка: C:\\proj');
    }finally{vi.useRealTimers();}
  });
});
