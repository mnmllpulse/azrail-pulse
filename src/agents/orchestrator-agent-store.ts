export type SqlTag = <T = Record<string, string | number | boolean | null>>(strings: TemplateStringsArray, ...values: Array<string | number | boolean | null>) => T[];

/**
 * Очередь локального агента, постоянный ключ компьютера и запрос привязки:
 * хранятся в SQLite Durable Object (экземпляр "local-agent"), без миграций D1.
 * Задачи недолговечны по замыслу.
 */
export function ensureAgentSchema(sql: SqlTag): void {
  sql`CREATE TABLE IF NOT EXISTS agent_state (id INTEGER PRIMARY KEY CHECK (id=1), token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER, root TEXT)`;
  try { sql`ALTER TABLE agent_state ADD COLUMN root TEXT`; } catch { /* колонка уже есть */ }
  try { sql`ALTER TABLE agent_state ADD COLUMN roots TEXT`; } catch { /* колонка уже есть */ }
  try { sql`ALTER TABLE agent_state ADD COLUMN trust TEXT`; } catch { /* колонка уже есть */ }
  sql`CREATE TABLE IF NOT EXISTS agent_jobs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, path TEXT NOT NULL, content TEXT, status TEXT NOT NULL, result TEXT, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`;
  try { sql`ALTER TABLE agent_jobs ADD COLUMN root TEXT`; } catch { /* колонка уже есть */ }
  sql`CREATE TABLE IF NOT EXISTS agent_device (id INTEGER PRIMARY KEY CHECK (id=1), token_hash TEXT NOT NULL, paired_at INTEGER NOT NULL, last_seen INTEGER, root TEXT, roots TEXT)`;
  sql`CREATE TABLE IF NOT EXISTS agent_pairing (id INTEGER PRIMARY KEY CHECK (id=1), code TEXT NOT NULL, secret_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, attempts INTEGER NOT NULL, device_token TEXT)`;
}

export function agentStoreOp(sql: SqlTag, op: string, arg?: unknown): unknown {
  type Row = { id: string; kind: string; path: string; content: string | null; status: string; result: string | null; error: string | null; created_at: number; updated_at: number; root?: string | null };
  const job = (r: Row) => ({ id: r.id, root: r.root ?? null, kind: r.kind, path: r.path, content: r.content, status: r.status, result: r.result, error: r.error, createdAt: r.created_at, updatedAt: r.updated_at });
  if (op === "getState") {
    const r = sql<{ token_hash: string; expires_at: number; last_seen: number | null; root: string | null; roots: string | null; trust: string | null }>`SELECT token_hash, expires_at, last_seen, root, roots, trust FROM agent_state WHERE id=1`[0];
    if (!r) return null;
    let roots: unknown[] = [];
    try { roots = r.roots ? JSON.parse(r.roots) : []; } catch { /* повреждённое значение игнорируется */ }
    let trust: unknown = null;
    try { trust = r.trust ? JSON.parse(r.trust) : null; } catch { /* повреждённое значение игнорируется */ }
    return { tokenHash: r.token_hash, expiresAt: r.expires_at, lastSeen: r.last_seen, root: r.root, roots, trust };
  }
  if (op === "setState") {
    const s = arg as { tokenHash: string; expiresAt: number; lastSeen: number | null; root?: string | null; roots?: unknown[]; trust?: unknown } | null;
    if (!s) {
      sql`DELETE FROM agent_state`;
      sql`DELETE FROM agent_jobs`;
    } else {
      sql`INSERT INTO agent_state (id, token_hash, expires_at, last_seen, root, roots, trust) VALUES (1, ${s.tokenHash}, ${s.expiresAt}, ${s.lastSeen}, ${s.root ?? null}, ${JSON.stringify(s.roots ?? [])}, ${s.trust ? JSON.stringify(s.trust) : null}) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash, expires_at=excluded.expires_at, last_seen=excluded.last_seen, root=excluded.root, roots=excluded.roots, trust=excluded.trust`;
    }
    return null;
  }
  if (op === "getDevice") {
    const r = sql<{ token_hash: string; paired_at: number; last_seen: number | null; root: string | null; roots: string | null }>`SELECT token_hash, paired_at, last_seen, root, roots FROM agent_device WHERE id=1`[0];
    if (!r) return null;
    let roots: unknown[] = [];
    try { roots = r.roots ? JSON.parse(r.roots) : []; } catch { /* повреждённое значение игнорируется */ }
    return { tokenHash: r.token_hash, pairedAt: r.paired_at, lastSeen: r.last_seen, root: r.root, roots };
  }
  if (op === "setDevice") {
    const d = arg as { tokenHash: string; pairedAt: number; lastSeen: number | null; root?: string | null; roots?: unknown[] } | null;
    if (!d) sql`DELETE FROM agent_device`;
    else sql`INSERT INTO agent_device (id, token_hash, paired_at, last_seen, root, roots) VALUES (1, ${d.tokenHash}, ${d.pairedAt}, ${d.lastSeen}, ${d.root ?? null}, ${JSON.stringify(d.roots ?? [])}) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash, paired_at=excluded.paired_at, last_seen=excluded.last_seen, root=excluded.root, roots=excluded.roots`;
    return null;
  }
  if (op === "getPairing") {
    const r = sql<{ code: string; secret_hash: string; expires_at: number; created_at: number; attempts: number; device_token: string | null }>`SELECT code, secret_hash, expires_at, created_at, attempts, device_token FROM agent_pairing WHERE id=1`[0];
    return r ? { code: r.code, secretHash: r.secret_hash, expiresAt: r.expires_at, createdAt: r.created_at, attempts: r.attempts, deviceToken: r.device_token } : null;
  }
  if (op === "setPairing") {
    const q = arg as { code: string; secretHash: string; expiresAt: number; createdAt: number; attempts: number; deviceToken: string | null } | null;
    if (!q) sql`DELETE FROM agent_pairing`;
    else sql`INSERT INTO agent_pairing (id, code, secret_hash, expires_at, created_at, attempts, device_token) VALUES (1, ${q.code}, ${q.secretHash}, ${q.expiresAt}, ${q.createdAt}, ${q.attempts}, ${q.deviceToken}) ON CONFLICT(id) DO UPDATE SET code=excluded.code, secret_hash=excluded.secret_hash, expires_at=excluded.expires_at, created_at=excluded.created_at, attempts=excluded.attempts, device_token=excluded.device_token`;
    return null;
  }
  if (op === "insertJob") {
    const j = arg as ReturnType<typeof job>;
    sql`INSERT INTO agent_jobs (id, kind, path, content, status, result, error, created_at, updated_at, root) VALUES (${j.id}, ${j.kind}, ${j.path}, ${j.content}, ${j.status}, ${j.result}, ${j.error}, ${j.createdAt}, ${j.updatedAt}, ${j.root ?? null})`;
    return null;
  }
  if (op === "getJob") {
    const r = sql<Row>`SELECT * FROM agent_jobs WHERE id=${String(arg)}`[0];
    return r ? job(r) : null;
  }
  if (op === "updateJob") {
    const { id, patch } = arg as { id: string; patch: { status?: string; result?: string | null; error?: string | null; updatedAt?: number } };
    const cur = sql<Row>`SELECT * FROM agent_jobs WHERE id=${id}`[0];
    if (!cur) return null;
    sql`UPDATE agent_jobs SET status=${patch.status ?? cur.status}, result=${patch.result === undefined ? cur.result : patch.result}, error=${patch.error === undefined ? cur.error : patch.error}, updated_at=${patch.updatedAt ?? cur.updated_at} WHERE id=${id}`;
    return null;
  }
  if (op === "claimQueued") {
    const since = Number(arg);
    sql`UPDATE agent_jobs SET status='expired' WHERE status IN ('queued','awaiting_approval') AND created_at < ${since}`;
    const r = sql<Row>`SELECT * FROM agent_jobs WHERE status='queued' ORDER BY created_at LIMIT 1`[0];
    if (!r) return null;
    sql`UPDATE agent_jobs SET status='running', updated_at=${Date.now()} WHERE id=${r.id}`;
    return job(r);
  }
  if (op === "recentJobs") return sql<Row>`SELECT * FROM agent_jobs ORDER BY created_at DESC LIMIT ${Number(arg) || 10}`.map(job);
  throw new Error(`Неизвестная операция очереди: ${op}`);
}
