/** Escape text for safe HTML insertion. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,]|$)/g, '$1<em>$2</em>');
}

const PICTURE = /!\[([^\]\n]{0,180})\]\(([^)\s]{1,300})\)/g;
const EMBED = /(!?)\[([^\]\n]{0,180})\]\(([^)\s]{1,300})\)/g;

/** Только своя картинка студии. Чужой адрес в чат не становится изображением. */
export function safeChatPicture(raw: string): string {
  try {
    const url = new URL(raw, 'https://azrail.local');
    if (url.origin !== 'https://azrail.local') return '';
    const path = url.pathname + url.search;
    return /^\/api\/studio\/artifacts\/[A-Za-z0-9._~-]+(?:\?inline=1)?$/.test(path) ? path : '';
  } catch {
    return '';
  }
}

export function chatPicturePaths(raw: string): string[] {
  const found: string[] = [];
  for (const match of String(raw ?? '').matchAll(PICTURE)) {
    const path = safeChatPicture(match[2] ?? '');
    if (path) found.push(path);
  }
  return found;
}

function pictureName(title: string): string {
  const stem = title.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${stem || 'kartinka'}.png`;
}

function saveBlob(blob: Blob, name: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function pictureBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  try {
    const token = sessionStorage.getItem('pulse.token');
    if (token) headers.set('Authorization', 'Bearer ' + token);
  } catch { /* сессия остаётся в cookie */ }
  const response = await fetch(path, { credentials: 'same-origin', headers });
  if (!response.ok) throw new Error('Картинка не скачалась.');
  return response.blob();
}

/** Render assistant markdown into a container. Fenced code blocks get a Copy code control. */
export function fillMarkdownContent(host: HTMLElement, raw: string): void {
  const doc = host.ownerDocument;
  host.replaceChildren();
  host.classList.add('message-content', 'message-markdown');
  const source = String(raw ?? '');
  if (!source) return;

  const fence = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(source))) {
    const before = source.slice(last, match.index);
    if (before) appendRich(host, before);
    appendCodeBlock(host, match[1]?.trim() || '', match[2] ?? '');
    last = match.index + match[0].length;
  }
  const tail = source.slice(last);
  if (tail) appendRich(host, tail);

  function appendRich(parent: HTMLElement, text: string) {
    const embed = new RegExp(EMBED.source, 'g');
    let cursor = 0;
    let found: RegExpExecArray | null;
    while ((found = embed.exec(text))) {
      const before = text.slice(cursor, found.index);
      if (before.trim()) appendTextBlock(parent, before);
      const path = safeChatPicture(found[3] ?? '');
      const title = (found[2] || '').trim();
      if (path && found[1]) appendPicture(parent, title || 'Картинка', path);
      else if (path) appendFile(parent, title || 'Файл', path);
      else appendTextBlock(parent, found[0]);
      cursor = found.index + found[0].length;
    }
    const rest = text.slice(cursor);
    if (rest.trim()) appendTextBlock(parent, rest);
  }

  function appendFile(parent: HTMLElement, title: string, path: string) {
    const bar = doc.createElement('div');
    bar.className = 'chat-picture-actions';
    const save = doc.createElement('button');
    save.type = 'button';
    save.textContent = `Скачать «${title}»`;
    save.onclick = () => {
      save.disabled = true;
      void pictureBlob(path).then((blob) => saveBlob(blob, title)).catch(() => {
        save.textContent = 'Не вышло';
      }).finally(() => {
        save.disabled = false;
        window.setTimeout(() => { save.textContent = `Скачать «${title}»`; }, 1400);
      });
    };
    bar.append(save);
    parent.append(bar);
  }

  function appendPicture(parent: HTMLElement, title: string, path: string) {
    const figure = doc.createElement('figure');
    figure.className = 'chat-picture';
    const img = doc.createElement('img');
    img.src = path;
    img.alt = title;
    const bar = doc.createElement('div');
    bar.className = 'chat-picture-actions';
    const save = doc.createElement('button');
    save.type = 'button';
    save.textContent = 'Скачать';
    save.onclick = () => {
      save.disabled = true;
      void pictureBlob(path).then((blob) => saveBlob(blob, pictureName(title))).catch(() => {
        save.textContent = 'Не вышло';
      }).finally(() => {
        save.disabled = false;
        window.setTimeout(() => { save.textContent = 'Скачать'; }, 1400);
      });
    };
    const share = doc.createElement('button');
    share.type = 'button';
    share.textContent = 'Поделиться';
    share.onclick = () => {
      share.disabled = true;
      void pictureBlob(path).then(async (blob) => {
        const name = pictureName(title);
        const file = new File([blob], name, { type: blob.type || 'image/png' });
        const data: ShareData = { title, files: [file] };
        if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
          try { await navigator.share(data); return; }
          catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
        }
        saveBlob(blob, name);
      }).catch(() => {
        share.textContent = 'Не вышло';
      }).finally(() => {
        share.disabled = false;
        window.setTimeout(() => { share.textContent = 'Поделиться'; }, 1400);
      });
    };
    bar.append(save, share);
    figure.append(img, bar);
    parent.append(figure);
  }

  function appendTextBlock(parent: HTMLElement, text: string) {
    const block = doc.createElement('div');
    block.className = 'md-text';
    const paragraphs = text.split(/\n{2,}/);
    for (const part of paragraphs) {
      if (!part.trim()) continue;
      const p = doc.createElement('p');
      p.innerHTML = formatInline(escapeHtml(part)).replace(/\n/g, '<br>');
      block.append(p);
    }
    if (block.childElementCount) parent.append(block);
  }

  function appendCodeBlock(parent: HTMLElement, lang: string, code: string) {
    const wrap = doc.createElement('div');
    wrap.className = 'code-block';
    const bar = doc.createElement('div');
    bar.className = 'code-block-bar';
    const label = doc.createElement('span');
    label.className = 'code-block-lang';
    label.textContent = lang || 'code';
    const copy = doc.createElement('button');
    copy.type = 'button';
    copy.className = 'code-block-copy';
    copy.textContent = 'Copy code';
    copy.title = 'Скопировать код';
    const body = code.replace(/\n$/, '');
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(body);
        copy.textContent = 'Copied';
        window.setTimeout(() => {
          copy.textContent = 'Copy code';
        }, 1400);
      } catch {
        copy.textContent = 'Error';
        window.setTimeout(() => {
          copy.textContent = 'Copy code';
        }, 1400);
      }
    };
    bar.append(label, copy);
    const pre = doc.createElement('pre');
    const codeEl = doc.createElement('code');
    codeEl.textContent = body;
    pre.append(codeEl);
    wrap.append(bar, pre);
    parent.append(wrap);
  }
}
