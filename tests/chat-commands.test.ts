import { describe, expect, it } from "vitest";
import { createChatCommands, type ChatCommandContext } from "../ui/chat-commands";

const models = [
  { slug: "@cf/zai-org/glm-5.3", label: "GLM 5.3", free: false },
  { slug: "@cf/zai-org/glm-5.3-flash", label: "GLM 5.3 Flash", free: true },
];

function setup(over: Partial<ChatCommandContext> = {}, signedIn = true) {
  const notes: string[] = [];
  const calls: string[] = [];
  let preferred = "";
  const api = async (path: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${path}`);
    if (path === "/api/agent/status") return { enabled: true, jobs: [] };
    if (path === "/api/agent/jobs") return { job: { id: "j1", kind: "run", path: "git_status", command: "git status --short", status: "awaiting_approval" } };
    if (path.endsWith("/approve")) return {};
    return { job: { id: "j1", kind: "run", path: "git_status", status: "done", result: "чисто", error: null } };
  };
  const ctx: ChatCommandContext = {
    api,
    noteLocal: (_message, reply) => { notes.push(reply); },
    notice: () => {},
    signedIn: () => signedIn,
    project: () => "p1",
    voice: () => "shade",
    preferredModel: () => preferred,
    setPreferredModel: (slug) => { preferred = slug; },
    models: () => models,
    labelOf: (slug) => (slug ? models.find((m) => m.slug === slug)?.label ?? slug : "Auto · AZRAIL"),
    ...over,
  };
  return { handle: createChatCommands(ctx), notes, calls, preferred: () => preferred };
}

describe("команды чата", () => {
  it("обычная фраза не перехватывается", async () => {
    const { handle, notes, calls } = setup();
    expect(await handle("объясни эффект Даннинга — Крюгера")).toBe(false);
    expect(await handle("привет")).toBe(false);
    expect(notes).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("«ок» без ожидающей задачи уходит обычным чатом", async () => {
    const { handle, calls } = setup();
    expect(await handle("ок")).toBe(false);
    expect(calls).toEqual(["GET /api/agent/status"]);
  });

  it("команда на компьютере → ожидание → «ок» одобряет и показывает вывод", async () => {
    const { handle, notes, calls } = setup();
    expect(await handle("покажи git status на компьютере")).toBe(true);
    expect(notes[0]).toContain("подтверждения");
    expect(await handle("«ок»")).toBe(true);
    expect(calls).toContain("POST /api/agent/jobs/j1/approve");
    expect(notes[1]).toContain("чисто");
  });

  it("без входа агент недоступен, ответ объясняет почему", async () => {
    const { handle, notes } = setup({}, false);
    expect(await handle("покажи git status на компьютере")).toBe(true);
    expect(notes[0]).toContain("Войдите");
  });

  it("агент выключен — подсказка включить, задача не создаётся", async () => {
    const calls: string[] = [];
    const { handle, notes } = setup({ api: async (path) => { calls.push(path); return { enabled: false }; } });
    expect(await handle("покажи git status на компьютере")).toBe(true);
    expect(calls).toEqual(["/api/agent/status"]);
    expect(notes[0]).toMatch(/агент/i);
  });

  it("цикл исправления просит согласие и не стартует без него", async () => {
    const { handle, notes, calls } = setup();
    expect(await handle("исправь ошибки сборки на компьютере")).toBe(true);
    expect(notes[0]).toContain("Цикл исправления");
    expect(calls).toEqual(["GET /api/agent/status"]);
  });

  it("откат без правок сообщает, что откатывать нечего", async () => {
    const { handle, notes } = setup();
    expect(await handle("откати правки на компьютере")).toBe(true);
    expect(notes[0]).toContain("Откатывать нечего");
  });

  it("смена модели: предложение, «да» применяет, «откати» возвращает", async () => {
    const t = setup();
    expect(await t.handle("переключи на GLM 5.3")).toBe(true);
    expect(t.preferred()).toBe("");
    expect(await t.handle("да")).toBe(true);
    expect(t.preferred()).toBe("@cf/zai-org/glm-5.3");
    expect(await t.handle("откати")).toBe(true);
    expect(t.preferred()).toBe("");
    expect(t.notes.at(-1)).toContain("Auto · AZRAIL");
  });

  it("«да» без предложения модели не меняет модель", async () => {
    const t = setup();
    expect(await t.handle("да")).toBe(false);
    expect(t.preferred()).toBe("");
  });
});
