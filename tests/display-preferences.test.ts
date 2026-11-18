import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {applyDisplayPrefs,DEFAULT_PREFS,readDisplayPrefs,saveDisplayPrefs} from '../ui/display-preferences';
import {diagnosticRows,renderDiagnostics} from '../ui/settings-diagnostics';
import {readFileSync} from 'node:fs';

let win:Window|undefined;
const setup=()=>{win=new Window({url:'https://azrail.example/'});vi.stubGlobal('document',win.document);vi.stubGlobal('localStorage',win.localStorage);return win;};
afterEach(()=>{vi.unstubAllGlobals();win?.close();win=undefined;});

describe('display preferences',()=>{
  it('returns defaults for empty or invalid storage',()=>{
    const w=setup();
    expect(readDisplayPrefs()).toEqual(DEFAULT_PREFS);
    w.localStorage.setItem('pulse.uiFont','comic');w.localStorage.setItem('pulse.uiDensity','giant');w.localStorage.setItem('pulse.uiTextScale','huge');
    expect(readDisplayPrefs()).toEqual(DEFAULT_PREFS);
  });
  it('round-trips and applies to the root element',()=>{
    const w=setup();
    const prefs={density:'compact' as const,textScale:'large' as const,font:'serif' as const,reduceMotion:true,highContrast:true};
    expect(saveDisplayPrefs(prefs)).toBe(true);
    expect(readDisplayPrefs()).toEqual(prefs);
    applyDisplayPrefs(readDisplayPrefs(),w.document.documentElement as unknown as HTMLElement);
    const root=w.document.documentElement;
    expect([root.dataset.settingsDensity,root.dataset.settingsTextScale,root.dataset.settingsFont,root.dataset.settingsMotion,root.dataset.settingsContrast]).toEqual(['compact','large','serif','reduced','high']);
  });
  it('reports a blocked storage write',()=>{
    setup();
    vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new Error('blocked');}});
    expect(saveDisplayPrefs(DEFAULT_PREFS)).toBe(false);
    expect(readDisplayPrefs()).toEqual(DEFAULT_PREFS);
  });
  it('every data attribute written by the code is read by the stylesheet',()=>{
    const css=readFileSync('ui/app.css','utf8');
    for(const attr of ['data-settings-density','data-settings-text-scale','data-settings-font','data-settings-motion','data-settings-contrast'])expect(css).toContain(attr);
  });
});

describe('diagnostics',()=>{
  it('labels bindings as not probed and surfaces real errors',()=>{
    const rows=diagnosticRows({version:'1.0.0',status:'degraded',services:[{name:'d1',status:'error',ms:12,error:'timeout'},{name:'kv',status:'ok',ms:3,error:null},{name:'r2',status:'absent',ms:null,error:null}],bindings:{ai:'bound',queue:'absent'},agents:7});
    const text=rows.map(r=>`${r.label}: ${r.value}`).join('\n');
    expect(text).toContain('Деградация');
    expect(text).toContain('База данных D1: Ошибка · timeout');
    expect(text).toContain('Хранилище KV: Работает · 3 мс');
    expect(text).toContain('Файловое хранилище R2: Не подключён');
    expect(text).toContain('Workers AI: Привязан (работоспособность не проверялась)');
    expect(rows.find(r=>r.label==='Общее состояние')?.level).toBe('error');
  });
  it('renders rows and a visible error when loading fails',async()=>{
    const w=setup();
    const host=w.document.createElement('div');w.document.body.append(host);
    const failure=vi.fn();
    renderDiagnostics(host as unknown as HTMLElement,{loadHealth:async()=>({version:'1.0.0',status:'healthy',services:[]}),failure});
    await new Promise(r=>setTimeout(r,0));
    expect(host.textContent).toContain('Версия сборки');
    const host2=w.document.createElement('div');w.document.body.append(host2);
    renderDiagnostics(host2 as unknown as HTMLElement,{loadHealth:async()=>{throw new Error('Нет доступа');},failure});
    await new Promise(r=>setTimeout(r,0));
    expect(host2.textContent).toContain('Нет доступа');
    expect(failure).toHaveBeenCalledOnce();
  });
});
