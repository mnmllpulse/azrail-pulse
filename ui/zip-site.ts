import { listZip, readEntry, type ZipEntry } from '../src/lib/zip-reader';
import { zipStore } from '../src/lib/zip-store';

const text = new TextDecoder();

function base(path: string) {
  return path.split('/').pop()?.toLowerCase() ?? '';
}

function rank(path: string) {
  const name = base(path);
  const depth = path.split('/').length;
  if (name === 'index.html') return depth;
  if (/\.html?$/.test(name)) return 100 + depth;
  return 1000;
}

function mime(path: string) {
  const name = base(path);
  if (name.endsWith('.svg')) return 'image/svg+xml';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  return '';
}

function dataUrl(bytes: Uint8Array, type: string) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  }
  return `data:${type};base64,${btoa(binary)}`;
}

async function inlineAssets(buf: ArrayBuffer, html: string, folder: string, files: ZipEntry[]) {
  const byName = new Map<string, ZipEntry>();
  for (const file of files) byName.set(file.path.slice(folder.length).toLowerCase(), file);
  for (const link of html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = link[1].split('?')[0].replace(/^\.\//, '').toLowerCase();
    const file = byName.get(href);
    if (!file || !href.endsWith('.css')) continue;
    try {
      const css = text.decode(await readEntry(buf, file, 200_000));
      html = html.replace(link[0], `<style>${css}</style>`);
    } catch { /* ссылка остаётся, если файл не читается */ }
  }
  let images = 0;
  for (const ref of [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]) {
    if (images >= 12) break;
    const raw = ref[1].split('?')[0].replace(/^\.\//, '');
    const type = mime(raw);
    const file = byName.get(raw.toLowerCase());
    if (!type || !file || file.size > 300_000) continue;
    try {
      html = html.replaceAll(ref[1], dataUrl(await readEntry(buf, file, 300_000), type));
      images += 1;
    } catch { /* картинка остаётся как в архиве */ }
  }
  return html;
}

const TEXT_EXT = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'md', 'txt', 'css', 'html', 'htm', 'yml', 'yaml', 'toml', 'sql', 'py', 'rs', 'go', 'xml', 'svg', 'csv']);
const NOISE = /(^|\/)(node_modules|dist|coverage|\.git|__MACOSX)(\/|$)/;

function extOf(path: string) {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
}

const NAMED_FILE = /(?:^|[\s`'"(])((?:[\w.-]+\/)+[\w.-]+\.[\w]+|[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|txt|css|html|yml|yaml|toml|sql|py|rs|go|xml|svg|csv))/giu;
const OPEN_LINE = /^(?:открой|покажи|выведи)(?:\s+файл)?\s+\S+[.!?]?$/iu;

const PACK_FILES = 200;
const PACK_ONE = 512_000;
const PACK_TOTAL = 8 * 1024 * 1024;

let held: ArrayBuffer | null = null;
let known: string[] = [];
let plain: Array<{ path: string; data: Uint8Array }> | null = null;
let downloadName = 'проект.zip';
let openPath = '';
let shots: Array<{ path: string; text: string }> = [];

function clearShots() {
  shots = [];
}

async function textPaths(buf: ArrayBuffer, limit: number): Promise<string[]> {
  let listing;
  try { listing = listZip(buf, 2000); } catch { return []; }
  return listing.entries
    .filter((entry) => !entry.skipped && TEXT_EXT.has(extOf(entry.path)) && !NOISE.test(entry.path))
    .sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((entry) => entry.path);
}

/** Пути текстовых файлов. index.html идёт первым, список короткий. */
export async function catalogPaths(buf: ArrayBuffer): Promise<string[]> {
  return textPaths(buf, 200);
}

export async function holdArchive(buf: ArrayBuffer, name = 'архив.zip'): Promise<string[]> {
  held = buf;
  plain = null;
  clearShots();
  downloadName = name.toLowerCase().endsWith('.zip') ? name : `${name}.zip`;
  known = await textPaths(buf, 2000);
  openPath = known[0] ?? '';
  return known.slice(0, 200);
}

/** Страница из чата или один HTML. Архив ZIP при этом отпускается. */
export function holdPlain(files: Array<{ path: string; text: string }>, name = 'проект.zip'): string[] {
  held = null;
  clearShots();
  downloadName = name.toLowerCase().endsWith('.zip') ? name : `${name}.zip`;
  const list = files.filter((file) => file.path && !file.path.includes('..')).slice(0, PACK_FILES);
  plain = list.map((file) => ({ path: file.path, data: new TextEncoder().encode(file.text) }));
  known = list.map((file) => file.path);
  openPath = known[0] ?? '';
  return known;
}

export function archiveIsHeld(): boolean {
  return held !== null;
}

export function sourceIsHeld(): boolean {
  return held !== null || Boolean(plain?.length);
}

export function activePath(): string {
  return openPath;
}

export function rememberPath(path: string) {
  if (path && !path.includes('..')) openPath = path;
}

const ARCHIVE_MARK = /\[АРХИВ r2=(\S+) name=([^\]]+)\]/g;

/** Метки уже сохранённого ZIP. После перезагрузки экран берёт архив по ним. */
export function archiveMarks(text: string): Array<{ r2Key: string; fileName: string }> {
  return [...text.matchAll(ARCHIVE_MARK)].map((item) => ({ r2Key: item[1], fileName: item[2].trim() }));
}

/** Запоминает текст файла до правки. Хранит три последних снимка. */
export function snapFile(path: string, text: string) {
  const name = path || openPath;
  if (!name || name.includes('..') || text.length > PACK_TOTAL) return;
  if (shots[0]?.path === name && shots[0].text === text) return;
  shots = [{ path: name, text }, ...shots].slice(0, 3);
}

export function fileShotReady(): boolean {
  return shots.length > 0;
}

/** Ставит прошлый текст файла текущим. Текущий текст остаётся в снимках. */
export function restoreFileShot(path: string, text: string): { path: string; text: string } | null {
  const shot = shots[0];
  if (!shot) return null;
  const name = path || openPath || 'index.html';
  shots = [{ path: name, text }, ...shots.slice(1)].slice(0, 3);
  rememberPath(shot.path);
  return shot;
}

/** Имена из новой фразы. Совпадает с тем, как сервер узнаёт файл в вопросе. */
export function askedPaths(text: string): string[] {
  const found: string[] = [];
  for (const item of text.matchAll(NAMED_FILE)) {
    const path = item[1].replace(/^\.?\//, '');
    if (path.length > 180 || path.includes('..') || found.includes(path)) continue;
    found.push(path);
    if (found.length >= 3) break;
  }
  return found;
}

/** Фраза только открывает один файл, без другого вопроса. */
export function openOnlyPath(text: string): string | null {
  const source = text.trim();
  if (!OPEN_LINE.test(source)) return null;
  const names = askedPaths(source);
  return names.length === 1 ? names[0] : null;
}

/** Точный путь, иначе самый короткий хвост. Чужой путь с .. не берётся. */
export function matchHeldPath(needle: string): string | null {
  const want = needle.replace(/^\.?\//, '').toLowerCase();
  if (!want || want.includes('..') || want.length > 180) return null;
  const exact = known.find((path) => path.toLowerCase() === want);
  if (exact) return exact;
  return known.filter((path) => path.toLowerCase().endsWith(`/${want}`)).sort((a, b) => a.length - b.length)[0] ?? null;
}

export type PackedFile = { name: string; bytes: Uint8Array; packed: number; total: number; note: string };

function packNote(packed: number, total: number) {
  const line = `Собрано ${packed} из ${total}.`;
  return packed < total ? `${line} Служебные папки и файлы больше лимита не вошли.` : line;
}

function fileTitle(path: string) {
  return path.split('/').pop() || 'файл.txt';
}

/** Текущий текст редактора как один файл. */
export function bytesForFile(path: string, text: string): PackedFile | null {
  if (!sourceIsHeld() || text.length > PACK_TOTAL) return null;
  const name = fileTitle(path || openPath);
  return { name, bytes: new TextEncoder().encode(text), packed: 1, total: 1, note: `Файл ${name}.` };
}

/** Архив с правкой открытого файла. Остальные читаемые файлы копируются, лимит называется вслух. */
export async function bytesForArchive(path: string, text: string): Promise<PackedFile | null> {
  const edited = new TextEncoder().encode(text);
  if (edited.length > PACK_ONE) return null;
  if (plain) {
    const files = plain.map((file) => file.path === path ? { path, data: edited } : file);
    if (path && !files.some((file) => file.path === path)) files.push({ path, data: edited });
    return { name: downloadName, bytes: zipStore(files), packed: files.length, total: files.length, note: packNote(files.length, files.length) };
  }
  if (!held) return null;
  let listing;
  try { listing = listZip(held, 2000); } catch { return null; }
  const files: Array<{ path: string; data: Uint8Array }> = [];
  let totalBytes = 0;
  for (const entry of listing.entries) {
    if (files.length >= PACK_FILES || totalBytes >= PACK_TOTAL) break;
    if (entry.skipped || NOISE.test(entry.path) || entry.size > PACK_ONE) continue;
    try {
      const data = entry.path === path ? edited : await readEntry(held, entry, PACK_ONE);
      if (totalBytes + data.length > PACK_TOTAL) break;
      files.push({ path: entry.path, data });
      totalBytes += data.length;
    } catch { /* Этот файл не вошёл. */ }
  }
  if (path && !files.some((file) => file.path === path) && totalBytes + edited.length <= PACK_TOTAL) {
    files.push({ path, data: edited });
  }
  if (!files.length) return null;
  const name = downloadName.replace(/\.zip$/i, '') + '-правка.zip';
  return { name, bytes: zipStore(files), packed: files.length, total: listing.total, note: packNote(files.length, listing.total) };
}

export function saveBytes(name: string, bytes: Uint8Array) {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([copy]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Текст одного файла из последнего архива. Главная HTML-страница приходит со своими стилями. */
export async function openHeld(path: string): Promise<string | null> {
  if (!path) return null;
  if (plain) {
    const file = plain.find((item) => item.path === path);
    return file ? text.decode(file.data) : null;
  }
  if (!held) return null;
  let listing;
  try { listing = listZip(held, 2000); } catch { return null; }
  const page = listing.entries
    .filter((entry) => !entry.skipped && /\.html?$/i.test(entry.path) && !NOISE.test(entry.path))
    .sort((a, b) => rank(a.path) - rank(b.path))[0];
  if (page && page.path === path) return siteFromZip(held);
  const entry = listing.entries.find((item) => item.path === path && !item.skipped);
  if (!entry || entry.size > 256_000) return null;
  try { return text.decode(await readEntry(held, entry, 256_000)); } catch { return null; }
}

/** Главная страница архива: index.html, его CSS и картинки рядом. */
export async function siteFromZip(buf: ArrayBuffer): Promise<string | null> {
  let listing;
  try { listing = listZip(buf, 2000); } catch { return null; }
  const page = listing.entries
    .filter((entry) => !entry.skipped && /\.html?$/i.test(entry.path) && !/(^|\/)(node_modules|dist|coverage|\.git)\//.test(entry.path))
    .sort((a, b) => rank(a.path) - rank(b.path))[0];
  if (!page || rank(page.path) >= 1000) return null;
  let html: string;
  try { html = text.decode(await readEntry(buf, page, 2_000_000)); } catch { return null; }
  const folder = page.path.includes('/') ? page.path.slice(0, page.path.lastIndexOf('/') + 1) : '';
  const files = listing.entries.filter((entry) => !entry.skipped && entry.path.startsWith(folder));
  html = await inlineAssets(buf, html, folder, files);
  return html.trim() ? html : null;
}
