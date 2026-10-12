-- RC55: Series E22-E40 + Series F/G product-intelligence persistence.
CREATE TABLE IF NOT EXISTS image_jobs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('queued','running','completed','failed','cancelled')),
  config_json TEXT NOT NULL,
  outputs_json TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_image_jobs_account ON image_jobs(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_jobs_project ON image_jobs(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_memory (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  studio_id TEXT,
  scope TEXT NOT NULL CHECK(scope IN ('user','workspace','project','music','image','video','agent','session')),
  memory_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0 CHECK(confidence >= 0 AND confidence <= 1),
  ttl_expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_memory_scope_key ON intelligence_memory(account_id,project_id,studio_id,scope,memory_key);
CREATE INDEX IF NOT EXISTS idx_intelligence_memory_expiry ON intelligence_memory(account_id,ttl_expires_at);

CREATE TABLE IF NOT EXISTS asset_intelligence (
  artifact_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  embedding_ref TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_asset_intelligence_account_kind ON asset_intelligence(account_id,kind,updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_reviews (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  studio_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  findings_json TEXT NOT NULL,
  critical_count INTEGER NOT NULL DEFAULT 0,
  major_count INTEGER NOT NULL DEFAULT 0,
  minor_count INTEGER NOT NULL DEFAULT 0,
  improvement_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_studio_reviews_project ON studio_reviews(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS music_reference_metadata (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  source TEXT NOT NULL CHECK(source IN ('beatport','manual','daw','audio')),
  source_url TEXT,
  title TEXT NOT NULL,
  artist TEXT,
  release_name TEXT,
  label_name TEXT,
  bpm REAL,
  musical_key TEXT,
  camelot TEXT,
  chart_name TEXT,
  chart_rank INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  captured_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_music_reference_project ON music_reference_metadata(project_id,captured_at DESC);
