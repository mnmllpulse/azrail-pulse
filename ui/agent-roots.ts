export type AgentRootView = { name: string; path: string };

const KEY = 'pulse.agentActiveRoot';

export function readActiveRoot(): string {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
}

export function saveActiveRoot(name: string): void {
  try { if (name) localStorage.setItem(KEY, name); else localStorage.removeItem(KEY); } catch { /* хранилище недоступно */ }
}

/** Выбранная папка, если агент её ещё знает; иначе первая. */
export function pickActive(roots: AgentRootView[], stored: string): AgentRootView | null {
  return roots.find((entry) => entry.name === stored) ?? roots[0] ?? null;
}

/** Поле `root` для POST /api/agent/jobs: только если папок несколько и выбор сохранён. */
export function activeRootField(): { root?: string } {
  const name = readActiveRoot();
  return name ? { root: name } : {};
}
