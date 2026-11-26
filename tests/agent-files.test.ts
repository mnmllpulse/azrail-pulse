import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { editFile, runJob, searchFiles, trashPath } from "../scripts/local-agent/azrail-agent.mjs";
import { executeLocalTool } from "../src/core/execution-local";
import { AccessError } from "../src/lib/accounts";
import { createJob, enableAgent, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";

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
const enabled = async () => { const s = memoryStore(); await enableAgent(s); return s; };
const tree = async () => {
  const root = await mkdtemp(join(tmpdir(), "az-files-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "app.ts"), "const a = 1;\nconst Title = 'hello';\n");
  await writeFile(join(root, "notes.txt"), "привет\nTitle here\n");
  await mkdir(join(root, "node_modules"));
  await writeFile(join(root, "node_modules", "x.js"), "Title");
  await writeFile(join(root, ".env"), "Title=secret");
  return root;
};

describe("задачи файлов на сервере", () => {
  it("поиск идёт сразу, остальные ждут «Разрешить»", async () => {
    const store = await enabled();
    expect((await createJob(store, { kind: "search", path: "", content: "Title" })).status).toBe("queued");
    for (const input of [
      { kind: "edit", path: "a.ts", content: JSON.stringify({ old: "a", new: "b" }) },
      { kind: "mkdir", path: "new" },
      { kind: "move", path: "a", content: "b" },
      { kind: "trash", path: "a" },
    ]) expect((await createJob(store, input)).status, input.kind).toBe("awaiting_approval");
  });

  it("отклоняет плохие входные данные", async () => {
    const store = await enabled();
    await expect(createJob(store, { kind: "search", path: "", content: "" })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "edit", path: "a", content: "не json" })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "edit", path: "a", content: JSON.stringify({ old: "", new: "x" }) })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "move", path: "a", content: "a" })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "move", path: "a", content: "../x" })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "trash", path: ".env" })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "mkdir", path: "/abs" })).rejects.toBeInstanceOf(AccessError);
  });
});

describe("агент выполняет файловые действия", () => {
  it("поиск находит имена и текст, пропускает секреты и node_modules", async () => {
    const root = await tree();
    const out = await searchFiles(root, "", "title");
    expect(out).toContain("src/app.ts:2:");
    expect(out).toContain("notes.txt:2:");
    expect(out).not.toContain("node_modules");
    expect(out).not.toContain(".env");
    expect(await searchFiles(root, "", "app.ts")).toContain("src/app.ts");
    expect(await searchFiles(root, "", "нет-такого")).toBe("Ничего не найдено.");
  });

  it("правка заменяет одно вхождение и кладёт копию в корзину", async () => {
    const root = await tree();
    const msg = await editFile(root, "src/app.ts", JSON.stringify({ old: "const a = 1;", new: "const a = 2;" }));
    expect(await readFile(join(root, "src/app.ts"), "utf8")).toBe("const a = 2;\nconst Title = 'hello';\n");
    const backup = msg.split("Копия до правки: ")[1]!;
    expect(await readFile(join(root, backup), "utf8")).toContain("const a = 1;");
  });

  it("правка отказывает, если фрагмент не найден или не уникален", async () => {
    const root = await tree();
    await expect(editFile(root, "src/app.ts", JSON.stringify({ old: "нет", new: "x" }))).rejects.toThrow(/не найден/);
    await expect(editFile(root, "src/app.ts", JSON.stringify({ old: "const", new: "let" }))).rejects.toThrow(/2 раз/);
    expect(await readFile(join(root, "src/app.ts"), "utf8")).toContain("const a = 1;");
  });

  it("создаёт папку, перемещает, не затирает существующее", async () => {
    const root = await tree();
    await runJob(root, { kind: "mkdir", path: "proj/sub" });
    expect(await readdir(join(root, "proj"))).toEqual(["sub"]);
    await runJob(root, { kind: "move", path: "notes.txt", content: "proj/notes.txt" });
    expect(await readFile(join(root, "proj/notes.txt"), "utf8")).toContain("привет");
    await writeFile(join(root, "b.txt"), "b");
    await writeFile(join(root, "c.txt"), "c");
    await expect(runJob(root, { kind: "move", path: "b.txt", content: "c.txt" })).rejects.toThrow(/уже существует/);
    await expect(runJob(root, { kind: "move", path: "b.txt", content: "../out.txt" })).rejects.toThrow();
  });

  it("удаление уходит в корзину и восстановимо", async () => {
    const root = await tree();
    const msg = await trashPath(root, "src");
    await expect(readFile(join(root, "src/app.ts"))).rejects.toThrow();
    const backup = msg.split("Вернуть: ")[1]!;
    expect(await readFile(join(root, backup, "app.ts"), "utf8")).toContain("const a = 1;");
    await expect(trashPath(root, ".env")).rejects.toThrow();
  });
});

describe("инструменты миссии для файлов", () => {
  it("правка, перенос, папка и корзина просят разрешение", async () => {
    const store = await enabled();
    const cases: Array<[string, Record<string, unknown>]> = [
      ["local_edit", { path: "a.ts", old: "x", new: "y" }],
      ["local_mkdir", { path: "d" }],
      ["local_move", { path: "a", to: "b" }],
      ["local_trash", { path: "a" }],
    ];
    for (const [tool, input] of cases) {
      const out = (await executeLocalTool(tool as never, input, { store })) as { approvalRequired: boolean; id: string };
      expect(out.approvalRequired, tool).toBe(true);
      expect((await store.getJob(out.id))?.status).toBe("awaiting_approval");
    }
  });

  it("поиск ждёт результат агента", async () => {
    const store = await enabled();
    const state = (await store.getState())!;
    await store.setState({ ...state, lastSeen: Date.now() });
    const sleep = async () => {
      const job = (await store.recentJobs())[0]!;
      await store.updateJob(job.id, { status: "done", result: "a.ts:1: x" });
    };
    const out = (await executeLocalTool("local_search", { query: "x" }, { store, sleep })) as { status: string; output: string };
    expect(out).toMatchObject({ status: "done", output: "a.ts:1: x" });
  });
});
