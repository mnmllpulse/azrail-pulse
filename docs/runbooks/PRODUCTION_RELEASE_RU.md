# Production Release — AZRAIL 1.5.0-rc.51

Stage D #38 — **только потом production release**. Этот runbook готовит релиз, но сам по себе не разрешает production mutation. `+` не является production approval.

## Жёсткая последовательность

1. Node24 exact-release suite = `VERIFIED`.
2. Staging migration = `APPLIED`; staging deploy = новый deployment; authenticated smoke = `VERIFIED`; security = `VERIFIED`.
3. Backup/restore: local proof + disposable Cloudflare drill = verified.
4. Production Approval receipt ещё действителен и привязан к точному `SOURCE_MANIFEST.json`.
5. Exact GitHub release PR опубликован, fresh Verify CI успешен, diff проверен и PR merged.
6. Непосредственно перед mutation создаётся **read-only live lease**: текущий GitHub `main` SHA, current production deployment/version и свежий D1 Time Travel bookmark.
7. Canonical Wrangler production dry-run.
8. Production D1 migration через `scripts/migrate.mjs --remote --apply --config wrangler.production.json`. Скрипт обязан экспортировать D1 и скопировать backup в private production R2 **до первой schema write**. Для текущей observed legacy production путь начинается с migration `002` и идёт до `030`.
9. Worker deploy только после успешной migration. Production OIDC issuer/client передаются как explicit Wrangler `--var`; `--keep-vars` запрещён, чтобы не сохранять legacy `CORS_ORIGIN=*`.
10. После deploy — новый deployment/version ID, exact `/health.version == 1.5.0-rc.51`, authenticated production smoke, security verification, затем fresh production drift reconciliation = `ALIGNED`.
11. Legacy `AZRAIL_TOKEN` разрешается revoke/rotate только после доказанного OIDC cutover.
12. Только после всего этого создаётся `.work/production-release-verified.json` со статусом `VERIFIED_RELEASED`.

## Безопасные команды подготовки

```sh
npm run production:release:check
npm run production:release:simulate
npm run production:release:plan
```

`npm run production:release:apply` — remote mutation path и сейчас обязан быть BLOCKED. Он требует exact receipts, fresh live lease, Node >=24 и отдельные explicit owner/cloud unlock переменные.

## Rollback

Перед mutation live lease должен содержать прежний Worker deployment/version и свежий D1 bookmark. Автоматический D1 restore запрещён: rollback базы — отдельное production mutation решение после диагностики. Сначала оценивается возможность Worker rollback без отката данных; D1 Time Travel используется только когда schema/data incompatibility действительно требует восстановления.
