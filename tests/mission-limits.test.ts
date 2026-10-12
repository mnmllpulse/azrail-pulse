import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  clampIterations, planStepCap, DEFAULT_MISSION_ITERATIONS, MAX_MISSION_ITERATIONS,
} from "../src/lib/mission-limits";

describe("лимиты шагов миссии", () => {
  it("дефолт — 12, потолок — 20", () => {
    expect(clampIterations(undefined)).toBe(DEFAULT_MISSION_ITERATIONS);
    expect(DEFAULT_MISSION_ITERATIONS).toBe(12);
    expect(clampIterations(999)).toBe(MAX_MISSION_ITERATIONS);
  });

  it("мусор на входе даёт дефолт, а не NaN или 0", () => {
    for (const bad of [null, "", "abc", 0, -5, NaN, {}]) expect(clampIterations(bad)).toBe(12);
    expect(clampIterations("7")).toBe(7);
    expect(clampIterations(3.9)).toBe(3);
  });

  it("план всегда оставляет запас на исправления", () => {
    for (let max = 2; max <= 20; max++) expect(planStepCap(max)).toBeLessThan(max);
    expect(planStepCap(12)).toBe(9);
    expect(planStepCap(1)).toBe(1);
  });

  it("литералов 8/20 для шагов в коде больше нет — одна формула везде", () => {
    const idx = readFileSync("src/index.ts", "utf8");
    const eng = readFileSync("src/core/execution-engine.ts", "utf8");
    expect(idx).not.toMatch(/maxIterations\)?\s*\|\|\s*8/);
    expect(eng).not.toMatch(/maxIterations\s*\|\|\s*8/);
    expect(eng).not.toContain("Math.min(maxIterations, 8)");
    expect(idx.match(/clampIterations\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("пересборка плана тоже оставляет запас", () => {
  it("replan режет по planStepCap, а не по всему остатку", () => {
    const eng = readFileSync("src/core/execution-engine.ts", "utf8");
    expect(eng).toContain("Math.min(planStepCap(remaining), 6)");
    expect(eng).not.toContain("Math.min(remaining, 6)");
  });
});

describe("лимит плана — в коде, а не только в промпте", () => {
  it("buildPlan и replanTitles обрезают ответ модели", () => {
    const eng = readFileSync("src/core/execution-engine.ts", "utf8");
    expect(eng).toContain(".slice(0, planStepCap(maxIterations))");
    expect(eng).toContain(".slice(0, Math.min(planStepCap(remaining), 6))");
  });
});
