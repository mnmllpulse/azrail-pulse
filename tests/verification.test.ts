import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { detectTestCommand, diffWorkspace, renderChanges, type WorkspaceFile } from "../src/core/verification";
import { checkResult, findTestEvidence } from "../src/core/checker";
import { parseTestOutput } from "../src/core/sandbox";
import type { Env } from "../src/types";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

describe("Чем прогонять тесты", () => {
  it("scripts.test главнее догадок", () => {
    const files: WorkspaceFile[] = [
      { path: "package.json", content: '{"scripts":{"test":"vitest run"}}' },
      { path: "a.test.js", content: "" },
    ];
    expect(detectTestCommand(files).command).toBe("npm test --silent");
  });

  it("заглушка npm не принимается за команду", () => {
    // `npm init` вставляет скрипт, который выходит с ненулевым кодом.
    // Принять его значит получить «тесты упали» там, где тестов нет.
    const files: WorkspaceFile[] = [
      { path: "package.json", content: '{"scripts":{"test":"echo \\"Error: no test specified\\" && exit 1"}}' },
      { path: "index.js", content: "" },
    ];
    expect(detectTestCommand(files).command).toBeNull();
  });

  it("файлы тестов без package.json — встроенный прогонщик", () => {
    expect(detectTestCommand([{ path: "range.test.js", content: "" }]).command).toBe("node --test");
    expect(detectTestCommand([{ path: "src/a.spec.ts", content: "" }]).command).toBe("node --test");
  });

  it("нет тестов — честный отказ, а не выдуманная команда", () => {
    // Команда, которой нет, даёт «тесты упали» в проекте без тестов и
    // блокирует работу навсегда.
    const plan = detectTestCommand([{ path: "index.js", content: "" }]);
    expect(plan.command).toBeNull();
    expect(plan.reason).toContain("нет ни scripts.test");
  });

  it("сломанный package.json не отменяет прогон по файлам тестов", () => {
    const files: WorkspaceFile[] = [
      { path: "package.json", content: "{это не json" },
      { path: "a.test.js", content: "" },
    ];
    expect(detectTestCommand(files).command).toBe("node --test");
  });
});

describe("Что изменилось в файлах", () => {
  it("видит добавленное, изменённое и удалённое", () => {
    const before: WorkspaceFile[] = [
      { path: "a.js", content: "один\nдва" },
      { path: "b.js", content: "уйдёт" },
    ];
    const after: WorkspaceFile[] = [
      { path: "a.js", content: "один\nтри" },
      { path: "c.js", content: "новый" },
    ];
    const changes = diffWorkspace(before, after);
    expect(changes.map((c) => `${c.kind} ${c.path}`)).toEqual([
      "изменён a.js",
      "удалён b.js",
      "добавлен c.js",
    ]);
  });

  it("отсутствие изменений названо словами, а не пустотой", () => {
    // Пустая строка в промпте читается как «данных нет». «Ни один файл не
    // изменился» — это важный факт, а не отсутствие информации.
    expect(renderChanges([])).toContain("НЕ ИЗМЕНИЛИСЬ");
  });

  it("перезапись файла тем же содержимым изменением не считается", () => {
    const same: WorkspaceFile[] = [{ path: "a.js", content: "x" }];
    expect(diffWorkspace(same, [{ path: "a.js", content: "x" }])).toEqual([]);
  });
});

describe("Проверка перед «готово»", () => {
  const env = {} as Env;

  it("запись без единого изменения файла — не выполненная работа", async () => {
    // Пересказ вида «прочитал, понял, записал исправление» читается как
    // работа, даже когда записанное ничего не меняет. Модель, читающая
    // тот же пересказ, охотно с ним соглашается — поэтому решение
    // принимается до обращения к ней.
    const verdict = await checkResult(
      env,
      "почини функцию",
      [{ tool: "write_file", ok: true, result: "записано" }],
      undefined,
      renderChanges([]),
    );
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toContain("Ни один файл не изменился");
  });

  it("задача без записи файлов так не отклоняется", async () => {
    // Разобрать, объяснить, найти — законные задачи, где менять файлы не
    // требовалось. Отклонять их по тому же правилу было бы ложным срабатыванием.
    const verdict = await checkResult(
      env,
      "объясни, как устроен роутер",
      [
        { tool: "read_file", ok: true, result: "…" },
        { tool: "sandbox_test", ok: true, result: "# pass 3\n# fail 0" },
      ],
      undefined,
      renderChanges([]),
    );
    expect(verdict.passed).toBe(true);
  });

  it("упавшие тесты решают без участия модели", async () => {
    const verdict = await checkResult(
      env,
      "почини",
      [{ tool: "sandbox_test", ok: false, result: "# pass 1\n# fail 2" }],
      undefined,
      "изменён a.js (+2 / -1)",
    );
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toContain("Тесты не пройдены");
  });

  it("берётся ПОСЛЕДНИЙ прогон, а не первый", () => {
    // Тесты могли падать в середине работы и пройти после исправления.
    // Значение имеет состояние на момент завершения.
    const found = findTestEvidence([
      { tool: "sandbox_test", ok: false, result: "# pass 0\n# fail 3" },
      { tool: "write_file", ok: true, result: "ок" },
      { tool: "sandbox_test", ok: true, result: "# pass 3\n# fail 0" },
    ]);
    expect(found?.ok).toBe(true);
  });
});

describe("Разбор вывода node --test", () => {
  // Найдено при построении измерителя: шаблоны разбора были написаны под
  // vitest, jest и pytest, где сводка в одну строку. Встроенный прогонщик
  // Node печатает её отдельными строками, и его вывод молча давал
  // total = 0 — то есть «тестов не было». Весь набор задач измерителя
  // построен именно на нём.
  const output = (pass: number, fail: number) =>
    `TAP version 13\nok 1 - первый\n# tests ${pass + fail}\n# suites 0\n# pass ${pass}\n# fail ${fail}\n`;

  it("сводка узнаётся, а не пропускается", () => {
    const r = parseTestOutput(output(2, 1), 1);
    expect(r.runner).toBe("node:test");
    expect(r.total).toBe(3);
    expect(r.passed).toBe(2);
    expect(r.failed).toBe(1);
    expect(r.ok).toBe(false);
  });

  it("зелёный прогон признаётся зелёным", () => {
    const r = parseTestOutput(output(3, 0), 0);
    expect(r.ok).toBe(true);
    expect(r.total).toBe(3);
  });

  it("ноль пройденных — не успех, даже если ноль упавших", () => {
    // Пустой прогон не доказывает ничего, а выглядит как «всё хорошо».
    expect(parseTestOutput(output(0, 0), 0).ok).toBe(false);
  });
});

describe("Цикл проверяет фактом, а не на слово", () => {
  const engine = code(src("src/core/execution-engine.ts"));

  it("тесты гоняет сам цикл, а не только по желанию модели", () => {
    // Раньше прогон был добровольным: агент, ни разу не запустивший
    // ничего, проходил проверку так же, как добившийся зелёных тестов.
    const done = engine.slice(engine.indexOf("if (decision.done || !decision.tool)"));
    const check = done.indexOf("checkResult(");

    /* Проверяется УСЛОВИЕ ЦЕЛИКОМ, а не просто наличие вызова.
     *
     * Первая версия этого теста искала подстроку "runTestsInContainer(" —
     * и мутация, обернувшая весь блок в `if (false)`, прошла мимо неё
     * незамеченной. Вызов остался в тексте, хотя выполняться перестал.
     * Тест, который нельзя сломать поломкой, не проверяет ничего. */
    const guard = /if \(detectBackend\(this\.env\) === "container" && ctx\.projectId\) \{[\s\S]{0,200}?this\.runTestsInContainer\(/;
    const match = guard.exec(done);
    expect(match, "прогон обязан идти под живым условием, а не под отключённым").toBeTruthy();
    expect(match!.index, "прогон должен идти ДО вердикта").toBeLessThan(check);
  });

  it("проверяющему передаётся фактическая разница файлов", () => {
    expect(engine).toContain("diffWorkspace(filesBefore");
    expect(engine).toContain("renderChanges(changes)");
  });

  it("недоступность песочницы не блокирует сделанную работу", () => {
    // «Проверить не удалось» — не то же самое, что «сделано плохо».
    const done = engine.slice(engine.indexOf("if (decision.done || !decision.tool)"));
    expect(done).toContain('"tests.unavailable"');
  });

  it("sandbox_test гоняет рабочую область, а не закоммиченное", () => {
    // Он всегда уходил в GitHub Actions и проверял содержимое
    // репозитория. Пока миссия не сделала коммит, её правок там нет —
    // инструмент возвращал результат прогона чужого кода.
    const tools = code(src("src/core/execution-tools.ts"));
    const tool = tools.slice(tools.indexOf('case "sandbox_test"'), tools.indexOf('case "run_tests"'));
    expect(tool).toContain('backend === "container"');
    expect(tool).toContain("runTestsInContainer");
    const containerAt = tool.indexOf("runTestsInContainer");
    const actionsAt = tool.indexOf('viaAgent(ctx, "qa"');
    expect(containerAt, "контейнер должен проверяться раньше Actions").toBeLessThan(actionsAt);
  });

  it("прогон в контейнере заливает файлы и верит коду возврата", () => {
    const tools = code(src("src/core/execution-tools.ts"));
    const helper = tools.slice(tools.indexOf("async runTestsInContainer"));
    expect(helper).toContain("syncWorkspaceToSandbox");
    expect(helper).toContain("res.exitCode === 0");
  });
});
