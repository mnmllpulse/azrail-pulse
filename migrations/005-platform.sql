CREATE TABLE IF NOT EXISTS access_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')),
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS resource_owners (
  kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  PRIMARY KEY(kind,resource_id)
);
CREATE INDEX IF NOT EXISTS idx_resource_account ON resource_owners(account_id,kind);
CREATE TABLE IF NOT EXISTS project_permissions (
  project_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  PRIMARY KEY(project_id,capability)
);
CREATE TABLE IF NOT EXISTS operation_locks (
  project_id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  started_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mission_outbox (
  mission_id TEXT PRIMARY KEY,
  params TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mission_checkpoints (
  mission_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  tool TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT,
  status TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(mission_id,step)
);
CREATE TABLE IF NOT EXISTS model_prices (
  model TEXT PRIMARY KEY,
  input_micro_usd_per_million INTEGER NOT NULL,
  output_micro_usd_per_million INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS spend_limits (
  scope TEXT PRIMARY KEY,
  limit_micro_usd INTEGER NOT NULL,
  spent_micro_usd INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS model_calls (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  reserved_micro_usd INTEGER NOT NULL DEFAULT 0,
  actual_micro_usd INTEGER,
  error TEXT
);
CREATE TABLE IF NOT EXISTS backup_manifests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  file_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_snapshots (
  mission_id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_heads (
  project_id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL
);
