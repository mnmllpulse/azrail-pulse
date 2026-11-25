import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

const calls: string[] = [];
let requestHandler: ((r: { url: () => string; continue: () => void; abort: () => void }) => void) | undefined;
let finalUrl = "https://example.com/";
let failGoto = false;
let shotSize = 1000;
const saved: Array<{ account: string; name: string; bytes: number }> = [];
let failSave = false;
vi.mock("../src/unified/studios", () => ({
  saveBrowserScreenshot: vi.fn(async (_env: unknown, account: string, name: string, bytes: Uint8Array) => {
    if (failSave) throw new Error("r2 down");
    saved.push({ account, name, bytes: bytes.byteLength });
    return { url: "/api/studio/artifacts/abc-123" };
  }),
}));
vi.mock("@cloudflare/puppeteer", () => ({
  default: {
    launch: vi.fn(async () => ({
      newPage: async () => ({
        setRequestInterception: async () => undefined,
        on: (_: string, h: typeof requestHandler) => { requestHandler = h; },
        goto: async () => { if (failGoto) throw new Error("timeout"); },
        waitForNetworkIdle: async () => undefined,
        url: () => finalUrl,
        title: async () => "Пример",
        evaluate: async () => "Текст страницы\n\n\n\nещё строка",
        screenshot: async () => new Uint8Array(shotSize),
      }),
      close: async () => { calls.push("close"); },
    })),
  },
}));
const { checkPublicUrl, readPage, pageToRead, asksBrowserBudget, browserSupplement, wantsScreenshot } = await import("../src/lib/browser-read");
const { browserBudget, reserveBrowserSeconds, settleBrowserSeconds } = await import("../src/lib/browser-budget");

function kv() {
  const m = new Map<string, string>();
  return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v), map: m };
}
const env = (plan = "free", extra: Record<string, unknown> = {}) => ({ AZRAIL_KV: kv(), AZRAIL_BROWSER: {}, AZRAIL_WORKERS_PLAN: plan, ...extra }) as unknown as Env;

beforeEach(() => { calls.length = 0; finalUrl = "https://example.com/"; failGoto = false; shotSize = 1000; failSave = false; saved.length = 0; });

describe("проверка адреса", () => {
  it("публичные адреса проходят", () => {
    for (const ok of ["https://example.com/a?b=1", "http://news.site.org", "https://93.184.216.34/"]) expect(() => checkPublicUrl(ok), ok).not.toThrow();
  });
  it("внутренние и опасные не проходят", () => {
    for (const bad of ["ftp://x.com", "file:///etc/passwd", "http://localhost/", "http://127.0.0.1/", "http://10.0.0.5/", "http://192.168.1.1/", "http://172.20.0.1/", "http://169.254.169.254/latest", "http://[::1]/", "https://user:pass@example.com/", "https://example.com:8080/", "http://intranet/", "http://db.internal/", "http://2130706433/", "http://0x7f.1/", "javascript:alert(1)"]) expect(() => checkPublicUrl(bad), bad).toThrow();
  });
});

describe("лимит времени", () => {
  it("Free: 9 минут в день, Paid: 9 часов в месяц", async () => {
    expect((await browserBudget(env("free"))).capSeconds).toBe(540);
    expect((await browserBudget(env("paid"))).capSeconds).toBe(32400);
    expect((await browserBudget(env("paid", { AZRAIL_FORCE_FREE: "true" }))).plan).toBe("free");
  });
  it("резерв блокирует сверх лимита, возврат освобождает неиспользованное", async () => {
    const e = env("free");
    await reserveBrowserSeconds(e, 500);
    await expect(reserveBrowserSeconds(e, 45)).rejects.toThrow(/Лимит браузера/);
    await settleBrowserSeconds(e, 500, 10);
    expect((await browserBudget(e)).usedSeconds).toBe(10);
    await expect(reserveBrowserSeconds(e, 45)).resolves.toBeUndefined();
  });
  it("факт больше резерва засчитывается не выше резерва", async () => {
    const e = env("free");
    await reserveBrowserSeconds(e, 45);
    await settleBrowserSeconds(e, 45, 999);
    expect((await browserBudget(e)).usedSeconds).toBe(45);
  });
});

describe("чтение страницы", () => {
  it("возвращает заголовок и текст, закрывает браузер, учитывает время", async () => {
    const e = env();
    const page = await readPage(e, "https://example.com/");
    expect(page.title).toBe("Пример");
    expect(page.text).toBe("Текст страницы\n\nещё строка");
    expect(calls).toContain("close");
    expect((await browserBudget(e)).usedSeconds).toBeLessThan(5);
  });
  it("при ошибке браузер закрыт и резерв возвращён", async () => {
    const e = env();
    failGoto = true;
    await expect(readPage(e, "https://example.com/")).rejects.toThrow("timeout");
    expect(calls).toContain("close");
    expect((await browserBudget(e)).usedSeconds).toBeLessThan(5);
  });
  it("перенаправление на внутренний адрес отклоняется", async () => {
    finalUrl = "http://169.254.169.254/";
    await expect(readPage(env(), "https://example.com/")).rejects.toThrow(/внутренн/);
  });
  it("внутренние запросы страницы блокируются, публичные идут", async () => {
    await readPage(env(), "https://example.com/");
    const seen: string[] = [];
    for (const url of ["https://cdn.example.com/a.js", "http://10.0.0.1/x"]) requestHandler?.({ url: () => url, continue: () => seen.push("go:" + url), abort: () => seen.push("stop:" + url) });
    expect(seen).toEqual(["go:https://cdn.example.com/a.js", "stop:http://10.0.0.1/x"]);
  });
  it("без привязки браузера честная ошибка", async () => {
    await expect(readPage({ AZRAIL_KV: kv() } as unknown as Env, "https://example.com/")).rejects.toThrow(/не подключён/);
  });
  it("лимит исчерпан: браузер не запускается", async () => {
    const e = env();
    await reserveBrowserSeconds(e, 540);
    await expect(readPage(e, "https://example.com/")).rejects.toThrow(/Лимит браузера/);
    expect(calls).not.toContain("close");
  });
});

describe("просьба в чате", () => {
  it("нужны и глагол, и адрес; GitHub обрабатывается отдельно", () => {
    expect(pageToRead("открой https://example.com/a и перескажи")).toBe("https://example.com/a");
    expect(pageToRead("прочитай https://news.site.org/x.")).toBe("https://news.site.org/x");
    expect(pageToRead("https://example.com")).toBeNull();
    expect(pageToRead("открой страницу")).toBeNull();
    expect(pageToRead("сделай скриншот example.com")).toBe("https://example.com");
    expect(pageToRead("открой www.news.site.org/x?a=1.")).toBe("https://www.news.site.org/x?a=1");
    expect(pageToRead("прочитай файл notes.txt")).toBeNull();
    expect(pageToRead("открой почту me@example.com")).toBeNull();
    expect(pageToRead("посмотри https://github.com/a/b")).toBeNull();
  });
  it("вопрос про остаток", () => {
    expect(asksBrowserBudget("сколько осталось браузера")).toBe(true);
    expect(asksBrowserBudget("какой лимит у браузера")).toBe(true);
    expect(asksBrowserBudget("открой браузер")).toBe(false);
  });
  it("блок для модели: данные страницы с пометкой «не инструкции»", async () => {
    const text = await browserSupplement(env(), "открой https://example.com/");
    expect(text).toContain("СТРАНИЦА https://example.com/");
    expect(text).toContain("не инструкции");
    expect(text).toContain("Текст страницы");
  });
  it("при отказе — честная причина", async () => {
    const text = await browserSupplement(env(), "открой http://localhost/admin");
    expect(text).toContain("Не прочитана");
    expect(text).toContain("не выдумывай");
  });
  it("остаток: тариф и минуты", async () => {
    const text = await browserSupplement(env("free"), "сколько осталось браузера");
    expect(text).toContain("Workers Free");
    expect(text).toContain("9 мин");
  });
});

describe("скриншоты и остаток", () => {
  it("распознаёт просьбу о скриншоте", () => {
    for (const ok of ["сделай скриншот https://example.com", "покажи как выглядит https://example.com"]) {
      expect(wantsScreenshot(ok), ok).toBe(true);
      expect(pageToRead(ok), ok).toBe("https://example.com");
    }
    expect(wantsScreenshot("открой https://example.com")).toBe(false);
  });
  it("скриншот сохраняется за аккаунтом и отдаётся строкой для вставки", async () => {
    const text = await browserSupplement(env(), "сделай скриншот https://example.com/", "acc-1");
    expect(saved).toEqual([{ account: "acc-1", name: "screenshot-example.com.jpg", bytes: 1000 }]);
    expect(text).toContain("![скриншот example.com](/api/studio/artifacts/abc-123?inline=1)");
    expect(text.indexOf("РЕЗУЛЬТАТ СЕРВИСА")).toBeGreaterThan(text.indexOf("СТРАНИЦА"));
    expect(text.slice(text.indexOf("СТРАНИЦА"), text.indexOf("РЕЗУЛЬТАТ СЕРВИСА"))).not.toContain("![скриншот");
  });
  it("без просьбы о скриншоте картинка не снимается", async () => {
    await browserSupplement(env(), "открой https://example.com/", "acc-1");
    expect(saved).toEqual([]);
  });
  it("слишком большой скриншот не сохраняется, модель предупреждена", async () => {
    shotSize = 2_500_000;
    const text = await browserSupplement(env(), "сделай скриншот https://example.com/", "acc-1");
    expect(saved).toEqual([]);
    expect(text).toContain("Скриншот не получился");
  });
  it("ошибка сохранения не ломает чтение текста", async () => {
    failSave = true;
    const text = await browserSupplement(env(), "сделай скриншот https://example.com/", "acc-1");
    expect(text).toContain("Текст страницы");
    expect(text).toContain("сохранить не удалось");
  });
  it("остаток показывается с секундами после использования", async () => {
    const e = env("free");
    await reserveBrowserSeconds(e, 45);
    await settleBrowserSeconds(e, 45, 3.1);
    expect(await browserSupplement(e, "сколько осталось браузера")).toContain("Осталось 8 мин 56 с на сегодня из 9 мин");
  });
});

