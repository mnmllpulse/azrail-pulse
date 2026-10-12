import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  extractExports,
  buildRepoMap,
  renderRepoMap,
  MAP_CHAR_LIMIT,
  type MapFile,
} from "../src/core/repo-map";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

describe("Экспортируемые имена", () => {
  it("функции, классы, константы, типы", () => {
    const code = [
      "export function alpha() {}",
      "export async function beta() {}",
      "export class Gamma {}",
      "export const delta = 1;",
      "export let epsilon = 2;",
      "export interface Zeta { a: string }",
      "export type Eta = string;",
      "export enum Theta { A }",
    ].join("\n");
    expect(extractExports(code).sort()).toEqual(
      ["Eta", "Gamma", "Theta", "Zeta", "alpha", "beta", "delta", "epsilon"].sort(),
    );
  });

  it("список экспорта и переименование через as", () => {
    expect(extractExports("export { a, b as c };").sort()).toEqual(["a", "c"]);
  });

  it("экспорт по умолчанию назван явно", () => {
    expect(extractExports("export default function () {}")).toContain("default");
  });

  it("python тоже разбирается", () => {
    // В проекте есть бэкенды на FastAPI — карта должна их видеть.
    expect(extractExports("def handler():\n    pass\nclass Model:\n    pass").sort()).toEqual([
      "Model",
      "handler",
    ]);
  });

  it("внутреннее не выдаётся за внешнее", () => {
    // Правила намеренно узкие: пропущенное имя стоит одного лишнего
    // read_file, а выдуманное — правки не того места.
    const code = "function скрытая() {}\nconst внутренняя = 1;\n// export function вкомментарии() {}";
    expect(extractExports(code)).toEqual([]);
  });
});

describe("Сборка карты", () => {
  const files: MapFile[] = [
    { path: "src/app.ts", content: "export function main() {}\nconst x = 1;" },
    { path: "node_modules/lib/index.js", content: "export const nope = 1;" },
    { path: "dist/bundle.js", content: "export const built = 1;" },
    { path: "logo.png", content: "\u0000\u0001" },
    { path: "README.md", content: "# Заголовок" },
  ];

  it("сгенерированное и двоичное не попадает в карту", () => {
    // node_modules и dist — это не проект, а его следствие. Класть их в
    // запрос значит вытеснить задачу перечислением чужого кода.
    const map = buildRepoMap(files);
    expect(map.entries.map((e) => e.path)).toEqual(["README.md", "src/app.ts"]);
    expect(map.ignored).toBe(3);
  });

  it("у файла видны имена и размер", () => {
    const entry = buildRepoMap(files).entries.find((e) => e.path === "src/app.ts")!;
    expect(entry.exports).toEqual(["main"]);
    expect(entry.lines).toBe(2);
  });

  it("порядок устойчивый", () => {
    // Иначе один и тот же проект давал бы разный запрос от прогона к
    // прогону, и сравнить два прогона стало бы нельзя.
    const a = buildRepoMap(files).entries.map((e) => e.path);
    const b = buildRepoMap([...files].reverse()).entries.map((e) => e.path);
    expect(a).toEqual(b);
  });
});

describe("Карта текстом", () => {
  it("пустой проект назван словами", () => {
    expect(renderRepoMap(buildRepoMap([]))).toContain("проект пуст");
  });

  it("обрезка идёт по файлам и объявляется вслух", () => {
    // Половина пути хуже отсутствующего: по ней модель построит
    // правдоподобный, но несуществующий адрес. А молча укороченная карта
    // выглядит как полная — и модель уверенно решит, что файла нет.
    const many: MapFile[] = Array.from({ length: 400 }, (_, i) => ({
      path: `src/очень/длинный/путь/модуль-${i}.ts`,
      content: `export function функция${i}() {}`,
    }));
    const text = renderRepoMap(buildRepoMap(many));

    expect(text.length).toBeLessThan(MAP_CHAR_LIMIT + 300);
    expect(text).toContain("показано");
    expect(text).toContain("search_files");
    for (const line of text.split("\n").slice(1)) {
      // Ни одной оборванной строки: каждая либо полный путь, либо хвостовое
      // пояснение.
      if (line.startsWith("…")) continue;
      expect(line).toMatch(/\.ts \(\d+ стр\.\)/);
    }
  });

  it("сказано, что содержимое читается отдельно", () => {
    const text = renderRepoMap(buildRepoMap([{ path: "a.ts", content: "export const a = 1;" }]));
    expect(text).toContain("read_file");
  });
});

describe("Карта доходит до модели", () => {
  const engine = src("src/core/execution-engine.ts");

  it("строится один раз за миссию, а не на каждом шаге", () => {
    // Пересборка на каждом шаге стоила бы полного чтения рабочей области
    // перед каждым обращением к модели — при том что ответ на вопрос
    // «где искать» от одной правки не меняется.
    const mission = engine.slice(engine.indexOf("async runMission("));
    const built = mission.indexOf("renderRepoMap(buildRepoMap(");
    const loop = mission.indexOf("for (let i = checkpoints.length");
    expect(built).toBeGreaterThan(-1);
    expect(built, "карта должна строиться ДО цикла").toBeLessThan(loop);
  });

  it("передаётся в запрос шага", () => {
    expect(engine).toContain("ctx, plan, repoMap, scoutReport, memoryBlock, workingSet.render())");
    expect(engine).toContain('(repoMap ? `${repoMap}\\n\\n` : "")');
  });

  it("построение карты видно в журнале миссии", () => {
    expect(engine).toContain('"repo.mapped"');
    expect(src("public/index.html")).toContain("'repo.mapped'");
  });
});
