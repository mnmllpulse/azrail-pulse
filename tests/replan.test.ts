import { describe, it, expect } from "vitest";
import { coreEngineSource } from "./helpers/core-source";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { revisePlan, planExhausted, MAX_REVISIONS, type PlanStep } from "../src/core/planner";
import { parseDecision } from "../src/core/execution-engine";
import type { Env } from "../src/types";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/** D1, запоминающий выполненные запросы: проверяется не только результат в
 *  памяти, но и то, что изменение доехало до базы. */
function fakeD1() {
  const writes: Array<{ sql: string; args: unknown[] }> = [];
  return {
    writes,
    prepare(sql: string) {
      const stmt = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          stmt.args = args;
          return stmt;
        },
        async run() {
          writes.push({ sql, args: stmt.args });
          return { success: true };
        },
        executeAll() {
          writes.push({ sql, args: stmt.args });
          return { results: /RETURNING\s+id/i.test(sql) ? [{ id: String(stmt.args.at(-2) ?? stmt.args.at(0) ?? "ok") }] : [], success: true };
        },
        async all() { return { results: [] }; },
        async first() { return null; },
      };
      return stmt;
    },
    async batch(statements: Array<{ executeAll(): unknown }>) {
      return statements.map((stmt) => stmt.executeAll());
    },
  };
}

const envWith = (db: ReturnType<typeof fakeD1>) => ({ AZRAIL_D1: db } as unknown as Env);

const plan = (): PlanStep[] => [
  { id: "s1", position: 0, title: "прочитать проект", status: "done" },
  { id: "s2", position: 1, title: "починить не то", status: "doing" },
  { id: "s3", position: 2, title: "и это не то", status: "pending" },
];

describe("Пересборка плана", () => {
  it("выполненное не трогается", async () => {
    // Это сделанная работа. Переписать её задним числом значит потерять
    // след того, что происходило, — а через месяц вопрос «почему миссия
    // пошла не туда» решается только по журналу.
    const db = fakeD1();
    const next = await revisePlan(envWith(db), "m1", plan(), ["новый шаг"], "план не годится");
    const done = next.filter((s) => s.status === "done");
    expect(done.map((s) => s.title)).toEqual(["прочитать проект"]);
  });

  it("невыполненное помечается отменённым с причиной, а не удаляется", async () => {
    const db = fakeD1();
    const next = await revisePlan(envWith(db), "m1", plan(), ["новый шаг"], "выяснилось другое");
    const skipped = next.filter((s) => s.status === "skipped");
    expect(skipped).toHaveLength(2);
    expect(skipped[0].note).toContain("выяснилось другое");
  });

  it("первый новый шаг сразу в работе", async () => {
    const db = fakeD1();
    const next = await revisePlan(envWith(db), "m1", plan(), ["первый", "второй"], "причина");
    const fresh = next.filter((s) => s.status === "doing" || s.status === "pending");
    expect(fresh.map((s) => [s.title, s.status])).toEqual([
      ["первый", "doing"],
      ["второй", "pending"],
    ]);
  });

  it("новые шаги продолжают нумерацию, а не начинают с нуля", async () => {
    // Позиция — порядок показа. Начав заново, новый шаг встал бы выше уже
    // выполненного, и план читался бы как «сделано после того, что впереди».
    const db = fakeD1();
    const next = await revisePlan(envWith(db), "m1", plan(), ["новый"], "причина");
    expect(next.find((s) => s.title === "новый")!.position).toBe(1);
  });

  it("пустая замена оставляет старый план", async () => {
    // Остаться совсем без плана хуже, чем с неверным: неверный хотя бы
    // задаёт направление.
    const db = fakeD1();
    const before = plan();
    const next = await revisePlan(envWith(db), "m1", before, ["   ", ""], "причина");
    expect(next).toBe(before);
    expect(db.writes, "в базу не должно уйти ничего").toHaveLength(0);
  });

  it("изменения доезжают до базы", async () => {
    const db = fakeD1();
    await revisePlan(envWith(db), "m1", plan(), ["новый"], "причина");
    expect(db.writes.some((w) => /UPDATE mission_steps/.test(w.sql))).toBe(true);
    expect(db.writes.some((w) => /INSERT INTO mission_steps/.test(w.sql))).toBe(true);
  });

  it("сбой базы не роняет пересборку", async () => {
    // Durable plan — источник истины: при сбое записи нельзя продолжать с новым неперсистентным планом.
    const broken = {
      prepare() { throw new Error("D1 упал"); },
      async batch() { throw new Error("D1 упал"); },
    } as unknown as Env["AZRAIL_D1"];
    const before = plan();
    const next = await revisePlan({ AZRAIL_D1: broken } as Env, "m1", before, ["новый"], "причина");
    expect(next).toBe(before);
    expect(next.some((s) => s.title === "новый")).toBe(false);
  });
});

describe("Исчерпанность плана", () => {
  it("пустой план не считается исчерпанным", () => {
    // Плана не было вовсе — это не «кончился», и пересобирать нечего.
    expect(planExhausted([])).toBe(false);
  });

  it("всё сделано или отменено — исчерпан", () => {
    expect(
      planExhausted([
        { id: "a", position: 0, title: "x", status: "done" },
        { id: "b", position: 1, title: "y", status: "skipped" },
      ]),
    ).toBe(true);
  });

  it("есть незакрытый шаг — не исчерпан", () => {
    expect(planExhausted(plan())).toBe(false);
  });
});

describe("Сигнал replan от модели", () => {
  it("принимается как решение, а не как мусор", () => {
    // До этого решение без инструмента и без done отбрасывалось: у модели
    // не было способа сказать, что план неверен.
    const d = parseDecision('{"replan":true,"reason":"файлов нет там, где план ожидал"}');
    expect(d?.replan).toBe(true);
    expect(d?.reason).toContain("файлов нет");
  });

  it("пустой объект по-прежнему не решение", () => {
    expect(parseDecision("{}")).toBeNull();
    expect(parseDecision('{"replan":false}')).toBeNull();
  });
});

describe("Цикл умеет пересобирать план", () => {
  const engine = code(coreEngineSource());

  it("два повода: просьба модели и исчерпанный план", () => {
    expect(engine).toContain("decision.replan || exhausted");
    expect(engine).toContain("planExhausted(plan)");
  });

  it("число пересборок ограничено", () => {
    // Без потолка цикл сползает в «планирую, как планировать»: каждая
    // неудача рождает новый план, новый план — новую неудачу, и потолок
    // шагов уходит в никуда.
    expect(engine).toContain("claimPlanRevision(this.env,ctx.missionId,MAX_REVISIONS)");
    expect(MAX_REVISIONS).toBeLessThanOrEqual(2);
  });

  it("пересборка видит сделанное", () => {
    // Иначе модель повторила бы уже выполненные шаги и миссия пошла бы по
    // кругу — ровно то, от чего пересборка должна спасать.
    const planning = src("src/core/execution-planning.ts");
    const helper = planning.slice(planning.indexOf("async replanTitles"));
    expect(helper).toContain("renderHistory(history)");
    expect(helper).toContain("Не повторяй уже сделанное");
  });

  it("новый план не длиннее остатка шагов", () => {
    // План из восьми шагов при трёх оставшихся — обещание, которое нечем
    // выполнить.
    const planning = src("src/core/execution-planning.ts");
    const helper = planning.slice(planning.indexOf("async replanTitles"));
    expect(helper).toContain("Math.min(planStepCap(remaining), 6)");
    expect(helper).toContain("if (remaining <= 1) return [];");
  });

  it("модель знает про формат replan", () => {
    const prompt = src("src/core/execution-planning.ts");
    // Граница — начало класса: StepDecision объявлен ВЫШЕ промпта, и срез
    // до него давал пустую строку, на которой тест «проходил» бы молча,
    // если бы проверял отсутствие вместо наличия.
    const block = prompt.slice(
      prompt.indexOf("export const LOOP_SYSTEM_PROMPT"),
      prompt.indexOf("export class ExecutionPlanningEngine"),
    );
    expect(block).toContain('{"replan":true');
    // Важно, как это подано: иначе модель будет считать просьбу
    // пересобрать план признанием поражения и избегать её.
    expect(block).toContain("не признание поражения");
  });

  it("после replan шаг работы не выполняется", () => {
    // У решения с replan нет инструмента: пойти дальше с ним значит
    // свалиться в ветку «готово» с пустым решением.
    const loop = engine.slice(engine.indexOf("const exhausted = planExhausted(plan)"));
    expect(loop.slice(0, 1600)).toContain("if (decision.replan) continue;");
  });
});
