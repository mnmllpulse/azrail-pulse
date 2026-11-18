/** Строка PowerShell в одинарных кавычках: единственный спецсимвол — сама кавычка. */
export const psQuote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

export function agentCommand(origin: string, token: string, root = ''): string {
  const folder = root.trim();
  return [
    `$env:AZRAIL_URL=${psQuote(origin)}`,
    `$env:AZRAIL_AGENT_TOKEN=${psQuote(token)}`,
    folder.includes(';') ? `$env:AZRAIL_ROOTS=${psQuote(folder)}` : folder ? `$env:AZRAIL_ROOT=${psQuote(folder)}` : '$env:AZRAIL_ROOT=(Get-Location).Path',
    'node scripts\\local-agent\\azrail-agent.mjs',
  ].join('\n');
}

const isAbsolute = (value: string) => /^[a-z]:[\\/]/i.test(value) || /^[\\/]/.test(value) || value.startsWith('~');
const unify = (value: string) => value.replaceAll('\\', '/').replace(/\/+$/, '');

export type RelativePath = { path: string } | { error: string };

/** Путь из поля формы → путь относительно папки агента. Абсолютный путь внутри корня пересчитывается. */
export function toRelativePath(input: string, root: string | null | undefined): RelativePath {
  const value = input.trim();
  if (!value) return { path: '' };
  if (!isAbsolute(value)) return { path: unify(value).replace(/^\.\//, '') };
  if (!root) return { error: 'Папка агента пока неизвестна. Подключи агента или укажи путь относительно его папки, например src/index.ts.' };
  const base = unify(root);
  const full = unify(value);
  const windows = /^[a-z]:/i.test(base);
  const a = windows ? full.toLowerCase() : full;
  const b = windows ? base.toLowerCase() : base;
  if (a === b) return { path: '' };
  if (a.startsWith(`${b}/`)) return { path: full.slice(base.length + 1) };
  return { error: `Этот путь вне папки агента (${root}). Агент не выходит за её пределы.` };
}
