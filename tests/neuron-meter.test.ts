import { describe, expect, it, vi } from "vitest";
import { sqliteD1 } from "./stubs/sqlite-d1";
import { runModel } from "../src/lib/model-router";
import { DEEPSEEK_FLASH, GLM_FLASH, KIMI_CODE, dailyNeuronCap, neuronAllowedFor, neuronUpperBound, neuronsFor } from "../src/lib/neuron-paid";
import { FREE_MODEL_SLUGS } from "../src/lib/model-policy";
import type { Env } from "../src/types";

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
  it("обычный вопрос идёт на glm-5.3-flash и списывает фактические нейроны", async () => {
    const { env, run, used } = fixture();
    const result = await runModel(env, "answer", { messages: [{ role: "user", content: "x" }] }, { complexity: "normal" });
    expect(result.model).toBe(GLM_FLASH);
    expect(used()?.c).toBe(neuronsFor(GLM_FLASH, { promptTokens: 2, completionTokens: 1, totalTokens: 3 }));
    expect(slugOf(run)).toBe(GLM_FLASH);
  });

  it("мелкий вопрос остаётся на бесплатных моделях", async () => {
    const { env, run, used } = fixture();
    await runModel(env, "answer", { messages: [] }, { complexity: "trivial" });
    expect(FREE_MODEL_SLUGS.has(slugOf(run))).toBe(true);
    expect(used()).toBeUndefined();
  });

  it("тяжёлый вопрос начинает с deepseek-v4-flash", async () => {
    const { env } = fixture();
    expect((await runModel(env, "answer", { messages: [] }, { complexity: "heavy" })).model).toBe(DEEPSEEK_FLASH);
  });

  it("код начинает с kimi-k2.7-code", async () => {
    const { env } = fixture();
    expect((await runModel(env, "generate_code", { messages: [] }, { complexity: "normal" })).model).toBe(KIMI_CODE);
  });

  it("исчерпанный потолок уводит ответ на бесплатную модель, а не роняет его", async () => {
    const { env, run } = fixture({ AZRAIL_DAILY_NEURONS: "0" });
    const result = await runModel(env, "answer", { messages: [] }, { complexity: "heavy" });
    expect(FREE_MODEL_SLUGS.has(result.model)).toBe(true);
    expect(run.mock.calls.every((call) => FREE_MODEL_SLUGS.has(String((call as unknown[])[0])))).toBe(true);
  });

  it("потолок действует суммарно: после расхода платные модели закрываются", async () => {
    const { env, used } = fixture({ AZRAIL_DAILY_NEURONS: "400" }, { prompt_tokens: 1000, completion_tokens: 1000 });
    const first = await runModel(env, "answer", { messages: [] }, { complexity: "normal" });
    expect(first.model).toBe(GLM_FLASH);
    const spent = used()!.c;
    expect(spent).toBeGreaterThan(0);
    expect(spent).toBeLessThanOrEqual(400);
    let model = GLM_FLASH;
    for (let i = 0; i < 12 && model === GLM_FLASH; i++) model = (await runModel(env, "answer", { messages: [] }, { complexity: "normal" })).model;
    expect(FREE_MODEL_SLUGS.has(model)).toBe(true);
    expect(used()!.c).toBeLessThanOrEqual(400);
  });

  it("ошибка провайдера освобождает резерв", async () => {
    const { env, run, used } = fixture();
    run.mockImplementation((async (slug: string) => {
      if (slug === GLM_FLASH) throw new Error("upstream 500");
      return { response: "ответ", usage: { prompt_tokens: 2, completion_tokens: 1 } };
    }) as never);
    const result = await runModel(env, "answer", { messages: [] }, { complexity: "normal" });
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
    await runModel(env, "answer", { messages: [] }, { complexity: "normal" });
    const next = await runModel(env, "answer", { messages: [] }, { complexity: "normal" });
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
    const result = await runModel(env, "chat", { messages: [] }, { preferredModel: GLM_FLASH });
    expect(result.model).toBe(GLM_FLASH);
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
    const upper = neuronUpperBound(GLM_FLASH, 4000, 2500);
    expect(upper).toBeGreaterThanOrEqual(neuronsFor(GLM_FLASH, { promptTokens: 4000, completionTokens: 2500, totalTokens: 6500 }));
  });
  it("потолок: значение по умолчанию, разумное и некорректное", () => {
    expect(dailyNeuronCap(undefined)).toBe(6000);
    expect(dailyNeuronCap("8000")).toBe(8000);
    expect(dailyNeuronCap("10001")).toBe(0);
    expect(dailyNeuronCap("abc")).toBe(0);
    expect(dailyNeuronCap("-5")).toBe(0);
  });
  it("мелкие задачи не получают платных моделей", () => {
    expect(neuronAllowedFor("answer", "trivial").size).toBe(0);
    expect([...neuronAllowedFor("answer", "normal")]).toEqual([GLM_FLASH]);
  });
});
