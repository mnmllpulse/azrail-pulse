import { agentGap, waitJob, type AgentJobView, type AgentState } from './chat-agent';

type Api = (path: string, init?: RequestInit) => Promise<any>;

export const COMPUTER_COMMANDS: ReadonlyArray<readonly [string, string]> = [
  ['npm_test', 'npm test'],
  ['npm_build', 'npm run build'],
  ['npm_lint', 'npm run lint'],
  ['npm_typecheck', 'npm run typecheck'],
  ['git_status', 'git status'],
  ['git_diff', 'git diff --stat'],
  ['git_log', 'git log -n 20'],
  ['node_version', 'node --version'],
];

export function outputOf(job: AgentJobView): string {
  if (job.status === 'done') return job.result?.trim() || '(пустой вывод)';
  if (job.status === 'failed') return [job.result, job.error].filter(Boolean).join('\n') || 'Команда завершилась с ошибкой.';
  if (job.status === 'rejected') return 'Отклонено, команда не запускалась.';
  if (job.status === 'expired') return 'Истекло: агент не ответил за 15 минут.';
  return 'Агент не ответил. Проверь, что он запущен в PowerShell на компьютере.';
}

export function logLine(target: string, label: string, body: string, at = new Date()): string {
  const time = at.toTimeString().slice(0, 8);
  return `[${time}] ${target} › ${label}\n${body}\n`;
}

export async function computerRun(
  api: Api,
  command: string,
  confirm: (job: AgentJobView) => Promise<boolean>,
  sleep: (ms: number) => Promise<void>,
): Promise<string> {
  const gap = agentGap((await api('/api/agent/status')) as AgentState);
  if (gap) return gap;
  const made = (await api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind: 'run', path: command }) })).job as AgentJobView;
  if (made.status === 'awaiting_approval') {
    const ok = await confirm(made);
    await api(`/api/agent/jobs/${made.id}/${ok ? 'approve' : 'reject'}`, { method: 'POST', body: '{}' });
    if (!ok) return 'Отклонено, команда не запускалась.';
  }
  return outputOf(await waitJob(api, made.id, sleep, 90));
}

export async function sandboxRun(api: Api, projectId: string): Promise<string> {
  const r = (await api('/api/trial/sandbox', { method: 'POST', body: JSON.stringify({ projectId }) })) as { note?: string; output?: string };
  return String(r.output || r.note || 'Готово.');
}

export function mountTerminal(api: Api, projectId: () => string, failure: (error: unknown) => void): void {
  const target = document.querySelector<HTMLSelectElement>('#term-target');
  const command = document.querySelector<HTMLSelectElement>('#term-command');
  const run = document.querySelector<HTMLButtonElement>('#term-run');
  const clear = document.querySelector<HTMLButtonElement>('#term-clear');
  const log = document.querySelector<HTMLElement>('#term-log');
  const gate = document.querySelector<HTMLElement>('#term-gate');
  const yes = document.querySelector<HTMLButtonElement>('#term-yes');
  const no = document.querySelector<HTMLButtonElement>('#term-no');
  const ask = document.querySelector<HTMLElement>('#term-ask');
  if (!target || !command || !run || !clear || !log || !gate || !yes || !no || !ask) return;
  for (const [id, label] of COMPUTER_COMMANDS) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    command.append(option);
  }
  const sync = () => { command.disabled = target.value === 'sandbox'; };
  target.addEventListener('change', sync);
  sync();
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const confirm = (job: AgentJobView) => new Promise<boolean>((resolve) => {
    ask.textContent = `Запустить «${job.command ?? job.path}» на твоём компьютере? Лимит 2 минуты.`;
    gate.hidden = false;
    const done = (value: boolean) => { gate.hidden = true; yes.onclick = null; no.onclick = null; resolve(value); };
    yes.onclick = () => done(true);
    no.onclick = () => done(false);
  });
  const push = (text: string) => { log.textContent += text; log.scrollTop = log.scrollHeight; };
  run.addEventListener('click', () => {
    const onSandbox = target.value === 'sandbox';
    const label = onSandbox ? 'тесты' : command.selectedOptions[0]?.textContent ?? command.value;
    run.disabled = true;
    push(`[${new Date().toTimeString().slice(0, 8)}] запуск: ${onSandbox ? 'песочница' : 'компьютер'} › ${label}…\n`);
    const work = onSandbox ? sandboxRun(api, projectId()) : computerRun(api, command.value, confirm, sleep);
    work
      .then((body) => push(logLine(onSandbox ? 'песочница' : 'компьютер', label, body)))
      .catch((error) => { push(logLine('ошибка', label, error instanceof Error ? error.message : 'Не удалось выполнить.')); failure(error); })
      .finally(() => { run.disabled = false; gate.hidden = true; });
  });
  clear.addEventListener('click', () => { log.textContent = ''; });
}
