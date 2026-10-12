# AZRAIL PULSE 1.5.0-rc.8 — инженерный аудит

## Область прохода

RC8 сфокусирован на конкурентной публикации workspace, snapshot atomicity, upload/studio R2↔D1 consistency, backup retention/delete lifecycle и проверке целесообразности декомпозиции Execution Engine.

## 1. Stale workspace publisher мог затереть более новый HEAD

Project lock остаётся основной сериализацией, но сам D1 head flip раньше был unconditional upsert. При обходе lock будущим кодом, lease/recovery race или параллельном административном пути старый publisher мог завершиться после нового и заменить `workspace_heads.prefix` устаревшей версией.

Исправление: publisher запоминает исходный prefix и делает conditional upsert с `WHERE workspace_heads.prefix=?`. Нулевой `changes` означает CAS conflict: staged R2 tree удаляется, live head сохраняется.

## 2. Snapshot baseline имел D1 crash-window

Раньше `project_versions` и `mission_snapshots` создавались отдельными операциями. Между ними Worker мог завершиться. Тогда snapshot физически существовал, но recovery не знал, что это baseline конкретной mission.

Исправление: при наличии `missionId` обе записи публикуются одной `D1.batch()`. При ambiguous response проверяются обе ссылки; R2 удаляется только если публикация доказанно не произошла.

## 3. Upload мог удалить уже опубликованный R2 объект

Сценарий: R2 put успешен → ownership INSERT в D1 commit → ответ D1 потерян → catch удаляет R2. Получалась живая authorization-запись, указывающая на отсутствующий объект.

Исправление: после ambiguous INSERT система перечитывает ownership. Если запись существует, R2 сохраняется и upload считается опубликованным; если D1 доказывает отсутствие записи — staged object очищается.

## 4. Studio artifact lifecycle имел тот же cross-store риск

`saveArtifact` приведён к тому же publication protocol. Добавлено owner-scoped удаление: сначала исчезает D1 reference, затем выполняется best-effort R2 cleanup. При потерянном DELETE response D1 перечитывается; при недоступной verification read R2 не удаляется.

## 5. Backup retention был неограниченным

Автоматическое накопление backup деревьев могло бесконечно увеличивать R2 footprint. RC8 вводит hard ceiling 50 опубликованных backup на проект. При достижении лимита новая копия не создаётся, пока пользователь/оператор не удалит старую.

Удаление backup построено D1-first: сначала удаляется publication reference, затем bounded list/delete R2 prefix. Если R2 cleanup не завершён, операция не переигрывает уже успешное D1 deletion; остатки маркируются как cleanup incomplete для будущего GC.

## 6. Execution Engine decomposition

`execution-engine.ts` остаётся крупным модулем и требует будущего разделения минимум на state transition coordinator, tool executor, verification/recovery и accounting hooks. Но делать такой refactor до свежего полного dependency-backed test gate рискованнее, чем оставить текущую структуру ещё на один RC. Поэтому в RC8 сделаны только локализованные consistency fixes и добавлены preflight-инварианты.

## Вывод

RC8 уменьшает класс ошибок «операция фактически commit, но ответ потерян» и «устаревший publisher побеждает более новый». Это важнее косметического рефакторинга до момента, когда полный test/typecheck/dry-run можно воспроизвести в одной чистой среде.
