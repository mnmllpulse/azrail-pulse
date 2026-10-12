# Развёртывание AZRAIL 1.5.0-rc.63

> **RC / LOCAL HARDENING. Публикация заблокирована.** Этот документ не является разрешением на GitHub push, Cloudflare deploy или production migration. Такие действия выполняются только после отдельного человеческого одобрения.

## 1. Источник истины

- версия: `package.json`;
- staging config: `wrangler.staging.json`;
- production config: `wrangler.production.json`;
- migration runbook: `docs/runbooks/MIGRATIONS_RU.md`;
- release status: `docs/current/RELEASE_STATUS_RU.md`.

Canonical source of truth: `config/environments.json`. Файлы `wrangler.staging.json` и `wrangler.production.json` генерируются командой `npm run config:generate`; ручное редактирование generated configs запрещено.

## 2. Локальный release gate

Требуется **Node.js >=24**.

```sh
npm ci
npm run version:check
npm run docs:check
npm run migrations:check
npm run release:preflight
npm run cloud:drift:staging
npm run check
npm run build:check:staging
npm run build:check:production
```

Если среда не Node 24 или dependency install не завершён, полный release gate считается **не подтверждённым**.

## 3. Cloudflare drift gate

Read-only проверка текущего snapshot:

```sh
npm run cloud:drift:staging
npm run cloud:drift:production
```

`production` сейчас ожидаемо блокируется до отдельного reconciliation plan. Детектор ничего не изменяет в Cloudflare.

## 4. Migration planning / RC40 staging preparation

Подготовка без remote mutation:

```sh
npm run staging:migration:check
npm run staging:migration:simulate
npm run db:migrate:staging:plan
npm run db:migrate:production:plan
```

Read-only Cloudflare inspection подтверждает: staging D1 пока без `schema_migrations`, но с уже существующей `missions.result_json`. Поэтому migration 002 baseline-ится, migrations 003–030 проверяются как additive. Remote apply остаётся запрещён до отдельного разрешения; см. `docs/runbooks/STAGING_MIGRATION_RU.md`.

## 5. Staging deploy preparation и future auto-deploy

До разрешения на cloud mutation доступны только:

```sh
npm run staging:deploy:check
npm run staging:deploy:plan
```

`staging:deploy:plan` остаётся `BLOCKED`, пока нет Node24 VERIFIED receipt, staging migration APPLIED receipt и canonical UI build proof. Для будущего опубликованного GitHub-репозитория добавлен `.github/workflows/staging-auto-deploy.yml`: push в `main` сначала запускает полный Verify, затем через GitHub Environment `staging` выполняет guarded `deploy:ci`. Для этого в GitHub должны быть настроены Cloudflare credentials и `OIDC_CLIENT_SECRET`. Это не разрешает production deploy. См. `docs/runbooks/STAGING_DEPLOY_RU.md`.

## 6. Staging smoke / RC41

До реального smoke доступны только безопасные команды:

```sh
npm run staging:smoke:check
npm run staging:smoke:simulate
npm run staging:smoke:plan
```

`staging:smoke:run` требует точную RC, успешные Node24/migration/deploy receipts, свежий post-deploy Cloudflare deployment ID и live credential только через environment. Smoke делает только GET и не запускает модели/миссии/tools. См. `docs/runbooks/STAGING_SMOKE_RU.md`.

## 7. Staging-first

Будущий release выполняется только в порядке: backup → staging migration → staging deploy → authenticated smoke → security verification → restore proof. Production до завершения этих шагов не изменяется.

## 8. GitHub/Cloudflare

Текущий ZIP сам ничего не публикует. После будущей публикации репозитория успешный push в `main` может автоматически обновлять **Cloudflare staging** через отдельный workflow. Cloudflare production и production D1 не обновляются автоматически; production остаётся approval/PR/release-gated.

## 9. Опасные операции

Remote migration apply требует `AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND`. Generic deploy scripts этого RC дополнительно заблокированы. Не отключайте interlock ради удобства.

## RC42 — Security gate

Перед production approval требуется exact-release staging security receipt. Сначала `npm run security:verify:plan`; `security:verify:run` остаётся заблокирован до Node24, staging migration/deploy/smoke. Сам security runner read-only и использует только GET/OPTIONS.


## RC43 — Production drift reconciliation

Stage D #34 выполняется только read-only. `npm run production:drift:check` строит текущую drift matrix, `npm run production:drift:simulate` локально проверяет migration 002–030 на fixture текущей production schema, `npm run production:drift:plan` выдаёт упорядоченный reconciliation plan. Production mutation по-прежнему запрещена.


## RC44 — Backup / Restore Proof

Перед production approval требуется не только наличие backup, но и restore drill. В текущем RC безопасно выполняются только:

```sh
npm run backup:restore:check
npm run backup:restore:simulate
npm run backup:restore:plan
```

`backup:restore:simulate` восстанавливает production-compatible legacy D1 fixture в новую disposable DB, сравнивает schema/data fingerprints, проверяет tamper rejection, затем применяет migrations 002–030. Отдельно проверяется R2-style manifest restore с SHA-256-before-write. Live Cloudflare restore не выполняется без отдельного разрешения. См. `docs/runbooks/BACKUP_RESTORE_PROOF_RU.md`.


## RC46 — Production Approval Gate

Перед GitHub PR требуется Stage D #36. Сначала выполняются read-only/local checks:

```sh
npm run production:approval:check
npm run production:approval:plan
```

`production:approval:authorize` допускается только при полном наборе Node24/staging/security/backup evidence, проверенных production OIDC issuer/client ID, policy preview URLs (`disabled` или `access-protected`), reviewed production deployment lease и точной owner-фразе. Команда создаёт только `.work/production-approval.json`; Cloudflare/GitHub/Canva она не изменяет. Receipt истекает через 24 часа и инвалидируется при изменении source manifest, GitHub base SHA или production deployment.
