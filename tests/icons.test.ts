import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { ICON_NAMES, hydrateIcons, icon, iconElement } from "../ui/icons";

describe("единый набор иконок", () => {
  it("каждая иконка: 24-сетка, обводка 1.5, размер по умолчанию 18px", () => {
    for (const name of ICON_NAMES) {
      const svg = icon(name);
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('stroke-width="1.5"');
      expect(svg).toContain('width="18" height="18"');
      expect(svg).toContain('fill="none"');
      expect(svg).toContain('aria-hidden="true"');
    }
  });
  it("размер задаётся параметром, обёртка скрыта от скринридеров", () => {
    const wrap = iconElement("copy", 20, new Window().document as unknown as Document);
    expect(wrap.getAttribute("aria-hidden")).toBe("true");
    expect(wrap.innerHTML).toContain('width="20" height="20"');
  });
  it("hydrateIcons заполняет [data-icon] один раз и пропускает неизвестные имена", () => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML = '<span data-icon="chat"></span><span data-icon="nope"></span><span data-icon="plus" data-icon-size="14"></span>';
    hydrateIcons(doc as unknown as ParentNode);
    hydrateIcons(doc as unknown as ParentNode);
    const spans = doc.querySelectorAll("span");
    expect(spans[0].querySelectorAll("svg")).toHaveLength(1);
    expect(spans[1].innerHTML).toBe("");
    expect(spans[2].innerHTML).toContain('width="14"');
  });
  it("в сайдбаре и настройках нет символов-значков", () => {
    const html = readFileSync("ui/app.html", "utf8");
    for (const glyph of ["◇", "◈", "▱", "⊞", "⚙", "＋", "⌕", "◫"]) expect(html).not.toContain(glyph);
    const settings = readFileSync("ui/settings-center.ts", "utf8");
    for (const glyph of ["◉", "✳", "◖", "⎓", "⌁", "◷", "▤", "⌨", "ⓘ"]) expect(settings).not.toContain(glyph);
  });
  it("каждый пункт настроек использует имя из набора", () => {
    const settings = readFileSync("ui/settings-center.ts", "utf8");
    const used = [...settings.matchAll(/icon: '([a-z]+)'/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThanOrEqual(12);
    for (const name of used) expect(ICON_NAMES).toContain(name);
  });
});
