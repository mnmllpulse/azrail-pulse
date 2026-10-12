// AZRAIL — правка файла набором привязанных кусков.
//
// ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ ТОГО, ЧТО БЫЛО.
//
// Правок было две: write_file — записать файл целиком, и edit_file — одна
// замена по фрагменту. Обе оставляют дыру, через которую работа теряется.
//
// write_file переписывает файл ЦЕЛИКОМ содержимым, которое модель
// сгенерировала заново. Для файла в двадцать строк это нормально; для
// файла в пятьсот — способ потерять четыреста восемьдесят, из которых
// модель просто не помнила половину. Предупреждение об этом висело в
// системном промпте — то есть проблему знали и надеялись, что модель будет
// осторожна.
//
// edit_file правит одно место за вызов. Чтобы изменить три места, нужно
// три шага, каждый — отдельное обращение к модели; а если второй прошёл, а
// третий упал, файл остаётся в состоянии, которого не задумывал никто.
//
// Здесь — несколько кусков за раз и ВСЁ ИЛИ НИЧЕГО. Проверяются все куски
// сразу, применяются тоже все сразу. Частично применённого патча не
// бывает: это то самое состояние, в котором тесты падают по причине, не
// имеющей отношения к задаче.

/** Один кусок правки: что найти и на что заменить. */
export interface Hunk {
  /** Точный фрагмент исходного файла, включая отступы и переводы строк. */
  search: string;
  /** Чем заменить. Пустая строка — удаление фрагмента. */
  replace: string;
}

export interface PatchOk {
  ok: true;
  content: string;
  applied: number;
  /** Сколько строк прибавилось и убавилось — для журнала миссии. */
  added: number;
  removed: number;
}

export interface PatchFail {
  ok: false;
  /** Текст для модели: не «ошибка», а что именно сделать дальше. */
  error: string;
  /** Номер куска, на котором всё встало (с единицы). */
  failedHunk: number;
}

export type PatchResult = PatchOk | PatchFail;

/** Сколько кусков разрешено за раз. Больше — почти всегда признак того,
 *  что модель переписывает файл целиком, маскируя это под патч. */
export const MAX_HUNKS = 20;

/**
 * Применить куски к содержимому.
 *
 * Чистая функция: на вход текст, на выход текст. Ни R2, ни сети — иначе
 * проверить её поведение на всех краевых случаях было бы нечем, а именно
 * здесь цена ошибки самая высокая: молча испорченный файл обнаруживается
 * через несколько шагов, когда причина уже не видна.
 */
export function applyHunks(content: string, hunks: Hunk[]): PatchResult {
  if (!hunks.length) {
    return { ok: false, error: "Список правок пуст — менять нечего.", failedHunk: 0 };
  }
  if (hunks.length > MAX_HUNKS) {
    return {
      ok: false,
      error: `Слишком много правок за раз (${hunks.length}, максимум ${MAX_HUNKS}). Разбей на несколько вызовов.`,
      failedHunk: 0,
    };
  }

  /* ── Сначала проверяются ВСЕ куски, и только потом применяется хоть
   *    один.
   *
   * Иначе получается частично применённый патч: два куска легли, третий
   * не нашёл своего места, и файл остался в состоянии, которого никто не
   * задумывал. Тесты после такого падают по причине, не связанной с
   * задачей, и модель уходит чинить не то. */
  const positions: Array<{ start: number; end: number; hunk: Hunk }> = [];

  for (let i = 0; i < hunks.length; i++) {
    const h = hunks[i];
    if (!h.search) {
      return { ok: false, error: `Правка ${i + 1}: пустой search. Укажи фрагмент, который нужно найти.`, failedHunk: i + 1 };
    }

    const first = content.indexOf(h.search);
    if (first === -1) {
      return {
        ok: false,
        // Что делать дальше — прямо в тексте: модель чаще всего промахивается
        // на отступах и переносах строк, а не на самом содержании.
        error:
          `Правка ${i + 1}: фрагмент не найден в файле. ` +
          `Перечитай файл и скопируй фрагмент точно, вместе с отступами и переносами строк.`,
        failedHunk: i + 1,
      };
    }

    const second = content.indexOf(h.search, first + h.search.length);
    if (second !== -1) {
      const total = content.split(h.search).length - 1;
      return {
        ok: false,
        error:
          `Правка ${i + 1}: фрагмент встречается ${total} раз(а) — непонятно, какой менять. ` +
          `Добавь окружающие строки, чтобы совпадение стало единственным.`,
        failedHunk: i + 1,
      };
    }

    positions.push({ start: first, end: first + h.search.length, hunk: h });
  }

  /* Пересечения — тоже отказ.
   *
   * Два куска, накладывающихся друг на друга, применить нельзя в
   * принципе: второй ищет текст, который первый уже переписал. Результат
   * зависел бы от порядка применения, а модель порядка не задумывала. */
  const sorted = [...positions].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      return {
        ok: false,
        error:
          `Правки пересекаются: два фрагмента накладываются друг на друга. ` +
          `Объедини их в одну правку.`,
        failedHunk: hunks.indexOf(sorted[i].hunk) + 1,
      };
    }
  }

  // Применяется СПРАВА НАЛЕВО: правка в начале файла сдвинула бы позиции
  // всех последующих, и заранее найденные индексы стали бы неверными.
  let next = content;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    next = next.slice(0, p.start) + p.hunk.replace + next.slice(p.end);
  }

  const beforeLines = content.split("\n");
  const afterLines = next.split("\n");
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  return {
    ok: true,
    content: next,
    applied: hunks.length,
    added: afterLines.filter((l) => !beforeSet.has(l)).length,
    removed: beforeLines.filter((l) => !afterSet.has(l)).length,
  };
}

/**
 * Разбор кусков из того, что прислала модель.
 *
 * Модель присылает JSON, а JSON приходит каким угодно. Отдельная функция
 * с внятными отказами: «Cannot read property of undefined» посреди миссии
 * не говорит модели ничего о том, что исправить.
 */
export function parseHunks(raw: unknown): { hunks: Hunk[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: 'Поле "hunks" должно быть массивом вида [{"search": "...", "replace": "..."}].' };
  }
  const hunks: Hunk[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as { search?: unknown; replace?: unknown } | null;
    if (!item || typeof item !== "object") {
      return { error: `Правка ${i + 1}: ожидался объект с полями search и replace.` };
    }
    if (typeof item.search !== "string") {
      return { error: `Правка ${i + 1}: поле search обязательно и должно быть строкой.` };
    }
    // replace может отсутствовать — это удаление фрагмента, законный случай.
    hunks.push({ search: item.search, replace: typeof item.replace === "string" ? item.replace : "" });
  }
  return { hunks };
}
