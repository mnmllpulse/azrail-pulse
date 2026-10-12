# AZRAIL PULSE 1.5.0-rc.14

RC14 усиливает delivery fencing, writer fencing, безопасные preview-механизмы хранения и memory discipline Studio.

## Изменения

- Добавлено durable поколение доставки миссии `mission_delivery_state`. Любая recovery увеличивает generation, а старые Durable Object schedule-задачи больше не могут запустить или отметить доставленной новую итерацию той же миссии.
- Исправлены две найденные в самом RC14 delivery-гонки: blocked recovery больше не может частично увеличить generation/reset outbox, а acknowledgement текущего schedule остаётся валидным, даже если задача успела перейти `queued → executing` до записи `delivered=1`.
- `workspace_heads` теперь публикуется только при одновременном совпадении optimistic base prefix и точного project fencing lease (`owner + lease_id + fence_token`). Stale writer не может переключить HEAD даже внутри окна между pre/post fence checks.
- `publishWorkspace()` требует `ProjectLease`; lease протянут через restore backup, sandbox export и rollback.
- R2 GC остаётся строго dry-run, но `scope=all` теперь распределяет bounded scan между namespaces и не выдаёт orphan-кандидаты при неполном D1 reference set.
- Retention preview использует `ROW_NUMBER() OVER (PARTITION BY ...)`, поэтому один большой project/account не вытесняет остальные из bounded preview.
- Voice Studio больше не разворачивает аудио в многомиллионный JavaScript `number[]`; Whisper получает binary `ArrayBuffer`. Реальный Workers AI inference всё ещё должен быть подтверждён на staging.
- Legacy Firebase reference config очищен от environment-specific credential-like/public identifiers и заменён безопасными placeholders.
- Добавлена additive idempotent migration `014-delivery-workspace-retention.sql` и regression-suite `tests/rc14-hardening.test.ts`.

## Ограничения

GitHub/Cloudflare mutations и deploy не выполнялись. Среда проверки использует Node 22.16.0 при требовании проекта Node >=24; bounded `npm ci` не завершился, поэтому dependency-backed typecheck, полный Vitest и Wrangler dry-run остаются release gates.
