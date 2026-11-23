// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { htmlBlockOf } from "../ui/chat-code";
import { mountHomeCanvas } from "../ui/home-canvas";

const page =
  '<!doctype html><html><body><div id="calc"><button>1</button><button>2</button></div></body></html>';

describe("HTML из ответа уходит в Живой экран", () => {
  it("находит страницу и оставляет в чате пометку без кода", () => {
    const r = htmlBlockOf(
      `Держи калькулятор:\n\`\`\`html\n${page}\n\`\`\`\nГотово.`,
    );
    expect(r?.html).toBe(page);
    expect(r?.text).toContain("Живом экране");
    expect(r?.text).not.toContain("<button>");
    expect(r?.text).toContain("Держи калькулятор");
  });
  it("короткий фрагмент и не-HTML остаются в чате", () => {
    expect(htmlBlockOf("```html\n<p>a</p>\n```")).toBeNull();
    expect(htmlBlockOf("```ts\nconst x = 1;\n```")).toBeNull();
    expect(htmlBlockOf("просто текст")).toBeNull();
  });
});

describe("Живой экран: очистка", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML =
      '<span id="home-canvas-kind"></span><button id="home-mode-code"></button><button id="home-mode-screen"></button><button id="home-clear"></button><textarea id="home-code"></textarea><iframe id="home-screen" hidden></iframe>';
    mountHomeCanvas();
  });
  it("кнопка «Очистить» возвращает пустой экран и стирает сохранённый код", () => {
    const code = document.getElementById("home-code") as HTMLTextAreaElement;
    document.dispatchEvent(
      new CustomEvent("azrail:site-preview", { detail: page }),
    );
    expect(code.value).toBe(page);
    expect(localStorage.getItem("pulse.home-code")).toBe(page);
    document.getElementById("home-clear")!.click();
    expect(code.value).toContain("Живой экран");
    expect(code.value).not.toContain("calc");
    expect(localStorage.getItem("pulse.home-code")).toBeNull();
  });
  it("новый чат не оставляет чужой код", () => {
    const code = document.getElementById("home-code") as HTMLTextAreaElement;
    document.dispatchEvent(
      new CustomEvent("azrail:site-preview", { detail: page }),
    );
    document.dispatchEvent(new CustomEvent("azrail:canvas-clear"));
    expect(code.value).not.toContain("calc");
  });
});
