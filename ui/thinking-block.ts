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

export function commandsBlock(doc: Document, steps: ChatStep[], live = false): HTMLDetailsElement {
  const title = live ? `Ход выполнения · шагов: ${steps.length}` : `Выполнил команд: ${steps.length}`;
  const { root, body } = thinkingBlock(doc, steps.length, live, title);
  root.classList.add('commands-block');
  const list = doc.createElement('ul');
  for (const step of steps) {
    const li = doc.createElement('li');
    const label = step.s ? `${step.t} · ${step.s}` : step.t;
    if (step.d) {
      const item = doc.createElement('details');
      item.className = 'command-step';
      const head = doc.createElement('summary');
      const name = doc.createElement('span');
      name.textContent = label;
      const chevron = doc.createElement('span');
      chevron.className = 'thinking-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.innerHTML = icon('chevron', 14);
      head.append(name, chevron);
      const pre = doc.createElement('pre');
      pre.textContent = step.d;
      item.append(head, pre);
      li.append(item);
    } else li.textContent = label;
    list.append(li);
  }
  body.append(list);
  return root;
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
