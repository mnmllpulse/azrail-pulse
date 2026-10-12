import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { recallContext } from "../src/lib/memory-agent";
import type { Env } from "../src/types";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/** D1, отдающий заданный список фактов. */
function fakeD1(rows: Array<{ category: string; key: string; value: string }>) {
  let lastLimit = 0;
  return {
    get lastLimit() {
      return lastLimit;
    },
    prepare() {
      const stmt = {
        bind(...args: unknown[]) {
          lastLimit = Number(args[args.length - 1]);
          return stmt;
        },
        async all() {
          return {
            results: rows.slice(0, lastLimit).map((r, i) => ({
              id: String(i),
              category: r.category,
              key: r.key,
              value: r.value,
              source_agent: null,
              updated_at: "2026-09-16T00:00:00.000Z",
            })),
          };
        },
      };
      return stmt;
    },
  };
}

const envWith = (db: ReturnType<typeof fakeD1>) => ({ AZRAIL_D1: db } as unknown as Env);

describe("Вспоминание фактов", () => {
  it("пустая память — это null, а не пустой блок", async () => {
    // Пустой блок занял бы место в запросе и выглядел бы как «известно
    // ничего» вместо «нечего вспоминать».
    expect(await recallContext(envWith(fakeD1([])), "p1")).toBeNull();
  });

  it("факты приходят с категорией и ключом", async () => {
    const db = fakeD1([{ category: "architecture_decision", key: "роутинг", value: "через Hono" }]);
    const text = await recallContext(envWith(db), "p1");
    expect(text).toContain("[architecture_decision] роутинг: через Hono");
  });

  it("обрезка идёт по фактам целиком и объявляется", async () => {
    // Половина факта хуже его отсутствия: модель достроит недосказанное
    // сама. А молча укороченная память выглядит как полная.
    const rows = Array.from({ length: 30 }, (_, i) => ({
      category: "known_issue",
      key: `ключ-${i}`,
      value: "о".repeat(400),
    }));
    const text = (await recallContext(envWith(fakeD1(rows)), "p1"))!;

    expect(text.length).toBeLessThan(3400);
    expect(text).toContain("опущено");
    for (const line of text.split("\n")) {
      if (line.startsWith("…")) continue;
      // Ни одной оборванной записи.
      expect(line).toMatch(/^\[known_issue\] ключ-\d+: о+$/);
    }
  });

  it("огромный единственный факт не выдаётся обрезком", async () => {
    const text = await recallContext(
      envWith(fakeD1([{ category: "known_issue", key: "k", value: "о".repeat(9000) }])),
      "p1",
    );
    expect(text).toBeNull();
  });
});

describe("Память доходит до модели", () => {
  const engine = src("src/core/execution-engine.ts");

  it("цикл её действительно читает", () => {
    // САМЫЙ ОБИДНЫЙ ПРОБЕЛ ВО ВСЕЙ СИСТЕМЕ: recallContext была написана с
    // комментарием «то, что реально спрашивается перед каждым решением» —
    // и не вызывалась НИКЕМ. Цикл импортировал только rememberFact. AZRAIL
    // копил знание о проекте и каждую миссию начинал с чистого листа.
    expect(engine).toContain("recallContext(this.env, ctx.projectId)");
    expect(engine).toContain("let memoryBlock");
  });

  it("память идёт до карты и разведки", () => {
    // Она дешевле обеих — одно чтение из D1 — и может сделать их лишними.
    const mem = engine.indexOf("recallContext(this.env, ctx.projectId)");
    const scouts = engine.indexOf('let scoutReport = ""');
    const plan = engine.indexOf("this.buildPlan(goal");
    expect(mem).toBeLessThan(scouts);
    expect(mem).toBeLessThan(plan);
  });

  it("память попадает и в шаг, и в планирование", () => {
    const planning = src("src/core/execution-planning.ts");
    const step = planning.slice(planning.indexOf("async decideNextStep"));
    const build = planning.slice(planning.indexOf("async buildPlan"));
    expect(step.slice(0, 2500)).toContain("memoryBlock");
    expect(build.slice(0, 2000)).toContain("memoryBlock");
  });

  it("вспомненное подано как подсказка, а не как истина", () => {
    // Факты писала прошлая миссия, и они могли устареть. Модель, принявшая
    // их за проверенное знание, будет чинить по описанию вместо кода.
    expect(engine).toContain("это не гарантия");
  });

  it("сбой чтения памяти не роняет миссию", () => {
    const block = engine.slice(engine.indexOf("let memoryBlock"));
    expect(block.slice(0, 1500)).toContain("memory.recall_failed");
  });

  it("вспоминание видно в карте миссии", () => {
    expect(engine).toContain('"memory.recalled"');
    expect(src("public/index.html")).toContain("'memory.recalled'");
  });
});

describe("Честные границы памяти", () => {
  it("в коде записано, что это не поиск по смыслу", () => {
    // Подмешивается ПОСЛЕДНЕЕ, а не подходящее. При большом проекте свежий
    // пустяк вытеснит важное решение полугодовой давности. Выдавать отбор
    // по свежести за релевантность нельзя — ни в коде, ни в разговоре.
    const mem = src("src/lib/memory-agent.ts");
    expect(mem).toContain("НЕ поиск по смыслу");
    expect(mem).toContain("векторным");
  });
});
