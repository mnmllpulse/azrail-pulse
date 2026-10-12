import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import type { Env, ChatMessage } from './types';
import { TEXT_MODEL, CODE_MODEL, IMAGE_MODEL, SPEECH_MODEL } from '../shared/platform';
import { HttpError, text } from './http';
import { configuredLimit, getSetting, takeQuota } from './store';

export function externalModel(value: string): string {
  // Provider IDs are configuration, but cannot change the billing classification.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,149}$/.test(value) || value.startsWith('@cf/')) {
    throw new HttpError(503, 'invalid_provider_model', 'Проверьте идентификатор сторонней модели в настройках Worker.');
  }
  return value;
}
export function textModel(selected: unknown, env: Env) {
  const model = selected === undefined || selected === '' || selected === 'auto' ? TEXT_MODEL : text(selected, 'model', 150);
  if ([TEXT_MODEL, CODE_MODEL].includes(model)) return model;
  if (env.GEMINI_TEXT_MODEL && model === env.GEMINI_TEXT_MODEL) return externalModel(model);
  throw new HttpError(422, 'model_not_connected', 'Эта модель не подключена. Выберите модель из рабочего каталога.');
}
export function chatHistory(value: unknown): ChatMessage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 40) throw new HttpError(400, 'invalid_history', 'История должна содержать не более 40 сообщений.');
  const messages = value.map(m => {
    if (!m || !['user', 'assistant'].includes(m.role)) throw new HttpError(400, 'invalid_role', 'Некорректная роль сообщения.');
    return { role: m.role as 'user' | 'assistant', content: text(m.content, 'history.content', 16000) };
  });
  if (messages.reduce((n, m) => n + m.content.length, 0) > 48000) throw new HttpError(400, 'context_too_long', 'Сократите историю запроса.');
  return messages;
}
export async function externalClient(env: Env) {
  if (env.ALLOW_THIRD_PARTY_MODELS !== 'true' || !await getSetting(env, 'external_enabled', false)) {
    throw new HttpError(403, 'third_party_disabled', 'Сторонние модели выключены. Включение требует настройки владельцем.');
  }
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'provider_not_configured', 'Задайте GEMINI_API_KEY в секретах Worker.');
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 55000 } });
}
async function begin(env: Env, owner: string, model: string, kind: string, external: boolean) {
  if (await getSetting(env, `suspended:${model}`, false)) throw new HttpError(409, 'model_suspended', 'Модель приостановлена владельцем.');
  if (external) {
    await externalClient(env); // Fail closed before quota reservation and outbound calls.
    await takeQuota(env, 'external:daily', configuredLimit(env.EXTERNAL_DAILY_LIMIT, 0, 100));
  } else if (!env.AI) throw new HttpError(503, 'ai_not_configured', 'В Worker отсутствует AI binding.');
  await takeQuota(env, 'ai:daily', configuredLimit(env.DAILY_AI_LIMIT, 30));
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO pulse_generations(id,owner_id,model,kind,status,duration_ms,created_at) VALUES(?,?,?,?,?,0,?)')
    .bind(id, owner, model, kind, 'running', new Date().toISOString()).run();
  return id;
}
async function tracked<T>(env: Env, owner: string, model: string, kind: string, run: () => Promise<T>): Promise<{ result: T; id: string }> {
  const external = !model.startsWith('@cf/');
  const id = await begin(env, owner, model, kind, external); const start = Date.now();
  try {
    const result = await run();
    await env.DB.prepare('UPDATE pulse_generations SET status=?, duration_ms=? WHERE id=?').bind('completed', Date.now() - start, id).run();
    return { result, id };
  } catch (e) {
    await env.DB.prepare('UPDATE pulse_generations SET status=?, duration_ms=? WHERE id=?').bind('failed', Date.now() - start, id).run();
    if (e instanceof HttpError) throw e;
    // Do not return provider errors: they can contain request URLs or credentials.
    throw new HttpError(502, 'generation_failed', `Модель не выполнила запрос. ID: ${id}. Попробуйте позже; автоматического платного повтора нет.`);
  }
}
export async function generateText(env: Env, owner: string, prompt: string, system = '', messages: ChatMessage[] = [], selected?: unknown) {
  const model = textModel(selected, env);
  const input: ChatMessage[] = [
    { role: 'system', content: system || 'You are AZRAIL in DARK MNMLL PULSE OS. Help the owner create useful work. Distinguish generated suggestions from executed actions. Never claim to run code, deploy, browse or measure infrastructure when no tool was invoked. Reply in the user\'s language.' },
    ...messages.slice(-20), { role: 'user', content: prompt },
  ];
  const output = await tracked(env, owner, model, 'text', async () => {
    if (model.startsWith('@cf/')) {
      const response = await env.AI.run(model as Parameters<Env['AI']['run']>[0], { messages: input, max_tokens: 2048, temperature: 0.6 } as never) as unknown as { response?: string };
      if (!response?.response?.trim()) throw new HttpError(502, 'empty_generation', 'Модель вернула пустой ответ.');
      return response.response;
    }
    const ai = await externalClient(env);
    const response = await ai.models.generateContent({ model, contents: input.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), config: { systemInstruction: input[0].content, maxOutputTokens: 2048 } });
    if (!response.text?.trim()) throw new HttpError(502, 'empty_generation', 'Модель вернула пустой ответ.');
    return response.text;
  });
  return { data: output.result, generationId: output.id, modelUsed: model };
}
export async function generateImage(env: Env, owner: string, prompt: string, selected?: unknown) {
  if (selected && selected !== IMAGE_MODEL && selected !== 'auto') throw new HttpError(422, 'model_not_connected', 'Для изображений подключена FLUX.1 Schnell.');
  const { result, id } = await tracked(env, owner, IMAGE_MODEL, 'image', async () => {
    const response = await env.AI.run(IMAGE_MODEL as Parameters<Env['AI']['run']>[0], { prompt: text(prompt, 'prompt', 2048), steps: 4 } as never) as unknown as { image: string };
    if (!response?.image || response.image.length > 16 * 1024 * 1024) throw new HttpError(502, 'invalid_image', 'Модель не вернула изображение допустимого размера.');
    return response.image;
  });
  return { imageUrl: `data:image/jpeg;base64,${result}`, generationId: id, metadata: { model: IMAGE_MODEL, aspectRatio: 'model-default', resolution: 'model-default' } };
}
export async function transcribe(env: Env, owner: string, audio: ArrayBuffer) {
  const { result, id } = await tracked(env, owner, SPEECH_MODEL, 'transcription', async () => {
    const response = await env.AI.run(SPEECH_MODEL as Parameters<Env['AI']['run']>[0], { audio: [...new Uint8Array(audio)] } as never) as unknown as { text: string };
    if (!response || typeof response.text !== 'string') throw new HttpError(502, 'invalid_transcription', 'Модель не вернула расшифровку.');
    return response.text;
  });
  return { data: result, text: result, generationId: id, modelUsed: SPEECH_MODEL };
}
export async function generateMusic(env: Env, owner: string, prompt: string) {
  if (!env.GEMINI_MUSIC_MODEL) throw new HttpError(503, 'music_not_configured', 'Музыкальная студия сохранена. Для синтеза подключите доступную вам музыкальную модель через GEMINI_MUSIC_MODEL.');
  const model = externalModel(env.GEMINI_MUSIC_MODEL);
  const { result, id } = await tracked(env, owner, model, 'music', async () => {
    const ai = await externalClient(env);
    const response = await ai.models.generateContent({ model, contents: prompt });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audio = parts.find(p => p.inlineData?.mimeType?.startsWith('audio/'))?.inlineData;
    if (!audio?.data) throw new HttpError(502, 'no_audio', 'Настроенная модель не вернула аудио. Проверьте поддержку музыкального синтеза в её API.');
    return { audioData: audio.data, mimeType: audio.mimeType, lyrics: parts.filter(p => p.text).map(p => p.text).join('\n') };
  });
  return { ...result, generationId: id, modelUsed: model };
}
export async function startVideo(env: Env, owner: string, data: Record<string, unknown>) {
  if (!env.GEMINI_VIDEO_MODEL) throw new HttpError(503, 'video_not_configured', 'Для рендера подключите GEMINI_VIDEO_MODEL и сторонние модели.');
  const model = externalModel(env.GEMINI_VIDEO_MODEL);
  const aspectRatio = data.aspectRatio === '9:16' ? '9:16' : '16:9';
  const { result } = await tracked(env, owner, model, 'video-start', async () => {
    const ai = await externalClient(env);
    const operation = await ai.models.generateVideos({ model, prompt: text(data.prompt, 'prompt', 8000), config: { numberOfVideos: 1, aspectRatio, resolution: '720p' } });
    if (!operation.name) throw new HttpError(502, 'invalid_operation', 'Провайдер не вернул идентификатор видео.');
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO pulse_operations(id,owner_id,provider,provider_name,created_at) VALUES(?,?,?,?,?)').bind(id, owner, 'google', operation.name, new Date().toISOString()).run();
    return id;
  });
  return { operationName: result, modelUsed: model };
}
export async function videoStatus(env: Env, owner: string, id: string) {
  const saved = await env.DB.prepare('SELECT provider_name FROM pulse_operations WHERE id=? AND owner_id=?').bind(id, owner).first<{ provider_name: string }>();
  if (!saved) throw new HttpError(404, 'not_found', 'Видео не найдено.');
  const ai = await externalClient(env);
  const op = new GenerateVideosOperation(); op.name = saved.provider_name;
  try { return await ai.operations.getVideosOperation({ operation: op }); }
  catch { throw new HttpError(502, 'video_poll_failed', 'Провайдер не вернул статус видео.'); }
}
