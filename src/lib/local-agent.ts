import { AccessError } from "./accounts";
import { checkPublicUrl, PublicUrlError } from "./public-url";
import { BROWSER_WRITE_ACTIONS, isBrowserAction, normalizeBrowserArgs } from "./browser-actions";
import { shellProblem } from "./shell-guard";

export type AgentJobKind = "list" | "read" | "write" | "run" | "web" | "addroot" | "droproot" | "search" | "edit" | "mkdir" | "move" | "trash" | "shell" | "browser";

/** Задачи, которые меняют компьютер: ждут «Разрешить». */
export const AGENT_APPROVAL_KINDS: ReadonlySet<string> = new Set(["write", "run", "addroot", "edit", "mkdir", "move", "trash", "shell"]);
/** Инструменты миссии, которые ждут «Разрешить» владельца. */
/** Любой инструмент агента может запросить «Разрешить» (например, доступ к новой папке). */
export const isLocalToolName = (tool: string): boolean => tool.startsWith("local_");
export const LOCAL_APPROVAL_TOOLS: ReadonlySet<string> = new Set(["local_write", "local_run", "local_addroot", "local_edit", "local_mkdir", "local_move", "local_trash", "local_shell", "local_browser_act"]);
const AGENT_KINDS: ReadonlySet<string> = new Set(["list", "read", "write", "run", "web", "addroot", "droproot", "search", "edit", "mkdir", "move", "trash", "shell", "browser"]);

export const AGENT_ROOT_PRESETS = ["desktop", "documents", "downloads"] as const;
export type AgentJobStatus = "awaiting_approval" | "queued" | "running" | "done" | "failed" | "rejected" | "expired";

export interface AgentRoot {
  name: string;
  path: string;
}

export const AGENT_MAX_ROOTS = 8;

export interface AgentJob {
  id: string;
  /** Имя папки агента, в которой выполнить задачу; пусто — первая папка. */
  root?: string | null;
  kind: AgentJobKind;
  path: string;
  content: string | null;
  status: AgentJobStatus;
  result: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AgentState {
  tokenHash: string;
  expiresAt: number;
  lastSeen: number | null;
  /** Папка агента, как её сообщил сам агент (только для показа в интерфейсе). */
  root?: string | null;
  /** Все папки, которые агент открыл при запуске (имя + путь). */
  roots?: AgentRoot[];
  /** Режим доверия: пока он идёт, выбранные виды действий выполняются без «Разрешить». */
  trust?: AgentTrust | null;
  /** «Всегда разрешать»: области без срока (только файлы). Живёт, пока агента не выключили. */
  always?: TrustScope[];
}

export const TRUST_SCOPES = ["files", "browser", "shell"] as const;
export type TrustScope = (typeof TRUST_SCOPES)[number];
export interface AgentTrust {
  until: number;
  scopes: TrustScope[];
}
export const TRUST_MAX_MINUTES = 60;
/** Навсегда можно разрешить только файлы: есть корзина и копии. Терминал и браузер — только на время. */
export const ALWAYS_SCOPES: readonly TrustScope[] = ["files"];

export async function setAlways(store: AgentStore, scopes: unknown, now = Date.now()): Promise<TrustScope[]> {
  const state = await store.getState();
  if (!state || state.expiresAt <= now) throw new AccessError("Агент выключен. Сначала включи его.", 409);
  if (!Array.isArray(scopes) || !scopes.every((scope): scope is TrustScope => (ALWAYS_SCOPES as readonly unknown[]).includes(scope))) throw new AccessError(`Навсегда можно разрешить только: ${ALWAYS_SCOPES.join(", ")}.`, 400);
  const always = [...new Set(scopes)];
  await store.setState({ ...state, always });
  return always;
}

const TRUST_FILE_KINDS: ReadonlySet<string> = new Set(["write", "mkdir"]);

/** Какая область режима доверия покрывает задачу. addroot и droproot не покрываются никогда: они меняют, что агенту видно. */
export function trustScopeOf(kind: string, path: string): TrustScope | null {
  if (TRUST_FILE_KINDS.has(kind)) return "files";
  if (kind === "shell" || kind === "run") return "shell";
  if (kind === "browser" && BROWSER_WRITE_ACTIONS.has(path)) return "browser";
  return null;
}

export function activeTrust(state: AgentState | null, now = Date.now()): AgentTrust | null {
  const trust = state?.trust;
  if (!state || !trust || state.expiresAt <= now || trust.until <= now) return null;
  return trust;
}

export async function setTrust(store: AgentStore, input: { scopes?: unknown; minutes?: unknown }, now = Date.now()): Promise<AgentTrust | null> {
  const state = await store.getState();
  if (!state || state.expiresAt <= now) throw new AccessError("Агент выключен. Сначала включи его.", 409);
  if (Array.isArray(input.scopes) && input.scopes.length === 0) {
    await store.setState({ ...state, trust: null });
    return null;
  }
  const scopes = Array.isArray(input.scopes) ? [...new Set(input.scopes)] : [];
  if (!scopes.length || !scopes.every((scope): scope is TrustScope => (TRUST_SCOPES as readonly unknown[]).includes(scope))) throw new AccessError(`Выбери области: ${TRUST_SCOPES.join(", ")}.`, 400);
  const minutes = Number(input.minutes);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > TRUST_MAX_MINUTES) throw new AccessError(`Время доверия: от 1 до ${TRUST_MAX_MINUTES} минут.`, 400);
  const trust: AgentTrust = { until: Math.min(now + Math.round(minutes) * 60_000, state.expiresAt), scopes };
  await store.setState({ ...state, trust });
  return trust;
}

export interface AgentStore {
  getState(): Promise<AgentState | null>;
  setState(state: AgentState | null): Promise<void>;
  insertJob(job: AgentJob): Promise<void>;
  getJob(id: string): Promise<AgentJob | null>;
  updateJob(id: string, patch: Partial<Pick<AgentJob, "status" | "result" | "error" | "updatedAt">>): Promise<void>;
  claimQueued(now: number): Promise<AgentJob | null>;
  recentJobs(limit: number): Promise<AgentJob[]>;
}

/** Белый список команд. Аргументы зафиксированы в агенте; сюда попадает только идентификатор. */
export const AGENT_COMMANDS: Record<string, string> = {
  git_status: "git status --short",
  git_diff: "git diff --stat",
  git_log: "git log --oneline -n 20",
  node_version: "node --version",
  npm_test: "npm test",
  npm_build: "npm run build",
  npm_lint: "npm run lint",
  npm_typecheck: "npm run typecheck",
};

export const AGENT_SESSION_MS = 60 * 60 * 1000;
export const AGENT_JOB_TTL_MS = 15 * 60 * 1000;
export const AGENT_MAX_CONTENT = 200_000;
export const AGENT_MAX_RESULT = 262_144;

const DENIED = /(^|\/)(\.git|\.ssh|\.gnupg|\.aws|node_modules|\.wrangler)(\/|$)|(^|\/)(\.env[^/]*|\.dev\.vars|id_rsa[^/]*|id_ed25519[^/]*|[^/]*\.(pem|key|pfx|p12|kdbx))$/i;

/** Только относительный путь внутри выбранной папки. Секреты и служебные каталоги закрыты. */
export function safeAgentPath(raw: unknown, allowEmpty = false): string {
  if (typeof raw !== "string") throw new AccessError("Путь должен быть строкой.", 400);
  const value = raw.trim().replaceAll("\\", "/");
  if (!value || value === ".") {
    if (allowEmpty) return "";
    throw new AccessError("Укажи путь к файлу.", 400);
  }
  if (value.length > 300 || /[\0-\x1f]/.test(value)) throw new AccessError("Недопустимый путь.", 400);
  if (value.startsWith("/") || value.startsWith("~") || /^[a-z]:/i.test(value)) throw new AccessError("Путь должен быть относительным.", 400);
  const parts = value.split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part === ".")) throw new AccessError("Выход из папки запрещён.", 400);
  const clean = parts.join("/");
  if (DENIED.test(clean)) throw new AccessError("Этот путь закрыт для агента.", 403);
  return clean;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newAgentToken(): string {
  return `azagent_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function enableAgent(store: AgentStore, now = Date.now()): Promise<{ token: string; expiresAt: number }> {
  const token = newAgentToken();
  const expiresAt = now + AGENT_SESSION_MS;
  const always = (await store.getState())?.always ?? [];
  await store.setState({ tokenHash: await sha256Hex(token), expiresAt, lastSeen: null, root: null, roots: [], always });
  return { token, expiresAt };
}

export async function disableAgent(store: AgentStore): Promise<void> {
  await store.setState(null);
}

export async function agentStatus(store: AgentStore, now = Date.now()) {
  const state = await store.getState();
  const enabled = !!state && state.expiresAt > now;
  const jobs = await store.recentJobs(10);
  return {
    enabled,
    expiresAt: enabled ? state!.expiresAt : null,
    connected: enabled && !!state!.lastSeen && now - state!.lastSeen < 15_000,
    lastSeen: state?.lastSeen ?? null,
    root: enabled ? state!.root ?? null : null,
    roots: enabled ? agentRoots(state!) : [],
    trust: activeTrust(state, now),
    always: enabled ? state!.always ?? [] : [],
    jobs: jobs.map(publicJob),
  };
}

export function publicJob(job: AgentJob) {
  return {
    id: job.id,
    kind: job.kind,
    path: job.path,
    ...(job.root ? { root: job.root } : {}),
    status: job.status,
    ...(job.kind === "write" ? { bytes: job.content?.length ?? 0 } : {}),
    ...(job.kind === "move" ? { dest: job.content } : {}),
    ...(job.kind === "search" ? { query: job.content } : {}),
    ...(job.kind === "run" ? { command: AGENT_COMMANDS[job.path] ?? job.path } : {}),
    ...(job.kind === "shell" ? { command: job.path } : {}),
    ...(job.kind === "browser" ? { action: job.path, args: job.content } : {}),
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function createJob(store: AgentStore, input: { kind?: unknown; path?: unknown; content?: unknown; root?: unknown }, now = Date.now()): Promise<AgentJob> {
  const state = await store.getState();
  if (!state || state.expiresAt <= now) throw new AccessError("Агент выключен. Включи его, чтобы ставить задачи.", 409);
  if (typeof input.kind !== "string" || !AGENT_KINDS.has(input.kind)) throw new AccessError(`Допустимые действия: ${[...AGENT_KINDS].join(", ")}.`, 400);
  const kind = input.kind as AgentJobKind;
  let path: string;
  if (kind === "web") {
    if (typeof input.path !== "string" || input.path.length > 2000) throw new AccessError("Укажи адрес страницы.", 400);
    try {
      path = checkPublicUrl(input.path.trim()).href;
    } catch (error) {
      throw new AccessError(error instanceof PublicUrlError ? error.message : "Адрес страницы не распознан.", 400);
    }
  } else if (kind === "addroot") {
    const value = typeof input.path === "string" ? input.path.trim() : "";
    const preset = (AGENT_ROOT_PRESETS as readonly string[]).includes(value);
    if (!preset && (value.length < 3 || value.length > 300 || /[\0-\x1f]/.test(value) || !/^([a-z]:[\\/]|\/|~[\\/])/i.test(value))) throw new AccessError("Укажи рабочий стол, документы, загрузки или полный путь к папке, например C:\\Projects.", 400);
    path = value;
  } else if (kind === "droproot") {
    const known = agentRoots(state);
    const name = typeof input.path === "string" ? input.path.trim() : "";
    if (!known.some((entry) => entry.name === name)) throw new AccessError("Такой папки у агента нет.", 400);
    if (known.length < 2) throw new AccessError("Последнюю папку убрать нельзя.", 400);
    path = name;
  } else if (kind === "browser") {
    if (!isBrowserAction(input.path)) throw new AccessError("Неизвестное действие браузера.", 400);
    path = input.path;
  } else if (kind === "shell") {
    const problem = shellProblem(input.path);
    if (problem) throw new AccessError(problem, 400);
    path = (input.path as string).trim();
  } else if (kind === "run") {
    if (typeof input.path !== "string" || !Object.hasOwn(AGENT_COMMANDS, input.path)) throw new AccessError(`Команда не из белого списка. Доступны: ${Object.keys(AGENT_COMMANDS).join(", ")}.`, 400);
    path = input.path;
  } else path = safeAgentPath(input.path, kind === "list" || kind === "search");
  let root: string | null = null;
  if (kind !== "addroot" && kind !== "droproot" && input.root !== undefined && input.root !== null && input.root !== "") {
    if (typeof input.root !== "string") throw new AccessError("Имя папки должно быть строкой.", 400);
    const known = agentRoots(state);
    if (!known.length) throw new AccessError("Агент ещё не сообщил свои папки. Запусти его и повтори.", 409);
    if (!known.some((entry) => entry.name === input.root)) throw new AccessError(`У агента нет папки «${input.root.slice(0, 40)}». Выбери папку в «Настройки → Локальный агент».`, 400);
    root = input.root;
  }
  let content: string | null = null;
  if (kind === "write") {
    if (typeof input.content !== "string") throw new AccessError("Для записи нужен текст файла.", 400);
    if (input.content.length > AGENT_MAX_CONTENT) throw new AccessError("Файл для записи слишком большой.", 413);
    content = input.content;
  }
  if (kind === "browser") {
    let args: unknown = {};
    try { args = typeof input.content === "string" && input.content ? JSON.parse(input.content) : {}; } catch { throw new AccessError("Аргументы действия должны быть JSON.", 400); }
    content = normalizeBrowserArgs(path, args);
  }
  if (kind === "search") {
    const query = typeof input.content === "string" ? input.content.trim() : "";
    if (query.length < 1 || query.length > 200) throw new AccessError("Укажи, что искать (до 200 символов).", 400);
    content = query;
  }
  if (kind === "edit") {
    const raw = typeof input.content === "string" ? input.content : "";
    let edit: { old?: unknown; new?: unknown } = {};
    try { edit = JSON.parse(raw); } catch { /* ниже ошибка */ }
    if (typeof edit.old !== "string" || !edit.old || typeof edit.new !== "string") throw new AccessError("Для правки нужны old (что заменить) и new (на что).", 400);
    if (edit.old.length + edit.new.length > AGENT_MAX_CONTENT) throw new AccessError("Правка слишком большая.", 413);
    content = JSON.stringify({ old: edit.old, new: edit.new });
  }
  if (kind === "move") {
    content = safeAgentPath(input.content);
    if (content === path) throw new AccessError("Откуда и куда совпадают.", 400);
  }
  if (kind === "mkdir" || kind === "trash" || kind === "move") safeAgentPath(path);
  const needsApproval = AGENT_APPROVAL_KINDS.has(kind) || (kind === "browser" && BROWSER_WRITE_ACTIONS.has(path));
  const scope = trustScopeOf(kind, path);
  const trusted = needsApproval && !!scope && (!!activeTrust(state, now)?.scopes.includes(scope) || !!state?.always?.includes(scope));
  const job: AgentJob = {
    id: crypto.randomUUID(),
    kind,
    root,
    path,
    content,
    status: needsApproval && !trusted ? "awaiting_approval" : "queued",
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  await store.insertJob(job);
  return job;
}

export async function decideJob(store: AgentStore, id: string, approve: boolean, now = Date.now()): Promise<AgentJob> {
  const job = await store.getJob(id);
  if (!job) throw new AccessError("Задача не найдена.", 404);
  if (job.status !== "awaiting_approval") throw new AccessError("Задача не ждёт подтверждения.", 409);
  if (now - job.createdAt > AGENT_JOB_TTL_MS) {
    await store.updateJob(id, { status: "expired", updatedAt: now });
    throw new AccessError("Срок задачи истёк.", 410);
  }
  await store.updateJob(id, { status: approve ? "queued" : "rejected", updatedAt: now });
  return { ...job, status: approve ? "queued" : "rejected", updatedAt: now };
}

/** Токен агента: сравнение по хэшу, срок сессии и отметка присутствия. */
/** Заголовок X-Agent-Root приходит в percent-encoding; управляющие символы и длина отсекаются. */
export function sanitizeAgentRoot(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value: string;
  try { value = decodeURIComponent(raw); } catch { return null; }
  value = value.trim();
  if (!value || value.length > 300 || /[\0-\x1f]/.test(value)) return null;
  return value;
}

/** X-Agent-Roots: percent-encoded JSON [{name,path}]. Лишнее отбрасывается, дубликаты имён тоже. */
export function sanitizeAgentRoots(raw: string | null | undefined): AgentRoot[] | null {
  if (!raw || raw.length > 8000) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(decodeURIComponent(raw)); } catch { return null; }
  if (!Array.isArray(parsed)) return null;
  const seen = new Set<string>();
  const roots: AgentRoot[] = [];
  for (const item of parsed.slice(0, AGENT_MAX_ROOTS)) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const path = typeof item?.path === "string" ? item.path.trim() : "";
    if (!name || name.length > 40 || /[\0-\x1f]/.test(name) || !path || path.length > 300 || /[\0-\x1f]/.test(path) || seen.has(name)) continue;
    seen.add(name);
    roots.push({ name, path });
  }
  return roots.length ? roots : null;
}

/** Папки агента; для старого агента с одной папкой имя берётся из конца пути. */
export function agentRoots(state: AgentState): AgentRoot[] {
  if (state.roots?.length) return state.roots;
  if (!state.root) return [];
  const name = state.root.split(/[\\/]/).filter(Boolean).pop() ?? "папка";
  return [{ name: name.slice(0, 40), path: state.root }];
}

export async function authenticateAgent(store: AgentStore, header: string | null, now = Date.now(), root?: string | null, roots?: string | null): Promise<boolean> {
  const token = header?.match(/^Bearer (azagent_[a-f0-9]{64})$/)?.[1];
  if (!token) return false;
  const state = await store.getState();
  if (!state || state.expiresAt <= now) return false;
  if ((await sha256Hex(token)) !== state.tokenHash) return false;
  const parsedRoots = sanitizeAgentRoots(roots);
  await store.setState({ ...state, lastSeen: now, root: parsedRoots?.[0]?.path ?? sanitizeAgentRoot(root) ?? state.root ?? null, roots: parsedRoots ?? state.roots });
  return true;
}

export async function pollJob(store: AgentStore, now = Date.now()): Promise<AgentJob | null> {
  const job = await store.claimQueued(now - AGENT_JOB_TTL_MS);
  return job ? { ...job, status: "running" } : null;
}

export async function finishJob(store: AgentStore, id: string, input: { ok?: unknown; output?: unknown; error?: unknown }, now = Date.now()): Promise<void> {
  const job = await store.getJob(id);
  if (!job) throw new AccessError("Задача не найдена.", 404);
  if (job.status !== "running") throw new AccessError("Задача не выполняется.", 409);
  const ok = input.ok === true;
  const output = typeof input.output === "string" ? input.output.slice(0, AGENT_MAX_RESULT) : null;
  const error = typeof input.error === "string" ? input.error.slice(0, 1000) : null;
  await store.updateJob(id, { status: ok ? "done" : "failed", result: ok || job.kind === "run" ? output : null, error: ok ? null : error ?? (job.kind === "run" ? "Команда завершилась с ненулевым кодом, вывод выше." : "Ошибка агента."), updatedAt: now });
}
