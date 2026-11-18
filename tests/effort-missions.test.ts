import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { effortRouteOptions, isEffortLevel } from "../src/lib/answer-depth";
import { parseMissionDelivery } from "../src/lib/mission-delivery";
import { missionStartSchema } from "../src/shared/schemas";

const row = (extra: Record<string, unknown> = {}) => ({
  mission_id: "m1", project_id: "p1", goal: "цель",
  params: JSON.stringify({ missionId: "m1", projectId: "p1", goal: "цель", maxIterations: 5, ...extra }),
});

describe("уровень усилий в миссиях", () => {
  it("опции роутера: низкий — trivial, высокий и максимальный — heavy, средний — без изменений", () => {
    expect(effortRouteOptions("low")).toEqual({ complexity: "trivial" });
    expect(effortRouteOptions("high")).toEqual({ complexity: "heavy" });
    expect(effortRouteOptions("max")).toEqual({ complexity: "heavy" });
    expect(effortRouteOptions("medium")).toEqual({});
    expect(effortRouteOptions()).toEqual({});
  });
  it("isEffortLevel отсеивает чужие значения", () => {
    expect(isEffortLevel("max")).toBe(true);
    expect(isEffortLevel("turbo")).toBe(false);
    expect(isEffortLevel(3)).toBe(false);
  });
  it("контракт доставки сохраняет и проверяет effort", () => {
    expect(parseMissionDelivery(row({ effort: "high" })).effort).toBe("high");
    expect(parseMissionDelivery(row()).effort).toBeUndefined();
    expect(() => parseMissionDelivery(row({ effort: "turbo" }))).toThrow("invalid outbox payload");
  });
  it("схема старта миссии принимает effort", () => {
    expect(missionStartSchema.safeParse({ message: "x", projectId: "p", effort: "low" }).success).toBe(true);
    expect(missionStartSchema.safeParse({ message: "x", projectId: "p", effort: "turbo" }).success).toBe(false);
  });
  it("effort проходит из координатора в контекст движка и в вызовы роутера", () => {
    expect(readFileSync("src/agents/mission-coordinator.ts", "utf8")).toMatch(/effort: params\.effort,\n\s+signal/);
    for (const f of ["execution-engine", "execution-tools", "execution-planning"]) {
      expect(readFileSync(`src/core/${f}.ts`, "utf8")).toContain("effortRouteOptions(ctx.effort)");
    }
  });
});

describe("пустой вывод команды агента", () => {
  it("для завершённой команды без результата показывается подпись", () => {
    const src = readFileSync("ui/local-agent.ts", "utf8");
    expect(src).toMatch(/job\.kind === 'run' && job\.status === 'done' && !job\.error/);
    expect(src).toContain("Пустой вывод: команда выполнена и ничего не напечатала.");
  });
});
