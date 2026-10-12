-- RC28: Professional Web Studio workspace snapshots.
-- Additive and idempotent. Snapshots point at immutable workspace publications;
-- rollback always republishes into a NEW workspace revision.
CREATE TABLE IF NOT EXISTS workspace_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prefix TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  label TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_project
  ON workspace_snapshots(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_prefix
  ON workspace_snapshots(prefix);
