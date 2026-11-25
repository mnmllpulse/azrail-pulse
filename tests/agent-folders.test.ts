import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addRoot, dropRoot, loadExtraRoots, presetFolder, rootProblem, rootsFile } from "../scripts/local-agent/azrail-agent.mjs";
import { AccessError } from "../src/lib/accounts";
import { createJob, decideJob, enableAgent, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";

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

const withRoots = async (names: string[]) => {
  const store = memoryStore();
  await enableAgent(store);
  const state = (await store.getState())!;
  await store.setState({ ...state, root: `/${names[0]}`, roots: names.map((name) => ({ name, path: `/${name}` })) });
  return store;
};

describe("задачи addroot и droproot на сервере", () => {
  it("добавление ждёт «Разрешить», принимает пресеты и полные пути", async () => {
    const store = await withRoots(["p"]);
    for (const path of ["desktop", "documents", "downloads", "C:\\Projects", "D:/work", "/home/me/x", "~/code"]) {
      const job = await createJob(store, { kind: "addroot", path });
      expect(job.status, path).toBe("awaiting_approval");
      expect(job.root).toBeNull();
    }
    const job = await createJob(store, { kind: "addroot", path: "desktop" });
    expect((await decideJob(store, job.id, true)).status).toBe("queued");
  });

  it.each(["", "relative/path", "..", "x", 7, "C:\\" + "a".repeat(400), "C:\\a\u0000b"])("отклоняет addroot %s", async (path) => {
    const store = await withRoots(["p"]);
    await expect(createJob(store, { kind: "addroot", path })).rejects.toThrow(AccessError);
  });

  it("убрать можно только известную папку и не последнюю, без подтверждения", async () => {
    const two = await withRoots(["a", "b"]);
    const job = await createJob(two, { kind: "droproot", path: "b" });
    expect(job.status).toBe("queued");
    await expect(createJob(two, { kind: "droproot", path: "нет" })).rejects.toThrow(/нет/);
    const one = await withRoots(["a"]);
    await expect(createJob(one, { kind: "droproot", path: "a" })).rejects.toThrow(/Последнюю/);
  });
});

describe("правила выдачи папки", () => {
  it.each([
    ["/", /Корень/],
    ["C:/", /Корень/],
    [homedir(), /Домашнюю/],
    ["C:/Windows/System32", /Системные/],
    ["C:\\Program Files\\App", /Системные/],
    ["/etc/nginx", /Системные/],
    [join(homedir(), ".ssh"), /секретные/],
    [join(homedir(), "x", ".git"), /секретные/],
    [join(homedir(), "AppData", "Local"), /секретные/],
    [join(homedir(), ".azrail-browser"), /секретные/],
    [join(homedir(), "p", "node_modules"), /секретные/],
  ])("%s закрыта", (path, text) => {
    expect(rootProblem(path)).toMatch(text);
  });
  it("обычные рабочие папки разрешены", () => {
    expect(rootProblem(join(homedir(), "Desktop"))).toBeNull();
    expect(rootProblem(join(homedir(), "Projects", "site"))).toBeNull();
  });
});

describe("агент: живой список папок", () => {
  const setup = async () => {
    const base = await mkdtemp(join(tmpdir(), "roots-"));
    const home = join(base, "home");
    const initialDir = join(home, "azrail");
    await mkdir(initialDir, { recursive: true });
    const env = { AZRAIL_ROOTS_FILE: join(base, "roots.json") };
    const roots = [{ name: "azrail", path: initialDir }];
    return { base, home, initialDir, env, roots, initial: new Set([initialDir]) };
  };

  it("добавляет папку, даёт уникальное имя и запоминает её, начальную не сохраняет", async () => {
    const t = await setup();
    const proj = join(t.base, "work", "app");
    const proj2 = join(t.base, "other", "app");
    await mkdir(proj, { recursive: true });
    await mkdir(proj2, { recursive: true });
    expect(await addRoot(t.roots, proj, t.env, t.initial)).toMatch(/добавлена: app/);
    expect(await addRoot(t.roots, proj2, t.env, t.initial)).toMatch(/добавлена: app-2/);
    expect(JSON.parse(await readFile(rootsFile(t.env), "utf8"))).toEqual([t.roots[1].path, t.roots[2].path]);
    await expect(addRoot(t.roots, proj, t.env, t.initial)).rejects.toThrow(/уже добавлена/);
  });

  it("отказывает: нет папки, файл, запрещённое место, лимит", async () => {
    const t = await setup();
    const file = join(t.base, "f.txt");
    await writeFile(file, "x");
    await expect(addRoot(t.roots, join(t.base, "нет"), t.env, t.initial)).rejects.toThrow(/нет на компьютере/);
    await expect(addRoot(t.roots, file, t.env, t.initial)).rejects.toThrow(/не папка/);
    await expect(addRoot(t.roots, "/", t.env, t.initial)).rejects.toThrow(/Корень/);
    const full = Array.from({ length: 8 }, (_, i) => ({ name: `r${i}`, path: `/r${i}` }));
    await expect(addRoot(full, t.base, t.env, t.initial)).rejects.toThrow(/Больше 8/);
  });

  it("ссылка на запрещённое место не обходит правила", async () => {
    const t = await setup();
    const secret = join(t.base, ".ssh");
    await mkdir(secret);
    const link = join(t.base, "innocent");
    await symlink(secret, link, "dir");
    await expect(addRoot(t.roots, link, t.env, t.initial)).rejects.toThrow(/секретные/);
  });

  it("убирает папку, последнюю оставляет, после перезапуска добавленные возвращаются", async () => {
    const t = await setup();
    const proj = join(t.base, "work");
    await mkdir(proj);
    await addRoot(t.roots, proj, t.env, t.initial);
    expect(await dropRoot(t.roots, "work", t.env, t.initial)).toMatch(/убрана/);
    await expect(dropRoot(t.roots, "azrail", t.env, t.initial)).rejects.toThrow(/Последнюю/);
    await expect(dropRoot(t.roots, "нет", t.env, t.initial)).rejects.toThrow(/нет/);
    await addRoot(t.roots, proj, t.env, t.initial);
    const restarted = [{ name: "azrail", path: t.initialDir }];
    await loadExtraRoots(restarted, t.env, new Set([t.initialDir]));
    expect(restarted.map((entry) => entry.name)).toEqual(["azrail", "work"]);
  });

  it("повреждённый или устаревший файл не мешает запуску", async () => {
    const t = await setup();
    await writeFile(rootsFile(t.env), "не json");
    await loadExtraRoots(t.roots, t.env, t.initial);
    await writeFile(rootsFile(t.env), JSON.stringify([5, join(t.base, "удалена"), "/"]));
    await loadExtraRoots(t.roots, t.env, t.initial);
    expect(t.roots).toHaveLength(1);
  });

  it("пресеты находят папку в домашней или в OneDrive", async () => {
    const exists = async (path: string) => path === "/od/Desktop" || path === "/home/me/Documents";
    expect(await presetFolder("desktop", { OneDrive: "/od" }, "/home/me", exists)).toBe("/od/Desktop");
    expect(await presetFolder("documents", {}, "/home/me", exists)).toBe("/home/me/Documents");
    await expect(presetFolder("downloads", {}, "/home/me", exists)).rejects.toThrow(/Не нашёл/);
    await expect(presetFolder("секрет" as never, {}, "/home/me", exists)).rejects.toThrow(/Неизвестная/);
  });
});
