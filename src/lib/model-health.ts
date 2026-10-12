// AZRAIL — память о недоступности моделей.
//
// Задача: не тратить попытку на модель, которая только что отказала по
// исчерпанному лимиту. Без этого каждый следующий запрос заново упирается
// в ту же стену, теряя секунды на таймаут перед переходом к запасной.
//
// Хранится в KV с TTL, поэтому запись исчезает сама — чистить нечего, и
// «застрять» в состоянии недоступности модель не может даже при сбое.
//
// Чего здесь НЕТ: статистики качества, задержек и стоимости. Это уже
// собирает AI Gateway, и точнее. Здесь только один факт с коротким сроком
// жизни — «эта модель прямо сейчас отвечает отказом по квоте».

import type { Env } from "../types";
import { log } from "./resilience";

/** Сколько ждать, если провайдер не сказал точнее. Пять минут — компромисс:
 *  достаточно, чтобы не долбить исчерпанную квоту, и достаточно мало,
 *  чтобы восстановившаяся модель вернулась в строй без вмешательства. */
const DEFAULT_COOLDOWN_SEC = 300;

/** Верхняя граница на случай, если провайдер пришлёт абсурдный Retry-After.
 *  Сутки без сильной модели из-за одного странного заголовка — хуже, чем
 *  лишняя неудачная попытка. */
const MAX_COOLDOWN_SEC = 3600;

const key = (slug: string) => `model_cooldown:${slug}`;

/**
 * Распознаёт, что ошибка — про исчерпанный лимит, а не про что-то другое.
 *
 * Важно отделять: сетевую икоту лечит повтор той же модели, а квоту —
 * только переход на другую. Спутать эти случаи значит либо зря
 * отстранить рабочую модель, либо биться в закрытую дверь.
 *
 * Шаблоны намеренно узкие. Первая версия искала голые подстроки, и на
 * проверке нашлись два ложных срабатывания: `insufficient permissions`
 * (ошибка ДОСТУПА, а не квоты) и `capacity planning`. Каждое отстранило бы
 * работающую модель на пять минут — то есть защита от исчерпанной квоты
 * сама создавала бы недоступность там, где её нет.
 */
export function isQuotaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    /\b429\b/.test(msg) ||
    /rate[ _-]?limit/.test(msg) ||
    /\bquota\b/.test(msg) ||
    // "insufficient" только вместе со словом про ресурс: одинокое
    // "insufficient permissions" — это про доступ.
    /insufficient\s+(credit|balance|fund|quota|token|capacity)/.test(msg) ||
    /out of (credit|quota|token|capacity)/.test(msg) ||
    /credits?\s+(exhausted|depleted|expired)/.test(msg) ||
    // "capacity" только в явно перегрузочных оборотах.
    /(over|at|exceeded)\s+capacity|capacity\s+exceeded/.test(msg) ||
    /too many requests/.test(msg)
  );
}

/** Вытаскивает Retry-After из текста ошибки, если провайдер его прислал.
 *
 *  Разделитель между словами может быть любым: заголовок пишется как
 *  `Retry-After`, а в JSON-теле ответа — как `retry_after`. Первая версия
 *  учитывала только дефис и пробел и молча пропускала самую частую форму,
 *  из-за чего вместо точного времени всегда бралось значение по умолчанию. */
export function parseRetryAfter(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /retry[-_ ]?after["'\s:]+(\d+)/i.exec(msg);
  if (!m) return null;
  const sec = Number(m[1]);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.min(sec, MAX_COOLDOWN_SEC);
}

/** Отмечает модель как временно недоступную. */
export async function markExhausted(env: Env, slug: string, err: unknown): Promise<void> {
  const seconds = parseRetryAfter(err) ?? DEFAULT_COOLDOWN_SEC;
  try {
    await env.AZRAIL_KV.put(key(slug), String(Date.now() + seconds * 1000), {
      expirationTtl: Math.max(60, seconds),
    });
    log("warn", "model.exhausted", { model: slug, cooldownSec: seconds });
  } catch (kvErr) {
    // Отметку записать не вышло — маршрутизация продолжит работать, просто
    // без памяти. Молчать нельзя: иначе непонятно, почему модель, которая
    // явно отказывает, каждый раз снова оказывается первой в очереди.
    log("error", "model.cooldown_write_failed", {
      model: slug,
      error: kvErr instanceof Error ? kvErr.message : String(kvErr),
    });
  }
}

/** Сколько секунд модели ещё осталось быть недоступной. 0 — доступна. */
export async function cooldownRemaining(env: Env, slug: string): Promise<number> {
  try {
    const raw = await env.AZRAIL_KV.get(key(slug));
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    // KV недоступен — считаем модель доступной. Ошибиться в эту сторону
    // безопаснее: худшее, что случится, — одна лишняя неудачная попытка.
    // Обратная ошибка отстранила бы рабочие модели без причины.
    return 0;
  }
}

/** Снимает отметку — например, после успешного ответа модели. */
export async function clearExhausted(env: Env, slug: string): Promise<void> {
  try {
    await env.AZRAIL_KV.delete(key(slug));
  } catch {
    // Не критично: запись всё равно исчезнет по TTL.
  }
}
