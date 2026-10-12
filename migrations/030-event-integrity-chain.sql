-- RC48: cryptographic tamper-evident sidecar for the unified event stream.
-- Existing historical event_stream rows remain readable. New events are
-- chained per deterministic scope using SHA-256 in application code.
CREATE TABLE IF NOT EXISTS event_integrity (
  event_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'sha256' CHECK(algorithm='sha256'),
  prev_hash TEXT NOT NULL CHECK(length(prev_hash)=64),
  event_hash TEXT NOT NULL UNIQUE CHECK(length(event_hash)=64),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(event_id) REFERENCES event_stream(id) ON DELETE CASCADE,
  CHECK(length(scope) BETWEEN 3 AND 768)
);

-- A given predecessor may have only one successor in one scope. Concurrent
-- writers that race on the same head therefore cannot create an undetected
-- fork; application code retries against the new durable head.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_integrity_scope_prev
  ON event_integrity(scope,prev_hash);
CREATE INDEX IF NOT EXISTS idx_event_integrity_scope_created
  ON event_integrity(scope,created_at);
