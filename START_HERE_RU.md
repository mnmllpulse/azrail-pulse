# START HERE — AZRAIL 1.5.0-rc.63

Это исходники опубликованного репозитория `mnmllpulse/azrail-pulse` (закрытый, ветка `main`). Состояние на 20 ноября 2026: рабочий воркер обновляется автоматически после слияния PR в `main`; строгий production release с квитанцией `VERIFIED_RELEASED` **не выполнен**, статус — CONDITIONAL.

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

## Как выкладывается сейчас

- Слияние PR в `main` → GitHub Actions: полный Verify, затем автодеплой **staging** и проверка `/health/live`.
- Рабочий воркер `azrail-pulse` собирает и выкладывает Cloudflare Workers Builds, подключённый к репозиторию. Проверки GitHub эту сборку не блокируют, поэтому PR сливают только после зелёных проверок.
- Workflow `deploy.yml` для production отключён. Строгий контур `production:*` описан в runbooks, но ежедневно не используется.
- Секреты хранятся только как секреты Worker; в чат и репозиторий их не присылают.

Что устроено в продукте: `docs/current/CHAT_RU.md` (единый чат), `docs/current/MODELS_RU.md` (модели и OpenRouter), `docs/NEURON_BUDGET.md` (платные модели и нейроны), `docs/LOCAL_AGENT.md`.

## История

Старые changelog/verification/audit-файлы не лежат в корне. Сводки: `docs/history/CHANGELOG_ARCHIVE.md`, `docs/history/AUDITS_SUMMARY.md`. Полные тексты: ветка `archive/docs-2026-11`.

- `verification/history/rc/`
- `references/legacy/`

Текущий changelog: `docs/releases/CHANGELOG_1.5.0-rc.63.md` (раздел «После rc.63» перечисляет изменения без повышения версии).
