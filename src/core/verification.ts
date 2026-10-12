// AZRAIL — определение способа прогнать тесты и разница с исходным состоянием.
//
// Обе функции чистые: им передают уже прочитанные файлы. Так они
// проверяются тестами целиком, без контейнера и без R2 — а это именно те
// две вещи, ошибка в которых делает проверку фактом бессмысленной.

/** Файл рабочей области — путь и содержимое. */
export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface TestPlan {
  /** Команда прогона. null — прогонять нечем, и это надо сказать прямо. */
  command: string | null;
  /** Почему выбрана именно она. Уходит в журнал миссии: «тесты не
   *  запускались» без причины выглядит как сбой, хотя чаще это значит,
   *  что тестов в проекте просто нет. */
  reason: string;
}

const TEST_FILE = /(^|\/)[^/]*\.(test|spec)\.[jt]sx?$/;

/**
 * Как прогнать тесты этого проекта.
 *
 * Порядок не случаен:
 *
 * 1. `scripts.test` из package.json — если автор проекта сказал, чем
 *    гонять, спорить не о чем. Заглушка вида "no test specified", которую
 *    npm вставляет сам, отсеивается: она выходит с ненулевым кодом и
 *    выглядела бы как падение тестов, которых нет.
 * 2. Есть файлы *.test.* — `node --test`. Встроенный прогонщик, не
 *    требует установки зависимостей.
 * 3. Иначе — честный null. Придумать команду, которой нет, значит
 *    получить «тесты упали» там, где тестов не существует, и заблокировать
 *    работу навсегда.
 */
export function detectTestCommand(files: WorkspaceFile[]): TestPlan {
  const pkg = files.find((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content) as { scripts?: Record<string, string> };
      const script = parsed.scripts?.test?.trim();
      if (script && !/no test specified/i.test(script)) {
        return { command: "npm test --silent", reason: `package.json: scripts.test = ${script}` };
      }
    } catch {
      // Сломанный package.json — не повод отказываться от прогона: ниже
      // ещё есть путь по файлам тестов.
    }
  }

  const testFiles = files.filter((f) => TEST_FILE.test(f.path));
  if (testFiles.length) {
    return { command: "node --test", reason: `найдено файлов тестов: ${testFiles.length}` };
  }

  return { command: null, reason: "в проекте нет ни scripts.test, ни файлов *.test.*" };
}

export interface FileChange {
  path: string;
  kind: "добавлен" | "изменён" | "удалён";
  /** Строк добавлено/убрано — грубо, построчным сравнением. */
  added: number;
  removed: number;
}

/**
 * Что изменилось в рабочей области относительно исходного состояния.
 *
 * Зачем это проверяющему: до сих пор он видел ПЕРЕСКАЗ работы — список
 * вызванных инструментов и их вывод. Пересказ легко выглядит убедительно
 * при пустом результате: «прочитал файл, понял проблему, записал
 * исправление» читается как работа, даже если записанное ничего не
 * меняет. Список фактических изменений таким не бывает: файл либо
 * изменился, либо нет.
 */
export function diffWorkspace(before: WorkspaceFile[], after: WorkspaceFile[]): FileChange[] {
  const byPathBefore = new Map(before.map((f) => [f.path, f.content]));
  const byPathAfter = new Map(after.map((f) => [f.path, f.content]));
  const changes: FileChange[] = [];

  for (const [path, content] of byPathAfter) {
    const prev = byPathBefore.get(path);
    if (prev === undefined) {
      changes.push({ path, kind: "добавлен", added: lines(content), removed: 0 });
    } else if (prev !== content) {
      const { added, removed } = lineDelta(prev, content);
      changes.push({ path, kind: "изменён", added, removed });
    }
  }
  for (const [path, content] of byPathBefore) {
    if (!byPathAfter.has(path)) {
      changes.push({ path, kind: "удалён", added: 0, removed: lines(content) });
    }
  }

  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

/** Текст для проверяющего. Пустой список назван словами, а не пустотой:
 *  «изменений нет» — это важный факт, а не отсутствие информации. */
export function renderChanges(changes: FileChange[]): string {
  if (!changes.length) return "ФАЙЛЫ НЕ ИЗМЕНИЛИСЬ НИ ОДИН.";
  return changes
    .slice(0, 40)
    .map((c) => `${c.kind}: ${c.path} (+${c.added} / -${c.removed})`)
    .join("\n");
}

const lines = (s: string): number => (s ? s.split("\n").length : 0);

/** Грубое построчное сравнение: сколько строк есть в одном и нет в другом.
 *  Настоящий diff здесь не нужен — проверяющему важен масштаб правки, а не
 *  её точный вид, и полноценный алгоритм стоил бы времени на каждом шаге. */
function lineDelta(before: string, after: string): { added: number; removed: number } {
  const a = new Set(before.split("\n"));
  const b = new Set(after.split("\n"));
  let added = 0;
  let removed = 0;
  for (const line of b) if (!a.has(line)) added++;
  for (const line of a) if (!b.has(line)) removed++;
  return { added, removed };
}
