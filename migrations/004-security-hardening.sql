-- Apply before deploying 0.6.3. Safe to repeat; no existing tables are changed.
CREATE TABLE IF NOT EXISTS request_quotas (
  scope TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY (scope, bucket)
);
CREATE INDEX IF NOT EXISTS idx_request_quotas_bucket ON request_quotas(bucket);
CREATE TABLE IF NOT EXISTS websocket_tickets (
  ticket TEXT PRIMARY KEY,
  caller TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_websocket_tickets_expiry ON websocket_tickets(expires_at);

CREATE TABLE IF NOT EXISTS mission_admissions (
  key TEXT PRIMARY KEY,
  body_hash TEXT NOT NULL,
  claim TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  response_body TEXT,
  response_status INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mission_admissions_expiry ON mission_admissions(expires_at);

CREATE INDEX IF NOT EXISTS idx_missions_project_status ON missions(project_id, status);
