-- RC36 / Stage 22: durable, explicit release evidence consumed by Pulse Lab.
-- This migration creates storage only. Evidence is written later by approved
-- staging/release automation; the runtime control center remains read-only.
CREATE TABLE IF NOT EXISTS release_evidence (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('config_drift','staging_smoke','security_verification','backup_restore')),
  environment TEXT NOT NULL CHECK(environment IN ('local','staging','production','unknown')),
  status TEXT NOT NULL CHECK(status IN ('healthy','warning','blocked','unknown')),
  summary TEXT NOT NULL,
  details_json TEXT,
  recorded_at INTEGER NOT NULL,
  CHECK(length(id) BETWEEN 1 AND 128),
  CHECK(length(summary) BETWEEN 1 AND 1000)
);
CREATE INDEX IF NOT EXISTS idx_release_evidence_kind_time ON release_evidence(kind, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_release_evidence_environment_time ON release_evidence(environment, recorded_at DESC);
