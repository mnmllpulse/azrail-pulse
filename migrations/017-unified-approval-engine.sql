-- Migration 017: unified, tamper-bound, single-use approval control plane.
-- Legacy `approvals` remains for backwards compatibility during rollout; all
-- new approval decisions use approval_requests + approval_receipts.
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  mission_id TEXT,
  account_id TEXT,
  project_id TEXT,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'delete_file','external_write','connector_mutation','github_pr',
    'deployment','production_migration','restore','secret_rotation'
  )),
  risk TEXT NOT NULL CHECK(risk IN ('high','critical')),
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  payload_digest TEXT NOT NULL CHECK(length(payload_digest)=64),
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','approved','rejected','cancelled','executing','executed','failed','uncertain','expired'
  )),
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  decision_reason TEXT,
  requested_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  decided_at INTEGER,
  executed_at INTEGER,
  external_ref TEXT,
  CHECK(expires_at > requested_at)
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_mission
  ON approval_requests(mission_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_account
  ON approval_requests(account_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_project
  ON approval_requests(project_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_scope
  ON approval_requests(action_type, scope_type, scope_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_requests_active_exact
  ON approval_requests(action_type, scope_type, scope_id, payload_digest)
  WHERE status IN ('pending','approved','executing');

CREATE TABLE IF NOT EXISTS approval_receipts (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  payload_digest TEXT NOT NULL CHECK(length(payload_digest)=64),
  detail_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (approval_id) REFERENCES approval_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_approval_receipts_request
  ON approval_receipts(approval_id, created_at);
