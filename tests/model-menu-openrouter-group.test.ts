import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("меню моделей: группа OpenRouter", () => {
  const src = readFileSync("ui/app.ts", "utf8");
  it("модели openrouter: идут подряд первой группой", () => {
    expect(src).toContain(
      "const groupRank=(slug:string)=>slug.startsWith('openrouter:')?0:1;",
    );
    expect(src).toMatch(
      /sort\(\(x,y\)=>groupRank\(x\.slug\)-groupRank\(y\.slug\)\|\|dotRank/,
    );
  });
});
