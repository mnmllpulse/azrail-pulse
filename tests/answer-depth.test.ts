import { describe, expect, it } from "vitest";
import { answerDepth } from "../src/lib/answer-depth";

describe("answerDepth", () => {
  it.each([
    ["Привет", 1, true],
    ["Объясни эффект Даннинга — Крюгера кратко", 1, true],
    ["Что такое эффект Даннинга — Крюгера?", 3, false],
    ["Сделай подробный разбор архитектуры микросервисов", 4, false],
    ["Ты умеешь создавать изображения?", 2, false],
  ])("%s → уровень %i", (text, level) => {
    expect(answerDepth(text as string).level).toBe(level);
  });

  it("краткость побеждает экспертные маркеры", () => {
    const depth = answerDepth("Подробно, но в двух словах: что такое DNS?");
    expect(depth.brief).toBe(true);
    expect(depth.maxTokens).toBeLessThanOrEqual(1200);
  });

  it("длинный вопрос получает экспертную глубину", () => {
    expect(answerDepth("а ".repeat(400)).level).toBe(4);
  });

  it("лимит токенов растёт с уровнем", () => {
    const sizes = ["Привет", "Как дела у тебя сегодня вообще?", "Что такое DNS?", "Дай глубокий анализ DNS"].map((q) => answerDepth(q).maxTokens);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });
});
