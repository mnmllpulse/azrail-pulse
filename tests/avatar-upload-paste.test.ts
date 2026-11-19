import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { avatarRoute, customAvatarUrl, imageType } from '../src/unified/avatar';
import type { Env } from '../src/types';

const store = new Map<string, string>();
const env = { AZRAIL_KV: { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => void store.set(k, v), delete: async (k: string) => void store.delete(k) } } as unknown as Env;
const ORIGIN = 'https://azrail.example';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const req = (method: string, body?: Uint8Array, origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}/auth/avatar`, { method, body: body as BodyInit | undefined, headers: origin ? { Origin: origin } : {} });

describe('собственное фото профиля', () => {
  it('распознаёт JPEG/PNG/WebP по сигнатуре и отвергает остальное', () => {
    expect(imageType(JPEG)).toBe('image/jpeg');
    expect(imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]))).toBe('image/png');
    expect(imageType(new TextEncoder().encode('RIFF....WEBPVP8 '))).toBe('image/webp');
    expect(imageType(new TextEncoder().encode('<svg onload=1>'))).toBe('');
  });
  it('без входа — 401', async () => {
    expect((await avatarRoute(req('GET'), env, undefined, ORIGIN))!.status).toBe(401);
  });
  it('загрузка, выдача, адрес с версией и удаление', async () => {
    const saved = await avatarRoute(req('POST', JPEG), env, 'u1', ORIGIN);
    expect(saved!.status).toBe(201);
    expect(((await saved!.json()) as { picture: string }).picture).toMatch(/^\/auth\/avatar\?v=\d+$/);
    expect(await customAvatarUrl(env, 'u1')).toMatch(/^\/auth\/avatar\?v=\d+$/);
    const got = await avatarRoute(req('GET'), env, 'u1', ORIGIN);
    expect(got!.headers.get('Content-Type')).toBe('image/jpeg');
    expect([...new Uint8Array(await got!.arrayBuffer())]).toEqual([...JPEG]);
    expect((await avatarRoute(req('DELETE'), env, 'u1', ORIGIN))!.status).toBe(204);
    expect(await customAvatarUrl(env, 'u1')).toBe('');
    expect((await avatarRoute(req('GET'), env, 'u1', ORIGIN))!.status).toBe(404);
  });
  it('защита: чужой Origin, не-картинка, слишком большой файл', async () => {
    expect((await avatarRoute(req('POST', JPEG, 'https://evil.example'), env, 'u1', ORIGIN))!.status).toBe(403);
    expect((await avatarRoute(req('POST', new TextEncoder().encode('<svg/>')), env, 'u1', ORIGIN))!.status).toBe(415);
    const big = new Uint8Array(130_000); big.set(JPEG);
    expect((await avatarRoute(req('POST', big), env, 'u1', ORIGIN))!.status).toBe(413);
  });
  it('статус отдаёт собственное фото раньше фото из OIDC', () => {
    expect(readFileSync('src/unified/oidc.ts', 'utf8')).toContain('(await customAvatarUrl(env,account.id))||await accountPicture(env,account.id)');
  });
});

describe('вставка и перетаскивание изображений', () => {
  const app = readFileSync('ui/app.ts', 'utf8');
  const manager = readFileSync('ui/attachment-manager.ts', 'utf8');
  it('Ctrl+V с картинкой добавляет вложение и переименовывает безымянный «image.png»', () => {
    expect(app).toContain("$('prompt').addEventListener('paste'");
    expect(app).toContain('скриншот-');
    expect(app).toContain('e.preventDefault();void attachmentManager.add(');
  });
  it('перетаскивание работает на всём композере и ленте чата', () => {
    expect(app).toContain("[$('composer'),$('chat-messages')]");
    expect(app).toContain("types.includes('Files')");
  });
  it('в композере картинка показана миниатюрой и ссылка освобождается', () => {
    expect(manager).toContain('URL.createObjectURL(item.file)');
    expect(manager).toContain('URL.revokeObjectURL(item.preview)');
    expect(manager).toContain('isImage(item.file)?thumb(item):icon');
  });
});
