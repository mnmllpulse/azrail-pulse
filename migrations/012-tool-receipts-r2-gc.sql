-- RC12: independent durable provenance for tool effects.
-- Additive and safe to re-apply.
CREATE TABLE IF NOT EXISTS mission_tool_receipts (
  mission_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  attempt_id TEXT NOT NULL UNIQUE,
  tool TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT,
  status TEXT NOT NULL CHECK(status IN ('running','completed','failed','uncertain')),
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(mission_id, step)
);
CREATE INDEX IF NOT EXISTS idx_mission_tool_receipts_status
  ON mission_tool_receipts(status, updated_at);

-- Existing checkpoints predate attempt IDs. Give them deterministic legacy
-- provenance so recovery can verify checkpoint/receipt parity immediately
-- after the migration without replaying any external effect.
INSERT OR IGNORE INTO mission_tool_receipts(
  mission_id, step, attempt_id, tool, input_json, result_json, status, started_at, updated_at
)
SELECT
  mission_id,
  step,
  'legacy:' || mission_id || ':' || step,
  tool,
  input_json,
  result_json,
  CASE
    WHEN status IN ('running','completed','failed','uncertain') THEN status
    ELSE 'uncertain'
  END,
  updated_at,
  updated_at
FROM mission_checkpoints;
