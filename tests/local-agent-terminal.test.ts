import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMMANDS, childEnv, runCommand } from "../scripts/local-agent/azrail-agent.mjs";
import { AccessError } from "../src/lib/accounts";
import { AGENT_COMMANDS, createJob, decideJob, enableAgent, finishJob, pollJob, publicJob, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";
import { agentIntent, approvalText, jobReply } from "../ui/chat-agent";

function memoryStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state; },
    async setState(next) { state = next; },
    async insertJob(job) { jobs.set(job.id, { ...job }); },
    async getJob(id) { const job = jobs.get(id); return job ? { ...job } : null; },
    async updateJob(id, patch) { const job = jobs.get(id); if (job) Object.assign(job, patch); },
    async claimQueued(since) {
      for (const job of jobs.values()) if (job.status === "queued" && job.createdAt >= since) { job.status = "running"; return { ...job }; }
      return null;
    },
    async recentJobs(limit) { return [...jobs.values()].slice(-limit); },
  };
}

describe("терминал локального агента: белый список", () => {
  it("список команд сервера и агента совпадает", () => {
    expect(Object.keys(COMMANDS).sort()).toEqual(Object.keys(AGENT_COMMANDS).sort());
  });

  it("чужая команда и попытка вставки отклоняются сервером", async () => {
    const store = memoryStore();
    await enableAgent(store);
    for (const path of ["rm -rf /", "npm test && calc", "constructor", "__proto__", "", "git_status; whoami"]) {
      await expect(createJob(store, { kind: "run", path })).rejects.toThrow(AccessError);
    }
  });

  it("запуск всегда ждёт подтверждения и только потом попадает в очередь", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const job = await createJob(store, { kind: "run", path: "npm_test" });
    expect(job.status).toBe("awaiting_approval");
    expect(await pollJob(store)).toBeNull();
    expect(publicJob(job).command).toBe("npm test");
    await decideJob(store, job.id, true);
    expect((await pollJob(store))?.id).toBe(job.id);
  });

  it("лог упавшей команды сохраняется", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const job = await createJob(store, { kind: "run", path: "npm_build" });
    await decideJob(store, job.id, true);
    await pollJob(store);
    await finishJob(store, job.id, { ok: false, output: "error TS2304\n[код выхода 2]", error: "x" });
    const saved = await store.getJob(job.id);
    expect(saved?.status).toBe("failed");
    expect(saved?.result).toContain("TS2304");
  });
});

describe("терминал локального агента: исполнение", () => {
  it("дочерний процесс не получает ключ агента", () => {
    const env = childEnv({ PATH: "p", AZRAIL_AGENT_TOKEN: "azagent_x", AZRAIL_URL: "u", azrail_root: "r", HOME: "h" });
    expect(env).toEqual({ PATH: "p", HOME: "h" });
  });

  it("неизвестный идентификатор не запускается", async () => {
    const dir = await mkdtemp(join(tmpdir(), "azrail-run-"));
    await expect(runCommand(dir, "calc")).rejects.toThrow("белого списка");
    await expect(runCommand(dir, "constructor")).rejects.toThrow("белого списка");
  });

  it("разрешённая команда выполняется без оболочки и возвращает код выхода", async () => {
    const dir = await mkdtemp(join(tmpdir(), "azrail-run-"));
    const ok = await runCommand(dir, "node_version");
    expect(ok.ok).toBe(true);
    expect(ok.output).toMatch(/v\d+\.\d+\.\d+/);
    expect(ok.output).toContain("[код выхода 0]");
    const bad = await runCommand(dir, "git_status");
    expect(bad.ok).toBe(false);
    expect(bad.output).toMatch(/код выхода \d+/);
  });
});

describe("терминал в чате", () => {
  it("фразы с «на компьютере» дают команды из белого списка", () => {
    expect(agentIntent("запусти тесты на компьютере")).toEqual({ kind: "run", path: "npm_test" });
    expect(agentIntent("собери проект на компьютере")).toEqual({ kind: "run", path: "npm_build" });
    expect(agentIntent("покажи git status на компьютере")).toEqual({ kind: "run", path: "git_status" });
  });
  it("без «на компьютере» фраза остаётся чатом", () => {
    expect(agentIntent("запусти тесты")).toBeNull();
    expect(agentIntent("собери проект")).toBeNull();
  });
  it("карточка подтверждения и вывод", () => {
    const job = { id: "1", kind: "run", path: "npm_test", status: "awaiting_approval", result: null, error: null, command: "npm test" };
    expect(approvalText(job)).toContain("«npm test»");
    expect(jobReply({ ...job, status: "failed", result: "FAIL a.test.ts\n[код выхода 1]" })).toContain("завершилась с ошибкой");
    expect(jobReply({ ...job, status: "done", result: "ok\n[код выхода 0]" })).toContain("Команда выполнена");
  });
});
