import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = (path: string) => readFileSync(path, "utf8");

describe("Orchestrator decomposition", () => {
  const orchestrator = src("src/agents/orchestrator.ts");
  const intents = src("src/agents/orchestrator-intent.ts");
  const capabilities = src("src/agents/orchestrator-capabilities.ts");
  const history = src("src/agents/orchestrator-history.ts");
  const missions = src("src/agents/mission-coordinator.ts");
  const selfTest = src("src/agents/orchestrator-self-test.ts");

  it("keeps the Durable Object shell small", () => {
    expect(orchestrator.split("\n").length).toBeLessThan(550);
  });

  it("moves intent selection out of the Durable Object shell", () => {
    expect(orchestrator).toContain("classifyTaskIntent(this.env, request)");
    expect(intents).toContain("export async function classifyTaskIntent");
    expect(intents).toContain("export function checkTaskSufficiency");
    expect(orchestrator).not.toContain('runModel<{ response?: string }>(this.env, "classify"');
  });

  it("moves agent selection and Git handoff behind capability boundaries", () => {
    expect(orchestrator).toContain("invokeAgentCapability(");
    expect(orchestrator).toContain("commitGeneratedFiles(");
    expect(capabilities).toContain("findByCapability(capability)");
    expect(capabilities).toContain("GitAgent");
  });

  it("moves mission scheduling/recovery/execution into MissionCoordinator", () => {
    expect(orchestrator).toContain("scheduleMission(missionHost(this, this.activeMissions), params)");
    expect(orchestrator).toContain("runScheduledMission(missionHost(this, this.activeMissions), params)");
    expect(missions).toContain("claimMissionDelivery(");
    expect(missions).toContain("queueMissionRecovery(");
    expect(missions).toContain("new ExecutionEngine(host.env)");
  });

  it("moves history and self-test IO out of the Durable Object shell", () => {
    expect(orchestrator).toContain("recordTaskHistory(");
    expect(history).toContain("INSERT INTO task_history");
    expect(orchestrator).toContain("runOrchestratorSelfTest(");
    expect(selfTest).toContain("D1 (цепочка записи)");
  });
});
