-- RC15: delivery lease + immutable workspace publication provenance.
-- Additive, idempotent, and safe to re-apply.

CREATE TABLE IF NOT EXISTS mission_delivery_leases (
  mission_id TEXT PRIMARY KEY,
  generation INTEGER NOT NULL CHECK(generation > 0),
  lease_id TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mission_delivery_leases_expiry
  ON mission_delivery_leases(expires_at);

CREATE TABLE IF NOT EXISTS workspace_publications (
  prefix TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_prefix TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  file_count INTEGER NOT NULL CHECK(file_count >= 0),
  total_bytes INTEGER NOT NULL CHECK(total_bytes >= 0),
  lease_id TEXT NOT NULL,
  fence_token INTEGER NOT NULL CHECK(fence_token >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspace_publications_project
  ON workspace_publications(project_id, created_at DESC);

-- Existing versioned heads predate the immutable publication registry. Preserve
-- them as explicit legacy-unverified publications so the new Worker can read
-- them without pretending their content hash was verified retroactively.
INSERT OR IGNORE INTO workspace_publications(
  prefix,project_id,parent_prefix,manifest_hash,file_count,total_bytes,lease_id,fence_token,created_at
)
SELECT h.prefix,h.project_id,'projects/' || h.project_id || '/workspace/',
       'legacy-unverified',0,0,'legacy',0,0
FROM workspace_heads h
WHERE h.prefix LIKE 'projects/%/workspace-versions/%/';
