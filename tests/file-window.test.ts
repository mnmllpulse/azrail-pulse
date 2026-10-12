import { describe, it, expect } from "vitest";
import { sliceFile, WorkingSet, WINDOW_CHARS } from "../src/core/file-window";
import { readFileSync } from "node:fs";

// Застрявшая миссия: styles.css длиннее 4000 символов, read_file отдавал
// обрезку, дочитать было нечем — модель читала файл по кругу до потолка.
const bigCss = Array.from({ length: 400 }, (_, n) => `.c${n} { color: #${(n * 7919).toString(16).slice(0, 6).padEnd(6, "0")}; }`).join("\n");

describe("sliceFile — чтение окнами", () => {
  it("маленький файл отдаётся целиком, без продолжения", () => {
    const w = sliceFile("a.css", "a{}\nb{}");
    expect(w.content).toBe("a{}\nb{}");
    expect(w.more).toBeUndefined();
  });

  it("большой файл режется по целым строкам и говорит, откуда читать дальше", () => {
    const w = sliceFile("s.css", bigCss);
    expect(w.content.length).toBeLessThanOrEqual(WINDOW_CHARS);
    expect(bigCss.startsWith(w.content)).toBe(true);
    expect(w.more).toContain(`"from_line":${w.toLine + 1}`);
  });

  it("окна покрывают файл без дыр и повторов", () => {
    const parts: string[] = [];
    let from = 1;
    for (let guard = 0; guard < 50; guard++) {
      const w = sliceFile("s.css", bigCss, from);
      parts.push(w.content);
      if (!w.more) break;
      from = w.toLine + 1;
    }
    expect(parts.join("\n")).toBe(bigCss);
  });

  it("строка длиннее окна отдаётся целиком, а не пополам", () => {
    const long = "x".repeat(WINDOW_CHARS * 2);
    const w = sliceFile("min.css", `${long}\nb{}`);
    expect(w.content).toBe(long);
    expect(w.toLine).toBe(1);
  });

  it("мусорный from_line не роняет чтение", () => {
    expect(sliceFile("a", "1\n2\n3", Number("abc")).fromLine).toBe(1);
    expect(sliceFile("a", "1\n2\n3", 99).fromLine).toBe(3);
  });
});

describe("WorkingSet — прочитанное не теряется", () => {
  it("хранит текст и выкидывает файл после правки", () => {
    const ws = new WorkingSet();
    ws.remember(sliceFile("s.css", ".a{}"));
    expect(ws.render()).toContain(".a{}");
    expect(ws.invalidate("s.css")).toBe(true);
    expect(ws.render()).toBe("");
  });

  it("новое окно заменяет пересекающееся старое", () => {
    const ws = new WorkingSet();
    ws.remember(sliceFile("s.css", "old"));
    ws.remember(sliceFile("s.css", "new"));
    expect(ws.render()).toContain("new");
    expect(ws.render()).not.toContain("old");
  });

  it("при переполнении выпадает давно прочитанное, свежее остаётся", () => {
    const ws = new WorkingSet();
    ws.remember(sliceFile("old.css", "o".repeat(3000)));
    ws.remember(sliceFile("new.css", "n".repeat(3000)));
    const out = ws.render(4000);
    expect(out).toContain("nnn");
    expect(out).toContain("перечитать: old.css");
  });
});

describe("движок: чтение идёт через окно и рабочий набор", () => {
  const engine = readFileSync("src/core/execution-engine.ts", "utf8");
  const tools = readFileSync("src/core/execution-tools.ts", "utf8");
  it("read_file отдаёт окно, а не целый файл", () => {
    expect(tools).toContain("return sliceFile(path, file.content");
  });
  it("правка файла выкидывает его из набора", () => {
    expect(engine).toContain("workingSet.invalidate(stepInput.path)");
  });
  it("предупреждение о повторе не съедает шаг бюджета (с лимитом)", () => {
    expect(engine).toMatch(/if \(freeLoopWarnings > 0\) \{\s*freeLoopWarnings--;\s*i--;/);
  });
});
