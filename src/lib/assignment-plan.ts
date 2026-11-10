export type DraftPart = { text: string; kind: 'image' | 'music' | 'video' | 'web' | 'file' | 'diagram' | 'build'; after: boolean };

const KINDS = new Set(['image', 'music', 'video', 'web', 'file', 'diagram', 'build']);

/** Достаёт части из ответа модели. Пустой список — разговор. null — ответ нельзя использовать. */
export function parsePlanDraft(raw: string): DraftPart[] | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let body: unknown;
  try { body = JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  if (!body || typeof body !== 'object' || !Array.isArray((body as { parts?: unknown }).parts)) return null;
  const parts = (body as { parts: unknown[] }).parts;
  if (parts.length === 0) return [];
  const out: DraftPart[] = [];
  for (const row of parts.slice(0, 4)) {
    if (!row || typeof row !== 'object') return null;
    const text = String((row as { text?: unknown }).text ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
    const kind = (row as { kind?: unknown }).kind;
    if (!text || typeof kind !== 'string' || !KINDS.has(kind)) return null;
    out.push({ text, kind: kind as DraftPart['kind'], after: (row as { after?: unknown }).after === true });
  }
  return out;
}
