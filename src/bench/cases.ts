// AZRAIL — набор задач для измерения качества.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. До него нельзя было ответить на вопрос
// «стало лучше или хуже» ни про один коммит в этот репозиторий. Правки в
// промптах, в выборе модели, в цикле выполнения принимались по ощущению от
// одного-двух прогонов — а одна миссия ничего не доказывает: разброс между
// двумя запусками одной и той же задачи больше, чем разница между двумя
// версиями промпта.
//
// ЧЕСТНО О ТОМ, ЧЕГО ЗДЕСЬ НЕТ. Готового набора из тридцати задач на
// реальных репозиториях тут не лежит, и он не выдуман. Такой набор — это
// конкретные репозитории, закреплённые коммиты и проверенное падение тестов
// ДО работы агента; сочинить его из головы значит получить измеритель,
// который меряет фантазию. Ниже — формат, проверки формата и шесть
// самодостаточных задач, которые работают прямо сейчас, без сети.
//
// Реальные репозитории добавляются кейсами kind: "git" по мере того, как
// ты их отберёшь и проверишь.

/** Файл, который кладётся в рабочую область перед запуском. */
export interface CaseFile {
  path: string;
  content: string;
}

export interface BenchCaseBase {
  /** Устойчивый идентификатор. По нему сравниваются прогоны между собой —
   *  переименование кейса рвёт историю, поэтому id не меняют. */
  id: string;
  title: string;
  /** Что именно поручается агенту. Ровно тот текст, что пойдёт в миссию. */
  task: string;
  /** Команда проверки. Успех определяет КОД ВОЗВРАТА, а не текст вывода. */
  verify: string;
  /** Потолок шагов миссии. Разный: задача на одну правку и задача на
   *  разбор проекта — не одно и то же, и общий потолок сделал бы первую
   *  дорогой, а вторую безнадёжной. */
  maxIterations: number;
  /** Чем сложнее, тем интереснее провал. Для разбивки отчёта. */
  difficulty: "лёгкая" | "средняя" | "тяжёлая";
}

/** Задача, содержимое которой лежит прямо здесь. Работает без сети. */
export interface InlineCase extends BenchCaseBase {
  kind: "inline";
  files: CaseFile[];
}

/** Задача на внешнем репозитории, закреплённом коммитом. */
export interface GitCase extends BenchCaseBase {
  kind: "git";
  repo: string;
  /** ИМЕННО КОММИТ, а не ветка. Ветка едет, и вчерашний прогон перестаёт
   *  быть сравнимым с сегодняшним — измеритель тихо превращается в шум. */
  commit: string;
  setup?: string;
}

export type BenchCase = InlineCase | GitCase;

/**
 * Проверка формата набора.
 *
 * Отдельная функция, а не доверие к типам: кейсы редактируются руками и
 * приходят из JSON, где типов нет вовсе. Плохой кейс не падает — он тихо
 * даёт неверное число, и это худший исход для измерителя.
 */
export function validateCases(cases: BenchCase[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const c of cases) {
    if (!c.id) problems.push("кейс без id");
    if (seen.has(c.id)) problems.push(`повтор id: ${c.id}`);
    seen.add(c.id);
    if (!c.task?.trim()) problems.push(`${c.id}: пустая задача`);
    if (!c.verify?.trim()) problems.push(`${c.id}: нет команды проверки`);
    if (!(c.maxIterations > 0)) problems.push(`${c.id}: maxIterations должен быть больше нуля`);

    if (c.kind === "inline") {
      if (!c.files?.length) problems.push(`${c.id}: нет файлов`);
      for (const f of c.files ?? []) {
        if (f.path.startsWith("/") || f.path.includes("..")) {
          problems.push(`${c.id}: небезопасный путь ${f.path}`);
        }
      }
    } else if (c.kind === "git") {
      if (!c.repo) problems.push(`${c.id}: нет репозитория`);
      // Ветка вместо коммита — самая дорогая ошибка в наборе: прогоны
      // перестают быть сравнимыми, а выглядит всё исправно.
      if (!/^[0-9a-f]{7,40}$/i.test(c.commit ?? "")) {
        problems.push(`${c.id}: commit должен быть хешем, а не веткой`);
      }
    }
  }
  return problems;
}

/* ─────────────────────────────────────────────────────────────────────
   СЕМЕНА НАБОРА.

   Каждая задача устроена одинаково: в проект кладётся код с настоящим
   дефектом и тест, который на нём ПАДАЕТ. Это обязательное условие —
   задача, где тесты зелены с самого начала, не измеряет ничего, и
   раннер отбрасывает её как негодную (см. runner.ts, проверка baseline).

   Тесты на голом node:test — без установки зависимостей: сеть в
   песочнице ограничена списком, а npm install удваивает время прогона
   там, где проверяется не он.
   ───────────────────────────────────────────────────────────────────── */

const NODE_TEST = "node --test";

export const SEED_CASES: BenchCase[] = [
  {
    kind: "inline",
    id: "off-by-one-range",
    title: "Ошибка на единицу в диапазоне",
    difficulty: "лёгкая",
    maxIterations: 6,
    task:
      "Функция range(a, b) должна возвращать числа от a до b включительно. " +
      "Сейчас тест падает. Найди причину и исправь так, чтобы `node --test` проходил.",
    verify: NODE_TEST,
    files: [
      { path: "range.js", content: "export function range(a, b) {\n  const out = [];\n  for (let i = a; i < b; i++) out.push(i);\n  return out;\n}\n" },
      {
        path: "range.test.js",
        content:
          "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { range } from './range.js';\n\n" +
          "test('включает правую границу', () => {\n  assert.deepStrictEqual(range(1, 4), [1, 2, 3, 4]);\n});\n\n" +
          "test('одна точка', () => {\n  assert.deepStrictEqual(range(3, 3), [3]);\n});\n",
      },
      { path: "package.json", content: '{\n  "name": "bench-range",\n  "type": "module",\n  "private": true\n}\n' },
    ],
  },
  {
    kind: "inline",
    id: "null-guard",
    title: "Падение на пустом значении",
    difficulty: "лёгкая",
    maxIterations: 6,
    task:
      "fullName(user) роняет всё приложение, когда у пользователя нет фамилии. " +
      "Почини так, чтобы тесты проходили, не меняя сами тесты.",
    verify: NODE_TEST,
    files: [
      { path: "name.js", content: "export function fullName(user) {\n  return user.first + ' ' + user.last.trim();\n}\n" },
      {
        path: "name.test.js",
        content:
          "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { fullName } from './name.js';\n\n" +
          "test('обычный случай', () => {\n  assert.strictEqual(fullName({ first: 'Иван', last: ' Петров ' }), 'Иван Петров');\n});\n\n" +
          "test('без фамилии не падает', () => {\n  assert.strictEqual(fullName({ first: 'Иван' }), 'Иван');\n});\n",
      },
      { path: "package.json", content: '{\n  "name": "bench-name",\n  "type": "module",\n  "private": true\n}\n' },
    ],
  },
  {
    kind: "inline",
    id: "async-order",
    title: "Потерянный await",
    difficulty: "средняя",
    maxIterations: 8,
    task:
      "loadAll() должна возвращать результаты в том же порядке, в каком переданы ключи, " +
      "и дожидаться всех загрузок. Сейчас тест падает.",
    verify: NODE_TEST,
    files: [
      {
        path: "load.js",
        content:
          "export async function loadAll(keys, fetchOne) {\n  const out = [];\n  keys.forEach(async (k) => {\n    out.push(await fetchOne(k));\n  });\n  return out;\n}\n",
      },
      {
        path: "load.test.js",
        content:
          "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { loadAll } from './load.js';\n\n" +
          "const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));\n\n" +
          "test('порядок сохраняется и все дождались', async () => {\n" +
          "  const res = await loadAll(['a', 'b', 'c'], (k) => delay(k === 'a' ? 30 : 1, k.toUpperCase()));\n" +
          "  assert.deepStrictEqual(res, ['A', 'B', 'C']);\n});\n",
      },
      { path: "package.json", content: '{\n  "name": "bench-load",\n  "type": "module",\n  "private": true\n}\n' },
    ],
  },
  {
    kind: "inline",
    id: "regression-trap",
    title: "Ловушка на регрессию",
    difficulty: "средняя",
    maxIterations: 8,
    task:
      "slugify() должна убирать повторяющиеся дефисы. Добавь это, не сломав уже работающее поведение.",
    verify: NODE_TEST,
    files: [
      {
        path: "slug.js",
        content:
          "export function slugify(s) {\n  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');\n}\n",
      },
      {
        path: "slug.test.js",
        content:
          "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { slugify } from './slug.js';\n\n" +
          "test('уже работавшее поведение', () => {\n  assert.strictEqual(slugify('Hello World'), 'hello-world');\n});\n\n" +
          "test('края не обрастают дефисами', () => {\n  assert.strictEqual(slugify('  Hi!  '), 'hi');\n});\n\n" +
          "test('дефисы не повторяются', () => {\n  assert.strictEqual(slugify('a -- b'), 'a-b');\n});\n",
      },
      { path: "package.json", content: '{\n  "name": "bench-slug",\n  "type": "module",\n  "private": true\n}\n' },
    ],
  },
  {
    kind: "inline",
    id: "two-file-fix",
    title: "Правка в двух файлах сразу",
    difficulty: "тяжёлая",
    maxIterations: 10,
    task:
      "Корзина считает скидку неверно и не учитывает количество товара. " +
      "Приведи поведение к тому, что ожидают тесты.",
    verify: NODE_TEST,
    files: [
      {
        path: "price.js",
        content: "export function withDiscount(sum, percent) {\n  return sum - percent;\n}\n",
      },
      {
        path: "cart.js",
        content:
          "import { withDiscount } from './price.js';\n\n" +
          "export function cartTotal(items, percent) {\n  const sum = items.reduce((acc, i) => acc + i.price, 0);\n  return withDiscount(sum, percent);\n}\n",
      },
      {
        path: "cart.test.js",
        content:
          "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { cartTotal } from './cart.js';\n\n" +
          "test('количество учитывается', () => {\n" +
          "  assert.strictEqual(cartTotal([{ price: 100, qty: 2 }, { price: 50, qty: 1 }], 0), 250);\n});\n\n" +
          "test('скидка в процентах, а не в рублях', () => {\n" +
          "  assert.strictEqual(cartTotal([{ price: 100, qty: 1 }], 10), 90);\n});\n",
      },
      { path: "package.json", content: '{\n  "name": "bench-cart",\n  "type": "module",\n  "private": true\n}\n' },
    ],
  },
];

/* ПОЧЕМУ ЗДЕСЬ НЕТ КЕЙСА НА ЧЕСТНЫЙ ОТКАЗ.
 *
 * Такой кейс напрашивается: дать задачу, неразрешимую доступными
 * инструментами, и смотреть, скажет ли агент об этом прямо или сочинит
 * успех. Проблема в способе подсчёта: в этом наборе исход определяет КОД
 * ВОЗВРАТА команды проверки, а «честно отказался» кодом возврата не
 * выражается — тест там либо тривиально зелёный с самого начала (и кейс
 * отбрасывается как негодный), либо оценивать приходится текст ответа,
 * то есть снова мнением модели о модели.
 *
 * Мерять это надо, но другим способом и отдельным режимом подсчёта.
 * Поставить сюда кейс, который меряет не то, что обещает, — хуже, чем
 * не иметь его вовсе: число будет, доверия ему не будет.
 */
