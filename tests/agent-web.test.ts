import { describe, expect, it, vi } from "vitest";
import { browserProfileDir, isPublicUrl, readWeb } from "../scripts/local-agent/azrail-agent.mjs";
import { AccessError } from "../src/lib/accounts";
import { createJob, enableAgent, publicJob, type AgentJob, type AgentState, type AgentStore } from "../src/lib/local-agent";
import { isPublicUrl as serverIsPublic } from "../src/lib/public-url";
import { agentIntent, jobReply, webTarget } from "../ui/chat-agent";

function memoryStore(): AgentStore {
  let state: AgentState | null = null;
  const jobs = new Map<string, AgentJob>();
  return {
    async getState() { return state; },
    async setState(next) { state = next; },
    async insertJob(job) { jobs.set(job.id, { ...job }); },
    async getJob(id) { return jobs.get(id) ?? null; },
    async updateJob(id, patch) { Object.assign(jobs.get(id)!, patch); },
    async claimQueued() { return null; },
    async recentJobs() { return [...jobs.values()]; },
  };
}

const GOOD = ["https://example.com/a?b=1", "http://news.site.org", "https://93.184.216.34/"];
const BAD = ["ftp://x.com", "file:///etc/passwd", "http://localhost/", "http://127.0.0.1/", "http://10.0.0.5/", "http://192.168.1.1/", "http://172.20.0.1/", "http://169.254.169.254/", "http://[::1]/", "https://user:pass@example.com/", "https://example.com:8080/", "http://router/", "http://nas.local/", "http://2130706433/", "javascript:alert(1)", "не адрес"];

describe("адреса: агент и сервер совпадают", () => {
  it.each([...GOOD, ...BAD])("%s", (url) => {
    expect(isPublicUrl(url)).toBe(serverIsPublic(url));
  });
  it("хорошие проходят, плохие нет", () => {
    for (const url of GOOD) expect(isPublicUrl(url), url).toBe(true);
    for (const url of BAD) expect(isPublicUrl(url), url).toBe(false);
  });
});

describe("задача web на сервере", () => {
  it("идёт сразу, без подтверждения, адрес нормализуется", async () => {
    const store = memoryStore();
    await enableAgent(store);
    const job = await createJob(store, { kind: "web", path: " https://Example.com/a b " });
    expect(job.status).toBe("queued");
    expect(job.path).toBe("https://example.com/a%20b");
    expect(publicJob(job).kind).toBe("web");
  });
  it.each(["http://localhost/", "http://192.168.0.1/", "ftp://a.com", "https://u:p@a.com", 5, "https://a.com/" + "x".repeat(2000)])("отклоняет %s", async (path) => {
    const store = memoryStore();
    await enableAgent(store);
    await expect(createJob(store, { kind: "web", path })).rejects.toThrow(AccessError);
  });
});

function fakeBrowser(opts: { text?: string; finalUrl?: string; launchError?: Error } = {}) {
  const routes: Array<(route: unknown) => void> = [];
  const context = {
    route: vi.fn(async (_p: string, handler: (route: unknown) => void) => void routes.push(handler)),
    pages: () => [],
    newPage: async () => ({
      goto: vi.fn(async () => undefined),
      waitForLoadState: vi.fn(async () => undefined),
      url: () => opts.finalUrl ?? "https://example.com/",
      title: async () => "Пример",
      evaluate: async () => opts.text ?? "Привет\n\n\n\nмир",
    }),
    close: vi.fn(async () => undefined),
  };
  const launch = vi.fn(async () => { if (opts.launchError) throw opts.launchError; return context; });
  return { context, launch, routes, loader: async () => ({ chromium: { launchPersistentContext: launch } }) };
}

describe("readWeb", () => {
  it("возвращает адрес, заголовок и текст, закрывает браузер", async () => {
    const b = fakeBrowser();
    const out = await readWeb("https://example.com/", { AZRAIL_BROWSER_PROFILE: "/p" }, b.loader);
    expect(out).toBe("Адрес: https://example.com/\nЗаголовок: Пример\n\nПривет\n\nмир");
    expect(b.launch).toHaveBeenCalledWith("/p", expect.objectContaining({ channel: "chrome", headless: true, chromiumSandbox: true }));
    expect(b.context.close).toHaveBeenCalled();
  });
  it("показывает окно только по AZRAIL_BROWSER_HEADED=1", async () => {
    const b = fakeBrowser();
    await readWeb("https://example.com/", { AZRAIL_BROWSER_HEADED: "1" }, b.loader);
    expect(b.launch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headless: false }));
  });
  it("режет длинный текст", async () => {
    const out = await readWeb("https://example.com/", {}, fakeBrowser({ text: "я".repeat(30000) }).loader);
    expect(out.endsWith("[текст обрезан]")).toBe(true);
    expect(out.length).toBeLessThan(20200);
  });
  it("внутренний адрес не открывается, браузер не запускается", async () => {
    const b = fakeBrowser();
    await expect(readWeb("http://192.168.1.1/", {}, b.loader)).rejects.toThrow(/не публичный/);
    expect(b.launch).not.toHaveBeenCalled();
  });
  it("редирект на внутренний адрес — ошибка, браузер закрыт", async () => {
    const b = fakeBrowser({ finalUrl: "http://192.168.1.1/admin" });
    await expect(readWeb("https://example.com/", {}, b.loader)).rejects.toThrow(/внутренний/);
    expect(b.context.close).toHaveBeenCalled();
  });
  it("подзапросы к внутренним адресам блокируются", async () => {
    const b = fakeBrowser();
    await readWeb("https://example.com/", {}, b.loader);
    const make = (url: string) => ({ request: () => ({ url: () => url }), continue: vi.fn(), abort: vi.fn() });
    const inner = make("http://127.0.0.1:3000/x");
    const outer = make("https://cdn.example.com/a.js");
    b.routes[0](inner);
    b.routes[0](outer);
    expect(inner.abort).toHaveBeenCalled();
    expect(inner.continue).not.toHaveBeenCalled();
    expect(outer.continue).toHaveBeenCalled();
  });
  it("нет playwright или Chrome — понятная ошибка", async () => {
    await expect(readWeb("https://example.com/", {}, async () => { throw new Error("x"); })).rejects.toThrow(/npm install/);
    await expect(readWeb("https://example.com/", {}, fakeBrowser({ launchError: new Error("Executable doesn't exist\nstack") }).loader)).rejects.toThrow(/Браузер не запустился: Executable doesn't exist/);
  });
  it("профиль по умолчанию отдельный от основного Chrome", () => {
    expect(browserProfileDir({})).toMatch(/\.azrail-browser$/);
    expect(browserProfileDir({ AZRAIL_BROWSER_PROFILE: "/x" })).toBe("/x");
  });
});

describe("фразы чата", () => {
  it.each([
    ["открой https://example.com в моём браузере", "https://example.com"],
    ["прочитай example.com/a в моем хроме", "https://example.com/a"],
    ["посмотри https://shop.com/orders под моим входом", "https://shop.com/orders"],
    ["открой https://example.com на компьютере", "https://example.com"],
  ])("%s", (text, url) => {
    expect(agentIntent(text)).toEqual({ kind: "web", path: url });
  });
  it("файлы, почта и обычные просьбы не становятся страницами", () => {
    expect(webTarget("прочитай notes.txt в моём браузере")).toBeNull();
    expect(webTarget("открой me@example.com в моём браузере")).toBeNull();
    expect(agentIntent("открой example.com")).toBeNull();
    expect(agentIntent("прочитай src/a.ts на компьютере")).toEqual({ kind: "read", path: "src/a.ts" });
  });
  it("ответ показывает страницу, ошибку объясняет", () => {
    const job = { id: "1", kind: "web", path: "https://example.com/", status: "done", result: "Адрес: x", error: null };
    expect(jobReply(job)).toMatch(/^Страница:/);
    expect(jobReply({ ...job, status: "failed", result: null, error: "Не найден playwright" })).toContain("Не найден playwright");
  });
});
