-- RC24: one append-only event contract for mission/agent/tool/approval/
-- connector/verification/recovery/publication events. `seq` is the durable
-- resume cursor; clients replay strictly after the last seen sequence.
CREATE TABLE IF NOT EXISTS event_stream (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK(schema_version = 1),
  domain TEXT NOT NULL CHECK(domain IN (
    'mission','agent','tool','approval','connector','verification','recovery','publication','system'
  )),
  type TEXT NOT NULL,
  account_id TEXT,
  project_id TEXT,
  mission_id TEXT,
  task_id TEXT,
  approval_id TEXT,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  actor TEXT,
  payload_json TEXT,
  created_at INTEGER NOT NULL,
  CHECK(length(id) BETWEEN 1 AND 128),
  CHECK(length(type) BETWEEN 3 AND 160),
  CHECK(length(subject_type) BETWEEN 2 AND 80),
  CHECK(length(subject_id) BETWEEN 1 AND 512)
);

CREATE INDEX IF NOT EXISTS idx_event_stream_project_seq ON event_stream(project_id, seq);
CREATE INDEX IF NOT EXISTS idx_event_stream_mission_seq ON event_stream(mission_id, seq);
CREATE INDEX IF NOT EXISTS idx_event_stream_account_seq ON event_stream(account_id, seq);
CREATE INDEX IF NOT EXISTS idx_event_stream_domain_seq ON event_stream(domain, seq);
CREATE INDEX IF NOT EXISTS idx_event_stream_approval_seq ON event_stream(approval_id, seq);

-- Best-effort one-time import of the legacy mission journal. New code writes
-- only event_stream; mission_events remains readable during the RC migration
-- window so old databases and old tests do not become unreadable.
INSERT OR IGNORE INTO event_stream(
  id,schema_version,domain,type,project_id,mission_id,subject_type,subject_id,payload_json,created_at
)
SELECT
  e.id,
  1,
  CASE
    WHEN e.type LIKE 'tool.%' THEN 'tool'
    WHEN e.type LIKE 'tests.%' OR e.type LIKE 'verification.%' OR e.type LIKE 'check.%' THEN 'verification'
    WHEN e.type LIKE 'recovery.%' THEN 'recovery'
    WHEN e.type LIKE 'publication.%' OR e.type LIKE 'workspace.%' THEN 'publication'
    WHEN e.type LIKE 'approval.%' THEN 'approval'
    ELSE 'mission'
  END,
  e.type,
  m.project_id,
  e.mission_id,
  'mission',
  e.mission_id,
  e.data,
  COALESCE(CAST(unixepoch(e.created_at) AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000)
FROM mission_events e
LEFT JOIN missions m ON m.id=e.mission_id;
