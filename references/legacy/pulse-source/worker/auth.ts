import type { Env, Principal } from './types';
import { HttpError, body, text, json } from './http';
import { takeQuota } from './store';
const COOKIE = '__Host-pulse_session';
export async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
async function sameSecret(a: string, b: string) {
  const [aa, bb] = await Promise.all([hash(a), hash(b)]);
  let difference = 0; for (let i = 0; i < aa.length; i++) difference |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return difference === 0;
}
const sessionCookie = (value: string, age: number) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
export async function principal(request: Request, env: Env): Promise<Principal | null> {
  const raw = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw) || !env.OWNER_ACCESS_KEY) return null;
  const digest = await hash(raw);
  const row = await env.DB.prepare('SELECT owner_id, key_hash FROM pulse_sessions WHERE token_hash = ? AND expires_at > ?').bind(digest, Date.now()).first<{ owner_id: string; key_hash: string }>();
  if (!row || row.key_hash !== await hash(env.OWNER_ACCESS_KEY)) return null;
  return { id: row.owner_id, role: 'owner', sessionHash: digest };
}
export async function requireOwner(request: Request, env: Env) {
  const user = await principal(request, env);
  if (!user) throw new HttpError(401, 'login_required', 'Войдите в рабочее пространство.');
  return user;
}
export async function login(request: Request, env: Env) {
  if (!env.OWNER_ACCESS_KEY || env.OWNER_ACCESS_KEY.length < 32) throw new HttpError(503, 'auth_not_configured', 'Задайте OWNER_ACCESS_KEY длиной от 32 символов в секретах Cloudflare.');
  // Hash the IP before persistence; never log keys or session values.
  const ip = await hash(request.headers.get('CF-Connecting-IP') || 'local');
  await takeQuota(env, `login:${ip}`, 8, 15 * 60000);
  const input = await body(request, 4096);
  if (!await sameSecret(text(input.key, 'Ключ', 512), env.OWNER_ACCESS_KEY)) throw new HttpError(401, 'invalid_credentials', 'Неверный ключ доступа.');
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  await env.DB.prepare('INSERT INTO pulse_sessions(token_hash,owner_id,key_hash,expires_at) VALUES(?,?,?,?)')
    .bind(await hash(raw), 'owner', await hash(env.OWNER_ACCESS_KEY), Date.now() + 12 * 3600000).run();
  return json({ status: 'ok', user: { id: 'owner', role: 'owner' } }, 200, { 'Set-Cookie': sessionCookie(raw, 12 * 3600) });
}
export async function logout(request: Request, env: Env) {
  const user = await principal(request, env);
  if (user) await env.DB.prepare('DELETE FROM pulse_sessions WHERE token_hash = ?').bind(user.sessionHash).run();
  return json({ status: 'ok' }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}
