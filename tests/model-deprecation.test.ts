import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEEPSEEK_FLASH, GLM_FLASH, GLM_FLASH_DEPRECATED_AT, neuronAllowedFor } from "../src/lib/neuron-paid";
import { MODEL_REGISTRY, findModel, isDeprecated } from "../src/lib/model-registry";
import { route } from "../src/lib/model-router";

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

describe("отключение моделей", () => {
  it("дата в neuron-paid совпадает с реестром", () => {
    expect(findModel(GLM_FLASH)?.deprecatedAt).toBe(GLM_FLASH_DEPRECATED_AT);
  });

  it("isDeprecated: до даты нет, с даты да, без даты никогда", () => {
    const model = { deprecatedAt: "2026-11-20" };
    expect(isDeprecated(model, day("2026-11-19") + 86_399_000)).toBe(false);
    expect(isDeprecated(model, day("2026-11-20"))).toBe(true);
    expect(isDeprecated({}, day("2030-01-01"))).toBe(false);
  });

  it("роутер не предлагает отключённую модель и объясняет почему", () => {
    const before = route("answer", { now: day("2026-11-19") }, MODEL_REGISTRY);
    const after = route("answer", { now: day("2026-11-21") }, MODEL_REGISTRY);
    expect(before.candidates.map((m) => m.slug)).toContain(GLM_FLASH);
    expect(after.candidates.map((m) => m.slug)).not.toContain(GLM_FLASH);
    expect(after.reasoning.join(" ")).toContain("отключена 2026-11-20");
  });

  it("обычные вопросы переходят на deepseek-v4-flash после отключения glm-5.3-flash", () => {
    expect([...neuronAllowedFor("answer", "normal", day("2026-11-19"))]).toEqual([GLM_FLASH]);
    expect([...neuronAllowedFor("answer", "normal", day("2026-11-20"))]).toEqual([DEEPSEEK_FLASH]);
  });
});

describe("доступ по умолчанию", () => {
  const source = readFileSync("src/index.ts", "utf8");
  it("запрос начинается с минимальных прав, а не с администратора", () => {
    expect(source).toContain("let principal: Principal = anonymous;");
    expect(source).not.toMatch(/let principal: Principal = administrator/);
  });
});
