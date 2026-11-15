import { describe, it, expect } from "vitest";
import { COMPUTER_COMMANDS, computerRun, logLine, outputOf, sandboxRun } from "../ui/terminal-panel";
import { AGENT_COMMANDS } from "../src/lib/local-agent";
import type { AgentJobView } from "../ui/chat-agent";

const job = (status: string, extra: Partial<AgentJobView> = {}): AgentJobView => ({ id: "1", kind: "run", path: "npm_test", status, result: null, error: null, ...extra });

describe("терминал", () => {
  it("список команд совпадает с белым списком агента", () => {
    expect(COMPUTER_COMMANDS.map(([id]) => id).sort()).toEqual(Object.keys(AGENT_COMMANDS).sort());
  });
  it("вывод по статусам", () => {
    expect(outputOf(job("done", { result: "ok\n" }))).toBe("ok");
    expect(outputOf(job("done", { result: "  " }))).toBe("(пустой вывод)");
    expect(outputOf(job("failed", { result: "лог", error: "код 1" }))).toBe("лог\nкод 1");
    expect(outputOf(job("rejected"))).toContain("Отклонено");
    expect(outputOf(job("queued"))).toContain("PowerShell");
  });
  it("строка журнала с временем", () => {
    expect(logLine("компьютер", "npm test", "ok", new Date(2026, 10, 16, 1, 2, 3))).toBe("[01:02:03] компьютер › npm test\nok\n");
  });
  it("отказ не запускает команду и не ждёт вывода", async () => {
    const calls: string[] = [];
    const api = async (path: string) => { calls.push(path); return path === "/api/agent/jobs" ? { job: job("awaiting_approval") } : {}; };
    const out = await computerRun(api, "npm_test", async () => false, async () => {});
    expect(out).toContain("Отклонено");
    expect(calls).toEqual(["/api/agent/jobs", "/api/agent/jobs/1/reject"]);
  });
  it("разрешение: одобрение, ожидание, вывод", async () => {
    const calls: string[] = [];
    const states = ["running", "done"];
    let i = 0;
    const api = async (path: string) => {
      calls.push(path);
      if (path === "/api/agent/jobs") return { job: job("awaiting_approval") };
      if (path.endsWith("/approve")) return {};
      return { job: job(states[Math.min(i++, 1)], { result: "все тесты прошли" }) };
    };
    expect(await computerRun(api, "npm_test", async () => true, async () => {})).toBe("все тесты прошли");
    expect(calls).toContain("/api/agent/jobs/1/approve");
  });
  it("песочница: вывод или заметка", async () => {
    expect(await sandboxRun(async () => ({ output: "ok" }), "p")).toBe("ok");
    expect(await sandboxRun(async () => ({ note: "выключено" }), "p")).toBe("выключено");
  });
});
