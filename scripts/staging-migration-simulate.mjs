import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { execIdempotent } from './lib/additive-sql.mjs';

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');

// Representative legacy staging baseline. The live read-only inspection proved
// these core tables/columns exist, including missions.result_json, while the
// schema_migrations ledger is still absent.
db.exec(`
CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT,stack TEXT,status TEXT NOT NULL DEFAULT 'active',r2_prefix TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now')),FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE missions(id TEXT PRIMARY KEY,project_id TEXT,conversation_id TEXT,goal TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',current_step TEXT,progress INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now')),finished_at TEXT,result_json TEXT);
CREATE TABLE mission_events(id TEXT PRIMARY KEY,mission_id TEXT NOT NULL,type TEXT NOT NULL,data TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')),FOREIGN KEY(mission_id) REFERENCES missions(id));
CREATE TABLE conversations(id TEXT PRIMARY KEY, project_id TEXT, title TEXT NOT NULL DEFAULT 'AZRAIL Chat', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
`);

for (const filename of readdirSync('migrations').filter((name) => /^00[3-9]-.+\.sql$/.test(name)).sort()) {
  db.exec(readFileSync(`migrations/${filename}`, 'utf8'));
}

db.exec(`
INSERT INTO users(id,email,name) VALUES('u1','stage@example.invalid','Stage');
INSERT INTO projects(id,user_id,name) VALUES('p1','u1','Legacy staging fixture');
INSERT INTO missions(id,project_id,goal,status,result_json) VALUES('m1','p1','fixture','completed','{}');
INSERT INTO mission_events(id,mission_id,type,data) VALUES('e1','m1','verification.legacy','{}');
INSERT INTO mission_checkpoints(mission_id,step,tool,input_json,result_json,status,updated_at) VALUES('m1',1,'fixture','{}','{}','completed',1000);
INSERT INTO operation_locks(project_id,owner,started_at) VALUES('p1','legacy-worker',1000);
INSERT INTO mission_outbox(mission_id,params,delivered,created_at) VALUES('m1','{}',1,1000);
INSERT INTO workspace_heads(project_id,prefix) VALUES('p1','projects/p1/workspace-versions/v1/');
INSERT INTO model_calls(id,scope,model,status,started_at,finished_at,prompt_tokens,completion_tokens,reserved_micro_usd,actual_micro_usd) VALUES('mc1','project:p1','fixture/model','succeeded',1000,1100,10,5,10,9);
INSERT INTO studio_artifacts(id,account_id,name,mime,r2_key,bytes,created_at) VALUES('a1','acct1','fixture.txt','text/plain','fixture/a1',1,1000);
INSERT INTO connector_connections(id,account_id,endpoint_key,label,secret_cipher,created_at,updated_at) VALUES('c1','acct1','https://example.invalid','Fixture','encrypted',1000,1000);
`);

const files = readdirSync('migrations').filter((name) => /^\d{3}-.+\.sql$/.test(name)).sort((a, b) => Number(a.slice(0,3)) - Number(b.slice(0,3)));
for (const filename of files) {
  if (filename.startsWith('002-')) continue; // live staging already has result_json; migration 002 is baselined.
  db.exec(readFileSync(`migrations/${filename}`, 'utf8'));
}

// Reapply the additive set to prove idempotency of the migration SQL itself.
for (const filename of files) {
  if (filename.startsWith('002-')) continue;
  execIdempotent(db, readFileSync(`migrations/${filename}`, 'utf8'));
}

const table = (name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
for (const name of [
  'schema_migrations','approval_requests','event_stream','trace_links','project_profiles','workspace_snapshots',
  'image_generations','music_sessions','video_sessions','ableton_analyses','data_analyses','model_call_dimensions',
  'release_evidence','connector_health_checks','event_integrity','mission_tool_receipts','project_lock_leases','mission_delivery_state','workspace_publications'
]) if (!table(name)) throw new Error(`simulation missing table: ${name}`);

const checks = [
  ['mission_tool_receipts', "SELECT COUNT(*) AS n FROM mission_tool_receipts WHERE mission_id='m1' AND step=1", 1],
  ['project_lock_leases', "SELECT COUNT(*) AS n FROM project_lock_leases WHERE project_id='p1'", 1],
  ['mission_delivery_state', "SELECT COUNT(*) AS n FROM mission_delivery_state WHERE mission_id='m1'", 1],
  ['workspace_publications', "SELECT COUNT(*) AS n FROM workspace_publications WHERE project_id='p1'", 1],
  ['event_stream', "SELECT COUNT(*) AS n FROM event_stream WHERE id='e1'", 1],
  ['model_call_dimensions', "SELECT COUNT(*) AS n FROM model_call_dimensions WHERE call_id='mc1' AND provider='unknown'", 1]
];
for (const [label, sql, expected] of checks) {
  const row = db.prepare(sql).get();
  if (Number(row?.n ?? -1) !== expected) throw new Error(`simulation invariant failed: ${label}`);
}

console.log(`STAGING MIGRATION SIMULATION PASS: legacy result_json baseline + migrations 003-${files.at(-1).slice(0,3)} applied twice without destructive conflict.`);
