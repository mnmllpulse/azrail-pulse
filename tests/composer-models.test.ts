import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {createComposerModels,type CatalogModel} from '../ui/composer-models';

const catalog:CatalogModel[]=[
  {slug:'@cf/meta/llama-3.1-8b-instruct',displayName:'Llama 3.1 8B',freeAllowlisted:true,hosted:true,task:'Text Generation',availability:'available',provider:'Meta'},
  {slug:'openai/gpt-6-luna',displayName:'GPT Luna',hosted:false,task:'Text Generation',availability:'available',provider:'OpenAI'},
  {slug:'google/gemini-3',displayName:'Gemini',hosted:false,availability:'unavailable',provider:'Google'},
];
let win:Window|undefined;
afterEach(()=>{vi.unstubAllGlobals();win?.close();win=undefined;});

const setup=(over:{identity?:string|null;local?:boolean;load?:()=>Promise<{models?:unknown}>}={})=>{
  win=new Window({url:'https://azrail.example/'});
  const doc=win.document;
  vi.stubGlobal('document',doc);
  doc.body.innerHTML='<select id="composer-model"></select><button id="composer-models-open"></button><span id="composer-models-current"></span><img id="composer-models-icon"><dialog id="dialog"><h2 id="dialog-title"></h2><div id="dialog-content"></div></dialog>';
  (doc.getElementById('dialog') as unknown as {showModal:()=>void;close:()=>void}).showModal=function(this:{open:boolean}){this.open=true;};
  (doc.getElementById('dialog') as unknown as {close:()=>void}).close=function(this:{open:boolean}){this.open=false;};
  let preferred='';
  const notice=vi.fn();
  let identity=over.identity===undefined?'u1':over.identity;
  const api=createComposerModels({
    $:<T extends HTMLElement=HTMLElement>(id:string)=>doc.getElementById(id) as unknown as T,
    preferred:()=>preferred,
    setPreferred:slug=>{preferred=slug;},
    dialog:(title,html)=>{doc.getElementById('dialog-title')!.textContent=title;const c=doc.getElementById('dialog-content')!;c.innerHTML=html;(doc.getElementById('dialog') as unknown as {showModal:()=>void}).showModal();return c as unknown as HTMLElement;},
    notice,
    loadCatalog:over.load??(async()=>({models:catalog})),
    identity:()=>identity,
    local:()=>over.local??false,
  });
  return {api,doc,notice,get preferred(){return preferred;},setIdentity:(v:string|null)=>{identity=v;}};
};

describe('composer models',()=>{
  it('loads the catalog and hides unavailable models from the selector',async()=>{
    const t=setup();
    await t.api.refresh();
    expect(t.api.models()).toHaveLength(3);
    expect(t.api.pickable().map(m=>m.slug)).toEqual(['@cf/meta/llama-3.1-8b-instruct','openai/gpt-6-luna']);
    const values=Array.from(t.doc.querySelectorAll<HTMLOptionElement>('#composer-model option')).map(o=>o.value);
    expect(values).toEqual(['','@cf/meta/llama-3.1-8b-instruct','openai/gpt-6-luna']);
    expect(t.doc.getElementById('composer-models-open')!.title).toBe('Models · 2');
  });
  it('does not call the catalog without an account or in local mode',async()=>{
    const load=vi.fn(async()=>({models:catalog}));
    for(const over of [{identity:null},{local:true}]){
      const t=setup({...over,load});
      await t.api.refresh();
      expect(t.api.models()).toEqual([]);
    }
    expect(load).not.toHaveBeenCalled();
  });
  it('falls back to Auto with an honest hint when the catalog fails',async()=>{
    const t=setup({load:async()=>{throw new Error('boom');}});
    await t.api.refresh();
    expect(t.doc.getElementById('composer-models-open')!.title).toContain('Каталог недоступен');
    expect(t.doc.getElementById('composer-models-current')!.textContent).toBe('Auto · AZRAIL');
  });
  it('drops a stale response when the account changed mid-request',async()=>{
    let resolve!:(v:{models:CatalogModel[]})=>void;
    const t=setup({load:()=>new Promise(r=>{resolve=r as typeof resolve;})});
    const pending=t.api.refresh();
    t.setIdentity('u2');
    resolve({models:catalog});
    await pending;
    expect(t.api.models()).toEqual([]);
  });
  it('picker selects a model, closes the dialog and warns about external routing',async()=>{
    const t=setup();
    await t.api.refresh();
    t.api.open();
    expect(t.doc.getElementById('dialog-title')!.textContent).toBe('Models');
    t.doc.querySelector<HTMLInputElement>('#model-picker-locked')!.checked=false;
    t.doc.querySelector<HTMLElement>('.model-picker-chip[data-filter="all"]')!.click();
    const rows=Array.from(t.doc.querySelectorAll<HTMLButtonElement>('.model-picker-item'));
    const luna=rows.find(r=>r.textContent?.includes('GPT Luna'))!;
    luna.click();
    expect(t.preferred).toBe('openai/gpt-6-luna');
    expect((t.doc.getElementById('dialog') as unknown as {open:boolean}).open).toBe(false);
    expect(t.notice).toHaveBeenCalledWith(expect.stringContaining('AI Gateway'),true);
  });
  it('picker Auto clears the preference',async()=>{
    const t=setup();
    await t.api.refresh();
    t.api.open();
    t.doc.querySelector<HTMLButtonElement>('.model-picker-item')!.click();
    expect(t.preferred).toBe('');
  });
});
