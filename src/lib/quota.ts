import type { Env } from "../types";
import { log } from "./resilience";

export function positiveLimit(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  // Explicit zero means "block this budget". Invalid configured values fail
  // closed instead of silently restoring the permissive fallback.
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

/** One SQL statement reserves a fixed-window quota, including concurrent requests. */
export async function reserveQuota(env: Env, scope: string, cost: number, limit: number) {
  const bucket = Math.floor(Date.now() / 3_600_000);
  const resetAt = (bucket + 1) * 3_600_000;
  if (!Number.isSafeInteger(cost) || cost <= 0 || cost > limit) {
    return { allowed: false, used: 0, limit, resetAt };
  }
  try {
    const row = await env.AZRAIL_D1.prepare(`
      INSERT INTO request_quotas (scope, bucket, used) VALUES (?, ?, ?)
      ON CONFLICT(scope, bucket) DO UPDATE SET used = used + excluded.used
      WHERE used + excluded.used <= ? RETURNING used
    `).bind(scope, bucket, cost, limit).first<{ used: number }>();
    if (row) return { allowed: true, used: row.used, limit, resetAt };
    const current = await env.AZRAIL_D1.prepare(
      "SELECT used FROM request_quotas WHERE scope = ? AND bucket = ?",
    ).bind(scope, bucket).first<{ used: number }>();
    return { allowed: false, used: current?.used ?? limit, limit, resetAt };
  } catch (err) {
    log("error", "quota.unavailable", { scope, error: err instanceof Error ? err.message : String(err) });
    return { allowed: false, used: 0, limit, resetAt };
  }
}

/** UTC day window for Chat soft-cap. Scope is prefixed so hourly GC does not wipe it. */
export async function reserveDailyQuota(env: Env, scope: string, cost = 1, limit = 200) {
  const dayScope = `chat-daily:${scope}`;
  const bucket = Math.floor(Date.now() / 86_400_000);
  const resetAt = (bucket + 1) * 86_400_000;
  if (!Number.isSafeInteger(cost) || cost <= 0 || cost > limit) {
    return { allowed: false, used: 0, limit, resetAt };
  }
  try {
    const row = await env.AZRAIL_D1.prepare(`
      INSERT INTO request_quotas (scope, bucket, used) VALUES (?, ?, ?)
      ON CONFLICT(scope, bucket) DO UPDATE SET used = used + excluded.used
      WHERE used + excluded.used <= ? RETURNING used
    `).bind(dayScope, bucket, cost, limit).first<{ used: number }>();
    if (row) return { allowed: true, used: row.used, limit, resetAt };
    const current = await env.AZRAIL_D1.prepare(
      "SELECT used FROM request_quotas WHERE scope = ? AND bucket = ?",
    ).bind(dayScope, bucket).first<{ used: number }>();
    return { allowed: false, used: current?.used ?? limit, limit, resetAt };
  } catch (err) {
    log("error", "quota.unavailable", { scope: dayScope, error: err instanceof Error ? err.message : String(err) });
    return { allowed: false, used: 0, limit, resetAt };
  }
}

/** Чтение дневного чата без списания. null — цифра сейчас неизвестна. */
export async function readDailyQuota(env: Env, scope: string, limit: number) {
  const dayScope = `chat-daily:${scope}`;
  const bucket = Math.floor(Date.now() / 86_400_000);
  try {
    const current = await env.AZRAIL_D1.prepare(
      "SELECT used FROM request_quotas WHERE scope = ? AND bucket = ?",
    ).bind(dayScope, bucket).first<{ used: number }>();
    const used = current?.used ?? 0;
    return { used, limit, left: Math.max(0, limit - used) };
  } catch {
    return null;
  }
}

/** Чтение дневной генерации без списания. null — цифра сейчас неизвестна. */
export async function readGenerationBudget(env: Env) {
  const limit = positiveLimit(env.DAILY_PROVIDER_CALLS, 500);
  const scope = `platform:${new Date().toISOString().slice(0, 10)}`;
  try {
    const row = await env.AZRAIL_D1.prepare(
      "SELECT committed_units, limit_units FROM resource_budgets WHERE scope = ? AND unit = 'request'",
    ).bind(scope).first<{ committed_units: number; limit_units: number }>();
    if (!row) return { used: 0, limit, left: limit };
    const used = Number(row.committed_units ?? 0);
    const cap = Number(row.limit_units ?? limit);
    return { used, limit: cap, left: Math.max(0, cap - used) };
  } catch {
    return null;
  }
}

export async function cleanupSecurityState(env: Env): Promise<void> {
  const now = Date.now();
  await env.AZRAIL_D1.batch([
    // Admission records include uncertain effects and successful replay bodies.
    // Deleting them on a timer permits the same request to spend twice.
    env.AZRAIL_D1.prepare(`DELETE FROM request_quotas WHERE
      (scope NOT LIKE 'chat-daily:%' AND bucket < ?)
      OR (scope LIKE 'chat-daily:%' AND bucket < ?)`)
      .bind(Math.floor(now / 3_600_000) - 1, Math.floor(now / 86_400_000) - 2),
    env.AZRAIL_D1.prepare("DELETE FROM websocket_tickets WHERE expires_at <= ?").bind(now),
    env.AZRAIL_D1.prepare("DELETE FROM web_sessions WHERE expires_at <= ?").bind(now),
    env.AZRAIL_D1.prepare("DELETE FROM oidc_states WHERE expires_at <= ?").bind(now),
    env.AZRAIL_D1.prepare("DELETE FROM connector_oauth_states WHERE expires_at <= ?").bind(now),
  ]);
}
