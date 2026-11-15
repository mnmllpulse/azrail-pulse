import { describe, it, expect } from "vitest";
import { planAuditParts, verifyFindings, parseAuditProgress, runZipAudit, AUDIT_ASK, AUDIT_NEXT } from "../src/lib/zip-audit";
import { makeZip } from "./stubs/make-zip";

const item = (path: string, size = 100) => ({ path, size });

describe("разбор архива по каталогам", () => {
  it("корень архива срезается, src делится на подкаталоги, legacy идёт последним", () => {
    const parts = planAuditParts([
      item("proj/src/lib/a.ts"), item("proj/src/agents/b.ts"), item("proj/scripts/c.mjs"),
      item("proj/references/legacy/d.ts"), item("proj/package.json"), item("proj/node_modules/x.js"),
    ]);
    expect(parts.map((p) => p.label)).toEqual(["(корень)", "src/agents", "src/lib", "scripts", "references"]);
  });

  it("большой каталог режется на части по бюджету", () => {
    const files = Array.from({ length: 5 }, (_, i) => item(`p/src/lib/f${i}.ts`, 30 * 1024));
    const parts = planAuditParts(files);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].label).toMatch(/\(1\/\d+\)/);
  });

  it("находка без цитаты в файле отбрасывается", () => {
    const files = new Map([["src/a.ts", "1| const x = eval(input);\n2| return x;"]]);
    const out = verifyFindings([
      "src/a.ts:1 — eval на входе — «const x = eval(input);»",
      "src/a.ts:2 — выдумка — «dangerouslyRun(secret)»",
      "src/zzz.ts:1 — чужой файл — «const x»",
      "Находок нет.",
    ].join("\n"), files);
    expect(out.kept).toHaveLength(1);
    expect(out.dropped).toBe(2);
  });

  it("прогресс читается из метки, запросы распознаются", () => {
    expect(parseAuditProgress("a [РАЗБОР 4/12] b [РАЗБОР 8/12]")).toBe(8);
    expect(parseAuditProgress("пусто")).toBe(0);
    expect(AUDIT_ASK.test("найди ошибки этого в зип архиве")).toBe(true);
    expect(AUDIT_ASK.test("привет")).toBe(false);
    expect(AUDIT_NEXT.test("продолжи разбор")).toBe(true);
  });

  it("проходы по частям, затем сводка; метка прогресса в конце", async () => {
    const zip = makeZip([
      { path: "p/src/lib/a.ts", content: "const a = eval(x);" },
      { path: "p/scripts/b.mjs", content: "console.log(1);" },
    ]);
    const env = { AZRAIL_R2: { get: async () => ({ size: zip.byteLength, arrayBuffer: async () => zip }) } } as never;
    const prompts: string[] = [];
    const out = await runZipAudit(env, { r2Key: "u/p.zip", fileName: "p.zip" }, "найди ошибки", 0, async (t) => {
      prompts.push(t);
      return t.startsWith("Роль") && t.includes("a.ts") ? "src/lib/a.ts:1 — eval — «const a = eval(x);»" : t.startsWith("Роль") ? "Находок нет." : "| 1 | высокая | src/lib/a.ts:1 | eval |";
    });
    expect(prompts).toHaveLength(3);
    expect(out!.text).toContain("Разобрано каталогов: 1–2 из 2");
    expect(out!.text).toContain("Архив разобран целиком");
    expect(out!.text).toContain("[РАЗБОР 2/2]");
  });
});
