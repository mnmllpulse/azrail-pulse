import { icon, iconElement } from './icons';

const PLAN = /^(\*\*План из (\d+) част[а-я]*\*\*\n\n(?:[^\n]+\n)+\n(?:\d+\. [^\n]+\n)+\n[^\n]+)(?:\n\n([\s\S]*))?$/;

export function splitProcess(content: string): { process: string; rest: string; steps: number } {
  const match = PLAN.exec(content.trimEnd());
  if (!match) return { process: '', rest: content, steps: 0 };
  return { process: match[1], rest: (match[3] ?? '').trim(), steps: Number(match[2]) };
}

function parts(count: number): string {
  const tail = count % 100;
  if (tail > 10 && tail < 15) return 'частей';
  const last = count % 10;
  if (last === 1) return 'часть';
  return last >= 2 && last <= 4 ? 'части' : 'частей';
}

export type ChatStep = { t: string; s?: string; d?: string };

export function commandsBlock(doc: Document, steps: ChatStep[], live = false): HTMLElement {
  const root = doc.createElement('div');
  root.className = 'commands-block';
  root.dataset.live = live ? 'true' : 'false';
  const row = doc.createElement('button');
  row.type = 'button';
  row.className = 'commands-row';
  row.setAttribute('aria-haspopup', 'dialog');
  const last = steps.at(-1);
  const title = live && last ? `${last.t}…` : `Выполнил команд: ${steps.length}`;
  row.setAttribute('aria-label', `${title}. Открыть список`);
  const label = doc.createElement('span');
  label.className = 'commands-row-label';
  label.textContent = title;
  const chevron = doc.createElement('span');
  chevron.className = 'commands-row-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = icon('chevron', 16);
  row.append(iconElement('mission', 16, doc), label, chevron);
  row.onclick = () => openStepsSheet(doc, steps, row);
  root.append(row);
  return root;
}

export function openStepsSheet(doc: Document, steps: ChatStep[], opener?: HTMLElement): HTMLElement {
  doc.querySelector('.steps-sheet-backdrop')?.remove();
  const backdrop = doc.createElement('div');
  backdrop.className = 'steps-sheet-backdrop';
  const sheet = doc.createElement('section');
  sheet.className = 'steps-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', `Выполнил команд: ${steps.length}`);
  const head = doc.createElement('header');
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'steps-sheet-close';
  close.setAttribute('aria-label', 'Закрыть');
  close.innerHTML = icon('close', 20);
  const title = doc.createElement('h2');
  title.textContent = `Выполнил команд: ${steps.length}`;
  head.append(close, title);
  const list = doc.createElement('ol');
  list.className = 'steps-timeline';
  for (const step of steps) {
    const li = doc.createElement('li');
    const label = step.s ? `${step.t} · ${step.s}` : step.t;
    if (step.d) {
      const item = doc.createElement('details');
      item.className = 'command-step';
      const summary = doc.createElement('summary');
      const badge = doc.createElement('span');
      badge.className = 'steps-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = icon('terminal', 16);
      const name = doc.createElement('span');
      name.className = 'steps-name';
      name.textContent = label;
      const chevron = doc.createElement('span');
      chevron.className = 'commands-row-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.innerHTML = icon('chevron', 16);
      summary.append(badge, name, chevron);
      const pre = doc.createElement('pre');
      pre.textContent = step.d;
      item.append(summary, pre);
      li.append(item);
    } else {
      const dot = doc.createElement('span');
      dot.className = 'steps-dot';
      dot.setAttribute('aria-hidden', 'true');
      const text = doc.createElement('span');
      text.className = 'steps-text';
      text.textContent = label;
      li.append(dot, text);
    }
    list.append(li);
  }
  sheet.append(head, list);
  backdrop.append(sheet);
  const shut = () => { backdrop.remove(); doc.removeEventListener('keydown', onKey); opener?.focus(); };
  const onKey = (event: Event) => { if ((event as KeyboardEvent).key === 'Escape') shut(); };
  close.onclick = shut;
  backdrop.onclick = (event) => { if (event.target === backdrop) shut(); };
  doc.addEventListener('keydown', onKey);
  doc.body.append(backdrop);
  close.focus();
  return backdrop;
}

export function stepsOf(value: unknown): ChatStep[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((x): ChatStep[] => {
    if (typeof x === 'string') return x ? [{ t: x.slice(0, 120) }] : [];
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    if (typeof o.t !== 'string' || !o.t) return [];
    return [{ t: o.t.slice(0, 120), ...(typeof o.s === 'string' ? { s: o.s.slice(0, 40) } : {}), ...(typeof o.d === 'string' && o.d ? { d: o.d.slice(0, 3200) } : {}) }];
  });
}

export function thinkingBlock(doc: Document, steps: number, open = false, title = ''): { root: HTMLDetailsElement; body: HTMLDivElement } {
  const root = doc.createElement('details');
  root.className = 'thinking-block';
  root.open = open;
  const summary = doc.createElement('summary');
  summary.append(iconElement('mission', 16, doc));
  const label = doc.createElement('span');
  label.textContent = title || `Ход выполнения · ${steps} ${parts(steps)}`;
  const chevron = doc.createElement('span');
  chevron.className = 'thinking-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = icon('chevron', 16);
  summary.append(label, chevron);
  const body = doc.createElement('div');
  body.className = 'thinking-body';
  root.append(summary, body);
  return { root, body };
}
