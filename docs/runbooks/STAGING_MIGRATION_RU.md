# Staging Migration Runbook

## Статус RC39

Этап №30 **подготовлен, но не применён**. В этом RC запрещены любые удалённые изменения Cloudflare без отдельной команды пользователя.

Read-only инспекция staging показала:

- Worker: `azrail-pulse-staging`;
- D1: `azrail-db-staging`;
- compatibility date: `2026-09-29`;
- `schema_migrations` сейчас отсутствует;
- `missions.result_json` уже существует, поэтому migration `002-mission-async.sql` должна быть **baselined**, а не повторно применена;
- базовые таблицы migrations 003-009 уже присутствуют;
- удалённых записей, deploy или migration apply во время инспекции не выполнялось.

## Fail-closed последовательность

```text
Node24 VERIFIED receipt for exact RC
        ↓
staging:migration:check
        ↓
staging:migration:simulate
        ↓
review .work/staging-migration-preparation.json
        ↓
explicit user authorization for Cloudflare mutation
        ↓
AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND
AZRAIL_STAGING_MIGRATION_APPROVAL=<exact package version>
        ↓
db:migrate:staging:apply
        ↓
independent D1 backup
        ↓
private R2 backup copy
        ↓
002 baseline
003..030 apply/verify
        ↓
migration ledger checksum verification
        ↓
NO Worker deployment yet
```

## Команды до разрешения на mutation

```bash
npm run staging:migration:check
npm run staging:migration:simulate
```

Обе команды локальные и не меняют Cloudflare.

## Применение - только после отдельного разрешения

```bash
export AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND
export AZRAIL_STAGING_MIGRATION_APPROVAL=$(node -p "require('./package.json').version")
npm run db:migrate:staging:apply
```

Команда должна оставаться заблокированной, если Node24 receipt отсутствует, не `VERIFIED`, относится к другой версии, либо нет обоих explicit interlocks.

## После migration

Worker всё ещё не деплоится. Следующий отдельный этап - staging deploy, затем authenticated smoke, security verification и restore proof.
