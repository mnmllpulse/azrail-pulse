import type { Env } from "../types";

const key = (id: string) => `nick:${id}`;
const TTL = 5 * 365 * 86400;
const PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,30}[\p{L}\p{N}]$/u;

export function cleanNickname(value: unknown): string {
  const text =
    typeof value === "string"
      ? value.normalize("NFC").replace(/\s+/g, " ").trim()
      : "";
  return PATTERN.test(text) ? text : "";
}

export async function customNickname(env: Env, id: string): Promise<string> {
  try {
    return (await env.AZRAIL_KV?.get(key(id))) ?? "";
  } catch {
    return "";
  }
}

export async function nicknameRoute(
  request: Request,
  env: Env,
  accountId: string | undefined,
  origin: string,
): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (!accountId) return json({ error: "Требуется вход." }, 401);
  if (request.method === "GET")
    return json({ nickname: await customNickname(env, accountId) });
  if (request.headers.get("Origin") !== origin)
    return json({ error: "Origin mismatch" }, 403);
  if (request.method === "DELETE") {
    await env.AZRAIL_KV.delete(key(accountId));
    return new Response(null, { status: 204 });
  }
  if (request.method === "PUT") {
    const body = (await request.json().catch(() => ({}))) as {
      nickname?: unknown;
    };
    const nickname = cleanNickname(body.nickname);
    if (!nickname)
      return json(
        {
          error:
            "Ник: 3–32 символа, буквы, цифры, пробел, точка, дефис или подчёркивание.",
        },
        400,
      );
    await env.AZRAIL_KV.put(key(accountId), nickname, { expirationTtl: TTL });
    return json({ nickname });
  }
  return json({ error: "Method not allowed" }, 405);
}
