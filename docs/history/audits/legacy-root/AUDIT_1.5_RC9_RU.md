# AZRAIL PULSE 1.5.0-rc.9 — инженерный аудит

## Область прохода

RC9 сфокусирован на mission state semantics, provider retry/idempotency semantics и bounded R2 pagination.

## 1. `waiting_approval` ошибочно считался завершением

API `GET /api/mission` вычислял `done` через `isTerminal()`, а `TERMINAL_STATUSES` включал `waiting_approval`. При этом тот же backend умеет `recoverMission()` и отдельно говорит, что `waiting_approval` — suspended state. Клиент, увидев `done=true`, прекращал polling и скрывал управление активной миссией.

Исправление: terminal statuses теперь только `completed`, `failed`, `cancelled`. Для ожидающего подтверждения API возвращает `requiresAction=true`, но `done=false`.

## 2. R2 cursor cycle мог зациклить backup/version listing

Некоторые R2-циклы уже защищали pagination через `seen cursor`, но `backupProject()` проверял только `nextCursor === currentCursor`, а `restoreVersion()` проверял лишь отсутствие cursor. Цикл из нескольких значений (`A→B→A`) оставался возможен.

Исправление: оба пути ведут `Set` просмотренных cursor и fail-closed при повторе. Это тот же контракт, который уже использовался в workspace/snapshot/export путях.

## 3. Transport failure model provider мог породить второй запрос

Billing уже маркировал ошибку после provider dispatch как `uncertain`, но router для части network failures всё ещё мог выполнить retry/fallback. Получалась семантическая ошибка: accounting говорит «исход неизвестен», а orchestration ведёт себя так, будто вызов доказанно не состоялся.

Исправление: ambiguous transport errors получают `ProviderOutcomeUncertainError`. Router не повторяет ту же модель и не fan-out'ит на другую. Явный `429` не переписывается в uncertain transport error, чтобы не потерять существующую quota policy.

## 4. Почему Execution Engine ещё не декомпозирован

После девяти проходов основной риск сейчас не размер файла сам по себе, а сохранение поведенческих инвариантов. До свежего dependency-backed `tsc + Vitest + Wrangler dry-run` крупный structural refactor центрального state machine остаётся отложенным. RC9 продолжает локальные, доказуемые изменения с regression tests и preflight guards.

## Вывод

RC9 устраняет три класса ошибок: ложное завершение suspended mission, бесконечную R2 pagination и повтор provider request при неопределённом transport outcome. Все три класса редки на happy-path, но критичны для автономной системы, которая должна корректно переживать сбои инфраструктуры.
