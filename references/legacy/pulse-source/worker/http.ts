export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
export function text(value: unknown, name: string, max = 16000, optional = false): string {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new HttpError(400, 'invalid_input', `${name}: требуется текст длиной 1–${max} символов.`);
  }
  return value.trim();
}
export function identifier(value: unknown, name = 'id') {
  const s = text(value, name, 120);
  if (!/^[\p{L}\p{N}_.:-]+$/u.test(s)) throw new HttpError(400, 'invalid_id', `Некорректный ${name}.`);
  return s;
}
export async function readBytes(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'too_large', 'Файл или запрос слишком большой.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'too_large', 'Файл или запрос слишком большой.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return all;
}
export async function body(request: Request, limit = 96 * 1024): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'json_required', 'Нужен Content-Type: application/json.');
  const raw = await readBytes(request, limit);
  try {
    const parsed = JSON.parse(new TextDecoder().decode(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
    return parsed;
  } catch { throw new HttpError(400, 'invalid_json', 'Некорректный JSON.'); }
}
export async function upload(request: Request, limit = 8 * 1024 * 1024): Promise<{ file: File; fields: FormData }> {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new HttpError(415, 'multipart_required', 'Нужен multipart/form-data.');
  const bytes = await readBytes(request, limit + 65536);
  let fields: FormData;
  try { fields = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData(); }
  catch { throw new HttpError(400, 'invalid_form', 'Не удалось прочитать файл.'); }
  const file = fields.get('file');
  if (!(file instanceof File) || !file.size || file.size > limit) throw new HttpError(400, 'invalid_file', 'Выберите файл допустимого размера.');
  return { file, fields };
}
