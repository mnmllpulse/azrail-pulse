import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");
const sheets = ["ui/app.css", "ui/workspace.css", "ui/premium-workspace.css"].map(read);

describe("типографика: единые токены", () => {
  const tokens = read("ui/tokens.css");
  it("задаёт стек шрифта, размеры и цвета текста", () => {
    expect(tokens).toMatch(/--font: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto/);
    expect(tokens).toContain("--text: #d1d5db");
    expect(tokens).toContain("--heading: #ffffff");
    expect(tokens).toContain("--muted: #9ca3af");
    expect(tokens).toContain("--lh-body: 1.5");
    for (const size of ["--fs-body: 15px", "--fs-small: 13px", "--fs-caption: 12px", "--fs-micro: 11px"]) expect(tokens).toContain(size);
  });
  it("в таблицах стилей нет шрифтов мельче 14px без токена", () => {
    for (const css of sheets) expect(css).not.toMatch(/font-size:\s*(?:[0-9]|1[0-3])(?:\.\d+)?px/);
  });
  it("body использует токены, заголовки белые с весом 600", () => {
    const app = sheets[0];
    expect(app).toContain("font: 400 var(--fs-body)/var(--lh-body) var(--font)");
    expect(app).toMatch(/h1,h2,h3,h4[^{]*\{color:var\(--heading\);font-weight:600;\}/);
    expect(app).toContain("::placeholder {color:var(--muted)");
  });
  it("серые и светлые цвета текста заменены токенами", () => {
    const hardcoded = sheets.join("\n").match(/(?<![-\w])color:\s*#(?:888|8f839c|a89db4|9a8fb0|8d849c|7e768c|e0e0e0|f4f2f8|f1eff8)\b/gi);
    expect(hardcoded).toBeNull();
  });
});
