// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fillMarkdownContent } from "../ui/chat-markdown";
import {
  ANSWER_STYLE,
  ANSWER_STYLE_COMPACT,
  answerStyle,
} from "../src/lib/answer-style";

const render = (text: string) => {
  const host = document.createElement("div");
  fillMarkdownContent(host, text);
  return host;
};

const SAMPLE = [
  "Кэш держит старый файл.",
  "",
  "### 1. Сбросить версию",
  "*Сборка и CDN*",
  "Измени номер в `index.html`.",
  "*Проверка:* у файла другой хэш.",
  "",
  "---",
  "",
  "### 2. Узкое окно",
  "*Мобильная ширина*",
  "- первый пункт",
  "- второй **важный**",
  "> Кнопка видна без прокрутки.",
  "",
  "Проверим тёмную тему?",
].join("\n");

describe("структура ответа чата", () => {
  it("нумерованные шаги, подписи, проверка, цитата и разделитель", () => {
    const host = render(SAMPLE);
    expect(
      [...host.querySelectorAll("h5.md-heading")].map((h) => h.textContent),
    ).toEqual(["1. Сбросить версию", "2. Узкое окно"]);
    expect(
      [...host.querySelectorAll(".md-kicker")].map((k) => k.textContent),
    ).toEqual(["Сборка и CDN", "Мобильная ширина"]);
    expect(host.querySelector(".md-check")?.textContent).toContain("Проверка:");
    expect(host.querySelectorAll("hr.md-rule")).toHaveLength(1);
    expect(host.querySelector("blockquote.md-quote")?.textContent).toBe(
      "Кнопка видна без прокрутки.",
    );
    expect(host.querySelectorAll("ul.md-list > li")).toHaveLength(2);
    expect(host.querySelector("li strong")?.textContent).toBe("важный");
  });
  it("нумерованный список сохраняет стартовый номер", () => {
    const host = render("3. третий\n4. четвёртый");
    const ol = host.querySelector("ol") as HTMLOListElement;
    expect(ol.start).toBe(3);
    expect(ol.children).toHaveLength(2);
  });
  it("разметка в списках и цитатах экранируется", () => {
    const host = render("- <img src=x onerror=alert(1)>\n> <b>x</b>");
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("blockquote b")).toBeNull();
  });
  it("жирный `**x**` в начале строки не считается списком", () => {
    const host = render("**Важно** — читай внимательно");
    expect(host.querySelector("ul")).toBeNull();
    expect(host.querySelector("strong")?.textContent).toBe("Важно");
  });
  it("пример из системного промпта рендерится в тот же набор элементов", () => {
    const example =
      ANSWER_STYLE.split("Пример формы (содержание подставляй своё):\n")[1] ??
      "";
    const host = render(example);
    expect(host.querySelectorAll("h5.md-heading")).toHaveLength(2);
    expect(host.querySelectorAll(".md-kicker")).toHaveLength(2);
    expect(host.querySelector(".md-check")).not.toBeNull();
    expect(host.querySelector("hr.md-rule")).not.toBeNull();
    expect(host.querySelector("blockquote.md-quote")).not.toBeNull();
  });
});

describe("промпт стиля", () => {
  it("короткие и «кратко» ответы без заголовков, развёрнутые со структурой", () => {
    expect(answerStyle({ level: 1, brief: false })).toBe(ANSWER_STYLE_COMPACT);
    expect(answerStyle({ level: 3, brief: true })).toBe(ANSWER_STYLE_COMPACT);
    expect(answerStyle({ level: 2, brief: false })).toBe(ANSWER_STYLE);
    expect(ANSWER_STYLE).toContain("### 1. Название");
  });
});
