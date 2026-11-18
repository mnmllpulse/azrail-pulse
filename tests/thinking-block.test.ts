import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { formatPlan, planWork } from "../ui/planner";
import { splitProcess } from "../ui/thinking-block";
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
  return { host };
}
const storage = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage; };
const plan = () => formatPlan(planWork("Нарисуй постер и собери трек"));

describe("аккордеон «Ход выполнения»", () => {
  it("реальный вывод formatPlan делится на процесс и итог", () => {
    const text = plan();
    expect(text.startsWith("**План из")).toBe(true);
    const joined = `${text}\n\nГотово: постер и трек.\n\nПока не нужно.`;
    const result = splitProcess(joined);
    expect(result.process).toBe(text);
    expect(result.rest).toBe("Готово: постер и трек.\n\nПока не нужно.");
    expect(result.steps).toBeGreaterThanOrEqual(2);
  });
  it("обычный ответ и ответ с похожим заголовком не трогает", () => {
    expect(splitProcess("Привет")).toEqual({ process: "", rest: "Привет", steps: 0 });
    expect(splitProcess("**План из 3 частей** выглядит так, подробности ниже").process).toBe("");
  });
  it("в ленте: свёрнутая плашка со счётчиком, итог отдельно, копируется только итог", () => {
    const { host } = setup();
    const history = createChatHistory(storage());
    history.setScope("t");
    const thread = history.create();
    thread.turns = [{ missionId: "m", requestKey: "k", user: "сделай", reply: `${plan()}\n\nИтоговый текст`, status: "completed" }];
    const copied: string[] = [];
    renderChatMessages(host, thread, "", { onCopy: (t) => copied.push(t) });
    const block = host.querySelector("details.thinking-block") as HTMLDetailsElement;
    expect(block.open).toBe(false);
    expect(block.querySelector("summary")?.textContent).toMatch(/Ход выполнения · \d+ част/);
    expect(block.querySelector(".thinking-body")?.textContent).toContain("Рядом");
    const assistant = host.querySelector('[data-role="assistant"]')!;
    expect(assistant.textContent).toContain("Итоговый текст");
    expect(block.textContent).not.toContain("Итоговый текст");
  });
  it("если кроме плана ничего нет, плашка раскрыта", () => {
    const { host } = setup();
    const history = createChatHistory(storage());
    history.setScope("t");
    const thread = history.create();
    thread.turns = [{ missionId: "m", requestKey: "k", user: "сделай", reply: plan(), status: "completed" }];
    renderChatMessages(host, thread, "");
    expect((host.querySelector("details.thinking-block") as HTMLDetailsElement).open).toBe(true);
  });
});
