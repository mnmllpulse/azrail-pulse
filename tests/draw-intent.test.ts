import { describe, expect, it } from "vitest";
import { contextPrompt, drawRequest } from "../ui/draw-intent";

const none = { hasImage: false, previous: "" };

describe("«рисуй» без описания и правка приложенной картинки", () => {
  it("«рисуй» берёт прошлый промпт", () => {
    const previous =
      "Dark surreal sci-fi digital art, two women on rocks at night";
    expect(drawRequest("рисуй", { hasImage: false, previous })).toEqual({
      text: previous,
    });
    expect(
      drawRequest("Ну давай нарисуй это!", { hasImage: false, previous }),
    ).toEqual({ text: previous });
  });
  it("без прошлого промпта и без картинки это обычный разговор", () => {
    expect(drawRequest("рисуй", none)).toBeNull();
    expect(
      drawRequest("рисуй", { hasImage: false, previous: "привет" }),
    ).toBeNull();
  });
  it("с приложенной картинкой правка уходит в рисование", () => {
    expect(
      drawRequest("измени картинку в таком же стиле", {
        hasImage: true,
        previous: "",
      }),
    ).toEqual({ text: "измени картинку в таком же стиле" });
    expect(drawRequest("измени картинку в таком же стиле", none)).toBeNull();
  });
  it("вопросы и обычные заказы не перехватываются", () => {
    expect(
      drawRequest("что на картинке, измени?", { hasImage: true, previous: "" }),
    ).toBeNull();
    expect(
      drawRequest("нарисуй закат над морем", {
        hasImage: false,
        previous: "длинный прошлый запрос про код",
      }),
    ).toBeNull();
  });
  it("контекст: блок кода из ответа важнее прошлого сообщения, вложения отрезаются", () => {
    expect(
      contextPrompt({
        user: "сделай промпт",
        reply:
          "Вот промпт:\n```text\nNeon city at night, rain, cinematic lighting\n```",
      }),
    ).toBe("Neon city at night, rain, cinematic lighting");
    expect(
      contextPrompt({
        user: "кот на крыше ночью\n\n![кот](/api/studio/artifacts/abc123)",
        reply: "Принял",
      }),
    ).toBe("кот на крыше ночью");
    expect(contextPrompt(undefined)).toBe("");
  });
});
