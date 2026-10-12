# START HERE — AZRAIL 1.5.0-rc.63

Это чистый source-пакет для будущего репозитория. Production release здесь **не выполнен**.

## Читать в таком порядке

1. `README.md` — карта репозитория и текущие границы.
2. `docs/current/REPOSITORY_AUDIT_RU.md` — что проверено во всех файлах и что было очищено.
3. `docs/current/RELEASE_STATUS_RU.md` — фактический release-status и блокеры.
4. `docs/current/REPO_LAYOUT_RU.md` — правила структуры репозитория.
5. `DEPLOY_RU.md` — безопасный deploy/release gate.
6. `docs/runbooks/NODE24_VERIFICATION_RU.md` — canonical Node24 suite.
7. `docs/runbooks/STAGING_MIGRATION_RU.md` → `STAGING_DEPLOY_RU.md` → `STAGING_SMOKE_RU.md`.
8. `docs/runbooks/SECURITY_VERIFICATION_RU.md`.
9. `docs/runbooks/BACKUP_RESTORE_PROOF_RU.md`.
10. `docs/runbooks/PRODUCTION_APPROVAL_RU.md` → `GITHUB_PR_RU.md` → `PRODUCTION_RELEASE_RU.md`.

## Проверка после распаковки

```sh
npm run repo:exhaustive
npm run repo:hygiene
npm run quality:static
```

Для полного подтверждения release candidate нужен Node 24.18.0 и зависимости:

```sh
npm ci
npm run node24:suite
```

## Правило удалённых систем

При подготовке ZIP GitHub, Cloudflare и Canva используются только read-only. В будущем опубликованном репозитории push в `main` может автоматически развернуть **только staging** после полного Verify и при наличии GitHub Environment secrets. Production остаётся отдельным fail-closed release и не автоматизируется этим workflow.

## История

Старые changelog/verification/audit-файлы не лежат в корне:

- `docs/history/changelog/`
- `docs/history/audits/`
- `verification/history/rc/`
- `references/legacy/`

Текущий changelog: `docs/releases/CHANGELOG_1.5.0-rc.63.md`.
