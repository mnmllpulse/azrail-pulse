import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { runModel } from "../src/lib/model-router";
import { DEEPSEEK_FLASH, dailyNeuronCap, neuronAllowedFor, neuronUpperBound, neuronsFor } from "../src/lib/neuron-paid";
import { FREE_MODEL_SLUGS } from "../src/lib/model-policy";
import type { Env } from "../src/types";

// Тесты описывают поведение до отключения моделей Cloudflare (2026-11-20): дата зафиксирована.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

function fixture(extra: Partial<Env> = {}, usage = { prompt_tokens: 2, completion_tokens: 1 }) {
  const { db, sqlite } = sqliteD1();
  const run = vi.fn(async () => ({ response: "ответ", usage }));
  const env = {
    AZRAIL_D1: db, AI: { run }, AZRAIL_WORKERS_PLAN: "paid", AZRAIL_FORCE_FREE: "false", AZRAIL_DAILY_NEURONS: "6000",
    AZRAIL_KV: { get: async () => null, put: async () => {}, delete: async () => {} }, ...extra,
  } as unknown as Env;
  const used = () => sqlite.prepare("SELECT committed_units AS c, limit_units AS l FROM resource_budgets WHERE unit='neuron'").get() as { c: number; l: number } | undefined;
  return { env, run, used, sqlite };
}
const slugOf = (run: ReturnType<typeof vi.fn>, n = 0) => String((run.mock.calls[n] as unknown[])[0]);

describe("счётчик нейронов", () => {
  it("тяжёлый вопрос идёт на платную модель и списывает фактические нейроны", async () => {
    const { env, run, used } = fixture();
    const result = await runModel(env, "answer", { messages: [{ role: "user", content: "x" }] }, { complexity: "heavy" });
    expect(result.model).toBe(DEEPSEEK_FLASH);
    expect(used()?.c).toBe(neuronsFor(DEEPSEEK_FLASH, { promptTokens: 2, completionTokens: 1, totalTokens: 3 }));
    expect(slugOf(run)).toBe(DEEPSEEK_FLASH);
  });

  it("мелкий вопрос остаётся на бесплатных моделях", async () => {
    const { env, run, used } = fixture();
    await runModel(env, "answer", { messages: [] }, { complexity: "trivial" });
    expect(FREE_MODEL_SLUGS.has(slugOf(run))).toBe(true);
    expect(used()).toBeUndefined();
  });

  it("тяжёлый вопрос начинает с deepseek-v4.1-flash", async () => {
    const { env } = fixture();
    expect((await runModel(env, "answer", { messages: [] }, { complexity: "heavy" })).model).toBe(DEEPSEEK_FLASH);
  });

  it("обычный код остаётся на бесплатных моделях", async () => {
    const { env, used } = fixture();
    const result = await runModel(env, "generate_code", { messages: [] }, { complexity: "normal" });
    expect(FREE_MODEL_SLUGS.has(result.model)).toBe(true);
    expect(used()).toBeUndefined();
  });

  it("исчерпанный потолок уводит ответ на бесплатную модель, а не роняет его", async () => {
    const { env, run } = fixture({ AZRAIL_DAILY_NEURONS: "0" });
    const result = await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    expect(FREE_MODEL_SLUGS.has(result.model)).toBe(true);
    expect(run.mock.calls.every((call) => FREE_MODEL_SLUGS.has(String((call as unknown[])[0])))).toBe(true);
  });

  it("потолок действует суммарно: после расхода платные модели закрываются", async () => {
    const { env, used } = fixture({ AZRAIL_DAILY_NEURONS: "600" }, { prompt_tokens: 1000, completion_tokens: 1000 });
    const first = await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    expect(first.model).toBe(DEEPSEEK_FLASH);
    const spent = used()!.c;
    expect(spent).toBeGreaterThan(0);
    expect(spent).toBeLessThanOrEqual(600);
    let model = DEEPSEEK_FLASH;
    for (let i = 0; i < 12 && model === DEEPSEEK_FLASH; i++) model = (await runModel(env, "answer", { messages: [] }, { complexity: "heavy" })).model;
    expect(FREE_MODEL_SLUGS.has(model)).toBe(true);
    expect(used()!.c).toBeLessThanOrEqual(600);
  });

  it("ошибка провайдера освобождает резерв", async () => {
    const { env, run, used } = fixture();
    run.mockImplementation((async (slug: string) => {
      if (slug === DEEPSEEK_FLASH) throw new Error("upstream 500");
      return { response: "ответ", usage: { prompt_tokens: 2, completion_tokens: 1 } };
    }) as never);
    const result = await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    expect(FREE_MODEL_SLUGS.has(result.model)).toBe(true);
    expect(used()?.c).toBe(0);
  });

  it("отказ по лимиту нейронов пишется как cancelled, а не uncertain", async () => {
    const { env, sqlite } = fixture({ AZRAIL_DAILY_NEURONS: "10", AZRAIL_METERING: "observe" } as Partial<Env>);
    const big = "я".repeat(50_000);
    const result = await runModel(env, "answer", { messages: [{ role: "user", content: big }] }, { complexity: "heavy" });
    expect(FREE_MODEL_SLUGS.has(result.model)).toBe(true);
    const rows = sqlite.prepare("SELECT status, COUNT(*) AS n FROM model_calls GROUP BY status").all() as Array<{ status: string; n: number }>;
    expect(rows.find((row) => row.status === "uncertain")).toBeUndefined();
    expect(rows.find((row) => row.status === "cancelled")?.n).toBeGreaterThan(0);
  });

  it("недооценка закрывает платные модели на остаток дня", async () => {
    const { env, used } = fixture({}, { prompt_tokens: 10, completion_tokens: 50_000_000 });
    await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    const next = await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    expect(used()?.l).toBe(0);
    expect(FREE_MODEL_SLUGS.has(next.model)).toBe(true);
  });

  it("без Workers Paid платные модели недоступны", async () => {
    const { env, run } = fixture({ AZRAIL_FORCE_FREE: "true" });
    const result = await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    expect(FREE_MODEL_SLUGS.has(result.model)).toBe(true);
    expect(run.mock.calls.every((call) => FREE_MODEL_SLUGS.has(String((call as unknown[])[0])))).toBe(true);
  });

  it("закреплённая платная модель тоже идёт через счётчик", async () => {
    const { env, used } = fixture();
    const result = await runModel(env, "chat", { messages: [] }, { preferredModel: DEEPSEEK_FLASH });
    expect(result.model).toBe(DEEPSEEK_FLASH);
    expect(used()?.c).toBeGreaterThanOrEqual(0);
  });

  it("три остальные модели семёрки по-прежнему закрыты", async () => {
    const { env, run } = fixture();
    for (const slug of ["@cf/moonshotai/kimi-k2.6", "@cf/zai-org/glm-5.2", "@cf/deepseek-ai/deepseek-v4-pro-0813"]) {
      await expect(runModel(env, "chat", { messages: [] }, { preferredModel: slug })).rejects.toThrow();
    }
    expect(run).not.toHaveBeenCalled();
  });
});

describe("расчёт нейронов", () => {
  it("верхняя граница не меньше факта при тех же токенах", () => {
    const upper = neuronUpperBound(DEEPSEEK_FLASH, 4000, 2500);
    expect(upper).toBeGreaterThanOrEqual(neuronsFor(DEEPSEEK_FLASH, { promptTokens: 4000, completionTokens: 2500, totalTokens: 6500 }));
  });
  it("потолок: значение по умолчанию, разумное и некорректное", () => {
    expect(dailyNeuronCap(undefined)).toBe(6000);
    expect(dailyNeuronCap("8000")).toBe(8000);
    expect(dailyNeuronCap("10001")).toBe(0);
    expect(dailyNeuronCap("abc")).toBe(0);
    expect(dailyNeuronCap("-5")).toBe(0);
  });
  it("мелкие и обычные задачи не получают платных моделей", () => {
    expect(neuronAllowedFor("answer", "trivial").size).toBe(0);
    expect(neuronAllowedFor("answer", "normal").size).toBe(0);
    expect([...neuronAllowedFor("answer", "heavy")]).toEqual([DEEPSEEK_FLASH]);
  });
});
