import { agentGap, agentHint, agentIntent, computerTask, APPROVE as AGENT_APPROVE, REJECT as AGENT_REJECT, approvalText, jobReply, waitJob, type AgentJobView, type AgentState } from './chat-agent';
import { activeRootField } from './agent-roots';
import { agentCommand } from './agent-paths';
import type { CardHandle, CardSpec } from './approval-card';
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
  /** Карточка разрешения над полем ввода. */
  showCard: (spec: CardSpec) => CardHandle;
  /** Запускает миссию с инструментами (в том числе агента на компьютере). */
  startMission?: (goal: string) => Promise<void>;
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
    const made = (await api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind, path, ...(content === undefined ? {} : { content }), ...activeRootField() }) })).job as AgentJobView;
    if (made.status === 'awaiting_approval') await api(`/api/agent/jobs/${made.id}/approve`, { method: 'POST', body: '{}' });
    return waitJob(api, made.id, sleep, kind === 'run' ? 90 : 30);
  };
  const fileOps = {
    read: async (path: string) => { try { const job = await agentJob('read', path); return job.status === 'done' ? job.result ?? '' : null; } catch { return null; } },
    write: async (path: string, content: string) => { try { return (await agentJob('write', path, content)).status === 'done'; } catch { return false; } },
  };
  const agentReady = async (message: string): Promise<boolean> => {
    if (!ctx.signedIn()) throw Error('Войдите, чтобы работать с компьютером.');
    const state = (await api('/api/agent/status')) as AgentState;
    const gap = agentGap(state);
    if (!gap) return true;
    if (!state.enabled) {
      noteLocal(message, 'Нужен агент на компьютере. Подтверди включение в карточке ниже: настройки открывать не нужно.');
      offerAgent();
    } else noteLocal(message, gap);
    return false;
  };
  const decide = async (id: string, approve: boolean, label: string) => {
    agentWaiting = '';
    try {
      await api(`/api/agent/jobs/${id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: '{}' });
      noteLocal(label, jobReply(await waitJob(api, id, sleep, 90)));
    } catch (error) { failed(label, error, 'Агент не ответил.'); }
  };
  const askApproval = (job: AgentJobView) => {
    const card = ctx.showCard({
      title: 'Нужно твоё разрешение',
      text: approvalText(job).replace(/ Напиши «разреши» или «отклони»\.$/u, ''),
      actions: [
        { label: 'Разрешить', primary: true, run: async () => { card.close(); await decide(job.id, true, 'Разрешить'); } },
        { label: 'Отклонить', run: async () => { card.close(); await decide(job.id, false, 'Отклонить'); } },
      ],
    });
  };
  const offerAgent = () => {
    const card = ctx.showCard({
      title: 'Включить агента на компьютере?',
      text: 'Он получит доступ только к папке, которую ты укажешь, на 1 час. Запись файлов и запуск команд всё равно спросят отдельно.',
      actions: [
        { label: 'Включить на 1 час', primary: true, run: async () => {
          try {
            const before = (await api('/api/agent/status')) as AgentState;
            const { token } = (await api('/api/agent/enable', { method: 'POST', body: '{}' })) as { token: string };
            if (before.paired) {
              card.update({ title: 'Доступ открыт на 1 час', text: 'Жду компьютер. Если он не запущен, дважды кликни Start-Azrail-Agent.bat в папке azrail-pulse.', actions: [{ label: 'Закрыть', run: () => card.close() }] });
              for (let i = 0; i < 40; i++) {
                await sleep(3000);
                const state = (await api('/api/agent/status')) as AgentState;
                if (!state.enabled) return;
                if (state.connected) { card.update({ title: 'Агент подключён', text: 'Теперь повтори свой запрос.', actions: [{ label: 'Хорошо', primary: true, run: () => card.close() }] }); return; }
              }
              return;
            }
            let root = '';
            try { root = localStorage.getItem('pulse.agentRoot') ?? ''; } catch { /* хранилище недоступно */ }
            const command = agentCommand(location.origin, token, root);
            card.update({
              title: 'Ключ выдан на 1 час',
              text: 'Открой PowerShell в папке azrail-pulse, вставь команду целиком и оставь окно открытым. Как только агент подключится, я скажу.',
              code: command,
              actions: [
                { label: 'Скопировать команду', primary: true, run: async () => { try { await navigator.clipboard.writeText(`${command}\n`); ctx.notice('Команда скопирована.'); } catch { ctx.notice('Выдели текст и скопируй вручную (Ctrl+C).'); } } },
                { label: 'Закрыть', run: () => card.close() },
              ],
            });
            for (let i = 0; i < 60; i++) {
              await sleep(3000);
              const state = (await api('/api/agent/status')) as AgentState;
              if (!state.enabled) return;
              if (state.connected) { card.update({ title: 'Агент подключён', text: 'Теперь повтори свой запрос.', actions: [{ label: 'Хорошо', primary: true, run: () => card.close() }] }); return; }
            }
          } catch (error) { ctx.notice(error instanceof Error ? error.message : 'Не удалось включить агента.'); }
        } },
        { label: 'Не сейчас', run: () => card.close() },
      ],
    });
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
        const made = (await api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ ...forAgent, ...activeRootField() }) })).job as AgentJobView;
        if (made.status === 'awaiting_approval') { agentWaiting = made.id; noteLocal(message, approvalText(made)); askApproval(made); return true; }
        noteLocal(message, jobReply(await waitJob(api, made.id, sleep, forAgent.kind === 'web' ? 40 : 20)));
      } catch (error) { failed(message, error, 'Агент недоступен.'); }
      return true;
    }
    if (ctx.startMission && computerTask(message)) {
      try {
        const state = (await api('/api/agent/status')) as AgentState;
        if (!state.paired) { noteLocal(message, 'Компьютер ещё не привязан. Один раз: Настройки → Локальный агент → «Подтвердить компьютер» (код покажет Start-Azrail-Agent.bat).'); return true; }
        await ctx.startMission(message);
      } catch (error) { failed(message, error, 'Не удалось запустить задачу на компьютере.'); }
      return true;
    }
    const hint = agentHint(message);
    if (hint) { noteLocal(message, hint); return true; }
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
