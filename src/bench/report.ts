// AZRAIL — подсчёт результата измерения.
//
// Отдельно от раннера и без единого обращения наружу: это единственная
// часть измерителя, которую можно проверить тестами полностью. Считать
// проценты внутри функции, которая ходит в песочницу, значит не проверять
// подсчёт никогда.

export interface CaseOutcome {
  caseId: string;
  difficulty: string;
  /** Тесты ДО работы агента. null — прогнать не удалось. */
  before: { ok: boolean; passed: number; failed: number } | null;
  /** Тесты ПОСЛЕ работы агента. */
  after: { ok: boolean; passed: number; failed: number } | null;
  /** Статус самой миссии — отдельно от тестов. */
  missionStatus: "done" | "failed" | "needs_input" | "error";
  durationMs: number;
  /** Вызовов моделей на эту задачу. null — миссия расход не сообщила.
   *  Именно null, а не ноль: ноль означал бы «решено без единого
   *  вызова», и такая задача попала бы в статистику как бесплатная. */
  modelCalls?: number | null;
  missionId?: string;
  error?: string;
}

export type Verdict =
  /** Было красное, стало зелёное. Единственный настоящий успех. */
  | "solved"
  /** Было красное, осталось красное. */
  | "failed"
  /** Было зелёное до работы — кейс ничего не измеряет. */
  | "invalid"
  /** Стало ХУЖЕ, чем было: проходивших тестов стало меньше. */
  | "regressed"
  /** Прогнать не удалось — про агента это не говорит ничего. */
  | "unmeasured";

/**
 * Вердикт по одной задаче.
 *
 * Здесь спрятана вся суть измерителя, поэтому по порядку:
 *
 * 1. Не удалось прогнать тесты — это НЕ провал агента. Смешать «агент не
 *    справился» и «песочница не ответила» значит получить число, которое
 *    падает при сбоях инфраструктуры и выглядит как деградация качества.
 * 2. Тесты были зелёными ДО работы — кейс негодный. Такая задача даёт
 *    успех при любом поведении агента, включая полное бездействие, и
 *    молча завышает итог.
 * 3. Проходивших тестов стало меньше — это отдельный, худший исход, а не
 *    просто «не решил». Агент, который чинит одно и ломает три, формально
 *    ничем не отличается от того, кто ничего не сделал, — и именно этот
 *    случай надо видеть в отчёте отдельной строкой.
 */
export function verdictFor(o: CaseOutcome): Verdict {
  if (!o.before || !o.after) return "unmeasured";
  if (o.before.ok) return "invalid";
  if (o.after.ok) return "solved";
  if (o.after.passed < o.before.passed) return "regressed";
  return "failed";
}

export interface Report {
  total: number;
  measured: number;
  solved: number;
  failed: number;
  regressed: number;
  invalid: number;
  unmeasured: number;
  /** Доля решённых среди ГОДНЫХ задач, 0–100. Главное число прогона. */
  score: number;
  byDifficulty: Record<string, { measured: number; solved: number }>;
  medianDurationMs: number;
  /**
   * Медиана вызовов модели на ОДНУ РЕШЁННУЮ задачу.
   *
   * Без этого числа оценка неполна до обманчивости: решение 60% задач за
   * двадцать вызовов хуже решения 55% за шесть, а по одному score первое
   * выглядит лучше. Любая правка, добавляющая вызовы, кажется выигрышной,
   * пока она хоть немного поднимает долю.
   *
   * Считается ТОЛЬКО по решённым: провалившаяся задача могла упереться в
   * потолок шагов, и её расход говорит о потолке, а не о цене решения.
   *
   * null — расход не сообщён. Ноль здесь означал бы «решено даром».
   */
  medianCallsPerSolved: number | null;
}

export function buildReport(outcomes: CaseOutcome[]): Report {
  const verdicts = outcomes.map((o) => ({ o, v: verdictFor(o) }));
  const count = (v: Verdict) => verdicts.filter((x) => x.v === v).length;

  const solved = count("solved");
  const failed = count("failed");
  const regressed = count("regressed");
  const invalid = count("invalid");
  const unmeasured = count("unmeasured");

  /* Знаменатель — ГОДНЫЕ задачи, а не все.
   *
   * Негодные и непрогнанные выкинуты из расчёта намеренно: иначе один
   * сбой песочницы опускает оценку так же, как реальная деградация
   * качества, и по числу нельзя отличить «агент стал хуже» от «сеть
   * моргнула». Оба случая видны, но в своих полях. */
  const measured = solved + failed + regressed;
  const score = measured === 0 ? 0 : Math.round((solved / measured) * 100);

  const byDifficulty: Record<string, { measured: number; solved: number }> = {};
  for (const { o, v } of verdicts) {
    if (v === "invalid" || v === "unmeasured") continue;
    const bucket = (byDifficulty[o.difficulty] ??= { measured: 0, solved: 0 });
    bucket.measured++;
    if (v === "solved") bucket.solved++;
  }

  /* Цена решения — по решённым задачам и только по тем, где расход
   * известен. Смешав их с неизвестными как с нулями, мы получили бы
   * число, которое тем лучше, чем хуже отчётность моделей. */
  const solvedCalls = verdicts
    .filter((x) => x.v === "solved")
    .map((x) => x.o.modelCalls)
    .filter((n): n is number => typeof n === "number");
  const medianCallsPerSolved = solvedCalls.length ? median(solvedCalls) : null;

  return {
    total: outcomes.length,
    measured,
    solved,
    failed,
    regressed,
    invalid,
    unmeasured,
    score,
    byDifficulty,
    medianDurationMs: median(outcomes.map((o) => o.durationMs)),
    medianCallsPerSolved,
  };
}

/** Медиана, а не среднее: одна задача, упёршаяся в таймаут, сдвигает
 *  среднее так, что по нему уже ничего не видно. */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Сравнение двух прогонов.
 *
 * Ради этого измеритель и строится: одно число само по себе не говорит
 * ничего, смысл появляется только в сравнении с предыдущим прогоном.
 *
 * Отдельно выделены задачи, СЛОМАВШИЕСЯ после правки: суммарная оценка
 * может вырасти и при этом две ранее решавшиеся задачи перестать решаться.
 * Итог в плюсе, а изменение — плохое, и увидеть это можно только по именам.
 */
export function compareRuns(
  previous: CaseOutcome[],
  current: CaseOutcome[],
): { scoreDelta: number; broke: string[]; fixed: string[] } {
  const prev = new Map(previous.map((o) => [o.caseId, verdictFor(o)]));
  const cur = new Map(current.map((o) => [o.caseId, verdictFor(o)]));

  const broke: string[] = [];
  const fixed: string[] = [];
  for (const [id, v] of cur) {
    const was = prev.get(id);
    if (was === "solved" && v !== "solved") broke.push(id);
    if (was && was !== "solved" && v === "solved") fixed.push(id);
  }

  return {
    scoreDelta: buildReport(current).score - buildReport(previous).score,
    broke,
    fixed,
  };
}
