import { describe, expect, it } from "vitest";
import { stripAnsi as agentStrip } from "../scripts/local-agent/azrail-agent.mjs";
import { createJob, decideJob, enableAgent, finishJob, pollJob, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";
import { jobReply, stripAnsi } from "../ui/chat-agent";
import { outputOf } from "../ui/terminal-panel";

const colored = "\u001b[22m\u001b[39m{\"a\":1}\u001b[31m FAIL\u001b[0m \u001b]0;title\u0007ok";

function memoryStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state; },
    async setState(next) { state = next; },
    async insertJob(job) { jobs.set(job.id, { ...job }); },
    async getJob(id) { const job = jobs.get(id); return job ? { ...job } : null; },
    async updateJob(id, patch) { const job = jobs.get(id); if (job) Object.assign(job, patch); },
    async claimQueued() { for (const job of jobs.values()) if (job.status === "queued") { job.status = "running"; return { ...job }; } return null; },
    async recentJobs() { return [...jobs.values()]; },
  };
}

describe("цветовые коды в выводе команд", () => {
  it("убираются и в агенте, и в интерфейсе", () => {
    expect(agentStrip(colored)).toBe("{\"a\":1} FAIL ok");
    expect(stripAnsi(colored)).toBe("{\"a\":1} FAIL ok");
    expect(stripAnsi("обычный текст\nвторая строка")).toBe("обычный текст\nвторая строка");
  });
  it("не попадают в чат и терминал", () => {
    const job = { id: "j", kind: "run", path: "npm_test", status: "failed", result: colored, error: null, command: "npm test" };
    expect(jobReply(job)).toContain("{\"a\":1} FAIL ok");
    expect(jobReply(job)).not.toContain("\u001b");
    expect(outputOf(job)).not.toContain("\u001b");
    expect(outputOf({ ...job, status: "done" })).toBe("{\"a\":1} FAIL ok");
  });
});

describe("провал команды с выводом", () => {
  it("run без текста ошибки получает понятное пояснение, а не «Ошибка агента.»", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const made = await createJob(store, { kind: "run", path: "npm_test" });
    await decideJob(store, made.id, true);
    const job = await pollJob(store);
    await finishJob(store, job!.id, { ok: false, output: "1 failed\n[код выхода 1]" });
    const done = await store.getJob(made.id);
    expect(done).toMatchObject({ status: "failed", result: "1 failed\n[код выхода 1]" });
    expect(done!.error).toContain("ненулевым кодом");
  });
  it("для чтения прежнее сообщение", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const made = await createJob(store, { kind: "read", path: "a.txt" });
    const job = await pollJob(store);
    await finishJob(store, job!.id, { ok: false });
    expect((await store.getJob(made.id))!.error).toBe("Ошибка агента.");
  });
});
