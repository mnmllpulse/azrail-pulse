import type { Env } from "../types";
import { redactSecrets } from "./secret-scan";
import { fenceUntrusted, UNTRUSTED_RULE } from "./untrusted";
import { listZip, readEntry } from "./zip-reader";
import { TEXT_EXT, ZIP_NOISE, extOf, zipTier } from "./attachments";

export const AUDIT_ASK = /найди\s+ошибк|аудит|провер(?:ь|ка)\s+(?:код|архив|репо|проект)|по\s+каталог|по\s+частям|продолж(?:и|ай)\s+разбор/iu;
export const AUDIT_NEXT = /продолж(?:и|ай)\s+разбор|следующ\w+\s+част/iu;

const PART_BYTES = 80 * 1024;
const PART_FILES = 30;
const FILE_MAX = 48 * 1024;
export const PARTS_PER_TURN = 4;

export interface AuditPart { label: string; paths: string[] }
interface Item { path: string; size: number; skipped?: string }

function stripRoot(paths: string[]): string {
  const first = paths[0]?.split("/")[0];
  return first && paths.length > 1 && paths.every((p) => p.includes("/") && p.split("/")[0] === first) ? `${first}/` : "";
}

export function planAuditParts(entries: Item[]): AuditPart[] {
  const usable = entries.filter((e) => !e.skipped && !ZIP_NOISE.test(e.path) && TEXT_EXT.has(extOf(e.path)) && e.size > 0 && e.size <= FILE_MAX);
  const root = stripRoot(usable.map((e) => e.path));
  const groups = new Map<string, Item[]>();
  for (const e of usable) {
    const rel = e.path.slice(root.length);
    const seg = rel.split("/");
    const key = seg.length === 1 ? "(корень)" : seg[0] === "src" && seg.length > 2 ? `${seg[0]}/${seg[1]}` : seg[0];
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const ordered = [...groups.entries()]
    .map(([key, items]) => ({
      key,
      tier: Math.min(...items.map((i) => zipTier(i.path.slice(root.length)))),
      items: items.sort((a, b) => zipTier(a.path.slice(root.length)) - zipTier(b.path.slice(root.length)) || a.path.split("/").length - b.path.split("/").length || a.size - b.size),
    }))
    .sort((a, b) => a.tier - b.tier || a.key.localeCompare(b.key));
  const parts: AuditPart[] = [];
  for (const g of ordered) {
    const chunks: Item[][] = [];
    let cur: Item[] = [];
    let bytes = 0;
    for (const it of g.items) {
      if (cur.length && (bytes + it.size > PART_BYTES || cur.length >= PART_FILES)) { chunks.push(cur); cur = []; bytes = 0; }
      cur.push(it);
      bytes += it.size;
    }
    if (cur.length) chunks.push(cur);
    chunks.forEach((c, i) => parts.push({ label: chunks.length > 1 ? `${g.key} (${i + 1}/${chunks.length})` : g.key, paths: c.map((x) => x.path) }));
  }
  return parts;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Находка остаётся, только если её цитата дословно есть в файле. */
export function verifyFindings(findings: string, files: Map<string, string>): { kept: string[]; dropped: number } {
  const kept: string[] = [];
  let dropped = 0;
  for (const raw of findings.split("\n")) {
    const line = raw.trim();
    if (!line || /^находок нет\.?$/i.test(line)) continue;
    const path = line.match(/^[-*\d.\s]*`?([^\s:`]+):\d+/)?.[1];
    const quote = line.match(/«([^»]{4,})»|`([^`]{4,})`(?!.*`)/);
    const q = norm(quote?.[1] ?? quote?.[2] ?? "");
    const text = path ? [...files.entries()].find(([k]) => k === path || k.endsWith(`/${path}`))?.[1] : undefined;
    if (path && q && text !== undefined && norm(text.replace(/^\d+\| ?/gm, "")).includes(q)) kept.push(line);
    else dropped++;
  }
  return { kept, dropped };
}

export function parseAuditProgress(history: string): number {
  const all = [...history.matchAll(/\[РАЗБОР (\d+)\/\d+\]/g)];
  return all.length ? Number(all.at(-1)![1]) : 0;
}

const numbered = (t: string) => t.split("\n").map((l, i) => `${i + 1}| ${l}`).join("\n");

export function partPrompt(label: string, files: Map<string, string>): string {
  const body = [...files.entries()].map(([p, t]) => fenceUntrusted(p, numbered(redactSecrets(t)))).join("\n\n");
  return `Роль: аудитор кода. Часть архива: «${label}». Файлы с номерами строк ниже.
Найди реальные дефекты: ошибки логики, гонки, небезопасные места, мёртвый код, расхождения между файлами.
Формат, одна находка на строку: путь:строка — проблема — «дословная цитата из файла, до 100 знаков».
${UNTRUSTED_RULE}
Правила: только то, что видно в этих файлах; без дословной цитаты находку не пиши; о других файлах и проекте в целом не рассуждай; нет находок — одна строка «Находок нет.».

${body}`;
}

export function synthPrompt(question: string, rows: string[], silent: string[]): string {
  return `Вопрос человека: ${question}
Ниже проверенные находки (цитаты сверены с файлами). Сведи: убери дубли, сгруппируй по серьёзности, выведи таблицу «№ | серьёзность | путь:строка | проблема». Добавлять нельзя ничего, чего нет в находках. Серьёзность оценивай по тексту находки.${silent.length ? `\nЧасти без подтверждённых находок: ${silent.join(", ")}.` : ""}

${rows.length ? rows.join("\n") : "Подтверждённых находок нет."}`;
}

export interface AuditResult { text: string; from: number; to: number; total: number }

export async function runZipAudit(
  env: Env,
  archive: { r2Key: string; fileName: string },
  question: string,
  offset: number,
  ask: (prompt: string) => Promise<string>,
): Promise<AuditResult | null> {
  const obj = await env.AZRAIL_R2?.get(archive.r2Key);
  if (!obj || obj.size > 50 * 1024 * 1024) return null;
  const buf = await obj.arrayBuffer();
  const { entries } = listZip(buf, 8000);
  const parts = planAuditParts(entries);
  if (!parts.length || offset >= parts.length) return null;
  const take = parts.slice(offset, offset + PARTS_PER_TURN);
  const rows: string[] = [];
  const silent: string[] = [];
  let dropped = 0;
  for (const part of take) {
    const files = new Map<string, string>();
    for (const path of part.paths) {
      const entry = entries.find((e) => e.path === path);
      if (!entry) continue;
      try { files.set(path, new TextDecoder("utf-8").decode(await readEntry(buf, entry, FILE_MAX))); } catch { /* файл не читается — пропущен */ }
    }
    let answer = "";
    try { answer = await ask(partPrompt(part.label, files)); } catch { silent.push(`${part.label} (модель не ответила)`); continue; }
    const v = verifyFindings(answer, files);
    dropped += v.dropped;
    if (v.kept.length) rows.push(`[${part.label}]`, ...v.kept);
    else silent.push(part.label);
  }
  const summary = await ask(synthPrompt(question, rows, silent));
  const to = offset + take.length;
  const tail = [
    `Разобрано каталогов: ${offset + 1}–${to} из ${parts.length}. Отброшено без дословной цитаты: ${dropped}.`,
    to < parts.length ? "Напиши «продолжи разбор» — возьму следующие." : "Архив разобран целиком.",
    `[РАЗБОР ${to}/${parts.length}]`,
  ].join("\n");
  return { text: `${summary.trim()}\n\n${tail}`, from: offset, to, total: parts.length };
}
