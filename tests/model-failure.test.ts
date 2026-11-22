import { describe, expect, it } from "vitest";
import { unavailableReason } from "../src/lib/model-failure";

describe("unavailableReason", () => {
  it.each([
    [
      "Дневная квота Workers AI исчерпана. Платный обход не запускается.",
      "дневная квота Workers AI",
    ],
    [
      "AiError: 3036: you have used up your daily free allocation of 10,000 neurons",
      "дневная квота Workers AI",
    ],
    [
      "Суточный лимит нейронов для платных моделей исчерпан. Отвечает бесплатная модель.",
      "суточный лимит платных моделей",
    ],
    ["openrouter:x: 429 rate limit exceeded", "провайдер временно ограничил"],
    [
      'Ни одна модель не ответила для "chat". Попытки: a: boom | b: crash',
      "все модели из очереди",
    ],
  ])("%s", (raw, part) => {
    const text = unavailableReason(raw);
    expect(text.startsWith("Модель недоступна")).toBe(true);
    expect(text).toContain(part);
  });

  it("неизвестная ошибка не раскрывает текст провайдера", () => {
    expect(unavailableReason("secret-key-abc exploded")).toBe(
      "Модель недоступна.",
    );
    expect(unavailableReason("")).toBe("Модель недоступна.");
  });
});
