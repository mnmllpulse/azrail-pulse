import { describe, expect, it } from 'vitest';
import { listZip, readEntry } from '../src/lib/zip-reader';
import { applySiteNote, draftFromLine, draftFromPhrase, draftLine, filesForDraft, siteDelta, siteZip } from '../ui/chat-site';

describe('Страница из чата', () => {
  it('собирает тёмный сайт с чатом и принимает следующую правку ширины и импульса', () => {
    const first = draftFromPhrase('Создай мне сайт AZRAIL OS в чёрном стиле с фиолетовыми эффектами, красивой анимацией и AI-чатом.');
    expect(first.name).toBe('AZRAIL OS');
    expect(first.style).toBe('dark');
    expect(first.chat).toBe(true);
    expect(first.violet).toBe(true);
    const html = filesForDraft(first).find((file) => file.path === 'index.html')?.text ?? '';
    expect(html).toContain('class="block az-chat"');
    expect(html).toContain('<style>');
    expect(html).not.toContain('az-chat wide');
    const next = applySiteNote(first, 'Сделай чат шире и добавь эффект живого фиолетового импульса.');
    expect(next?.wide).toBe(true);
    expect(next?.pulse).toBe(true);
    const revised = filesForDraft(next!).find((file) => file.path === 'index.html')?.text ?? '';
    expect(revised).toContain('az-chat wide az-pulse');
    expect(draftFromLine(draftLine(next!))?.wide).toBe(true);
    expect(applySiteNote(next!, 'переведи это на японский')).toBeNull();
    const plain = draftFromPhrase('Собери сайт для бюро');
    const richer = applySiteNote(plain, 'Бро, наш сайт выглядит дешево');
    expect(richer?.style).toBe('dark');
    expect(richer?.violet).toBe(true);
    expect(richer?.pulse).toBe(true);
    expect(richer?.rich).toBe(true);
    const richHtml = filesForDraft(richer!).find((file) => file.path === 'index.html')?.text ?? '';
    expect(richHtml).toContain('az-rich');
    expect(richHtml).toContain('az-pulse');
    const simpler = applySiteNote(richer!, 'Наш проект слишком сложный');
    expect(simpler?.simple).toBe(true);
    expect(filesForDraft(simpler!).filter((file) => file.path.endsWith('.html'))).toHaveLength(1);
    expect(siteDelta(draftLine(first), draftLine(next!))).toContain('чат стал шире');
    expect(siteDelta(draftLine(first), draftLine(next!))).toContain('появился импульс');
    expect(siteDelta(draftLine(first), draftLine(first))).toBe('Дальше эти переключатели не менялись.');
  });

  it('ZIP страницы содержит собранный index.html', async () => {
    const calc = filesForDraft(draftFromPhrase('Сделай калькулятор'));
    expect(calc.find((file) => file.path === 'index.html')?.text).toContain('data-key="="');
    const files = filesForDraft(draftFromPhrase('Собери сайт для бюро'));
    const packed = siteZip(files);
    const buf = packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength);
    const page = listZip(buf).entries.find((entry) => entry.path === 'index.html');
    expect(page).toBeTruthy();
    expect(new TextDecoder().decode(await readEntry(buf, page!))).toContain('<style>');
  });
});
