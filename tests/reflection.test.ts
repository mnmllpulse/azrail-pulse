import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildReflection, FACT_LIMIT } from "../src/core/reflection";
import { buildReport, type CaseOutcome } from "../src/bench/report";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

const ok = (tool: string) => ({ tool, ok: true, result: "готово" });
const fail = (text: string) => ({ tool: "write_file", ok: false, result: text });

describe("Что достойно памяти", () => {
  it("успех записывается с указанием файлов", () => {
    // «Задача решена» без места — пересказ намерения, а не факт. Через
    // месяц ценность такой записи ноль, а место в каждом запросе она
    // занимает.
    const [fact] = buildReflection({
      goal: "починить авторизацию",
      history: [ok("read_file"), ok("edit_file")],
      changedFiles: ["src/auth.ts"],
    });
    expect(fact.category).toBe("architecture_decision");
    expect(fact.value).toContain("src/auth.ts");
  });

  it("успех без единого изменённого файла НЕ записывается", () => {
    expect(
      buildReflection({ goal: "цель", history: [ok("read_file"), ok("list_files")], changedFiles: [] }),
    ).toEqual([]);
  });

  it("неудача записывается только с причиной", () => {
    // ГЛАВНОЕ ПРАВИЛО. «Не получилось» без разбора — не знание, а
    // тревога: агент станет обходить место, где на самом деле нужна была
    // другая правка.
    const withCause = buildReflection({
      goal: "цель",
      history: [fail("Тест auth.test.ts падает: токен истекает раньше проверки подписи")],
      changedFiles: ["src/auth.ts"],
      rolledBack: true,
    });
    expect(withCause).toHaveLength(1);
    expect(withCause[0].category).toBe("known_issue");
    expect(withCause[0].value).toContain("токен истекает");

    const bare = buildReflection({
      goal: "цель",
      history: [fail("Error")],
      changedFiles: ["src/auth.ts"],
      rolledBack: true,
    });
    expect(bare, "ошибка без содержания не должна попадать в память").toEqual([]);
  });

  it("откат не записывается как успех", () => {
    // Иначе память будет утверждать, что задача решена правкой файлов,
    // которых больше нет.
    const facts = buildReflection({
      goal: "цель",
      history: [fail("Падает сборка: модуль ./config не найден после перемещения")],
      changedFiles: ["src/a.ts"],
      rolledBack: true,
    });
    expect(facts.every((f) => f.category !== "architecture_decision")).toBe(true);
  });

  it("препятствие без правок — ровно тот случай, ради которого память нужна", () => {
    const [fact] = buildReflection({
      goal: "добавить деплой",
      history: [fail("Нет доступа к переменной окружения CLOUDFLARE_API_TOKEN в этом проекте")],
      changedFiles: [],
    });
    expect(fact.category).toBe("known_issue");
    expect(fact.value).toContain("CLOUDFLARE_API_TOKEN");
  });

  it("пустая цель ничего не даёт", () => {
    expect(buildReflection({ goal: "   ", history: [ok("x")], changedFiles: ["a.ts"] })).toEqual([]);
  });

  it("длинный список файлов сворачивается в число", () => {
    // Сорок путей не помогают вспомнить — они засоряют запрос, в который
    // память подмешивается каждый раз.
    const files = Array.from({ length: 40 }, (_, i) => `src/file-${i}.ts`);
    const [fact] = buildReflection({ goal: "цель", history: [ok("x")], changedFiles: files });
    expect(fact.value).toContain("и ещё 36");
    expect(fact.value.length).toBeLessThanOrEqual(FACT_LIMIT);
  });

  it("факт не длиннее потолка", () => {
    const [fact] = buildReflection({
      goal: "ц",
      history: [fail("п".repeat(5000))],
      changedFiles: [],
    });
    expect(fact.value.length).toBe(FACT_LIMIT);
  });
});

describe("Рефлексия встроена в цикл", () => {
  const engine = src("src/core/execution-engine.ts");

  it("правила вынесены и вызываются", () => {
    // Решение «что достойно памяти» важнее механики записи и не должно
    // было прятаться внутри цикла.
    expect(engine).toContain("buildReflection(");
    expect(engine).toContain("if (!facts.length) return;");
  });

  it("цикл передаёт реальные изменения и факт отката", () => {
    // Старая версия писала «решено за N шагов через tool, tool» — то есть
    // перечисляла очевидное и не знала ни про файлы, ни про откат.
    expect(engine).toContain("this.reflect(ctx, goal, history, changes.map((c) => c.path), regressionRetryUsed)");
  });

  it("запись видна в карте миссии", () => {
    expect(engine).toContain('"memory.saved"');
    expect(src("public/index.html")).toContain("'memory.saved'");
  });
});

describe("Измеритель считает цену решения", () => {
  const outcome = (id: string, solved: boolean, calls: number | null): CaseOutcome => ({
    caseId: id,
    difficulty: "medium",
    before: { ok: false, passed: 0, failed: 1 },
    after: { ok: solved, passed: solved ? 1 : 0, failed: solved ? 0 : 1 },
    missionStatus: "done",
    durationMs: 1000,
    modelCalls: calls,
  });

  it("медиана считается по решённым задачам", () => {
    const r = buildReport([outcome("a", true, 6), outcome("b", true, 10), outcome("c", true, 8)]);
    expect(r.medianCallsPerSolved).toBe(8);
  });

  it("провалы не влияют на цену решения", () => {
    // Провалившаяся задача могла упереться в потолок шагов, и её расход
    // говорит о потолке, а не о цене решения.
    const r = buildReport([outcome("a", true, 6), outcome("b", false, 40)]);
    expect(r.medianCallsPerSolved).toBe(6);
  });

  it("несообщённый расход не считается нулём", () => {
    // Ноль означал бы «решено даром», и число тем лучше, чем хуже
    // отчётность моделей.
    const r = buildReport([outcome("a", true, 10), outcome("b", true, null)]);
    expect(r.medianCallsPerSolved).toBe(10);
  });

  it("если расход не известен ни по одной — null, а не ноль", () => {
    const r = buildReport([outcome("a", true, null)]);
    expect(r.medianCallsPerSolved).toBeNull();
  });

  it("доля решённых по-прежнему считается отдельно", () => {
    // Цена не должна подменять качество: это два разных числа, и смотреть
    // надо на оба.
    const r = buildReport([outcome("a", true, 6), outcome("b", false, 6)]);
    expect(r.score).toBe(50);
    expect(r.medianCallsPerSolved).toBe(6);
  });

  it("измеритель берёт расход из результата миссии", () => {
    const runner = src("src/bench/runner.ts");
    expect(runner).toContain("usage?.calls ?? null");
  });
});
