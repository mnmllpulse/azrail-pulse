import { describe, it, expect } from "vitest";
import { decide, levelOf, permissionMode, toolLevels } from "../src/lib/permission-levels";
import { TOOL_REGISTRY, availableTools } from "../src/lib/tool-registry";

describe("уровни разрешений", () => {
  it("у каждого инструмента есть уровень; approval-инструменты не ниже 2", () => {
    expect(toolLevels()).toHaveLength(TOOL_REGISTRY.length);
    for (const tool of TOOL_REGISTRY.filter((t) => t.risk === "approval")) expect(levelOf(tool)).toBeGreaterThanOrEqual(2);
  });

  it("чтение — 0, запись в рабочую папку — 1, удаление — 3", () => {
    expect(levelOf({ name: "read_file", risk: "safe" })).toBe(0);
    expect(levelOf({ name: "write_file", risk: "review" })).toBe(1);
    expect(levelOf({ name: "delete_file", risk: "approval" })).toBe(3);
  });

  it("режимы: Ask спрашивает про изменения, Trusted и Autonomous нет, уровни 2–3 всегда с подтверждением", () => {
    expect(decide(0, "ask")).toBe("allow");
    expect(decide(1, "ask")).toBe("ask");
    expect(decide(1, "trusted")).toBe("allow");
    expect(decide(1, "autonomous")).toBe("allow");
    for (const mode of ["ask", "trusted", "autonomous"] as const) {
      expect(decide(2, mode)).toBe("ask");
      expect(decide(3, mode)).toBe("ask");
    }
  });

  it("режим по умолчанию — trusted, мусор не расширяет права", () => {
    expect(permissionMode(undefined)).toBe("trusted");
    expect(permissionMode("root")).toBe("trusted");
    expect(permissionMode("ask")).toBe("ask");
  });

  it("в режиме по умолчанию доступные циклу инструменты не требуют вопроса", () => {
    for (const tool of availableTools({ GITHUB_TOKEN: "x", AZRAIL_SANDBOX: {} })) expect(decide(levelOf(tool), "trusted")).toBe("allow");
  });
});
