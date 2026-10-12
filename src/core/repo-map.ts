// AZRAIL — карта репозитория для модели.
//
// ЗАЧЕМ. Модель видит список инструментов и историю своих вызовов. Проект
// она не видит вовсе. Отсюда самый частый класс ошибок — не в коде, а в
// том, ГДЕ код: выдуманные пути, правка не того файла, попытка создать
// заново то, что уже написано в соседней папке.
//
// Обходной путь у модели был: list_files, потом read_file, потом ещё раз
// list_files. Каждый такой шаг — отдельное обращение к модели, и к моменту
// решения контекст забит перечислением файлов, а не задачей. Карта
// строится ОДИН РАЗ за миссию и кладётся в запрос целиком.
//
// Что в неё попадает: дерево путей и экспортируемые имена. Не содержимое —
// содержимое читается инструментом по потребности; карта отвечает на
// вопрос «где искать», а не «что там написано».

/** Файл рабочей области. */
export interface MapFile {
  path: string;
  content: string;
}

export interface FileEntry {
  path: string;
  /** Экспортируемые имена — то, чем файл виден снаружи. */
  exports: string[];
  /** Строк в файле: масштаб важен при выборе между правкой и переписью. */
  lines: number;
}

/** Каталоги, читать которые модели незачем: они генерируются. */
const IGNORED = /(^|\/)(node_modules|dist|build|coverage|\.git|\.wrangler|vendor)(\/|$)/;

/** Двоичное и прочее, где искать экспорт бессмысленно. */
const BINARY = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp[34]|zip|pdf|lock)$/i;

/**
 * Экспортируемые имена из файла.
 *
 * Разбор регулярными выражениями, а не разбором синтаксиса: полноценный
 * парсер здесь стоил бы зависимости и времени на каждом шаге, а задача —
 * дать модели ориентир, а не построить точный индекс. Пропущенное имя
 * стоит одного лишнего read_file; выдуманное — правки не того места.
 * Поэтому правила намеренно узкие: лучше не заметить, чем сочинить.
 */
export function extractExports(content: string): string[] {
  const names = new Set<string>();

  // export function foo / export async function foo / export class Foo
  for (const m of content.matchAll(/^export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export const foo / let / var
  for (const m of content.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export interface Foo / type Foo / enum Foo
  for (const m of content.matchAll(/^export\s+(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export { a, b as c }
  for (const m of content.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  // export default ...
  if (/^export\s+default\b/m.test(content)) names.add("default");
  // Python — на случай проектов с бэкендом на FastAPI
  for (const m of content.matchAll(/^(?:def|class)\s+([A-Za-z_][\w]*)/gm)) {
    names.add(m[1]);
  }

  return [...names];
}

export interface RepoMap {
  entries: FileEntry[];
  /** Сколько файлов пропущено как сгенерированные или двоичные. */
  ignored: number;
  totalFiles: number;
}

export function buildRepoMap(files: MapFile[]): RepoMap {
  const entries: FileEntry[] = [];
  let ignored = 0;

  for (const f of files) {
    if (IGNORED.test(f.path) || BINARY.test(f.path)) {
      ignored++;
      continue;
    }
    entries.push({
      path: f.path,
      exports: f.content ? extractExports(f.content) : [],
      lines: f.content ? f.content.split("\n").length : 0,
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return { entries, ignored, totalFiles: files.length };
}

/** Потолок на карту. Больше — и она вытеснит из контекста саму задачу,
 *  то есть навредит ровно тем, чем должна была помочь. */
export const MAP_CHAR_LIMIT = 6000;

/**
 * Карта текстом для запроса к модели.
 *
 * Обрезается ПО ФАЙЛАМ, а не по символам посреди строки: половина пути
 * хуже отсутствующего пути — по ней модель построит правдоподобный, но
 * несуществующий адрес. И обрезка называется вслух: молча укороченная
 * карта выглядит как полная, и модель уверенно делает вывод, что файла
 * нет.
 */
export function renderRepoMap(map: RepoMap, limit = MAP_CHAR_LIMIT): string {
  if (!map.entries.length) return "КАРТА ПРОЕКТА: файлов нет — проект пуст.";

  const lines: string[] = [];
  let used = 0;
  let shown = 0;

  for (const e of map.entries) {
    const exportsPart = e.exports.length ? ` → ${e.exports.slice(0, 12).join(", ")}` : "";
    const line = `${e.path} (${e.lines} стр.)${exportsPart}`;
    if (used + line.length > limit) break;
    lines.push(line);
    used += line.length + 1;
    shown++;
  }

  const head = "КАРТА ПРОЕКТА (пути и экспортируемые имена; содержимое читай через read_file):";
  const tail =
    shown < map.entries.length
      ? `\n…показано ${shown} файлов из ${map.entries.length}. Остальные ищи через search_files.`
      : "";

  return `${head}\n${lines.join("\n")}${tail}`;
}
