import { describe, expect, it } from "vitest";
import {
  blockedReply,
  limitsText,
  localCommandOf,
} from "../ui/chat-local-commands";

describe("chat local commands", () => {
  it.each([
    ["сколько осталось", "quota"],
    ["сколько осталось нейронов?", "quota"],
    ["Сколько у нас осталось?", "quota"],
    ["а сколько ещё осталось", "quota"],
    ["покажи остаток на сегодня", "quota"],
    ["сколько лимит", "quota"],
    ["скачай архив", "save-zip"],
    ["Скачай этот архив!", "save-zip"],
    ["скачайте текущий архив.", "save-zip"],
    ["скачай файл", "save-file"],
    ["скачай этот файл?", "save-file"],
    ["верни файл", "restore-file"],
    ["Верни файл.", "restore-file"],
    ["запусти тесты", "run-tests"],
    ["прогони тесты!", "run-tests"],
    ["выполни тесты", "run-tests"],
    ["запусти npm", "blocked-commands"],
    ["запусти сборку", "blocked-commands"],
    ["выполни команду", "blocked-commands"],
    ["запусти dev", "blocked-commands"],
    ["выложи", "blocked-deploy"],
    ["задеплой", "blocked-deploy"],
    ["сделай push", "blocked-deploy"],
    ["отправь в github", "blocked-deploy"],
  ])("%s → %s", (text, kind) => expect(localCommandOf(text)).toBe(kind));

  it.each([
    "привет",
    "сколько стоит подписка",
    "сколько осталось до конца отпуска в днях подсчитай",
    "запусти тесты для модуля оплаты",
    "скачай архив с сайта",
    "выложи сайт на хостинг",
    "нарисуй кота",
    "",
  ])("%s → обычный чат", (text) => expect(localCommandOf(text)).toBeNull());

  it("has replies for both blocked commands", () => {
    expect(blockedReply["blocked-commands"]).toContain("пробным лимитом");
    expect(blockedReply["blocked-deploy"]).toContain(
      "Выкладка из чата закрыта",
    );
  });
});

describe("limitsText", () => {
  it("показывает чат, генерацию и нейроны платных моделей", () => {
    const text = limitsText({
      chat: { left: 156, limit: 200 },
      generation: { left: 490, limit: 500 },
      neurons: { used: 4859, limit: 6000, left: 1141 },
    });
    expect(text).toContain("Чат: осталось 156 из 200");
    expect(text).toContain("Генерация: осталось 490 из 500");
    expect(text).toContain("потрачено 4859 из 6000 нейронов");
    expect(text).toContain("картинки сюда не входят");
  });
  it("без данных говорит честно, что остаток не прочитан", () => {
    expect(limitsText(null)).toContain("не прочитан");
    expect(limitsText({ chat: null, generation: null })).toContain(
      "Остаток чата сейчас не прочитан",
    );
  });
});
