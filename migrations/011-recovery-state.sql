-- RC11: durable recovery state for planner/retry budgets and objective test baseline.
CREATE TABLE IF NOT EXISTS mission_recovery_state (
  mission_id TEXT PRIMARY KEY,
  plan_revisions INTEGER NOT NULL DEFAULT 0 CHECK(plan_revisions >= 0),
  regression_retries INTEGER NOT NULL DEFAULT 0 CHECK(regression_retries >= 0),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mission_test_baselines (
  mission_id TEXT PRIMARY KEY,
  passed INTEGER NOT NULL CHECK(passed >= 0),
  failed INTEGER NOT NULL CHECK(failed >= 0),
  captured_at INTEGER NOT NULL,
  FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
);
