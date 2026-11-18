import { iconElement, type IconName } from './icons';

const BY_EXT: Record<string, IconName> = {
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'image',
  mp3: 'audio', wav: 'audio', m4a: 'audio', flac: 'audio', ogg: 'audio', mid: 'audio', midi: 'audio',
  mp4: 'video', mov: 'video', webm: 'video',
  pdf: 'document', doc: 'document', docx: 'document', txt: 'document', md: 'document', csv: 'document', rtf: 'document',
  js: 'fileCode', ts: 'fileCode', tsx: 'fileCode', jsx: 'fileCode', json: 'fileCode', html: 'fileCode', css: 'fileCode', py: 'fileCode', rs: 'fileCode', go: 'fileCode', java: 'fileCode', sh: 'fileCode', yml: 'fileCode', yaml: 'fileCode', sql: 'fileCode',
};

export function fileIconName(name: string): IconName {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return BY_EXT[ext] ?? 'file';
}

export type ChatAttachment = { name: string; url?: string; image: boolean };

const LINE = /^(!?)\[([^\]]{1,120})\]\((\/api\/studio\/artifacts\/[A-Za-z0-9_-]{1,80})\)$/;
const PLAIN = /^📎 (.{1,120})$/u;

export function splitAttachments(content: string): { text: string; files: ChatAttachment[] } {
  const blocks = content.split(/\n{2,}/);
  const files: ChatAttachment[] = [];
  while (blocks.length) {
    const block = blocks[blocks.length - 1].trim();
    const link = LINE.exec(block);
    const plain = link ? null : PLAIN.exec(block);
    if (!link && !plain) break;
    files.unshift(link ? { name: link[2], url: link[3], image: link[1] === '!' } : { name: plain![1], image: false });
    blocks.pop();
  }
  return { text: blocks.join('\n\n').trim(), files };
}

export function attachmentChip(doc: Document, file: ChatAttachment): HTMLElement {
  const chip = doc.createElement(file.url ? 'a' : 'span');
  chip.className = 'attachment-chip';
  chip.dataset.kind = file.image ? 'image' : fileIconName(file.name);
  if (file.url) {
    const link = chip as HTMLAnchorElement;
    link.href = file.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = file.image ? `Открыть изображение ${file.name}` : `Открыть ${file.name}`;
  } else chip.title = 'Файл не загружен: имя передано без содержимого';
  const label = doc.createElement('span');
  label.className = 'attachment-chip-name';
  label.textContent = file.name;
  const status = doc.createElement('small');
  status.textContent = file.url ? (file.image ? 'Изображение' : 'Загружен') : 'Не загружен';
  const text = doc.createElement('span');
  text.className = 'attachment-chip-text';
  text.append(label, status);
  chip.append(iconElement(file.image ? 'image' : fileIconName(file.name), 18, doc), text);
  if (file.url) chip.append(iconElement('eye', 16, doc));
  return chip;
}
