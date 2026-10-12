-- Migration 016: tamper-evident migration ledger.
-- Safe to re-run: table and index creation are idempotent.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  applied_by TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('applied','failed'))
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_status
  ON schema_migrations(status, applied_at);
