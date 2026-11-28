import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const engine = readFileSync("src/core/execution-engine.ts", "utf8");

describe("факты сильнее мнения проверяющей модели", () => {
  it("подтверждённые чтением мутации на компьютере не отклоняются моделью", () => {
    const facts = engine.indexOf("const lastVerify");
    const call = engine.indexOf("await checkResult(this.env, goal, history");
    expect(facts).toBeGreaterThan(engine.indexOf("await localGate("));
    expect(call).toBeGreaterThan(facts);
    const block = engine.slice(facts, call);
    expect(block).toContain('step.tool === "verify"');
    expect(block).toContain("pendingLocalChecks(history).length === 0");
    expect(block).toContain("localFactsOk\n          ? {");
  });
});
