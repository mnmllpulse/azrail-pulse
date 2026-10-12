-- RC29: Professional Image Studio history and metadata.
CREATE TABLE IF NOT EXISTS image_generations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  artifact_id TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL CHECK(operation IN ('generate','variation','edit','upscale')),
  prompt TEXT NOT NULL,
  style TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  seed INTEGER,
  variation_index INTEGER NOT NULL DEFAULT 0,
  reference_artifact_id TEXT,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id),
  FOREIGN KEY(reference_artifact_id) REFERENCES studio_artifacts(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_image_generations_account ON image_generations(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_generations_project ON image_generations(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_generations_reference ON image_generations(reference_artifact_id,created_at DESC);
