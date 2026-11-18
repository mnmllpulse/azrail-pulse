import { afterEach, describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { readFileSync } from "node:fs";

const windows: Window[] = [];
afterEach(async () => { for (const w of windows) { await w.happyDOM.abort(); w.close(); } windows.length = 0; });
const settle = async () => { await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); };

function open() {
  const html = readFileSync("index.html", "utf8");
  const w = new Window({ url: "file:///preview/index.html", width: 1440, height: 900, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  windows.push(w);
  Object.defineProperty(w, "WebSocket", { value: undefined, configurable: true });
  w.document.write(html.replace(/<script>[\s\S]*?<\/script>/g, ""));
  w.requestIdleCallback = () => 0;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.eval(html.match(/<script>([\s\S]*?)<\/script>/)![1]);
  return w;
}
const byId = (w: Window, id: string) => w.document.getElementById(id) as HTMLElement & { hidden: boolean; click(): void };

describe("сайдбар: Новый чат, Поиск, Проекты, Архив", () => {
  it("видимые пункты и порядок, пункта «Чат» нет", () => {
    const w = open();
    const nav = w.document.querySelector(".workspace-nav")!;
    const visible = Array.from(nav.querySelectorAll(".nav")).filter((el) => !el.hasAttribute("data-expert")).map((el) => el.textContent!.replace(/\s+/g, " ").trim());
    expect(visible).toEqual(["Поиск", "Проекты", "Архив"]);
    expect(w.document.querySelector('.workspace-nav [data-view="create"]')).toBeNull();
    expect(byId(w, "new-chat").textContent).toContain("Новый чат");
  });
  it("«Поиск» показывает и скрывает поле поиска чатов", () => {
    const w = open();
    const input = byId(w, "chat-search");
    expect(input.hidden).toBe(true);
    byId(w, "nav-search").click();
    expect(input.hidden).toBe(false);
    expect(byId(w, "nav-search").getAttribute("aria-expanded")).toBe("true");
    byId(w, "nav-search").click();
    expect(input.hidden).toBe(true);
  });
  it("«Архив» переключает показ архивных чатов", () => {
    const w = open();
    const toggle = byId(w, "chat-show-archived") as unknown as HTMLInputElement;
    byId(w, "nav-archive").click();
    expect(toggle.checked).toBe(true);
    expect(byId(w, "nav-archive").getAttribute("aria-pressed")).toBe("true");
    byId(w, "nav-archive").click();
    expect(toggle.checked).toBe(false);
  });
  it("«Живой экран» доступен без режима эксперта", () => {
    const w = open();
    const toggle = byId(w, "preview-toggle");
    expect(w.document.documentElement.dataset.expert).toBe("off");
    expect(toggle.hasAttribute("data-expert")).toBe(false);
  });
});

describe("режим эксперта в настройках", () => {
  it("переключатель в «Внешний вид» меняет режим, кнопки в сайдбаре нет", async () => {
    const w = open();
    expect((byId(w, "expert-mode") as HTMLElement).hidden).toBe(true);
    (byId(w, "settings") as HTMLElement).click();
    await settle();
    (w.document.querySelector('[data-settings-section="appearance"]') as HTMLElement).click();
    await settle();
    const toggle = w.document.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    toggle.click();
    await settle();
    expect(w.document.documentElement.dataset.expert).toBe("on");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    toggle.click();
    await settle();
    expect(w.document.documentElement.dataset.expert).toBe("off");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });
});

describe("подсветка только при наведении", () => {
  const css = ["ui/premium-workspace.css", "ui/workspace.css", "ui/design-system.css", "ui/app.css"].map((f) => readFileSync(f, "utf8")).join("\n");
  it("активный пункт и активный чат не имеют постоянного фона и рамки", () => {
    expect(css).not.toMatch(/\.nav\.active[^{]*\{[^}]*(?:background|border-color|box-shadow)/);
    expect(css).not.toMatch(/\.chat-row\[data-active="true"\][^{]*\{[^}]*(?:background|border-color)/);
    expect(css).not.toMatch(/\.nav\[aria-current="page"\][^{]*\{[^}]*(?:background|border-color|box-shadow)/);
  });
  it("«Новый чат» без градиента и рамки в покое", () => {
    const rule = readFileSync("ui/premium-workspace.css", "utf8").match(/\.app-shell \.new-chat \{[^}]*\}/)![0];
    expect(rule).toContain("background: transparent");
    expect(rule).toContain("border: 1px solid transparent");
    expect(rule).not.toContain("gradient");
  });
});
