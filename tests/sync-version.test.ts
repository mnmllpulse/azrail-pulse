import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("version:sync не ломает HTML-комментарии", () => {
  it("шаблон маркера останавливается на пробеле и не съедает ' -->'", () => {
    const source = readFileSync("scripts/sync-version.mjs", "utf8");
    expect(source).toContain("/UNIFIED \\/ [^\\s<]+/");
    const sample = "<!-- UNIFIED / 1.0.0 --><button>";
    expect(sample.replace(/UNIFIED \/ [^\s<]+/, "UNIFIED / 2.0.0")).toBe("<!-- UNIFIED / 2.0.0 --><button>");
  });
});
