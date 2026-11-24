import { afterEach, describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { mountStarterChips, STARTERS } from "../ui/starter-chips";

const windows: Window[] = [];
afterEach(() => { for (const w of windows) w.close(); windows.length = 0; });
function page() {
  const w = new Window();
  windows.push(w);
  w.document.body.innerHTML = '<div id="host"></div><textarea id="prompt"></textarea>';
  const host = w.document.getElementById("host") as unknown as HTMLElement;
  const input = w.document.getElementById("prompt") as unknown as HTMLTextAreaElement;
  mountStarterChips(host, input);
  return { host, input };
}

describe("быстрые старты пустого чата", () => {
  it("рисует по кнопке на каждый старт", () => {
    const { host } = page();
    expect([...host.querySelectorAll("button")].map((b) => b.textContent)).toEqual(STARTERS.map((s) => s.label));
  });
  it("нажатие подставляет начало фразы и ставит курсор в конец, не отправляя", () => {
    const { host, input } = page();
    let inputs = 0;
    input.addEventListener("input", () => inputs++);
    (host.querySelectorAll("button")[1] as HTMLButtonElement).click();
    expect(input.value).toBe("Сделай страницу: ");
    expect(input.selectionStart).toBe(input.value.length);
    expect(inputs).toBe(1);
  });
  it("повторное нажатие заменяет текст, а не дописывает", () => {
    const { host, input } = page();
    const buttons = host.querySelectorAll("button");
    (buttons[0] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();
    expect(input.value).toBe("Напиши код: ");
  });
});
