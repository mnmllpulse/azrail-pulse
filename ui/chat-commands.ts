import { agentGap, agentIntent, APPROVE as AGENT_APPROVE, REJECT as AGENT_REJECT, approvalText, jobReply, waitJob, type AgentJobView, type AgentState } from './chat-agent';
import { fixIntent, fixConsentText, runFixLoop, FIX_APPROVE, rollbackIntent, rollbackConsentText, runRollback } from './chat-fixloop';
import { modelIntent, proposalText, YES, ROLLBACK, type ModelProposal } from './chat-settings';

type Api = (path: string, init?: RequestInit) => Promise<any>;

export type ChatCommandContext = {
  api: Api;
  noteLocal: (message: string, reply: string) => void;
  notice: (text: string, persist?: boolean) => void;
  signedIn: () => boolean;
  project: () => string;
  voice: () => string;
  preferredModel: () => string;
  setPreferredModel: (slug: string) => void;
  /** Модели для переключения из чата. */
  models: () => Array<{ slug: string; label: string; free: boolean }>;
  /** Подпись текущей модели; пустой slug — автоматический выбор. */
  labelOf: (slug: string) => string;
};

const FIX_RESTORE_KEY = 'azrail.fixRestore.v1';
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function loadRestore(): Map<string, string> {
  try { return new Map(JSON.parse(localStorage.getItem(FIX_RESTORE_KEY) || '[]') as Array<[string, string]>); } catch { return new Map(); }
}
function saveRestore(restore: Map<string, string>): void {
  try { restore.size ? localStorage.setItem(FIX_RESTORE_KEY, JSON.stringify([...restore])) : localStorage.removeItem(FIX_RESTORE_KEY); } catch { /* хранилище недоступно */ }
}

/** Команды чата: локальный агент, цикл исправления, откат правок, смена модели. Возвращает true, если сообщение обработано. */
export function createChatCommands(ctx: ChatCommandContext): (message: string) => Promise<boolean> {
  const { api, noteLocal } = ctx;
  let agentWaiting = '';
  let fixPending = '';
  let rollbackPending = false;
  let modelProposal: ModelProposal | null = null;
  let modelUndo: ModelProposal | null = null;

  const agentJob = async (kind: string, path: string, content?: string) => {
    const made = (await api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind, path, ...(content === undefined ? {} : { content }) }) })).job as AgentJobView;
    if (made.status === 'awaiting_approval') await api(`/api/agent/jobs/${made.id}/approve`, { method: 'POST', body: '{}' });
    return waitJob(api, made.id, sleep, kind === 'run' ? 90 : 30);
  };
  const fileOps = {
    read: async (path: string) => { try { const job = await agentJob('read', path); return job.status === 'done' ? job.result ?? '' : null; } catch { return null; } },
    write: async (path: string, content: string) => { try { return (await agentJob('write', path, content)).status === 'done'; } catch { return false; } },
  };
  const agentReady = async (message: string): Promise<boolean> => {
    if (!ctx.signedIn()) throw Error('Войдите, чтобы работать с компьютером.');
    const gap = agentGap((await api('/api/agent/status')) as AgentState);
    if (gap) { noteLocal(message, gap); return false; }
    return true;
  };
  const failed = (message: string, error: unknown, fallback: string) => noteLocal(message, error instanceof Error ? error.message : fallback);

  return async (message: string): Promise<boolean> => {
    const answering = AGENT_APPROVE.test(message) || AGENT_REJECT.test(message);
    if (!agentWaiting && !fixPending && !rollbackPending && ctx.signedIn() && answering) {
      try { const status = (await api('/api/agent/status')) as { jobs?: AgentJobView[] }; agentWaiting = status.jobs?.find((job) => job.status === 'awaiting_approval')?.id ?? ''; } catch { /* нет связи — обычный чат */ }
    }
    if (agentWaiting && answering) {
      const id = agentWaiting;
      agentWaiting = '';
      try {
        await api(`/api/agent/jobs/${id}/${AGENT_APPROVE.test(message) ? 'approve' : 'reject'}`, { method: 'POST', body: '{}' });
        noteLocal(message, jobReply(await waitJob(api, id, sleep, 90)));
      } catch (error) { failed(message, error, 'Агент не ответил.'); }
      return true;
    }
    if (rollbackPending && FIX_APPROVE.test(message)) {
      rollbackPending = false;
      try {
        const restore = loadRestore();
        const { text, failed: left } = await runRollback(fileOps, restore);
        saveRestore(new Map([...restore].filter(([path]) => left.includes(path))));
        noteLocal(message, text);
      } catch (error) { failed(message, error, 'Откат прерван.'); }
      return true;
    }
    if (fixPending && FIX_APPROVE.test(message)) {
      const command = fixPending;
      fixPending = '';
      try {
        const restore = loadRestore();
        const out = await runFixLoop({
          run: (c) => agentJob('run', c),
          ...fileOps,
          ask: async (question) => {
            const preferred = ctx.preferredModel();
            const reply = await api('/api/chat', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ message: question, projectId: ctx.project() || crypto.randomUUID(), conversationId: crypto.randomUUID(), voice: ctx.voice(), ...(preferred ? { preferredModel: preferred } : {}) }) });
            return String(reply.result?.summary || '');
          },
          say: (text) => ctx.notice(text, false),
        }, command, restore);
        saveRestore(restore);
        noteLocal(message, out);
      } catch (error) { failed(message, error, 'Цикл прерван.'); }
      return true;
    }
    if (rollbackIntent(message)) {
      try {
        if (!(await agentReady(message))) return true;
        const restore = loadRestore();
        if (!restore.size) { noteLocal(message, 'Откатывать нечего: цикл исправления на этом браузере правок не делал.'); return true; }
        rollbackPending = true;
        noteLocal(message, rollbackConsentText(restore));
      } catch (error) { failed(message, error, 'Агент недоступен.'); }
      return true;
    }
    const fixCommand = fixIntent(message);
    if (fixCommand) {
      try {
        if (!(await agentReady(message))) return true;
        fixPending = fixCommand;
        noteLocal(message, fixConsentText(fixCommand));
      } catch (error) { failed(message, error, 'Агент недоступен.'); }
      return true;
    }
    const forAgent = agentIntent(message);
    if (forAgent) {
      try {
        if (!(await agentReady(message))) return true;
        const made = (await api('/api/agent/jobs', { method: 'POST', body: JSON.stringify(forAgent) })).job as AgentJobView;
        if (made.status === 'awaiting_approval') { agentWaiting = made.id; noteLocal(message, approvalText(made)); return true; }
        noteLocal(message, jobReply(await waitJob(api, made.id, sleep)));
      } catch (error) { failed(message, error, 'Агент недоступен.'); }
      return true;
    }
    const switchTo = modelIntent(message, ctx.models());
    if (switchTo) {
      const from = ctx.preferredModel();
      modelProposal = { to: switchTo.slug, toLabel: switchTo.label, from, fromLabel: ctx.labelOf(from) };
      noteLocal(message, proposalText(modelProposal));
      return true;
    }
    if (modelProposal && YES.test(message)) {
      const done = modelProposal;
      modelProposal = null;
      modelUndo = done;
      ctx.setPreferredModel(done.to);
      noteLocal(message, `Применено: «${done.toLabel}». Вернуть «${done.fromLabel}» — напиши «откати».`);
      return true;
    }
    if (modelUndo && ROLLBACK.test(message)) {
      const back = modelUndo;
      modelUndo = null;
      ctx.setPreferredModel(back.from);
      noteLocal(message, `Вернул «${back.fromLabel}».`);
      return true;
    }
    return false;
  };
}
