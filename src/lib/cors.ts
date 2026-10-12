import type { Env } from "../types";

function cleanOrigin(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw || raw === "*") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

/**
 * Fail-closed CORS policy.
 *
 * Legacy CORS_ORIGIN is accepted only when it is one exact HTTPS origin.
 * Wildcard values are ignored. Otherwise the first PUBLIC_ORIGINS entry is
 * used as the canonical browser origin. If no valid origin is configured,
 * browsers receive `null` instead of a permissive wildcard.
 */
export function corsOrigin(env: Env): string {
  const legacy = cleanOrigin(env.CORS_ORIGIN);
  if (legacy) return legacy;
  for (const candidate of (env.PUBLIC_ORIGINS ?? "").split(",")) {
    const origin = cleanOrigin(candidate);
    if (origin) return origin;
  }
  return "null";
}

export function getCors(env: Env, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Access-Control-Allow-Origin", corsOrigin(env));
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");
  headers.set("Vary", [headers.get("Vary"), "Origin"].filter(Boolean).join(", "));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Cache-Control", "no-store");
  return headers;
}
