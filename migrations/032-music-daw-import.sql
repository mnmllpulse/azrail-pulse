-- RC57: Music Intelligence F17-F20 — structured DAW imports and compatibility evidence.
CREATE TABLE IF NOT EXISTS music_daw_imports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  source_artifact_id TEXT,
  file_name TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('dawproject','ableton-set','ableton-project-zip','generic-project-zip')),
  application_name TEXT,
  application_version TEXT,
  bpm REAL,
  time_signature TEXT,
  track_count INTEGER NOT NULL CHECK(track_count >= 0),
  plugin_count INTEGER NOT NULL CHECK(plugin_count >= 0),
  media_count INTEGER NOT NULL CHECK(media_count >= 0),
  report_json TEXT NOT NULL,
  report_truncated INTEGER NOT NULL DEFAULT 0 CHECK(report_truncated IN (0,1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(source_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_music_daw_imports_account ON music_daw_imports(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_daw_imports_project ON music_daw_imports(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_daw_imports_artifact ON music_daw_imports(source_artifact_id);
