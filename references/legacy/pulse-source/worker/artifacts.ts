import type { Env } from './types';
import { HttpError } from './http';
export async function saveArtifact(env: Env, owner: string, content: ArrayBuffer | string, name: string, mime: string, metadata: Record<string, unknown> = {}) {
  if (!env.R2) throw new HttpError(503, 'storage_not_configured', 'Подключите R2 bucket.');
  const id = crypto.randomUUID(); const key = `pulse/v1/${owner}/${id}`;
  const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.byteLength;
  const safeName = name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 150) || 'artifact';
  await env.R2.put(key, content, { httpMetadata: { contentType: mime } });
  try {
    await env.DB.prepare('INSERT INTO pulse_artifacts(id,owner_id,r2_key,name,mime,size,metadata,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(id, owner, key, safeName, mime, size, JSON.stringify(metadata), new Date().toISOString()).run();
  } catch (error) { await env.R2.delete(key); throw error; }
  return { id, name: safeName, size, mimetype: mime, path: `/api/files/${id}`, url: `/api/files/${id}` };
}
export async function getArtifact(env: Env, owner: string, id: string) {
  const row = await env.DB.prepare('SELECT * FROM pulse_artifacts WHERE id=? AND owner_id=?').bind(id, owner).first<{ r2_key: string; name: string; mime: string }>();
  if (!row) throw new HttpError(404, 'not_found', 'Файл не найден.');
  const object = await env.R2.get(row.r2_key);
  if (!object) throw new HttpError(404, 'not_found', 'Файл отсутствует в хранилище.');
  return new Response(object.body as unknown as ReadableStream, { headers: {
    'Content-Type': row.mime, 'Content-Length': String(object.size), 'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    'Content-Security-Policy': "sandbox; default-src 'none'", 'X-Content-Type-Options': 'nosniff',
  } });
}
