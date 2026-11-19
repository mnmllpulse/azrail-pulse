import type { Env } from "../types";
import { MODEL_REGISTRY } from "./model-registry";
import { OPENROUTER_PREFIX, isOpenRouterSlug } from "./openrouter";

const KEY = "openrouter:live";
const FRESH_MS = 6 * 3600_000;
const MIN_FREE = 3;

export interface OpenRouterSync {
  checkedAt: number;
  total: number;
  added: string[];
  gone: string[];
}
type Cache = { t: number; ids: string[] };

const isFreeId = (id: string) =>
  id === "openrouter/free" || id.endsWith(":free");
const registered = () =>
  MODEL_REGISTRY.filter((m) => isOpenRouterSlug(m.slug)).map((m) =>
    m.slug.slice(OPENROUTER_PREFIX.length),
  );

export function summarize(ids: string[], t: number): OpenRouterSync {
  const live = new Set(ids);
  const known = new Set(registered());
  return {
    checkedAt: t,
    total: ids.length,
    added: ids.filter((id) => !known.has(id)).sort(),
    gone: [...known].filter((id) => !live.has(id)).sort(),
  };
}

export async function fetchFreeIds(
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const response = await fetcher("https://openrouter.ai/api/v1/models", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`OpenRouter каталог: HTTP ${response.status}`);
  const body = (await response.json()) as { data?: Array<{ id?: unknown }> };
  const ids = (body.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && isFreeId(id));
  if (ids.length < MIN_FREE)
    throw new Error(
      "OpenRouter каталог: подозрительно мало бесплатных моделей, список не обновлён.",
    );
  return [...new Set(ids)];
}

async function readCache(env: Env): Promise<Cache | null> {
  try {
    const raw = await env.AZRAIL_KV?.get(KEY);
    const data = raw ? (JSON.parse(raw) as Cache) : null;
    return data && Array.isArray(data.ids) && typeof data.t === "number"
      ? data
      : null;
  } catch {
    return null;
  }
}

export async function openRouterStatus(
  env: Env,
): Promise<OpenRouterSync | null> {
  const cache = await readCache(env);
  return cache ? summarize(cache.ids, cache.t) : null;
}

/** Модели из реестра, которых больше нет в бесплатном каталоге OpenRouter. Пусто, пока каталог не сверялся. */
export async function openRouterGone(env: Env): Promise<Set<string>> {
  const status = await openRouterStatus(env);
  return new Set((status?.gone ?? []).map((id) => OPENROUTER_PREFIX + id));
}

export async function syncOpenRouter(
  env: Env,
  opts: { force?: boolean; fetcher?: typeof fetch } = {},
): Promise<OpenRouterSync> {
  const cache = await readCache(env);
  if (cache && !opts.force && Date.now() - cache.t < FRESH_MS)
    return summarize(cache.ids, cache.t);
  const ids = await fetchFreeIds(opts.fetcher);
  const t = Date.now();
  await env.AZRAIL_KV.put(KEY, JSON.stringify({ t, ids } satisfies Cache), {
    expirationTtl: 30 * 86400,
  });
  return summarize(ids, t);
}
