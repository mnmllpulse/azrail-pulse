import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`ui/${name}`, "utf8");
const all = ["app.css", "workspace.css", "design-system.css"].map(read).join("\n");

describe("дизайн-система", () => {
  it("радиусы одиночных значений: только 8px и 12px, пилюли и круг", () => {
    const allowed = new Set(["0", "3px", "4px", "8px", "12px", "50%", "99px", "999px"]);
    const bad = [...all.matchAll(/border-radius:\s*([^;}\s]+)\s*(?=[;}])/g)]
      .map((m) => m[1])
      .filter((value) => !allowed.has(value) && !value.startsWith("var("));
    expect([...new Set(bad)]).toEqual([]);
  });

  it("токены: сайдбар 256px, рейл 64px, цель нажатия 32px, радиусы 12/8", () => {
    const css = read("design-system.css");
    expect(css).toContain("--sidebar-w: 256px");
    expect(css).toContain("--rail-w: 64px");
    expect(css).toContain("--target: 32px");
    expect(css).toContain("--radius-card: 12px");
    expect(css).toContain("--radius-control: 8px");
  });

  it("свёрнутый сайдбар на широких экранах — рейл, а не пустая колонка", () => {
    const css = read("design-system.css");
    expect(css).toMatch(/min-width: 761px[\s\S]*data-sidebar-open="false"\] \{ grid-template-columns: var\(--rail-w\)/);
  });

  it("фокус виден у всех интерактивных элементов", () => {
    expect(read("design-system.css")).toMatch(/:focus-visible \{\s*outline: 2px solid/);
  });

  it("уведомление на телефоне не растягивается на весь экран", () => {
    const media = read("app.css").slice(read("app.css").lastIndexOf("@media"));
    expect(media).toMatch(/\.notice\{top:12px;bottom:auto;/);
  });

  it("фоллбэк-сборка подключает файл дизайн-системы", () => {
    expect(readFileSync("scripts/build-ui-fallback.mjs", "utf8")).toContain("design-system.css");
    expect(read("app.css")).toContain("@import url('./design-system.css');");
  });

  it("сборка содержит токены", () => {
    expect(readFileSync("site/assets/app.css", "utf8")).toContain("--radius-card");
  });
});
