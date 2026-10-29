/** Device-only marks for third-party keys. The raw key never goes into chat or logs. */
export type ProviderToken = { id: string; name: string; note: string };

export const PROVIDER_TOKENS: ProviderToken[] = [
  { id: 'openrouter', name: 'OpenRouter', note: 'Один ключ на сотни моделей: OpenAI, Anthropic, Google, Mistral, DeepSeek, xAI, Meta и другие.' },
  { id: 'openai', name: 'OpenAI', note: 'Прямой ключ platform.openai.com' },
  { id: 'anthropic', name: 'Anthropic', note: 'Claude' },
  { id: 'google', name: 'Google AI', note: 'Gemini' },
  { id: 'groq', name: 'Groq', note: 'Быстрые открытые модели' },
  { id: 'mistral', name: 'Mistral', note: '' },
  { id: 'together', name: 'Together', note: '' },
  { id: 'fireworks', name: 'Fireworks', note: '' },
  { id: 'deepseek', name: 'DeepSeek', note: '' },
  { id: 'xai', name: 'xAI', note: 'Grok' },
  { id: 'cohere', name: 'Cohere', note: '' },
  { id: 'perplexity', name: 'Perplexity', note: '' },
  { id: 'cerebras', name: 'Cerebras', note: '' },
  { id: 'sambanova', name: 'SambaNova', note: '' },
  { id: 'huggingface', name: 'Hugging Face', note: '' },
];

const KEY = 'pulse.providerTokens';

function readMap(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) out[id] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function hasProviderToken(id: string): boolean {
  return Boolean(readMap()[id]);
}

export function saveProviderToken(id: string, token: string): void {
  const value = token.trim();
  const map = readMap();
  if (!value) delete map[id];
  else map[id] = value;
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function clearProviderToken(id: string): void {
  const map = readMap();
  delete map[id];
  sessionStorage.setItem(KEY, JSON.stringify(map));
}
