-- AZRAIL — миграция 002: миссия уходит в фон.
--
-- ПРИМЕНИТЬ ОДИН РАЗ:
--   wrangler d1 execute azrail-db --remote --file=./migrations/002-mission-async.sql
--
-- Зачем: POST /api/mission больше не ждёт выполнения — он возвращает
-- missionId сразу, а цикл идёт в Durable Object. Результат перестал
-- помещаться в ответ на запуск, и забрать его потом было неоткуда:
-- mission_events описывают ХОД работы, но не её ИТОГ. Отсюда колонка
-- result_json — туда кладётся ровно тот TaskResult, который раньше
-- возвращался напрямую.
--
-- SQLite не умеет ADD COLUMN IF NOT EXISTS. Повторный запуск упадёт с
-- "duplicate column name: result_json" — это НЕ поломка, это признак
-- того, что миграция уже применена. Код работает и без этой колонки
-- (см. finishMission → запасной UPDATE), просто отчёт остаётся без
-- итогового текста.
ALTER TABLE missions ADD COLUMN result_json TEXT;

-- Сборщик зависших ищет по статусу и времени обновления. Без индекса это
-- полный скан таблицы каждые десять минут — дёшево сейчас и дорого потом.
CREATE INDEX IF NOT EXISTS idx_missions_status_updated ON missions(status, updated_at);
