import { describe, it, expect } from "vitest";
import { checkEdit, measure, langOf } from "../src/core/syntax-guard";
import { readFileSync } from "node:fs";

describe("syntax-guard — ловит потерянную скобку после правки", () => {
  const css = ".a { color: red; }\n.b { margin: 0; }\n";

  it("CSS: потерянная } — предупреждение", () => {
    const w = checkEdit("styles.css", css, ".a { color: red;\n.b { margin: 0; }\n");
    expect(w).toContain("незакрытых «{»: 1");
  });

  it("CSS: корректная правка — тишина", () => {
    expect(checkEdit("styles.css", css, css.replace("red", "#0ff"))).toBeNull();
  });

  it("скобки в строках и комментариях не считаются", () => {
    const t = `.a::before { content: "{"; } /* } */\n`;
    expect(checkEdit("s.css", "", t)).toBeNull();
  });

  it("JS: регулярка со скобкой не даёт ложной тревоги", () => {
    const js = "const r = /[{(]/g;\nfunction f(x) { return x.replace(r, ''); }\n";
    expect(measure(js, "js").stray).toBe(0);
    expect(Object.keys(measure(js, "js").open)).toHaveLength(0);
  });

  it("JS: деление не путается с регуляркой", () => {
    expect(checkEdit("p.js", "", "const a = b / c / d;\nfunction g() { return a; }\n")).toBeNull();
  });

  it("JS: потерянная ) — предупреждение", () => {
    const before = "play(track.id);\n";
    expect(checkEdit("player.js", before, "play(track.id;\n")).toContain("«(»");
  });

  it("старая странность файла шума не даёт — только ухудшение", () => {
    const broken = "a { b {\n";
    expect(checkEdit("x.css", broken, broken + "/* ok */\n")).toBeNull();
  });

  it("JSON: битый после правки — предупреждение, валидный — тишина", () => {
    expect(checkEdit("package.json", '{"a":1}', '{"a":1,}')).toContain("JSON не разбирается");
    expect(checkEdit("package.json", '{"a":1}', '{"a":2}')).toBeNull();
  });

  it("незнакомые расширения не проверяются", () => {
    expect(langOf("README.md")).toBeNull();
    expect(checkEdit("README.md", "", "{{{")).toBeNull();
  });
});

describe("движок: проверка после правки встроена", () => {
  const engine = readFileSync("src/core/execution-engine.ts", "utf8");
  it("текст читается ДО исполнения инструмента", () => {
    const beforeIdx = engine.indexOf("const before = mutating");
    const execIdx = engine.indexOf("await checkpointTool(this.env");
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(beforeIdx).toBeLessThan(execIdx);
  });
  it("предупреждение уходит в историю шага", () => {
    expect(engine).toContain("if (warn) {\n            historyText += `\\n${warn}`;");
  });
});
