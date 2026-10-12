import { describe, it, expect } from "vitest";
import { stripReasoning, extractText } from "../src/lib/model-router";

describe("рассуждение модели не утекает к пользователю", () => {
  it("вырезает пару тегов", () => {
    expect(stripReasoning("<think>прикидываю</think>Ответ.")).toBe("Ответ.");
  });

  it("режет закрывающий без открывающего", () => {
    // Ровно то, что увидел пользователь: «Привет.</think>На связи.»
    expect(stripReasoning("Привет.</think>На связи.")).toBe("На связи.");
  });

  it("режет оборванное размышление", () => {
    // Ответ подрезали по лимиту токенов: открыли тег и не закрыли.
    // Без этой ветки наружу ушло бы всё размышление целиком.
    expect(stripReasoning("Коротко: да.<think>а теперь подроб")).toBe("Коротко: да.");
  });

  it("не трогает обычный текст", () => {
    expect(stripReasoning("Просто ответ без тегов.")).toBe("Просто ответ без тегов.");
  });

  it("не ломается на пустом", () => {
    expect(stripReasoning("")).toBe("");
  });

  it("чистит на всех путях извлечения", () => {
    // Форматов ответа несколько; пропустить один — значит оставить утечку
    // в том поставщике, который отдаёт именно этот формат.
    expect(extractText({ response: "<think>x</think>Готово" })).toBe("Готово");
    expect(extractText({ choices: [{ message: { content: "a</think>Б" } }] })).toBe("Б");
    expect(extractText({ result: { response: "<think>y</think>В" } })).toBe("В");
    expect(extractText("<think>z</think>Г")).toBe("Г");
  });

  it("сохраняет содержимое после последнего закрывающего", () => {
    expect(stripReasoning("шаг1</think>шаг2</think>Итог")).toBe("Итог");
  });
});
