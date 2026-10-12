# Архитектурный аудит AZRAIL PULSE 1.5.0-rc.14

## Цель прохода

RC14 проверяет четыре зоны: mission delivery/DO races, workspace publication fencing, R2/retention preview correctness и Studio memory pressure. Изменения сделаны только в локальном кандидате; GitHub и Cloudflare использовались read-only.

## 1. Mission delivery generation

До RC14 scheduled задача Durable Object не имела отдельного durable поколения. Recovery могла переиспользовать тот же mission ID, а старая schedule-задача сохраняла возможность проснуться позже. Введена `mission_delivery_state(mission_id,generation,updated_at)`.

`startMission()` загружает canonical generation, schedule получает `deliveryGeneration`, а `runMissionTask()` перед `queued -> executing` сравнивает его с D1. Старое поколение немедленно завершается без исполнения.

Во время проверки найден дополнительный дефект уже новой реализации: три UPDATE в D1 batch могли вернуть false, но один из них успевал увеличить generation, если recovery блокировалась другой active mission или отсутствовал соседний durable record. Eligibility predicates выровнены: outbox и delivery state взаимно подтверждают существование друг друга и используют одинаковую проверку исходного mission status / active-project conflict. Regression runtime подтверждает отсутствие partial mutation. Дополнительно закрыта обратная гонка: schedule может стартовать настолько быстро, что mission уже `executing` до acknowledgement. `delivered=1` теперь привязан к generation, а не к кратковременному status=`queued`, поэтому текущая доставка не остаётся ложным pending outbox.

## 2. Workspace writer fencing

Одних fence checks до и после effectful tool недостаточно: stale writer мог потерять lease уже во время R2 staging и успеть переключить `workspace_heads` до post-check.

RC14 переносит fencing в сам D1 publication CAS. `publishWorkspace()` требует `ProjectLease`; head flip разрешён только если существует точная пара operation lock + project fencing lease с теми же `owner`, `lease_id`, `fence_token`, а текущий HEAD совпадает с наблюдавшимся base prefix. При утрате lease staged R2 tree очищается и HEAD не меняется.

## 3. R2 GC и retention

GC по-прежнему read-only. Исправлена starvation-модель `scope=all`: один большой prefix больше не может израсходовать весь scan budget до проверки остальных namespaces. Если D1 reference set truncated, orphan candidates вообще не вычисляются — fail closed.

Retention preview теперь ранжирует записи по владельцу: project versions — `PARTITION BY project_id`, Studio artifacts — `PARTITION BY account_id`. Текущий workspace head и snapshot-referenced versions остаются protected. Apply/delete endpoint намеренно отсутствует.

## 4. Studio voice memory

Старая конструкция `audio:[...bytes]` превращала бинарный файл в огромный массив JS numbers и резко увеличивала heap pressure. RC14 передаёт Whisper binary `ArrayBuffer`. Cloudflare documentation read-only подтверждает binary input как поддерживаемую форму Whisper, однако фактический inference на подключённом staging Worker в этом проходе не запускался.

## 5. Legacy config sanitation

Secret-pattern scan обнаружил environment-specific Firebase web configuration внутри legacy reference subtree. Этот subtree не является production source, но будущий публичный ZIP/GitHub не должен нести реальные environment identifiers без необходимости. Значения заменены placeholders; структура файла сохранена.

## Проверки

- release-preflight: PASS;
- targeted runtime: 8/8;
- TypeScript/TSX parser для `src + tests`: 176 файлов, 0 parse errors;
- relative imports `src + tests`: 625, missing 0;
- canonical schema: 51 application tables;
- migration 014: повторное применение PASS, legacy outbox backfill generation=1 PASS;
- strict JSON: 50 после добавления RC14 verification, плюс один JSONC `tsconfig.json`;
- YAML: 2/2; MJS syntax: 7/7; shell syntax: 5/5;
- credential-pattern scan: 0 real findings после sanitation.

## Release blockers

RC14 не называется production-ready. В текущей среде Node 22.16.0, тогда как `package.json` требует Node >=24. Bounded `npm ci` не завершился, поэтому полный dependency-backed `tsc`, полный Vitest, Wrangler staging/production dry-run и remote staging migration smoke остаются обязательными перед публикацией.
