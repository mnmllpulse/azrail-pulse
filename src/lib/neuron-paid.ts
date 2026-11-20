import { findModel, isDeprecated } from "./model-registry";
import type { ModelUsage } from "./usage";

/** Модели Workers Paid; отключённые остаются в наборе и потому закрыты для вызова. Общий пул: 10 000 нейронов в сутки, дальше Cloudflare списывает деньги. */
export const NEURON_PAID_SLUGS = new Set([
  "@cf/moonshotai/kimi-k2.6",
  "@cf/moonshotai/kimi-k2.7-code",
  "@cf/zai-org/glm-5.2",
  "@cf/zai-org/glm-5.3",
  "@cf/zai-org/glm-5.3-flash",
  "@cf/deepseek-ai/deepseek-v4-flash-0731",
  "@cf/deepseek-ai/deepseek-v4-pro-0813",
  "@cf/deepseek-ai/deepseek-v4.1-flash-1017",
  "@cf/thinkingmachines/inkling-2-small",
]);

export const GLM_53 = "@cf/zai-org/glm-5.3";
export const DEEPSEEK_FLASH = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";
export const INKLING_SMALL = "@cf/thinkingmachines/inkling-2-small";

/**
 * Нейронов на миллион токенов. Цифры из ответа помощника Cloudflare 2026-11-13
 * (доллары за миллион делятся на $0.011 за 1000 нейронов); перед изменением
 * набора сверить со страницей developers.cloudflare.com/workers-ai/platform/pricing.
 * Кэшированный вход считается как обычный: оценка осознанно завышена.
 */
export const NEURON_RATES: Readonly<Record<string, { input: number; output: number }>> = {
  [DEEPSEEK_FLASH]: { input: 27_273, output: 109_091 },
  [GLM_53]: { input: 127_273, output: 400_000 },
  [INKLING_SMALL]: { input: 27_273, output: 90_909 },
};

export const DEFAULT_DAILY_NEURONS = 6000;

export class NeuronBudgetError extends Error {
  constructor() {
    super("Суточный лимит нейронов для платных моделей исчерпан. Отвечает бесплатная модель.");
    this.name = "NeuronBudgetError";
  }
}

export function isNeuronMetered(slug?: string): boolean {
  return !!slug && slug in NEURON_RATES;
}

/** Модели из семёрки, которые по-прежнему не вызываются вообще. */
export function isNeuronPaidModel(slug?: string): boolean {
  return !!slug && NEURON_PAID_SLUGS.has(slug) && !isNeuronMetered(slug);
}

export const NEURON_PAID_BLOCK =
  "Эта модель из семёрки Workers Paid и не входит в разрешённый набор. Вызов остановлен: она тратит общие 10 000 нейронов в сутки, а после этого Cloudflare списывает деньги.";

/** Какие платные модели можно предлагать роутеру для этой задачи. Мелкие задачи — только бесплатные. */
export function neuronAllowedFor(_intent: string, complexity: "trivial" | "normal" | "heavy", now = Date.now()): ReadonlySet<string> {
  if (complexity !== "heavy") return new Set();
  const base = [DEEPSEEK_FLASH];
  // Отключённые модели (changelog Cloudflare 2026-11-05) выпадают; если не осталось ни одной, остаётся glm-5.3.
  const live = base.filter((slug) => !isDeprecated(findModel(slug) ?? {}, now));
  return new Set(live.length ? live : [GLM_53]);
}

/** Суточный потолок платных моделей. Некорректное значение закрывает платные модели. */
export function dailyNeuronCap(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_DAILY_NEURONS;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 && value <= 10_000 ? value : 0;
}

/** Верхняя граница: токенов в запросе не больше байтов, в ответе не больше max_tokens. */
export function neuronUpperBound(slug: string, inputBytes: number, maxTokens: number): number {
  const rate = NEURON_RATES[slug];
  if (!rate) throw new Error(`Нет тарифа в нейронах для ${slug}.`);
  return Math.ceil((inputBytes * rate.input + maxTokens * rate.output) / 1_000_000);
}

export function neuronsFor(slug: string, usage: ModelUsage): number {
  const rate = NEURON_RATES[slug];
  if (!rate) throw new Error(`Нет тарифа в нейронах для ${slug}.`);
  return Math.ceil((usage.promptTokens * rate.input + usage.completionTokens * rate.output) / 1_000_000);
}
