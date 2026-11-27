import { describe, expect, it } from "vitest";
import { executeLocalTool } from "../src/core/execution-local";
import { AccessError } from "../src/lib/accounts";
import { ALWAYS_SCOPES, activeTrust, setAlways, agentStatus, createJob, enableAgent, setTrust, trustScopeOf, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";

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
const NOW = 1_000_000;
const ready = async () => { const s = memoryStore(); await enableAgent(s, NOW); return s; };
const status = async (store: AgentStore, input: Parameters<typeof createJob>[1], now = NOW + 1000) => (await createJob(store, input, now)).status;

describe("область доверия", () => {
  it("сопоставляет задачи областям, addroot и droproot никогда", () => {
    expect(trustScopeOf("write", "a")).toBe("files");
    expect(trustScopeOf("mkdir", "a")).toBe("files");
    for (const kind of ["edit", "move", "trash"]) expect(trustScopeOf(kind, "a"), kind).toBeNull();
    expect(trustScopeOf("shell", "npm i")).toBe("shell");
    expect(trustScopeOf("run", "npm_test")).toBe("shell");
    expect(trustScopeOf("browser", "click")).toBe("browser");
    expect(trustScopeOf("browser", "open")).toBeNull();
    expect(trustScopeOf("addroot", "desktop")).toBeNull();
    expect(trustScopeOf("droproot", "x")).toBeNull();
  });
});

describe("режим доверия на сервере", () => {
  it("без доверия всё ждёт «Разрешить»", async () => {
    const store = await ready();
    expect(await status(store, { kind: "mkdir", path: "d" })).toBe("awaiting_approval");
  });

  it("доверие к файлам пропускает файлы, но не терминал и не браузер", async () => {
    const store = await ready();
    await setTrust(store, { scopes: ["files"], minutes: 15 }, NOW);
    expect(await status(store, { kind: "mkdir", path: "d" })).toBe("queued");
    expect(await status(store, { kind: "write", path: "d/a.txt", content: "x" })).toBe("queued");
    for (const kind of ["trash", "edit", "move"] as const) expect(await status(store, { kind, path: "d", content: kind === "move" ? "e" : kind === "edit" ? JSON.stringify({ old: "a", new: "b" }) : undefined }), kind).toBe("awaiting_approval");
    expect(await status(store, { kind: "shell", path: "npm install" })).toBe("awaiting_approval");
    expect(await status(store, { kind: "browser", path: "click", content: JSON.stringify({ ref: 1 }) })).toBe("awaiting_approval");
  });

  it("addroot остаётся с «Разрешить» даже при полном доверии", async () => {
    const store = await ready();
    await setTrust(store, { scopes: ["files", "browser", "shell"], minutes: 60 }, NOW);
    expect(await status(store, { kind: "addroot", path: "desktop" })).toBe("awaiting_approval");
    expect(await status(store, { kind: "shell", path: "npm test" })).toBe("queued");
    expect(await status(store, { kind: "browser", path: "type", content: JSON.stringify({ ref: 1, text: "x" }) })).toBe("queued");
  });

  it("опасная команда блокируется и при доверии", async () => {
    const store = await ready();
    await setTrust(store, { scopes: ["shell"], minutes: 15 }, NOW);
    await expect(createJob(store, { kind: "shell", path: "rm -rf /" }, NOW + 1000)).rejects.toBeInstanceOf(AccessError);
  });

  it("доверие заканчивается по времени", async () => {
    const store = await ready();
    await setTrust(store, { scopes: ["files"], minutes: 15 }, NOW);
    expect(await status(store, { kind: "mkdir", path: "d" }, NOW + 15 * 60_000 + 1)).toBe("awaiting_approval");
    expect(activeTrust(await store.getState(), NOW + 15 * 60_000 + 1)).toBeNull();
  });

  it("не длиннее сессии агента, новая сессия сбрасывает доверие", async () => {
    const store = await ready();
    const trust = await setTrust(store, { scopes: ["files"], minutes: 60 }, NOW + 50 * 60_000);
    expect(trust!.until).toBe((await store.getState())!.expiresAt);
    await enableAgent(store, NOW + 55 * 60_000);
    expect(activeTrust(await store.getState(), NOW + 56 * 60_000)).toBeNull();
  });

  it("проверяет входные данные и умеет выключаться", async () => {
    const store = await ready();
    for (const input of [{ scopes: ["files"], minutes: 0 }, { scopes: ["files"], minutes: 61 }, { scopes: ["files"] }, { scopes: ["all"], minutes: 5 }, { minutes: 5 }, { scopes: "files", minutes: 5 }]) {
      await expect(setTrust(store, input, NOW), JSON.stringify(input)).rejects.toBeInstanceOf(AccessError);
    }
    await setTrust(store, { scopes: ["files"], minutes: 5 }, NOW);
    expect((await agentStatus(store, NOW + 1)).trust).toMatchObject({ scopes: ["files"] });
    expect(await setTrust(store, { scopes: [] }, NOW)).toBeNull();
    expect((await agentStatus(store, NOW + 1)).trust).toBeNull();
  });

  it("выключенному агенту доверие не выдаётся", async () => {
    await expect(setTrust(memoryStore(), { scopes: ["files"], minutes: 5 }, NOW)).rejects.toBeInstanceOf(AccessError);
  });
});

describe("миссия при доверии", () => {
  it("правка выполняется сразу и возвращает результат без approval", async () => {
    const store = await ready();
    const state = (await store.getState())!;
    await store.setState({ ...state, lastSeen: Date.now(), expiresAt: Date.now() + 3_600_000 });
    await setTrust(store, { scopes: ["files"], minutes: 15 }, Date.now());
    const sleep = async () => {
      const job = (await store.recentJobs(5)).find((item) => item.status === "queued")!;
      await store.updateJob(job.id, { status: "done", result: "Папка создана" });
    };
    const out = (await executeLocalTool("local_mkdir", { path: "proj" }, { store, sleep })) as Record<string, unknown>;
    expect(out).toMatchObject({ status: "done", trusted: true, output: "Папка создана" });
    expect(out.approvalRequired).toBeUndefined();
  });

  it("без доверия остаётся пауза с approval", async () => {
    const store = await ready();
    const state = (await store.getState())!;
    await store.setState({ ...state, expiresAt: Date.now() + 3_600_000 });
    expect(await executeLocalTool("local_mkdir", { path: "proj" }, { store })).toMatchObject({ status: "prepared", approvalRequired: true });
  });
});

describe("«всегда» для файлов", () => {
  it("постоянное разрешение пропускает файлы, но не терминал, и переживает новую сессию", async () => {
    const store = await ready();
    expect(await setAlways(store, ["files"], NOW)).toEqual(["files"]);
    expect(await status(store, { kind: "mkdir", path: "a" })).toBe("queued");
    expect(await status(store, { kind: "trash", path: "a" })).toBe("awaiting_approval");
    expect(await status(store, { kind: "shell", path: "npm test" })).toBe("awaiting_approval");
    expect(await status(store, { kind: "addroot", path: "desktop" })).toBe("awaiting_approval");
    await enableAgent(store, NOW + 5 * 60 * 60_000);
    expect((await store.getState())!.always).toEqual(["files"]);
    expect(await status(store, { kind: "mkdir", path: "d" }, NOW + 5 * 60 * 60_000 + 1)).toBe("queued");
  });

  it("навсегда нельзя разрешить терминал и браузер, можно отозвать", async () => {
    const store = await ready();
    expect(ALWAYS_SCOPES).toEqual(["files"]);
    for (const scopes of [["shell"], ["browser"], ["files", "shell"], "files", undefined]) await expect(setAlways(store, scopes, NOW)).rejects.toBeInstanceOf(AccessError);
    await setAlways(store, ["files"], NOW);
    expect(await setAlways(store, [], NOW)).toEqual([]);
    expect(await status(store, { kind: "mkdir", path: "d" })).toBe("awaiting_approval");
  });

  it("выключение агента снимает постоянное разрешение", async () => {
    const store = await ready();
    await setAlways(store, ["files"], NOW);
    const { disableAgent } = await import("../src/lib/local-agent");
    await disableAgent(store);
    await enableAgent(store, NOW + 10);
    expect((await store.getState())!.always).toEqual([]);
  });
});
