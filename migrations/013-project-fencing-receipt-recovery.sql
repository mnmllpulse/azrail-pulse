-- RC13: monotonic project-writer fencing.
-- Additive and safe to re-apply. Legacy operation_locks are mirrored into the
-- new lease table so a rolling upgrade never creates a second writer.
CREATE TABLE IF NOT EXISTS project_lock_counters (
  project_id TEXT PRIMARY KEY,
  generation INTEGER NOT NULL CHECK(generation >= 0)
);

CREATE TABLE IF NOT EXISTS project_lock_leases (
  project_id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  lease_id TEXT NOT NULL UNIQUE,
  fence_token INTEGER NOT NULL CHECK(fence_token > 0),
  started_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_project_lock_leases_owner
  ON project_lock_leases(owner, started_at);

INSERT OR IGNORE INTO project_lock_counters(project_id,generation)
SELECT project_id,1 FROM operation_locks;

INSERT OR IGNORE INTO project_lock_leases(project_id,owner,lease_id,fence_token,started_at)
SELECT l.project_id,l.owner,'legacy:' || l.project_id || ':' || l.started_at,c.generation,l.started_at
FROM operation_locks l
JOIN project_lock_counters c ON c.project_id=l.project_id;
