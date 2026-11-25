import type { Env } from "../types";

export class BrowserBudgetError extends Error {}

export type BrowserBudget = { plan: "free" | "paid"; unit: "day" | "month"; capSeconds: number; usedSeconds: number; remainingSeconds: number };

/** Запас ниже того, что Cloudflare включает в тариф: Free 10 минут в день, Paid 10 часов в месяц. */
const FREE_DAY_SECONDS = 9 * 60;
const PAID_MONTH_SECONDS = 9 * 3600;
const KEEP_SECONDS = 40 * 86400;

function plan(env: Pick<Env, "AZRAIL_WORKERS_PLAN" | "AZRAIL_FORCE_FREE">): "free" | "paid" {
  return env.AZRAIL_WORKERS_PLAN === "paid" && env.AZRAIL_FORCE_FREE !== "true" ? "paid" : "free";
}

function slot(env: Pick<Env, "AZRAIL_WORKERS_PLAN" | "AZRAIL_FORCE_FREE">, now: Date) {
  const iso = now.toISOString();
  return plan(env) === "paid"
    ? { key: `browser:month:${iso.slice(0, 7)}`, unit: "month" as const, cap: PAID_MONTH_SECONDS }
    : { key: `browser:day:${iso.slice(0, 10)}`, unit: "day" as const, cap: FREE_DAY_SECONDS };
}

async function used(env: Env, key: string): Promise<number> {
  const raw = await env.AZRAIL_KV.get(key);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function browserBudget(env: Env, now = new Date()): Promise<BrowserBudget> {
  const s = slot(env, now);
  const usedSeconds = await used(env, s.key);
  return { plan: plan(env), unit: s.unit, capSeconds: s.cap, usedSeconds, remainingSeconds: Math.max(0, s.cap - usedSeconds) };
}

/** Резервирует время до запуска браузера. Лимит жёсткий: сверх него браузер не открывается. */
export async function reserveBrowserSeconds(env: Env, seconds: number, now = new Date()): Promise<void> {
  const s = slot(env, now);
  const before = await used(env, s.key);
  if (before + seconds > s.cap) {
    throw new BrowserBudgetError(`Лимит браузера исчерпан (${s.unit === "day" ? "на сегодня" : "на этот месяц"}). Осталось ${Math.max(0, Math.floor(s.cap - before))} с.`);
  }
  await env.AZRAIL_KV.put(s.key, String(before + seconds), { expirationTtl: KEEP_SECONDS });
}

/** Заменяет резерв фактическим временем. Вызывается всегда, даже при ошибке. */
export async function settleBrowserSeconds(env: Env, reserved: number, actual: number, now = new Date()): Promise<void> {
  const s = slot(env, now);
  const current = await used(env, s.key);
  const next = Math.max(0, current - reserved + Math.min(reserved, Math.max(0, actual)));
  await env.AZRAIL_KV.put(s.key, String(Math.round(next * 10) / 10), { expirationTtl: KEEP_SECONDS });
}
