// AZRAIL — что из миссии заслуживает памяти.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Раньше рефлексия жила прямо в цикле и писала одну
// строку вида «Решено за 6 шагов через read_file, write_file. По пути
// мешало: <первая попавшаяся ошибка>». Такой факт бесполезен: он
// перечисляет инструменты, которые и так очевидны, и цитирует ошибку без
// причины и без места. Вспомнив его через неделю, модель узнает, что
// когда-то что-то не получилось, — и станет осторожнее там, где не надо.
//
// ГЛАВНОЕ ПРАВИЛО. Факт записывается, только если в нём есть ПРИЧИНА и
// МЕСТО. «Не получилось» без разбора — это не знание, а тревога: оно
// делает агента робким, а не умным. Лучше не записать ничего.

export interface ReflectionInput {
  goal: string;
  history: { tool: string; ok: boolean; result: string }[];
  /** Файлы, которые миссия реально изменила. Пусто — значит работа шла
   *  вхолостую, и записывать «сделано» было бы неправдой. */
  changedFiles: string[];
  /** Откатывались ли правки из-за сломанных тестов. */
  rolledBack?: boolean;
}

export interface ReflectionFact {
  category: "architecture_decision" | "known_issue";
  key: string;
  value: string;
}

/** Потолок на факт. Память подмешивается в КАЖДЫЙ запрос, и запись на
 *  пол-экрана вытеснит оттуда живую задачу. */
export const FACT_LIMIT = 400;

/** Сколько файлов называть поимённо. Дальше — числом: список из сорока
 *  путей не помогает вспомнить, он засоряет. */
const MAX_NAMED_FILES = 4;

function renderFiles(files: string[]): string {
  const named = files.slice(0, MAX_NAMED_FILES).join(", ");
  const rest = files.length - MAX_NAMED_FILES;
  return rest > 0 ? `${named} и ещё ${rest}` : named;
}

/**
 * Первая ошибка, у которой есть содержание.
 *
 * Не любая: «Error», «failed», «undefined» — это не причина, а её
 * отсутствие. Записав такое, мы получим факт, который нечем
 * воспользоваться, но который будет занимать место и внушать
 * осторожность.
 */
function meaningfulFailure(history: ReflectionInput["history"]): string | null {
  for (const h of history) {
    if (h.ok) continue;
    const text = (h.result ?? "").trim();
    if (text.length < 25) continue;
    // Отказ инструмента по формальной причине (нет прав, нет файла) —
    // это про один вызов, а не про проект.
    if (/^(ошибка|error|failed|unknown)\b[.:]?$/i.test(text)) continue;
    return text;
  }
  return null;
}

/**
 * Что из миссии стоит запомнить.
 *
 * Пустой массив — нормальный и частый ответ. Миссия, не изменившая ни
 * одного файла и не встретившая внятной ошибки, ничего не выяснила;
 * записать про неё что-нибудь ради заполнения памяти значит разбавить
 * то немногое, что в ней есть смысла.
 */
export function buildReflection(input: ReflectionInput): ReflectionFact[] {
  const { goal, history, changedFiles, rolledBack } = input;
  const facts: ReflectionFact[] = [];
  const key = goal.trim().slice(0, 80);
  if (!key) return [];

  const failure = meaningfulFailure(history);

  /* Успех записывается ТОЛЬКО с местом.
   *
   * «Задача решена» без файлов — это пересказ намерения, а не факт.
   * Ценность такой записи через месяц — ноль, а место в каждом запросе
   * она занимает. */
  if (changedFiles.length && !rolledBack) {
    facts.push({
      category: "architecture_decision",
      key,
      value: `Решено правкой файлов: ${renderFiles(changedFiles)} (шагов: ${history.length}).`.slice(0, FACT_LIMIT),
    });
  }

  /* Неудача записывается ТОЛЬКО с причиной.
   *
   * Это и есть главное правило файла. Откат без объяснения превратится
   * в «сюда лучше не лезть» — агент станет обходить место, где на самом
   * деле нужна была другая правка. */
  if (rolledBack && failure) {
    facts.push({
      category: "known_issue",
      key: `${key} — что ломается`,
      value:
        `Правка ${changedFiles.length ? renderFiles(changedFiles) : "в этой области"} ломала тесты и была откачена. ` +
        `Причина: ${failure}`.slice(0, FACT_LIMIT),
    });
  } else if (failure && !changedFiles.length) {
    // Миссия ничего не изменила, но наткнулась на внятное препятствие —
    // это ровно тот случай, ради которого память и нужна.
    facts.push({
      category: "known_issue",
      key: `${key} — препятствие`,
      value: `Работа не пошла дальше из-за: ${failure}`.slice(0, FACT_LIMIT),
    });
  }

  return facts.map((f) => ({ ...f, value: f.value.slice(0, FACT_LIMIT) }));
}
