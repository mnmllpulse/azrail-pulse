import { createAgentBrowser } from './agent-browser';
import { COMPUTER_COMMANDS } from './terminal-panel';

type Api = (path: string, init?: RequestInit) => Promise<any>;

type JobView = { id: string; kind: string; path: string; status: string; result: string | null; error: string | null; bytes?: number };

const STATUS: Record<string, string> = {
  awaiting_approval: 'ждёт твоего «ок»',
  queued: 'в очереди',
  running: 'выполняется',
  done: 'готово',
  failed: 'ошибка',
  rejected: 'отклонено',
  expired: 'истекло',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function agentCommand(origin: string, token: string): string {
  return [
    `$env:AZRAIL_URL="${origin}"`,
    `$env:AZRAIL_AGENT_TOKEN="${token}"`,
    '$env:AZRAIL_ROOT="C:\\путь\\к\\папке"',
    'node scripts\\local-agent\\azrail-agent.mjs',
  ].join('\n');
}

export function agentSettings(api: Api, notice: (text: string, bad?: boolean) => void, failure: (error: unknown) => void): HTMLElement {
  const root = el('section', '', 'settings-block');
  root.append(el('h3', 'Агент на компьютере'));
  root.append(el('p', 'Выключен по умолчанию. Включается на 1 час, видит только одну папку, секреты (.env, .git, ключи) закрыты, запись только после твоего «ок».', 'muted'));
  const body = el('div');
  root.append(body);

  const kind = el('select');
  for (const [value, label] of [['list', 'Список файлов'], ['read', 'Прочитать файл'], ['write', 'Записать файл'], ['run', 'Команда (белый список)']]) {
    const option = el('option', label);
    option.value = value;
    kind.append(option);
  }
  const path = el('input');
  path.placeholder = 'Путь внутри папки: выбери в обзоре ниже или введи вручную';
  path.maxLength = 300;
  const command = el('select');
  for (const [value, label] of COMPUTER_COMMANDS) {
    const option = el('option', label);
    option.value = value;
    command.append(option);
  }
  const content = el('textarea');
  content.rows = 4;
  content.placeholder = 'Текст файла (только для записи)';
  const syncForm = () => {
    path.hidden = kind.value === 'run';
    command.hidden = kind.value !== 'run';
    content.hidden = kind.value !== 'write';
  };
  kind.onchange = syncForm;
  syncForm();
  const ownJobs = new Set<string>();
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const browser = createAgentBrowser({
    api,
    sleep,
    ownJobs,
    failure,
    onSelect: (selection) => {
      path.value = selection.path;
      if (kind.value === 'list' || kind.value === 'read') kind.value = selection.kind;
      syncForm();
    },
  });
  let autoOpened = false;

  const paint = async () => {
    let state: { enabled: boolean; expiresAt: number | null; connected: boolean; jobs: JobView[] };
    try {
      state = await api('/api/agent/status');
    } catch {
      body.replaceChildren(el('p', 'Состояние агента не прочиталось.', 'muted'));
      return;
    }
    const nodes: HTMLElement[] = [];
    if (!state.enabled) autoOpened = false;
    const status = state.enabled
      ? `Включён до ${new Date(state.expiresAt ?? 0).toLocaleTimeString()}. ${state.connected ? 'Агент на компьютере подключён.' : 'Агент на компьютере ещё не подключился.'}`
      : 'Выключен.';
    nodes.push(el('p', status));
    const toggle = el('button', state.enabled ? 'Выключить' : 'Включить на 1 час');
    toggle.type = 'button';
    toggle.onclick = () => {
      if (state.enabled) {
        void api('/api/agent/disable', { method: 'POST', body: '{}' }).then(() => { notice('Агент выключен, ключ отозван.'); return paint(); }).catch(failure);
        return;
      }
      void api('/api/agent/enable', { method: 'POST', body: '{}' }).then(async (r: { token: string }) => {
        await paint();
        const box = el('textarea');
        box.readOnly = true;
        box.rows = 5;
        box.value = agentCommand(location.origin, r.token);
        body.prepend(el('p', 'Вставь это в PowerShell на компьютере. Ключ показан один раз.'), box);
      }).catch(failure);
    };
    nodes.push(toggle);

    if (state.enabled) {
      const send = el('button', 'Поставить задачу');
      send.type = 'button';
      send.onclick = () => {
        const target = kind.value === 'run' ? command.value : path.value;
        void api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind: kind.value, path: target, ...(kind.value === 'write' ? { content: content.value } : {}) }) })
          .then(() => { notice('Задача поставлена.'); return paint(); }).catch(failure);
      };
      nodes.push(
        el('p', 'Корневая папка задаётся при запуске агента переменной AZRAIL_ROOT. Обзор показывает только её содержимое, выше неё подняться нельзя. Чтобы выбрать другую папку, перезапусти агента с другим AZRAIL_ROOT.', 'muted'),
        browser.element,
        kind, path, command, content, send,
      );
      if (state.connected && !autoOpened) { autoOpened = true; void browser.open(''); }
      for (const job of state.jobs.filter((item) => !ownJobs.has(item.id))) {
        const row = el('div', '', 'provider-token');
        row.append(el('strong', `${job.kind} ${job.path || '.'}`), el('small', STATUS[job.status] ?? job.status));
        if (job.error) row.append(el('p', job.error, 'muted'));
        if (job.result) {
          const out = el('textarea');
          out.readOnly = true;
          out.rows = 6;
          out.value = job.result;
          row.append(out);
        }
        if (job.status === 'awaiting_approval') {
          const ok = el('button', job.kind === 'run' ? `Разрешить запуск: ${job.path}` : `Разрешить запись (${job.bytes ?? 0} симв.)`);
          ok.type = 'button';
          ok.onclick = () => void api(`/api/agent/jobs/${job.id}/approve`, { method: 'POST', body: '{}' }).then(paint).catch(failure);
          const no = el('button', 'Отклонить');
          no.type = 'button';
          no.onclick = () => void api(`/api/agent/jobs/${job.id}/reject`, { method: 'POST', body: '{}' }).then(paint).catch(failure);
          row.append(ok, no);
        }
        nodes.push(row);
      }
      const refresh = el('button', 'Обновить');
      refresh.type = 'button';
      refresh.onclick = () => void paint();
      nodes.push(refresh);
    }
    body.replaceChildren(...nodes);
  };
  void paint();
  return root;
}
