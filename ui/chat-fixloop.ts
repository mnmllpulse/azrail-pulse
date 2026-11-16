import { WHERE, type AgentJobView } from './chat-agent';
import { redactSecrets, scanSecrets } from '../src/lib/secret-scan';
import { fenceUntrusted, injectionSignals, UNTRUSTED_RULE } from '../src/lib/untrusted';

export const FIX_ROUNDS = 3;
export const FIX_FILES = 3;
const FIX_VERB = /(?:исправь|почини|поправь)\s/iu;
export const FIX_APPROVE = /^[\s«»"'“”]*(?:разреши(?:\s+цикл)?|запускай(?:\s+цикл)?|ок|окей|ok|да|подтверждаю|согласен)[\s«»"'“”.!]*$/iu;
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
  return `Цикл исправления для «${command}»: до ${FIX_ROUNDS} раундов (запуск → разбор лога → правка → повторный запуск). Правки только в файлах, названных в логе, не больше ${FIX_FILES} за раунд; перед записью оригинал копируется в .azrail-backup/. Запись идёт без отдельных вопросов. Напиши «разреши» или проигнорируй.`;
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

/** Файл с секретом или с подменой инструкций модели не отдаётся: правка вернула бы его с дырой или с чужой командой. */
export function screenFiles(files: ReadonlyMap<string, string>): { safe: Map<string, string>; skipped: string[] } {
  const safe = new Map<string, string>();
  const skipped: string[] = [];
  for (const [path, text] of files) {
    const bad = scanSecrets([{ path, content: text }]).length > 0 || injectionSignals(text).length > 0;
    if (bad) skipped.push(path);
    else safe.set(path, text);
  }
  return { safe, skipped };
}

function prompt(command: string, log: string, files: ReadonlyMap<string, string>): string {
  const body = [...files].map(([path, text]) => fenceUntrusted(path, text.slice(0, 12000))).join('\n\n');
  return `Команда «${command}» упала. Ниже хвост лога и файлы из него. Исправь причину ошибки.\n${UNTRUSTED_RULE}\nОтвет: только JSON-массив [{"path":"...","content":"полное новое содержимое файла"}], не больше ${FIX_FILES} файлов, только из списка ниже, без пояснений. Если причина не в этих файлах — верни [].\n\n${fenceUntrusted('лог команды', redactSecrets(log.slice(-6000)))}\n\nФАЙЛЫ:\n${body}`;
}

export async function runFixLoop(deps: FixDeps, command: string, restore: Map<string, string> = new Map()): Promise<string> {
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
    const read = new Map<string, string>();
    for (const path of pathsFromLog(log)) {
      const text = await deps.read(path);
      if (text !== null) read.set(path, text);
    }
    if (!read.size) { lines.push('В логе нет читаемых файлов проекта. Останавливаюсь.'); break; }
    const { safe: files, skipped } = screenFiles(read);
    if (skipped.length) lines.push(`Не отданы модели (секрет или подозрительный текст): ${skipped.join(', ')}.`);
    if (!files.size) { lines.push('Все файлы из лога закрыты проверкой. Останавливаюсь, исправь вручную.'); lines.push(`Хвост лога:\n\`\`\`\n${redactSecrets(log.slice(-1500))}\n\`\`\``); break; }
    if (round === FIX_ROUNDS) { lines.push(`Лимит ${FIX_ROUNDS} раундов исчерпан.`); lines.push(`Хвост лога:\n\`\`\`\n${redactSecrets(log.slice(-1500))}\n\`\`\``); break; }
    const edits = parseEdits(await deps.ask(prompt(command, log, files)), [...files.keys()], files);
    if (!edits) { lines.push('Модель не предложила допустимой правки. Останавливаюсь.'); lines.push(`Хвост лога:\n\`\`\`\n${redactSecrets(log.slice(-1500))}\n\`\`\``); break; }
    for (const edit of edits) {
      const backup = `.azrail-backup/r${round}/${edit.path}`;
      if (!(await deps.write(backup, files.get(edit.path) ?? ''))) { lines.push(`Копия ${edit.path} не записалась, файл не тронут. Останавливаюсь.`); return lines.join('\n'); }
      if (!restore.has(edit.path)) restore.set(edit.path, backup);
      if (!(await deps.write(edit.path, edit.content))) { lines.push(`Запись ${edit.path} не удалась. Останавливаюсь.`); return lines.join('\n'); }
      changed.add(edit.path);
    }
    lines.push(`Правки раунда ${round}: ${edits.map((edit) => edit.path).join(', ')}.`);
  }
  if (changed.size) lines.push(`Изменены: ${[...changed].join(', ')}. Оригиналы в .azrail-backup/.`);
  lines.push('Результат не подтверждён: успехом считается только код выхода 0.');
  return lines.join('\n');
}

export const ROLLBACK_ASK = /(?:откати|верни|отмени)\s+(?:мои\s+|последние\s+)?(?:правки|изменени\w*|исправлени\w*)/iu;

export function rollbackIntent(message: string): boolean {
  const head = message.trim().split('\n')[0];
  return WHERE.test(head) && ROLLBACK_ASK.test(head);
}

export function rollbackConsentText(restore: ReadonlyMap<string, string>): string {
  return `Верну ${restore.size} файл(ов) к состоянию до цикла исправления: ${[...restore.keys()].join(', ')}. Файлы будут перезаписаны копиями из .azrail-backup/. Напиши «разреши» или проигнорируй.`;
}

export async function runRollback(deps: Pick<FixDeps, 'read' | 'write'>, restore: ReadonlyMap<string, string>): Promise<{ text: string; failed: string[] }> {
  const restored: string[] = [];
  const failed: string[] = [];
  for (const [path, backup] of restore) {
    const original = await deps.read(backup);
    if (original === null || !(await deps.write(path, original))) failed.push(path);
    else restored.push(path);
  }
  const lines = [];
  if (restored.length) lines.push(`Возвращено: ${restored.join(', ')}.`);
  if (failed.length) lines.push(`Не удалось вернуть: ${failed.join(', ')}. Копии лежат в .azrail-backup/, верни их вручную.`);
  return { text: lines.join('\n') || 'Откатывать нечего.', failed };
}
