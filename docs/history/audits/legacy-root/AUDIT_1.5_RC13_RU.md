# Инженерный аудит AZRAIL PULSE 1.5.0-rc.13

## Цель прохода

RC13 закрывает класс ошибок, где старый Worker продолжает жить после reaper/recovery и конкурирует с новым writer, а также зависшие `running` tool receipts после crash.

## 1. Project writer fencing

Старый `operation_locks(project_id, owner, started_at)` защищал от двух одновременных writers только пока строка существовала. После stale-reaper старый процесс физически мог ещё продолжить выполнение, а новый процесс уже получал тот же проект. Особенно опасен повторный owner = missionId: `finally` старого процесса мог удалить lock нового запуска.

RC13 вводит durable generation model:

- `project_lock_counters` хранит монотонное поколение;
- `project_lock_leases` связывает `projectId + owner + leaseId + fenceToken`;
- `operation_locks` остаётся compatibility mirror;
- release удаляет compatibility lock только если более нового lease уже нет;
- lost acknowledgement при acquire перечитывается и принимается как успех только при доказанном exact lease.

## 2. Fence внутри side-effect boundary

Проверка только перед tool недостаточна: lease может быть отозван, пока внешний side effect уже выполняется. Поэтому Execution Engine проверяет текущий fence и до, и после effectful tool **внутри** `checkpointTool()` work boundary.

Если поколение изменилось во время выполнения, checkpoint/receipt становится `uncertain`; миссия не имеет права считать шаг доказанно завершённым или автоматически повторять его.

Это не отменяет уже совершившийся внешний side effect. Оно делает более важное свойство recovery: потерянный fence не превращается в ложный success и не разрешает слепой retry.

## 3. Reaper ↔ recovery race

Найдена отдельная гонка: reaper сначала переводил stale mission в `failed`, затем отдельным запросом удалял lock. Между этими операциями recovery мог requeue ту же mission и получить новый same-owner lease, после чего reaper удалял уже новый lock.

RC13 делает cleanup status-gated: lease удаляется только если mission **всё ещё** `failed/cancelled/completed` на момент удаления. `recoverMission()` симметрично очищает stale lease только если исходный status не изменился.

## 4. Stale `running` receipts

Crash может оставить checkpoint и independent receipt в `running` навсегда. Автоматически считать такой шаг failed нельзя: внешний effect мог успеть выполниться.

`quarantineStaleRunningToolReceipts()` после conservative TTL переводит только согласованную пару `running/running` в `uncertain/uncertain`. Переход условный и transactional. Cron вызывает эту процедуру после stale mission recovery.

## 5. Ложный success при zero-change UPDATE

До RC13 успешный возврат `setPairStatus()` означал только, что D1 запрос не бросил exception. Если строка уже была переведена в `uncertain` конкурентным reconciler, `UPDATE ... WHERE status='running'` менял 0 строк, но caller всё равно мог вернуть tool-result как success.

RC13 всегда перечитывает checkpoint + receipt и требует exact parity `attemptId/tool/input/result/status=completed`. Если proof нет — effectful step становится uncertain.

## 6. Что остаётся

- Полный Vitest/typecheck/Wrangler dry-run нужно прогнать на Node 24+ с установленными зависимостями.
- Fencing сейчас гарантирует fail-closed mission semantics; отдельные низкоуровневые R2 writers ещё стоит постепенно переводить на immutable publish/CAS вместо in-place writes.
- R2 GC и retention остаются dry-run-only до staging drill на реальных reference sets.
- Большой Execution Engine пока не декомпозирован: structural refactor должен идти после полного regression suite, а не до него.
