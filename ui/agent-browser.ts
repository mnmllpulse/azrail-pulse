import { AGENT_OFFLINE, agentGap, waitJob, type AgentJobView, type AgentState } from './chat-agent';
import { activeRootField } from './agent-roots';

type Api = (path: string, init?: RequestInit) => Promise<any>;

export const LIST_LIMIT = 500;
export const PREVIEW_LIMIT = 20_000;

export type BrowserEntry = { name: string; dir: boolean };

/** Ответ агента на list: по строке на запись, папки оканчиваются на «/». */
export function parseListing(text: string): BrowserEntry[] {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && line !== '/')
    .map((line) => (line.endsWith('/') ? { name: line.slice(0, -1), dir: true } : { name: line, dir: false }))
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'ru'));
}

export const childPath = (dir: string, name: string): string => (dir ? `${dir}/${name}` : name);

export function parentPath(dir: string): string {
  const parts = dir.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function crumbs(dir: string): Array<{ label: string; path: string }> {
  const parts = dir.split('/').filter(Boolean);
  return [{ label: 'Папка агента', path: '' }, ...parts.map((label, index) => ({ label, path: parts.slice(0, index + 1).join('/') }))];
}

export type BrowserSelection = { path: string; kind: 'list' | 'read' };

export type BrowserDeps = {
  api: Api;
  sleep: (ms: number) => Promise<void>;
  onSelect: (selection: BrowserSelection) => void;
  failure: (error: unknown) => void;
  /** Сюда складываются id задач обзора, чтобы список задач в настройках не засорялся. */
  ownJobs?: Set<string>;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function createAgentBrowser(deps: BrowserDeps): { element: HTMLElement; open: (dir?: string) => Promise<void>; setRoot: (root: string | null) => void } {
  const root = el('section', '', 'agent-browser');
  const bar = el('div', '', 'agent-browser-bar');
  const list = el('div', '', 'agent-browser-list');
  const preview = el('div', '', 'agent-browser-preview');
  preview.hidden = true;
  const rootLine = el('p', '', 'agent-browser-root');
  rootLine.hidden = true;
  root.append(el('h4', 'Обзор папки'), rootLine, bar, list, preview);
  list.append(el('p', 'Нажми «Показать папку», чтобы прочитать содержимое через агента.', 'muted'));

  let dir = '';
  let turn = 0;

  const run = async (kind: 'list' | 'read', path: string): Promise<AgentJobView | string> => {
    const state = (await deps.api('/api/agent/status')) as AgentState;
    const gap = agentGap(state);
    if (gap) return gap;
    const made = (await deps.api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind, path, ...activeRootField() }) })).job as AgentJobView;
    deps.ownJobs?.add(made.id);
    const job = await waitJob(deps.api, made.id, deps.sleep, 20);
    if (job.status === 'queued' || job.status === 'running') return 'Агент не ответил вовремя. Проверь окно PowerShell и нажми «Обновить».';
    return job;
  };

  const paintBar = () => {
    bar.replaceChildren();
    for (const crumb of crumbs(dir)) {
      const button = el('button', crumb.label, 'agent-browser-crumb');
      button.type = 'button';
      button.disabled = crumb.path === dir;
      button.onclick = () => void load(crumb.path);
      bar.append(button);
    }
    const refresh = el('button', 'Обновить', 'agent-browser-refresh');
    refresh.type = 'button';
    refresh.onclick = () => void load(dir);
    bar.append(refresh);
  };

  const showError = (text: string) => {
    const nodes: HTMLElement[] = [el('p', text, 'context-note')];
    if (text === AGENT_OFFLINE) {
      const steps = el('ol', '', 'agent-browser-steps');
      for (const step of ['«Выключить» → «Включить на 1 час» (ключ показывается один раз).', 'В блоке «Запуск на компьютере» нажми «Скопировать команду».', 'Открой PowerShell, вставь команду, окно не закрывай.', 'Дождись «Агент подключён» и нажми «Повторить».']) steps.append(el('li', step));
      nodes.push(steps);
    }
    const retry = el('button', 'Повторить');
    retry.type = 'button';
    retry.onclick = () => void load(dir);
    nodes.push(retry);
    list.replaceChildren(...nodes);
  };

  const load = async (target: string): Promise<void> => {
    const mine = ++turn;
    dir = target;
    paintBar();
    preview.hidden = true;
    list.replaceChildren(el('p', 'Читаю папку через агента…', 'muted'));
    try {
      const outcome = await run('list', target);
      if (mine !== turn) return;
      if (typeof outcome === 'string') return showError(outcome);
      if (outcome.status !== 'done') return showError(outcome.error || `Агент вернул статус «${outcome.status}».`);
      const entries = parseListing(outcome.result ?? '');
      deps.onSelect({ path: target, kind: 'list' });
      const rows: HTMLElement[] = [];
      if (target) {
        const up = el('button', '↑ Вверх', 'agent-browser-entry is-up');
        up.type = 'button';
        up.onclick = () => void load(parentPath(target));
        rows.push(up);
      }
      for (const entry of entries) {
        const full = childPath(target, entry.name);
        const row = el('button', '', `agent-browser-entry ${entry.dir ? 'is-dir' : 'is-file'}`);
        row.type = 'button';
        row.append(el('span', entry.dir ? '▸' : '·', 'agent-browser-mark'), el('span', entry.dir ? `${entry.name}/` : entry.name));
        row.onclick = () => (entry.dir ? void load(full) : void openFile(full));
        rows.push(row);
      }
      if (!entries.length) rows.push(el('p', 'Папка пуста или все файлы в ней закрыты агентом.', 'muted'));
      if (entries.length >= LIST_LIMIT) rows.push(el('p', `Показаны первые ${LIST_LIMIT} записей.`, 'muted'));
      list.replaceChildren(...rows);
    } catch (error) {
      if (mine !== turn) return;
      showError(error instanceof Error ? error.message : 'Папку прочитать не удалось.');
      deps.failure(error);
    }
  };

  const openFile = async (path: string): Promise<void> => {
    const mine = ++turn;
    deps.onSelect({ path, kind: 'read' });
    preview.hidden = false;
    preview.replaceChildren(el('p', `Открываю ${path}…`, 'muted'));
    try {
      const outcome = await run('read', path);
      if (mine !== turn) return;
      const head = el('div', '', 'agent-browser-preview-head');
      head.append(el('strong', path));
      const close = el('button', 'Закрыть');
      close.type = 'button';
      close.onclick = () => { preview.hidden = true; };
      head.append(close);
      if (typeof outcome === 'string' || outcome.status !== 'done') {
        preview.replaceChildren(head, el('p', typeof outcome === 'string' ? outcome : outcome.error || `Агент вернул статус «${outcome.status}».`, 'context-note'));
        return;
      }
      const text = outcome.result ?? '';
      const area = el('textarea');
      area.readOnly = true;
      area.rows = 10;
      area.value = text.slice(0, PREVIEW_LIMIT);
      preview.replaceChildren(head, area);
      if (text.length > PREVIEW_LIMIT) preview.append(el('p', `Показаны первые ${PREVIEW_LIMIT} символов из ${text.length}.`, 'muted'));
    } catch (error) {
      if (mine !== turn) return;
      preview.replaceChildren(el('p', error instanceof Error ? error.message : 'Файл прочитать не удалось.', 'context-note'));
      deps.failure(error);
    }
  };

  const start = el('button', 'Показать папку');
  start.type = 'button';
  start.onclick = () => void load(dir);
  list.append(start);
  paintBar();

  const setRoot = (value: string | null) => {
    rootLine.hidden = !value;
    rootLine.textContent = value ? `Папка агента: ${value}` : '';
  };

  return { element: root, open: (target = '') => load(target), setRoot };
}
