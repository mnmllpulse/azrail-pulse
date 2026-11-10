import { describe, expect, it } from "vitest";
import { promptBudget, withFallbackNotice } from "../src/agents/answer-agent";

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
});
