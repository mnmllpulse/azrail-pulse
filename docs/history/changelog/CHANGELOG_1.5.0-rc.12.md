# AZRAIL PULSE 1.5.0-rc.12

Локальный release candidate. GitHub и Cloudflare этим архивом не изменялись.

## Durable tool-effect receipts

- Добавлена независимая таблица `mission_tool_receipts`: каждый tool-step получает `attempt_id`, canonical input, status и durable result отдельно от `mission_checkpoints`.
- `ExecutionEngine` передаёт тот же `callId` в checkpoint receipt, поэтому telemetry/tool-call и recovery provenance используют один идентификатор попытки.
- Reservation checkpoint + receipt создаются одной D1 batch-транзакцией до вызова tool. Потеря acknowledgement после reservation не запускает tool вслепую.
- Completion checkpoint + receipt также фиксируются одной batch-транзакцией. Если D1 commit прошёл, но ответ потерялся, RC12 перечитывает durable proof и возвращает успешный результат вместо понижения `completed` в `uncertain`.
- Status updates используют `WHERE status='running'`, поэтому поздний uncertain/failed path не может перезаписать уже доказанный `completed`.
- Recovery сверяет checkpoint и receipt; расхождение tool/input/status/result блокирует автоматический replay.

## Migration 012

- Добавлена `migrations/012-tool-receipts-r2-gc.sql`.
- Existing checkpoint rows получают deterministic legacy receipt `legacy:<mission>:<step>` без повторного выполнения side effects.
- Migration additive/idempotent и включена в migration planner и canonical schema.
- Receipt table намеренно не вводит новый FK, которого нет у legacy `mission_checkpoints`: это предотвращает падение backfill на старых orphan checkpoint rows; целостность проверяется recovery boundary.

## R2 orphan visibility — dry-run only

- Добавлен `src/lib/r2-gc.ts` и admin endpoint `GET /api/admin/r2-gc`.
- Preview собирает D1 reference set для workspace heads, project versions/snapshots, backups, Studio artifacts и uploaded resources.
- Сканирование ограничено scope/возрастом/числом объектов, защищено от cursor loops и не считает объекты с неизвестным возрастом кандидатами.
- При переполнении reference-set возвращается `referenceSetTruncated=true`; apply запрещён.
- RC12 не содержит режима удаления: `dryRun=true`, `safeToApply=false` всегда.

## Retention visibility — dry-run only

- Добавлен `GET /api/admin/retention-preview` для version history и Studio artifacts.
- Preview сохраняет newest-N, current workspace heads и mission snapshot-linked versions.
- Возвращаются только review-кандидаты старше заданного возраста; никакого D1/R2 удаления не выполняется.
- Политика retention остаётся операторским решением и не включается автоматически.

## Verification policy

RC остаётся review candidate. Полный dependency-backed `npm ci -> typecheck -> Vitest -> Wrangler dry-run` должен быть воспроизведён на Node 24+ перед публикацией/deploy.
