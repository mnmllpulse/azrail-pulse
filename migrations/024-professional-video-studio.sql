-- RC31: Professional Video Studio timeline sessions and export provenance.
CREATE TABLE IF NOT EXISTS video_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  fps INTEGER NOT NULL,
  transition TEXT NOT NULL,
  motion_preset TEXT NOT NULL,
  export_preset TEXT NOT NULL,
  scenes_json TEXT NOT NULL,
  has_audio INTEGER NOT NULL DEFAULT 0 CHECK(has_audio IN (0,1)),
  image_count INTEGER NOT NULL DEFAULT 0 CHECK(image_count >= 0 AND image_count <= 8),
  video_artifact_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(video_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_video_sessions_account ON video_sessions(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_sessions_project ON video_sessions(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_sessions_artifact ON video_sessions(video_artifact_id);
