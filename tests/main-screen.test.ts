import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

const CONTROLS = 'button, a[href], input, select, textarea, summary';
const HIDDEN_BY_DEFAULT = '[hidden], [data-expert]:not(html), [aria-hidden="true"], dialog, .skip, input[type="file"]';

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

describe('главный экран по умолчанию', () => {
  it('в покое не больше семи элементов управления, не считая шторки (включая «Живой экран»)', () => {
    const doc = mainScreen();
    const center = doc.querySelector('.workspace-center')!;
    const controls = [...center.querySelectorAll(CONTROLS)].filter(visible).map(idOf);
    expect(controls.sort()).toEqual(['composer-models-open', 'attach', 'preview-toggle', 'prompt', 'sidebar-toggle', 'submit', 'voice'].sort());
    expect(controls.length).toBeLessThanOrEqual(7);
  });

  it('служебное спрятано за режимом «Эксперт», а не удалено', () => {
    const doc = mainScreen();
    for (const id of ['commands', 'context-toggle']) {
      expect(doc.getElementById(id)?.hasAttribute('data-expert'), id).toBe(true);
    }
    expect(doc.getElementById('preview-toggle')?.hasAttribute('data-expert')).toBe(false);
  });

  it('Settings Center and account remain reachable from the drawer; About lives inside Settings', () => {
    const doc = mainScreen();
    const sidebar = doc.getElementById('workspace-sidebar')!;
    expect(sidebar.querySelector('#settings')).not.toBeNull();
    expect(sidebar.querySelector('#about')).toBeNull();
    expect(doc.getElementById('settings-root')).not.toBeNull();
    expect(sidebar.querySelector('#account')).not.toBeNull();
  });
});
