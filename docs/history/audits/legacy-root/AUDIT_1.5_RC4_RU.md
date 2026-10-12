# AZRAIL PULSE 1.5.0-rc.4 — инженерный аудит, проход 3

## Область прохода

Mission lifecycle, late-finalization race, approval cancellation ownership, checkpoint recovery, quota/metering fail-closed semantics, OIDC/session housekeeping, Studios/API review и release safety.

## P0/P1 — исправленные дефекты

### 1. Отмена могла проиграть поздней финализации

До RC4 `finishMission()` разрешал обычному `completed/failed/waiting_approval` обновлять строку даже из `cancelling`. Если владелец нажимал Cancel во время последнего tool/check, поздний `completed` мог вернуть миссию в успешный финал.

RC4 разделяет переходы: обычный финал принимает только `queued/executing`; `cancelled` принимает `queued/executing/cancelling`. Если normal-finalization видит уже `cancelling`, она завершает миссию как `cancelled`. Таким образом, кто первым выиграл CAS-переход к отмене, тот сохраняет намерение владельца.

### 2. Отмена prepared connector action не была привязана к owner

Recovery уже связывал `connector_calls.account_id` с `resource_owners.account_id`, а cancellation-path выбирал connector call только по opaque id. При повреждённом checkpoint это позволяло затронуть prepared-call другого tenant.

RC4 получает owner проекта и все SELECT/UPDATE connector-call выполняет в паре `(id, account_id)`. При отсутствии project owner path fail-closed.

### 3. `AZRAIL_*_LIMIT=0` фактически включал fallback

`positiveLimit()` принимал только `>0`, поэтому явное `0` превращалось в 50 model calls/hour или 5000 write-units. Для emergency-stop это противоположность ожидаемому поведению.

RC4: undefined/empty → documented fallback; `0` → hard block; malformed configured value → hard block.

### 4. Опечатка в `AZRAIL_METERING` понижала enforcement

Любая truthy строка, кроме точного `enforce`, работала как observe. `enforc`/`strict` и т.п. могли молча снять денежный budget gate.

RC4 принимает только `observe|enforce`; неизвестное значение блокирует provider call до dispatch.


### 5. Benchmark мог вернуть результат, расходящийся с persisted state

`runBenchMission()` раньше игнорировал фактический статус, который вернул `finishMission()`. При late-cancel база могла корректно сохранить `cancelled`, но benchmark возвращал исходный `done/failed` и искажал отчёт. RC4 теперь возвращает cancellation-result, если отмена выиграла CAS, в том числе на exception path.

## P2 — устойчивость

- Cron security cleanup теперь очищает истёкшие web/OIDC/connector OAuth states.
- Recovery проверяет, что `mission_checkpoints.input_json` — валидный JSON-object до постановки миссии обратно в очередь.
- Execution Engine также fail-closed на повреждённом checkpoint input.

## Studios/UI

В этом проходе критического cross-tenant дефекта в `/api/studio/*` не найдено: project export проходит `requireResource`, artifacts фильтруются по `account_id`, binary download отдаётся attachment + nosniff. Отдельно остаётся performance-долг voice path: преобразование многомегабайтного `Uint8Array` в JS number[] требует отдельного профилирования перед повышением лимита.

## Release gate

RC4 остаётся review candidate. Обязательные перед production проверки: `npm ci`, semantic typecheck, full Vitest, staging dry-run, production dry-run, затем staging smoke. В текущем окружении dependency install не завершился, поэтому эти пункты не заявляются пройденными.
