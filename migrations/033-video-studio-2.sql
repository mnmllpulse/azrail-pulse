-- RC59: Series F F41-F60 Video Studio 2.0 durable storyboard state.
CREATE TABLE IF NOT EXISTS video_storyboards (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  export_profile TEXT NOT NULL,
  shots_json TEXT NOT NULL,
  continuity_json TEXT NOT NULL,
  reference_count INTEGER NOT NULL DEFAULT 0 CHECK(reference_count >= 0 AND reference_count <= 4),
  tracks_json TEXT NOT NULL,
  captions_json TEXT NOT NULL,
  grading_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_video_storyboards_account ON video_storyboards(account_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_storyboards_project ON video_storyboards(project_id,updated_at DESC);
