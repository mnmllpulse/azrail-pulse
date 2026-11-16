import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

const CONTROLS = 'button, a[href], input, select, textarea, summary';
const HIDDEN_BY_DEFAULT = '#chat-welcome, [hidden], [data-expert]:not(html), [aria-hidden="true"], dialog, .skip, input[type="file"]';

function mainScreen() {
  const html = readFileSync('index.html', 'utf8').replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<script[^>]*><\/script>/g, '');
  const window = new Window({ url: 'https://workspace.example.com/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  window.document.write(html);
  // Кнопка моделей скрыта до входа; для запаса считаем экран после входа.
  window.document.getElementById('composer-models')?.removeAttribute('hidden');
  return window.document;
}

const visible = (el: Element) => !el.closest(HIDDEN_BY_DEFAULT);
const idOf = (el: Element) => el.id || el.getAttribute('data-view') || el.tagName.toLowerCase();

describe('главный экран по умолчанию (чипы пустого чата не считаются)', () => {
  it('в покое не больше шести элементов управления, не считая шторки', () => {
    const doc = mainScreen();
    const center = doc.querySelector('.workspace-center')!;
    const controls = [...center.querySelectorAll(CONTROLS)].filter(visible).map(idOf);
    expect(controls.sort()).toEqual(['composer-models-open', 'attach', 'prompt', 'sidebar-toggle', 'submit', 'voice'].sort());
    expect(controls.length).toBeLessThanOrEqual(6);
  });

  it('служебное спрятано за режимом «Эксперт», а не удалено', () => {
    const doc = mainScreen();
    for (const id of ['commands', 'preview-toggle', 'context-toggle']) {
      expect(doc.getElementById(id)?.hasAttribute('data-expert'), id).toBe(true);
    }
  });

  it('настройки и «О системе» остались достижимы из шторки', () => {
    const doc = mainScreen();
    const sidebar = doc.getElementById('workspace-sidebar')!;
    expect(sidebar.querySelector('#settings')).not.toBeNull();
    expect(sidebar.querySelector('#about')).not.toBeNull();
    expect(sidebar.querySelector('#account')).not.toBeNull();
  });
});

describe('чипы пустого чата', () => {
  it('четыре чипа с началом фразы, внутри приветствия, которое прячется после первого сообщения', () => {
    const doc = mainScreen();
    const chips = [...doc.querySelectorAll('#chat-welcome [data-chip]')];
    expect(chips.map((c) => c.textContent)).toEqual(['Сделать сайт', 'Нарисовать', 'Написать трек', 'Разобрать файл']);
    expect(chips.every((c) => (c.getAttribute('data-chip') ?? '').length > 4 && c.getAttribute('type') === 'button')).toBe(true);
  });

  it('клик подставляет фразу в поле, ставит фокус и ничего не отправляет', async () => {
    const html = readFileSync('index.html', 'utf8');
    const window = new Window({ url: 'file:///phone/index.html', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
    window.document.write(html.replace(/<script>[\s\S]*?<\/script>/g, ''));
    window.requestIdleCallback = () => 0;
    window.HTMLElement.prototype.scrollIntoView = () => {};
    let requests = 0;
    (window as unknown as { fetch: unknown }).fetch = async () => { requests++; return new Response('{}'); };
    window.eval(html.match(/<script>([\s\S]*?)<\/script>/)![1]);
    await new Promise((r) => setTimeout(r, 0));
    const doc = window.document;
    const before = requests;
    (doc.querySelector('[data-chip="Напиши трек: "]') as HTMLElement).click();
    const prompt = doc.getElementById('prompt') as HTMLTextAreaElement;
    expect(prompt.value).toBe('Напиши трек: ');
    expect(doc.activeElement).toBe(prompt);
    expect(requests).toBe(before);
    expect(doc.getElementById('studio-page')?.hasAttribute('hidden')).toBe(true);
  });
});
