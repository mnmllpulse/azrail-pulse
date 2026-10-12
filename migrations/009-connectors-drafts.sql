CREATE TABLE IF NOT EXISTS studio_drafts (
 account_id TEXT NOT NULL, studio_id TEXT NOT NULL, revision INTEGER NOT NULL,
 values_json TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,studio_id)
);
CREATE TABLE IF NOT EXISTS connector_connections (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, endpoint_key TEXT NOT NULL,
 label TEXT NOT NULL, secret_cipher TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 tools_json TEXT NOT NULL DEFAULT '[]', tools_digest TEXT NOT NULL DEFAULT '',
 verified_at INTEGER, disabled INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_owner ON connector_connections(account_id,disabled);
CREATE TABLE IF NOT EXISTS connector_calls (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, connection_id TEXT NOT NULL,
 connection_revision INTEGER NOT NULL, request_key TEXT NOT NULL,
 tool_name TEXT NOT NULL, arguments_cipher TEXT NOT NULL, arguments_digest TEXT NOT NULL,
 tools_digest TEXT NOT NULL, policy_digest TEXT NOT NULL,
 approval_needed INTEGER NOT NULL, approved_at INTEGER,
 status TEXT NOT NULL CHECK(status IN ('prepared','running','succeeded','failed','uncertain','cancelled')),
 result_cipher TEXT, error_code TEXT, expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(account_id,request_key)
);
CREATE INDEX IF NOT EXISTS connector_call_owner ON connector_calls(account_id,created_at);

CREATE TABLE IF NOT EXISTS connector_oauth_states (
 state_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, endpoint_key TEXT NOT NULL,
 origin TEXT NOT NULL, policy_digest TEXT NOT NULL, verifier_cipher TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS project_design_contracts (
 project_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, contract_json TEXT NOT NULL, updated_at INTEGER NOT NULL
);
