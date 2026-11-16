import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authenticateAgent, createJob, decideJob, enableAgent, finishJob, pollJob,
  type AgentJob, type AgentState, type AgentStore,
} from "../src/lib/local-agent";

function memoryStore(): AgentStore & { jobs: Map<string, AgentJob> } {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    jobs,
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

async function body(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

const store = memoryStore();
let server: Server;
let root: string;
let outside: string;
let url = "";
let token = "";
let agent: ChildProcess | null = null;
let agentLog = "";

async function until(check: () => boolean, ms = 25_000): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`Таймаут ожидания. Журнал агента:\n${agentLog}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
const terminal = (job: AgentJob) => ["done", "failed", "rejected", "expired"].includes(store.jobs.get(job.id)!.status);

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "azrail-e2e-root-"));
  outside = await mkdtemp(join(tmpdir(), "azrail-e2e-outside-"));
  await writeFile(join(outside, "secret.txt"), "за пределами папки", "utf8");
  await writeFile(join(root, "hello.txt"), "привет из папки", "utf8");
  await writeFile(join(root, ".env"), "TOKEN=не-для-чата", "utf8");
  execFileSync("git", ["init", "-q"], { cwd: root });
  server = createServer(async (req, res) => {
    const send = (status: number, data: unknown) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
    try {
      if (!(await authenticateAgent(store, req.headers.authorization ?? null))) return send(401, { error: "auth" });
      const path = new URL(req.url ?? "/", "http://x").pathname;
      if (path === "/api/agent/poll") {
        const job = await pollJob(store);
        return send(200, { job: job ? { id: job.id, kind: job.kind, path: job.path, content: job.content } : null });
      }
      const result = path.match(/^\/api\/agent\/jobs\/([a-f0-9-]{36})\/result$/);
      if (result && req.method === "POST") { await finishJob(store, result[1], await body(req)); return send(200, { ok: true }); }
      return send(404, {});
    } catch (error) { return send(500, { error: String(error) }); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  token = (await enableAgent(store)).token;
});

afterAll(async () => {
  agent?.kill();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe("сквозной сценарий: сервер ↔ настоящий агент ↔ папка", () => {
  it("чтение, запись, команда, закрытые пути и подтверждения", async () => {
    const read = await createJob(store, { kind: "read", path: "hello.txt" });
    const write = await createJob(store, { kind: "write", path: "out/new.txt", content: "записано агентом" });
    const refused = await createJob(store, { kind: "write", path: "out/refused.txt", content: "не должно появиться" });
    const run = await createJob(store, { kind: "run", path: "node_version" });
    const status = await createJob(store, { kind: "run", path: "git_status" });

    expect(store.jobs.get(read.id)!.status).toBe("queued");
    for (const job of [write, refused, run, status]) expect(store.jobs.get(job.id)!.status).toBe("awaiting_approval");

    await decideJob(store, write.id, true);
    await decideJob(store, refused.id, false);
    await decideJob(store, run.id, true);
    await decideJob(store, status.id, true);

    // Обход сервера: задачи вставлены напрямую, защита должна сработать уже на стороне агента.
    const now = Date.now();
    const sneaky: AgentJob[] = ["../" + outside.split(/[\\/]/).pop() + "/secret.txt", ".env", "hello.txt/../../x"].map((path, i) => ({
      id: `00000000-0000-4000-8000-00000000000${i}`, kind: "read", path, content: null, status: "queued", result: null, error: null, createdAt: now, updatedAt: now,
    } as unknown as AgentJob));
    for (const job of sneaky) await store.insertJob(job);

    agent = spawn(process.execPath, ["scripts/local-agent/azrail-agent.mjs"], {
      env: { ...process.env, AZRAIL_URL: url, AZRAIL_AGENT_TOKEN: token, AZRAIL_ROOT: root },
    });
    agent.stdout?.on("data", (d) => { agentLog += String(d); });
    agent.stderr?.on("data", (d) => { agentLog += String(d); });

    const mustFinish = [read, write, run, status, ...sneaky];
    await until(() => mustFinish.every(terminal));

    const done = (job: AgentJob) => store.jobs.get(job.id)!;
    expect(done(read).status).toBe("done");
    expect(done(read).result).toBe("привет из папки");

    expect(done(write).status).toBe("done");
    expect(await readFile(join(root, "out/new.txt"), "utf8")).toBe("записано агентом");

    expect(done(refused).status).toBe("rejected");
    expect(existsSync(join(root, "out/refused.txt"))).toBe(false);

    expect(done(run).status).toBe("done");
    expect(done(run).result).toMatch(/v\d+\.\d+\.\d+/);
    expect(done(status).status).toBe("done");
    expect(done(status).result).toContain("[код выхода 0]");

    for (const job of sneaky) {
      expect(done(job).status).toBe("failed");
      expect(done(job).result ?? "").not.toContain("не-для-чата");
      expect(done(job).result ?? "").not.toContain("за пределами папки");
    }
    expect(agentLog).not.toContain(token);
  }, 45_000);

  it("после закрытия сессии агент получает 401 и завершается", async () => {
    const state = (await store.getState())!;
    await store.setState({ ...state, expiresAt: Date.now() - 1 } as AgentState);
    await until(() => agent!.exitCode !== null, 10_000);
    expect(agent!.exitCode).toBe(0);
    expect(agentLog).toContain("Сессия агента закончилась");
  }, 15_000);

  it("сервер отклоняет закрытые пути до очереди", async () => {
    await store.setState({ ...(await store.getState())!, expiresAt: Date.now() + 60_000 } as AgentState);
    for (const path of ["../x", ".env", "a/../../b", "C:\\Windows\\win.ini", "/etc/passwd", ".git/config"]) {
      await expect(createJob(store, { kind: "read", path })).rejects.toThrow();
    }
  });
});
