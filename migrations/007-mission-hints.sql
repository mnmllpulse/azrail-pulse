-- 0.8.1: atomic in-flight hints, safe to reapply.
CREATE TABLE IF NOT EXISTS mission_hints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mission_hints_queue ON mission_hints(mission_id,expires_at);
CREATE INDEX IF NOT EXISTS idx_mission_hints_expiry ON mission_hints(expires_at);
