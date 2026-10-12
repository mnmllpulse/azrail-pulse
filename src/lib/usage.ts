// AZRAIL — учёт расхода моделей.
//
// Сводка токенов для качества. Денежный учёт всех попыток ведёт billing.ts;
// бесплатность моделей не предполагается.
//
// Измеритель качества (bench) отвечает «сколько задач решено» и молчит о
// том, какой ценой. Модель, решающая 60% за двадцать вызовов, хуже
// модели, решающей 55% за шесть, — а по нынешнему отчёту первая выглядит
// лучше. Без этого числа улучшения нечем сравнивать: любая правка,
// добавляющая вызовы, будет выглядеть выигрышной, пока она хоть немного
// поднимает долю решённых.
//
// Токены здесь — прокси для длины контекста, а не для счёта. Растущий
// расход при той же доле решённых означает, что цикл стал болтливее, и
// это ровно тот регресс, который иначе не заметить.

/** Расход одного вызова. Поля по отдельности, а не только сумма: рост
 *  входа и рост выхода означают разные болезни. Раздувшийся вход — это
 *  переполненный контекст, раздувшийся выход — модель растекается. */
export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Достаёт расход из ответа модели.
 *
 * Форм ответа у Workers AI НЕСКОЛЬКО, и это уже стоило проекту пяти
 * запусков из шести (см. router.empty_response). Здесь та же история:
 * классические модели кладут usage в корень, OpenAI-совместимые — туда же,
 * но с другими именами полей, а часть моделей не сообщает расход вовсе.
 *
 * null означает «не сообщено», и это НЕ ноль. Разница принципиальная:
 * ноль в отчёте выглядит как «вызов был бесплатным», тогда как на деле
 * мы просто не знаем. Подставить сюда нулевое значение — значит
 * занизить итог и не узнать об этом никогда.
 */
export function extractUsage(output: unknown): ModelUsage | null {
  if (!output || typeof output !== "object") return null;
  const usage = (output as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;

  const u = usage as Record<string, unknown>;
  const num = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = u[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
    }
    return null;
  };

  // prompt_tokens — Workers AI и OpenAI-совместимые; input_tokens — Anthropic-стиль.
  const prompt = num("prompt_tokens", "input_tokens");
  const completion = num("completion_tokens", "output_tokens");
  const total = num("total_tokens");

  if (prompt === null && completion === null && total === null) return null;

  const p = prompt ?? 0;
  const c = completion ?? 0;
  return { promptTokens: p, completionTokens: c, totalTokens: total ?? p + c };
}

export interface UsageRecord {
  intent: string;
  model: string;
  usage: ModelUsage | null;
  /** Сколько моделей перебрал маршрутизатор до успеха. Перебор — это
   *  вызовы, которые состоялись и ничего не дали; без этого числа
   *  расход выглядит меньше, чем был. */
  attempts: number;
}

export interface UsageTotals {
  calls: number;
  /** Вызовы, включая неудачные попытки маршрутизатора. */
  modelInvocations: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Сколько вызовов не сообщили расход. Итог по токенам занижен ровно
   *  на эту величину, и молчать об этом нельзя. */
  callsWithoutUsage: number;
  byIntent: Record<string, { calls: number; totalTokens: number }>;
  byModel: Record<string, { calls: number; totalTokens: number }>;
}

/**
 * Копилка расхода за одну миссию.
 *
 * Живёт ровно столько, сколько миссия. Глобального счётчика намеренно
 * нет: он потребовал бы согласования между экземплярами Durable Object и
 * давал бы число, которое ни к чему нельзя привязать.
 */
export class UsageLedger {
  constructor(public readonly scope = "global") {}
  private records: UsageRecord[] = [];

  record(entry: UsageRecord): void {
    this.records.push(entry);
  }

  get entries(): readonly UsageRecord[] {
    return this.records;
  }

  totals(): UsageTotals {
    const t: UsageTotals = {
      calls: 0,
      modelInvocations: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      callsWithoutUsage: 0,
      byIntent: {},
      byModel: {},
    };

    for (const r of this.records) {
      t.calls++;
      // attempts — сколько моделей перебрано, включая успешную.
      t.modelInvocations += Math.max(1, r.attempts);

      const tokens = r.usage?.totalTokens ?? 0;
      if (!r.usage) t.callsWithoutUsage++;
      else {
        t.promptTokens += r.usage.promptTokens;
        t.completionTokens += r.usage.completionTokens;
        t.totalTokens += r.usage.totalTokens;
      }

      (t.byIntent[r.intent] ??= { calls: 0, totalTokens: 0 }).calls++;
      t.byIntent[r.intent].totalTokens += tokens;
      (t.byModel[r.model] ??= { calls: 0, totalTokens: 0 }).calls++;
      t.byModel[r.model].totalTokens += tokens;
    }

    return t;
  }
}

/** Расход строкой. Неполнота данных называется вслух: отчёт, умолчавший
 *  о том, что половина вызовов не отчиталась, хуже отсутствия отчёта —
 *  по нему будут делать выводы. */
export function renderUsage(t: UsageTotals): string {
  if (!t.calls) return "вызовов моделей не было";

  const top = Object.entries(t.byIntent)
    .sort((a, b) => b[1].calls - a[1].calls)
    .slice(0, 4)
    .map(([intent, v]) => `${intent}×${v.calls}`)
    .join(", ");

  const parts = [`вызовов: ${t.calls}`];
  if (t.modelInvocations > t.calls) {
    parts.push(`обращений к моделям: ${t.modelInvocations} (с перебором)`);
  }
  if (t.totalTokens) {
    parts.push(`токенов: ${t.totalTokens} (вход ${t.promptTokens}, выход ${t.completionTokens})`);
  }
  if (t.callsWithoutUsage) {
    parts.push(`без отчёта о расходе: ${t.callsWithoutUsage} — итог по токенам занижен`);
  }
  if (top) parts.push(`по задачам: ${top}`);

  return parts.join("; ");
}
