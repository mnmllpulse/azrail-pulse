import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { applyHunks, parseEditArgs, parseHunks, MAX_HUNKS, type Hunk } from "../src/lib/patch";
import { writeFileGuarded, applyPatch } from "../src/lib/workspace";
import type { Env } from "../src/types";
import { ToolRejectedError } from "../src/lib/tool-errors";
import { isDesignGoal } from "../src/unified/design-contract";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/** Хранилище в памяти: ровно те методы R2, которыми пользуется workspace. */
function fakeR2(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async get(key: string) {
      const v = store.get(key);
      return v === undefined ? null : { text: async () => v };
    },
  };
}

const envWith = (r2: ReturnType<typeof fakeR2>) => ({ AZRAIL_R2: r2 } as unknown as Env);
const KEY = "projects/p1/workspace/app.js";

const FILE = ["function a() {", "  return 1;", "}", "", "function b() {", "  return 2;", "}", ""].join("\n");

describe("Применение кусков", () => {
  it("несколько правок за один раз", () => {
    const res = applyHunks(FILE, [
      { search: "  return 1;", replace: "  return 10;" },
      { search: "  return 2;", replace: "  return 20;" },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.content).toContain("return 10;");
      expect(res.content).toContain("return 20;");
      expect(res.applied).toBe(2);
    }
  });

  it("правки применяются справа налево — позиции не съезжают", () => {
    // Правка в начале файла сдвигает всё, что за ней. Заранее найденные
    // индексы после этого указывают не туда, и второй кусок ложится со
    // смещением — файл портится молча.
    const res = applyHunks("АБВ", [
      { search: "А", replace: "ААААА" },
      { search: "В", replace: "ВВ" },
    ]);
    expect(res.ok && res.content).toBe("АААААБВВ");
  });

  it("ненайденный фрагмент отменяет ВЕСЬ патч", () => {
    // Частично применённый патч — состояние, которого не задумывал никто.
    // Тесты после него падают по причине, не связанной с задачей.
    const res = applyHunks(FILE, [
      { search: "  return 1;", replace: "  return 10;" },
      { search: "  return 999;", replace: "  return 0;" },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.failedHunk).toBe(2);
      expect(res.error).toContain("не найден");
      // Подсказка обязана быть: модель промахивается на отступах чаще,
      // чем на содержании.
      expect(res.error).toContain("отступ");
    }
  });

  it("неоднозначный фрагмент — отказ, а не «возьмём первый»", () => {
    const res = applyHunks("x\nповтор\ny\nповтор\n", [{ search: "повтор", replace: "z" }]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("2 раз");
  });

  it("пересекающиеся правки отвергаются", () => {
    // Второй кусок искал бы текст, который первый уже переписал: результат
    // зависел бы от порядка применения, а порядка модель не задумывала.
    const res = applyHunks("abcdef", [
      { search: "abcd", replace: "X" },
      { search: "cdef", replace: "Y" },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("пересекаются");
  });

  it("пустой replace — это удаление, законный случай", () => {
    const res = applyHunks("оставить\nубрать\n", [{ search: "убрать\n", replace: "" }]);
    expect(res.ok && res.content).toBe("оставить\n");
  });

  it("пустой список и перебор по количеству отклоняются", () => {
    expect(applyHunks(FILE, []).ok).toBe(false);
    const many: Hunk[] = Array.from({ length: MAX_HUNKS + 1 }, (_, i) => ({
      search: `нет-${i}`,
      replace: "x",
    }));
    const res = applyHunks(FILE, many);
    expect(res.ok).toBe(false);
    // Много кусков почти всегда значит, что файл переписывают целиком,
    // маскируя это под патч.
    if (!res.ok) expect(res.error).toContain("Слишком много");
  });

  it("пустой search не принимается", () => {
    const res = applyHunks(FILE, [{ search: "", replace: "x" }]);
    expect(res.ok).toBe(false);
  });
});

describe("Разбор присланного моделью", () => {
  it("массив объектов принимается, replace необязателен", () => {
    const parsed = parseHunks([{ search: "a", replace: "b" }, { search: "c" }]);
    expect("hunks" in parsed && parsed.hunks).toEqual([
      { search: "a", replace: "b" },
      { search: "c", replace: "" },
    ]);
  });

  it("мусор отклоняется с внятным текстом, а не падением", () => {
    // «Cannot read property of undefined» посреди миссии не говорит модели
    // ничего о том, что исправить.
    expect("error" in parseHunks("строка")).toBe(true);
    expect("error" in parseHunks([{ replace: "b" }])).toBe(true);
    expect("error" in parseHunks([null])).toBe(true);
    const e = parseHunks([{ search: 42 }]);
    expect("error" in e && e.error).toContain("search");
  });
});

describe("Защита от нечаянной перезаписи", () => {
  it("новый файл пишется свободно", async () => {
    const r2 = fakeR2();
    const res = await writeFileGuarded(envWith(r2), "p1", "app.js", "новый");
    expect(res.replaced).toBe(false);
    expect(r2.store.get(KEY)).toBe("новый");
  });

  it("существующий файл без overwrite не трогается", async () => {
    // Здесь и терялась работа: модель присылала новый текст, файл менялся
    // целиком, и всё, чего модель не держала в голове, исчезало.
    const r2 = fakeR2({ [KEY]: FILE });
    await expect(writeFileGuarded(envWith(r2), "p1", "app.js", "короче")).rejects.toThrow(/уже существует/);
    expect(r2.store.get(KEY), "содержимое обязано остаться нетронутым").toBe(FILE);
  });

  it("в отказе назван следующий шаг, а не просто запрет", async () => {
    const r2 = fakeR2({ [KEY]: FILE });
    await expect(writeFileGuarded(envWith(r2), "p1", "app.js", "x")).rejects.toThrow(/apply_patch/);
  });

  it("резкое усыхание отклоняется даже с overwrite", async () => {
    // Почти всегда это «не дописал», а не «стало короче».
    const long = "строка\n".repeat(200);
    const r2 = fakeR2({ [KEY]: long });
    await expect(
      writeFileGuarded(envWith(r2), "p1", "app.js", "строка\n", { overwrite: true }),
    ).rejects.toThrow(/вчетверо/);
  });

  it("намеренное сокращение проходит при явном shrink", async () => {
    const long = "строка\n".repeat(200);
    const r2 = fakeR2({ [KEY]: long });
    const res = await writeFileGuarded(envWith(r2), "p1", "app.js", "коротко", {
      overwrite: true,
      shrink: true,
    });
    expect(res.replaced).toBe(true);
    expect(r2.store.get(KEY)).toBe("коротко");
  });

  it("небольшой файл под порог усыхания не попадает", async () => {
    // Порог не должен мешать обычной правке короткого файла.
    const r2 = fakeR2({ [KEY]: "маленький файл" });
    const res = await writeFileGuarded(envWith(r2), "p1", "app.js", "x", { overwrite: true });
    expect(res.replaced).toBe(true);
  });
});

describe("Патч через хранилище", () => {
  it("правит файл и сообщает масштаб", async () => {
    const r2 = fakeR2({ [KEY]: FILE });
    const res = await applyPatch(envWith(r2), "p1", "app.js", [
      { search: "  return 1;", replace: "  return 10;" },
    ]);
    expect(res.applied).toBe(1);
    expect(r2.store.get(KEY)).toContain("return 10;");
  });

  it("неудачный патч не меняет файл", async () => {
    const r2 = fakeR2({ [KEY]: FILE });
    await expect(
      applyPatch(envWith(r2), "p1", "app.js", [{ search: "нет такого", replace: "x" }]),
    ).rejects.toThrow();
    expect(r2.store.get(KEY)).toBe(FILE);
  });

  it("патч по несуществующему файлу объясняет выбор инструмента", async () => {
    const r2 = fakeR2();
    await expect(
      applyPatch(envWith(r2), "p1", "нет.js", [{ search: "a", replace: "b" }]),
    ).rejects.toThrow(/write_file/);
  });
});

describe("Инструмент подключён, а не только написан", () => {
  it("apply_patch есть в реестре и в типах", () => {
    expect(src("src/lib/tool-registry.ts")).toContain('name: "apply_patch"');
    expect(src("src/types.ts")).toContain('"apply_patch"');
  });

  it("цикл умеет его вызывать", () => {
    const engine = src("src/core/execution-tools.ts");
    expect(engine).toContain('case "apply_patch"');
    expect(engine).toContain("parseHunks(input.hunks)");
  });

  it("write_file в цикле идёт через защиту", () => {
    const engine = src("src/core/execution-tools.ts");
    const branch = engine.slice(engine.indexOf('case "write_file"'), engine.indexOf('case "apply_patch"'));
    expect(branch).toContain("writeFileGuarded");
    // Прямой writeFile здесь означал бы, что защиту можно обойти, просто
    // позвав инструмент.
    expect(branch).not.toMatch(/return writeFile\(/);
  });

  it("модель знает про новый порядок правок", () => {
    // Инструмент, о котором не сказано в промпте, не существует для модели.
    const engine = src("src/core/execution-planning.ts");
    const prompt = engine.slice(engine.indexOf("export const LOOP_SYSTEM_PROMPT"), engine.indexOf("export class ExecutionPlanningEngine"));
    expect(prompt).toContain("apply_patch");
    expect(prompt).toContain("только для НОВЫХ файлов");
  });
});

describe("parseEditArgs", () => {
  it("принимает каноничные поля", () => {
    expect(parseEditArgs({ path: "a.ts", search: "x", replacement: "y" })).toEqual({ path: "a.ts", search: "x", replacement: "y" });
  });

  it("принимает частые псевдонимы полей", () => {
    expect(parseEditArgs({ path: "a.ts", old_string: "x", new_string: "y" })).toEqual({ path: "a.ts", search: "x", replacement: "y" });
    expect(parseEditArgs({ path: "a.ts", search: "x", replace: "y" })).toEqual({ path: "a.ts", search: "x", replacement: "y" });
  });

  it("явная пустая замена допустима и удаляет фрагмент", () => {
    expect(parseEditArgs({ path: "a.ts", search: "x", replacement: "" })).toEqual({ path: "a.ts", search: "x", replacement: "" });
  });

  it("отсутствующая замена отклоняется, а не превращается в удаление", () => {
    const r = parseEditArgs({ path: "a.ts", search: "x" });
    expect("error" in r && r.error).toContain("replacement");
  });

  it("пустой search и отсутствующий path отклоняются со схемой", () => {
    const noSearch = parseEditArgs({ path: "a.ts", replacement: "y" });
    expect("error" in noSearch && noSearch.error).toContain('"search"');
    const emptySearch = parseEditArgs({ path: "a.ts", search: "", replacement: "y" });
    expect("error" in emptySearch).toBe(true);
    const noPath = parseEditArgs({ search: "x", replacement: "y" });
    expect("error" in noPath && noPath.error).toContain('"path"');
  });

  it("нечисловые и нестроковые значения не приводятся через String()", () => {
    expect("error" in parseEditArgs({ path: "a.ts", search: 5, replacement: "y" })).toBe(true);
    expect("error" in parseEditArgs({ path: "a.ts", search: "x", replacement: null })).toBe(true);
  });

  it("промпт миссии описывает точные схемы edit_file и apply_patch", () => {
    const prompt = src("src/core/execution-planning.ts");
    expect(prompt).toContain('edit_file {"path"');
    expect(prompt).toContain('"replacement"');
    expect(prompt).toContain('apply_patch {"path"');
    expect(prompt).toContain('"hunks"');
  });
});

describe("Детерминированные отказы возвращаются модели, а не останавливают миссию", () => {
  it("перезапись без overwrite — ToolRejectedError", async () => {
    const r2 = fakeR2({ [KEY]: FILE });
    await expect(writeFileGuarded(envWith(r2), "p1", "app.js", "x")).rejects.toBeInstanceOf(ToolRejectedError);
  });

  it("усадка файла — ToolRejectedError", async () => {
    const r2 = fakeR2({ [KEY]: "x".repeat(1000) });
    await expect(writeFileGuarded(envWith(r2), "p1", "app.js", "y", { overwrite: true })).rejects.toBeInstanceOf(ToolRejectedError);
  });

  it("патч по несуществующему файлу и ненайденный фрагмент — ToolRejectedError", async () => {
    const r2 = fakeR2({ [KEY]: FILE });
    await expect(applyPatch(envWith(r2), "p1", "nope.js", [{ search: "a", replace: "b" }])).rejects.toBeInstanceOf(ToolRejectedError);
    await expect(applyPatch(envWith(r2), "p1", "app.js", [{ search: "нет такого", replace: "b" }])).rejects.toBeInstanceOf(ToolRejectedError);
  });

  it("исполнитель apply_patch оборачивает ошибку разбора в ToolRejectedError", () => {
    expect(src("src/core/execution-tools.ts")).toMatch(/throw new ToolRejectedError\(parsed\.error\)/);
  });
});

describe("Дизайн-контракт только для дизайн-целей", () => {
  it.each(["Привет", "Напиши функцию сортировки", "Исправь баг в api.ts"])("не нужен: %s", g => {
    expect(isDesignGoal(g)).toBe(false);
  });
  it.each(["Поправь вёрстку шапки", "Change the button color", "Обнови tokens.css"])("нужен: %s", g => {
    expect(isDesignGoal(g)).toBe(true);
  });
});
