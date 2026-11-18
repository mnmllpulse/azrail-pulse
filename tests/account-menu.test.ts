import { afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { createAccountMenu } from '../ui/account-menu';

let win: Window | undefined;
afterEach(() => { win?.close(); win = undefined; });

const setup = () => {
  win = new Window({ url: 'https://azrail.example/' });
  const doc = win.document;
  doc.body.innerHTML = '<div id="w"><button id="b"></button><div id="m" hidden><button id="i1">Настройки</button><button id="i2">Выйти</button></div></div><p id="out">x</p>';
  const el = (id: string) => doc.getElementById(id) as unknown as HTMLElement;
  const api = createAccountMenu({ wrap: el('w'), button: el('b') as HTMLButtonElement, menu: el('m') });
  return { doc, el, api, win };
};

describe('меню аккаунта', () => {
  it('кнопка открывает и закрывает меню, aria-expanded синхронен', () => {
    const t = setup();
    t.el('b').click();
    expect(t.el('m').hidden).toBe(false);
    expect(t.el('b').getAttribute('aria-expanded')).toBe('true');
    t.el('b').click();
    expect(t.el('m').hidden).toBe(true);
    expect(t.el('b').getAttribute('aria-expanded')).toBe('false');
  });
  it('выбор пункта закрывает меню', () => {
    const t = setup();
    t.api.open();
    t.el('i1').click();
    expect(t.api.isOpen()).toBe(false);
  });
  it('Escape и клик снаружи закрывают меню', () => {
    const t = setup();
    t.api.open();
    t.doc.dispatchEvent(new t.win.KeyboardEvent('keydown', { key: 'Escape' }) as unknown as Event);
    expect(t.api.isOpen()).toBe(false);
    t.api.open();
    t.doc.getElementById('out')!.dispatchEvent(new t.win.Event('pointerdown', { bubbles: true }) as unknown as Event);
    expect(t.api.isOpen()).toBe(false);
  });
});

describe('разметка и плотность', () => {
  const html = readFileSync('ui/app.html', 'utf8');
  const css = readFileSync('ui/premium-workspace.css', 'utf8');
  const app = readFileSync('ui/app.css', 'utf8');
  it('Настройки и вход/выход находятся в меню аккаунта', () => {
    const menu = html.match(/<div id="account-menu"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';
    expect(menu).toContain('id="settings"');
    expect(menu).toContain('id="account-action"');
    expect(html).toMatch(/id="account"[^>]*aria-controls="account-menu"/);
  });
  it('пункты сайдбара и настроек компактные', () => {
    expect(css).toMatch(/\.workspace-nav \.nav,\s*\.app-shell \.sidebar-footer \.nav \{\s*min-height: 34px/);
    expect(css).toMatch(/\.workspace-nav \{\s*gap: 1px/);
    expect(app).toMatch(/\.settings-nav-item \{[^}]*min-height:28px/);
    expect(app).toMatch(/\.settings-nav-group \{display:grid;gap:0;\}/);
  });
});
