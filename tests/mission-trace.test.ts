import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve(__dirname, "..", "public/index.html"), "utf-8");
const engine = readFileSync(resolve(__dirname, "..", "src/core/execution-engine.ts"), "utf-8");
const journal = readFileSync(resolve(__dirname, "..", "src/core/execution-journal.ts"), "utf-8");
const stream = readFileSync(resolve(__dirname, "..", "src/lib/event-stream.ts"), "utf-8");
const store = readFileSync(resolve(__dirname, "..", "src/lib/event-store.ts"), "utf-8");

/**
 * НАЙДЕНО В БОЮ.
 *
 * Миссия шла десять минут и не показала НИ ОДНОГО шага. Счётчик секунд
 * тикал, карта миссии оставалась пустой, и со стороны это выглядело как
 * зависшая система.
 *
 * Работа при этом шла. Цикл писал каждый шаг в mission_events, роут
 * /api/mission отдавал их в поле events, опрос из интерфейса забирал
 * этот ответ каждые две секунды — и молча выбрасывал events, проверяя
 * одно поле done.
 *
 * Карта миссии кормилась ТОЛЬКО с веб-сокета. А сокет по умолчанию не
 * подключён: интерфейс писал «открой Живой журнал и нажми Подключить».
 * То есть показ хода работы был необязательной настройкой, о которой
 * человек узнавал, только прочитав подсказку в углу.
 *
 * Данные лежали на расстоянии вытянутой руки и не доходили до экрана.
 */

/** Тело функции по имени — через подсчёт скобок, а не по ближайшей строке. */
function functionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return "";
}

describe("ход миссии виден без веб-сокета", () => {
  it("опрос рисует шаги, а не только ждёт итога", () => {
    const tick = functionBody(html, "function tick()");
    expect(tick).not.toBe("");
    expect(tick).toContain("applyStoredEvents");
  });

  it("шаги рисуются ДО проверки завершения — иначе они появятся разом в конце", () => {
    const tick = functionBody(html, "function tick()");
    const draw = tick.indexOf("applyStoredEvents");
    const check = tick.indexOf("rep.done");
    expect(draw).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(-1);
    expect(draw).toBeLessThan(check);
  });

  it("строка из базы приводится к форме карты миссии", () => {
    const fn = functionBody(html, "function applyStoredEvents(list)");
    expect(fn).not.toBe("");
    // В базе поле называется type, а карта ждёт event.
    expect(fn).toContain("event: row.type");
    expect(fn).toContain("traceEvent(flat)");
  });

  it("запуск миссии сам поднимает связь, а не отсылает к кнопке", () => {
    const fn = functionBody(html, "function runAsk()") || html;
    expect(html).not.toContain("открой «Живой журнал» и нажми «Подключить»");
    expect(html).toContain("connectWs()");
  });
});

describe("один шаг не рисуется дважды", () => {
  it("событие из базы помечается как показанное", () => {
    const fn = functionBody(html, "function applyStoredEvents(list)");
    expect(fn).toContain("shownEvents[row.id]");
  });

  it("живое событие проверяется по тому же знаку", () => {
    const fn = functionBody(html, "function liveEvent(ev)");
    expect(fn).not.toBe("");
    expect(fn).toContain("shownEvents[ev.id]");
  });

  it("сокет идёт через unified event_stream и затем liveEvent, а не мимо проверки", () => {
    expect(html).toContain("data.type === 'event_stream'");
    expect(html).toContain("liveEvent(Object.assign");
    expect(html).not.toContain("traceEvent(data)");
  });

  it("новая миссия забывает знаки прошлой", () => {
    const fn = functionBody(html, "function resetTrace()");
    expect(fn).toContain("shownEvents");
  });

  it("знак приходит из базы, а не выдумывается на месте", () => {
    // Иначе у двух каналов будут РАЗНЫЕ знаки, и проверка не сработает.
    expect(journal).toContain("id: streamEvent?.id");
    expect(journal).toContain("streamEvent = await emitMissionEvent(");
  });

  it("сбой записи в журнал не роняет живой показ", () => {
    // Event Stream fail-closed: realtime кадр отправляется только если есть durable envelope.
    expect(journal).toContain("let streamEvent:");
    expect(journal).toContain("streamEvent,");
  });
});

describe("порядок шагов", () => {
  it("новый поток использует монотонный seq, а legacy fallback сохраняет старый порядок", () => {
    expect(stream).toMatch(/ORDER BY (?:e\.)?seq ASC/);
    expect(store).toContain("ORDER BY created_at ASC, rowid ASC");
  });
});
