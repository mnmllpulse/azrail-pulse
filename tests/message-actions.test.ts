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
  it("ответ: копировать, слушать; ветки и сохранения в память нет", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "вопрос", reply: "ответ" }]);
    renderChatMessages(host, thread, "");
    const bar = host.querySelector('[data-role="assistant"] .message-actions')!;
    expect(Array.from(bar.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"))).toEqual(["Копировать", "Слушать"]);
  });
  it("запрос пользователя: повторить, редактировать, копировать", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "вопрос", reply: "ответ" }]);
    renderChatMessages(host, thread, "");
    const bar = host.querySelector('[data-role="user"] .message-actions')!;
    expect(Array.from(bar.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"))).toEqual(["Повторить", "Редактировать", "Копировать"]);
  });
  it("обработчики получают текст, роль и индекс хода", async () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "один", reply: "ответ 1" }, { user: "два", reply: "ответ 2" }]);
    const handlers = { onEdit: vi.fn(), onRetry: vi.fn() };
    renderChatMessages(host, thread, "", handlers);
    const users = host.querySelectorAll('[data-role="user"]');
    const answers = host.querySelectorAll('[data-role="assistant"]');
    (users[1].querySelector('[aria-label="Редактировать"]') as HTMLButtonElement).click();
    expect(handlers.onEdit).toHaveBeenCalledWith("два");
    (users[0].querySelector('[aria-label="Повторить"]') as HTMLButtonElement).click();
    expect(handlers.onRetry).toHaveBeenCalledWith("один");
    expect(answers.length).toBe(2);
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

describe("озвучивание: плей / пауза / продолжить", () => {
  function speechSetup() {
    const calls: string[] = [];
    let utterance: { onend?: () => void } | null = null;
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("нет сети"); }));
    vi.stubGlobal("SpeechSynthesisUtterance", class { onend?: () => void; voice: unknown; lang = ""; pitch = 1; rate = 1; constructor(public text: string) { utterance = this; } });
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [{ lang: "ru-RU", name: "Pavel" }],
      addEventListener: () => {},
      speak: () => calls.push("speak"),
      cancel: () => calls.push("cancel"),
      pause: () => calls.push("pause"),
      resume: () => calls.push("resume"),
    });
    return { calls, end: () => utterance?.onend?.() };
  }
  const speakBtn = (host: HTMLElement) => host.querySelector('[data-role="assistant"] .message-action-speak') as HTMLButtonElement;

  it("треугольник → пауза → продолжить → по окончании снова треугольник", async () => {
    const { host } = setup();
    const { calls, end } = speechSetup();
    const { thread } = threadWith([{ user: "в", reply: "ответ для озвучки один" }]);
    renderChatMessages(host, thread, "");
    const button = speakBtn(host);
    expect(button.getAttribute("aria-label")).toBe("Слушать");
    button.click();
    expect(button.getAttribute("aria-label")).toBe("Приостановить");
    await vi.waitFor(() => expect(calls).toContain("speak"));
    button.click();
    expect(button.getAttribute("aria-label")).toBe("Продолжить");
    expect(calls).toContain("pause");
    button.click();
    expect(button.getAttribute("aria-label")).toBe("Приостановить");
    expect(calls).toContain("resume");
    end();
    expect(button.getAttribute("aria-label")).toBe("Слушать");
  });

  it("нажатие на другом ответе останавливает первый и запускает второй", async () => {
    const { host } = setup();
    const { calls } = speechSetup();
    const { thread } = threadWith([{ user: "а", reply: "первый ответ для озвучки" }, { user: "б", reply: "второй ответ для озвучки" }]);
    renderChatMessages(host, thread, "");
    const [first, second] = [...host.querySelectorAll('[data-role="assistant"] .message-action-speak')] as HTMLButtonElement[];
    first.click();
    await vi.waitFor(() => expect(calls.filter((c) => c === "speak").length).toBe(1));
    second.click();
    expect(first.getAttribute("aria-label")).toBe("Слушать");
    expect(second.getAttribute("aria-label")).toBe("Приостановить");
    expect(calls).toContain("cancel");
  });
});

describe("подпись под картинкой и блок команд", () => {
  it("подпись к картинке — отдельное сообщение под картинкой, кнопки у подписи", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "напиши промпт\n\n![a.png](/api/studio/artifacts/abc123)", reply: "ок" }]);
    renderChatMessages(host, thread, "");
    const users = host.querySelectorAll('[data-role="user"]');
    expect(users.length).toBe(2);
    expect(users[0].querySelector("img")).not.toBeNull();
    expect(users[0].textContent).not.toContain("напиши промпт");
    expect(users[0].querySelector(".message-actions")).toBeNull();
    expect(users[1].textContent).toContain("напиши промпт");
    expect(users[1].querySelector(".message-actions")).not.toBeNull();
  });
  it("у ответа с командами — строка со счётчиком шагов, список раскрывается прямо в сообщении", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "сделай", reply: "готово" }]);
    thread.turns[0].steps = [{ t: "Чтение файла", s: "готово", d: "Вход:\nsrc/a.ts\n\nРезультат:\nconst a = 1;" }, { t: "Правка файла", s: "ошибка" }];
    renderChatMessages(host, thread, "");
    const row = host.querySelector(".commands-block .commands-row") as HTMLButtonElement;
    const list = host.querySelector(".commands-block .steps-timeline") as HTMLElement;
    expect(row.textContent).toContain("Остановлено на ошибке");
    expect(row.textContent).toContain("2 шага");
    expect(row.textContent).not.toContain("Выполнил команд");
    expect((row.querySelector(".commands-row-lead") as HTMLElement).dataset.failed).toBe("true");
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(list.hidden).toBe(true);
    row.click();
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(list.hidden).toBe(false);
    expect(list.querySelectorAll(":scope > li").length).toBe(2);
    const step = list.querySelector(".command-step") as HTMLDetailsElement;
    expect(step.open).toBe(false);
    const blocks = step.querySelectorAll("pre");
    expect(blocks.length).toBe(2);
    expect(blocks[0].textContent).toBe("src/a.ts");
    expect(blocks[1].textContent).toBe("const a = 1;");
    expect((list.querySelectorAll(":scope > li")[1] as HTMLElement).dataset.state).toBe("failed");
    expect(host.ownerDocument.querySelector(".steps-sheet")).toBeNull();
  });
  it("пока агент работает: крутится значок и написано текущее действие; при ошибке в конце — «Остановлено на ошибке»", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "сделай", reply: "" }]);
    thread.turns[0].missionId = "m1";
    thread.turns[0].status = "running";
    thread.turns[0].steps = [{ t: "Смотрю папку: Рабочий стол", s: "готово" }, { t: "Переношу: demo", s: "в работе" }];
    renderChatMessages(host, thread, "m1");
    const block = host.querySelector(".commands-block") as HTMLElement;
    expect(block.dataset.live).toBe("true");
    expect(block.querySelector(".commands-row-label")?.textContent).toBe("Переношу: demo…");
    expect(block.querySelector(".commands-row-count")?.textContent).toBe("");
    thread.turns[0].reply = "не вышло";
    thread.turns[0].steps = [{ t: "Переношу: demo", s: "ошибка" }];
    renderChatMessages(host, thread, "");
    const done = host.querySelector(".commands-block") as HTMLElement;
    expect(done.dataset.live).toBe("false");
    expect(done.querySelector(".commands-row-label")?.textContent).toBe("Остановлено на ошибке");
  });
  it("успех: кружок остаётся (не крутится), без галочки и без «Ход выполнения», только «N шагов»; до первого шага — крутящийся кружок", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "сделай", reply: "готово" }]);
    thread.turns[0].steps = [{ t: "Создаю папку", s: "готово" }, { t: "Смотрю папку", s: "готово" }];
    renderChatMessages(host, thread, "");
    const row = host.querySelector(".commands-row") as HTMLElement;
    expect(row.textContent).toContain("2 шага");
    expect(row.textContent).not.toContain("Ход выполнения");
    expect(row.querySelector(".commands-row-lead.commands-spinner")).not.toBeNull();
    const live = threadWith([{ user: "сделай", reply: "" }]).thread;
    live.turns[0].missionId = "m2";
    live.turns[0].status = "running";
    renderChatMessages(host, live, "m2");
    expect(host.querySelector(".commands-block[data-live=\"true\"] .commands-spinner")).not.toBeNull();
    expect(host.querySelector(".commands-row-label")?.textContent).toBe("Начинаю работу…");
  });
  it("команда из JSON показывается как код, а раскрытое состояние переживает перерисовку", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "сделай", reply: "готово" }]);
    thread.turns[0].steps = [{ t: "Выполняю команду: npm test", s: "готово", d: 'Вход:\n{"command":"npm test"}\n\nРезультат:\nok' }];
    renderChatMessages(host, thread, "");
    if ((host.querySelector(".commands-block") as HTMLElement).dataset.open !== "true") (host.querySelector(".commands-row") as HTMLButtonElement).click();
    (host.querySelector(".command-step") as HTMLDetailsElement).open = true;
    (host.querySelector(".command-step") as HTMLDetailsElement).dispatchEvent(new (host.ownerDocument.defaultView as Window & typeof globalThis).Event("toggle"));
    expect(host.querySelector(".command-step pre")?.textContent).toBe("npm test");
    renderChatMessages(host, thread, "");
    expect((host.querySelector(".commands-block") as HTMLElement).dataset.open).toBe("true");
    expect((host.querySelector(".command-step") as HTMLDetailsElement).open).toBe(true);
  });
  it("пока ответ идёт, в строке виден текущий шаг", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "сделай", reply: "" }]);
    thread.turns[0].status = "queued";
    thread.turns[0].steps = [{ t: "Запрос отправлен", s: "готово" }, { t: "Модель отвечает", s: "в работе" }];
    renderChatMessages(host, thread, "");
    const block = host.querySelector(".commands-block") as HTMLElement;
    expect(block.dataset.live).toBe("true");
    expect(block.textContent).toContain("Модель отвечает");
    expect(host.textContent).toContain("Думаю");
  });
  it("без команд блока нет", () => {
    const { host } = setup();
    const { thread } = threadWith([{ user: "привет", reply: "привет" }]);
    renderChatMessages(host, thread, "");
    expect(host.querySelector(".commands-block")).toBeNull();
  });
  it("старые строковые шаги читаются", async () => {
    const { stepsOf } = await import("../ui/thinking-block");
    expect(stepsOf(["Чтение файла · готово", 5, { t: "Х", d: "y" }])).toEqual([{ t: "Чтение файла · готово" }, { t: "Х", d: "y" }]);
  });
  it("missionSteps берёт вход и результат вызова", async () => {
    const { missionSteps } = await import("../ui/mission-view");
    const out = missionSteps({ calls: [{ tool: "read_file", status: "done", input: "a.ts", output: "код" }] });
    expect(out[0]).toMatchObject({ t: "Чтение файла", s: "готово" });
    expect(out[0].d).toContain("a.ts");
    expect(out[0].d).toContain("код");
  });
});
