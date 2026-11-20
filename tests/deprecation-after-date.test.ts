import { describe, expect, it } from "vitest";
import { MODEL_REGISTRY } from "../src/lib/model-registry";
import { route } from "../src/lib/model-router";

const deprecated = MODEL_REGISTRY.filter((m) => m.deprecatedAt);

describe("после даты отключения моделей Cloudflare", () => {
  it("в реестре есть отключаемые модели", () => {
    expect(deprecated.length).toBeGreaterThan(0);
  });
  it("роутер не выбирает ни одну из них", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    for (const intent of ["answer", "generate_code", "summarize"]) {
      const chosen = route(intent, { now }).candidates.map((m) => m.slug);
      expect(chosen.length).toBeGreaterThan(0);
      for (const model of deprecated) expect(chosen).not.toContain(model.slug);
    }
  });
});
