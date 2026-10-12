-- RC35 / Stage 21: Professional Ledger Studio dimensions.
-- Keep model_calls authoritative. This sidecar adds stable reporting dimensions
-- without rewriting older D1 tables or changing reconciliation semantics.
CREATE TABLE IF NOT EXISTS model_call_dimensions (
  call_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  route_attempt INTEGER NOT NULL DEFAULT 1 CHECK(route_attempt BETWEEN 1 AND 128),
  retry_attempt INTEGER NOT NULL DEFAULT 1 CHECK(retry_attempt BETWEEN 1 AND 16),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(call_id) REFERENCES model_calls(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_model_call_dimensions_provider ON model_call_dimensions(provider, created_at);
CREATE INDEX IF NOT EXISTS idx_model_call_dimensions_attempts ON model_call_dimensions(route_attempt, retry_attempt, created_at);

-- Historical calls predate the dimensions sidecar. Preserve them explicitly as
-- unknown instead of inventing a provider/attempt provenance that was never stored.
INSERT OR IGNORE INTO model_call_dimensions(call_id,provider,route_attempt,retry_attempt,created_at)
SELECT id,'unknown',1,1,started_at FROM model_calls;
