type Api = (path: string, options?: RequestInit) => Promise<any>;
export interface AgentJobView { id: string; kind: string; path: string; status: string; dest?: string; query?: string; command?: string; action?: string; args?: string; bytes?: number }
interface Hooks { notice: (text: string, bad?: boolean) => void; failure: (error: unknown) => void; refresh: () => void }

const FILE_KINDS = new Set(['write', 'edit', 'mkdir', 'move', 'trash']);
const BROWSER_WRITE = new Set(['click', 'type', 'press', 'upload']);
const FOLDER: Record<string, string> = { desktop: 'Рабочий стол', documents: 'Документы', downloads: 'Загрузки' };

export function trustScopeFor(job: AgentJobView): string | null {
  if (FILE_KINDS.has(job.kind)) return 'files';
  if (job.kind === 'shell' || job.kind === 'run') return 'shell';
  if (job.kind === 'browser' && BROWSER_WRITE.has(job.path)) return 'browser';
  return null;
}

export function describeAgentJob(job: AgentJobView): string {
  switch (job.kind) {
    case 'addroot': return `Открыть доступ к папке «${FOLDER[job.path] ?? job.path}»`;
    case 'write': return `Записать файл ${job.path} (${job.bytes ?? 0} симв.)`;
    case 'edit': return `Исправить файл ${job.path}`;
    case 'mkdir': return `Создать папку ${job.path || '.'}`;
    case 'move': return `Переместить ${job.path} → ${job.dest ?? ''}`;
    case 'trash': return `Убрать в корзину ${job.path}`;
    case 'shell': return `Выполнить команду: ${job.path.slice(0, 200)}`;
    case 'run': return `Запустить: ${job.command ?? job.path}`;
    case 'browser': return `В браузере: ${job.path} ${job.args && job.args !== '{}' ? job.args : ''}`.trim().slice(0, 200);
    default: return `${job.kind} ${job.path}`;
  }
}

/**
 * Показывает запросы агента прямо в карточке задачи: без похода в настройки.
 * Возвращает true, пока есть что ждать (запрос на подтверждение или выполнение на компьютере).
 */
export async function renderAgentApprovals(root: Document, status: string, api: Api, hooks: Hooks): Promise<boolean> {
  const panel = root.getElementById('mission-summary');
  let box = root.getElementById('mission-agent');
  if (status !== 'waiting_approval' || !panel) { box?.remove(); return false; }
  let jobs: AgentJobView[];
  try {
    jobs = ((await api('/api/agent/status')).jobs ?? []) as AgentJobView[];
  } catch { box?.remove(); return false; }
  const waiting = jobs.filter((job) => job.status === 'awaiting_approval');
  const running = jobs.filter((job) => job.status === 'queued' || job.status === 'running');
  if (!waiting.length && !running.length) { box?.remove(); return false; }
  if (!box) { box = root.createElement('div'); box.id = 'mission-agent'; panel.after(box); }
  box.replaceChildren();
  const decide = (job: AgentJobView, approve: boolean, grant?: { path: string; body: unknown }) => {
    const run = async () => {
      if (grant) await api(grant.path, { method: 'POST', body: JSON.stringify(grant.body) });
      await api(`/api/agent/jobs/${job.id}/${approve ? 'approve' : 'reject'}`, { method: 'POST' });
      hooks.notice(approve ? 'Разрешено. Агент выполняет.' : 'Отклонено.');
      hooks.refresh();
    };
    void run().catch(hooks.failure);
  };
  const button = (text: string, onclick: () => void, primary = false) => {
    const el = root.createElement('button');
    el.type = 'button';
    el.textContent = text;
    if (primary) el.className = 'primary';
    el.onclick = onclick;
    return el;
  };
  for (const job of waiting) {
    const card = root.createElement('div');
    card.className = 'agent-approval';
    const question = root.createElement('p');
    question.textContent = `${describeAgentJob(job)}?`;
    card.append(question);
    const scope = trustScopeFor(job);
    if (job.kind === 'addroot') {
      card.append(button('Разрешить', () => decide(job, true), true), button('Отклонить', () => decide(job, false)));
      const note = root.createElement('p');
      note.className = 'muted';
      note.textContent = 'Папка запомнится. Убрать её можно в настройках агента.';
      card.append(note);
    } else {
      card.append(button('Разрешить один раз', () => decide(job, true), true));
      if (scope === 'files') card.append(button('Всегда для файлов', () => decide(job, true, { path: '/api/agent/always', body: { scopes: ['files'] } })));
      else if (scope) card.append(button(`Разрешать ${scope === 'shell' ? 'команды' : 'действия в браузере'} 30 мин`, () => decide(job, true, { path: '/api/agent/trust', body: { scopes: [scope], minutes: 30 } })));
      card.append(button('Отклонить', () => decide(job, false)));
    }
    box.append(card);
  }
  for (const job of running) {
    const p = root.createElement('p');
    p.className = 'muted';
    p.textContent = `Выполняется на компьютере: ${describeAgentJob(job)}`;
    box.append(p);
  }
  return true;
}
