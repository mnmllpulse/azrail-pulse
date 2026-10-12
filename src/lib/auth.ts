// AZRAIL — защита платных эндпоинтов.
//
// Причина существования: Worker получает публичный URL. Без проверки любой,
// кто узнает адрес, запускает Nemotron 120B за твой счёт. Это не гипотетика —
// это стоимость на счёте Cloudflare.
//
// Принцип FAIL-CLOSED: если секрет AZRAIL_TOKEN не задан, эндпоинты НЕ
// работают. Альтернатива (пускать всех, пока не настроено) означала бы, что
// забытая настройка = открытый кошелёк. Лучше явная ошибка при старте.

import type { Env } from "../types";
import { positiveLimit, reserveQuota } from "./quota";

export interface AuthResult {
  ok: boolean;
  /** Причина отказа — уже готова к отдаче пользователю */
  status?: number;
  error?: string;
  /** Идентификатор вызывающего для счётчика лимита */
  caller?: string;
}

/** Сравнение, не зависящее от позиции первого различия. Обычное === на
 *  строках выходит раньше при первом несовпавшем символе, что теоретически
 *  позволяет подбирать токен по времени ответа. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkAuth(request: Request, env: Env): AuthResult {
  if (!env.AZRAIL_TOKEN) {
    return {
      ok: false,
      status: 503,
      error:
        "Авторизация не настроена. Задай секрет: wrangler secret put AZRAIL_TOKEN " +
        "(или Dashboard → Worker → Settings → Variables → Add secret). " +
        "До этого платные эндпоинты закрыты намеренно.",
    };
  }

  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return { ok: false, status: 401, error: "Нужен заголовок Authorization: Bearer <токен>." };
  }
  if (!safeEqual(token, env.AZRAIL_TOKEN)) {
    return { ok: false, status: 401, error: "Неверный токен." };
  }

  // Пока один общий токен — идентификатор вызывающего один. Когда появятся
  // пользователи, сюда придёт их id, и лимит станет персональным.
  return { ok: true, caller: "shared" };
}

/** Atomic model-call reservations; unavailable storage fails closed. */
export async function checkRateLimit(env: Env, caller: string, cost = 1) {
  return reserveQuota(env, `models:${caller}`, cost, positiveLimit(env.AZRAIL_HOURLY_LIMIT, 50));
}
