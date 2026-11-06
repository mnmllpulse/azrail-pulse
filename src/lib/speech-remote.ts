import type { Env } from '../types';
import { AccessError } from './accounts';

export type SpokenVoice = 'shade' | 'lumen' | 'aria';

const SPEAKERS: Record<SpokenVoice, { id: string; stability: number; similarity_boost: number; style: number }> = {
  shade: { id: 'pNInz6obpgDQGcFmaJgB', stability: 0.7, similarity_boost: 0.8, style: 0 },
  lumen: { id: 'TxGEqnHWrfWFTfGW9XjX', stability: 0.32, similarity_boost: 0.72, style: 0.55 },
  aria: { id: 'EXAVITQu4vr4xnSDxMaL', stability: 0.4, similarity_boost: 0.86, style: 0.35 },
};

export function spokenVoice(value: unknown): SpokenVoice {
  return value === 'lumen' || value === 'shade' || value === 'aria' ? value : 'shade';
}

export async function speakRemote(env: Env, text: string, voice: SpokenVoice = 'shade'): Promise<{ bytes: Uint8Array; mime: string }> {
  const key = env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new AccessError('Ключ озвучки не поставлен. Его кладут секретом воркера, не в чат.', 503);
  const speaker = SPEAKERS[voice];
  let response: Response;
  try {
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${speaker.id}/stream`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'xi-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: speaker.stability, similarity_boost: speaker.similarity_boost, style: speaker.style },
      }),
    });
  } catch {
    throw new AccessError('Озвучка не ответила. Повтор той же фразы можно отправить.', 503);
  }
  if (!response.ok || !response.body) throw new AccessError('Озвучка не ответила. Повтор той же фразы можно отправить.', 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) throw new AccessError('Озвучка вернула пустой звук.', 502);
  return { bytes, mime: 'audio/mpeg' };
}
