import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {mountSettingsCenter} from '../ui/settings-center';

let windowRef:Window|undefined;
afterEach(()=>{
  vi.unstubAllGlobals();
  windowRef?.close();
  windowRef=undefined;
});
function mount(section?:string){
  windowRef=new Window({url:'https://azrail.example/settings'});
  vi.stubGlobal('document',windowRef.document);
  vi.stubGlobal('sessionStorage',windowRef.sessionStorage);
  const host=windowRef.document.createElement('div');
  windowRef.document.body.append(host);
  const navigate=vi.fn();
  mountSettingsCenter(host,section,undefined,destination=>navigate(destination));
  return {host,navigate};
}

describe('Settings Center navigation and search',()=>{
  it('renders grouped categories and marks the current section',()=>{
    const {host}=mount('models');
    expect(host.querySelectorAll('.settings-nav-group').length).toBeGreaterThan(1);
    expect(host.querySelector('[data-settings-section="models"]')?.getAttribute('aria-current')).toBe('page');
    expect(host.querySelectorAll('.settings-category-card')).toHaveLength(0);
  });
  it('filters categories and hides empty navigation groups',()=>{
    const {host}=mount();
    const search=host.querySelector<HTMLInputElement>('.settings-search-label input')!;
    search.value='провайдер';
    search.dispatchEvent(new windowRef!.Event('input'));
    expect(host.querySelectorAll('.settings-category-card:not([hidden])')).toHaveLength(1);
    expect(host.querySelector('.settings-category-card:not([hidden])')?.textContent).toContain('Провайдеры и API');
    expect(host.querySelector('.settings-search-empty')?.hasAttribute('hidden')).toBe(true);
    expect(Array.from(host.querySelectorAll<HTMLElement>('.settings-nav-group')).some(group=>group.hidden)).toBe(true);
  });
  it('searches provider cards by provider name and description',()=>{
    const {host}=mount('providers');
    const search=host.querySelector<HTMLInputElement>('.settings-search-label input')!;
    search.value='claude';
    search.dispatchEvent(new windowRef!.Event('input'));
    const visible=host.querySelectorAll('.settings-provider-card:not([hidden])');
    expect(visible).toHaveLength(1);
    expect(visible[0].textContent).toContain('Anthropic');
    expect(host.querySelector('[data-settings-section="providers"]')?.hasAttribute('hidden')).toBe(false);
  });
  it('shows a useful empty state when the query has no matches',()=>{
    const {host}=mount('providers');
    const search=host.querySelector<HTMLInputElement>('.settings-search-label input')!;
    search.value='provider-does-not-exist';
    search.dispatchEvent(new windowRef!.Event('input'));
    expect(host.querySelectorAll('.settings-provider-card:not([hidden])')).toHaveLength(0);
    expect(host.querySelector('.settings-search-empty')?.hasAttribute('hidden')).toBe(false);
    search.value='';
    search.dispatchEvent(new windowRef!.Event('input'));
    expect(host.querySelectorAll('.settings-provider-card:not([hidden])').length).toBeGreaterThan(1);
    expect(host.querySelector('.settings-search-empty')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('Settings Center back navigation',()=>{
  it('overview offers a way back to chat and non-clickable current crumb',()=>{
    const {host,navigate}=mount();
    const up=host.querySelector<HTMLButtonElement>('.settings-up')!;
    expect(up.textContent).toBe('← Вернуться в чат');
    up.click();
    expect(navigate).toHaveBeenCalledWith({page:'create'});
    expect(host.querySelectorAll('.settings-crumb.is-current')).toHaveLength(1);
  });
  it('a section has «Все настройки» and a clickable first crumb',()=>{
    const {host,navigate}=mount('agent');
    const up=host.querySelector<HTMLButtonElement>('.settings-up')!;
    expect(up.textContent).toBe('← Все настройки');
    up.click();
    expect(navigate).toHaveBeenLastCalledWith({page:'settings'});
    host.querySelector<HTMLButtonElement>('button.settings-crumb')!.click();
    expect(navigate).toHaveBeenLastCalledWith({page:'settings'});
    expect(host.querySelector('.settings-crumb.is-current')?.textContent).toBe('Локальный агент');
  });
  it('a provider page goes back to the provider list',()=>{
    windowRef=new Window({url:'https://azrail.example/settings/providers/openai'});
    vi.stubGlobal('document',windowRef.document);
    vi.stubGlobal('sessionStorage',windowRef.sessionStorage);
    const host=windowRef.document.createElement('div');
    windowRef.document.body.append(host);
    const navigate=vi.fn();
    mountSettingsCenter(host,'providers','openai',d=>navigate(d));
    const up=host.querySelector<HTMLButtonElement>('.settings-up')!;
    expect(up.textContent).toBe('← Провайдеры');
    up.click();
    expect(navigate).toHaveBeenLastCalledWith({section:'providers'});
    const crumbs=Array.from(host.querySelectorAll('.settings-crumb')).map(c=>c.textContent);
    expect(crumbs).toEqual(['Настройки','Провайдеры','OpenAI']);
  });
  it('Ctrl+K focuses the settings search only while the page is shown',()=>{
    const {host}=mount();
    const search=host.querySelector<HTMLInputElement>('.settings-search-label input')!;
    const event=new windowRef!.KeyboardEvent('keydown',{key:'k',ctrlKey:true,cancelable:true});
    windowRef!.document.dispatchEvent(event);
    expect(windowRef!.document.activeElement).toBe(search);
    expect(event.defaultPrevented).toBe(true);
  });
  it('marks the shell when a section is open so phones can hide the category list',()=>{
    expect(mount('agent').host.querySelector('.settings-shell')?.classList.contains('has-section')).toBe(true);
    expect(mount().host.querySelector('.settings-shell')?.classList.contains('has-section')).toBe(false);
  });
  it('the settings view is scrollable (regression: content used to be clipped)',async()=>{
    const {readFileSync}=await import('node:fs');
    const css=readFileSync('ui/app.css','utf8');
    const rule=css.split('\n').find(line=>line.startsWith('#settings-page.settings-view'))!;
    expect(rule).toContain('overflow-y:auto');
    expect(rule).not.toContain('overflow:visible');
    expect(rule).toContain('height:100%');
  });
});
