-- RC14: durable delivery generation for mission scheduling.
-- Additive and safe to re-apply. A stale scheduled Durable Object task from an
-- older recovery generation must never start after a newer recovery re-arms the
-- same mission.
CREATE TABLE IF NOT EXISTS mission_delivery_state (
  mission_id TEXT PRIMARY KEY,
  generation INTEGER NOT NULL CHECK(generation > 0),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO mission_delivery_state(mission_id,generation,updated_at)
SELECT mission_id,1,created_at FROM mission_outbox;
