import type { Env } from '../types';
import { AccessError } from './accounts';

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function speakRemote(env: Env, text: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const key = env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new AccessError('Ключ озвучки не поставлен. Его кладут секретом воркера, не в чат.', 503);
  let response: Response;
  try {
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'xi-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.2 },
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
