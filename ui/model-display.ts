/** Full slug stays the value in code/API. UI shows short label + provider icon. */

const PROVIDER_ALIASES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  qwen: 'Qwen',
  alibaba: 'Alibaba',
  meta: 'Meta',
  mistralai: 'Mistral',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  'deepseek-ai': 'DeepSeek',
  'zai-org': 'Z.ai',
  zai: 'Z.ai',
  'zhipu-ai': 'Z.ai',
  moonshotai: 'Moonshot AI',
  nvidia: 'NVIDIA',
  baai: 'BAAI',
  blackforestlabs: 'Black Forest',
  'black-forest-labs': 'Black Forest',
  runwayml: 'Runway',
  huggingface: 'Hugging Face',
  ibm: 'IBM',
  'swiss-ai': 'Swiss AI',
  cloudflare: 'Cloudflare',
  moondream: 'Moondream',
  'llava-hf': 'LLaVA',
  clef: 'Cloudflare',
};

export const PROVIDER_ICON_PATHS: Record<string, string> = {
  'Moonshot AI': '/icons/kimi.svg',
  'Z.ai': '/icons/zai.svg',
  DeepSeek: '/icons/deepseek.svg',
  NVIDIA: '/icons/nvidia.svg',
  Qwen: '/icons/qwen.svg',
  Meta: '/icons/meta.svg',
  BAAI: '/icons/baai.svg',
  Google: '/icons/gemma.svg',
  Mistral: '/icons/mistral.svg',
  OpenAI: '/icons/openai.svg',
  Anthropic: '/icons/anthropic.svg',
  Alibaba: '/icons/alibaba.svg',
  xAI: '/icons/xai.svg',
  Cloudflare: '/icons/cloudflare.svg',
  Moondream: '/icons/moondream.svg',
  IBM: '/icons/ibm.svg',
  'Swiss AI': '/icons/swiss.svg',
};

export function providerFromSlug(slug: string): string {
  const clean = slug.replace(/^@cf\//, '').replace(/^@hf\//, '');
  const first = clean.split('/')[0] || 'unknown';
  if (PROVIDER_ALIASES[first]) return PROVIDER_ALIASES[first];
  // Title-case unknown providers so "moondream" → "Moondream"
  return first.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase());
}

export function providerIconPath(provider: string): string | undefined {
  return PROVIDER_ICON_PATHS[provider] ?? PROVIDER_ICON_PATHS[providerFromSlug(provider)];
}

/** Always resolve a mark: real icon path, or null → UI draws a monogram. */
export function resolveModelIcon(model: { slug?: string; provider?: string; icon?: string | null }): string | undefined {
  if (model.icon) return model.icon;
  const provider = model.provider || (model.slug ? providerFromSlug(model.slug) : '');
  return provider ? providerIconPath(provider) : undefined;
}

export function providerInitial(provider: string): string {
  const clean = (provider || '?').trim();
  if (!clean) return '?';
  if (/^z\.?ai$/i.test(clean)) return 'Z';
  if (/^xai$/i.test(clean)) return 'X';
  return clean.charAt(0).toUpperCase();
}

/**
 * Short Cloudflare-dashboard style label for UI.
 * Example: openai/gpt-6-luna → "GPT-6 Luna". Full slug stays in code/value.
 */
export function modelDisplayName(slug: string): string {
  if (!slug) return 'Auto · AZRAIL';
  const leaf = slug.replace(/^@cf\//, '').replace(/^@hf\//, '').split('/').pop() || slug;
  let name = leaf
    .replace(/[-_]+/g, ' ')
    .replace(/\bfp8\b/gi, '')
    .replace(/\binstruct\b/gi, '')
    .replace(/\bchat\b/gi, '')
    .replace(/\bhf\b/gi, '')
    .replace(/\blora\b/gi, '')
    .replace(/\bit\b/gi, '')
    .replace(/\b\d{4}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  name = name
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(\.\d+)?[bBkKmM]?$/i.test(part)) {
        return part.replace(/b$/i, 'B').replace(/m$/i, 'M').replace(/k$/i, 'K');
      }
      if (/^(wan|glm|gpt|llm|ai|ui|oss|vl|asr|tts)$/i.test(part)) return part.toUpperCase();
      if (/^deepseek$/i.test(part)) return 'DeepSeek';
      if (/^claude$/i.test(part)) return 'Claude';
      if (/^fable$/i.test(part)) return 'Fable';
      if (/^(llama|qwen|gemma|mistral|nemotron|kimi|granite|apertus|clef|flux|whisper|moondream)$/i.test(part))
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      if (/^qwen\d/i.test(part)) return part.replace(/^qwen/i, 'Qwen');
      if (/^gpt\d/i.test(part)) return part.replace(/^gpt/i, 'GPT');
      if (/^llama\d/i.test(part)) return part.replace(/^llama/i, 'Llama');
      if (/^\d+\.\d+/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ')
    .replace(/\b(GPT|GLM)\s+(\d+(?:\.\d+)?)\b/g, '$1-$2')
    .replace(/\s+/g, ' ')
    .trim();

  return name || leaf;
}

/** Workers Paid only. They spend the shared 10,000 neurons/day and can bill after that. */
export const NEURON_PAID_SLUGS = new Set([
  '@cf/moonshotai/kimi-k2.6',
  '@cf/moonshotai/kimi-k2.7-code',
  '@cf/zai-org/glm-5.2',
  '@cf/zai-org/glm-5.3',
  '@cf/zai-org/glm-5.3-flash',
  '@cf/deepseek-ai/deepseek-v4-flash-0731',
  '@cf/deepseek-ai/deepseek-v4-pro-0813',
]);

export function isNeuronPaidModel(slug?: string): boolean {
  return !!slug && NEURON_PAID_SLUGS.has(slug);
}

export function isChatCapableModel(m: {
  slug?: string;
  task?: string;
  capabilities?: string[];
  availability?: string;
}): boolean {
  if (m.availability === 'unavailable' || !m.slug) return false;
  const task = String(m.task ?? '').toLowerCase();
  const slug = m.slug.toLowerCase();
  if (/image-to-image|text-to-image|image-classification|object-detection|speech|asr|tts|translation|embedding|summarization|automatic-speech/i.test(task))
    return false;
  if (/stable-diffusion|flux|whisper|melotts|resnet|embedding|bge-|clip|unet|vae/i.test(slug)) return false;
  if (task.includes('text') || task.includes('chat') || task.includes('llm')) return true;
  if (m.capabilities?.some((c) => /chat|text|code|reasoning|text.generation|tool/i.test(c))) return true;
  return /instruct|chat|llama|qwen|mistral|gemma|deepseek|kimi|glm|nemotron|gpt-oss|gpt-|wan|claude|gemini|clef|apertus|granite|moondream/i.test(slug);
}

/** Cloudflare dashboard order: flagship families first, then A–Z. */
export const PROVIDER_SORT_ORDER = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Meta',
  'Qwen',
  'DeepSeek',
  'Mistral',
  'Moonshot AI',
  'Z.ai',
  'xAI',
  'NVIDIA',
  'Cloudflare',
  'Alibaba',
  'IBM',
  'Swiss AI',
  'Moondream',
  'BAAI',
  'Black Forest',
];

/** Higher = newer. Used to sort models newest → oldest inside a provider. */
export function modelRecencyScore(slug: string): number {
  const leaf = slug.replace(/^@cf\//, '').replace(/^@hf\//, '').split('/').pop() || slug;
  // Ignore parameter sizes (70b, 20b, 3b) so "gpt-6" beats "gpt-oss-20b".
  const product = leaf.replace(/\d+[bBmMkK]\b/g, ' ');
  const version = product.match(/(\d+)(?:\.(\d+))?/);
  const major = Number(version?.[1] || 0);
  const minor = Number(version?.[2] || 0);
  let score = major * 1_000_000 + minor * 1_000;
  if (/\b(pro|ultra|max|large|scout|luna|fable)\b/i.test(leaf)) score += 300;
  if (/\b(oss|tiny|mini|small|micro|flash)\b/i.test(leaf)) score -= 200;
  return score;
}

export function providerSortKey(provider: string): number {
  const idx = PROVIDER_SORT_ORDER.indexOf(provider);
  return idx === -1 ? 500 + provider.charCodeAt(0) : idx;
}

export type CatalogLike = { slug: string; displayName?: string; provider?: string; freeAllowlisted?: boolean; icon?: string | null; task?: string };

/** Full catalog grouped by provider, each group newest → oldest. */
export function groupModelsByProvider(models: CatalogLike[]): Array<{ provider: string; models: CatalogLike[] }> {
  const buckets = new Map<string, CatalogLike[]>();
  for (const model of models) {
    const provider = model.provider || providerFromSlug(model.slug);
    const list = buckets.get(provider) ?? [];
    list.push(model);
    buckets.set(provider, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => providerSortKey(a[0]) - providerSortKey(b[0]) || a[0].localeCompare(b[0]))
    .map(([provider, rows]) => ({
      provider,
      models: rows.slice().sort((a, b) => modelRecencyScore(b.slug) - modelRecencyScore(a.slug) || a.slug.localeCompare(b.slug)),
    }));
}
