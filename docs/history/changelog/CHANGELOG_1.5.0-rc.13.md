# AZRAIL PULSE 1.5.0-rc.13

RC13 усиливает конкурентную безопасность mission recovery и side-effect execution.

## Изменения

- Добавлены монотонные project-writer fencing leases: `project_lock_counters` + `project_lock_leases`.
- `withProjectLock()` теперь выдаёт generation token и не позволяет старому Worker удалить новый lease даже при повторном owner/mission ID.
- Execution Engine проверяет fence до и после каждого effectful tool внутри durable checkpoint boundary. Потеря lease во время side effect переводит результат в `uncertain`, а не в ложный `completed`.
- Исправлена гонка `reaper ↔ recovery`: reaper удаляет mission lease только если миссия всё ещё terminal в момент cleanup.
- `recoverMission()` очищает старый lease только при неизменившемся исходном статусе; конкурентный recovery не может снести lease уже requeued миссии.
- Старые `running` tool receipts после безопасного TTL переводятся в `uncertain` и требуют reconciliation вместо автоматического retry.
- `checkpointTool()` теперь всегда перечитывает durable completion proof: UPDATE с нулём изменений больше не может выдать ложный успех.
- Migration 013 сохраняет legacy `operation_locks` в fencing-модели и безопасно повторяется.
- Добавлен `tests/rc13-hardening.test.ts`; обновлены старые lock tests под новый protocol.

## Ограничения

Production deploy, GitHub publication и любые cloud mutations остаются отключены. Полный dependency-backed `npm ci`, Node 24+ semantic typecheck, полный Vitest и Wrangler dry-run должны быть воспроизведены отдельно перед публикацией.
