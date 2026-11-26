import { showApprovalCard, type CardAction, type CardHandle } from './approval-card';
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

const cards = new WeakMap<Document, { key: string; handle: CardHandle }>();

/**
 * Показывает запрос агента карточкой над полем ввода, как в Cursor: без настроек и без панели задачи.
 * Возвращает true, пока есть что ждать (запрос на подтверждение или выполнение на компьютере).
 */
export async function renderAgentApprovals(root: Document, status: string, api: Api, hooks: Hooks): Promise<boolean> {
  const drop = () => {
    cards.get(root)?.handle.close();
    cards.delete(root);
  };
  if (status !== 'waiting_approval') { drop(); return false; }
  let jobs: AgentJobView[];
  try {
    jobs = ((await api('/api/agent/status')).jobs ?? []) as AgentJobView[];
  } catch { drop(); return false; }
  const waiting = jobs.filter((job) => job.status === 'awaiting_approval');
  const running = jobs.filter((job) => job.status === 'queued' || job.status === 'running');
  if (!waiting.length && !running.length) { drop(); return false; }

  const decide = (job: AgentJobView, approve: boolean, grant?: { path: string; body: unknown }) => {
    const run = async () => {
      if (grant) await api(grant.path, { method: 'POST', body: JSON.stringify(grant.body) });
      await api(`/api/agent/jobs/${job.id}/${approve ? 'approve' : 'reject'}`, { method: 'POST' });
      drop();
      hooks.notice(approve ? 'Разрешено. Агент выполняет.' : 'Отклонено.');
      hooks.refresh();
    };
    return run().catch(hooks.failure);
  };

  const job = waiting[0];
  if (!job) {
    const first = running[0]!;
    const key = `run:${first.id}`;
    if (cards.get(root)?.key !== key) {
      drop();
      cards.set(root, { key, handle: showApprovalCard({ title: 'Агент работает', text: `Выполняется на компьютере: ${describeAgentJob(first)}`, actions: [] }, root) });
    }
    return true;
  }
  const key = `ask:${job.id}`;
  if (cards.get(root)?.key === key) return true;
  const scope = trustScopeFor(job);
  const actions: CardAction[] = [];
  if (job.kind === 'addroot') {
    actions.push({ label: 'Разрешить', primary: true, run: () => decide(job, true) });
  } else {
    actions.push({ label: 'Разрешить один раз', primary: true, run: () => decide(job, true) });
    if (scope === 'files') actions.push({ label: 'Всегда для файлов', run: () => decide(job, true, { path: '/api/agent/always', body: { scopes: ['files'] } }) });
    else if (scope) actions.push({ label: `Разрешать ${scope === 'shell' ? 'команды' : 'действия в браузере'} 30 мин`, run: () => decide(job, true, { path: '/api/agent/trust', body: { scopes: [scope], minutes: 30 } }) });
  }
  actions.push({ label: 'Отклонить', run: () => decide(job, false) });
  drop();
  cards.set(root, {
    key,
    handle: showApprovalCard({
      title: 'Нужно твоё разрешение',
      text: `${describeAgentJob(job)}?${job.kind === 'addroot' ? ' Папка запомнится, убрать её можно в настройках агента.' : ''}`,
      actions,
    }, root),
  });
  return true;
}
