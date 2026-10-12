// One source of truth for the browser and the Worker. No credentials belong here.
export const VERSION = '1.0.0-cf';
export const DOMAINS = {
  'mnmllpulse.com': { title: 'MNMLL PULSE OS', label: 'Создавать', home: '/dashboard', role: 'os' },
  'mnmllpulse.org': { title: 'MNMLL PULSE', label: 'Изучать', home: '/book', role: 'knowledge' },
  'pulse-labs.org': { title: 'PULSE LABS', label: 'Исследовать', home: '/studio/lab', role: 'lab' },
} as const;
export function domainProfile(host: string) {
  return DOMAINS[host as keyof typeof DOMAINS] ?? DOMAINS['mnmllpulse.com'];
}
export const MODEL_CATALOG = [
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Llama 3.3 70B', provider: 'Cloudflare / Meta', category: 'Text Generation', capabilities: ['Text', 'Reasoning'] },
  { id: '@cf/qwen/qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder', provider: 'Cloudflare / Qwen', category: 'Text Generation', capabilities: ['Code'] },
  { id: '@cf/black-forest-labs/flux-1-schnell', name: 'FLUX.1 Schnell', provider: 'Cloudflare / BFL', category: 'Text-to-Image', capabilities: ['Image'] },
  { id: '@cf/openai/whisper', name: 'Whisper', provider: 'Cloudflare / OpenAI', category: 'Speech-to-Text', capabilities: ['Transcription'] },
];
export const TEXT_MODEL = MODEL_CATALOG[0].id;
export const CODE_MODEL = MODEL_CATALOG[1].id;
export const IMAGE_MODEL = MODEL_CATALOG[2].id;
export const SPEECH_MODEL = MODEL_CATALOG[3].id;
