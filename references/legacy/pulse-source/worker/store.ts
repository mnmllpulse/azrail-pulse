import type { Env, ChatMessage } from './types';
import { HttpError } from './http';

export async function takeQuota(env: Env, key: string, limit: number, windowMs = 86400000) {
  if (limit <= 0) throw new HttpError(429, 'quota_exceeded', 'Запросы отключены лимитом.');
  const expires = (Math.floor(Date.now() / windowMs) + 1) * windowMs;
  const row = await env.DB.prepare(`INSERT INTO pulse_quotas(key, count, expires_at) VALUES(?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
    expires_at = excluded.expires_at WHERE expires_at <= ? OR count < ? RETURNING count`)
    .bind(key, expires, Date.now(), Date.now(), limit).first<{ count: number }>();
  if (!row) throw new HttpError(429, 'quota_exceeded', 'Лимит запросов исчерпан. Повторите после сброса лимита.');
  return row.count;
}
export function configuredLimit(value: string | undefined, fallback: number, max = 1000) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new HttpError(503, 'invalid_limit', 'Исправьте лимит запросов в настройках Worker.');
  return n;
}
export async function getSetting<T>(env: Env, key: string, fallback: T): Promise<T> {
  const row = await env.DB.prepare('SELECT value FROM pulse_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row ? JSON.parse(row.value) : fallback;
}
export async function setSetting(env: Env, key: string, value: unknown) {
  await env.DB.prepare('INSERT INTO pulse_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, JSON.stringify(value)).run();
}
export async function history(env: Env, owner: string, agent: string, limit = 20) {
  const { results } = await env.DB.prepare(`SELECT id, role, content, created_at AS timestamp FROM
    (SELECT * FROM pulse_messages WHERE owner_id = ? AND agent_id = ? ORDER BY seq DESC LIMIT ?)
    ORDER BY seq ASC`).bind(owner, agent, limit).all<ChatMessage & { id: string; timestamp: string }>();
  return results;
}
export async function addMessages(env: Env, owner: string, agent: string, messages: ChatMessage[]) {
  await env.DB.batch(messages.map(m => env.DB.prepare('INSERT INTO pulse_messages(id,owner_id,agent_id,role,content,created_at) VALUES(?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), owner, agent, m.role, m.content, new Date().toISOString())));
}
export async function audit(env: Env, action: string, details: Record<string, unknown> = {}) {
  await env.DB.prepare('INSERT INTO pulse_events(id,action,details,created_at) VALUES(?,?,?,?)')
    .bind(crypto.randomUUID(), action, JSON.stringify(details), new Date().toISOString()).run();
}
