import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { SEED_CASES, validateCases, type BenchCase } from "../src/bench/cases";
import { verdictFor, buildReport, compareRuns, median, type CaseOutcome } from "../src/bench/report";
import { runBench, type BenchDeps } from "../src/bench/runner";
import type { Env, TaskResult } from "../src/types";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/**
 * ИЗМЕРИТЕЛЬ ПРОВЕРЯЕТ АГЕНТА — А ЧТО ПРОВЕРЯЕТ ИЗМЕРИТЕЛЬ?
 *
 * Эти тесты. Инструмент, который завышает оценку, хуже отсутствующего:
 * отсутствующий честно молчит, а завышающий даёт основание считать
 * улучшением то, что улучшением не было. Поэтому проверяется в первую
 * очередь не «считает ли он», а «не врёт ли он».
 */

const outcome = (o: Partial<CaseOutcome> & { caseId: string }): CaseOutcome => ({
  difficulty: "средняя",
  before: null,
  after: null,
  missionStatus: "done",
  durationMs: 1000,
  ...o,
});

const red = { ok: false, passed: 1, failed: 2 };
const green = { ok: true, passed: 3, failed: 0 };

describe("Вердикт по задаче", () => {
  it("успех — только переход из красного в зелёное", () => {
    expect(verdictFor(outcome({ caseId: "a", before: red, after: green }))).toBe("solved");
  });

  it("зелёные тесты ДО работы делают задачу негодной, а не решённой", () => {
    // Самый опасный случай: такая задача даёт успех при любом поведении
    // агента, включая полное бездействие. Засчитать её значит завысить
    // оценку так, что заметить это по итоговому числу невозможно.
    expect(verdictFor(outcome({ caseId: "a", before: green, after: green }))).toBe("invalid");
  });

  it("сломанное отделено от нерешённого", () => {
    // Агент, починивший одно и сломавший три, формально ничем не отличается
    // от того, кто не сделал ничего. Именно этот случай нужен отдельной
    // строкой — сам он о себе не сообщит.
    const worse = { ok: false, passed: 0, failed: 3 };
    expect(verdictFor(outcome({ caseId: "a", before: red, after: worse }))).toBe("regressed");
    expect(verdictFor(outcome({ caseId: "a", before: red, after: red }))).toBe("failed");
  });

  it("несостоявшийся прогон не записывается в провалы агента", () => {
    // Иначе число падает при сбоях песочницы и выглядит как деградация
    // качества — отличить одно от другого станет нельзя.
    expect(verdictFor(outcome({ caseId: "a", before: red, after: null }))).toBe("unmeasured");
    expect(verdictFor(outcome({ caseId: "a", before: null, after: green }))).toBe("unmeasured");
  });
});

describe("Итоговая оценка", () => {
  it("негодные и непрогнанные не входят в знаменатель", () => {
    const report = buildReport([
      outcome({ caseId: "1", before: red, after: green }),
      outcome({ caseId: "2", before: red, after: red }),
      outcome({ caseId: "3", before: green, after: green }),
      outcome({ caseId: "4", before: red, after: null }),
    ]);
    expect(report.measured).toBe(2);
    expect(report.score).toBe(50);
    expect(report.invalid).toBe(1);
    expect(report.unmeasured).toBe(1);
  });

  it("ноль годных задач — это ноль, а не деление на ноль", () => {
    const report = buildReport([outcome({ caseId: "1", before: green, after: green })]);
    expect(report.score).toBe(0);
    expect(Number.isFinite(report.score)).toBe(true);
  });

  it("разбивка по сложности считает только годные", () => {
    const report = buildReport([
      outcome({ caseId: "1", difficulty: "лёгкая", before: red, after: green }),
      outcome({ caseId: "2", difficulty: "тяжёлая", before: red, after: red }),
      outcome({ caseId: "3", difficulty: "тяжёлая", before: green, after: green }),
    ]);
    expect(report.byDifficulty["лёгкая"]).toEqual({ measured: 1, solved: 1 });
    expect(report.byDifficulty["тяжёлая"]).toEqual({ measured: 1, solved: 0 });
  });

  it("время — медиана, а не среднее", () => {
    // Одна задача, упёршаяся в таймаут, сдвигает среднее так, что по нему
    // уже ничего не видно.
    expect(median([1000, 1100, 900, 1050, 600_000])).toBe(1050);
  });
});

describe("Сравнение прогонов", () => {
  it("рост оценки не прячет сломанные задачи", () => {
    // Итог в плюсе, а изменение плохое: две задачи решались и перестали.
    // По одному числу это выглядит улучшением.
    const before = [
      outcome({ caseId: "a", before: red, after: green }),
      outcome({ caseId: "b", before: red, after: red }),
      outcome({ caseId: "c", before: red, after: red }),
    ];
    const after = [
      outcome({ caseId: "a", before: red, after: red }),
      outcome({ caseId: "b", before: red, after: green }),
      outcome({ caseId: "c", before: red, after: green }),
    ];
    const diff = compareRuns(before, after);
    expect(diff.scoreDelta).toBeGreaterThan(0);
    expect(diff.broke, "сломанная задача обязана быть названа поимённо").toEqual(["a"]);
    expect(diff.fixed).toEqual(["b", "c"]);
  });
});

describe("Набор задач", () => {
  it("семена проходят проверку формата", () => {
    expect(validateCases(SEED_CASES)).toEqual([]);
  });

  it("каждая задача содержит тест, который должен падать до правки", () => {
    // Проверить исполнением здесь нельзя — нужен контейнер. Но можно
    // проверить структуру: в каждой inline-задаче есть и код, и тест.
    for (const c of SEED_CASES) {
      if (c.kind !== "inline") continue;
      const hasTest = c.files.some((f) => /\.test\.[jt]s$/.test(f.path));
      expect(hasTest, `${c.id}: нет файла с тестами`).toBe(true);
      expect(c.verify).toContain("node --test");
    }
  });

  it("ветка вместо коммита отвергается", () => {
    // Самая дорогая ошибка в наборе: ветка едет, вчерашний прогон
    // перестаёт быть сравнимым с сегодняшним, и выглядит всё исправно.
    const bad: BenchCase[] = [
      { kind: "git", id: "x", title: "t", task: "t", verify: "npm test", maxIterations: 5,
        difficulty: "средняя", repo: "o/r", commit: "main" },
    ];
    expect(validateCases(bad).join(" ")).toContain("commit должен быть хешем");
  });

  it("повторы id и небезопасные пути видны", () => {
    const dup = [...SEED_CASES, SEED_CASES[0]];
    expect(validateCases(dup).join(" ")).toContain("повтор id");

    const unsafe: BenchCase[] = [
      { kind: "inline", id: "u", title: "t", task: "t", verify: "node --test", maxIterations: 3,
        difficulty: "лёгкая", files: [{ path: "../../etc/passwd", content: "x" }] },
    ];
    expect(validateCases(unsafe).join(" ")).toContain("небезопасный путь");
  });
});

describe("Раннер", () => {
  const env = {
    AZRAIL_R2: { async put() {} },
  } as unknown as Env;

  const deps = (over: Partial<BenchDeps> = {}): BenchDeps => ({
    runMission: async (): Promise<TaskResult> => ({ status: "done", agent: "x", summary: "готово" }),
    execInSandbox: async () => ({ exitCode: 1, output: "# fail 2\n# pass 1" }),
    syncWorkspace: async () => undefined,
    now: () => 0,
    ...over,
  });

  it("не запускает миссию, если тесты уже зелены", async () => {
    // Иначе прогон стоил бы полного цикла вызовов модели ради заведомо
    // бессмысленного числа.
    let missionsRun = 0;
    const res = await runBench(
      env,
      deps({
        runMission: async () => {
          missionsRun++;
          return { status: "done", agent: "x", summary: "" };
        },
        execInSandbox: async () => ({ exitCode: 0, output: "# pass 3\n# fail 0" }),
      }),
      [SEED_CASES[0]],
      { runId: "t1" },
    );
    expect(missionsRun).toBe(0);
    expect(res.outcomes[0].error).toContain("зелены ДО работы");
    expect(res.report.invalid).toBe(1);
    expect(res.report.score).toBe(0);
  });

  it("код возврата важнее текста вывода", async () => {
    // Прогонщик может напечатать что угодно ободряющее и выйти с
    // ненулевым кодом — ровно этим обманывается модель, читающая вывод
    // глазами. Измеритель обманываться так же не должен.
    const res = await runBench(
      env,
      deps({ execInSandbox: async () => ({ exitCode: 1, output: "All done! Everything is fine\n# pass 3\n# fail 0" }) }),
      [SEED_CASES[0]],
      { runId: "t2" },
    );
    expect(res.outcomes[0].before?.ok).toBe(false);
  });

  it("сбой песочницы даёт «не измерено», а не «провал»", async () => {
    const res = await runBench(
      env,
      deps({
        execInSandbox: async () => {
          throw new Error("контейнер не ответил");
        },
      }),
      [SEED_CASES[0]],
      { runId: "t3" },
    );
    expect(res.report.unmeasured).toBe(1);
    expect(res.report.failed).toBe(0);
  });

  it("упавшая миссия не роняет весь прогон", async () => {
    let calls = 0;
    const res = await runBench(
      env,
      deps({
        runMission: async () => {
          calls++;
          if (calls === 1) throw new Error("модель отказала");
          return { status: "done", agent: "x", summary: "" };
        },
      }),
      [SEED_CASES[0], SEED_CASES[1]],
      { runId: "t4" },
    );
    expect(res.outcomes).toHaveLength(2);
    expect(res.outcomes[0].error).toContain("модель отказала");
  });

  it("кейс на репозитории без настройки честно помечается непрогнанным", async () => {
    // Выдуманный исход хуже отсутствующего: он попадает в число.
    const gitCase: BenchCase = {
      kind: "git", id: "g1", title: "t", task: "t", verify: "npm test", maxIterations: 4,
      difficulty: "средняя", repo: "o/r", commit: "abc1234",
    };
    const res = await runBench(env, deps(), [gitCase], { runId: "t5" });
    expect(res.outcomes[0].error).toContain("не настроены");
    expect(res.report.unmeasured).toBe(1);
  });

  it("проблемы формата не скрываются за итоговым числом", async () => {
    const res = await runBench(env, deps(), [...SEED_CASES, SEED_CASES[0]], { runId: "t6", only: ["off-by-one-range"] });
    expect(res.problems.join(" ")).toContain("повтор id");
  });
});

describe("Рабочая область и песочница наконец связаны", () => {
  it("есть перенос файлов проекта в контейнер", () => {
    // До этого write_file писал в R2, а sandbox_exec выполнял команды в
    // контейнере, который этих файлов не видел. Прогнать тесты на том,
    // что агент только что написал, было нечем вовсе.
    const sync = src("src/core/workspace-sync.ts");
    expect(sync).toContain("export async function syncWorkspaceToSandbox");
    expect(sync).toContain("box.writeFile");
  });

  it("измеритель заливает файлы перед КАЖДЫМ замером", () => {
    // Замер на устаревшем содержимом даёт ложный результат — то есть
    // ровно то, ради чего измеритель и строился, перестаёт работать.
    const runner = src("src/bench/runner.ts");
    const measure = runner.slice(runner.indexOf("async function measure"), runner.indexOf("export async function runBenchCase"));
    expect(measure).toContain("deps.syncWorkspace(projectId)");
  });

  it("прогон требует подтверждения и контейнера", () => {
    const idx = src("src/index.ts");
    const bench = idx.slice(idx.indexOf('url.pathname === "/api/bench" && request.method === "POST"'));
    expect(bench).toContain("benchBody.confirm");
    expect(bench).toContain('detectBackend(env) !== "container"');
    // Цена должна быть в тексте отказа: решение принимают, зная её.
    expect(bench).toContain("estimatedModelCalls");
  });
});
