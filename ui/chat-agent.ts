type Api = (path: string, init?: RequestInit) => Promise<any>;

export type AgentIntent = { kind: 'list' | 'read' | 'write' | 'run'; path: string; content?: string } | null;
export type AgentJobView = { id: string; kind: string; path: string; status: string; result: string | null; error: string | null; bytes?: number; command?: string };

const RUN: Array<[RegExp, string]> = [
  [/(?:запусти|прогони|выполни)\s+тест\p{L}*/iu, 'npm_test'],
  [/(?:собери\s+проект|запусти\s+сборку|сделай\s+build|npm\s+run\s+build)/iu, 'npm_build'],
  [/(?:запусти|прогони)\s+линт\p{L}*|npm\s+run\s+lint/iu, 'npm_lint'],
  [/проверь\s+типы|typecheck/iu, 'npm_typecheck'],
  [/git\s+status|статус\s+git/iu, 'git_status'],
  [/git\s+diff|изменени\p{L}*\s+в\s+git/iu, 'git_diff'],
  [/git\s+log|история\s+коммитов/iu, 'git_log'],
];

export const WHERE = /(?:на\s+(?:(?:моём|моем|этом)\s+)?компьютере|на\s+(?:моём|моем)\s+пк|в\s+(?:моей\s+)?(?:локальной\s+)?папке|локальн\p{L}*\s+(?:файл|папк)\p{L}*)/iu;
const PATH = /((?:[\w.-]+\/)*[\w.-]+\.[A-Za-z0-9]{1,8})(?![\w/])/u;
const LIST = /^\s*(?:покажи|выведи|дай|открой)?\s*(?:список\s+)?файл\p{L}*(?:\s+(?:в|из)\s+((?:[\w.-]+\/?)+))?/iu;
const QUOTES = '[\\s«»"\'“”„]*';
export const APPROVE = new RegExp(`^${QUOTES}(?:разреши(?:\\s+(?:запись|запуск))?|разрешаю|одобряю|подтверждаю|согласен|ок|окей|ok|okay|да|yes)${QUOTES}[.!]*${QUOTES}$`, 'iu');
export const REJECT = new RegExp(`^${QUOTES}(?:отклони(?:\\s+(?:запись|запуск))?|отклоняю|не\\s+записывай|отмена|нет|no)${QUOTES}[.!]*${QUOTES}$`, 'iu');

/** Только явная просьба про компьютер: «прочитай src/a.ts на компьютере». Остальное остаётся обычным чатом. */
export function agentIntent(message: string): AgentIntent {
  const text = message.trim();
  if (!text || text.length > 20000 || !WHERE.test(text)) return null;
  const head = text.split('\n')[0];
  const run = RUN.find(([pattern]) => pattern.test(head));
  if (run) return { kind: 'run', path: run[1] };
  if (/^\s*(?:запиши|сохрани|перезапиши)\s/iu.test(head)) {
    const path = head.match(PATH)?.[1];
    const colon = text.indexOf(':', text.indexOf(path ?? '\0'));
    const content = colon >= 0 ? text.slice(colon + 1).replace(/^\s*\n?/, '') : '';
    return path && content.trim() ? { kind: 'write', path, content } : null;
  }
  if (/^\s*(?:прочитай|прочти|открой|покажи)\s/iu.test(head) && !/список/iu.test(head)) {
    const path = head.match(PATH)?.[1];
    if (path) return { kind: 'read', path };
  }
  if (/файл\p{L}*/iu.test(head) && /(?:список|покажи|выведи|какие)/iu.test(head)) {
    const dir = head.match(/(?:в|из)\s+(?:папк\p{L}*\s+)?([\w.-]+(?:\/[\w.-]+)*)\/?(?=\s|$)/iu)?.[1];
    return { kind: 'list', path: dir && !/^(?:моей|моём|моем|локальной|папке|компьютере)$/iu.test(dir) ? dir : '' };
  }
  return null;
}

export const AGENT_OFF = 'Агент на компьютере выключен. Включи его в настройках: «Агент на компьютере» → «Включить на 1 час».';

export function approvalText(job: AgentJobView): string {
  if (job.kind === 'run') return `Жду подтверждения: запуск «${job.command ?? job.path}» в папке агента. Скрипты из package.json выполнятся на твоём компьютере, лимит 2 минуты. Напиши «разреши» или «отклони».`;
  return `Жду подтверждения: запись ${job.bytes ?? 0} симв. в ${job.path}. Напиши «разреши» или «отклони».`;
}

export function jobReply(job: AgentJobView, shown = 6000): string {
  if (job.status === 'awaiting_approval') return approvalText(job);
  if (job.kind === 'run' && (job.status === 'done' || job.status === 'failed')) {
    const body = job.result ?? job.error ?? '';
    const cut = body.length > shown ? `…${body.slice(-shown)}` : body;
    return `${job.status === 'done' ? 'Команда выполнена' : 'Команда завершилась с ошибкой'}: ${job.command ?? job.path}.\n\n\`\`\`\n${cut}\n\`\`\``;
  }
  if (job.status === 'done') {
    const body = job.result ?? '';
    const cut = body.length > shown ? `${body.slice(0, shown)}\n… показано ${shown} из ${body.length} симв.` : body;
    return job.kind === 'write' ? `Записал ${job.path}.` : `${job.kind === 'list' ? 'Файлы' : job.path}:\n\n\`\`\`\n${cut}\n\`\`\``;
  }
  if (job.status === 'rejected') return 'Запись отклонена, файл не тронут.';
  if (job.status === 'expired') return 'Задача истекла: агент не ответил за 15 минут.';
  if (job.status === 'failed') return `Агент вернул ошибку: ${job.error ?? 'без пояснения'}.`;
  return 'Агент пока не ответил: проверь, что он запущен в PowerShell на компьютере.';
}

export async function waitJob(api: Api, id: string, sleep: (ms: number) => Promise<void>, tries = 20): Promise<AgentJobView> {
  let job: AgentJobView = (await api(`/api/agent/jobs/${id}`)).job;
  for (let i = 0; i < tries && (job.status === 'queued' || job.status === 'running'); i++) {
    await sleep(1500);
    job = (await api(`/api/agent/jobs/${id}`)).job;
  }
  return job;
}
