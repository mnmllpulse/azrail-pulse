// AZRAIL — вычислитель выражений.
//
// ЗАЧЕМ ОН СУЩЕСТВУЕТ. Языковая модель не считает — она предсказывает
// правдоподобный текст. На вопрос «сколько будет 4871 * 3392» она выдаёт
// число нужного порядка и часто неверное, причём уверенным тоном. Пока
// арифметику делает модель, «вычислительный процесс» — это имитация.
//
// ПОЧЕМУ НЕ eval. Cloudflare Workers запрещают динамическое исполнение кода:
// eval и new Function недоступны в среде исполнения. Это не обходится флагом
// и обходить не нужно — eval над пользовательской строкой был бы дырой.
// Поэтому здесь настоящий разбор: лексер, рекурсивный спуск, вычисление.
//
// ГРАНИЦА ЧЕСТНОСТИ. Это калькулятор над числами, а не исполнитель кода.
// Он считает арифметику, проценты, функции и агрегаты по спискам. Он НЕ
// запускает скрипты, не ходит в сеть, не читает файлы. Для произвольного
// кода нужен sandbox_exec и биндинг контейнера — см. tool-registry.ts.

/** Разряды приоритета. Выше число — крепче связывает. */
const MAX_INPUT = 500;
const MAX_DEPTH = 32;

export class CalcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalcError";
  }
}

type Token =
  | { kind: "num"; value: number }
  | { kind: "id"; value: string }
  | { kind: "op"; value: string }
  | { kind: "punc"; value: "(" | ")" | "," };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

/** Функции одного аргумента. */
const UNARY_FNS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sign: Math.sign,
};

/** Функции переменного числа аргументов — агрегаты по списку. */
const VARIADIC_FNS: Record<string, (xs: number[]) => number> = {
  min: (xs) => Math.min(...xs),
  max: (xs) => Math.max(...xs),
  sum: (xs) => xs.reduce((a, b) => a + b, 0),
  avg: (xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
  // Выборочное стандартное отклонение (делитель n-1): для выборки это
  // несмещённая оценка. Для одного значения не определено.
  stdev: (xs) => {
    if (xs.length < 2) throw new CalcError("stdev требует минимум два значения");
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
    return Math.sqrt(v);
  },
  median: (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  },
};

const BINARY_FNS: Record<string, (a: number, b: number) => number> = {
  pow: (a, b) => a ** b,
};

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const c = input[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "_") {
      i++;
      continue;
    }

    // Число: целое, дробное, экспоненциальная запись.
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      // Экспонента 1e9 / 2.5e-3 — но только если следом действительно цифра,
      // иначе "2e" съело бы имя переменной.
      if (j < input.length && /[eE]/.test(input[j])) {
        let k = j + 1;
        if (k < input.length && /[+-]/.test(input[k])) k++;
        if (k < input.length && /[0-9]/.test(input[k])) {
          while (k < input.length && /[0-9]/.test(input[k])) k++;
          j = k;
        }
      }
      const raw = input.slice(i, j);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new CalcError(`не число: ${raw}`);
      out.push({ kind: "num", value });
      i = j;
      continue;
    }

    if (/[a-zA-Zа-яА-Я]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Zа-яА-Я0-9]/.test(input[j])) j++;
      out.push({ kind: "id", value: input.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }

    if (c === "(" || c === ")" || c === ",") {
      out.push({ kind: "punc", value: c });
      i++;
      continue;
    }

    // ** как синоним ^ — привычная запись степени.
    if (c === "*" && input[i + 1] === "*") {
      out.push({ kind: "op", value: "^" });
      i += 2;
      continue;
    }

    if ("+-*/%^".includes(c)) {
      out.push({ kind: "op", value: c });
      i++;
      continue;
    }

    throw new CalcError(`недопустимый символ: ${c}`);
  }

  return out;
}

/**
 * Вычисляет числовое выражение.
 *
 * Бросает CalcError на любом непонятном вводе — молча вернуть 0 или NaN
 * означало бы выдать выдуманное число за результат, то есть ровно ту
 * ошибку, ради устранения которой этот модуль написан.
 */
export function calculate(input: string): number {
  if (typeof input !== "string") throw new CalcError("выражение должно быть строкой");
  const src = input.trim();
  if (!src) throw new CalcError("пустое выражение");
  if (src.length > MAX_INPUT) throw new CalcError(`выражение длиннее ${MAX_INPUT} символов`);

  const tokens = tokenize(src);
  if (tokens.length === 0) throw new CalcError("пустое выражение");

  let pos = 0;
  let depth = 0;

  const peek = (): Token | undefined => tokens[pos];

  function eat(kind: Token["kind"], value?: string): Token {
    const t = tokens[pos];
    if (!t || t.kind !== kind || (value !== undefined && t.value !== value)) {
      throw new CalcError(`ожидалось ${value ?? kind}, получено ${t ? String(t.value) : "конец"}`);
    }
    pos++;
    return t;
  }

  // expression := term (('+'|'-') term)*
  function expression(): number {
    let left = term();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && (t.value === "+" || t.value === "-")) {
        pos++;
        const right = term();
        left = t.value === "+" ? left + right : left - right;
        continue;
      }
      return left;
    }
  }

  // term := power (('*'|'/'|'%') power)*
  function term(): number {
    let left = power();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        pos++;
        const right = power();
        if ((t.value === "/" || t.value === "%") && right === 0) {
          throw new CalcError("деление на ноль");
        }
        left = t.value === "*" ? left * right : t.value === "/" ? left / right : left % right;
        continue;
      }
      return left;
    }
  }

  // power := unary ('^' power)?  — правая ассоциативность: 2^3^2 = 2^9.
  function power(): number {
    const base = unary();
    const t = peek();
    if (t?.kind === "op" && t.value === "^") {
      pos++;
      return base ** power();
    }
    return base;
  }

  function unary(): number {
    const t = peek();
    if (t?.kind === "op" && (t.value === "-" || t.value === "+")) {
      pos++;
      const v = unary();
      return t.value === "-" ? -v : v;
    }
    return primary();
  }

  function primary(): number {
    if (++depth > MAX_DEPTH) throw new CalcError("выражение слишком глубоко вложено");
    try {
      const t = peek();
      if (!t) throw new CalcError("выражение оборвано");

      if (t.kind === "num") {
        pos++;
        return t.value;
      }

      if (t.kind === "punc" && t.value === "(") {
        pos++;
        const v = expression();
        eat("punc", ")");
        return v;
      }

      if (t.kind === "id") {
        pos++;
        const name = t.value;
        const next = peek();

        // Вызов функции.
        if (next?.kind === "punc" && next.value === "(") {
          pos++;
          const args: number[] = [];
          if (!(peek()?.kind === "punc" && peek()?.value === ")")) {
            args.push(expression());
            while (peek()?.kind === "punc" && peek()?.value === ",") {
              pos++;
              args.push(expression());
            }
          }
          eat("punc", ")");
          return applyFn(name, args);
        }

        if (name in CONSTANTS) return CONSTANTS[name];

        // Неизвестное имя — ошибка, а не ноль. Подставить 0 значило бы
        // посчитать не то, о чём просили, и не сказать об этом.
        throw new CalcError(`неизвестное имя: ${name}`);
      }

      throw new CalcError(`неожиданный символ: ${String(t.value)}`);
    } finally {
      depth--;
    }
  }

  function applyFn(name: string, args: number[]): number {
    if (name in UNARY_FNS) {
      if (args.length !== 1) throw new CalcError(`${name} принимает один аргумент`);
      return UNARY_FNS[name](args[0]);
    }
    if (name in BINARY_FNS) {
      if (args.length !== 2) throw new CalcError(`${name} принимает два аргумента`);
      return BINARY_FNS[name](args[0], args[1]);
    }
    if (name in VARIADIC_FNS) {
      if (args.length === 0) throw new CalcError(`${name} требует хотя бы один аргумент`);
      return VARIADIC_FNS[name](args);
    }
    throw new CalcError(`неизвестная функция: ${name}`);
  }

  const result = expression();

  if (pos !== tokens.length) {
    throw new CalcError(`лишнее в конце: ${String(tokens[pos].value)}`);
  }
  if (!Number.isFinite(result)) {
    // NaN и Infinity наружу не выпускаются: они выглядят как ответ, но им нельзя
    // пользоваться, а в тексте ответа они читаются как настоящее значение.
    throw new CalcError("результат не является конечным числом");
  }

  return result;
}

/** Список того, что вычислитель умеет — для системного промпта. */
export const CALC_VOCABULARY = [
  ...Object.keys(UNARY_FNS),
  ...Object.keys(BINARY_FNS),
  ...Object.keys(VARIADIC_FNS),
  ...Object.keys(CONSTANTS),
].join(", ");

export interface CalcStep {
  expression: string;
  value: number | null;
  error?: string;
}

/**
 * Считает пачку выражений. Ошибка одного не роняет остальные: частичный
 * результат полезнее пустого, а неудача видна поимённо.
 */
export function calculateAll(expressions: string[]): CalcStep[] {
  return expressions.slice(0, 20).map((expression) => {
    try {
      return { expression, value: calculate(expression) };
    } catch (err) {
      return {
        expression,
        value: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
