-- RC26: Professional Projects metadata and artifact-to-project ownership.
-- Sidecar tables avoid destructive ALTER TABLE rewrites on existing D1 data.
CREATE TABLE IF NOT EXISTS project_profiles (
  project_id TEXT PRIMARY KEY,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
  studio_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  archived_at INTEGER,
  deleted_at INTEGER,
  duplicated_from TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_project_profiles_pinned ON project_profiles(pinned, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_profiles_studio ON project_profiles(studio_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_artifact_projects (
  artifact_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  studio_id TEXT,
  linked_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_studio_artifact_projects_project ON studio_artifact_projects(project_id, linked_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_artifact_projects_studio ON studio_artifact_projects(studio_id, linked_at DESC);
