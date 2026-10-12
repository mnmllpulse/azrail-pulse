-- 1.5 RC5: explicit reconciliation records for uncertain external/provider outcomes.
CREATE TABLE IF NOT EXISTS model_call_budget_scopes (
  call_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  reserved_micro_usd INTEGER NOT NULL CHECK(reserved_micro_usd>=0),
  actual_micro_usd INTEGER,
  reconciled_at INTEGER,
  PRIMARY KEY(call_id,scope),
  FOREIGN KEY(call_id) REFERENCES model_calls(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS model_call_budget_scope_idx ON model_call_budget_scopes(scope,call_id);

CREATE TABLE IF NOT EXISTS connector_reconciliations (
  call_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('succeeded','failed','not_executed')),
  evidence TEXT NOT NULL,
  decided_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_reconciliation_owner ON connector_reconciliations(account_id,decided_at);
