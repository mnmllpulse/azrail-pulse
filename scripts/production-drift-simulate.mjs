import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');

// Exact structural shape observed read-only in production on 2026-10-10.
// No production data values are copied into this fixture.
db.exec(`
CREATE TABLE users (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, email TEXT, name TEXT);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE TABLE projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, description TEXT, stack TEXT, r2_prefix TEXT, updated_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE TABLE project_versions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, version_number INTEGER NOT NULL, r2_object_key TEXT NOT NULL, summary TEXT, created_by_agent TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE INDEX idx_versions_project ON project_versions(project_id);
CREATE TABLE task_history (id TEXT PRIMARY KEY, project_id TEXT, agent TEXT NOT NULL, intent TEXT, input_type TEXT, status TEXT NOT NULL DEFAULT 'pending', input_summary TEXT, output_summary TEXT, error TEXT, started_at TEXT NOT NULL DEFAULT (datetime('now')), finished_at TEXT, FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE INDEX idx_history_project ON task_history(project_id);
CREATE TABLE project_memory (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, source_agent TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE UNIQUE INDEX idx_memory_project_key ON project_memory(project_id, category, key);
CREATE TABLE conversations (id TEXT PRIMARY KEY, project_id TEXT, title TEXT NOT NULL DEFAULT 'AZRAIL Chat', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, parent_message_id TEXT, model TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (conversation_id) REFERENCES conversations(id));
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE TABLE missions (id TEXT PRIMARY KEY, project_id TEXT, conversation_id TEXT, goal TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', current_step TEXT, progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), finished_at TEXT);
CREATE INDEX idx_missions_project ON missions(project_id, updated_at);
CREATE TABLE mission_events (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, type TEXT NOT NULL, data TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (mission_id) REFERENCES missions(id));
CREATE INDEX idx_mission_events ON mission_events(mission_id, created_at);
CREATE TABLE mission_steps (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_mission_steps_mission ON mission_steps(mission_id, position);
CREATE TABLE mission_checks (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, attempt INTEGER NOT NULL, passed INTEGER NOT NULL, reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_mission_checks_mission ON mission_checks(mission_id);
CREATE TABLE tool_calls (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, input TEXT, output TEXT, error TEXT, started_at TEXT, finished_at TEXT, FOREIGN KEY (mission_id) REFERENCES missions(id));
CREATE INDEX idx_tool_calls_mission ON tool_calls(mission_id, started_at);
CREATE TABLE approvals (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, action TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', decided_at TEXT, FOREIGN KEY (mission_id) REFERENCES missions(id));
CREATE TABLE sessions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, agent_type TEXT NOT NULL, context TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id));
`);

db.exec(`
INSERT INTO users(id,email,name) VALUES('u1','fixture@example.invalid','Fixture');
INSERT INTO projects(id,user_id,name,status,updated_at) VALUES('p1','u1','Production legacy fixture','active',datetime('now'));
INSERT INTO missions(id,project_id,goal,status) VALUES('m1','p1','fixture','completed');
INSERT INTO mission_events(id,mission_id,type,data) VALUES('e1','m1','verification.legacy','{}');
INSERT INTO task_history(id,project_id,agent,status) VALUES('t1','p1','fixture','completed');
`);

const files = readdirSync('migrations').filter((name) => /^\d{3}-.+\.sql$/.test(name)).sort((a,b) => Number(a.slice(0,3)) - Number(b.slice(0,3)));
if (!files[0]?.startsWith('002-')) throw new Error('expected migration chain to begin at 002');
for (const filename of files) db.exec(readFileSync(`migrations/${filename}`, 'utf8'));

// Migration 002 is intentionally one-shot ALTER TABLE. The migration ledger prevents
// a second execution. Every later additive migration must remain idempotent.
for (const filename of files) {
  if (filename.startsWith('002-')) continue;
  db.exec(readFileSync(`migrations/${filename}`, 'utf8'));
}

const table = (name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
const missionColumns = new Set(db.prepare("PRAGMA table_info('missions')").all().map((x) => x.name));
if (!missionColumns.has('result_json')) throw new Error('migration 002 did not add missions.result_json');
for (const name of ['schema_migrations','resource_owners','event_stream','trace_links','model_call_dimensions','release_evidence','connector_health_checks','event_integrity']) {
  if (!table(name)) throw new Error(`production reconciliation simulation missing ${name}`);
}
const preserved = [
  ['projects', "SELECT COUNT(*) AS n FROM projects WHERE id='p1'", 1],
  ['missions', "SELECT COUNT(*) AS n FROM missions WHERE id='m1'", 1],
  ['legacy-event', "SELECT COUNT(*) AS n FROM mission_events WHERE id='e1'", 1],
  ['event-backfill', "SELECT COUNT(*) AS n FROM event_stream WHERE id='e1'", 1],
  ['task-history', "SELECT COUNT(*) AS n FROM task_history WHERE id='t1'", 1],
];
for (const [label, sql, expected] of preserved) {
  const n = Number(db.prepare(sql).get()?.n ?? -1);
  if (n !== expected) throw new Error(`production reconciliation simulation failed: ${label}=${n}`);
}
console.log(`PRODUCTION DRIFT SIMULATION PASS: exact observed legacy schema + migrations 002-${files.at(-1).slice(0,3)} preserve fixture data; migrations 003-${files.at(-1).slice(0,3)} reapply idempotently.`);
