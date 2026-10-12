import { CANON } from "./canon";

/**
 * CANON VALIDATOR
 *
 * Документ владельца называет этот модуль, и до сих пор его не было — в
 * canon.ts стояла честная пометка «пока не реализован».
 *
 * ГЛАВНОЕ РЕШЕНИЕ, И ОНО НЕ ТЕХНИЧЕСКОЕ. Из двадцати одного принципа
 * механически проверяемы ШЕСТЬ. Остальные пятнадцать — ценности и
 * формулировки: «Human First», «Legacy», «Engineering Without Ego». Их
 * нельзя вывести из записи о прогоне, и никакая модель не выведет —
 * она выдаст правдоподобный вердикт, ничем не обеспеченный.
 *
 * Поэтому валидатор НЕ СПРАШИВАЕТ МОДЕЛЬ. Он читает факты: какие
 * инструменты вызывались, в каком порядке, с каким исходом, проходила ли
 * проверка. Про непроверяемые принципы он говорит «не проверяется» —
 * это не отговорка, а единственный честный ответ. Валидатор, выносящий
 * вердикт по всем двадцати одному, был бы ровно тем неподтверждённым
 * утверждением, ради борьбы с которым он и заводится.
 *
 * ПОЧЕМУ НЕ ЖЁСТКИЙ ЗАПРЕТ. Нарушение принципа не роняет миссию: это
 * наблюдение о том, КАК она была выполнена, а не о том, верен ли
 * результат. Решение принимает человек, глядя на список.
 */

/** Что известно о прогоне. Только факты из базы, ничего производного. */
export interface MissionRecord {
  /** Вызовы инструментов в порядке времени. */
  calls: Array<{ tool: string; status: string; error?: string | null }>;
  /** Проверки результата: прошла или нет. */
  checks: Array<{ attempt: number; passed: number | boolean }>;
  /** Шаги плана, если планирование было. */
  steps: Array<{ description?: string } | unknown>;
  /** Итоговый статус миссии. */
  status?: string;
}

export type Verdict = "held" | "broken" | "unverifiable";

export interface PrincipleResult {
  n: number;
  title: string;
  verdict: Verdict;
  /** Чем подтверждено — или почему проверить нельзя. Всегда заполнено. */
  evidence: string;
}

/** Инструменты, которые ЧТО-ТО МЕНЯЮТ. Их появление до плана — нарушение. */
const MUTATING = new Set(["write_file", "edit_file", "delete_file", "open_pr", "deploy"]);

/** Инструменты, означающие настоящее исполнение, а не рассуждение о нём. */
const EXECUTING = new Set(["run_tests", "sandbox_test", "sandbox_exec", "sandbox_preview"]);

function firstIndexOf(calls: MissionRecord["calls"], match: (tool: string) => boolean): number {
  return calls.findIndex((c) => match(c.tool));
}

/**
 * Проверяет прогон по канону.
 *
 * Чистая функция: ни сети, ни модели, ни базы. Всё, на чём стоит вердикт,
 * передано аргументом — значит вердикт воспроизводим и его можно
 * перепроверить вручную.
 */
export function validateAgainstCanon(record: MissionRecord): PrincipleResult[] {
  const calls = Array.isArray(record.calls) ? record.calls : [];
  const checks = Array.isArray(record.checks) ? record.checks : [];
  const steps = Array.isArray(record.steps) ? record.steps : [];

  const byN = new Map(CANON.map((p) => [p.n, p.title]));
  const title = (n: number) => byN.get(n) ?? `принцип ${n}`;

  const out: PrincipleResult[] = [];

  // ── 6. Blueprint Before Execution ──────────────────────────────────
  // План раньше изменений. Проверяется порядком, а не наличием: план,
  // составленный ПОСЛЕ первой записи файла, планом уже не был.
  const firstMutation = firstIndexOf(calls, (t) => MUTATING.has(t));
  if (firstMutation === -1 && steps.length === 0) {
    out.push({
      n: 6, title: title(6), verdict: "unverifiable",
      evidence: "ничего не менялось и плана не было — проверять нечего",
    });
  } else if (steps.length === 0) {
    out.push({
      n: 6, title: title(6), verdict: "broken",
      evidence: `изменения начались без плана (первое: ${calls[firstMutation].tool})`,
    });
  } else {
    out.push({
      n: 6, title: title(6), verdict: "held",
      evidence: `план из ${steps.length} шагов до изменений`,
    });
  }

  // ── 7. Quality Before Speed ────────────────────────────────────────
  // «Готово» после проверки, а не вместо неё.
  const passed = checks.filter((c) => c.passed === 1 || c.passed === true).length;
  if (checks.length === 0) {
    out.push({
      n: 7, title: title(7), verdict: record.status === "completed" ? "broken" : "unverifiable",
      evidence: record.status === "completed"
        ? "миссия объявлена VERIFIED-завершённой, проверок не было ни одной"
        : "проверок не было, но и завершения не заявлено",
    });
  } else {
    out.push({
      n: 7, title: title(7), verdict: passed > 0 ? "held" : "broken",
      evidence: `проверок ${checks.length}, пройдено ${passed}`,
    });
  }

  // ── 10. Explainability ─────────────────────────────────────────────
  // У результата есть чем подтвердиться, кроме слов модели.
  const executed = calls.filter((c) => EXECUTING.has(c.tool)).length;
  out.push({
    n: 10, title: title(10), verdict: executed > 0 ? "held" : "broken",
    evidence: executed > 0
      ? `исполнений с выводом: ${executed}`
      : "ни одного исполнения — обосновать результат нечем",
  });

  // ── 12. Security by Design ─────────────────────────────────────────
  // Проверка на ключи ДО того, как код уходит наружу.
  const pushIdx = firstIndexOf(calls, (t) => t === "open_pr" || t === "deploy");
  const scanIdx = firstIndexOf(calls, (t) => t === "secret_scan" || t === "security_scan");
  if (pushIdx === -1) {
    out.push({
      n: 12, title: title(12), verdict: "unverifiable",
      evidence: "наружу ничего не уходило",
    });
  } else if (scanIdx === -1 || scanIdx > pushIdx) {
    out.push({
      n: 12, title: title(12), verdict: "broken",
      evidence: scanIdx === -1
        ? "код ушёл наружу без проверки на ключи"
        : "проверка на ключи была ПОСЛЕ отправки",
    });
  } else {
    out.push({
      n: 12, title: title(12), verdict: "held",
      evidence: "проверка на ключи до отправки",
    });
  }

  // ── 16. Knowledge Before Opinion ───────────────────────────────────
  // Система читала, прежде чем судить.
  const read = calls.filter((c) => c.tool === "read_file" || c.tool === "list_files" || c.tool === "search_files").length;
  if (calls.length === 0) {
    out.push({ n: 16, title: title(16), verdict: "unverifiable", evidence: "инструменты не вызывались" });
  } else {
    out.push({
      n: 16, title: title(16), verdict: read > 0 ? "held" : "broken",
      evidence: read > 0 ? `обращений к исходникам: ${read}` : "выводы сделаны, ничего не прочитав",
    });
  }

  // ── 19. Digital Sandbox ────────────────────────────────────────────
  // Опасное выполнялось в изоляции, а не на живой системе.
  const inSandbox = calls.filter((c) => c.tool.startsWith("sandbox_")).length;
  out.push({
    n: 19, title: title(19), verdict: inSandbox > 0 ? "held" : "unverifiable",
    evidence: inSandbox > 0
      ? `команд в песочнице: ${inSandbox}`
      : "песочница не использовалась — либо не требовалась, либо недоступна",
  });

  // ── Остальные пятнадцать ───────────────────────────────────────────
  // Названы поимённо, а не спрятаны. Умолчание выглядело бы как «всё
  // хорошо», хотя про них попросту ничего не известно.
  const checkable = new Set([6, 7, 10, 12, 16, 19]);
  for (const p of CANON) {
    if (checkable.has(p.n)) continue;
    out.push({
      n: p.n, title: p.title, verdict: "unverifiable",
      evidence: "ценность, а не факт о прогоне — механически не выводится",
    });
  }

  return out.sort((a, b) => a.n - b.n);
}

/** Короткая сводка: сколько соблюдено, нарушено, не проверяется. */
export function summarizeCanon(results: PrincipleResult[]) {
  return {
    held: results.filter((r) => r.verdict === "held").length,
    broken: results.filter((r) => r.verdict === "broken").length,
    unverifiable: results.filter((r) => r.verdict === "unverifiable").length,
    /** Нарушения поимённо — то, ради чего вообще стоит смотреть отчёт. */
    violations: results.filter((r) => r.verdict === "broken").map((r) => `${r.n}. ${r.title}: ${r.evidence}`),
  };
}
