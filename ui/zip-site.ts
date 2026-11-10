import { listZip, readEntry, type ZipEntry } from '../src/lib/zip-reader';

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

let held: ArrayBuffer | null = null;
let known: string[] = [];

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

export async function holdArchive(buf: ArrayBuffer): Promise<string[]> {
  held = buf;
  known = await textPaths(buf, 2000);
  return known.slice(0, 200);
}

export function archiveIsHeld(): boolean {
  return held !== null;
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

/** Текст одного файла из последнего архива. Главная HTML-страница приходит со своими стилями. */
export async function openHeld(path: string): Promise<string | null> {
  if (!held || !path) return null;
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
