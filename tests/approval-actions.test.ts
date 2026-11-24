import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { decisionRow } from "../ui/approval-actions";

const windows: Window[] = [];
afterEach(() => { for (const w of windows) w.close(); windows.length = 0; });
const doc = () => { const w = new Window(); windows.push(w); return w.document as unknown as Document; };
const buttons = (row: HTMLElement) => [...row.querySelectorAll("button")] as HTMLButtonElement[];

describe("кнопки решения", () => {
  it("«Разрешить» отправляет approved, «Отклонить» — rejected, второй клик игнорируется", async () => {
    const send = vi.fn(async () => {});
    const first = decisionRow(send, () => {}, doc());
    expect(buttons(first).map((b) => b.textContent)).toEqual(["Разрешить", "Отклонить"]);
    buttons(first)[0].click();
    buttons(first)[1].click();
    const second = decisionRow(send, () => {}, doc());
    buttons(second)[1].click();
    await Promise.resolve();
    expect(send.mock.calls.map((c) => c[0])).toEqual(["approved", "rejected"]);
  });
  it("во время отправки кнопки заблокированы", async () => {
    let release = () => {};
    const row = decisionRow(() => new Promise<void>((r) => { release = r; }), () => {}, doc());
    buttons(row)[0].click();
    expect(buttons(row).every((b) => b.disabled)).toBe(true);
    release();
  });
  it("при ошибке кнопки возвращаются и ошибка передаётся наверх", async () => {
    const onError = vi.fn();
    const row = decisionRow(async () => { throw new Error("истёк срок"); }, onError, doc());
    buttons(row)[0].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledOnce();
    expect(buttons(row).every((b) => !b.disabled)).toBe(true);
  });
});
