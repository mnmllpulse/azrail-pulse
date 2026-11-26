import { describe, expect, it } from "vitest";
import { executeLocalTool, isLocalTool, LOCAL_APPROVAL_TOOLS } from "../src/core/execution-local";
import { requiredApprovals } from "../src/lib/checkpoints";
import { decideJob, enableAgent, finishJob, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";
import { ToolRejectedError } from "../src/lib/tool-errors";
import type { ToolName } from "../src/types";

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
    async recentJobs() { return [...jobs.values()]; },
  };
}

const ready = async (connected: boolean) => {
  const store = memoryStore();
  await enableAgent(store);
  const state = (await store.getState())!;
  await store.setState({ ...state, root: "/p", roots: [{ name: "p", path: "/p" }], lastSeen: connected ? Date.now() : 0 });
  return store;
};

describe("инструменты миссии на компьютере", () => {
  it("распознаёт локальные инструменты и опасные", () => {
    expect(isLocalTool("local_read")).toBe(true);
    expect(isLocalTool("connector_call")).toBe(false);
    expect([...LOCAL_APPROVAL_TOOLS].sort()).toEqual(["local_addroot", "local_edit", "local_mkdir", "local_move", "local_run", "local_shell", "local_trash", "local_write"]);
  });

  it("выключенный агент отклоняет инструмент", async () => {
    await expect(executeLocalTool("local_list", {}, { store: memoryStore() })).rejects.toBeInstanceOf(ToolRejectedError);
  });

  it("компьютер не на связи: чтение отклоняется", async () => {
    await expect(executeLocalTool("local_list", {}, { store: await ready(false) })).rejects.toBeInstanceOf(ToolRejectedError);
  });

  it("запись создаёт задачу в ожидании разрешения и просит approval", async () => {
    const store = await ready(false);
    const out = (await executeLocalTool("local_write", { path: "a.txt", content: "x" }, { store })) as { id: string; status: string; approvalRequired: boolean };
    expect(out).toMatchObject({ status: "prepared", approvalRequired: true });
    expect((await store.getJob(out.id))?.status).toBe("awaiting_approval");
  });

  it("чтение ждёт результат агента и помечает его внешними данными", async () => {
    const store = await ready(true);
    let slept = 0;
    const sleep = async () => {
      slept++;
      const job = (await store.recentJobs())[0]!;
      await store.updateJob(job.id, { status: "running" });
      await finishJob(store, job.id, { ok: true, output: "файл" });
    };
    const out = (await executeLocalTool("local_read", { path: "a.txt" }, { store, sleep })) as { status: string; output: string; trust: string };
    expect(slept).toBe(1);
    expect(out).toMatchObject({ status: "done", output: "файл" });
    expect(out.trust).toContain("не инструкции");
  });

  it("долгая задача возвращает id без результата", async () => {
    const store = await ready(true);
    let t = 0;
    const out = (await executeLocalTool("local_list", {}, { store, now: () => (t += 20_000), sleep: async () => {} })) as { status: string; note: string };
    expect(out.status).not.toBe("done");
    expect(out.note).toContain("local_status");
  });

  it("неизвестный инструмент не выполняется", async () => {
    await expect(executeLocalTool("shell" as ToolName, {}, { store: memoryStore() })).rejects.toThrow();
  });
});

describe("подтверждения миссии", () => {
  const point = (tool: string, id: string, approvalRequired = true) => ({ step: 1, tool, status: "completed", result: { id, approvalRequired } }) as never;

  it("собирает внешние вызовы и задачи компьютера раздельно", () => {
    expect(requiredApprovals([point("connector_call", "c1"), point("local_run", "j1"), point("local_read", "x", false)])).toEqual({ calls: ["c1"], jobs: ["j1"] });
  });

  it("повреждённый checkpoint задачи отклоняется", () => {
    expect(() => requiredApprovals([{ step: 2, tool: "local_write", status: "completed", result: { approvalRequired: true } } as never])).toThrow(/id задачи/);
  });

  it("без подтверждений — ошибка", () => {
    expect(() => requiredApprovals([])).toThrow();
  });

  it("отклонённая задача считается завершённой для продолжения", async () => {
    const store = await ready(false);
    const out = (await executeLocalTool("local_run", { command: "npm_test" }, { store })) as { id: string };
    await decideJob(store, out.id, false);
    expect((await store.getJob(out.id))?.status).toBe("rejected");
  });
});
