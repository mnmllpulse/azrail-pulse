import { describe, expect, it, vi } from "vitest";
import { MODEL_REGISTRY } from "../src/lib/model-registry";
import { isOpenRouterSlug } from "../src/lib/openrouter";
import {
  fetchFreeIds,
  openRouterGone,
  openRouterStatus,
  summarize,
  syncOpenRouter,
} from "../src/lib/openrouter-sync";

const kv = () => {
  const m = new Map<string, string>();
  return {
    get: async (k: string) => m.get(k) ?? null,
    put: async (k: string, v: string) => void m.set(k, v),
    delete: async (k: string) => void m.delete(k),
  };
};
const env = () => ({ AZRAIL_KV: kv() }) as never;
const ids = MODEL_REGISTRY.filter((m) => isOpenRouterSlug(m.slug)).map((m) =>
  m.slug.slice("openrouter:".length),
);
const listing = (list: string[]) =>
  vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          data: [...list.map((id) => ({ id })), { id: "openai/paid-model" }],
        }),
        { status: 200 },
      ),
  );

describe("синхронизация OpenRouter", () => {
  it("в реестре 15 бесплатных моделей без дублей", () => {
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
  });
  it("берёт только бесплатные id", async () => {
    expect(await fetchFreeIds(listing(ids) as never)).toEqual(ids);
  });
  it("отдельно показывает новые и исчезнувшие модели", () => {
    const live = [...ids.slice(1), "new/model:free"];
    expect(summarize(live, 1)).toMatchObject({
      total: 15,
      added: ["new/model:free"],
      gone: [ids[0]],
    });
  });
  it("исчезнувшая модель попадает в gone, пока кэш не обновят", async () => {
    const e = env();
    expect((await openRouterGone(e)).size).toBe(0);
    await syncOpenRouter(e, {
      force: true,
      fetcher: listing(ids.slice(1)) as never,
    });
    expect([...(await openRouterGone(e))]).toEqual(["openrouter:" + ids[0]]);
    await syncOpenRouter(e, { force: true, fetcher: listing(ids) as never });
    expect((await openRouterGone(e)).size).toBe(0);
  });
  it("свежий кэш не дёргает сеть", async () => {
    const e = env();
    const f = listing(ids);
    await syncOpenRouter(e, { fetcher: f as never });
    await syncOpenRouter(e, { fetcher: f as never });
    expect(f).toHaveBeenCalledTimes(1);
    expect((await openRouterStatus(e))?.total).toBe(15);
  });
  it("подозрительно короткий список не затирает кэш", async () => {
    const e = env();
    await syncOpenRouter(e, { force: true, fetcher: listing(ids) as never });
    await expect(
      syncOpenRouter(e, { force: true, fetcher: listing(["a:free"]) as never }),
    ).rejects.toThrow("мало");
    expect((await openRouterStatus(e))?.total).toBe(15);
  });
});
