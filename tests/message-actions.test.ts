import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { createChatHistory, renderChatMessages } from "../ui/chat-history";

const windows: Window[] = [];
afterEach(() => { for (const w of windows) w.close(); windows.length = 0; vi.unstubAllGlobals(); });

function setup() {
  const w = new Window();
  windows.push(w);
  vi.stubGlobal("window", w);
  vi.stubGlobal("document", w.document);
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => undefined) } });
  const host = w.document.createElement("div");
  w.document.body.append(host);
  return { w, host };
}

const memoryStorage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) } as unknown as Storage;
};

function threadWith(turns: Array<{ user: string; reply: string }>) {
  const history = createChatHistory(memoryStorage());
  history.setScope("t");
  const thread = history.create();
  thread.title = "Исходный";
  thread.turns = turns.map((t, i) => ({ missionId: "m" + i, requestKey: "k" + i, user: t.user, reply: t.reply, status: "completed" }));
  return { history, thread };
}

describe("hover-действия сообщений", () => {
  it("ответ: копировать, слушать, ветвь, сохранить", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "вопрос", reply: "ответ" }]);
    renderChatMessages(host, thread, "");
    const bar = host.querySelector('[data-role="assistant"] .message-actions')!;
    expect(Array.from(bar.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"))).toEqual(["Копировать", "Слушать", "Создать ветвь в новом чате", "Сохранить"]);
  });
  it("запрос пользователя: редактировать, копировать, сохранить", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "вопрос", reply: "ответ" }]);
    renderChatMessages(host, thread, "");
    const bar = host.querySelector('[data-role="user"] .message-actions')!;
    expect(Array.from(bar.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"))).toEqual(["Редактировать", "Копировать", "Сохранить"]);
  });
  it("обработчики получают текст, роль и индекс хода", async () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "один", reply: "ответ 1" }, { user: "два", reply: "ответ 2" }]);
    const handlers = { onEdit: vi.fn(), onSave: vi.fn(), onBranch: vi.fn() };
    renderChatMessages(host, thread, "", handlers);
    const users = host.querySelectorAll('[data-role="user"]');
    const answers = host.querySelectorAll('[data-role="assistant"]');
    (users[1].querySelector('[aria-label="Редактировать"]') as HTMLButtonElement).click();
    expect(handlers.onEdit).toHaveBeenCalledWith("два");
    (answers[0].querySelector('[aria-label="Создать ветвь в новом чате"]') as HTMLButtonElement).click();
    expect(handlers.onBranch).toHaveBeenCalledWith(0);
    (answers[1].querySelector('[aria-label="Сохранить"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(handlers.onSave).toHaveBeenCalledWith("ответ 2", "assistant");
    (users[0].querySelector('[aria-label="Сохранить"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(handlers.onSave).toHaveBeenCalledWith("один", "user");
  });
  it("копирование мгновенно меняет иконку на галочку и возвращает обратно", async () => {
    vi.useFakeTimers();
    try {
      const { w, host } = setup();
      (w as unknown as { setTimeout: typeof setTimeout }).setTimeout = ((fn: () => void, ms?: number) => setTimeout(fn, ms)) as typeof setTimeout;
      const { thread } = threadWith([{ user: "q", reply: "a" }]);
      renderChatMessages(host, thread, "");
      const copy = host.querySelector('[data-role="assistant"] [aria-label="Копировать"]') as HTMLButtonElement;
      const before = copy.innerHTML;
      copy.click();
      await vi.advanceTimersByTimeAsync(10);
      expect(copy.classList.contains("is-done")).toBe(true);
      expect(copy.innerHTML).not.toBe(before);
      await vi.advanceTimersByTimeAsync(1500);
      expect(copy.innerHTML).toBe(before);
    } finally { vi.useRealTimers(); }
  });
});

describe("ветвь чата", () => {
  it("копирует ходы до выбранного, новые ключи, чистый missionId, активирует ветку", () => {
    const { history, thread } = threadWith([{ user: "1", reply: "a" }, { user: "2", reply: "b" }, { user: "3", reply: "c" }]);
    const branch = history.fork(thread.id, 1)!;
    expect(branch.id).not.toBe(thread.id);
    expect(history.current()?.id).toBe(branch.id);
    expect(branch.title).toBe("Ветка · Исходный");
    expect(branch.turns.map((t) => [t.user, t.reply])).toEqual([["1", "a"], ["2", "b"]]);
    expect(branch.turns.every((t) => t.missionId === "" && t.requestKey.startsWith("fork:"))).toBe(true);
    expect(thread.turns).toHaveLength(3);
  });
  it("не падает на неверном индексе или id", () => {
    const { history, thread } = threadWith([{ user: "1", reply: "a" }]);
    expect(history.fork(thread.id, 5)).toBeUndefined();
    expect(history.fork(thread.id, -1)).toBeUndefined();
    expect(history.fork("нет", 0)).toBeUndefined();
  });
  it("синхронизация с сервером не стирает скопированные ходы ветки", () => {
    const { history, thread } = threadWith([{ user: "1", reply: "a" }]);
    const branch = history.fork(thread.id, 0)!;
    history.hydrate(branch.id, []);
    expect(history.current()?.turns.map((t) => t.user)).toEqual(["1"]);
    history.hydrate(branch.id, [{ id: "x", role: "user", content: "новый" }, { id: "y", role: "assistant", content: "ответ" }] as never);
    expect(history.current()?.turns.map((t) => t.user)).toEqual(["1", "новый"]);
  });
});
