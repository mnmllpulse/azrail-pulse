import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
const html=readFileSync('public/ultimate.html','utf8'),script=readFileSync('public/ultimate.js','utf8');
class Element {
  id='';value='';textContent='';disabled=false;hidden=false;readOnly=false;open=false;files:any[]=[];dataset:Record<string,string>={};attrs:Record<string,string>={};children:any[]=[];events:Record<string,Function[]>={};
  addEventListener(type:string,fn:Function){(this.events[type]??=[]).push(fn);}
  async dispatch(type='click'){for(const fn of this.events[type]??[])await fn({preventDefault(){}});}
  setAttribute(k:string,v:string){this.attrs[k]=v;}
  showModal(){this.open=true;} close(){this.open=false;} focus(){}click(){}append(v:any){this.children.push(v);}replaceChildren(){this.children=[];}
}
function setup(protocol='https:',stored:Record<string,string>={},responses:Record<string,any>={}){
  const elements=new Map<string,Element>(),all:Element[]=[];
  for(const tag of html.matchAll(/<(?:[a-z][a-z0-9-]*)\b[^>]*>/gi)){
    const e=new Element();for(const attr of tag[0].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)){e.attrs[attr[1]]=attr[2];if(attr[1]==='id')e.id=attr[2];if(attr[1].startsWith('data-'))e.dataset[attr[1].slice(5).replace(/-([a-z])/g,(_,v)=>v.toUpperCase())]=attr[2];}
    e.hidden=/\bhidden(?:\s|>)/.test(tag[0]);e.disabled=/\bdisabled(?:\s|>)/.test(tag[0]);all.push(e);if(e.id)elements.set(e.id,e);
  }
  const store=new Map(Object.entries(stored));const calls:Array<{path:string;options:any}>=[];const timers=new Map<number,Function>();let seq=0;
  const fetch=vi.fn(async(path:string,options:any)=>{calls.push({path,options});const r=responses[path];if(r instanceof Error)throw r;const val=typeof r==='function'?r():r;if(val?.status)return new Response(JSON.stringify(val.body),{status:val.status});return new Response(JSON.stringify(val??{}));});
  const location={protocol,assign:vi.fn()};const document={hidden:false,getElementById:(id:string)=>elements.get(id),createElement:()=>new Element(),addEventListener(){},querySelectorAll:(selector:string)=>{const key=selector.slice(1,-1);return all.filter(e=>key in e.attrs);}};
  runInNewContext(script,{document,location,crypto:{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)},sessionStorage:{getItem:(k:string)=>store.get(k),setItem:(k:string,v:string)=>store.set(k,v)},fetch,URL,Blob,AbortController,console,setTimeout:(fn:Function)=>{timers.set(++seq,fn);return seq;},clearTimeout:(id:number)=>timers.delete(id)});
  return {get:(id:string)=>elements.get(id)!,store,fetch,calls,location,timers};
}
const flush=async()=>{for(let i=0;i<30;i++)await new Promise(resolve=>setImmediate(resolve));};
const policy={policy:{allowThirdPartyModels:false,forceFree:false,monthlyBudgetUsd:1},gatewayConfigured:true,committedUsd:0};
const session={azrail_ultimate_token:'test',azrail_ultimate_project:'p'};
describe('Ultimate standalone and real event handlers',()=>{
  it('embeds exact CSS/JS and requires no external assets to render',()=>{
    expect(html).toContain(readFileSync('public/ultimate.css','utf8').trim());expect(html).toContain(script.trim());
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"|<script[^>]+src=/);expect(html).not.toMatch(/(?:href|src)="https?:/);
  });
  it.each(['file:','content:'])('local %s preview works without randomUUID or API calls',async protocol=>{
    const t=setup(protocol);expect(t.get('localBanner').hidden).toBe(false);expect(t.get('modeLabel').textContent).toBe('Локальный просмотр');await t.get('composer').dispatch('submit');expect(t.get('settings').open).toBe(true);expect(t.fetch).not.toHaveBeenCalled();expect(t.get('saveMode').disabled).toBe(true);
  });
  it('local opening accepts HTTPS but rejects script URLs and embedded credentials',async()=>{
    const t=setup('content:');for(const url of ['javascript:alert(1)','https://user:pass@example.org']){t.get('siteAddress').value=url;await t.get('openHosted').dispatch();expect(t.location.assign).not.toHaveBeenCalled();}
    t.get('siteAddress').value='https://my-azrail.example/';await t.get('openHosted').dispatch();expect(t.location.assign).toHaveBeenCalledWith('https://my-azrail.example/ultimate.html');
  });
  it('restores a completed mission after page reload',async()=>{
    const t=setup('https:',{...session,azrail_ultimate_mission:'m'},{'/api/me':{account:{name:'Owner',role:'admin'}},'/api/routing-settings':policy,'/api/mission?missionId=m':{mission:{status:'completed',goal:'Build a site'},done:true,result:{summary:'Saved result'},plan:[]}});
    await flush();expect(t.get('result').textContent).toBe('Saved result');expect(t.get('downloadResult').disabled).toBe(false);expect(t.store.get('azrail_ultimate_mission')).toBe('m');expect(t.get('createButton').disabled).toBe(false);
    await t.get('newProject').dispatch();expect(t.store.get('azrail_ultimate_mission')).toBe('');expect(t.get('work').hidden).toBe(true);
  });
  it('viewer cannot create missions or enable models',async()=>{
    const t=setup('https:',session,{'/api/me':{account:{name:'Viewer',role:'viewer'}},'/api/routing-settings':policy});await flush();expect(t.get('createButton').disabled).toBe(true);expect(t.get('saveMode').disabled).toBe(true);await t.get('composer').dispatch('submit');expect(t.calls.some(c=>c.path==='/api/mission')).toBe(false);
  });
  it('network retries reuse the original body and idempotency key',async()=>{
    const t=setup('https:',{}, {'/api/me':{account:{name:'Owner',role:'admin'}},'/api/routing-settings':policy,'/api/mission':new Error('network down')});t.get('access').value='test';await t.get('connect').dispatch();
    t.get('idea').value='Original task';await t.get('composer').dispatch('submit');t.get('idea').value='Changed';await t.get('composer').dispatch('submit');
    const sent=t.calls.filter(c=>c.path==='/api/mission');expect(sent).toHaveLength(2);expect(sent[1].options.body).toBe(sent[0].options.body);expect(sent[1].options.headers['Idempotency-Key']).toBe(sent[0].options.headers['Idempotency-Key']);expect(t.get('idea').readOnly).toBe(true);
  });
  it('definitive project-busy refusal does not trap future submissions',async()=>{
    const t=setup('https:',{}, {'/api/me':{account:{name:'Owner',role:'admin'}},'/api/routing-settings':policy,'/api/mission':{status:409,body:{error:'busy',code:'project_busy'}}});t.get('access').value='test';await t.get('connect').dispatch();t.get('idea').value='Task';await t.get('composer').dispatch('submit');expect(t.store.get('azrail_ultimate_pending_body')).toBe('');expect(t.get('idea').readOnly).toBe(false);
  });
  it('failed polling after access revocation does not keep retrying',async()=>{
    const t=setup('https:',{...session,azrail_ultimate_mission:'m'},{'/api/me':{account:{name:'Owner',role:'admin'}},'/api/routing-settings':policy,'/api/mission?missionId=m':{status:401,body:{error:'revoked'}}});await flush();expect(t.timers.size).toBe(0);expect(t.get('notice').textContent).toContain('остановлена');
  });
});
