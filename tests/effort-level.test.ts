import { describe, expect, it } from "vitest";
import { answerDepth, applyEffort, EFFORT_LEVELS } from "../src/lib/answer-depth";
import { chatSchema } from "../src/shared/schemas";
import { route } from "../src/lib/model-router";

const q = "Что такое DNS?";

describe("уровень усилий", () => {
  it("средний и отсутствие уровня не меняют глубину", () => {
    const base = answerDepth(q);
    expect(applyEffort(base)).toBe(base);
    expect(applyEffort(base, "medium")).toBe(base);
  });
  it("низкий: быстрая модель и короткий бюджет", () => {
    const d = applyEffort(answerDepth("Дай глубокий анализ DNS"), "low");
    expect(d.complexity).toBe("trivial");
    expect(d.maxTokens).toBeLessThanOrEqual(1500);
    expect(d.instruction).toContain("низкий");
  });
  it("высокий: не ниже подробного разбора", () => {
    const d = applyEffort(answerDepth("Привет"), "high");
    expect(d.level).toBeGreaterThanOrEqual(3);
    expect(d.complexity).toBe("heavy");
    expect(d.brief).toBe(false);
  });
  it("максимальный: экспертная глубина, самый длинный бюджет, пошагово", () => {
    const d = applyEffort(answerDepth(q), "max");
    expect(d.level).toBe(4);
    expect(d.instruction).toContain("пошагово");
    const budgets = EFFORT_LEVELS.map((e) => applyEffort(answerDepth(q), e).maxTokens);
    expect(Math.max(...budgets)).toBe(d.maxTokens);
    expect(d.maxTokens).toBeLessThanOrEqual(9000);
  });
  it("бюджет не убывает от низкого к максимальному", () => {
    const b = EFFORT_LEVELS.map((e) => applyEffort(answerDepth(q), e).maxTokens);
    expect(b).toEqual([...b].sort((x, y) => x - y));
  });
  it("роутер: низкий начинает с лёгкой модели, максимальный — с сильнейшего", () => {
    const low = route("answer", { complexity: applyEffort(answerDepth(q), "low").complexity });
    const max = route("answer", { complexity: applyEffort(answerDepth(q), "max").complexity });
    expect(low.candidates[0]?.tier).not.toBe("frontier");
    expect(max.candidates[0]?.tier).toBe("frontier");
    expect(low.candidates[0]?.slug).not.toBe(max.candidates[0]?.slug);
  });
  it("схема чата принимает только известные уровни", () => {
    expect(chatSchema.safeParse({ message: "x", effort: "max" }).success).toBe(true);
    expect(chatSchema.safeParse({ message: "x" }).success).toBe(true);
    expect(chatSchema.safeParse({ message: "x", effort: "turbo" }).success).toBe(false);
  });
});
