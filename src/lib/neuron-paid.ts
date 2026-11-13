import type { ModelUsage } from "./usage";

/** The seven Workers Paid models. One shared pool: 10,000 neurons/day, then Cloudflare bills. */
export const NEURON_PAID_SLUGS = new Set([
  "@cf/moonshotai/kimi-k2.6",
  "@cf/moonshotai/kimi-k2.7-code",
  "@cf/zai-org/glm-5.2",
  "@cf/zai-org/glm-5.3",
  "@cf/zai-org/glm-5.3-flash",
  "@cf/deepseek-ai/deepseek-v4-flash-0731",
  "@cf/deepseek-ai/deepseek-v4-pro-0813",
]);

export const GLM_FLASH = "@cf/zai-org/glm-5.3-flash";
export const GLM_53 = "@cf/zai-org/glm-5.3";
export const DEEPSEEK_FLASH = "@cf/deepseek-ai/deepseek-v4-flash-0731";
export const KIMI_CODE = "@cf/moonshotai/kimi-k2.7-code";

/**
 * Нейронов на миллион токенов. Цифры из ответа помощника Cloudflare 2026-11-13
 * (доллары за миллион делятся на $0.011 за 1000 нейронов); перед изменением
 * набора сверить со страницей developers.cloudflare.com/workers-ai/platform/pricing.
 * Кэшированный вход считается как обычный: оценка осознанно завышена.
 */
export const NEURON_RATES: Readonly<Record<string, { input: number; output: number }>> = {
  [GLM_FLASH]: { input: 13_636, output: 45_455 },
  [DEEPSEEK_FLASH]: { input: 40_000, output: 120_000 },
  [GLM_53]: { input: 127_273, output: 400_000 },
  [KIMI_CODE]: { input: 86_364, output: 363_636 },
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

const CODE_INTENTS = new Set(["generate_code", "review_repo", "generate_ui"]);

/** Какие платные модели можно предлагать роутеру для этой задачи. Мелкие задачи — только бесплатные. */
export function neuronAllowedFor(intent: string, complexity: "trivial" | "normal" | "heavy"): ReadonlySet<string> {
  if (complexity === "trivial") return new Set();
  if (CODE_INTENTS.has(intent)) return new Set([KIMI_CODE, GLM_FLASH]);
  if (complexity === "heavy") return new Set([DEEPSEEK_FLASH, GLM_53, GLM_FLASH]);
  return new Set([GLM_FLASH]);
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
