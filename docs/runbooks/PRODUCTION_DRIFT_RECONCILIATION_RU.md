# Production Drift Reconciliation — Stage D #34

Статус текущего live production относительно canonical RC: **ALIGNED**.

Этот этап исключительно read-only. Он не применяет D1 migrations, не меняет Worker settings/bindings, не отключает Preview URLs, не удаляет secrets, не выполняет GitHub push и не редактирует Canva.

## Источник истины

- target config: `wrangler.jsonc` рабочего сайта `azrail-pulse` (генерируется из `config/environments.json`);
- live evidence: `verification/production-drift-readonly-snapshot.json`;
- policy: `verification/production-drift-contract.json`;
- computed report: `.work/production-drift-reconciliation.json`.

## Безопасные команды

```sh
npm run production:drift:check
npm run production:drift:simulate
npm run production:drift:plan
```

`production:drift:check` проверяет evidence и строит drift matrix, но не считает наличие известного drift ошибкой самого инструмента. `production:drift:strict` предназначен для будущего post-release gate и завершается ненулевым кодом, пока production не станет `ALIGNED`.

## Сверка 3 ноября 2026

Сверка смотрит на рабочий сайт `azrail-pulse`, deployment `6038f423-3a37-412d-b2a3-a98e3e7ac739`, и на `wrangler.jsonc`. База `azrail-pulse-db` прочитана запросами SELECT: нужные таблицы на месте, запись не выполнялась. 3 ноября секрет `AZRAIL_TOKEN` снят, вход остаётся только почтой. Совпадений 42, расхождений нет, блокеров нет. Статус **ALIGNED**. Одно предупреждение: выкладка пришла из Wrangler, не из слитого запроса GitHub.

## Read-only snapshot 2026-10-10

Этот снимок снят 10 октября 2026. Его статус был **RECONCILIATION_REQUIRED**. Воркер `azrail-os` удалён 29 октября 2026 и рабочим сайтом не является. Цифры ниже описывают тот старый снимок.

Прежний Worker снимка: `azrail-os`.

Активный deployment: `473850a1-df43-47fb-b05e-0211ef9f7bae`, Worker version `476a3e6d-c066-484c-a0f8-d986bc630119` (version number 209), исторический source=`wrangler`.

Подтверждённые совпадения: production D1/KV/R2 identities, Workers AI binding, Assets binding, Orchestrator, Sandbox, cron `*/10 * * * *`, Workers plan `paid`, mission budget `1`, AI Gateway id `default`.

## Критический drift снимка 10 октября 2026

Live production всё ещё отличается от canonical RC по release-critical параметрам:

- compatibility date `2026-08-08` вместо `2026-09-29`;
- `AUTH_MODE=oidc` отсутствует;
- `PUBLIC_ORIGINS` отсутствует;
- `AZRAIL_METERING=observe` вместо `enforce`;
- `UNIFIED_LEDGER=true` отсутствует;
- legacy `CORS_ORIGIN=*` присутствует;
- production OIDC client/issuer не доказаны и не настроены в live bindings;
- Workers observability сообщает `null`/не настроено;
- `DAILY_PROVIDER_CALLS=200` отсутствует;
- Preview URLs включены и требуют отдельной Access-проверки либо отключения перед production approval;
- legacy secret binding `AZRAIL_TOKEN` всё ещё существует и должен оставаться до доказанного OIDC cutover, после чего — rotation/revocation через approval boundary.

## Схема базы в снимке 10 октября 2026

Production D1 `azrail-db` содержит реальные данные, поэтому никакого destructive reset быть не должно. Read-only inspection показал как минимум 3 projects, 15 missions, 251 legacy mission events и 44 task-history rows.

Live `missions` не имеет `result_json`, а также отсутствуют текущие RC sidecar/ledger tables: `schema_migrations`, `resource_owners`, `event_stream`, `trace_links`, `model_call_dimensions`, `release_evidence`, `connector_health_checks`.

Следовательно production migration reconciliation должна начинаться с **migration 002**, а не baseline 002 как на staging. Далее применяется последовательная numbered chain до текущей migration 033 через canonical migration planner с independent pre-migration backup.

Локальная `production:drift:simulate` строит fixture по реально наблюдённой production schema и проверяет migrations 002–032 без удаления legacy data; migrations 003–032 дополнительно переисполняются для проверки additive idempotency.

## Порядок, записанный 10 октября 2026

1. Не менять production на Stage D #34.
2. Закрыть Node24 и весь staging chain: migration → deploy → authenticated smoke → security verification.
3. На Stage D #35 доказать backup/restore для production-compatible data path.
4. Отдельно подтвердить корректные production OIDC client/issuer; staging значения не копировать автоматически.
5. Только после production approval применить reviewed migration plan (сейчас start=002) и canonical Worker config.
6. После проверенного OIDC cutover выполнить approval-gated rotation/revocation legacy `AZRAIL_TOKEN`.
7. Проверить/закрыть Preview URLs или защитить их Cloudflare Access.
8. После approved release запустить `npm run production:drift:strict` и требовать `ALIGNED`.

До этого production считается замороженным, а drift — известным и документированным, но не исправленным.
