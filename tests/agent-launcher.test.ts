import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { agentSettings } from "../ui/local-agent";

const read = (path: string) => readFileSync(path);
const FILES = ["Start-Azrail-Agent.bat", "Login-Sites.bat", "Autostart-On.bat", "Autostart-Off.bat"];

describe("файлы для двойного клика", () => {
  it.each(FILES)("%s: UTF-8 без BOM, строки CRLF, без ключей", (name) => {
    const bytes = read(name);
    expect(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(false);
    const text = bytes.toString("utf8");
    expect(text).toContain("chcp 65001");
    expect(text.split("\n").every((line, i, all) => i === all.length - 1 || line.endsWith("\r"))).toBe(true);
    expect(text).not.toMatch(/azagent_|azdev_|azpair_|token/i);
  });

  it("запускатель берёт адрес prod из конфигурации и запускает агента в своей папке", () => {
    const text = read("Start-Azrail-Agent.bat").toString("utf8");
    const config = JSON.parse(readFileSync("config/environments.json", "utf8"));
    const origin = JSON.stringify(config).match(/"PUBLIC_ORIGINS":"(https:\/\/azrail-pulse\.[^"]+)"/)?.[1];
    expect(origin).toBeTruthy();
    expect(text).toContain(`set "AZRAIL_URL=${origin}"`);
    expect(text).toContain('set "AZRAIL_ROOT=%~dp0"');
    expect(text).toContain("node scripts\\local-agent\\azrail-agent.mjs");
    expect(text).toMatch(/where node/);
    expect(text).toMatch(/npm install/);
  });

  it("автозапуск создаёт и удаляет ярлык запускателя в папке автозагрузки", () => {
    expect(read("Autostart-On.bat").toString("utf8")).toMatch(/Start-Azrail-Agent\.bat[\s\S]*Startup/);
    expect(read("Autostart-Off.bat").toString("utf8")).toContain("Azrail Agent.lnk");
  });

  it("вход в сайты запускает режим входа", () => {
    expect(read("Login-Sites.bat").toString("utf8")).toContain("--browser-login");
  });

  it("git отдаёт .bat с CRLF", () => {
    expect(readFileSync(".gitattributes", "utf8")).toMatch(/\*\.bat text eol=crlf/);
  });
});

let win: Window | undefined;
afterEach(() => { vi.unstubAllGlobals(); win?.close(); win = undefined; });

const mount = (status: Record<string, unknown>) => {
  win = new Window({ url: "https://azrail.example/" });
  vi.stubGlobal("document", win.document);
  vi.stubGlobal("location", win.location);
  vi.stubGlobal("localStorage", win.localStorage);
  const calls: Array<{ path: string; body?: unknown }> = [];
  const api = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (path === "/api/agent/status") return { enabled: false, expiresAt: null, connected: false, jobs: [], ...status };
    if (path === "/api/agent/enable") return { token: `azagent_${"a".repeat(64)}`, expiresAt: 1 };
    return { ok: true };
  });
  const notice = vi.fn();
  const section = agentSettings(api, notice, vi.fn());
  win.document.body.append(section as unknown as Node);
  return { section, calls, notice };
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const button = (root: HTMLElement, text: string) => [...root.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement | undefined;

describe("настройки: привязка компьютера", () => {
  it("не привязан: поле кода и кнопка подтверждения отправляют код", async () => {
    const { section, calls } = mount({ paired: false });
    await tick();
    const input = section.querySelector('input[aria-label="Код привязки компьютера"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(section.textContent).toContain("Start-Azrail-Agent.bat");
    input.value = "1234-5678";
    button(section, "Подтвердить компьютер")!.click();
    await tick();
    expect(calls.find((c) => c.path === "/api/agent/pair/approve")?.body).toEqual({ code: "1234-5678" });
    expect(button(section, "Забыть компьютер")).toBeUndefined();
  });

  it("привязан: поля кода нет, есть «Забыть компьютер», команда с ключом не показывается", async () => {
    const { section, calls } = mount({ paired: true, deviceOnline: true });
    await tick();
    expect(section.querySelector('input[aria-label="Код привязки компьютера"]')).toBeNull();
    expect(section.textContent).toContain("привязан и на связи");
    button(section, "Включить на 1 час")!.click();
    await tick();
    expect(calls.some((c) => c.path === "/api/agent/enable")).toBe(true);
    expect(section.querySelector("textarea[readonly]")).toBeNull();
    button(section, "Забыть компьютер")!.click();
    await tick();
    expect(calls.some((c) => c.path === "/api/agent/pair/forget")).toBe(true);
  });

  it("привязан, но не на связи: подсказывает файл запуска", async () => {
    const { section } = mount({ paired: true, deviceOnline: false });
    await tick();
    expect(section.textContent).toContain("не на связи");
    expect(section.textContent).toContain("Start-Azrail-Agent.bat");
  });
});
