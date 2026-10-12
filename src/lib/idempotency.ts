// AZRAIL — ключи идемпотентности.
//
// Зачем: миссия стоит моделей и записей. Повторный POST — дрогнула связь на
// мобильном интернете, пользователь нажал дважды, клиент сам переотправил —
// запускал ВТОРУЮ миссию с тем же текстом и вторым расходом. Узнать об этом
// можно было только по счёту и по двум одинаковым строкам в списке.
//
// Хранится в KV, а не в D1: запись дешевле, а точность здесь не критична —
// худший исход при потере ключа — ровно то поведение, что было раньше.

import type { Env } from "../types";
import { log } from "./resilience";

/** Сутки: дольше повтор того же запроса — уже осознанное намерение
 *  запустить заново, а не дрогнувшая связь. */
export const IDEMPOTENCY_TTL_SECONDS = 86_400;

const keyFor = (scope: string, key: string) => `idem:${scope}:${key}`;

/** Ответ, сохранённый под ключом. */
export interface StoredResponse {
  missionId: string;
  createdAt: string;
}

export async function lookup(env: Env, scope: string, key: string): Promise<StoredResponse | null> {
  if (!key) return null;
  try {
    const raw = await env.AZRAIL_KV.get(keyFor(scope, key));
    return raw ? (JSON.parse(raw) as StoredResponse) : null;
  } catch (err) {
    // Недоступный KV не должен мешать запустить работу: отсутствие защиты
    // от дубля хуже, чем невозможность работать вовсе.
    log("warn", "idempotency.lookup_failed", {
      scope,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function remember(env: Env, scope: string, key: string, missionId: string): Promise<void> {
  if (!key) return;
  try {
    await env.AZRAIL_KV.put(
      keyFor(scope, key),
      JSON.stringify({ missionId, createdAt: new Date().toISOString() } satisfies StoredResponse),
      { expirationTtl: IDEMPOTENCY_TTL_SECONDS },
    );
  } catch (err) {
    log("warn", "idempotency.store_failed", {
      scope,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Ключ из заголовка. Пустой и слишком длинный отбрасываются: ключ приходит
 * снаружи и попадает в имя записи KV — принимать его без границ значит
 * позволить чужому забить пространство имён.
 */
export function readKey(request: Request): string {
  const raw = (request.headers.get("Idempotency-Key") ?? "").trim();
  if (!raw || raw.length > 200) return "";
  return /^[A-Za-z0-9._:-]+$/.test(raw) ? raw : "";
}
