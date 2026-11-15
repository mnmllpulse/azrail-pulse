import { WHERE, type AgentJobView } from './chat-agent';

export const FIX_ROUNDS = 3;
export const FIX_FILES = 3;
const FIX_VERB = /(?:исправь|почини|поправь)\s/iu;
export const FIX_APPROVE = /^\s*(?:разреши\s+цикл|запускай\s+цикл)[.!]?\s*$/iu;
const SOURCE = /([\w./-]+\.(?:tsx?|mjs|cjs|jsx?|json|css|html|md))(?=[:(\s'"]|$)/g;

export type FixDeps = {
  run: (command: string) => Promise<AgentJobView>;
  read: (path: string) => Promise<string | null>;
  write: (path: string, content: string) => Promise<boolean>;
  ask: (prompt: string) => Promise<string>;
  say: (text: string) => void;
};

/** «Исправь ошибки сборки на компьютере» → npm_build; про тесты → npm_test. */
export function fixIntent(message: string): string | null {
  const head = message.trim().split('\n')[0];
  if (!WHERE.test(head) || !FIX_VERB.test(head)) return null;
  if (/тест/iu.test(head)) return 'npm_test';
  if (/сборк|build|ошибк/iu.test(head)) return 'npm_build';
  return null;
}

export function fixConsentText(command: string): string {
  return `Цикл исправления для «${command}»: до ${FIX_ROUNDS} раундов (запуск → разбор лога → правка → повторный запуск). Правки только в файлах, названных в логе, не больше ${FIX_FILES} за раунд; перед записью оригинал копируется в .azrail-backup/. Запись идёт без отдельных вопросов. Напиши «разреши цикл» или проигнорируй.`;
}

export function pathsFromLog(log: string, limit = FIX_FILES): string[] {
  const seen = new Set<string>();
  for (const match of log.matchAll(SOURCE)) {
    const path = match[1].replace(/^\.\//, '');
    if (path.startsWith('/') || path.includes('..') || /^[a-z]:/i.test(path) || /node_modules|\.git\//i.test(path)) continue;
    seen.add(path);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

export function parseEdits(reply: string, allowed: readonly string[], originals: ReadonlyMap<string, string>): Array<{ path: string; content: string }> | null {
  const raw = reply.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? reply;
  let data: unknown;
  try { data = JSON.parse(raw.trim()); } catch { return null; }
  if (!Array.isArray(data) || data.length === 0 || data.length > FIX_FILES) return null;
  const edits: Array<{ path: string; content: string }> = [];
  for (const item of data) {
    const row = item as { path?: unknown; content?: unknown };
    if (typeof row?.path !== 'string' || typeof row.content !== 'string') return null;
    if (!allowed.includes(row.path) || row.content.length > 200_000 || row.content === originals.get(row.path)) return null;
    edits.push({ path: row.path, content: row.content });
  }
  return edits;
}

function prompt(command: string, log: string, files: ReadonlyMap<string, string>): string {
  const body = [...files].map(([path, text]) => `--- ${path} ---\n${text.slice(0, 12000)}`).join('\n\n');
  return `Команда «${command}» упала. Ниже хвост лога и файлы из него. Исправь причину ошибки.\nОтвет: только JSON-массив [{"path":"...","content":"полное новое содержимое файла"}], не больше ${FIX_FILES} файлов, только из списка ниже, без пояснений. Если причина не в этих файлах — верни [].\n\nЛОГ:\n${log.slice(-6000)}\n\nФАЙЛЫ:\n${body}`;
}

export async function runFixLoop(deps: FixDeps, command: string): Promise<string> {
  const lines: string[] = [];
  const changed = new Set<string>();
  for (let round = 1; round <= FIX_ROUNDS; round++) {
    deps.say(`Раунд ${round}: запускаю ${command}…`);
    const job = await deps.run(command);
    const log = job.result ?? job.error ?? '';
    if (job.status === 'done') {
      lines.push(`Проверка пройдена: «${command}» завершилась с кодом 0${round > 1 ? ` после ${round - 1} раунд(а) правок` : ' без правок'}.`);
      if (changed.size) lines.push(`Изменены: ${[...changed].join(', ')}. Оригиналы в .azrail-backup/.`);
      return lines.join('\n');
    }
    lines.push(`Раунд ${round}: «${command}» упала.`);
    const files = new Map<string, string>();
    for (const path of pathsFromLog(log)) {
      const text = await deps.read(path);
      if (text !== null) files.set(path, text);
    }
    if (!files.size) { lines.push('В логе нет читаемых файлов проекта. Останавливаюсь.'); break; }
    if (round === FIX_ROUNDS) { lines.push(`Лимит ${FIX_ROUNDS} раундов исчерпан.`); lines.push(`Хвост лога:\n\`\`\`\n${log.slice(-1500)}\n\`\`\``); break; }
    const edits = parseEdits(await deps.ask(prompt(command, log, files)), [...files.keys()], files);
    if (!edits) { lines.push('Модель не предложила допустимой правки. Останавливаюсь.'); lines.push(`Хвост лога:\n\`\`\`\n${log.slice(-1500)}\n\`\`\``); break; }
    for (const edit of edits) {
      const saved = (await deps.write(`.azrail-backup/r${round}/${edit.path}`, files.get(edit.path) ?? '')) && (await deps.write(edit.path, edit.content));
      if (!saved) { lines.push(`Запись ${edit.path} не удалась. Останавливаюсь.`); return lines.join('\n'); }
      changed.add(edit.path);
    }
    lines.push(`Правки раунда ${round}: ${edits.map((edit) => edit.path).join(', ')}.`);
  }
  if (changed.size) lines.push(`Изменены: ${[...changed].join(', ')}. Оригиналы в .azrail-backup/.`);
  lines.push('Результат не подтверждён: успехом считается только код выхода 0.');
  return lines.join('\n');
}
