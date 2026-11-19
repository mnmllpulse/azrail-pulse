import { afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';
import { createAttachmentManager } from '../ui/attachment-manager';

let win: Window | undefined;
afterEach(() => { vi.unstubAllGlobals(); win?.close(); win = undefined; });

const setup = () => {
  win = new Window({ url: 'https://azrail.example/' });
  const doc = win.document;
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }));
  doc.body.innerHTML = '<div id="root"></div><input id="input" type="file">';
  const manager = createAttachmentManager({
    root: doc.getElementById('root') as unknown as HTMLElement,
    input: doc.getElementById('input') as unknown as HTMLInputElement,
    getProjectId: () => 'p1',
    api: async () => ({ r2Key: 'k', fileName: 'проект-сайта.zip', inputType: 'zip', size: 1 }),
    failure: () => undefined,
  } as never);
  return { doc, manager };
};

describe('плитки вложений в композере', () => {
  it('картинка — только миниатюра и кнопка «Убрать», без имени и статуса', async () => {
    const { doc, manager } = setup();
    await manager.add([new File(['x'], 'c480dfb2-e17f-41e0-aaaa.png', { type: 'image/png' })]);
    const tile = doc.querySelector('.attachment-tile.is-image')!;
    expect(tile.querySelector('img.attachment-thumb')).toBeTruthy();
    expect(tile.textContent?.trim()).toBe('');
    expect(doc.querySelector('.attachment-card')).toBeNull();
  });
  it('файл — иконка, имя и тип без размера и статуса', async () => {
    const { doc, manager } = setup();
    await manager.add([new File(['x'], 'проект-сайта.zip', { type: 'application/zip' })]);
    const tile = doc.querySelector('.attachment-tile.is-file')!;
    expect(tile.querySelector('strong')?.textContent).toBe('проект-сайта.zip');
    expect(tile.querySelector('small')?.textContent).toBe('ZIP');
    expect(tile.textContent).not.toMatch(/KB|готово|MB/);
  });
  it('«Убрать» удаляет вложение', async () => {
    const { doc, manager } = setup();
    await manager.add([new File(['x'], 'a.png', { type: 'image/png' })]);
    (doc.querySelector('.attachment-tile-remove') as unknown as HTMLElement).click();
    expect(manager.count()).toBe(0);
    expect(doc.querySelector('.attachment-tile')).toBeNull();
  });
});
