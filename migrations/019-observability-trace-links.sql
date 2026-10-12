-- RC25: canonical correlation sidecar. Operational tables stay authoritative;
-- trace_links joins request/trace ids to durable entities without destructive
-- ALTER TABLE rewrites of older D1 databases.
CREATE TABLE IF NOT EXISTS trace_links (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  mission_id TEXT,
  task_id TEXT,
  tool_call_id TEXT,
  approval_id TEXT,
  connector_call_id TEXT,
  model_call_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(entity_type, entity_id),
  CHECK(length(entity_type) BETWEEN 2 AND 80),
  CHECK(length(entity_id) BETWEEN 1 AND 512),
  CHECK(length(request_id) BETWEEN 8 AND 128),
  CHECK(length(trace_id) = 32)
);
CREATE INDEX IF NOT EXISTS idx_trace_links_trace ON trace_links(trace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_request ON trace_links(request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_mission ON trace_links(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_task ON trace_links(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_tool ON trace_links(tool_call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_approval ON trace_links(approval_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_connector ON trace_links(connector_call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trace_links_model ON trace_links(model_call_id, created_at);
