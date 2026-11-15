-- AZRAIL — D1 схема (azrail-db, uuid c76e7d92-648c-45bc-b0df-f26b00d0ff88)
--
-- Статус: применена полностью и сверена напрямую по sqlite_master (2026-08-08).
-- На момент применения users/projects уже существовали с более узкой схемой
-- (из более ранней сессии, не отсюда) — досозданы через ALTER TABLE ADD COLUMN,
-- а не пересозданы, чтобы не терять данные. Если разворачиваешь схему на
-- ЧИСТОЙ D1 (например, для другого окружения) — этот файл создаст users/projects
-- сразу с нужными колонками через обычный CREATE TABLE, ALTER не понадобится.


-- ─── Migration ledger ────────────────────────────────────────────────────
-- Canonical tamper-evident history for every numbered SQL migration.
-- The planner refuses to continue if an already-applied file checksum changes.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  applied_by TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('applied','failed'))
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_status
  ON schema_migrations(status, applied_at);

-- RC36 / Stage 22: read-only System Control Center consumes explicit release evidence.
CREATE TABLE IF NOT EXISTS release_evidence (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('config_drift','staging_smoke','security_verification','backup_restore')),
  environment TEXT NOT NULL CHECK(environment IN ('local','staging','production','unknown')),
  status TEXT NOT NULL CHECK(status IN ('healthy','warning','blocked','unknown')),
  summary TEXT NOT NULL,
  details_json TEXT,
  recorded_at INTEGER NOT NULL,
  CHECK(length(id) BETWEEN 1 AND 128),
  CHECK(length(summary) BETWEEN 1 AND 1000)
);
CREATE INDEX IF NOT EXISTS idx_release_evidence_kind_time ON release_evidence(kind, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_release_evidence_environment_time ON release_evidence(environment, recorded_at DESC);


CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stack TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  r2_prefix TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- RC26: Professional Projects metadata lives in a sidecar so legacy project
-- rows do not need destructive table rewrites.
CREATE TABLE IF NOT EXISTS project_profiles (
  project_id TEXT PRIMARY KEY,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
  studio_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  archived_at INTEGER,
  deleted_at INTEGER,
  duplicated_from TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_project_profiles_pinned ON project_profiles(pinned, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_profiles_studio ON project_profiles(studio_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  r2_object_key TEXT NOT NULL,
  summary TEXT,
  created_by_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  agent TEXT NOT NULL,
  intent TEXT,
  input_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_summary TEXT,
  output_summary TEXT,
  error TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_memory (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL, -- architecture_decision | code_style | tech_choice | known_issue | preference
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_project_key ON project_memory(project_id, category, key);
CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_history_project ON task_history(project_id);

-- ─── Диалоги и миссии ────────────────────────────────────────────────────
-- Переписка живёт в D1, а не в SQLite конкретного Durable Object: диалогов
-- много, они должны переживать выгрузку объекта и быть видны из любого
-- роута. parent_message_id даёт ветвление правок — правка старого
-- сообщения создаёт ветку, а не переписывает историю.

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL DEFAULT 'AZRAIL Chat',
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_message_id TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- finished_at: момент завершения. Колонки не было, а код её записывал: каждая
-- миссия падала бы на UPDATE с "no such column". Поймано сверкой SQL со
-- схемой, а не тестами — tsc и vitest про имена колонок ничего не знают.
--
-- result_json: итог миссии (TaskResult в JSON). Появился вместе с переносом
-- миссии в фон: POST возвращается до начала работы, и результат больше
-- некуда положить в ответ. На УЖЕ РАЗВЁРНУТОЙ базе колонки нет — применить
-- migrations/002-mission-async.sql. Код без неё не падает, но отчёт
-- остаётся без итогового текста.
--
-- Оба комментария вынесены НАД CREATE TABLE, а не между колонками: node:sqlite
-- (DatabaseSync, используется в tests/stubs/sqlite-d1.ts) при ALTER TABLE ...
-- DROP COLUMN переписывает исходный текст CREATE TABLE и ломается на
-- "incomplete input", если многострочный комментарий стоит прямо перед
-- удаляемой колонкой. Проверено эмпирически: без межколоночных комментариев
-- DROP COLUMN проходит; с ними — нет, независимо от языка и длины строки.
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  conversation_id TEXT,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  result_json TEXT
);

CREATE TABLE IF NOT EXISTS mission_events (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

-- Unified append-only event stream. `seq` is the stable replay cursor used by
-- HTTP catch-up and realtime WebSocket delivery. mission_events above is kept
-- temporarily as a legacy read source only.
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

-- RC48: SHA-256 tamper-evident sidecar for new unified events. Historical
-- rows may predate this table; all new emitEvent writes publish event_stream
-- and event_integrity atomically.
CREATE TABLE IF NOT EXISTS event_integrity (
  event_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'sha256' CHECK(algorithm='sha256'),
  prev_hash TEXT NOT NULL CHECK(length(prev_hash)=64),
  event_hash TEXT NOT NULL UNIQUE CHECK(length(event_hash)=64),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(event_id) REFERENCES event_stream(id) ON DELETE CASCADE,
  CHECK(length(scope) BETWEEN 3 AND 768)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_integrity_scope_prev ON event_integrity(scope,prev_hash);
CREATE INDEX IF NOT EXISTS idx_event_integrity_scope_created ON event_integrity(scope,created_at);


-- RC25: correlation sidecar. The operational tables above remain authoritative;
-- this table lets one Trace ID recover the whole cross-subsystem path.
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

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  status TEXT NOT NULL,
  input TEXT,
  output TEXT,
  error TEXT,
  started_at TEXT,
  finished_at TEXT,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at TEXT,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);



-- Unified Approval Engine. New privileged actions bind the human decision to
-- the exact payload digest and are single-use. The legacy `approvals` table
-- above is kept temporarily for migration compatibility only.
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
CREATE INDEX IF NOT EXISTS idx_approval_requests_mission ON approval_requests(mission_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_account ON approval_requests(account_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_project ON approval_requests(project_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_scope ON approval_requests(action_type, scope_type, scope_id, status);
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
CREATE INDEX IF NOT EXISTS idx_approval_receipts_request ON approval_receipts(approval_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_missions_project ON missions(project_id, updated_at);
-- По нему ходит сборщик зависших миссий (крон, lib/mission-state.ts).
CREATE INDEX IF NOT EXISTS idx_missions_status_updated ON missions(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_mission_events ON mission_events(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_mission ON tool_calls(mission_id, started_at);

CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);

-- ─────────────────────────────────────────────────────────────────────
-- ПЛАН МИССИИ.
--
-- Раньше плана как сущности не было вовсе: модель на каждом шаге решала
-- заново, глядя на историю вызовов. Для коротких задач это работает, для
-- длинных — нет: цель размывается, и жёсткий потолок в 20 шагов был не
-- защитой, а симптомом того, что система не умеет разбивать большую
-- задачу на части.
--
-- План лежит в базе, а не в памяти: миссия должна переживать выгрузку
-- объекта и быть видимой снаружи — по нему строится показ прогресса и
-- по нему же видно, где именно всё встало.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_steps (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  -- pending | doing | done | skipped
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mission_steps_mission ON mission_steps(mission_id, position);

-- ─────────────────────────────────────────────────────────────────────
-- ПРОВЕРКИ ПЕРЕД ЗАВЕРШЕНИЕМ.
--
-- Записываются ВСЕ проверки, включая отклонённые. Без этого нельзя
-- отличить «задача была простая» от «проверяющий всё пропускает»: если
-- отказов не бывает никогда, проверка декоративная, и это должно быть
-- видно по данным, а не по ощущению.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_checks (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mission_checks_mission ON mission_checks(mission_id);


-- ── Измеритель качества (миграция 003) ────────────────────────────────
-- Одно число ничего не значит, пока не с чем сравнить: смысл измерителя
-- целиком в сравнении сегодняшнего прогона со вчерашним.
CREATE TABLE IF NOT EXISTS bench_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  measured INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  regressed INTEGER NOT NULL DEFAULT 0,
  invalid INTEGER NOT NULL DEFAULT 0,
  unmeasured INTEGER NOT NULL DEFAULT 0,
  median_ms INTEGER NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE IF NOT EXISTS bench_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  difficulty TEXT,
  verdict TEXT NOT NULL,
  before_ok INTEGER,
  after_ok INTEGER,
  before_passed INTEGER,
  after_passed INTEGER,
  mission_status TEXT,
  mission_id TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  FOREIGN KEY (run_id) REFERENCES bench_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_bench_results_run ON bench_results(run_id, case_id);
CREATE INDEX IF NOT EXISTS idx_bench_results_case ON bench_results(case_id, run_id);

-- Apply before deploying 0.6.3. Safe to repeat; no existing tables are changed.
CREATE TABLE IF NOT EXISTS request_quotas (
  scope TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY (scope, bucket)
);
CREATE INDEX IF NOT EXISTS idx_request_quotas_bucket ON request_quotas(bucket);
CREATE TABLE IF NOT EXISTS websocket_tickets (
  ticket TEXT PRIMARY KEY,
  caller TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_websocket_tickets_expiry ON websocket_tickets(expires_at);

CREATE TABLE IF NOT EXISTS mission_admissions (
  key TEXT PRIMARY KEY,
  body_hash TEXT NOT NULL,
  claim TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  response_body TEXT,
  response_status INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mission_admissions_expiry ON mission_admissions(expires_at);

CREATE INDEX IF NOT EXISTS idx_missions_project_status ON missions(project_id, status);
CREATE TABLE IF NOT EXISTS access_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')),
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS resource_owners (
  kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  PRIMARY KEY(kind,resource_id)
);
CREATE INDEX IF NOT EXISTS idx_resource_account ON resource_owners(account_id,kind);
CREATE TABLE IF NOT EXISTS project_permissions (
  project_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  PRIMARY KEY(project_id,capability)
);
CREATE TABLE IF NOT EXISTS operation_locks (
  project_id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  started_at INTEGER NOT NULL
);

-- RC13: project-writer fencing survives stale lock reaping and recovery.
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
CREATE INDEX IF NOT EXISTS idx_project_lock_leases_owner ON project_lock_leases(owner, started_at);
CREATE TABLE IF NOT EXISTS mission_outbox (
  mission_id TEXT PRIMARY KEY,
  params TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- RC14: delivery generation fences stale Durable Object schedules after recovery.
CREATE TABLE IF NOT EXISTS mission_delivery_state (
  mission_id TEXT PRIMARY KEY,
  generation INTEGER NOT NULL CHECK(generation > 0),
  updated_at INTEGER NOT NULL
);

-- RC15: one bounded scheduler lease per mission delivery generation.
CREATE TABLE IF NOT EXISTS mission_delivery_leases (
  mission_id TEXT PRIMARY KEY,
  generation INTEGER NOT NULL CHECK(generation > 0),
  lease_id TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mission_delivery_leases_expiry ON mission_delivery_leases(expires_at);
CREATE TABLE IF NOT EXISTS mission_checkpoints (
  mission_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  tool TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT,
  status TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(mission_id,step)
);

-- RC12: independent durable provenance for exactly-once-ish tool effects.
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
CREATE INDEX IF NOT EXISTS idx_mission_tool_receipts_status ON mission_tool_receipts(status, updated_at);

-- RC11: recovery-safe budgets and objective test baseline.
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

CREATE TABLE IF NOT EXISTS model_prices (
  model TEXT PRIMARY KEY,
  input_micro_usd_per_million INTEGER NOT NULL,
  output_micro_usd_per_million INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS spend_limits (
  scope TEXT PRIMARY KEY,
  limit_micro_usd INTEGER NOT NULL,
  spent_micro_usd INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS model_calls (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  reserved_micro_usd INTEGER NOT NULL DEFAULT 0,
  actual_micro_usd INTEGER,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_model_calls_status_started ON model_calls(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_calls_scope_started ON model_calls(scope, started_at);
CREATE TABLE IF NOT EXISTS model_call_dimensions (
  call_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  route_attempt INTEGER NOT NULL DEFAULT 1 CHECK(route_attempt BETWEEN 1 AND 128),
  retry_attempt INTEGER NOT NULL DEFAULT 1 CHECK(retry_attempt BETWEEN 1 AND 16),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(call_id) REFERENCES model_calls(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_model_call_dimensions_provider ON model_call_dimensions(provider, created_at);
CREATE INDEX IF NOT EXISTS idx_model_call_dimensions_attempts ON model_call_dimensions(route_attempt, retry_attempt, created_at);
CREATE TABLE IF NOT EXISTS backup_manifests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  file_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_snapshots (
  mission_id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_heads (
  project_id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL
);

-- RC15: immutable provenance for every versioned workspace head.
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
CREATE INDEX IF NOT EXISTS idx_workspace_publications_project ON workspace_publications(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS model_routing_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  allow_third_party INTEGER NOT NULL DEFAULT 0 CHECK (allow_third_party IN (0,1)),
  monthly_micro_usd INTEGER NOT NULL DEFAULT 0 CHECK (monthly_micro_usd >= 0),
  revision INTEGER NOT NULL DEFAULT 0
);

-- 0.8.1: atomic in-flight hints, safe to reapply.
CREATE TABLE IF NOT EXISTS mission_hints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mission_hints_queue ON mission_hints(mission_id,expires_at);
CREATE INDEX IF NOT EXISTS idx_mission_hints_expiry ON mission_hints(expires_at);

-- Additive migration; never restores or drops application data.
CREATE TABLE IF NOT EXISTS oidc_states (
 state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, nonce TEXT NOT NULL,
 origin TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS web_sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES access_accounts(id),
 origin TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS web_sessions_expiry ON web_sessions(expires_at);
CREATE TABLE IF NOT EXISTS resource_budgets (
 scope TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('micro_usd','neuron','request','second','byte')),
 limit_units INTEGER NOT NULL CHECK(limit_units>=0), committed_units INTEGER NOT NULL DEFAULT 0 CHECK(committed_units>=0),
 PRIMARY KEY(scope,unit)
);
CREATE TABLE IF NOT EXISTS resource_ledger (
 id TEXT PRIMARY KEY, scope TEXT NOT NULL, unit TEXT NOT NULL, resource TEXT NOT NULL,
 fingerprint TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reserved','settled','uncertain','released')),
 reserved_units INTEGER NOT NULL CHECK(reserved_units>=0), actual_units INTEGER,
 created_at INTEGER NOT NULL, finished_at INTEGER, evidence TEXT,
 FOREIGN KEY(scope,unit) REFERENCES resource_budgets(scope,unit)
);
CREATE INDEX IF NOT EXISTS resource_ledger_scope ON resource_ledger(scope,created_at);

-- RC28: Professional Web Studio snapshots reference immutable workspace publications.
CREATE TABLE IF NOT EXISTS workspace_snapshots (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL,
 prefix TEXT NOT NULL,
 manifest_hash TEXT NOT NULL,
 label TEXT NOT NULL,
 created_by TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_project ON workspace_snapshots(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_prefix ON workspace_snapshots(prefix);

CREATE TABLE IF NOT EXISTS studio_artifacts (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL,
 r2_key TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_artifacts_owner ON studio_artifacts(account_id,created_at);
CREATE TABLE IF NOT EXISTS studio_artifact_projects (
 artifact_id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL,
 studio_id TEXT,
 linked_at INTEGER NOT NULL,
 FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id),
 FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_studio_artifact_projects_project ON studio_artifact_projects(project_id,linked_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_artifact_projects_studio ON studio_artifact_projects(studio_id,linked_at DESC);
CREATE TABLE IF NOT EXISTS integration_connections (
 account_id TEXT NOT NULL, service TEXT NOT NULL, secret_cipher TEXT NOT NULL,
 config_json TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL, PRIMARY KEY(account_id,service)
);

-- Unified 1.3 connectors and studio drafts
CREATE TABLE IF NOT EXISTS studio_drafts (
 account_id TEXT NOT NULL, studio_id TEXT NOT NULL, revision INTEGER NOT NULL,
 values_json TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,studio_id)
);
CREATE TABLE IF NOT EXISTS connector_connections (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, endpoint_key TEXT NOT NULL,
 label TEXT NOT NULL, secret_cipher TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 tools_json TEXT NOT NULL DEFAULT '[]', tools_digest TEXT NOT NULL DEFAULT '',
 verified_at INTEGER, disabled INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_owner ON connector_connections(account_id,disabled);
CREATE TABLE IF NOT EXISTS connector_calls (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, connection_id TEXT NOT NULL,
 connection_revision INTEGER NOT NULL, request_key TEXT NOT NULL,
 tool_name TEXT NOT NULL, arguments_cipher TEXT NOT NULL, arguments_digest TEXT NOT NULL,
 tools_digest TEXT NOT NULL, policy_digest TEXT NOT NULL,
 approval_needed INTEGER NOT NULL, approved_at INTEGER,
 status TEXT NOT NULL CHECK(status IN ('prepared','running','succeeded','failed','uncertain','cancelled')),
 result_cipher TEXT, error_code TEXT, expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(account_id,request_key)
);
CREATE INDEX IF NOT EXISTS connector_call_owner ON connector_calls(account_id,created_at);

CREATE TABLE IF NOT EXISTS connector_oauth_states (
 state_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, endpoint_key TEXT NOT NULL,
 origin TEXT NOT NULL, policy_digest TEXT NOT NULL, verifier_cipher TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS project_design_contracts (
 project_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, contract_json TEXT NOT NULL, updated_at INTEGER NOT NULL
);

-- 1.5 RC5: uncertain provider / connector reconciliation audit.
CREATE TABLE IF NOT EXISTS model_call_budget_scopes (
  call_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  reserved_micro_usd INTEGER NOT NULL CHECK(reserved_micro_usd>=0),
  actual_micro_usd INTEGER,
  reconciled_at INTEGER,
  PRIMARY KEY(call_id,scope),
  FOREIGN KEY(call_id) REFERENCES model_calls(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS model_call_budget_scope_idx ON model_call_budget_scopes(scope,call_id);

CREATE TABLE IF NOT EXISTS connector_reconciliations (
  call_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('succeeded','failed','not_executed')),
  evidence TEXT NOT NULL,
  decided_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_reconciliation_owner ON connector_reconciliations(account_id,decided_at);


-- RC29: Professional Image Studio history and metadata.
CREATE TABLE IF NOT EXISTS image_generations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  artifact_id TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL CHECK(operation IN ('generate','variation','edit','upscale')),
  prompt TEXT NOT NULL,
  style TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  seed INTEGER,
  variation_index INTEGER NOT NULL DEFAULT 0,
  reference_artifact_id TEXT,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id),
  FOREIGN KEY(reference_artifact_id) REFERENCES studio_artifacts(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_image_generations_account ON image_generations(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_generations_project ON image_generations(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_generations_reference ON image_generations(reference_artifact_id,created_at DESC);

-- RC30: Professional Music Studio sessions and project-bound export provenance.
CREATE TABLE IF NOT EXISTS music_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  prompt TEXT NOT NULL,
  genre TEXT NOT NULL,
  mood TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  key_root TEXT NOT NULL,
  scale TEXT NOT NULL,
  bars INTEGER NOT NULL,
  time_signature TEXT NOT NULL,
  pattern TEXT NOT NULL,
  arrangement TEXT NOT NULL,
  synth_preset TEXT NOT NULL,
  seed INTEGER NOT NULL,
  wav_artifact_id TEXT,
  midi_artifact_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(wav_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL,
  FOREIGN KEY(midi_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_music_sessions_account ON music_sessions(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_sessions_project ON music_sessions(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_sessions_wav ON music_sessions(wav_artifact_id);
CREATE INDEX IF NOT EXISTS idx_music_sessions_midi ON music_sessions(midi_artifact_id);
-- RC31: Professional Video Studio timeline sessions and export provenance.
CREATE TABLE IF NOT EXISTS video_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  fps INTEGER NOT NULL,
  transition TEXT NOT NULL,
  motion_preset TEXT NOT NULL,
  export_preset TEXT NOT NULL,
  scenes_json TEXT NOT NULL,
  has_audio INTEGER NOT NULL DEFAULT 0 CHECK(has_audio IN (0,1)),
  image_count INTEGER NOT NULL DEFAULT 0 CHECK(image_count >= 0 AND image_count <= 8),
  video_artifact_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(video_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_video_sessions_account ON video_sessions(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_sessions_project ON video_sessions(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_sessions_artifact ON video_sessions(video_artifact_id);

-- RC33: Professional Ableton Lab analysis history and source provenance.
CREATE TABLE IF NOT EXISTS ableton_analyses (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  source_artifact_id TEXT,
  file_name TEXT NOT NULL,
  ableton_version TEXT,
  bpm REAL,
  time_signature TEXT,
  track_count INTEGER NOT NULL CHECK(track_count >= 0),
  scene_count INTEGER NOT NULL CHECK(scene_count >= 0),
  issue_count INTEGER NOT NULL CHECK(issue_count >= 0),
  report_json TEXT NOT NULL,
  report_truncated INTEGER NOT NULL DEFAULT 0 CHECK(report_truncated IN (0,1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(source_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ableton_analyses_account ON ableton_analyses(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ableton_analyses_project ON ableton_analyses(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ableton_analyses_artifact ON ableton_analyses(source_artifact_id);

-- RC34: Professional Data Studio project-bound dataset analysis history.
CREATE TABLE IF NOT EXISTS data_analyses (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  dataset_artifact_id TEXT,
  file_name TEXT NOT NULL,
  delimiter TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK(row_count >= 0 AND row_count <= 50000),
  column_count INTEGER NOT NULL CHECK(column_count >= 1 AND column_count <= 256),
  issue_count INTEGER NOT NULL CHECK(issue_count >= 0),
  transformations_json TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(dataset_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_data_analyses_account ON data_analyses(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_analyses_project ON data_analyses(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_analyses_artifact ON data_analyses(dataset_artifact_id);

-- RC37: Professional Connections health and verification history.
CREATE TABLE IF NOT EXISTS connector_health_checks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('healthy','warning')),
  error_code TEXT,
  latency_ms INTEGER NOT NULL CHECK(latency_ms>=0),
  tool_count INTEGER NOT NULL CHECK(tool_count>=0),
  checked_at INTEGER NOT NULL,
  FOREIGN KEY(connection_id) REFERENCES connector_connections(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_connector_health_connection_time ON connector_health_checks(connection_id,checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_health_owner_time ON connector_health_checks(account_id,checked_at DESC);

-- ─── Product Intelligence / Series E22-E40 + F/G ───────────────────────
CREATE TABLE IF NOT EXISTS image_jobs (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('queued','running','completed','failed','cancelled')),
  config_json TEXT NOT NULL, outputs_json TEXT NOT NULL DEFAULT '[]', error TEXT,
  created_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_image_jobs_account ON image_jobs(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_jobs_project ON image_jobs(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_memory (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT, studio_id TEXT,
  scope TEXT NOT NULL CHECK(scope IN ('user','workspace','project','music','image','video','agent','session')),
  memory_key TEXT NOT NULL, value_json TEXT NOT NULL, source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0 CHECK(confidence >= 0 AND confidence <= 1),
  ttl_expires_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_memory_scope_key ON intelligence_memory(account_id,project_id,studio_id,scope,memory_key);
CREATE INDEX IF NOT EXISTS idx_intelligence_memory_expiry ON intelligence_memory(account_id,ttl_expires_at);

CREATE TABLE IF NOT EXISTS asset_intelligence (
  artifact_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, kind TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}', tags_json TEXT NOT NULL DEFAULT '[]', embedding_ref TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_asset_intelligence_account_kind ON asset_intelligence(account_id,kind,updated_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_memory_policy (
  memory_id TEXT PRIMARY KEY, why_stored TEXT NOT NULL DEFAULT 'unspecified', updated_at INTEGER NOT NULL,
  FOREIGN KEY(memory_id) REFERENCES intelligence_memory(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_intelligence_memory_policy_updated ON intelligence_memory_policy(updated_at DESC);

CREATE TABLE IF NOT EXISTS asset_intelligence_evidence (
  artifact_id TEXT PRIMARY KEY, analysis_json TEXT NOT NULL DEFAULT '{}', version_of TEXT,
  usage_history_json TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL,
  FOREIGN KEY(artifact_id) REFERENCES studio_artifacts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_asset_intelligence_evidence_updated ON asset_intelligence_evidence(updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_reviews (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT, studio_id TEXT NOT NULL,
  subject_type TEXT NOT NULL, subject_id TEXT, findings_json TEXT NOT NULL,
  critical_count INTEGER NOT NULL DEFAULT 0, major_count INTEGER NOT NULL DEFAULT 0,
  minor_count INTEGER NOT NULL DEFAULT 0, improvement_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_studio_reviews_project ON studio_reviews(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS music_reference_metadata (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT,
  source TEXT NOT NULL CHECK(source IN ('beatport','manual','daw','audio')), source_url TEXT,
  title TEXT NOT NULL, artist TEXT, release_name TEXT, label_name TEXT, bpm REAL, musical_key TEXT, camelot TEXT,
  chart_name TEXT, chart_rank INTEGER, metadata_json TEXT NOT NULL DEFAULT '{}', captured_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_music_reference_project ON music_reference_metadata(project_id,captured_at DESC);

-- RC62: Series G G01-G10 System Intelligence receipts.
CREATE TABLE IF NOT EXISTS suggestion_feedback (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  surface TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('accepted','dismissed','completed','failed')),
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_account_time ON suggestion_feedback(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_project_time ON suggestion_feedback(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS system_e2e_runs (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  base_url TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('http','browser')),
  status TEXT NOT NULL CHECK(status IN ('running','passed','failed','blocked')),
  results_json TEXT NOT NULL DEFAULT '[]',
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_system_e2e_runs_started ON system_e2e_runs(started_at DESC);


-- RC57: Music Intelligence F17-F20 — structured DAW imports and compatibility evidence.
CREATE TABLE IF NOT EXISTS music_daw_imports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  source_artifact_id TEXT,
  file_name TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('dawproject','ableton-set','ableton-project-zip','generic-project-zip')),
  application_name TEXT,
  application_version TEXT,
  bpm REAL,
  time_signature TEXT,
  track_count INTEGER NOT NULL CHECK(track_count >= 0),
  plugin_count INTEGER NOT NULL CHECK(plugin_count >= 0),
  media_count INTEGER NOT NULL CHECK(media_count >= 0),
  report_json TEXT NOT NULL,
  report_truncated INTEGER NOT NULL DEFAULT 0 CHECK(report_truncated IN (0,1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(source_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_music_daw_imports_account ON music_daw_imports(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_daw_imports_project ON music_daw_imports(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_daw_imports_artifact ON music_daw_imports(source_artifact_id);
-- RC59: Series F F41-F60 Video Studio 2.0 durable storyboard state.
CREATE TABLE IF NOT EXISTS video_storyboards (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  export_profile TEXT NOT NULL,
  shots_json TEXT NOT NULL,
  continuity_json TEXT NOT NULL,
  reference_count INTEGER NOT NULL DEFAULT 0 CHECK(reference_count >= 0 AND reference_count <= 4),
  tracks_json TEXT NOT NULL,
  captions_json TEXT NOT NULL,
  grading_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_video_storyboards_account ON video_storyboards(account_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_storyboards_project ON video_storyboards(project_id,updated_at DESC);
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
