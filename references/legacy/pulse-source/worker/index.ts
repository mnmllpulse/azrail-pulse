import type { Env } from './types';
import { DOMAINS, VERSION, MODEL_CATALOG, domainProfile } from '../shared/platform';
import { HttpError, json, body, text, identifier, upload } from './http';
import { login, logout, principal, requireOwner } from './auth';
import { history, addMessages, audit, configuredLimit, takeQuota, getSetting, setSetting } from './store';
import { generateText, generateImage, transcribe, generateMusic, startVideo, videoStatus, chatHistory, textModel, externalClient } from './ai';
import { saveArtifact, getArtifact } from './artifacts';
import { parseALSBuffer } from './music';

const CAPABILITIES = {
  text: 'workers-ai', image: 'workers-ai', transcription: 'workers-ai',
  memory: 'd1', files: 'r2', auth: 'owner-session',
  music: 'requires-provider', video: 'requires-provider',
  shell: 'prototype', autonomousCodeExecution: 'not-connected',
  billing: 'not-connected', liveAudio: 'not-connected', vectorSearch: 'not-connected',
};
const KNOWN_UNCONNECTED = new Set(['/api/create-checkout-session', '/api/webhook', '/api/analyze-multimodal', '/live']);
function writeOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'origin_rejected', 'Для изменения данных нужен запрос с домена приложения.');
}
async function telemetry(env: Env) {
  const { results } = await env.DB.prepare(`SELECT model, COUNT(*) AS count,
    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS errors,
    AVG(duration_ms) AS durationMs, SUM(input_tokens+output_tokens) AS load
    FROM pulse_generations WHERE created_at > ? GROUP BY model`).bind(new Date(Date.now() - 86400000).toISOString()).all();
  return results;
}
async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== url.origin) throw new HttpError(403, 'origin_rejected', 'Origin не разрешён.');
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } });
  }
  if ((path === '/api/health' || path === '/health') && method === 'GET') return json({ status: 'ok', version: VERSION, runtime: 'cloudflare-workers' });
  if (path === '/api/site' && method === 'GET') return json({ ...domainProfile(url.hostname), domains: DOMAINS, version: VERSION, capabilities: CAPABILITIES });
  if (!path.startsWith('/api/') && path !== '/api' && path !== '/live') {
    if (!['GET', 'HEAD'].includes(method)) throw new HttpError(405, 'method_not_allowed', 'Метод не поддерживается.');
    return env.ASSETS.fetch(request as never) as unknown as Promise<Response>;
  }
  writeOrigin(request);
  if (!env.DB) throw new HttpError(503, 'database_not_configured', 'Подключите D1 binding DB и примените миграции.');
  if (path === '/api/auth/login' && method === 'POST') return login(request, env);
  if (path === '/api/auth/logout' && method === 'POST') return logout(request, env);
  if (path === '/api/auth/session' && method === 'GET') {
    const user = await principal(request, env);
    return json({ user: user ? { id: user.id, role: user.role } : null });
  }
  const user = await requireOwner(request, env);
  await takeQuota(env, `requests:${user.id}`, 120, 60000);

  if (path === '/api/user-status' && method === 'GET') {
    const used = await env.DB.prepare('SELECT count,expires_at FROM pulse_quotas WHERE key=?').bind('ai:daily').first<{ count: number; expires_at: number }>();
    const remaining = Math.max(0, configuredLimit(env.DAILY_AI_LIMIT, 30) - (used && used.expires_at > Date.now() ? used.count : 0));
    return json({ plan: 'Owner', remaining, allowed: remaining > 0, role: user.role, quotaUnit: 'requests', resetTimezone: 'UTC' });
  }
  if (path === '/api/models' && method === 'GET') return json({ models: MODEL_CATALOG, externalEnabled: await getSetting(env, 'external_enabled', false), externalAvailable: env.ALLOW_THIRD_PARTY_MODELS === 'true' && !!env.GEMINI_API_KEY });
  if (path === '/api/admin/routing' && method === 'POST') {
    const input = await body(request);
    if (typeof input.enabled !== 'boolean') throw new HttpError(400, 'invalid_input', 'enabled должен быть boolean.');
    if (input.enabled && (env.ALLOW_THIRD_PARTY_MODELS !== 'true' || !env.GEMINI_API_KEY || configuredLimit(env.EXTERNAL_DAILY_LIMIT, 0, 100) === 0)) throw new HttpError(409, 'provider_not_configured', 'Сначала задайте разрешение, API-ключ и ненулевой EXTERNAL_DAILY_LIMIT в Cloudflare.');
    await setSetting(env, 'external_enabled', input.enabled);
    await audit(env, 'routing.changed', { enabled: input.enabled });
    return json({ status: 'ok', externalEnabled: input.enabled });
  }
  if (['/api/generate', '/api/generate-text-advanced', '/api/chat/intelligent'].includes(path) && method === 'POST') {
    const input = await body(request);
    const prompt = text(path.endsWith('/intelligent') ? input.message : input.prompt, 'prompt');
    const agent = identifier(input.agentId ?? 'azrail', 'agentId');
    const prior = path.endsWith('/intelligent') ? await history(env, user.id, agent, 12) : chatHistory(input.history);
    if (input.option === 'search') throw new HttpError(501, 'search_not_connected', 'Поиск с источниками ещё не подключён. Обычный текстовый режим доступен.');
    const result = await generateText(env, user.id, prompt, text(input.systemPrompt, 'systemPrompt', 12000, true), prior, input.model);
    await addMessages(env, user.id, agent, [{ role: 'user', content: prompt }, { role: 'assistant', content: result.data }]);
    return json({ status: 'ok', ...result, response: result.data, memory_accessed: prior.length > 0, predictions: [], speculativeQueries: [], links: [] });
  }
  if (path === '/api/translate' && method === 'POST') {
    const input = await body(request), target = text(input.targetLang, 'targetLang', 60);
    const result = await generateText(env, user.id, text(input.text, 'text'), `Translate into ${target}. Return only the translation. Preserve code and product names.`);
    return json({ status: 'ok', ...result });
  }
  if (['/api/generate-image', '/api/generate-avatar'].includes(path) && method === 'POST') {
    const input = await body(request);
    const prompt = path.endsWith('avatar') ? `Minimal profile avatar for ${text(input.name ?? 'AZRAIL', 'name', 120)}. ${text(input.systemPrompt ?? 'Dark violet aesthetic', 'systemPrompt', 1400)}` : text(input.prompt, 'prompt', 2048);
    return json(await generateImage(env, user.id, prompt, input.model));
  }
  if (path === '/api/transcribe-audio' && method === 'POST') {
    const { file } = await upload(request, 4 * 1024 * 1024);
    if (!file.type.startsWith('audio/') && file.type !== 'video/webm') throw new HttpError(415, 'unsupported_audio', 'Нужен аудиофайл.');
    return json({ status: 'ok', ...await transcribe(env, user.id, await file.arrayBuffer()) });
  }
  if (path === '/api/generate-music' && method === 'POST') {
    const input = await body(request);
    const output = await generateMusic(env, user.id, text(input.prompt, 'prompt', 8000));
    return json({ status: 'ok', ...output, audioUrl: `data:${output.mimeType};base64,${output.audioData}` });
  }
  if (path === '/api/generate-video-veo' && method === 'POST') {
    const input = await body(request);
    if (input.image || input.lastFrame) throw new HttpError(501, 'image_video_not_connected', 'Этот адаптер пока поддерживает видео по тексту.');
    return json({ status: 'ok', ...await startVideo(env, user.id, input) });
  }
  if (['/api/video-status-veo', '/api/video-download-veo'].includes(path) && method === 'POST') {
    const input = await body(request), operation = await videoStatus(env, user.id, identifier(input.operationName, 'operationName'));
    if (operation.error) throw new HttpError(502, 'video_failed', 'Провайдер сообщил об ошибке генерации видео.');
    if (path.endsWith('status-veo')) return json({ status: 'ok', done: !!operation.done });
    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!operation.done || !uri) throw new HttpError(409, 'video_pending', 'Видео ещё не готово.');
    const target = new URL(uri);
    if (target.protocol !== 'https:' || !['generativelanguage.googleapis.com', 'storage.googleapis.com'].includes(target.hostname)) throw new HttpError(502, 'invalid_video_url', 'Провайдер вернул неподдерживаемый адрес видео.');
    const response = await fetch(target, { headers: target.hostname === 'generativelanguage.googleapis.com' ? { 'x-goog-api-key': env.GEMINI_API_KEY! } : {}, redirect: 'error', signal: AbortSignal.timeout(55000) });
    if (!response.ok) throw new HttpError(502, 'video_download_failed', 'Не удалось скачать видео.');
    return new Response(response.body, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="pulse-video.mp4"' } });
  }
  if (path === '/api/music/analyze-als' && method === 'POST') {
    const { file } = await upload(request, 4 * 1024 * 1024);
    return json({ status: 'ok', projectIR: await parseALSBuffer(new Uint8Array(await file.arrayBuffer())) });
  }
  if (path === '/api/music/remix-plan' && method === 'POST') {
    const input = await body(request);
    if (!input.projectIR || typeof input.projectIR !== 'object') throw new HttpError(400, 'invalid_input', 'Нужен projectIR.');
    const result = await generateText(env, user.id, `Project: ${JSON.stringify(input.projectIR)}\nRules: ${JSON.stringify(input.genreRules ?? {})}\nIntensity: ${Number(input.intensity) || 0.5}`, 'You are a Melodic Dark House & Techno producer. Return JSON {"actions":[{"type":"add_layer","target_tracks":[],"params":{},"reasoning":"..."}]}. Suggest a remix plan only; do not claim audio processing.');
    let plan: unknown;
    try { plan = JSON.parse(result.data.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
    catch { throw new HttpError(502, 'invalid_plan', 'Модель вернула план в неверном формате.'); }
    if (!plan || typeof plan !== 'object' || !Array.isArray((plan as { actions?: unknown }).actions)) throw new HttpError(502, 'invalid_plan', 'В плане нет actions.');
    return json({ status: 'ok', plan, generationId: result.generationId });
  }
  if (path === '/api/memory/get' && method === 'GET') {
    const agent = identifier(url.searchParams.get('agentId'), 'agentId');
    return json({ status: 'ok', history: await history(env, user.id, agent, 200) });
  }
  if (path === '/api/memory/save' && method === 'POST') {
    const input = await body(request), agent = identifier(input.agentId, 'agentId');
    await addMessages(env, user.id, agent, chatHistory([input.message])); return json({ status: 'ok' });
  }
  if (path === '/api/memory/clear' && method === 'POST') {
    const input = await body(request);
    await env.DB.prepare('DELETE FROM pulse_messages WHERE owner_id=? AND agent_id=?').bind(user.id, identifier(input.agentId, 'agentId')).run();
    return json({ status: 'ok' });
  }
  if (path === '/api/memory/delete' && method === 'POST') {
    const input = await body(request);
    await env.DB.prepare('DELETE FROM pulse_messages WHERE owner_id=? AND agent_id=? AND created_at=?').bind(user.id, identifier(input.agentId, 'agentId'), text(input.timestamp, 'timestamp', 40)).run();
    return json({ status: 'ok' });
  }
  if (path === '/api/memory/project' && method === 'GET') return json({ status: 'ok', context: await getSetting(env, `project:${user.id}:${identifier(url.searchParams.get('projectId'), 'projectId')}`, {}) });
  if (path === '/api/memory/status' && method === 'GET') {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM pulse_messages WHERE owner_id=?').bind(user.id).first<{ n: number }>();
    return json({ status: 'ok', memory: { L1: { status: 'D1', count: row?.n ?? 0 }, L2: { status: 'D1', count: row?.n ?? 0 }, L3: { status: 'NOT_CONNECTED' }, L4: { status: 'R2' }, L5: { status: 'NOT_CONNECTED' }, totalMessages: row?.n ?? 0, vectorSearch: false } });
  }
  if (path === '/api/user/profile' && method === 'POST') {
    const input = await body(request, 16384); await setSetting(env, `profile:${user.id}`, input.profileData ?? {});
    return json({ status: 'ok' });
  }
  if (path === '/api/upload' && method === 'POST') {
    const { file } = await upload(request);
    return json({ status: 'ok', file: await saveArtifact(env, user.id, await file.arrayBuffer(), file.name, file.type || 'application/octet-stream') });
  }
  if (path.startsWith('/api/files/') && method === 'GET') return getArtifact(env, user.id, identifier(path.slice('/api/files/'.length)));
  if (path === '/api/archive/list' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id,name,mime,size,metadata,created_at AS timestamp FROM pulse_artifacts WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all<{ id: string; metadata: string }>();
    return json({ status: 'ok', archives: results.map(row => ({ ...JSON.parse(row.metadata), ...row, url: `/api/files/${row.id}` })) });
  }
  if (['/api/swarm/enqueue', '/api/metatron/swarm/synthesis'].includes(path) && method === 'POST') {
    const input = await body(request), prompt = text(input.prompt, 'prompt'), agent = identifier(input.agentId ?? 'metatron', 'agentId');
    const selected = Array.isArray(input.models) ? input.models : [];
    if (selected.length > 3 || selected.some(m => typeof m !== 'string')) throw new HttpError(400, 'invalid_models', 'Выберите не более трёх моделей.');
    const models = [...new Set(selected.length ? selected : [MODEL_CATALOG[0].id])];
    // Validate the whole selection before spending a request on its first model.
    for (const model of models) {
      const validated = textModel(model, env);
      if (!validated.startsWith('@cf/')) await externalClient(env);
      if (await getSetting(env, `suspended:${validated}`, false)) throw new HttpError(409, 'model_suspended', 'Одна из выбранных моделей приостановлена.');
    }
    const reports: Array<{ model: string; text: string; generationId: string }> = [];
    for (const model of models) {
      const answer = await generateText(env, user.id, prompt, `You are a specialist in ${String(input.mode ?? 'construction').slice(0, 40)}. Return useful work. This is a text collaboration: no code execution or deployment tools are connected.`, [], model);
      reports.push({ model: answer.modelUsed, text: answer.data, generationId: answer.generationId });
    }
    const result = reports.length === 1 ? reports[0].text : (await generateText(env, user.id, reports.map(r => `${r.model}:\n${r.text}`).join('\n\n').slice(0, 30000), 'Synthesize the specialists\' outputs. Identify disagreements. Do not fabricate confidence scores.')).data;
    const artifact = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), agentId: agent, mode: String(input.mode ?? 'PTAH'), prompt, result, models, reports, consensusLevel: 'UNMEASURED', confidenceScore: null };
    const saved = await saveArtifact(env, user.id, JSON.stringify(artifact, null, 2), `${agent}-synthesis.json`, 'application/json', artifact);
    await addMessages(env, user.id, agent, [{ role: 'user', content: prompt }, { role: 'assistant', content: result }]);
    return json({ status: 'ok', artifact: { ...artifact, id: saved.id, url: saved.url } });
  }
  if (path === '/api/telemetry' && method === 'GET') return json({ status: 'ok', stats: await telemetry(env), source: 'recorded_requests', tokensAvailable: false });
  if (path === '/api/circuit-breaker' && method === 'GET') return json({ status: 'ok', states: await Promise.all(MODEL_CATALOG.map(async m => ({ model: m.id, status: await getSetting(env, `suspended:${m.id}`, false) ? 'suspended' : 'active' }))) });
  if (path === '/api/circuit-breaker/toggle' && method === 'POST') {
    const input = await body(request), model = text(input.model, 'model', 150);
    if (!MODEL_CATALOG.some(m => m.id === model) || !['suspend', 'activate'].includes(String(input.action))) throw new HttpError(400, 'invalid_input', 'Некорректная модель или действие.');
    await setSetting(env, `suspended:${model}`, input.action === 'suspend'); return json({ status: 'ok' });
  }
  if (path === '/api/landing/feedback' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id,author,text AS textRu,text AS textEn,rating,created_at AS timestamp FROM pulse_feedback ORDER BY created_at DESC LIMIT 50').all();
    return json(results);
  }
  if (path === '/api/landing/feedback' && method === 'POST') {
    const input = await body(request, 8192), id = crypto.randomUUID();
    const rating = input.rating === undefined ? 5 : Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'invalid_rating', 'Оценка от 1 до 5.');
    const item = { id, author: text(input.author, 'author', 100), text: text(input.text ?? input.textRu, 'text', 4000), rating, timestamp: new Date().toISOString() };
    await env.DB.prepare('INSERT INTO pulse_feedback(id,author,text,rating,created_at) VALUES(?,?,?,?,?)').bind(item.id, item.author, item.text, rating, item.timestamp).run();
    return json({ status: 'ok', ...item, textRu: item.text, textEn: item.text });
  }
  if (path === '/api/cloudflare/status' && method === 'GET') return json({ hasToken: !!env.CLOUDFLARE_READ_TOKEN, hasAccountId: !!env.CLOUDFLARE_ACCOUNT_ID, domains: Object.keys(DOMAINS), configuredBindings: { d1: !!env.DB, r2: !!env.R2, ai: !!env.AI }, secretsManagedIn: 'cloudflare-dashboard' });
  if (path === '/api/cloudflare/config' && method === 'POST') throw new HttpError(409, 'use_cloudflare_secrets', 'Секреты задаются в Cloudflare → Worker → Settings → Variables and Secrets.');
  if (['/api/cloudflare/zones', '/api/cloudflare/workers'].includes(path) && method === 'GET') {
    if (!env.CLOUDFLARE_READ_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) throw new HttpError(503, 'read_token_missing', 'Для диагностики задайте отдельный CLOUDFLARE_READ_TOKEN с правами чтения.');
    const endpoint = path.endsWith('/zones') ? 'zones?per_page=50' : `accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/workers/scripts`;
    const remote = await fetch(`https://api.cloudflare.com/client/v4/${endpoint}`, { headers: { Authorization: `Bearer ${env.CLOUDFLARE_READ_TOKEN}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!remote.ok) throw new HttpError(502, 'cloudflare_read_failed', 'Проверьте права токена чтения Cloudflare.');
    const data = await remote.json() as { success: boolean; result: unknown[] };
    if (!data.success) throw new HttpError(502, 'cloudflare_read_failed', 'Cloudflare не вернул данные.');
    return json({ success: true, result: data.result });
  }
  if (['/api/metatron', '/api/metatron/status', '/api/metatron/heartbeat', '/api/admin/diagnostics', '/api/bridge/status', '/api/bridge/performance'].includes(path) && method === 'GET') return json({ status: 'ONLINE', runtime: 'Cloudflare Workers', version: VERSION, capabilities: CAPABILITIES, telemetry: await telemetry(env), cpuLoad: null, ramUsage: null, liveProcess: false });
  if (path === '/api/admin/users' && method === 'GET') return json([{ id: user.id, username: 'Owner', role: 'owner' }]);
  if (path === '/api/admin/config/toggle' && method === 'POST') throw new HttpError(409, 'unsupported_setting', 'Эта настройка не подключена к серверу.');
  if (path === '/api/deploy/status' && method === 'GET') return json({ provider: 'cloudflare-workers-builds', configured: !!env.DEPLOY_HOOK_URL, domains: Object.keys(DOMAINS), version: VERSION });
  if (path === '/api/deploy' && method === 'POST') {
    const input = await body(request);
    if (input.confirm !== 'deploy') throw new HttpError(400, 'confirmation_required', 'Подтвердите запуск сборки.');
    if (!env.DEPLOY_HOOK_URL) throw new HttpError(503, 'deploy_hook_missing', 'Подключите GitHub в Cloudflare Workers Builds. Для этой кнопки отдельно задайте DEPLOY_HOOK_URL.');
    const hook = new URL(env.DEPLOY_HOOK_URL);
    if (hook.protocol !== 'https:' || hook.hostname !== 'api.cloudflare.com') throw new HttpError(503, 'invalid_hook', 'Нужен официальный Workers Builds Deploy Hook.');
    await takeQuota(env, 'deploy', 3, 3600000);
    const response = await fetch(hook, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new HttpError(502, 'deploy_trigger_failed', 'Cloudflare не принял запрос сборки.');
    await audit(env, 'deploy.requested');
    return json({ status: 'queued', message: 'Запрос на сборку принят. Результат проверяется в Cloudflare Builds.' }, 202);
  }
  if (path === '/api/docs/export' && method === 'GET') {
    const asset = await env.ASSETS.fetch(new Request(new URL('/system-book.md', url)) as never) as unknown as Response;
    if (!asset.ok) throw new HttpError(404, 'docs_missing', 'Документ отсутствует в сборке.');
    return new Response(asset.body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="PULSE-System-Book.md"' } });
  }
  if (path === '/api/scan-project' && method === 'GET') {
    const response = await env.ASSETS.fetch(new Request(new URL('/project-index.json', url)) as never) as unknown as Response;
    return json({ status: 'ok', project_index: await response.json() });
  }
  if (path.startsWith('/api/bridge/')) throw new HttpError(501, 'bridge_not_connected', 'Этот инструмент требует изолированного исполнителя кода. Worker не имитирует команды или запись в исходники.');
  if (path.startsWith('/api/telegram-bots')) {
    if (path === '/api/telegram-bots/logs' && method === 'GET') return json({ success: true, logs: [], status: 'not-connected' });
    if (path === '/api/telegram-bots' && method === 'GET') return json({ success: true, bots: [], status: 'not-connected', message: 'Боты из старого проекта были демонстрационными. Адаптер отправки подключается отдельно.' });
    throw new HttpError(501, 'telegram_not_connected', 'Telegram-адаптер ещё не подключён.');
  }
  if (KNOWN_UNCONNECTED.has(path)) throw new HttpError(501, 'capability_not_connected', 'Этот модуль сохранён в интерфейсе и требует отдельного подключения.');
  throw new HttpError(404, 'route_not_found', 'API-маршрут или метод не найден.');
}

export default {
  async fetch(request: Request, env: Env) {
    const requestId = crypto.randomUUID(); let response: Response;
    try { response = await route(request, env); }
    catch (error) {
      if (error instanceof HttpError) response = json({ error: error.message, code: error.code, requestId }, error.status);
      else {
        console.error('pulse.request_failed', { requestId, kind: error instanceof Error ? error.name : 'unknown' });
        const missingSchema = error instanceof Error && /no such table|D1_ERROR/.test(error.message);
        response = json({ error: missingSchema ? 'База недоступна или не обновлена. Проверьте D1 и миграции.' : 'Не удалось выполнить запрос. Сохраните ID ошибки для диагностики.', code: 'service_error', requestId }, 503);
      }
    }
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'DENY'); headers.set('X-Request-ID', requestId);
    if (new URL(request.url).pathname.startsWith('/api')) headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_controller: unknown, env: Env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM pulse_sessions WHERE expires_at < ?').bind(Date.now()),
      env.DB.prepare('DELETE FROM pulse_quotas WHERE expires_at < ?').bind(Date.now() - 86400000),
      env.DB.prepare('UPDATE pulse_generations SET status=? WHERE status=? AND created_at < ?').bind('interrupted', 'running', new Date(Date.now() - 3600000).toISOString()),
    ]);
  },
};
