-- RC34: Professional Data Studio project-bound dataset analysis history.
CREATE TABLE IF NOT EXISTS data_analyses (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  dataset_artifact_id TEXT,
  file_name TEXT NOT NULL,
  delimiter TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK(row_count >= 0 AND row_count <= 50000),
  column_count INTEGER NOT NULL CHECK(column_count >= 1 AND column_count <= 256),
  issue_count INTEGER NOT NULL CHECK(issue_count >= 0),
  transformations_json TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(dataset_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_data_analyses_account ON data_analyses(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_analyses_project ON data_analyses(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_analyses_artifact ON data_analyses(dataset_artifact_id);
