-- Additive migration; never restores or drops application data.
CREATE TABLE IF NOT EXISTS oidc_states (
 state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, nonce TEXT NOT NULL,
 origin TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS web_sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES access_accounts(id),
 origin TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS web_sessions_expiry ON web_sessions(expires_at);
CREATE TABLE IF NOT EXISTS resource_budgets (
 scope TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('micro_usd','neuron','request','second','byte')),
 limit_units INTEGER NOT NULL CHECK(limit_units>=0), committed_units INTEGER NOT NULL DEFAULT 0 CHECK(committed_units>=0),
 PRIMARY KEY(scope,unit)
);
CREATE TABLE IF NOT EXISTS resource_ledger (
 id TEXT PRIMARY KEY, scope TEXT NOT NULL, unit TEXT NOT NULL, resource TEXT NOT NULL,
 fingerprint TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reserved','settled','uncertain','released')),
 reserved_units INTEGER NOT NULL CHECK(reserved_units>=0), actual_units INTEGER,
 created_at INTEGER NOT NULL, finished_at INTEGER, evidence TEXT,
 FOREIGN KEY(scope,unit) REFERENCES resource_budgets(scope,unit)
);
CREATE INDEX IF NOT EXISTS resource_ledger_scope ON resource_ledger(scope,created_at);
CREATE TABLE IF NOT EXISTS studio_artifacts (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL,
 r2_key TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_artifacts_owner ON studio_artifacts(account_id,created_at);
CREATE TABLE IF NOT EXISTS integration_connections (
 account_id TEXT NOT NULL, service TEXT NOT NULL, secret_cipher TEXT NOT NULL,
 config_json TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL, PRIMARY KEY(account_id,service)
);
