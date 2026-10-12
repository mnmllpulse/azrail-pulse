# AZRAIL PULSE 1.5.0-rc.5 — инженерный аудит, проход 4

## Область прохода

Mission outbox/delivery, uncertain provider outcomes, monetary settlement, connector reconciliation, OIDC/session edge cases, SSRF boundary, migration integrity и release safety.

## P0/P1 — исправленные дефекты

### 1. Outbox доверял сохранённому `params` сильнее, чем persisted mission

`mission_outbox.params` содержит `missionId`, `projectId`, goal и лимит итераций. До RC5 delivery-path парсил JSON и передавал его Orchestrator без строгой сверки `projectId` с реальной строкой `missions`. Повреждённый/устаревший payload мог стать poison-message: повторяться после ошибки либо попытаться адресовать Durable Object другого проекта.

RC5 строит доставку из JOIN `mission_outbox -> missions`, проверяет совпадение mission/project, границы goal/maxIterations и опциональных полей. Невалидная запись переводит ещё queued mission в `failed`, помечает outbox delivered и пишет `outbox.quarantined`. Transient edge/DO failure при валидном payload по-прежнему остаётся retryable.

### 2. Не было полной provenance-карты денежного резерва

`model_calls` хранит только один `scope`, хотя строгий вызов может резервировать одновременно mission/project/month/global scopes. При provider timeout статус становился `uncertain`, но надёжно восстановить все затронутые бюджеты было невозможно. Любая последующая ручная корректировка рисковала освободить/начислить не те лимиты.

RC5 добавляет `model_call_budget_scopes` и записывает mapping в той же D1 batch-транзакции, что `model_calls` и `spend_limits`. При неизвестном outcome резерв сохраняется консервативно. После внешней проверки оператор может один раз вызвать reconciliation с фактической стоимостью и evidence; все scopes корректируются атомарно. Старые calls без mapping не угадываются — reconciliation для них fail-closed.

### 3. Не было безопасного завершения `uncertain` connector write

Для MCP side effect уже был правильный принцип «если request мог уйти, автоматически не повторять». Но после ручной проверки внешнего сервиса не существовало формального пути сообщить системе финальный outcome и согласовать resource ledger.

RC5 добавляет `connector_reconciliations`: разрешены только `succeeded`, `failed`, `not_executed`, обязательно evidence. Запись привязана к `(call_id, account_id)`, исход меняется только из `uncertain`, conflicting reconciliation блокируется. `not_executed` освобождает reservation, `succeeded/failed` учитывают один фактический request. Повтор того же reconciliation идемпотентен и не меняет quota второй раз.

### 4. Политика внешних HTTPS endpoints была продублирована

Connector policy имела более строгую SSRF-проверку, OIDC — отдельную и более узкую. Параллельные validators постепенно расходятся и увеличивают вероятность, что новый внешний endpoint обойдёт часть правил.

RC5 вводит `validateTrustedHttpsUrl()` как общий boundary для MCP/OAuth/OIDC: HTTPS, 443/default port, без credentials/hash, domain-like hostname, запрет localhost/local/internal/test/invalid и numeric/IP-like host. OIDC discovery endpoints допускают provider query string только там, где это нужно; issuer — нет.

Ограничение остаётся: синтаксическая hostname-проверка сама по себе не является DNS-resolution firewall. Для произвольных пользовательских URL в будущем нужен egress allowlist/resolver policy. Текущие connector endpoints выбираются из server policy, а OIDC issuer — operator config, поэтому residual risk контролируем, но не объявляется нулевым.

### 5. OIDC sessions могли расти без верхней границы между cleanup-проходами

После успешной аутентификации RC5 оставляет максимум 10 самых новых server-side sessions на account. TTL/cron cleanup сохраняется; cap снижает накопление активных bearer-equivalent session rows и упрощает incident response.

## Migration / schema

Добавлена `010-reconciliation-hardening.sql`:

- `model_call_budget_scopes`;
- `connector_reconciliations`;
- индексы для scope/account reconciliation.

`scripts/migrate.mjs` включает migration 010 и проверяет наличие обеих таблиц после применения. `release-preflight.mjs` также требует их в canonical schema. Fresh `schema.sql` успешно парсится, а повторное применение именно migration 010 идемпотентно.

## P2 — release integrity

Во время повторной проверки RC5 обнаружен собственный дефект release-preflight: проверки migration 010 вызывали `fail()` до объявления `const fail`. При нормальной схеме ветка не исполнялась, поэтому happy-path проходил, но намеренно сломанная schema дала бы TDZ exception вместо управляемого PRECHECK FAIL. Порядок объявления исправлен. Одновременно исправлена устаревшая фраза README, ошибочно утверждавшая, что в RC5 нет новой SQL migration.

## Targeted runtime validation

На реально транспилированном RC5-коде локальными SQLite/D1 stubs воспроизведены:

1. cross-project/corrupt outbox -> Orchestrator не стартует, mission failed, outbox quarantined;
2. provider exception после двух hierarchical money reservations -> `uncertain`; reconciliation actual=0 освобождает обе области ровно один раз;
3. uncertain connector + resource reservation -> explicit `not_executed` даёт `cancelled` + released ledger; повтор не освобождает quota второй раз;
4. trusted endpoint boundary отклоняет HTTP, localhost, numeric loopback, URL credentials и disallowed query, принимает валидный Cloudflare Access HTTPS issuer.

## Остаточные блокеры до production

RC5 остаётся review candidate. Обязательны свежие `npm ci`, semantic TypeScript typecheck, full Vitest, Wrangler staging dry-run, migration against a disposable staging DB, staging smoke и только затем production dry-run/deploy decision.

Production OIDC issuer/client в ZIP намеренно не угадываются. GitHub и Cloudflare в этом проходе использовались только read-only; remote state не изменялся.
