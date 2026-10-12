import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = (path: string) => readFileSync(path, "utf8");

describe("ExecutionEngine decomposition", () => {
  const engine = src("src/core/execution-engine.ts");
  const tools = src("src/core/execution-tools.ts");
  const planning = src("src/core/execution-planning.ts");
  const journal = src("src/core/execution-journal.ts");
  const context = src("src/core/execution-types.ts");

  it("keeps the mission state machine separate from tool adapters", () => {
    expect(engine).toContain("new ExecutionToolExecutor(env)");
    expect(engine).not.toContain('case "sandbox_test"');
    expect(tools).toContain('case "sandbox_test"');
    expect(tools).toContain('case "connector_call"');
  });

  it("moves model planning behind a dedicated boundary", () => {
    expect(engine).toContain("new ExecutionPlanningEngine(env)");
    expect(planning).toContain("export const LOOP_SYSTEM_PROMPT");
    expect(planning).toContain("async buildPlan(");
    expect(planning).toContain("async replanTitles(");
    expect(planning).toContain("async decideNextStep(");
  });

  it("moves durable execution audit writes into the journal", () => {
    expect(engine).toContain("new ExecutionJournal(env)");
    expect(journal).toContain("INSERT INTO tool_calls");
    expect(journal).toContain("requestApproval");
    expect(journal).toContain("INSERT INTO mission_checks");
    expect(journal).toContain("emitMissionEvent");
  });

  it("keeps shared execution context in a cycle-free type module", () => {
    expect(context).toContain("export interface ExecutionContext");
    expect(context).toContain("export interface StepRecord");
    expect(engine).toContain('export type { ExecutionContext } from "./execution-types"');
  });

  it("shrinks the state-machine file instead of duplicating the old implementation", () => {
    expect(engine.split("\n").length).toBeLessThan(1200);
  });
});
