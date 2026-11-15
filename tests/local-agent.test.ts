import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runJob, resolveInside } from "../scripts/local-agent/azrail-agent.mjs";
import { AccessError } from "../src/lib/accounts";
import {
  agentStatus, authenticateAgent, createJob, decideJob, disableAgent, enableAgent, finishJob, pollJob, safeAgentPath,
  type AgentJob, type AgentState, type AgentStore,
} from "../src/lib/local-agent";

function memoryStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state; },
    async setState(next) { state = next; if (!next) jobs.clear(); },
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

describe("пути агента", () => {
  it.each(["../x", "/etc/passwd", "C:/Windows/a", "~/a", "a/../../b", ".env", "src/.env.local", ".git/config", "node_modules/x/a.js", "k/server.pem"])("%s закрыт", (path) => {
    expect(() => safeAgentPath(path)).toThrow(AccessError);
  });
  it("нормализует обычные пути", () => {
    expect(safeAgentPath("src\\ui\\a.ts")).toBe("src/ui/a.ts");
    expect(safeAgentPath("", true)).toBe("");
  });
});

describe("очередь задач", () => {
  it("выключенный агент не принимает задачи", async () => {
    await expect(createJob(memoryStore(), { kind: "read", path: "a.txt" })).rejects.toThrow(/выключен/);
  });

  it("чтение идёт сразу, запись ждёт подтверждения", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const read = await createJob(store, { kind: "read", path: "a.txt" });
    const write = await createJob(store, { kind: "write", path: "b.txt", content: "x" });
    expect(read.status).toBe("queued");
    expect(write.status).toBe("awaiting_approval");
    expect((await pollJob(store))?.id).toBe(read.id);
    expect(await pollJob(store)).toBeNull();
    await decideJob(store, write.id, true);
    expect((await pollJob(store))?.id).toBe(write.id);
  });

  it("отклонённая запись не выполняется", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const write = await createJob(store, { kind: "write", path: "b.txt", content: "x" });
    await decideJob(store, write.id, false);
    expect(await pollJob(store)).toBeNull();
    await expect(decideJob(store, write.id, true)).rejects.toThrow(/не ждёт/);
  });

  it("токен: верный проходит, чужой и просроченный нет, выключение отзывает", async () => {
    const store = memoryStore();
    const { token } = await enableAgent(store, 1000);
    expect(await authenticateAgent(store, `Bearer ${token}`, 2000)).toBe(true);
    expect(await authenticateAgent(store, `Bearer azagent_${"0".repeat(64)}`, 2000)).toBe(false);
    expect(await authenticateAgent(store, null, 2000)).toBe(false);
    expect(await authenticateAgent(store, `Bearer ${token}`, 1000 + 61 * 60 * 1000)).toBe(false);
    expect(await authenticateAgent(store, `Bearer ${token}`, 2000)).toBe(true);
    await disableAgent(store);
    expect(await authenticateAgent(store, `Bearer ${token}`, 2000)).toBe(false);
  });

  it("новый токен отзывает прежний", async () => {
    const store = memoryStore();
    const first = await enableAgent(store);
    await enableAgent(store);
    expect(await authenticateAgent(store, `Bearer ${first.token}`)).toBe(false);
  });

  it("результат принимается только у выполняемой задачи", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const job = await createJob(store, { kind: "read", path: "a.txt" });
    await expect(finishJob(store, job.id, { ok: true, output: "x" })).rejects.toThrow(/не выполняется/);
    await pollJob(store);
    await finishJob(store, job.id, { ok: true, output: "hello" });
    expect((await agentStatus(store)).jobs[0]).toMatchObject({ status: "done", result: "hello" });
  });

  it("слишком большая запись отклоняется", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await expect(createJob(store, { kind: "write", path: "a", content: "x".repeat(200_001) })).rejects.toThrow(/большой/);
  });
});

describe("локальный агент", () => {
  async function folder() {
    const root = await mkdtemp(join(tmpdir(), "azrail-agent-"));
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src", "a.txt"), "привет");
    await writeFile(join(root, ".env"), "SECRET=1");
    return root;
  }

  it("читает, пишет и показывает список без секретов", async () => {
    const root = await folder();
    expect(await runJob(root, { kind: "read", path: "src/a.txt" })).toBe("привет");
    await runJob(root, { kind: "write", path: "src/new/b.txt", content: "ok" });
    expect(await readFile(join(root, "src", "new", "b.txt"), "utf8")).toBe("ok");
    const listing = await runJob(root, { kind: "list", path: "" });
    expect(listing).toContain("src/");
    expect(listing).not.toContain(".env");
  });

  it("не выходит из папки и не читает секреты", async () => {
    const root = await folder();
    await expect(runJob(root, { kind: "read", path: "../x" })).rejects.toThrow();
    await expect(runJob(root, { kind: "read", path: ".env" })).rejects.toThrow(/закрыт/);
    await expect(runJob(root, { kind: "write", path: ".git/hooks/pre-commit", content: "x" })).rejects.toThrow(/закрыт/);
  });

  it("симлинк наружу отклоняется", async () => {
    const root = await folder();
    const outside = await mkdtemp(join(tmpdir(), "azrail-outside-"));
    await writeFile(join(outside, "secret.txt"), "x");
    await symlink(outside, join(root, "link"), "dir").catch(() => undefined);
    await expect(resolveInside(root, "link/secret.txt")).rejects.toThrow();
  });
});

describe("команда запуска", () => {
  it("не содержит личных путей", async () => {
    const { agentCommand } = await import("../ui/local-agent");
    const text = agentCommand("https://example.workers.dev", "azagent_x");
    expect(text).toContain("AZRAIL_AGENT_TOKEN=\"azagent_x\"");
    expect(text).not.toMatch(/Tech No/);
  });
});
