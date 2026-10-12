/**
 * ОКНО ЧТЕНИЯ И РАБОЧИЙ НАБОР ФАЙЛОВ.
 *
 * Причина застрявшей миссии (потолок 8 шагов, ни одной правки):
 *
 *  1. read_file отдавал файл целиком, а renderResult резал результат до
 *     4000 символов. styles.css лендинга длиннее — модель видела
 *     «…(обрезано)», хотела «полный актуальный текст» и читала файл снова.
 *     Получала ту же обрезку. Выхода не было: у read_file не было способа
 *     дочитать остаток. Повтор — не каприз модели, а единственный ход.
 *
 *  2. Через четыре шага renderHistory сворачивал прочитанное в
 *     «(N символов, свёрнуто)». Для правки нужен точный фрагмент для
 *     search — а его уже нет в запросе. Снова read_file.
 *
 * Решение: чтение окнами по строкам с явной подсказкой, откуда читать
 * дальше, и рабочий набор — последнее прочитанное окно каждого файла
 * держится в запросе отдельно от истории и не сворачивается, пока файл
 * не изменён.
 */

/** Сколько символов влезает в одно окно. Ниже лимита renderResult (4000),
 *  чтобы окно с метаданными не обрезалось повторно. */
export const WINDOW_CHARS = 3200;

/** Общий бюджет рабочего набора в запросе. */
export const WORKING_SET_CHARS = 14000;

export interface FileWindow {
  path: string;
  /** Номер первой строки окна, с 1. */
  fromLine: number;
  /** Номер последней строки окна, включительно. */
  toLine: number;
  totalLines: number;
  content: string;
  /** Есть ли продолжение и как его прочитать. */
  more?: string;
}

/**
 * Вырезать окно из текста файла.
 *
 * Режем по целым строкам: половина строки непригодна для edit_file —
 * search должен совпасть с файлом точно. Если одна строка сама длиннее
 * окна (минифицированный CSS), отдаём её целиком: обрезанная строка
 * хуже длинной.
 */
export function sliceFile(path: string, text: string, fromLine = 1, maxLines?: number): FileWindow {
  const lines = text.split("\n");
  const total = lines.length;
  const start = Math.min(Math.max(1, Math.floor(fromLine) || 1), Math.max(total, 1));
  const cap = maxLines && maxLines > 0 ? Math.floor(maxLines) : Infinity;

  const picked: string[] = [];
  let chars = 0;
  for (let n = start - 1; n < total && picked.length < cap; n++) {
    const line = lines[n];
    if (picked.length > 0 && chars + line.length + 1 > WINDOW_CHARS) break;
    picked.push(line);
    chars += line.length + 1;
  }

  const toLine = start + picked.length - 1;
  const win: FileWindow = { path, fromLine: start, toLine, totalLines: total, content: picked.join("\n") };
  if (toLine < total) {
    win.more =
      `Показаны строки ${start}–${toLine} из ${total}. ` +
      `Продолжение: read_file {"path":"${path}","from_line":${toLine + 1}}`;
  }
  return win;
}

/**
 * Рабочий набор: последнее прочитанное окно каждого файла.
 *
 * Живёт один прогон миссии. Правка файла выкидывает его из набора —
 * старое окно после правки лжёт, и search по нему даст отказ.
 */
export class WorkingSet {
  private windows = new Map<string, FileWindow[]>();

  remember(win: FileWindow): void {
    const list = (this.windows.get(win.path) ?? []).filter(
      // Новое окно заменяет пересекающиеся старые того же файла.
      (w) => w.toLine < win.fromLine || w.fromLine > win.toLine,
    );
    list.push(win);
    list.sort((a, b) => a.fromLine - b.fromLine);
    // Map сохраняет порядок вставки: свежий файл — в конец.
    this.windows.delete(win.path);
    this.windows.set(win.path, list);
  }

  invalidate(path: string): boolean {
    return this.windows.delete(path);
  }

  has(path: string): boolean {
    return this.windows.has(path);
  }

  /**
   * Блок для запроса. Если набор не влезает в бюджет, выпадают самые
   * давно прочитанные файлы — последнее прочитанное нужнее всего.
   */
  render(budget = WORKING_SET_CHARS): string {
    if (!this.windows.size) return "";
    const entries = [...this.windows.entries()].reverse();
    const blocks: string[] = [];
    const dropped: string[] = [];
    let used = 0;
    for (const [path, wins] of entries) {
      const body = wins
        .map((w) => `--- ${path} [строки ${w.fromLine}–${w.toLine} из ${w.totalLines}] ---\n${w.content}`)
        .join("\n");
      if (used + body.length > budget && blocks.length > 0) {
        dropped.push(path);
        continue;
      }
      blocks.unshift(body);
      used += body.length;
    }
    const tail = dropped.length ? `\n(не влезли, при нужде перечитать: ${dropped.join(", ")})` : "";
    return (
      `РАБОЧИЙ НАБОР — актуальный текст прочитанных файлов. Перечитывать их не нужно; ` +
      `фрагменты для search бери отсюда.\n${blocks.join("\n")}${tail}`
    );
  }
}
