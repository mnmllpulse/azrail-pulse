import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import { describeAgentJob, renderAgentApprovals, trustScopeFor, type AgentJobView } from "../ui/mission-agent";

const setup = (jobs: Partial<AgentJobView>[], fail = false) => {
  const win = new Window({ url: "https://azrail.example/" });
  win.document.body.innerHTML = '<div id="mission-panel"><p id="mission-summary"></p></div>';
  const calls: Array<{ path: string; body?: unknown }> = [];
  const api = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (fail) throw new Error("403");
    if (path === "/api/agent/status") return { jobs };
    return { ok: true };
  });
  const hooks = { notice: vi.fn(), failure: vi.fn(), refresh: vi.fn() };
  const doc = win.document as unknown as Document;
  return { win, doc, api, calls, hooks };
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const btn = (doc: Document, text: string) => [...doc.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement | undefined;

describe("запросы агента в карточке задачи", () => {
  it("показывает запрос и разрешает одной кнопкой", async () => {
    const { doc, api, calls, hooks } = setup([{ id: "j1", kind: "mkdir", path: "test-agent", status: "awaiting_approval" }]);
    expect(await renderAgentApprovals(doc, "waiting_approval", api as never, hooks)).toBe(true);
    expect(doc.getElementById("approval-card")?.textContent).toContain("Создать папку test-agent?");
    btn(doc, "Разрешить один раз")!.click();
    await tick();
    expect(calls.at(-1)).toMatchObject({ path: "/api/agent/jobs/j1/approve" });
    expect(hooks.refresh).toHaveBeenCalled();
  });

  it("в карточке видно, что именно изменится: было → стало", async () => {
    const { doc, api, hooks } = setup([{ id: "j2", kind: "edit", path: "a.ts", status: "awaiting_approval", preview: "было:\nconst a = 1\n\nстало:\nconst a = 2" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    const code = doc.querySelector("#approval-card .approval-code") as HTMLTextAreaElement;
    expect(code.value).toContain("было:\nconst a = 1");
    expect(code.value).toContain("стало:\nconst a = 2");
  });

  it("отклоняет", async () => {
    const { doc, api, calls, hooks } = setup([{ id: "j1", kind: "trash", path: "a", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    btn(doc, "Отклонить")!.click();
    await tick();
    expect(calls.at(-1)).toMatchObject({ path: "/api/agent/jobs/j1/reject" });
  });

  it("«Всегда для файлов» запоминает область и разрешает", async () => {
    const { doc, api, calls, hooks } = setup([{ id: "j9", kind: "edit", path: "a.ts", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    btn(doc, "Всегда для файлов")!.click();
    await tick();
    expect(calls.find((c) => c.path === "/api/agent/always")?.body).toEqual({ scopes: ["files"] });
    expect(calls.at(-1)).toMatchObject({ path: "/api/agent/jobs/j9/approve" });
  });

  it("для терминала «всегда» нет, есть только 30 минут", async () => {
    const { doc, api, hooks } = setup([{ id: "j8", kind: "shell", path: "npm test", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    expect([...doc.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Разрешить один раз", "Разрешать команды 30 мин", "Отклонить"]);
  });

  it("«доверять 30 мин» включает область и разрешает", async () => {
    const { doc, api, calls, hooks } = setup([{ id: "j2", kind: "shell", path: "npm install", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    btn(doc, "Разрешать команды 30 мин")!.click();
    await tick();
    const trust = calls.find((c) => c.path === "/api/agent/trust");
    expect(trust?.body).toEqual({ scopes: ["shell"], minutes: 30 });
    expect(calls.at(-1)).toMatchObject({ path: "/api/agent/jobs/j2/approve" });
  });

  it("доступ к папке: понятный текст и без кнопки доверия", async () => {
    const { doc, api, hooks } = setup([{ id: "j3", kind: "addroot", path: "desktop", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    expect(doc.getElementById("approval-card")?.textContent).toContain("Открыть доступ к папке «Рабочий стол»?");
    expect([...doc.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Разрешить", "Отклонить"]);
  });

  it("выполняющаяся задача держит опрос, пустой список снимает", async () => {
    const running = setup([{ id: "j4", kind: "mkdir", path: "x", status: "running" }]);
    expect(await renderAgentApprovals(running.doc, "waiting_approval", running.api as never, running.hooks)).toBe(true);
    expect(running.doc.getElementById("approval-card")?.textContent).toContain("Выполняется на компьютере");
    const none = setup([{ id: "j5", kind: "mkdir", path: "x", status: "done" }]);
    expect(await renderAgentApprovals(none.doc, "waiting_approval", none.api as never, none.hooks)).toBe(false);
    expect(none.doc.getElementById("approval-card")).toBeNull();
  });

  it("не в ожидании подтверждения: блок убран и запросов нет", async () => {
    const { doc, api, hooks } = setup([{ id: "j1", kind: "mkdir", path: "a", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    api.mockClear();
    expect(await renderAgentApprovals(doc, "completed", api as never, hooks)).toBe(false);
    expect(api).not.toHaveBeenCalled();
    expect(doc.getElementById("approval-card")).toBeNull();
  });

  it("нет доступа к агенту (не админ): тихо ничего не показывает", async () => {
    const { doc, api, hooks } = setup([], true);
    expect(await renderAgentApprovals(doc, "waiting_approval", api as never, hooks)).toBe(false);
    expect(doc.getElementById("approval-card")).toBeNull();
  });

  it("описания и области доверия", () => {
    expect(describeAgentJob({ id: "1", kind: "move", path: "a", dest: "b", status: "x" })).toBe("Переместить a → b");
    expect(trustScopeFor({ id: "1", kind: "browser", path: "click", status: "x" })).toBe("browser");
    expect(trustScopeFor({ id: "1", kind: "browser", path: "open", status: "x" })).toBeNull();
    expect(trustScopeFor({ id: "1", kind: "addroot", path: "desktop", status: "x" })).toBeNull();
  });

  it("опрос не перерисовывает ту же карточку и ставит её над полем ввода", async () => {
    const { win, doc, api, hooks } = setup([{ id: "j7", kind: "mkdir", path: "x", status: "awaiting_approval" }]);
    win.document.body.innerHTML = '<div class="composer-dock"><form id="composer"></form></div><p id="mission-summary"></p>';
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    const first = doc.getElementById("approval-card");
    expect(first?.nextElementSibling?.id).toBe("composer");
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    expect(doc.getElementById("approval-card")).toBe(first);
  });

  it("после решения карточка закрывается", async () => {
    const { doc, api, hooks } = setup([{ id: "j6", kind: "trash", path: "x", status: "awaiting_approval" }]);
    await renderAgentApprovals(doc, "waiting_approval", api as never, hooks);
    btn(doc, "Разрешить один раз")!.click();
    await tick();
    expect(doc.getElementById("approval-card")).toBeNull();
  });
});
