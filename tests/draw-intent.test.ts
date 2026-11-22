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

describe("рисуй в разговоре: реальные фразы из чатов", () => {
  const previous =
    "Череп на чёрном фоне, фронтальный ракурс, три четверти влево. Освещение жёсткое, один источник сверху-слева.";
  const ctx = { hasImage: false, previous };

  it("промпт и «рисуй» в конце одного сообщения рисуют сам промпт", () => {
    const body =
      "Череп на чёрном фоне, фронтальный ракурс.\nОсвещение жёсткое, один источник сверху-слева.\nФон абсолютно чёрный.";
    const clean = body.replace(/\.$/, "");
    expect(drawRequest(`${body}   рисуй`, none)).toEqual({ text: clean });
    expect(drawRequest(`${body}. Нарисуй!`, none)).toEqual({ text: clean });
  });

  it("жалоба со ссылкой на промпт рисует прошлый промпт, а не жалобу", () => {
    expect(
      drawRequest(
        "бля рисуй картику я дал тебе промпт ты шо тупой или куку рисуй",
        ctx,
      ),
    ).toEqual({ text: previous });
    expect(drawRequest("я же дал промпт, нарисуй его", ctx)).toEqual({
      text: previous,
    });
  });

  it("«это был промпт для картинки» и «мне надо картинка» рисуют прошлый промпт", () => {
    expect(
      drawRequest("мне надо картинка это был промпт для картинки", ctx),
    ).toEqual({ text: previous });
    expect(drawRequest("мне нужна картинка", ctx)).toEqual({ text: previous });
  });

  it("«тогда нарисуй» и «ладно рисуй» понимаются как просто «рисуй»", () => {
    expect(drawRequest("тогда нарисуй", ctx)).toEqual({ text: previous });
    expect(drawRequest("ладно, рисуй", ctx)).toEqual({ text: previous });
  });

  it("отрицание, вопрос и обычные заказы не перехватываются", () => {
    expect(drawRequest("не рисуй пока, я дал промпт", ctx)).toBeNull();
    expect(drawRequest("не надо рисовать, нарисуй потом", ctx)).toBeNull();
    expect(drawRequest("ты можешь рисовать по промпту?", ctx)).toBeNull();
    expect(drawRequest("мне нужна картинка заката над морем", ctx)).toBeNull();
    expect(drawRequest("рисуй кота в шляпе", ctx)).toBeNull();
    expect(drawRequest("я дал промпт, он плохой", ctx)).toBeNull();
  });

  it("жалоба без прошлого промпта ничего не рисует", () => {
    expect(
      drawRequest(
        "бля рисуй картику я дал тебе промпт ты шо тупой или куку рисуй",
        none,
      ),
    ).toBeNull();
  });
});
