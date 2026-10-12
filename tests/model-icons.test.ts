import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MODEL_REGISTRY, PROVIDER_ICONS, providerIcon } from "../src/lib/model-registry";

describe("реестр моделей: иконки и новые записи", () => {
  it("у каждого провайдера из реестра есть иконка", () => {
    for (const m of MODEL_REGISTRY) expect(providerIcon(m.provider), m.provider).toBeTruthy();
  });

  it("каждый путь иконки указывает на существующий файл в public/", () => {
    for (const path of Object.values(PROVIDER_ICONS)) {
      expect(existsSync(join("public", path)), path).toBe(true);
    }
  });

  it("слаги уникальны", () => {
    const slugs = MODEL_REGISTRY.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("устаревшая kimi-k2.5 в реестр не попала", () => {
    expect(MODEL_REGISTRY.some((m) => m.slug === "@cf/moonshotai/kimi-k2.5")).toBe(false);
  });

  it("все @cf/ модели работают без gateway", () => {
    for (const m of MODEL_REGISTRY.filter((m) => m.slug.startsWith("@cf/")))
      expect(m.requiresGateway, m.slug).toBe(false);
  });

  it("/api/models отдаёт icon, а renderModelList рисует её через createElement", () => {
    expect(readFileSync("src/index.ts", "utf8")).toMatch(/icon:\s*providerIcon\(m\.provider\)/);
    const html = readFileSync("public/index.html", "utf8");
    const fn = html.slice(html.indexOf("function renderModelList"), html.indexOf("function setPreferredModel"));
    expect(fn).toContain("document.createElement('img')");
    expect(fn).not.toContain("innerHTML");
  });
});
