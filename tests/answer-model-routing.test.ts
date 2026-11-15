import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { route } from "../src/lib/model-router";
import { FREE_MODEL_SLUGS } from "../src/lib/model-policy";

const source = readFileSync("src/agents/answer-agent.ts", "utf8");

describe("модель ответа не зависит от голоса", () => {
  it("голоса не закрепляют конкретную модель", () => {
    expect(source).not.toContain("shadePin");
    expect(source).toContain("const preferred = request.preferredModel;");
  });
  it("автовыбор для answer на бесплатных моделях берёт модель с reasoning", () => {
    const free = (route("answer").candidates).filter((m) => FREE_MODEL_SLUGS.has(m.slug));
    expect(free.length).toBeGreaterThan(0);
    expect(free.every((m) => m.capabilities.includes("reasoning"))).toBe(true);
    expect(free.map((m) => m.slug)).not.toContain("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  });
});
