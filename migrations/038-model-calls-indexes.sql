-- Indexes for the hot ledger reads: uncertain/unpriced review list and per-scope usage rollups.
CREATE INDEX IF NOT EXISTS idx_model_calls_status_started ON model_calls(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_calls_scope_started ON model_calls(scope, started_at);
