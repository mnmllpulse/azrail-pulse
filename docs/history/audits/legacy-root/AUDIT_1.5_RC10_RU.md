# AZRAIL PULSE 1.5.0-rc.10 — инженерный аудит

## Область прохода

RC10 сфокусирован на mission recovery, outbox delivery provenance, snapshot reconstruction и semantic TypeScript edge cases. Крупная декомпозиция `ExecutionEngine` сознательно не выполнялась до полноценного dependency-backed test gate.

## 1. Outbox мог изменить исходную цель миссии

До RC10 `dispatchOutbox()` проверял, что `missionId` и `projectId` из JSON совпадают с D1, но `goal` проверялся только на непустую строку. При повреждении `mission_outbox.params` одна и та же строка `missions` могла быть доставлена с другой задачей.

Это нарушение provenance: outbox — транспортный envelope, а не второй источник истины.

Исправление: введён `parseMissionDelivery()`. Он сверяет `missionId`, `projectId` и нормализованный `goal` с авторитетной строкой `missions`, а также ограничивает `maxIterations` и размеры optional-полей. Poison/stale payload блокируется fail-closed.

## 2. Recovery мог оставить миссию queued, но фактически недоставляемой

Старый порядок был опасным:

`terminal/suspended → UPDATE missions=queued → delete operation_lock → delete DO delivery marker → startMission()`.

Если удаление lock/marker или последующий schedule падали после первого UPDATE, миссия уже была `queued`, но старый delivery state мог не позволить реально поставить её в планировщик. При этом `mission_outbox.delivered` оставался от предыдущего запуска.

Исправление:

1. stale project lock текущей миссии и DO delivery marker очищаются, пока миссия ещё terminal/suspended;
2. reset `mission_outbox.delivered=0` имеет те же eligibility-предикаты, что и mission CAS, поэтому не меняется, если recovery уже заблокирован другой активной миссией;
3. outbox re-arm и CAS `missions → queued` выполняются одной D1 batch-транзакцией;
4. если immediate schedule падает после успешного requeue, outbox остаётся retryable, и `dispatchOutbox()` может повторить доставку.

## 3. `startMission()` доверял RPC-параметрам

До RC10 `Orchestrator.startMission(params)` планировал ровно то, что передал вызывающий код. Даже при корректном `missionId` stale internal caller мог передать другой `projectId`, `goal` или option set.

Исправление: `startMission()` перечитывает `missions + mission_outbox`, строит canonical delivery, требует статус `queued` и точное совпадение параметров. Планируется только canonical payload из D1.

## 4. Snapshot link не имел достаточной проверки provenance

`mission_snapshots` хранит только `mission_id → r2_key`. Execution Engine раньше принимал этот ключ как сохранённый baseline. Повреждённая ссылка могла указывать на чужой project prefix либо на R2 tree, который больше не подтверждается историей версий.

Исправление: `loadMissionSnapshotKey()` разрешает только `projects/<project>/snapshots[/v2]/.../` и требует соответствующую строку `project_versions` того же проекта с `created_by_agent='execution-engine'`. Recovery при несоответствии останавливается до requeue.

## 5. Compiler probe нашёл две настоящие semantic TypeScript ошибки

Полный проектный `tsc` пока нельзя честно назвать пройденным без dependency tree, но глобальный TypeScript compiler можно использовать как дополнительный probe. Он нашёл две ошибки, не связанные с отсутствующими Cloudflare/Agent типами:

- `src/unified/entry.ts`: `response` имел тип `Response | null` в точке вызова `secureResponse(response, request)`;
- `src/unified/project-export.ts`: `page.cursor` оставался `string | undefined` при передаче в `Set<string>.add()`.

Исправление: добавлено явное fail-closed narrowing ответа и локальная `nextCursor` после проверки cursor. Повторный probe больше не показывает local assignability errors категорий TS2345/TS2322/TS2300; оставшиеся diagnostics происходят от отсутствующего dependency/Workers type tree и не считаются полноценным typecheck.

## 6. Что намеренно не делалось в RC10

Не выполнялась крупная структурная декомпозиция `ExecutionEngine`, автоматическое удаление старых `project_versions`/snapshot trees и destructive R2 orphan GC. Эти изменения увеличивают regression surface и требуют сначала получить свежие `npm ci → tsc → Vitest → Wrangler dry-run`.

## Вывод

RC10 переводит recovery на более строгую модель: задача, проект, snapshot и delivery должны быть доказаны сохранённым состоянием. Неопределённость не превращается в разрешение на повтор или в доверие к транспортному payload.
