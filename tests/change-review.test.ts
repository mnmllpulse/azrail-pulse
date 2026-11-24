import { describe, expect, it } from "vitest";
import { reviewChanges } from "../src/lib/change-review";

const change = (path: string, kind = "изменён", added = 3, removed = 1) => ({ path, kind, added, removed });

describe("ревью изменений по правилам", () => {
  it("чистые изменения — без замечаний", () => {
    const r = reviewChanges([change("src/a.ts")], [{ path: "src/a.ts", content: "export const a = 1;\n" }]);
    expect(r.blocking).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.summary).toContain("замечаний нет");
  });
  it("секрет в изменённом файле блокирует и не показывается целиком", () => {
    const key = "sk-" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6";
    const r = reviewChanges([change("src/a.ts")], [{ path: "src/a.ts", content: `const apiKey = "${key}";\n` }]);
    expect(r.blocking.length).toBeGreaterThan(0);
    expect(r.summary).not.toContain(key);
  });
  it("секрет в нетронутом файле не считается", () => {
    const key = "sk-" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6";
    const r = reviewChanges([change("src/a.ts")], [{ path: "src/b.ts", content: `const apiKey = "${key}";\n` }]);
    expect(r.blocking).toEqual([]);
  });
  it("защищённые файлы дают предупреждение, а не блок", () => {
    const r = reviewChanges([change(".github/workflows/ci.yml"), change("wrangler.jsonc"), change("migrations/040.sql", "добавлен")], []);
    expect(r.blocking).toEqual([]);
    expect(r.warnings.map((w) => w.rule)).toEqual(["protected", "protected", "protected"]);
  });
  it("массовое удаление, обнуление и слишком много файлов", () => {
    expect(reviewChanges([change("a.ts", "удалён", 0, 250)], []).warnings[0].rule).toBe("big-delete");
    expect(reviewChanges([change("a.ts", "изменён", 5, 400)], []).warnings[0].rule).toBe("wipe");
    const many = Array.from({ length: 16 }, (_, i) => change(`f${i}.ts`));
    expect(reviewChanges(many, []).warnings.at(-1)?.rule).toBe("many-files");
  });
});
