import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('ui/app.html', 'utf8');
const css = readFileSync('ui/premium-workspace.css', 'utf8');
const app = readFileSync('ui/app.ts', 'utf8');

describe('поле ввода', () => {
  it('textarea без required и внутри единственной рамки вместе с кнопкой отправки', () => {
    const field = html.match(/<div class="composer-field">([\s\S]*?)<\/div>\s*<div id="attachment-names"/)?.[1] ?? '';
    expect(field).toContain('id="prompt"');
    expect(field).toContain('id="submit"');
    expect(field).not.toMatch(/\brequired\b/);
  });
  it('отправка — иконка Enter без градиентной кнопки', () => {
    expect(html).toMatch(/id="submit"[^>]*data-icon="enter"/);
    expect(html).not.toContain('>↑<');
    expect(css).not.toMatch(/\.send-button[^{]*\{[^}]*linear-gradient/);
  });
  it('плейсхолдер короткий, подсказки в одном блоке по центру', () => {
    expect(app).toContain("'Ответить'");
    expect(html).toContain('id="composer-hints"');
    expect(css).toMatch(/\.composer-footnote \{\s*justify-content: center/);
  });
  it('у внешней формы нет рамки, у textarea нет контура фокуса', () => {
    expect(css).toMatch(/\.app-shell \.composer \{\s*padding: 0;\s*border: 0;/);
    expect(css).toMatch(/textarea:focus-visible \{[^}]*outline: none/);
  });
});
