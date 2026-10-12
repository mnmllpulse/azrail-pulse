import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  runScout,
  runScouts,
  renderFindings,
  shouldScout,
  planScoutQuestions,
  isScoutTool,
  SCOUT_TOOLS,
  MAX_SCOUTS,
  MAX_SCOUT_STEPS,
  FINDING_LIMIT,
  type ScoutDeps,
} from "../src/core/scout";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/** Заглушка: очередь ответов модели и журнал вызванных инструментов. */
function deps(answers: string[], toolImpl?: ScoutDeps["runTool"]): ScoutDeps & { calls: string[] } {
  const calls: string[] = [];
  let i = 0;
  return {
    calls,
    ask: async () => {
      const a = answers[i++];
      if (a === undefined) throw new Error("ответы кончились");
      return a;
    },
    runTool: async (tool, input) => {
      calls.push(tool);
      return toolImpl ? toolImpl(tool, input) : `содержимое ${tool}`;
    },
  };
}

describe("Один разведчик", () => {
  it("смотрит и докладывает", async () => {
    const d = deps([
      '{"tool":"read_file","input":{"path":"src/app.ts"}}',
      '{"finding":"Обработчик задач в src/app.ts, функция handleTask."}',
    ]);
    const res = await runScout(d, "где обработчик задач?", "карта");
    expect(res.ok).toBe(true);
    expect(res.finding).toContain("handleTask");
    expect(d.calls).toEqual(["read_file"]);
  });

  it("не выходит за отведённые шаги", async () => {
    // Разведчик, которому нужно больше двух шагов, решает не свою задачу —
    // и тратит бюджет главного цикла.
    const d = deps([
      '{"tool":"list_files","input":{}}',
      '{"tool":"read_file","input":{"path":"a.ts"}}',
      '{"tool":"read_file","input":{"path":"b.ts"}}',
    ]);
    const res = await runScout(d, "вопрос", "карта");
    expect(res.ok).toBe(false);
    expect(res.steps).toBe(MAX_SCOUT_STEPS);
    expect(d.calls.length).toBeLessThanOrEqual(MAX_SCOUT_STEPS);
  });

  it("писать не даёт — и говорит об этом вслух", async () => {
    // Запрет держится белым списком, а не просьбой в промпте: промпт —
    // пожелание, список — условие. А молчание в ответ модель истолкует
    // как «инструмента нет» и пойдёт искать обход.
    const d = deps([
      '{"tool":"write_file","input":{"path":"a.ts","content":"x"}}',
      '{"finding":"выяснил без записи"}',
    ]);
    const res = await runScout(d, "вопрос", "карта");
    expect(d.calls, "инструмент записи не должен быть вызван вообще").toEqual([]);
    expect(res.ok).toBe(true);
  });

  it("белый список закрыт для правок", () => {
    expect(SCOUT_TOOLS).toEqual(["read_file", "list_files", "search_files"]);
    for (const forbidden of ["write_file", "edit_file", "apply_patch", "sandbox_exec", "deploy"]) {
      expect(isScoutTool(forbidden), `${forbidden} не должен быть доступен разведчику`).toBe(false);
    }
  });

  it("длинный доклад обрезается", async () => {
    // Смысл затеи — вернуть в главный контекст ВЫВОД, а не пересказ файла
    // целиком. Без потолка разведка экономит ровно ничего.
    const d = deps([`{"finding":"${"о".repeat(3000)}"}`]);
    const res = await runScout(d, "вопрос", "карта");
    expect(res.finding.length).toBe(FINDING_LIMIT);
  });

  it("ошибка инструмента не убивает разведчика", async () => {
    const d = deps(
      ['{"tool":"read_file","input":{"path":"нет.ts"}}', '{"finding":"файла нет, смотрел по карте"}'],
      async () => {
        throw new Error("файл не найден");
      },
    );
    const res = await runScout(d, "вопрос", "карта");
    expect(res.ok).toBe(true);
  });

  it("неразбираемый ответ — честная неудача, а не выдумка", async () => {
    const res = await runScout(deps(["я подумал и решил, что всё нормально"]), "вопрос", "карта");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("неразбираемый");
  });
});

describe("Разведчики идут одновременно", () => {
  it("работают параллельно и не мешают друг другу", async () => {
    let running = 0;
    let peak = 0;
    const d: ScoutDeps = {
      ask: async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        return '{"finding":"готово"}';
      },
      runTool: async () => "",
    };
    const res = await runScouts(d, ["а", "б", "в"], "карта");
    expect(res).toHaveLength(3);
    expect(peak, "разведчики обязаны идти одновременно, иначе смысла нет").toBeGreaterThan(1);
  });

  it("упавший не отменяет выводы остальных", async () => {
    // Вопросы независимы — значит и неудачи независимы. all вместо
    // allSettled потерял бы два готовых ответа из-за одного сбоя.
    let n = 0;
    const d: ScoutDeps = {
      ask: async () => {
        n++;
        if (n === 2) throw new Error("модель отказала");
        return '{"finding":"вывод"}';
      },
      runTool: async () => "",
    };
    const res = await runScouts(d, ["а", "б", "в"], "карта");
    expect(res.filter((f) => f.ok)).toHaveLength(2);
    expect(res.filter((f) => !f.ok)).toHaveLength(1);
  });

  it("число разведчиков ограничено", async () => {
    const d: ScoutDeps = { ask: async () => '{"finding":"x"}', runTool: async () => "" };
    const res = await runScouts(d, ["1", "2", "3", "4", "5"], "карта");
    expect(res).toHaveLength(MAX_SCOUTS);
  });
});

describe("Доклад в главный цикл", () => {
  it("неудачи называются, а не прячутся", () => {
    // Молча показать два вывода из трёх — значит дать модели считать
    // картину полной. Она построит решение на том, что третий вопрос
    // остался без ответа, даже не зная, что он задавался.
    const text = renderFindings([
      { question: "а", finding: "ответ", ok: true, steps: 1 },
      { question: "б", finding: "", ok: false, steps: 2, error: "не уложился" },
    ]);
    expect(text).toContain("вопросов без ответа: 1");
  });

  it("пустой доклад не занимает место в запросе", () => {
    expect(renderFindings([{ question: "а", finding: "", ok: false, steps: 2 }])).toBe("");
  });

  it("сказано, что файлы надо читать самому", () => {
    const text = renderFindings([{ question: "а", finding: "ответ", ok: true, steps: 1 }]);
    expect(text).toContain("содержимое файлов читай сам");
  });
});

describe("Когда разведка не нужна", () => {
  const base = { fileCount: 40, maxIterations: 8, goal: "разобраться, почему падает авторизация" };

  it("на осмысленной задаче в большом проекте — нужна", () => {
    expect(shouldScout(base)).toBe(true);
  });

  it("в пустом проекте разбирать нечего", () => {
    expect(shouldScout({ ...base, fileCount: 3 })).toBe(false);
  });

  it("при малом числе шагов разведка съест работу", () => {
    expect(shouldScout({ ...base, maxIterations: 4 })).toBe(false);
  });

  it("на точечной задаче разбираться не в чем", () => {
    expect(shouldScout({ ...base, goal: "поменяй заголовок" })).toBe(false);
  });
});

describe("Вопросы для разведки", () => {
  it("разбираются из JSON и ограничены по числу", async () => {
    const qs = await planScoutQuestions(
      { ask: async () => '```json\n["первый","второй","третий","четвёртый"]\n```' },
      "цель",
      "карта",
    );
    expect(qs).toEqual(["первый", "второй", "третий"]);
  });

  it("мусор не роняет миссию — разведки просто не будет", async () => {
    expect(await planScoutQuestions({ ask: async () => "не знаю" }, "цель", "карта")).toEqual([]);
    expect(
      await planScoutQuestions(
        {
          ask: async () => {
            throw new Error("модель недоступна");
          },
        },
        "цель",
        "карта",
      ),
    ).toEqual([]);
  });
});

describe("Разведка встроена в миссию", () => {
  const engine = src("src/core/execution-engine.ts");

  it("идёт после карты и до плана", () => {
    // Карта нужна разведчикам как исходный ориентир, а план должен
    // строиться уже по её выводам.
    const map = engine.indexOf('let repoMap = ""');
    const scouts = engine.indexOf('let scoutReport = ""');
    const plan = engine.indexOf("plan = await this.buildPlan(");
    expect(map).toBeLessThan(scouts);
    expect(scouts).toBeLessThan(plan);
  });

  it("план строится по фактам, а не вслепую", () => {
    // Раньше он был первым действием миссии — то есть составлялся в полном
    // неведении о проекте. Отсюда шаги вроде «открыть файл конфигурации»,
    // которого в проекте нет.
    const planning = src("src/core/execution-planning.ts");
    const build = planning.slice(planning.indexOf("async buildPlan"));
    expect(build.slice(0, 1800)).toContain("repoMap");
    expect(build.slice(0, 1800)).toContain("scoutReport");
  });

  it("разведчики ходят тем же исполнителем инструментов", () => {
    // Отдельная реализация чтения разошлась бы с основной по поведению, и
    // разведка докладывала бы про другой проект.
    expect(engine).toContain("runTool: (tool, input) => this.executeTool(tool, input, ctx)");
  });

  it("доклад доходит до запроса шага", () => {
    expect(engine).toContain('(scoutReport ? `${scoutReport}\\n\\n` : "")');
  });

  it("неудача разведки не роняет миссию", () => {
    const block = engine.slice(engine.indexOf('let scoutReport = ""'));
    expect(block.slice(0, 2500)).toContain('"scouts.failed"');
  });
});
