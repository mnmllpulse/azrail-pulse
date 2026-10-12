# Инженерный аудит AZRAIL PULSE 1.5.0-rc.12

## Цель прохода

RC12 закрывает следующий слой crash-consistency: доказательство результата каждого tool-effect, lost-ack окна D1 после внешнего side effect, а также безопасную видимость orphan/retention проблем R2 без автоматического удаления.

## 1. Ошибка, найденная после RC11: completion acknowledgement мог уничтожить доказательство успеха

До RC12 `checkpointTool()` выполнял tool, затем делал `UPDATE mission_checkpoints ... completed`. Если этот UPDATE реально коммитился в D1, но ответ до Worker терялся, управление попадало в `catch`. Для effectful tool catch мог записать `uncertain`, то есть уже доказанный `completed` результат понижался до неопределённого состояния.

RC12 вводит отдельный `mission_tool_receipts` и pair protocol:

1. checkpoint + receipt `running` создаются одной D1 batch-транзакцией;
2. tool исполняется только после доказанной reservation;
3. checkpoint + receipt `completed` фиксируются одной batch-транзакцией;
4. при потерянном acknowledgement durable rows перечитываются;
5. совпавший `attempt_id/tool/input/result/status` является доказательством completion;
6. последующие failed/uncertain transitions меняют только строки со статусом `running`.

Так система не обещает математическое exactly-once для произвольного внешнего сервиса, но делает главное безопасное свойство: **не повторять effect автоматически без доказательства и не уничтожать уже сохранённое доказательство результата**.

## 2. Отдельная provenance запись

`mission_checkpoints` остаётся replay state, `mission_tool_receipts` — независимым effect receipt. Execution Engine использует существующий `callId` как `attempt_id`, связывая audit/tool_calls и recovery evidence.

Recovery, загружающий строки из D1, требует parity checkpoint/receipt. Missing receipt, другой tool/input/status/result или неопределённый status останавливают автоматическое восстановление fail-closed.

## 3. Ошибка, найденная самим RC12 runtime harness

Первая версия migration 012 добавляла FOREIGN KEY receipt → missions. Runtime harness на реальной SQLite semantics сразу показал несовместимость с legacy checkpoint моделью: `mission_checkpoints` исторически не имеет такого FK, поэтому backfill/старые orphan checkpoint rows могли бы сорвать migration.

FK удалён до упаковки. Migration остаётся additive/idempotent, а согласованность receipt проверяется в recovery boundary. Это важнее, чем формальная FK, которая способна заблокировать обновление старой базы.

## 4. R2 GC: только доказательный dry-run

Автоматически удалять R2 по одному возрасту опасно. AZRAIL хранит целые prefix trees, single-object versions, backup trees, Studio artifacts и uploads, а D1 является картой активных ссылок.

RC12 поэтому добавляет только bounded preview:

- scope: projects/backups/studio/uploads/all;
- minimum age: 24 часа, default 168 часов;
- max scan: до 5000 объектов;
- D1 reference set capped и fail-closed;
- неизвестный `uploaded` timestamp никогда не считается доказательством orphan;
- cursor cycles являются ошибкой;
- `safeToApply=false` без исключений.

Cloudflare R2 поддерживает lifecycle/delete механизмы, но bucket/prefix lifecycle не знает о D1 references. Поэтому для общей AZRAIL bucket автоматическое age-only удаление сейчас сознательно не включено.

## 5. Retention preview

Для `project_versions` и `studio_artifacts` добавлена только read-only оценка. Preview защищает newest-N, current workspace head и version, связанный с mission snapshot. Возраст и keepNewest задаются явно и ограничены безопасными диапазонами.

До production policy необходимо отдельно определить бизнес-правила хранения, legal/data-deletion требования и staging drill. RC12 не подменяет эти решения скрытым cron deletion.

## 6. Что ещё остаётся

RC12 не является production-ready. Основные release gates остаются прежними: dependency-backed TypeScript typecheck, полный Vitest, Wrangler dry-run обоих окружений, staging migration 012, staging smoke и затем повторный аудит результатов. Структурная декомпозиция большого Execution Engine также пока отложена до прохождения полного dependency-backed regression suite.
