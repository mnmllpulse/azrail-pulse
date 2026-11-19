import type { Env } from "../types";

export const OPENROUTER_PREFIX = "openrouter:";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const isOpenRouterSlug = (slug: string): boolean =>
  slug.startsWith(OPENROUTER_PREFIX);
export const openRouterModelId = (slug: string): string =>
  slug.slice(OPENROUTER_PREFIX.length);
export const hasOpenRouterKey = (
  env: Pick<Env, "OPENROUTER_API_KEY">,
): boolean => !!env.OPENROUTER_API_KEY?.trim();

export async function openRouterCall(
  env: Pick<Env, "OPENROUTER_API_KEY" | "PUBLIC_ORIGINS">,
  slug: string,
  input: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key)
    throw new Error("Ключ OpenRouter не задан (секрет OPENROUTER_API_KEY).");
  const { messages, max_tokens } = input as {
    messages?: unknown;
    max_tokens?: unknown;
  };
  if (!Array.isArray(messages))
    throw new Error("OpenRouter: нужен массив messages.");
  const referer = (env.PUBLIC_ORIGINS ?? "").split(",")[0]?.trim();
  const response = await fetcher(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "AZRAIL PULSE",
      ...(referer ? { "HTTP-Referer": referer } : {}),
    },
    body: JSON.stringify({
      model: openRouterModelId(slug),
      messages,
      ...(typeof max_tokens === "number" ? { max_tokens } : {}),
    }),
  });
  const text = await response.text();
  let data: { error?: { message?: string; code?: number | string } } & Record<
    string,
    unknown
  > = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* не JSON — ошибка ниже */
  }
  if (!response.ok || data.error) {
    const reason =
      data.error?.message || text.slice(0, 200) || response.statusText;
    throw new Error(`OpenRouter ${response.status}: ${reason}`);
  }
  return data;
}
