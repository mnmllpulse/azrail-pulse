# Runbook: D1 migrations — AZRAIL 1.5.0-rc.17

## Принцип

По умолчанию migration tool работает **только как инспектор**. Планирование не меняет D1, R2 или Worker.

Migration ledger: `schema_migrations`

Поля: `version`, `filename`, `checksum`, `applied_at`, `applied_by`, `duration_ms`, `status`.

Если SHA-256 уже применённого файла отличается от записи в ledger, planner завершает работу с **BLOCKER**. Применённые migration-файлы нельзя переписывать — изменение оформляется новым номером.

## Планирование

```sh
npm run db:migrate:staging:plan
npm run db:migrate:production:plan
```

Результат:

- `.work/migration-plan.sql` — SQL для ревью;
- `.work/migration-plan.json` — версии, checksums, action/reason, target/config.

План обязан быть просмотрен до любого `--apply`.

## Apply gate

Remote apply технически требует одновременно:

1. `--remote --apply`;
2. `AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND`;
3. утверждённый migration plan;
4. staging-first выполнение.

Перед первой schema write скрипт делает D1 export. Для remote JSON-конфига export копируется в приватный R2 bucket выбранного окружения.

## Legacy baseline

Migration `002` не выполняется повторно, если `missions.result_json` уже существует. Вместо destructive/duplicate ALTER она фиксируется в ledger как `legacy-baseline:<actor>`. Остальные отсутствующие миграции выполняются по порядку.

## Чистая база

Для полностью чистой базы применяется canonical `schema.sql`; затем текущие migration checksums фиксируются как bootstrap baseline. Частично созданная legacy база без `missions`, но с `projects`/`conversations`, блокируется для ручного разбора.

## После apply

Скрипт проверяет обязательные таблицы и затем сверяет каждую ledger-запись с текущим filename/checksum/status. Worker deployment миграционный скрипт **не запускает**.
