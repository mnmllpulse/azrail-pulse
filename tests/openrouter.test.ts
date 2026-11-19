import { describe, expect, it, vi } from "vitest";
import { modelBlockReason, catalogAvailability } from "../src/lib/model-policy";
import { MODEL_REGISTRY } from "../src/lib/model-registry";
import {
  isOpenRouterSlug,
  openRouterCall,
  openRouterModelId,
} from "../src/lib/openrouter";

const or = MODEL_REGISTRY.filter((m) => isOpenRouterSlug(m.slug));
const policy = {
  allowThirdPartyModels: false,
  monthlyBudgetUsd: 0,
  forceFree: true,
  ready: true,
  revision: 1,
};

describe("OpenRouter", () => {
  it("в реестре есть бесплатные модели :free и auto-роутер", () => {
    expect(or.length).toBeGreaterThanOrEqual(3);
    expect(or.every((m) => /^openrouter:.+(:free|\/free)$/.test(m.slug))).toBe(
      true,
    );
    expect(openRouterModelId("openrouter:a/b:free")).toBe("a/b:free");
  });
  it("без ключа модель заблокирована, с ключом доступна даже при выключенных платных", () => {
    expect(modelBlockReason(or[0], policy, {})).toBe("Нет ключа OpenRouter");
    expect(
      modelBlockReason(or[0], policy, { OPENROUTER_API_KEY: "k" }),
    ).toBeNull();
    expect(catalogAvailability(or[0].slug, {})).toBe("unavailable");
    expect(catalogAvailability(or[0].slug, { OPENROUTER_API_KEY: "k" })).toBe(
      "available",
    );
  });
  it("вызов шлёт ключ и id модели, возвращает choices", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200 },
        ),
    );
    const out = await openRouterCall(
      { OPENROUTER_API_KEY: " k ", PUBLIC_ORIGINS: "https://x.dev" },
      "openrouter:a/b:free",
      { messages: [{ role: "user", content: "hi" }], max_tokens: 50 },
      fetcher as never,
    );
    expect(out).toEqual({ choices: [{ message: { content: "ok" } }] });
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer k",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      model: "a/b:free",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 50,
    });
  });
  it("ошибка провайдера поднимается с текстом, без ключа — явная ошибка", async () => {
    const bad = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: "rate limited" } }), {
          status: 429,
        }),
    );
    await expect(
      openRouterCall(
        { OPENROUTER_API_KEY: "k" },
        "openrouter:a:free",
        { messages: [] },
        bad as never,
      ),
    ).rejects.toThrow("OpenRouter 429: rate limited");
    await expect(
      openRouterCall({}, "openrouter:a:free", { messages: [] }),
    ).rejects.toThrow("OPENROUTER_API_KEY");
  });
});
