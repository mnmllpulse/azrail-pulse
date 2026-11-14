import { zipStore } from '../src/lib/zip-store';

export type ReplyFile = { path: string; text: string };

const WANTS = /(?:^|[^\p{L}])(?:сдела[йть]|собери|упакуй|запакуй|скачай|дай|выдай|верни)\p{L}*[^.!?\n]{0,40}?(?:зип|zip|архив)/iu;
const NAMED = /(?:^|\n)[ \t]*(?:[*_`#>\-\s]*)([\w.][\w./-]{0,80}\.[A-Za-z0-9]{1,8})(?:[*_`:\s]*)\n+```[^\n]*\n([\s\S]*?)\n```/g;
const LANG_FILE: Record<string, string> = { html: 'index.html', css: 'style.css', js: 'app.js', javascript: 'app.js', ts: 'main.ts', json: 'data.json', py: 'main.py', md: 'README.md' };
const FENCE = /```([\w+-]*)[^\n]*\n([\s\S]*?)\n```/g;

export function wantsZipOfReply(message: string): boolean {
  return WANTS.test(message) && message.length <= 200;
}

function safePath(path: string): string {
  const parts = path.split('/').filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/').slice(0, 120);
}

export function filesFromReply(reply: string): ReplyFile[] {
  const files = new Map<string, string>();
  for (const match of reply.matchAll(NAMED)) {
    const path = safePath(match[1]);
    if (path && match[2].trim()) files.set(path, match[2]);
  }
  if (files.size) return [...files].map(([path, text]) => ({ path, text }));
  const used = new Set<string>();
  for (const match of reply.matchAll(FENCE)) {
    const name = LANG_FILE[match[1].toLowerCase()];
    if (!name || !match[2].trim() || used.has(name)) continue;
    used.add(name);
    files.set(name, match[2]);
  }
  return [...files].map(([path, text]) => ({ path, text }));
}

export function zipOfReply(reply: string): Uint8Array | null {
  const files = filesFromReply(reply);
  if (!files.length) return null;
  return zipStore(files.map((file) => ({ path: file.path, data: new TextEncoder().encode(file.text) })));
}
