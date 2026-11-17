import { describe, it, expect } from "vitest";
import { agentBadge, COMPUTER_COMMANDS, computerRun, logLine, outputOf, sandboxRun } from "../ui/terminal-panel";
import { AGENT_COMMANDS } from "../src/lib/local-agent";
import type { AgentJobView } from "../ui/chat-agent";

const job = (status: string, extra: Partial<AgentJobView> = {}): AgentJobView => ({ id: "1", kind: "run", path: "npm_test", status, result: null, error: null, ...extra });

describe("терминал", () => {
  it("список команд совпадает с белым списком агента", () => {
    expect(COMPUTER_COMMANDS.map(([id]) => id).sort()).toEqual(Object.keys(AGENT_COMMANDS).sort());
  });
  it("статус агента в шапке терминала", () => {
    expect(agentBadge(null).state).toBe("unknown");
    expect(agentBadge({ enabled: false })).toMatchObject({ state: "off", text: expect.stringContaining("выключен") });
    expect(agentBadge({ enabled: true, connected: false })).toMatchObject({ state: "offline", text: expect.stringContaining("не запущен") });
    expect(agentBadge({ enabled: true, connected: true }).state).toBe("ready");
    expect(agentBadge({ enabled: true }).state).toBe("ready");
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
    const api = async (path: string) => { calls.push(path); if (path === "/api/agent/status") return { enabled: true, connected: true }; return path === "/api/agent/jobs" ? { job: job("awaiting_approval") } : {}; };
    const out = await computerRun(api, "npm_test", async () => false, async () => {});
    expect(out).toContain("Отклонено");
    expect(calls).toEqual(["/api/agent/status", "/api/agent/jobs", "/api/agent/jobs/1/reject"]);
  });
  it("разрешение: одобрение, ожидание, вывод", async () => {
    const calls: string[] = [];
    const states = ["running", "done"];
    let i = 0;
    const api = async (path: string) => {
      calls.push(path);
      if (path === "/api/agent/status") return { enabled: true, connected: true };
      if (path === "/api/agent/jobs") return { job: job("awaiting_approval") };
      if (path.endsWith("/approve")) return {};
      return { job: job(states[Math.min(i++, 1)], { result: "все тесты прошли" }) };
    };
    expect(await computerRun(api, "npm_test", async () => true, async () => {})).toBe("все тесты прошли");
    expect(calls).toContain("/api/agent/jobs/1/approve");
  });
  it("агент выключен или не подключён: команда не ставится в очередь", async () => {
    for (const [state, text] of [[{ enabled: false }, "выключен"], [{ enabled: true, connected: false }, "не запущен"]] as const) {
      const calls: string[] = [];
      const api = async (path: string) => { calls.push(path); return state; };
      expect(await computerRun(api, "npm_test", async () => true, async () => {})).toContain(text);
      expect(calls).toEqual(["/api/agent/status"]);
    }
  });
  it("неизвестное состояние connected не блокирует запуск", async () => {
    const api = async (path: string) => path === "/api/agent/status" ? { enabled: true } : path === "/api/agent/jobs" ? { job: job("done", { result: "ok" }) } : { job: job("done", { result: "ok" }) };
    expect(await computerRun(api, "npm_test", async () => true, async () => {})).toBe("ok");
  });
  it("песочница: вывод или заметка", async () => {
    expect(await sandboxRun(async () => ({ output: "ok" }), "p")).toBe("ok");
    expect(await sandboxRun(async () => ({ note: "выключено" }), "p")).toBe("выключено");
  });
});

describe("шапка терминала", () => {
  it("показывает статус агента и открывает настройки", async () => {
    const { Window } = await import("happy-dom");
    const { vi } = await import("vitest");
    const { mountTerminal } = await import("../ui/terminal-panel");
    const win = new Window({ url: "https://azrail.example/" });
    vi.stubGlobal("document", win.document);
    win.document.body.innerHTML = `<section id="home-terminal"><select id="term-target"><option value="computer">К</option><option value="sandbox">П</option></select><select id="term-command"></select><button id="term-run"></button><button id="term-clear"></button><p id="term-agent"><span id="term-agent-text"></span><button id="term-agent-open"></button></p><div id="term-gate" hidden><span id="term-ask"></span><button id="term-yes"></button><button id="term-no"></button></div><pre id="term-log"></pre></section>`;
    const api = vi.fn(async () => ({ enabled: true, connected: false }));
    const open = vi.fn();
    mountTerminal(api, () => "p1", () => {}, open);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const badge = win.document.querySelector<HTMLElement>("#term-agent")!;
    expect(badge.dataset.state).toBe("offline");
    expect(badge.textContent).toContain("не запущен");
    win.document.querySelector<HTMLButtonElement>("#term-agent-open")!.click();
    expect(open).toHaveBeenCalledOnce();
    const target = win.document.querySelector<HTMLSelectElement>("#term-target")!;
    target.value = "sandbox";
    target.dispatchEvent(new win.Event("change"));
    expect(badge.hidden).toBe(true);
    vi.unstubAllGlobals();
    win.close();
  });
});
