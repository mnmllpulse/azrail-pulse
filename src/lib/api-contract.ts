import { z } from "zod";

export const musicGenerateInput = z.object({
  prompt: z.string().trim().min(20, "Бриф для генератора должен быть от 20 до 4000 знаков.").max(4000, "Бриф для генератора должен быть от 20 до 4000 знаков."),
  instrumental: z.boolean().optional(),
  accountId: z.string().trim().max(128).optional(),
});

export type ApiEndpoint = {
  method: "GET" | "POST";
  path: string;
  auth: "session";
  authorization: string;
  rateLimit: string;
  idempotency: string;
  timeoutMs: number;
  errors: string[];
  audit: string;
  request: string;
  response: string;
};

/** Versioned cards for routes that already enforce the fields below. The rest of /api stays uncarded. */
export const API_CONTRACT: readonly ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/v1/studio/contract",
    auth: "session",
    authorization: "любая роль вошедшего аккаунта",
    rateLimit: "отдельного потолка метода нет",
    idempotency: "чтение",
    timeoutMs: 10000,
    errors: ["401", "503"],
    audit: "нет отдельного события",
    request: "пусто",
    response: "version и список карточек",
  },
  {
    method: "POST",
    path: "/api/v1/studio/music/generate",
    auth: "session",
    authorization: "не viewer",
    rateLimit: "20 генераций аккаунта в час и дневной лимит провайдера",
    idempotency: "ключ аккаунт + бриф + instrumental в KV, повтор не шлёт второй платный запрос 15 минут",
    timeoutMs: 180000,
    errors: ["400", "401", "403", "409", "429", "502", "503"],
    audit: "нет отдельного события",
    request: "prompt 20..4000, instrumental необязателен",
    response: "provider, mime, audioBase64, reused, providerCalls",
  },
];

const REQUIRED: Array<keyof ApiEndpoint> = ["method", "path", "auth", "authorization", "rateLimit", "idempotency", "timeoutMs", "errors", "audit", "request", "response"];

export function assertApiContract(rows: readonly ApiEndpoint[] = API_CONTRACT) {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of REQUIRED) {
      const value = row[key];
      if (value === "" || value === undefined || value === null || (Array.isArray(value) && value.length === 0)) throw new Error(`пустая карточка ${row.method} ${row.path}: ${key}`);
    }
    if (!row.path.startsWith("/api/v1/")) throw new Error(`путь без версии: ${row.path}`);
    if (row.timeoutMs < 1000) throw new Error(`таймаут слишком мал: ${row.path}`);
    const id = `${row.method} ${row.path}`;
    if (seen.has(id)) throw new Error(`повтор карточки ${id}`);
    seen.add(id);
  }
}

/** /api/v1/studio/x and /api/studio/x are the same route. One slash of version is removed. */
export function unversionApiPath(pathname: string) {
  if (pathname === "/api/v1") return "/api";
  if (pathname.startsWith("/api/v1/")) return `/api/${pathname.slice("/api/v1/".length)}`;
  return pathname;
}
