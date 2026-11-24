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

export function commandsBlock(doc: Document, lines: string[]): HTMLDetailsElement {
  const { root, body } = thinkingBlock(doc, lines.length, false, `Выполнил команд: ${lines.length}`);
  root.classList.add('commands-block');
  const list = doc.createElement('ul');
  for (const line of lines) { const li = doc.createElement('li'); li.textContent = line; list.append(li); }
  body.append(list);
  return root;
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
