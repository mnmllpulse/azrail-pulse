import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeBrowser, runBrowser } from "../scripts/local-agent/azrail-agent.mjs";
import { executeLocalTool } from "../src/core/execution-local";
import { AccessError } from "../src/lib/accounts";
import { normalizeBrowserArgs } from "../src/lib/browser-actions";
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

function fakePlaywright(opts: { inputKind?: string; count?: number } = {}) {
  const calls: string[] = [];
  let url = "about:blank";
  const locator = {
    first: () => locator,
    count: async () => opts.count ?? 1,
    click: async () => { calls.push("click"); },
    fill: async (text: string) => { calls.push(`fill:${text}`); },
    press: async (key: string) => { calls.push(`press:${key}`); },
    evaluate: async () => opts.inputKind ?? "text|",
    setInputFiles: async (file: string) => { calls.push(`upload:${file}`); },
  };
  const page = {
    url: () => url,
    goto: async (to: string) => { url = to; calls.push(`goto:${to}`); },
    title: async () => "Тест",
    evaluate: async (fn: unknown) => (String(fn).includes("querySelectorAll") ? ["[1] кнопка «Опубликовать»"] : "Текст страницы"),
    waitForLoadState: async () => undefined,
    locator: () => locator,
    mouse: { wheel: async (_x: number, y: number) => { calls.push(`wheel:${y}`); } },
    keyboard: { press: async (key: string) => { calls.push(`key:${key}`); } },
    screenshot: async ({ path }: { path: string }) => { await writeFile(path, "png"); calls.push("shot"); },
  };
  const context = { pages: () => [page], newPage: async () => page, route: async () => undefined, close: async () => { calls.push("closed"); } };
  return { calls, loader: async () => ({ chromium: { launchPersistentContext: async () => context } }) };
}
const job = (path: string, content: unknown = {}) => ({ path, content: JSON.stringify(content) });

afterEach(async () => { await closeBrowser(); });

describe("аргументы действий браузера", () => {
  it("нормализует и проверяет", () => {
    expect(JSON.parse(normalizeBrowserArgs("open", { url: " https://Example.com/a " }))).toEqual({ url: "https://example.com/a" });
    expect(JSON.parse(normalizeBrowserArgs("type", { ref: "3", text: "привет", submit: true }))).toEqual({ ref: 3, text: "привет", submit: true });
    expect(JSON.parse(normalizeBrowserArgs("scroll", { dy: 99999 }))).toEqual({ dy: 3000 });
    expect(JSON.parse(normalizeBrowserArgs("upload", { ref: 2, file: "video.mp4" }))).toEqual({ ref: 2, file: "video.mp4" });
  });
  it("отклоняет плохое", () => {
    for (const [action, input] of [["open", { url: "http://localhost" }], ["open", {}], ["click", {}], ["click", { ref: 0 }], ["click", { ref: 1.5 }], ["type", { ref: 1, text: "x".repeat(2001) }], ["press", { key: "Delete" }], ["upload", { ref: 1, file: ".env" }], ["upload", { ref: 1, file: "../x" }], ["evaluate", {}]] as const) {
      expect(() => normalizeBrowserArgs(action, input), action).toThrow(AccessError);
    }
  });
});

describe("задача browser на сервере", () => {
  it("просмотр идёт сразу, клик и ввод ждут «Разрешить»", async () => {
    const store = await enabled();
    expect((await createJob(store, { kind: "browser", path: "open", content: JSON.stringify({ url: "https://example.com" }) })).status).toBe("queued");
    expect((await createJob(store, { kind: "browser", path: "snapshot" })).status).toBe("queued");
    for (const [path, content] of [["click", { ref: 1 }], ["type", { ref: 1, text: "a" }], ["press", { key: "Enter" }], ["upload", { ref: 1, file: "a.mp4" }]] as const) {
      expect((await createJob(store, { kind: "browser", path, content: JSON.stringify(content) })).status, path).toBe("awaiting_approval");
    }
  });
  it("плохое действие не попадает в очередь", async () => {
    const store = await enabled();
    await expect(createJob(store, { kind: "browser", path: "evaluate" })).rejects.toBeInstanceOf(AccessError);
    await expect(createJob(store, { kind: "browser", path: "open", content: "не json" })).rejects.toBeInstanceOf(AccessError);
  });
});

describe("инструменты миссии для браузера", () => {
  it("local_browser не принимает клики, local_browser_act не принимает просмотр", async () => {
    const store = await enabled();
    const state = (await store.getState())!;
    await store.setState({ ...state, lastSeen: Date.now() });
    await expect(executeLocalTool("local_browser", { action: "click", ref: 1 }, { store })).rejects.toThrow(/local_browser_act/);
    await expect(executeLocalTool("local_browser_act", { action: "open", url: "https://example.com" }, { store })).rejects.toThrow(/click, type/);
  });
  it("local_browser_act просит разрешение", async () => {
    const store = await enabled();
    const out = (await executeLocalTool("local_browser_act", { action: "click", ref: 4 }, { store })) as { approvalRequired: boolean; id: string };
    expect(out.approvalRequired).toBe(true);
    expect((await store.getJob(out.id))?.status).toBe("awaiting_approval");
  });
});

describe("агент управляет страницей", () => {
  const root = () => mkdtemp(join(tmpdir(), "az-br-"));

  it("открывает адрес и отдаёт нумерованные элементы", async () => {
    const fake = fakePlaywright();
    const out = await runBrowser(await root(), job("open", { url: "https://example.com" }), { loader: fake.loader });
    expect(out).toContain("[1] кнопка «Опубликовать»");
    expect(fake.calls).toContain("goto:https://example.com");
  });

  it("клик, ввод с отправкой, клавиша", async () => {
    const fake = fakePlaywright();
    const dir = await root();
    await runBrowser(dir, job("open", { url: "https://example.com" }), { loader: fake.loader });
    await runBrowser(dir, job("click", { ref: 1 }), { loader: fake.loader });
    await runBrowser(dir, job("type", { ref: 1, text: "Заголовок", submit: true }), { loader: fake.loader });
    await runBrowser(dir, job("press", { key: "Tab" }), { loader: fake.loader });
    expect(fake.calls).toEqual(expect.arrayContaining(["click", "fill:Заголовок", "press:Enter", "key:Tab"]));
  });

  it("пароли не вводит", async () => {
    const fake = fakePlaywright({ inputKind: "password|" });
    await expect(runBrowser(await root(), job("type", { ref: 1, text: "secret" }), { loader: fake.loader })).rejects.toThrow(/Пароли/);
    expect(fake.calls).not.toContain("fill:secret");
  });

  it("нет элемента — понятная ошибка", async () => {
    const fake = fakePlaywright({ count: 0 });
    await expect(runBrowser(await root(), job("click", { ref: 9 }), { loader: fake.loader })).rejects.toThrow(/snapshot заново/);
  });

  it("загрузка берёт файл только внутри папки", async () => {
    const fake = fakePlaywright();
    const dir = await root();
    await writeFile(join(dir, "video.mp4"), "x");
    await runBrowser(dir, job("open", { url: "https://example.com" }), { loader: fake.loader });
    await runBrowser(dir, job("upload", { ref: 1, file: "video.mp4" }), { loader: fake.loader });
    expect(fake.calls.some((call) => call.startsWith("upload:") && call.endsWith("video.mp4"))).toBe(true);
    await expect(runBrowser(dir, job("upload", { ref: 1, file: "../etc/passwd" }), { loader: fake.loader })).rejects.toThrow();
    await expect(runBrowser(dir, job("upload", { ref: 1, file: ".env" }), { loader: fake.loader })).rejects.toThrow();
  });

  it("без open снимок отказывает понятно", async () => {
    await expect(runBrowser(await root(), job("snapshot"), { loader: fakePlaywright().loader })).rejects.toThrow(/Сначала action open/);
  });

  it("скриншот сохраняется в .azrail-shots", async () => {
    const fake = fakePlaywright();
    const out = await runBrowser(await root(), job("screenshot"), { loader: fake.loader });
    expect(out).toMatch(/\.azrail-shots\/.*\.png/);
  });

  it("внутренний адрес не открывается, close закрывает браузер", async () => {
    const fake = fakePlaywright();
    const dir = await root();
    await expect(runBrowser(dir, job("open", { url: "http://localhost/" }), { loader: fake.loader })).rejects.toThrow(/не публичный/);
    expect(await runBrowser(dir, job("close"), { loader: fake.loader })).toBe("Браузер закрыт.");
    expect(fake.calls).toContain("closed");
  });
});
