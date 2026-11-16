import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {limitsLine,providerInfo,providerModels,renderProviderPage,type Routing} from '../ui/settings-providers';
import type {PickerModel} from '../ui/model-picker';

const model=(slug:string,extra:Partial<PickerModel>={}):PickerModel=>({slug,displayName:slug,availability:'available',...extra} as PickerModel);
const catalog:PickerModel[]=[
  model('@cf/meta/llama-3.1-8b-instruct',{freeAllowlisted:true,hosted:true,provider:'Meta'}),
  model('openai/gpt-6-luna',{hosted:false,provider:'OpenAI'}),
  model('openai/gpt-6-pro',{hosted:false,provider:'OpenAI',availability:'unavailable'}),
  model('google/gemini-3',{hosted:false,provider:'Google',availability:'unavailable'}),
];
const routing=(over:Partial<Routing>={},policy:Partial<Routing['policy']>={}):Routing=>({policy:{allowThirdPartyModels:true,monthlyBudgetUsd:5,...policy},gatewayConfigured:true,committedUsd:0.5,month:'2026-11',...over});

describe('providerInfo',()=>{
  it('filters models by provider label',()=>{
    expect(providerModels('openai',catalog).map(m=>m.slug)).toEqual(['openai/gpt-6-luna','openai/gpt-6-pro']);
    expect(providerModels('groq',catalog)).toEqual([]);
  });
  it('is ready only when models exist, gateway is on and policy allows',()=>{
    const info=providerInfo('openai',catalog,routing(),false);
    expect(info.level).toBe('ready');
    expect(info.available).toBe(1);
  });
  it('blocks the route when gateway or policy is off, regardless of a local key',()=>{
    expect(providerInfo('openai',catalog,routing({gatewayConfigured:false}),true).level).toBe('blocked');
    expect(providerInfo('openai',catalog,routing({},{allowThirdPartyModels:false}),true).level).toBe('blocked');
  });
  it('never turns a saved key into an active connection',()=>{
    const withKey=providerInfo('openai',catalog,routing({gatewayConfigured:false}),true);
    const without=providerInfo('openai',catalog,routing({gatewayConfigured:false}),false);
    expect(withKey.level).toBe(without.level);
    expect(withKey.facts.join(' ')).toContain('на статус он не влияет');
    expect(providerInfo('groq',catalog,routing(),true).level).toBe('absent');
  });
  it('reports locked when every model is unavailable',()=>{
    expect(providerInfo('google',catalog,routing(),false).level).toBe('blocked');
  });
  it('states honestly when routing could not be read',()=>{
    const info=providerInfo('openai',catalog,null,false);
    expect(info.facts.join(' ')).toContain('не удалось прочитать');
  });
  it('limits line says there are no per-provider stats',()=>{
    expect(limitsLine(routing())).toContain('раздельной статистики по провайдерам система не ведёт');
    expect(limitsLine(null)).toContain('не удалось');
  });
});

describe('renderProviderPage',()=>{
  let win:Window|undefined;
  afterEach(()=>{vi.unstubAllGlobals();win?.close();win=undefined;});
  const mount=async(deps:{catalog?:PickerModel[]|Error;routing?:Routing|null}={})=>{
    win=new Window({url:'https://azrail.example/settings/providers/openai'});
    vi.stubGlobal('document',win.document);
    vi.stubGlobal('sessionStorage',win.sessionStorage);
    const host=win.document.createElement('div');
    win.document.body.append(host);
    const notice=vi.fn(),back=vi.fn(),failure=vi.fn();
    const loadCatalog=vi.fn(async()=>{if(deps.catalog instanceof Error)throw deps.catalog;return deps.catalog??catalog;});
    const loadRouting=vi.fn(async()=>deps.routing===undefined?routing():deps.routing);
    renderProviderPage(host as unknown as HTMLElement,{providerId:'openai',loadCatalog,loadRouting,notice,failure,back});
    await new Promise(r=>setTimeout(r,0));
    return {host,notice,back,failure,loadCatalog,loadRouting};
  };
  it('shows route status, models with badges and limits',async()=>{
    const {host}=await mount();
    expect(host.querySelector('.settings-provider-status')?.getAttribute('data-level')).toBe('ready');
    expect(host.querySelectorAll('.settings-model-item')).toHaveLength(2);
    expect(host.textContent).toContain('Способ авторизации: маршрут AZRAIL');
    expect(host.textContent).toContain('Статистика и ограничения');
  });
  it('re-checks the state on demand',async()=>{
    const {host,loadCatalog}=await mount();
    const check=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Проверить состояние')!;
    check.click();
    await new Promise(r=>setTimeout(r,0));
    expect(loadCatalog).toHaveBeenCalledTimes(2);
  });
  it('saves and clears a local key without changing the route status',async()=>{
    const {host,notice}=await mount({routing:routing({gatewayConfigured:false})});
    expect(host.querySelector('.settings-provider-status')?.getAttribute('data-level')).toBe('blocked');
    const input=host.querySelector<HTMLInputElement>('input[type=password]')!;
    input.value='sk-test-123';
    Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Сохранить ключ')!.click();
    await new Promise(r=>setTimeout(r,0));
    expect(win!.sessionStorage.getItem('pulse.providerTokens')).toContain('sk-test-123');
    expect(host.querySelector('.settings-provider-status')?.getAttribute('data-level')).toBe('blocked');
    expect(notice).toHaveBeenCalled();
    Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Удалить ключ')!.click();
    expect(win!.sessionStorage.getItem('pulse.providerTokens')??'').not.toContain('sk-test-123');
  });
  it('rejects an empty key',async()=>{
    const {host,notice}=await mount();
    Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Сохранить ключ')!.click();
    expect(notice).toHaveBeenCalledWith('Вставьте ключ в поле.',true);
  });
  it('shows an honest message when the catalog failed to load',async()=>{
    const {host}=await mount({catalog:new Error('401')});
    expect(host.textContent).toContain('Каталог моделей не загрузился');
    expect(host.querySelector('.settings-provider-status')).toBeNull();
  });
  it('navigates back',async()=>{
    const {host,back}=await mount();
    host.querySelector<HTMLButtonElement>('.settings-provider-back')!.click();
    expect(back).toHaveBeenCalled();
  });
});
