-- RC62: Series G G01-G10 cross-cutting System Intelligence.
-- Additive-only migration: no ALTER/UPDATE/DELETE against deployed tables.
CREATE TABLE IF NOT EXISTS intelligence_memory_policy (
  memory_id TEXT PRIMARY KEY,
  why_stored TEXT NOT NULL DEFAULT 'unspecified',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(memory_id) REFERENCES intelligence_memory(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_intelligence_memory_policy_updated ON intelligence_memory_policy(updated_at DESC);

CREATE TABLE IF NOT EXISTS asset_intelligence_evidence (
  artifact_id TEXT PRIMARY KEY,
  analysis_json TEXT NOT NULL DEFAULT '{}',
  version_of TEXT,
  usage_history_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_asset_intelligence_evidence_updated ON asset_intelligence_evidence(updated_at DESC);

CREATE TABLE IF NOT EXISTS suggestion_feedback (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  surface TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('accepted','dismissed','completed','failed')),
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_account_time ON suggestion_feedback(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_project_time ON suggestion_feedback(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS system_e2e_runs (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  base_url TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('http','browser')),
  status TEXT NOT NULL CHECK(status IN ('running','passed','failed','blocked')),
  results_json TEXT NOT NULL DEFAULT '[]',
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_system_e2e_runs_started ON system_e2e_runs(started_at DESC);
