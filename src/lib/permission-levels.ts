import { TOOL_REGISTRY } from "./tool-registry";

export type PermissionLevel = 0 | 1 | 2 | 3;
export type PermissionMode = "ask" | "trusted" | "autonomous";
export type PermissionDecision = "allow" | "ask";

/** 0 — чтение; 1 — безопасные изменения в рабочей папке; 2 — чувствительные; 3 — критические. */
const EXPLICIT: Record<string, PermissionLevel> = {
  sandbox_exec: 1,
  run_tests: 1,
  browser_click: 2,
  browser_type: 2,
  open_pr: 2,
  delete_file: 3,
};

export function levelOf(tool: { name: string; risk: "safe" | "review" | "approval" }): PermissionLevel {
  if (tool.name in EXPLICIT) return EXPLICIT[tool.name];
  if (tool.risk === "approval") return 3;
  return tool.risk === "review" ? 1 : 0;
}

export function permissionMode(raw: string | undefined): PermissionMode {
  return raw === "ask" || raw === "autonomous" ? raw : "trusted";
}

/**
 * Ask — спрашивать всё, что меняет что-либо (уровень 1+).
 * Trusted — изменения рабочей папки без вопроса, всё чувствительное с подтверждением.
 * Autonomous — то же, что Trusted: расширение выше уровня 1 намеренно не заведено.
 * Уровни 2 и 3 требуют подтверждения в любом режиме.
 */
export function decide(level: PermissionLevel, mode: PermissionMode): PermissionDecision {
  if (level >= 2) return "ask";
  if (level === 0) return "allow";
  return mode === "ask" ? "ask" : "allow";
}

export function toolLevels() {
  return TOOL_REGISTRY.map((tool) => ({ name: tool.name, level: levelOf(tool) }));
}
