import { describe, expect, it } from "vitest";
import { executeLocalTool } from "../src/core/execution-local";
import { ToolRejectedError } from "../src/lib/tool-errors";
import { enableAgent, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";
import { requiredApprovals } from "../src/lib/checkpoints";

function memoryStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state && { ...state }; },
    async setState(next) { state = next; },
    async insertJob(job) { jobs.set(job.id, { ...job }); },
    async getJob(id) { return jobs.get(id) ? { ...jobs.get(id)! } : null; },
    async updateJob(id, patch) { Object.assign(jobs.get(id)!, patch); },
    async claimQueued() { return null; },
    async recentJobs() { return [...jobs.values()].reverse(); },
  };
}
const online = async (store: AgentStore, roots: Array<{ name: string; path: string }>) => {
  const state = (await store.getState())!;
  await store.setState({ ...state, root: roots[0]!.path, roots, lastSeen: Date.now(), expiresAt: Date.now() + 3_600_000 });
};
const base = [{ name: "azrail-pulse", path: "/p" }];
const desktop = { name: "Desktop", path: "/home/u/Desktop" };

describe("автоподключение папок", () => {
  it("«Рабочий стол/…» без папки просит один «Разрешить» на addroot", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await online(store, base);
    const out = (await executeLocalTool("local_mkdir", { path: "Рабочий стол/test-agent" }, { store })) as { approvalRequired: boolean; id: string; kind: string; path: string };
    expect(out).toMatchObject({ approvalRequired: true, kind: "addroot", path: "desktop" });
    expect((await store.getJob(out.id))?.status).toBe("awaiting_approval");
  });

  it("когда папка уже подключена, префикс заменяется на root", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await online(store, [...base, desktop]);
    const out = (await executeLocalTool("local_mkdir", { path: "Рабочий стол/test-agent" }, { store })) as { approvalRequired: boolean; id: string };
    const job = (await store.getJob(out.id))!;
    expect(job).toMatchObject({ kind: "mkdir", path: "test-agent", root: "Desktop" });
  });

  it("root словом и английское имя тоже работают", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await online(store, [...base, desktop]);
    await executeLocalTool("local_mkdir", { path: "a", root: "рабочий стол" }, { store });
    await executeLocalTool("local_mkdir", { path: "Desktop\\b" }, { store });
    const jobs = (await store.recentJobs(10)).filter((job) => job.kind === "mkdir");
    expect(jobs.map((job) => [job.path, job.root]).sort()).toEqual([["a", "Desktop"], ["b", "Desktop"]]);
  });

  it("обычный путь не трогается", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await online(store, base);
    const out = (await executeLocalTool("local_mkdir", { path: "src/new" }, { store })) as { id: string };
    expect(await store.getJob(out.id)).toMatchObject({ kind: "mkdir", path: "src/new", root: null });
  });

  it("после выполненного addroot ждёт появления папки и не создаёт вторую задачу", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await online(store, base);
    await store.insertJob({ id: "00000000-0000-4000-8000-000000000001", kind: "addroot", path: "desktop", content: null, status: "done", result: "ok", error: null, createdAt: 1, updatedAt: 1, root: null } as AgentJob);
    let slept = 0;
    const sleep = async () => {
      slept++;
      const state = (await store.getState())!;
      await store.setState({ ...state, roots: [...base, desktop] });
    };
    await executeLocalTool("local_mkdir", { path: "Рабочий стол/x" }, { store, sleep });
    expect(slept).toBe(1);
    expect((await store.recentJobs(10)).filter((job) => job.kind === "addroot")).toHaveLength(1);
  });

  it("чтение с рабочего стола тоже ставит паузу на доступ", async () => {
    const store = memoryStore();
    await enableAgent(store);
    await online(store, base);
    const out = await executeLocalTool("local_list", { path: "Документы" }, { store });
    expect(out).toMatchObject({ approvalRequired: true, kind: "addroot", path: "documents" });
  });
});

describe("автовключение", () => {
  it("привязанный компьютер включается сам и ждёт связи", async () => {
    const store = memoryStore();
    let enabled = 0;
    let sleeps = 0;
    const autoEnable = async () => { enabled++; await enableAgent(store); return true; };
    const sleep = async () => {
      sleeps++;
      if (sleeps === 1) return online(store, [...base, desktop]);
      const job = (await store.recentJobs(5))[0]!;
      await store.updateJob(job.id, { status: "done", result: "файлы" });
    };
    const out = await executeLocalTool("local_list", { path: "", root: "Desktop" }, { store, autoEnable, sleep });
    expect(enabled).toBe(1);
    expect(out).toMatchObject({ status: "done", output: "файлы" });
  });

  it("не привязан: понятная причина", async () => {
    await expect(executeLocalTool("local_list", {}, { store: memoryStore(), autoEnable: async () => false })).rejects.toBeInstanceOf(ToolRejectedError);
  });
});

describe("пауза для запроса доступа", () => {
  it("checkpoint чтения с запросом доступа попадает в список ожиданий, обычное чтение нет", () => {
    const point = (tool: string, result: unknown) => ({ step: 1, tool, status: "completed", result }) as never;
    expect(requiredApprovals([point("local_list", { id: "j1", approvalRequired: true }), point("local_read", { id: "x", status: "done" })])).toEqual({ calls: [], jobs: ["j1"] });
  });
});
