-- RC33: Professional Ableton Lab analysis history and source provenance.
CREATE TABLE IF NOT EXISTS ableton_analyses (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  source_artifact_id TEXT,
  file_name TEXT NOT NULL,
  ableton_version TEXT,
  bpm REAL,
  time_signature TEXT,
  track_count INTEGER NOT NULL CHECK(track_count >= 0),
  scene_count INTEGER NOT NULL CHECK(scene_count >= 0),
  issue_count INTEGER NOT NULL CHECK(issue_count >= 0),
  report_json TEXT NOT NULL,
  report_truncated INTEGER NOT NULL DEFAULT 0 CHECK(report_truncated IN (0,1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(source_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ableton_analyses_account ON ableton_analyses(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ableton_analyses_project ON ableton_analyses(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ableton_analyses_artifact ON ableton_analyses(source_artifact_id);
