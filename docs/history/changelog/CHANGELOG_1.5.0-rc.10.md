# AZRAIL PULSE 1.5.0-rc.10

Локальный hardening-кандидат. В рамках прохода GitHub и Cloudflare использовались только read-only; публикация, merge, deployment и cloud-write операции не выполнялись.

## Исправлено

- Mission outbox больше не считается самостоятельным источником истины. `missionId`, `projectId` и `goal` из `mission_outbox.params` сверяются с авторитетной строкой `missions`; повреждённый или устаревший payload блокируется до запуска.
- `Orchestrator.startMission()` больше не доверяет RPC-параметрам вызывающего кода: перед schedule он перечитывает D1, требует `queued` и точное совпадение с сохранённым delivery envelope.
- Recovery больше не переводит миссию в `queued` до очистки собственного stale lock и Durable Object delivery marker. Повторный запуск условно re-arm'ит `mission_outbox.delivered=0` и выполняет mission CAS в одной D1 batch-транзакции. Если eligibility/CAS не проходит (например, проект уже занят другой активной миссией), delivery-state также не изменяется; если immediate schedule падает уже после успешного requeue, outbox остаётся retryable.
- Persisted `mission_snapshots.r2_key` теперь проверяется по project scope и по `project_versions` с `created_by_agent='execution-engine'`. Чужой, повреждённый или потерявший provenance snapshot не используется автоматически.
- Исправлены две реальные semantic TypeScript ошибки, найденные dependency-free compiler probe: nullable `Response` перед `secureResponse()` и не суженный `page.cursor` перед `Set.add()` в project export.
- Release preflight закрепляет новые RC10-инварианты восстановления, snapshot provenance и compiler-narrowing.

## Архитектурный вывод

RC10 укрепляет принцип «persisted state > transport/RPC payload». После сбоя система восстанавливает работу только из авторитетных D1-связей, а не из параметров, которые могли устареть, повредиться или быть доставлены повторно.

## Release gates

RC10 остаётся review candidate. Перед публикацией обязательны свежие dependency-backed `npm ci`, semantic TypeScript typecheck, полный Vitest и Wrangler dry-run для staging/production. Production OIDC issuer/client по-прежнему не угадываются и должны быть подтверждены отдельно.
