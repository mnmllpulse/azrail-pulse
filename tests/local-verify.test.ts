import { describe, expect, it } from "vitest";
import { pendingLocalChecks } from "../src/core/local-verify";
import type { StepRecord } from "../src/core/execution-types";

const done = (tool: string, input: Record<string, unknown>): StepRecord => ({ tool, input, ok: true, result: JSON.stringify({ status: "done", output: "" }) });

describe("проверка фактом", () => {
  it("mkdir: папка должна быть в листинге родителя", () => {
    const [check] = pendingLocalChecks([done("local_mkdir", { path: "Рабочий стол/Проект" })]);
    expect(check.tool).toBe("local_list");
    expect(check.input.path).toBe("Рабочий стол");
    expect(check.test("a.txt\nПроект/")).toBeNull();
    expect(check.test("a.txt")).toMatch(/нет/);
  });

  it("write: содержимое сверяется", () => {
    const [check] = pendingLocalChecks([done("local_write", { path: "Документы/a.txt", content: "привет" })]);
    expect(check.tool).toBe("local_read");
    expect(check.test("привет")).toBeNull();
    expect(check.test("пусто")).toMatch(/не совпадает/);
  });

  it("move: источника нет, цель есть", () => {
    const checks = pendingLocalChecks([done("local_move", { path: "Рабочий стол/a", to: "Рабочий стол/Проект/a" })]);
    expect(checks).toHaveLength(2);
    expect(checks[0].test("Проект/")).toBeNull();
    expect(checks[0].test("a")).toMatch(/старом/);
    expect(checks[1].test("")).toMatch(/не найден/);
  });

  it("trash: элемента быть не должно", () => {
    const [check] = pendingLocalChecks([done("local_trash", { path: "Загрузки/x.zip" })]);
    expect(check.test("x.zip")).toMatch(/на месте/);
    expect(check.test("y.zip")).toBeNull();
  });

  it("не проверяет дважды и пропускает неуспешные шаги", () => {
    const failed: StepRecord = { tool: "local_mkdir", input: { path: "a/b" }, ok: false, result: "Ошибка" };
    const ok = done("local_mkdir", { path: "a/c" });
    expect(pendingLocalChecks([failed])).toHaveLength(0);
    expect(pendingLocalChecks([ok, { tool: "verify", input: {}, ok: true, result: "" }])).toHaveLength(0);
  });
});

import { testsMissingAfterCodeEdit } from "../src/core/local-verify";

describe("тесты после правки кода", () => {
  const edit = done("local_edit", { path: "src/a.ts" });
  const shell = (command: string): StepRecord => ({ tool: "local_shell", input: { command }, ok: true, result: JSON.stringify({ status: "done" }) });
  it("правка без последующего прогона — нужно напомнить", () => {
    expect(testsMissingAfterCodeEdit([edit])).toBe(true);
  });
  it("прогон после правки — всё в порядке", () => {
    expect(testsMissingAfterCodeEdit([edit, shell("pnpm test")])).toBe(false);
  });
  it("прогон был ДО последней правки — снова нужно", () => {
    expect(testsMissingAfterCodeEdit([shell("npm test"), edit])).toBe(true);
  });
  it("правка не кода и не-тестовая команда не считаются", () => {
    expect(testsMissingAfterCodeEdit([done("local_write", { path: "notes.txt", content: "x" })])).toBe(false);
    expect(testsMissingAfterCodeEdit([edit, shell("ls")])).toBe(true);
  });
});
