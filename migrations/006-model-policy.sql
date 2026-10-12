CREATE TABLE IF NOT EXISTS model_routing_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  allow_third_party INTEGER NOT NULL DEFAULT 0 CHECK (allow_third_party IN (0,1)),
  monthly_micro_usd INTEGER NOT NULL DEFAULT 0 CHECK (monthly_micro_usd >= 0),
  revision INTEGER NOT NULL DEFAULT 0
);
