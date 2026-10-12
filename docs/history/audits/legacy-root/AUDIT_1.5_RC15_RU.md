# Архитектурный аудит AZRAIL PULSE 1.5.0-rc.15

## Цель прохода

RC15 закрывает восемь пунктов, оставшихся после RC14: delivery lease, concurrent dispatch, immutable workspace publication, R2 legacy references, retention invariants, Studio streaming, подготовку декомпозиции Execution Engine и полный локальный packaging/regression gate.

## 1. Delivery lease

Generation fencing защищал старые scheduled tasks, но не давал отдельного cross-process права именно на создание schedule. Два dispatcher/recovery вызова могли одновременно дойти до `startMission()`. Теперь `mission_delivery_leases` выдаёт один TTL-lease на текущий `mission_id + generation`. Lease id требуется для acknowledgement outbox.

## 2. Dispatcher race

При неоднозначной ошибке `schedule()` lease не снимается немедленно. Это важнее низкой задержки retry: если schedule реально сохранился, мгновенный второй scheduler создал бы duplicate task. После TTL retry разрешён; `runMissionTask()` всё равно имеет дополнительный generation/status CAS.

## 3. Workspace publication

`workspace_heads` больше не является единственной записью о versioned workspace. `workspace_publications` фиксирует immutable provenance: parent, SHA-256 manifest, file/byte counts и fencing lease. Перед staging массивы `Uint8Array` копируются, поэтому caller не может изменить backing buffer во время асинхронной публикации. Versioned head без registry-row считается повреждённым.

## 4. R2 GC

До RC15 preview доверял современным D1 reference tables, но исторические releases могли записывать `versions/code/ui/snapshots` до полного provenance. RC15 консервативно защищает эти namespace для существующих проектов и добавляет `workspace_publications` в reference set. Это уменьшает aggressive cleanup, но исключает false-positive deletion evidence.

## 5. Retention

Retention остаётся только preview. Дополнительно запрещено выдавать как кандидаты R2-ключи, которые не лежат в tenant-owned namespace (`projects/<projectId>/...`, `studio/<accountId>/...`). Кандидаты упорядочиваются fair per owner.

## 6. Studio

Обычный upload артефакта теперь идёт `Request.body -> TransformStream limiter -> R2`. Это убирает обязательную вторую 12 MiB копию в памяти Worker. Сгенерированные изображения и Whisper остаются bounded binary flows, потому что соответствующие provider API требуют материализованный результат/вход.

## 7. Execution Engine

Первый безопасный structural split сделан без изменения state machine: parser/history вынесены в pure module `execution-protocol.ts`, а старые экспорты сохранены. Более глубокое разбиение executor/recovery/tool effects имеет смысл только после полного Node 24 dependency-backed test gate.

## 8. Verification

Локально проверяются migration 015 idempotency, восемь targeted runtime assertions, TypeScript syntax-transpile, relative imports, JSON/JSONC/YAML/shell syntax, release-preflight, schema smoke, source manifest и ZIP byte integrity. Production publish остаётся заблокированным.

## Оставшиеся release gates

Нужны Node 24+, успешный `npm ci`, полный `npm run typecheck`, полный Vitest, `wrangler deploy --dry-run` для staging/production и staging smoke миграции 015. Только после этого RC можно переводить к release-candidate merge/deploy решению.
