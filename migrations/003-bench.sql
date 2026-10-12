-- AZRAIL — миграция 003: измеритель качества.
--
-- ПРИМЕНИТЬ ОДИН РАЗ:
--   wrangler d1 execute azrail-db --remote --file=./migrations/003-bench.sql
--
-- Зачем таблицы, а не вывод в лог: одно число ничего не значит, пока не с
-- чем сравнить. Смысл измерителя целиком в сравнении сегодняшнего прогона
-- со вчерашним, поэтому прогоны обязаны переживать сессию.

CREATE TABLE IF NOT EXISTS bench_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  -- Доля решённых среди ГОДНЫХ задач, 0–100. Негодные и непрогнанные в
  -- знаменатель не входят: иначе сбой песочницы опускал бы оценку так же,
  -- как настоящая деградация качества, и отличить одно от другого по
  -- числу было бы нельзя.
  score INTEGER NOT NULL DEFAULT 0,
  measured INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  -- Задачи, где проходивших тестов стало МЕНЬШЕ. Отдельным полем, потому
  -- что это худший исход, а не разновидность «не решил».
  regressed INTEGER NOT NULL DEFAULT 0,
  invalid INTEGER NOT NULL DEFAULT 0,
  unmeasured INTEGER NOT NULL DEFAULT 0,
  median_ms INTEGER NOT NULL DEFAULT 0,
  note TEXT
);

-- Исход КАЖДОЙ задачи, а не только итог: суммарная оценка может вырасти
-- при том, что две ранее решавшиеся задачи перестали решаться. По одному
-- числу это выглядит улучшением.
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
-- По нему строится история одной задачи: «когда этот кейс перестал решаться».
CREATE INDEX IF NOT EXISTS idx_bench_results_case ON bench_results(case_id, run_id);
