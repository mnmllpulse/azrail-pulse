import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pickRoot, resolveRoots } from "../scripts/local-agent/azrail-agent.mjs";
import {
  agentRoots, agentStatus, authenticateAgent, createJob, enableAgent, publicJob, sanitizeAgentRoots,
  type AgentJob, type AgentState, type AgentStore,
} from "../src/lib/local-agent";
import { agentCommand } from "../ui/agent-paths";

function memoryStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state; },
    async setState(next) { state = next; },
    async insertJob(job) { jobs.set(job.id, { ...job }); },
    async getJob(id) { return jobs.get(id) ?? null; },
    async updateJob() {},
    async claimQueued() { return null; },
    async recentJobs() { return [...jobs.values()]; },
  };
}
const header = (value: unknown) => encodeURIComponent(JSON.stringify(value));

describe("заголовок X-Agent-Roots", () => {
  it("принимает список, отбрасывает дубликаты, управляющие символы и лишнее", () => {
    const roots = sanitizeAgentRoots(header([{ name: "a", path: "C:\\a" }, { name: "a", path: "C:\\b" }, { name: "b\u0001x", path: "C:\\c" }, { name: "c", path: "" }, { name: "d", path: "D:\\d" }]));
    expect(roots).toEqual([{ name: "a", path: "C:\\a" }, { name: "d", path: "D:\\d" }]);
    expect(sanitizeAgentRoots(header(Array.from({ length: 20 }, (_, i) => ({ name: `n${i}`, path: `P${i}` }))))).toHaveLength(8);
  });
  it("мусор даёт null", () => {
    for (const bad of [null, "", "%E0", "not json", header({ a: 1 }), header([]), "x".repeat(9000)]) expect(sanitizeAgentRoots(bad as string)).toBeNull();
  });
  it("старый агент с одной папкой получает имя из пути", () => {
    expect(agentRoots({ tokenHash: "", expiresAt: 0, lastSeen: null, root: "C:\\Users\\Tech No\\azrail-pulse" })).toEqual([{ name: "azrail-pulse", path: "C:\\Users\\Tech No\\azrail-pulse" }]);
    expect(agentRoots({ tokenHash: "", expiresAt: 0, lastSeen: null })).toEqual([]);
  });
});

describe("задачи с выбором папки", () => {
  const connect = async () => {
    const store = memoryStore();
    const { token } = await enableAgent(store, 1000);
    await authenticateAgent(store, `Bearer ${token}`, 2000, null, header([{ name: "app", path: "C:\\app" }, { name: "docs", path: "C:\\docs" }]));
    return store;
  };
  it("статус показывает папки, первая становится основной", async () => {
    const status = await agentStatus(await connect(), 3000);
    expect(status.roots.map((entry) => entry.name)).toEqual(["app", "docs"]);
    expect(status.root).toBe("C:\\app");
  });
  it("задача сохраняет выбранную папку и показывает её в публичном виде", async () => {
    const job = await createJob(await connect(), { kind: "list", path: "", root: "docs" }, 3000);
    expect(job.root).toBe("docs");
    expect(publicJob(job)).toMatchObject({ root: "docs" });
  });
  it("без поля root задача не привязана к папке", async () => {
    const job = await createJob(await connect(), { kind: "list", path: "" }, 3000);
    expect(job.root).toBeNull();
    expect(publicJob(job)).not.toHaveProperty("root");
  });
  it("неизвестная папка и нестрока отклоняются", async () => {
    const store = await connect();
    await expect(createJob(store, { kind: "list", path: "", root: "secret" }, 3000)).rejects.toThrow(/нет папки/);
    await expect(createJob(store, { kind: "list", path: "", root: 5 }, 3000)).rejects.toThrow(/строкой/);
  });
  it("пока агент не назвал папки, выбор папки отклоняется", async () => {
    const store = memoryStore();
    await enableAgent(store, 1000);
    await expect(createJob(store, { kind: "list", path: "", root: "app" }, 3000)).rejects.toThrow(/ещё не сообщил/);
  });
  it("перезапуск ключа сбрасывает список папок", async () => {
    const store = await connect();
    await enableAgent(store, 5000);
    expect((await agentStatus(store, 6000)).roots).toEqual([]);
  });
});

describe("агент: список папок", () => {
  it("имена из конца пути, повтор получает суффикс, дубликаты путей схлопываются", async () => {
    const base = await mkdtemp(join(tmpdir(), "azr-roots-"));
    for (const name of ["one/app", "two/app", "docs"]) await mkdir(join(base, name), { recursive: true });
    const roots = await resolveRoots({ AZRAIL_ROOTS: [join(base, "one/app"), join(base, "two/app"), join(base, "docs"), join(base, "docs")].join(";") }, "/");
    expect(roots.map((entry: { name: string }) => entry.name)).toEqual(["app", "app-2", "docs"]);
  });
  it("без AZRAIL_ROOTS берёт AZRAIL_ROOT, затем текущую папку", async () => {
    const base = await mkdtemp(join(tmpdir(), "azr-root-"));
    expect((await resolveRoots({ AZRAIL_ROOT: base }, "/"))[0].path).toContain("azr-root-");
    expect((await resolveRoots({}, base))[0].path).toContain("azr-root-");
  });
  it("несуществующая папка — ошибка при запуске", async () => {
    await expect(resolveRoots({ AZRAIL_ROOTS: "/нет/такой/папки" }, "/")).rejects.toThrow();
  });
  it("pickRoot: без имени первая, неизвестное имя — ошибка", () => {
    const roots = [{ name: "a", path: "/a" }, { name: "b", path: "/b" }];
    expect(pickRoot(roots, null).path).toBe("/a");
    expect(pickRoot(roots, "b").path).toBe("/b");
    expect(() => pickRoot(roots, "c")).toThrow(/нет папки/);
  });
});

describe("команда запуска", () => {
  it("несколько папок через ; уходят в AZRAIL_ROOTS", () => {
    const text = agentCommand("https://a.dev", "azagent_x", "C:\\a; D:\\b");
    expect(text).toContain("$env:AZRAIL_ROOTS='C:\\a; D:\\b'");
    expect(text).not.toContain("AZRAIL_ROOT=");
  });
});
