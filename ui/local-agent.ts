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

  const paint = async () => {
    let state: { enabled: boolean; expiresAt: number | null; connected: boolean; jobs: JobView[] };
    try {
      state = await api('/api/agent/status');
    } catch {
      body.replaceChildren(el('p', 'Состояние агента не прочиталось.', 'muted'));
      return;
    }
    const nodes: HTMLElement[] = [];
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
      const kind = el('select');
      for (const [value, label] of [['list', 'Список файлов'], ['read', 'Прочитать файл'], ['write', 'Записать файл']]) {
        const option = el('option', label);
        option.value = value;
        kind.append(option);
      }
      const path = el('input');
      path.placeholder = 'путь внутри папки, например src/index.ts';
      path.maxLength = 300;
      const content = el('textarea');
      content.rows = 4;
      content.placeholder = 'Текст файла (только для записи)';
      const send = el('button', 'Поставить задачу');
      send.type = 'button';
      send.onclick = () => {
        void api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind: kind.value, path: path.value, ...(kind.value === 'write' ? { content: content.value } : {}) }) })
          .then(() => { notice('Задача поставлена.'); return paint(); }).catch(failure);
      };
      nodes.push(kind, path, content, send);
      for (const job of state.jobs) {
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
          const ok = el('button', `Разрешить запись (${job.bytes ?? 0} симв.)`);
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
