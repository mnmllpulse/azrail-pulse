// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fillMarkdownContent } from "../ui/chat-markdown";

function render(text: string) {
  const host = document.createElement("div");
  fillMarkdownContent(host, text);
  return host;
}

describe("заголовки в ответах чата", () => {
  it("## становится заголовком, а не текстом", () => {
    const host = render("## Вывод\nЭффект не абсолютный.\n\n# Итог");
    const headings = [...host.querySelectorAll(".md-heading")];
    expect(headings.map((h) => h.textContent)).toEqual(["Вывод", "Итог"]);
    expect(headings.map((h) => h.tagName)).toEqual(["H4", "H3"]);
    expect(host.textContent).not.toContain("##");
    expect(host.querySelector("p")?.textContent).toBe("Эффект не абсолютный.");
  });
  it("разметка в заголовке экранируется", () => {
    const host = render("## <img src=x onerror=alert(1)>");
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector(".md-heading")?.textContent).toContain("<img");
  });
  it("решётка без пробела остаётся текстом", () => {
    expect(render("#тег").querySelector(".md-heading")).toBeNull();
  });
});
