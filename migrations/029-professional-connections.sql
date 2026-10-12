-- AZRAIL 1.5.0-rc.37 / Stage 23: Professional Connections control surface.
-- Read-only health history contains no connector secrets or payload bodies.
CREATE TABLE IF NOT EXISTS connector_health_checks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('healthy','warning')),
  error_code TEXT,
  latency_ms INTEGER NOT NULL CHECK(latency_ms>=0),
  tool_count INTEGER NOT NULL CHECK(tool_count>=0),
  checked_at INTEGER NOT NULL,
  FOREIGN KEY(connection_id) REFERENCES connector_connections(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_connector_health_connection_time
  ON connector_health_checks(connection_id,checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_health_owner_time
  ON connector_health_checks(account_id,checked_at DESC);
