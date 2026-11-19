import type { Env } from '../types';

const MAX_BYTES = 120_000;
const TTL = 365 * 86400;
const key = (id: string) => `avatar-img:${id}`;
type Stored = { t: number; type: string; data: string };

export function imageType(bytes: Uint8Array): string {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return '';
}

const toBase64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromBase64 = (data: string) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

async function read(env: Env, id: string): Promise<Stored | null> {
  try { const raw = await env.AZRAIL_KV?.get(key(id)); return raw ? (JSON.parse(raw) as Stored) : null; } catch { return null; }
}

/** Адрес собственного фото профиля (с версией для сброса кэша) или пустая строка. */
export async function customAvatarUrl(env: Env, id: string): Promise<string> {
  const stored = await read(env, id);
  return stored ? `/auth/avatar?v=${stored.t}` : '';
}

export async function avatarRoute(request: Request, env: Env, accountId: string | undefined, origin: string): Promise<Response | null> {
  const json = (data: unknown, status: number) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!accountId) return json({ error: 'Требуется вход.' }, 401);
  if (request.method === 'GET') {
    const stored = await read(env, accountId);
    if (!stored) return json({ error: 'Фото не задано.' }, 404);
    return new Response(fromBase64(stored.data), { headers: { 'Content-Type': stored.type, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (request.headers.get('Origin') !== origin) return json({ error: 'Origin mismatch' }, 403);
  if (request.method === 'DELETE') {
    await env.AZRAIL_KV.delete(key(accountId));
    return new Response(null, { status: 204 });
  }
  if (request.method === 'POST') {
    const declared = Number(request.headers.get('Content-Length') ?? 0);
    if (declared > MAX_BYTES) return json({ error: 'Фото слишком большое (максимум 120 КБ после сжатия).' }, 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return json({ error: 'Фото слишком большое (максимум 120 КБ после сжатия).' }, 413);
    const type = imageType(bytes);
    if (!type) return json({ error: 'Нужен файл JPEG, PNG или WebP.' }, 415);
    const t = Date.now();
    await env.AZRAIL_KV.put(key(accountId), JSON.stringify({ t, type, data: toBase64(bytes) } satisfies Stored), { expirationTtl: TTL });
    return json({ picture: `/auth/avatar?v=${t}` }, 201);
  }
  return json({ error: 'Method not allowed' }, 405);
}
