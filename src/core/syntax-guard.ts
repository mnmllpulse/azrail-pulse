/**
 * БЫСТРАЯ ПРОВЕРКА ПОСЛЕ ПРАВКИ — без контейнера и без LSP.
 *
 * До сих пор ошибку правки ловили только тесты в контейнере, и только если
 * они есть. Лендинг из styles.css и player.js тестов не имеет: потерянная
 * скобка доезжала до владельца.
 *
 * LSP в Worker не запустить, eval запрещён. Зато можно сделать то, что
 * ловит самый частый брак точечной правки — нарушенный баланс скобок и
 * битый JSON. Проверка сравнивает файл ДО и ПОСЛЕ правки и говорит только
 * об ухудшении: странности, которые были в файле до нас (скобка в
 * регулярке, которую эвристика не распознала), шума не дают.
 *
 * Это предупреждение модели, а не отказ: правка уже записана, и модель
 * сама решает, чинить или объяснить.
 */

export interface Balance {
  /** Незакрытые открывающие, по видам. */
  open: Record<string, number>;
  /** Закрывающие без пары. */
  stray: number;
  /** Строка или комментарий не закрыты к концу файла. */
  unterminated: boolean;
}

const PAIRS: Record<string, string> = { "}": "{", ")": "(", "]": "[" };

type Lang = "css" | "js" | "json" | null;

export function langOf(path: string): Lang {
  const p = path.toLowerCase();
  if (p.endsWith(".json")) return "json";
  if (/\.(css|scss|less)$/.test(p)) return "css";
  if (/\.(js|mjs|cjs|jsx|ts|tsx|mts|cts)$/.test(p)) return "js";
  return null;
}

/** Где «/» начинает регулярку, а не деление. Эвристика — не парсер. */
function regexAllowedAfter(prev: string): boolean {
  return prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev);
}

export function measure(text: string, lang: "css" | "js"): Balance {
  const stack: string[] = [];
  let stray = 0;
  let prev = "";
  let i = 0;
  const n = text.length;

  const skipString = (q: string): boolean => {
    i++;
    while (i < n) {
      const c = text[i];
      if (c === "\\") { i += 2; continue; }
      if (c === q) { i++; return true; }
      if (c === "\n" && q !== "`") return true; // незакрытая однострочная — не тянем через весь файл
      i++;
    }
    return false;
  };

  while (i < n) {
    const c = text[i];
    const next = text[i + 1];

    if (c === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) return { open: count(stack), stray, unterminated: true };
      i = end + 2;
      continue;
    }
    if (lang === "js" && c === "/" && next === "/") {
      const end = text.indexOf("\n", i);
      i = end < 0 ? n : end;
      continue;
    }
    if (c === '"' || c === "'" || (lang === "js" && c === "`")) {
      // Шаблонные строки с ${...} упрощены: содержимое пропускается целиком.
      if (!skipString(c)) return { open: count(stack), stray, unterminated: true };
      prev = "a";
      continue;
    }
    if (lang === "js" && c === "/" && regexAllowedAfter(prev)) {
      i++;
      let inClass = false;
      while (i < n && text[i] !== "\n") {
        const r = text[i];
        if (r === "\\") { i += 2; continue; }
        if (r === "[") inClass = true;
        else if (r === "]") inClass = false;
        else if (r === "/" && !inClass) break;
        i++;
      }
      i++;
      prev = "a";
      continue;
    }

    if (c === "{" || c === "(" || c === "[") stack.push(c);
    else if (c in PAIRS) {
      if (stack.length && stack[stack.length - 1] === PAIRS[c]) stack.pop();
      else stray++;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return { open: count(stack), stray, unterminated: false };
}

function count(stack: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of stack) out[s] = (out[s] ?? 0) + 1;
  return out;
}

function badness(b: Balance): number {
  return Object.values(b.open).reduce((a, x) => a + x, 0) + b.stray + (b.unterminated ? 1 : 0);
}

function describe(b: Balance): string {
  const parts = Object.entries(b.open).map(([k, v]) => `незакрытых «${k}»: ${v}`);
  if (b.stray) parts.push(`лишних закрывающих: ${b.stray}`);
  if (b.unterminated) parts.push("незакрытая строка или комментарий");
  return parts.join(", ");
}

/**
 * Сравнить файл до и после правки. null — ухудшения нет.
 * before = null: файл новый, сравнивать не с чем — проверяется как есть.
 */
export function checkEdit(path: string, before: string | null, after: string): string | null {
  const lang = langOf(path);
  if (!lang) return null;

  if (lang === "json") {
    const wasValid = before === null || isJson(before);
    if (wasValid && !isJson(after)) {
      try { JSON.parse(after); } catch (e) {
        return `⚠ ${path}: после правки JSON не разбирается (${(e as Error).message}). Исправь до завершения.`;
      }
    }
    return null;
  }

  const now = measure(after, lang);
  const was = before === null ? { open: {}, stray: 0, unterminated: false } : measure(before, lang);
  if (badness(now) <= badness(was)) return null;
  return `⚠ ${path}: после правки нарушен баланс скобок — ${describe(now)}. Проверь, не потерян ли кусок, и исправь до завершения.`;
}

function isJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}
