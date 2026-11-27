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

const openKeys = new Set<string>();

type Section = { label: string; body: string; kind: 'in' | 'out' | 'err' };

/** «Вход:/Результат:/Ошибка:» из шага → подписанные блоки; JSON команды показывается как код, а не как строка с кавычками. */
export function detailSections(detail: string): Section[] {
  return detail.split(/\n\n(?=(?:Вход|Результат|Ошибка):)/).flatMap((part): Section[] => {
    const match = /^(Вход|Результат|Ошибка):\n?([\s\S]*)$/.exec(part);
    if (!match || !match[2].trim()) return [];
    let body = match[2];
    if (match[1] === 'Вход') {
      try {
        const parsed = JSON.parse(body) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const record = parsed as Record<string, unknown>;
          body = typeof record.command === 'string' ? record.command : JSON.stringify(parsed, null, 2);
        }
      } catch { /* усечённый или не JSON — как есть */ }
    }
    const kind = match[1] === 'Вход' ? 'in' : match[1] === 'Ошибка' ? 'err' : 'out';
    return [{ label: match[1] === 'Вход' ? 'Запрос' : match[1], body, kind }];
  });
}

function stateIcon(status: string | undefined): { name: 'check' | 'close' | 'terminal'; state: 'done' | 'failed' | 'running' } {
  if (status === 'готово') return { name: 'check', state: 'done' };
  if (status === 'ошибка') return { name: 'close', state: 'failed' };
  return { name: 'terminal', state: 'running' };
}

function stepItem(doc: Document, step: ChatStep, key: string): HTMLLIElement {
  const li = doc.createElement('li');
  const { name, state } = stateIcon(step.s);
  li.dataset.state = state;
  const badge = doc.createElement('span');
  badge.className = 'steps-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = icon(name, 14);
  const label = doc.createElement('span');
  label.className = 'steps-name';
  label.textContent = step.t;
  if (!step.d) {
    const row = doc.createElement('div');
    row.className = 'steps-line';
    row.append(badge, label);
    li.append(row);
    return li;
  }
  const item = doc.createElement('details');
  item.className = 'command-step';
  item.open = openKeys.has(key);
  item.addEventListener('toggle', () => { if (item.open) openKeys.add(key); else openKeys.delete(key); });
  const summary = doc.createElement('summary');
  const chevron = doc.createElement('span');
  chevron.className = 'commands-row-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = icon('chevron', 14);
  summary.append(badge, label, chevron);
  const body = doc.createElement('div');
  body.className = 'step-body';
  for (const section of detailSections(step.d)) {
    const caption = doc.createElement('div');
    caption.className = 'step-caption';
    caption.textContent = section.label;
    const pre = doc.createElement('pre');
    pre.dataset.kind = section.kind;
    const code = doc.createElement('code');
    code.textContent = section.body;
    pre.append(code);
    body.append(caption, pre);
  }
  item.append(summary, body);
  li.append(item);
  return li;
}

/** Ход выполнения как в Claude: строка со стрелкой раскрывает список шагов прямо в сообщении, каждый шаг раскрывает запрос и результат. */
export function commandsBlock(doc: Document, steps: ChatStep[], live = false, key = ''): HTMLElement {
  const root = doc.createElement('div');
  root.className = 'commands-block';
  root.dataset.live = live ? 'true' : 'false';
  const row = doc.createElement('button');
  row.type = 'button';
  row.className = 'commands-row';
  const last = steps.at(-1);
  const failed = !live && last?.s === 'ошибка';
  const total = `${steps.length} ${steps.length === 1 ? 'шаг' : steps.length < 5 ? 'шага' : 'шагов'}`;
  const title = live ? (last ? `${last.t}…` : 'Начинаю работу…') : failed ? 'Остановлено на ошибке' : total;
  const label = doc.createElement('span');
  label.className = 'commands-row-label';
  label.textContent = title;
  const count = doc.createElement('span');
  count.className = 'commands-row-count';
  count.textContent = failed ? total : '';
  const lead = live ? doc.createElement('span') : failed ? iconElement('close', 16, doc) : null;
  if (lead) {
    lead.classList.add('commands-row-lead');
    if (live) lead.classList.add('commands-spinner');
  }
  const chevron = doc.createElement('span');
  chevron.className = 'commands-row-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = icon('chevron', 16);
  if (lead) row.append(lead);
  row.append(label, count, chevron);
  const list = doc.createElement('ol');
  list.className = 'steps-timeline';
  steps.forEach((step, index) => list.append(stepItem(doc, step, `${key}#${index}`)));
  const blockKey = `${key}:block`;
  const apply = (open: boolean) => {
    row.setAttribute('aria-expanded', String(open));
    row.setAttribute('aria-label', `${title}. ${open ? 'Свернуть' : 'Показать'} список`);
    root.dataset.open = String(open);
    list.hidden = !open;
    if (open) openKeys.add(blockKey); else openKeys.delete(blockKey);
  };
  row.onclick = () => apply(root.dataset.open !== 'true');
  root.append(row, list);
  apply(openKeys.has(blockKey));
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
