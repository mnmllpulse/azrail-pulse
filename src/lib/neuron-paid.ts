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

export function isNeuronPaidModel(slug?: string): boolean {
  return !!slug && NEURON_PAID_SLUGS.has(slug);
}

export const NEURON_PAID_BLOCK =
  "Эта модель из семёрки Workers Paid. Вызов остановлен: она тратит общие 10 000 нейронов в сутки, а после этого Cloudflare списывает деньги. AZRAIL её не вызывает.";
