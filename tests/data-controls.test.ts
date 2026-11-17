// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { ChatThread } from "../ui/chat-history";
import { applyRetention, buildExport, exportFileName, expiredThreads, readRetention, renderDataControls, saveRetention } from "../ui/data-controls";

const DAY = 86400000;
const now = new Date("2026-11-17T12:00:00Z");
const thread = (id: string, ageDays: number, extra: Partial<ChatThread> = {}): ChatThread => ({ id, title: id, projectId: "", missionId: "", draft: "", updatedAt: now.getTime() - ageDays * DAY, pinned: false, archived: false, customTitle: false, turns: [{ missionId: "", requestKey: "k", user: "привет", reply: "ответ", status: "completed" }], ...extra });
const memoryStore = () => { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } } as unknown as Storage; };

describe("срок хранения", () => {
  it("читает и пишет только допустимые значения", () => {
    const storage = memoryStore();
    expect(readRetention(storage)).toBe(0);
    expect(saveRetention(storage, 90)).toBe(true);
    expect(readRetention(storage)).toBe(90);
    expect(saveRetention(storage, 7)).toBe(false);
    storage.setItem("pulse.chatRetentionDays", "abc");
    expect(readRetention(storage)).toBe(0);
    expect(readRetention(undefined)).toBe(0);
  });
  it("не трогает закреплённые, открытый и свежие чаты", () => {
    const list = [thread("old", 100), thread("pinned", 200, { pinned: true }), thread("open", 300), thread("fresh", 10)];
    expect(expiredThreads(list, 90, now.getTime(), "open")).toEqual(["old"]);
    expect(expiredThreads(list, 0, now.getTime())).toEqual([]);
  });
  it("applyRetention удаляет по сохранённому сроку", () => {
    const storage = memoryStore();
    saveRetention(storage, 30);
    const removeThread = vi.fn();
    expect(applyRetention({ storage, threads: () => [thread("a", 40), thread("b", 5)], keepId: () => "", removeThread, now: () => now })).toBe(1);
    expect(removeThread).toHaveBeenCalledWith("a");
  });
});

describe("экспорт", () => {
  it("собирает чаты и память, пишет примечания", () => {
    const data = buildExport({ account: "Pulse", threads: [thread("a", 1)], memory: [{ id: "m", scope: "user", key: "k", value: 1 }], now });
    expect(data).toMatchObject({ format: "azrail-pulse-export", version: 1, account: "Pulse", exportedAt: "2026-11-17T12:00:00.000Z" });
    expect(data.chats[0].turns).toEqual([{ user: "привет", reply: "ответ", status: "completed" }]);
    expect(data.memory).toHaveLength(1);
    expect(data).not.toHaveProperty("memoryError");
    expect(exportFileName(now)).toBe("azrail-pulse-export-2026-11-17.json");
  });
});

describe("панель", () => {
  const setup = (loadMemory: () => Promise<never[]>) => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById("host")!;
    const save = vi.fn();
    const notice = vi.fn();
    const removeThread = vi.fn();
    renderDataControls(host, { storage: memoryStore(), accountName: () => "Pulse", threads: () => [thread("old", 400), thread("new", 1)], keepId: () => "", removeThread, loadMemory, save, notice, failure: vi.fn(), now: () => now });
    return { host, save, notice, removeThread };
  };
  const click = (host: HTMLElement, text: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === text)!.click();
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("скачивает JSON с памятью", async () => {
    const { host, save, notice } = setup(async () => []);
    click(host, "Скачать мои данные");
    await flush();
    expect(save).toHaveBeenCalledOnce();
    const [name, bytes] = save.mock.calls[0];
    expect(name).toBe("azrail-pulse-export-2026-11-17.json");
    expect(JSON.parse(new TextDecoder().decode(bytes)).chats).toHaveLength(2);
    expect(notice).toHaveBeenCalledWith("Экспорт сохранён.", false);
  });
  it("если память недоступна, экспорт всё равно сохраняется и ошибка видна", async () => {
    const { host, save, notice } = setup(async () => { throw new Error("нет связи"); });
    click(host, "Скачать мои данные");
    await flush();
    expect(JSON.parse(new TextDecoder().decode(save.mock.calls[0][1])).memoryError).toBe("нет связи");
    expect(notice).toHaveBeenCalledWith(expect.stringContaining("нет связи"), true);
  });
  it("срок хранения: выбор сохраняется, удаление просит подтверждение", async () => {
    const { host, removeThread } = setup(async () => []);
    const select = host.querySelector("select")!;
    select.value = "90";
    select.dispatchEvent(new Event("change"));
    expect(host.textContent).toContain("Под удаление сейчас: 1.");
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    window.confirm = confirm;
    click(host, "Удалить старые чаты сейчас");
    expect(removeThread).not.toHaveBeenCalled();
    click(host, "Удалить старые чаты сейчас");
    expect(removeThread).toHaveBeenCalledWith("old");
  });
});
