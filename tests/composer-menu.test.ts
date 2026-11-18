import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {createModelMenu,EFFORT_DEFAULT,EFFORT_LEVELS,readEffort} from '../ui/composer-menu';

let win:Window|undefined;
afterEach(()=>{vi.unstubAllGlobals();win?.close();win=undefined;});

const setup=()=>{
  win=new Window({url:'https://azrail.example/'});
  const doc=win.document;
  vi.stubGlobal('document',doc);vi.stubGlobal('sessionStorage',win.sessionStorage);
  doc.body.innerHTML='<div id="composer-models"><button id="open"><span id="composer-models-effort"></span></button></div>';
  const select=vi.fn(),openAll=vi.fn();
  const menu=createModelMenu({
    root:doc.getElementById('composer-models') as unknown as HTMLElement,
    button:doc.getElementById('open') as unknown as HTMLButtonElement,
    current:()=>({slug:'',label:'Auto · AZRAIL'}),
    others:()=>Array.from({length:12},(_,i)=>({slug:`m${i}`,label:`Модель ${i}`})),
    select,openAll,
  });
  const click=(text:string)=>{const b=Array.from(doc.querySelectorAll('.composer-menu button')).find(x=>x.textContent?.includes(text));expect(b,text).toBeTruthy();(b as HTMLElement).click();};
  return {doc,menu,select,openAll,click,button:doc.getElementById('open') as HTMLElement};
};

describe('меню модели и уровня усилий',()=>{
  it('четыре уровня, по умолчанию Средний',()=>{
    expect(EFFORT_LEVELS.map(l=>l.label)).toEqual(['Низкий','Средний','Высокий','Максимальный']);
    expect(EFFORT_DEFAULT).toBe('medium');
    setup();expect(readEffort()).toBe('medium');
  });
  it('кнопка показывает уровень и открывает меню',()=>{
    const t=setup();
    expect(t.doc.getElementById('composer-models-effort')?.textContent).toBe('Средний');
    t.button.click();
    expect(t.doc.querySelector('.composer-menu')?.textContent).toContain('Уровень усилий');
    expect(t.doc.querySelector('.composer-menu')?.textContent).toContain('Другие модели');
  });
  it('выбор уровня сохраняется и обновляет кнопку',()=>{
    const t=setup();t.button.click();t.click('Уровень усилий');
    expect(t.doc.querySelector('.composer-menu')?.textContent).toContain('Рекомендуется');
    expect(t.doc.querySelector('.composer-menu')?.textContent).toContain('быстрее расходует лимиты использования');
    t.click('Максимальный');
    expect(t.doc.querySelectorAll('.composer-menu small').length).toBe(0);
    expect(t.menu.effort()).toBe('max');
    expect(readEffort()).toBe('max');
    expect(t.doc.getElementById('composer-models-effort')?.textContent).toBe('Максимальный');
  });
  it('другие модели: список целиком, без описаний, и «Все модели…»',()=>{
    const t=setup();t.button.click();t.click('Другие модели');
    expect(t.doc.querySelectorAll('.composer-menu-item').length).toBe(13);
    expect(t.doc.querySelectorAll('.composer-menu small').length).toBe(0);
    t.click('Модель 3');expect(t.select).toHaveBeenCalledWith('m3');
    expect(t.doc.querySelector('.composer-menu')).toBeNull();
    t.button.click();t.click('Другие модели');t.click('Все модели');expect(t.openAll).toHaveBeenCalled();
  });
  it('Escape закрывает меню',()=>{
    const t=setup();t.button.click();
    t.doc.dispatchEvent(new win!.KeyboardEvent('keydown',{key:'Escape'}) as unknown as Event);
    expect(t.doc.querySelector('.composer-menu')).toBeNull();
  });
});
