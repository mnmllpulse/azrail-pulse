import { describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { accountPicture, avatarFromClaims } from '../src/unified/oidc';
import { attachmentImage, splitAttachments } from '../ui/attachment-chip';
import type { Env } from '../src/types';

const kv = (data: Record<string, string>) => ({ get: async (k: string) => data[k] ?? null }) as unknown as Env['AZRAIL_KV'];
const GOOD = 'https://lh3.googleusercontent.com/a/abc=s96-c';

describe('аватар из OIDC', () => {
  it('принимает только https-адреса googleusercontent', () => {
    expect(avatarFromClaims({ picture: GOOD })).toBe(GOOD);
    expect(avatarFromClaims({ picture: 'http://lh3.googleusercontent.com/a' })).toBe('');
    expect(avatarFromClaims({ picture: 'https://evil.example/pixel.png' })).toBe('');
    expect(avatarFromClaims({ picture: 'https://lh3.googleusercontent.com/a"onerror=1' })).toBe('');
    expect(avatarFromClaims({})).toBe('');
  });
  it('чтение из KV устойчиво к отсутствию и ошибкам', async () => {
    expect(await accountPicture({ AZRAIL_KV: kv({ 'avatar:u': GOOD }) } as Env, 'u')).toBe(GOOD);
    expect(await accountPicture({ AZRAIL_KV: kv({}) } as Env, 'u')).toBe('');
    expect(await accountPicture({} as Env, 'u')).toBe('');
    expect(await accountPicture({ AZRAIL_KV: { get: async () => { throw new Error('x'); } } } as unknown as Env, 'u')).toBe('');
    expect(await accountPicture({ AZRAIL_KV: kv({ 'avatar:u': 'https://evil.example/x' }) } as Env, 'u')).toBe('');
  });
  it('CSP разрешает картинки Google, статус отдаёт picture', () => {
    expect(readFileSync('src/unified/entry.ts', 'utf8')).toContain('img-src \'self\' blob: data: https://*.googleusercontent.com;');
    expect(readFileSync('src/unified/oidc.ts', 'utf8')).toContain('picture?{...account,picture}:account');
  });
});

describe('картинка в сообщении', () => {
  it('изображение выводится миниатюрой без подписи', () => {
    const win = new Window();
    const { files } = splitAttachments('текст\n\n![shot.png](/api/studio/artifacts/abc123)');
    const node = attachmentImage(win.document as unknown as Document, files[0]);
    expect(node.querySelector('img')?.getAttribute('src')).toBe('/api/studio/artifacts/abc123');
    expect(node.textContent).toBe('');
    expect(node.querySelector('img')?.getAttribute('alt')).toBe('');
    win.close();
  });
  it('чат рисует миниатюры отдельно от файловых чипов', () => {
    const src = readFileSync('ui/chat-history.ts', 'utf8');
    expect(src).toContain("className='message-images'");
    expect(src).toContain('f.image&&f.url');
  });
});

describe('сайдбар', () => {
  it('надпись про синхронизацию удалена', () => {
    expect(readFileSync('ui/app.html', 'utf8')).not.toContain('Чаты синхронизируются между устройствами');
  });
});
