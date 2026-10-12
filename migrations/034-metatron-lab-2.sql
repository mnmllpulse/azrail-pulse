-- RC60: Series F F61-F80 Metatron Lab 2.0 — durable Agent Operations Center state.
CREATE TABLE IF NOT EXISTS mission_controls (
  mission_id TEXT PRIMARY KEY,
  desired_state TEXT NOT NULL CHECK(desired_state IN ('running','paused','cancelled','terminated')),
  generation INTEGER NOT NULL DEFAULT 1 CHECK(generation > 0),
  requested_by TEXT NOT NULL,
  reason TEXT,
  requested_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mission_agent_runtime (
  mission_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('registered','starting','running','healthy','degraded','replacing','replaced','failed','completed')),
  generation INTEGER NOT NULL DEFAULT 1 CHECK(generation > 0),
  started_at INTEGER NOT NULL,
  heartbeat_at INTEGER,
  finished_at INTEGER,
  last_error TEXT,
  PRIMARY KEY(mission_id,agent_id,generation),
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mission_agent_runtime_health ON mission_agent_runtime(mission_id,status,heartbeat_at);

CREATE TABLE IF NOT EXISTS mission_decisions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  step INTEGER,
  decision_kind TEXT NOT NULL CHECK(decision_kind IN ('model','tool','route','retry','recovery','approval','replacement','control')),
  choice TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mission_decisions_time ON mission_decisions(mission_id,created_at);

CREATE TABLE IF NOT EXISTS mission_memory_reads (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  category TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mission_memory_reads_time ON mission_memory_reads(mission_id,created_at);

CREATE TABLE IF NOT EXISTS mission_fault_runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK(scenario IN ('timeout','provider_down','d1_failure','network_loss')),
  simulation_only INTEGER NOT NULL DEFAULT 1 CHECK(simulation_only=1),
  expected_json TEXT NOT NULL,
  observed_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('passed','failed','blocked')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mission_fault_runs_time ON mission_fault_runs(mission_id,created_at);
