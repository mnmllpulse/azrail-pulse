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
