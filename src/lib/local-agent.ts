import { AccessError } from "./accounts";

export type AgentJobKind = "list" | "read" | "write" | "run";
export type AgentJobStatus = "awaiting_approval" | "queued" | "running" | "done" | "failed" | "rejected" | "expired";

export interface AgentJob {
  id: string;
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
  await store.setState({ tokenHash: await sha256Hex(token), expiresAt, lastSeen: null, root: null });
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
    jobs: jobs.map(publicJob),
  };
}

export function publicJob(job: AgentJob) {
  return {
    id: job.id,
    kind: job.kind,
    path: job.path,
    status: job.status,
    ...(job.kind === "write" ? { bytes: job.content?.length ?? 0 } : {}),
    ...(job.kind === "run" ? { command: AGENT_COMMANDS[job.path] ?? job.path } : {}),
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function createJob(store: AgentStore, input: { kind?: unknown; path?: unknown; content?: unknown }, now = Date.now()): Promise<AgentJob> {
  const state = await store.getState();
  if (!state || state.expiresAt <= now) throw new AccessError("Агент выключен. Включи его, чтобы ставить задачи.", 409);
  const kind = input.kind;
  if (kind !== "list" && kind !== "read" && kind !== "write" && kind !== "run") throw new AccessError("Допустимые действия: list, read, write, run.", 400);
  let path: string;
  if (kind === "run") {
    if (typeof input.path !== "string" || !Object.hasOwn(AGENT_COMMANDS, input.path)) throw new AccessError(`Команда не из белого списка. Доступны: ${Object.keys(AGENT_COMMANDS).join(", ")}.`, 400);
    path = input.path;
  } else path = safeAgentPath(input.path, kind === "list");
  let content: string | null = null;
  if (kind === "write") {
    if (typeof input.content !== "string") throw new AccessError("Для записи нужен текст файла.", 400);
    if (input.content.length > AGENT_MAX_CONTENT) throw new AccessError("Файл для записи слишком большой.", 413);
    content = input.content;
  }
  const job: AgentJob = {
    id: crypto.randomUUID(),
    kind,
    path,
    content,
    status: kind === "write" || kind === "run" ? "awaiting_approval" : "queued",
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

export async function authenticateAgent(store: AgentStore, header: string | null, now = Date.now(), root?: string | null): Promise<boolean> {
  const token = header?.match(/^Bearer (azagent_[a-f0-9]{64})$/)?.[1];
  if (!token) return false;
  const state = await store.getState();
  if (!state || state.expiresAt <= now) return false;
  if ((await sha256Hex(token)) !== state.tokenHash) return false;
  await store.setState({ ...state, lastSeen: now, root: sanitizeAgentRoot(root) ?? state.root ?? null });
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
  await store.updateJob(id, { status: ok ? "done" : "failed", result: ok || job.kind === "run" ? output : null, error: ok ? null : error ?? "Ошибка агента.", updatedAt: now });
}
