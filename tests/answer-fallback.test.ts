import { describe, expect, it } from "vitest";
import { contextMiss, promptBudget, rememberTurn, withFallbackNotice } from "../src/agents/answer-agent";

describe("spoken model fallback", () => {
  it("leaves a first-try answer unmarked", () => {
    expect(withFallbackNotice("На связи.", 1, "@cf/meta/llama-3.2-3b-instruct")).toBe("На связи.");
  });

  it("names the model that answered after the first one stayed silent", () => {
    expect(withFallbackNotice("На связи.", 2, "@cf/openai/gpt-oss-20b")).toBe(
      "На связи.\n\nПервая модель не ответила. Ответ дала gpt oss 20b.",
    );
  });

  it("does not invent a name when the slug is missing", () => {
    expect(withFallbackNotice("На связи.", 2)).toContain("запасная модель");
  });

  it("отправляет длинный архив мимо окна Серого", () => {
    const short = promptBudget("сделай анализ");
    expect(short.long).toBe(false);
    const zip = promptBudget(`сделай анализ\n${"a".repeat(80_000)}`);
    expect(zip.long).toBe(true);
    expect(zip.text).toContain("Середина вложения пропущена");
    expect(zip.tokens).toBeGreaterThan(24_000);
  });

  it("короткая следующая фраза с длинной историей не остаётся в окне Серого", () => {
    const follow = promptBudget("какие там ошибки", "а".repeat(80_000));
    expect(follow.long).toBe(true);
    expect(follow.text).toBe("какие там ошибки");
  });

  it("в истории остаётся разбор, а не повторный архив", () => {
    const kept = rememberTurn("user", `сделай анализ\n\nПРИЛОЖЕННЫЕ ФАЙЛЫ (42):\n${"x".repeat(80_000)}`);
    expect(kept).toContain("сделай анализ");
    expect(kept).toContain("архив повторно не вкладывается");
    expect(kept.length).toBeLessThan(2_000);
    const answer = "Общая картография репозитория. Ошибок в списке нет.";
    expect(rememberTurn("assistant", answer)).toBe(answer);
  });

  it("отказ по окну контекста узнаётся и в формулировке провайдера 5021", () => {
    expect(contextMiss(new Error("5021: The estimated number of input and maximum output tokens (45956) exceeded this model context window limit (24000)."))).toBe(true);
    expect(contextMiss(new Error("Модель не ответила"))).toBe(false);
  });
});
