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
    if (before) appendTextBlock(host, before);
    appendCodeBlock(host, match[1]?.trim() || '', match[2] ?? '');
    last = match.index + match[0].length;
  }
  const tail = source.slice(last);
  if (tail) appendTextBlock(host, tail);

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
