import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/cloudflare-readonly-snapshot.mjs", "utf8");

describe("cloud snapshot", () => {
  it("reads bindings of the active version, not stale script settings", () => {
    expect(source).toContain("/versions/${deployment.version_id}");
    expect(source).toContain("(stagingActive.bindings ?? [])");
    expect(source).toContain("(productionActive.bindings ?? [])");
    expect(source).not.toContain("(productionSettings.bindings ?? [])");
  });

  it("stays read-only", () => {
    expect(source).not.toMatch(/method:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
  });
});
