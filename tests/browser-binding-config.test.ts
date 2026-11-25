import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("привязка облачного браузера", () => {
  it("задана в источнике и во всех сгенерированных конфигах", () => {
    const source = JSON.parse(readFileSync("config/environments.json", "utf8"));
    expect(source.common.browser).toEqual({ binding: "AZRAIL_BROWSER" });
    for (const file of ["wrangler.jsonc", "wrangler.production.json", "wrangler.staging.json"]) {
      const config = JSON.parse(readFileSync(file, "utf8"));
      expect(config.browser, file).toEqual({ binding: "AZRAIL_BROWSER" });
    }
  });
});
