import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("маршрут /health/live в боевом входе", () => {
  it("unified entry отдаёт /health/live движку, а не SPA-странице", () => {
    const entry = readFileSync("src/unified/entry.ts", "utf8");
    expect(entry).toContain("url.pathname==='/health/live'");
  });
});
