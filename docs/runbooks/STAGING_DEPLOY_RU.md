# Staging Deploy Runbook

## Статус RC41

Stage D #31 **подготовлен, но не выполнен**. Worker `azrail-pulse-staging` не изменялся этим RC.

Read-only Cloudflare evidence зафиксировала текущий staging head:

- Worker: `azrail-pulse-staging`;
- compatibility date: `2026-09-29`;
- cron: `*/10 * * * *`;
- текущий deployment: `914363dc-2157-48a4-a28f-ac12fae38ef1`;
- текущая Worker version: `159daae0-edaf-4b7a-be85-3760974a5aa9`;
- D1/KV/R2/AI/Orchestrator и plain-text vars соответствуют canonical staging config на момент snapshot.

Ни GitHub, ни Cloudflare, ни Canva не изменялись.

## До отдельного разрешения владельца

Разрешены только локальные/read-only шаги:

```bash
npm run staging:deploy:check
npm run staging:deploy:plan
```

`staging:deploy:plan` ожидаемо остаётся `BLOCKED`, пока нет:

1. Node24 receipt со статусом `VERIFIED` для точной версии;
2. migration receipt со статусом `APPLIED` для точной версии;
3. canonical UI build proof (`esbuild`, `release_verified=true`).

## Fail-closed deploy

Даже после выполнения prerequisites deploy требует одновременно:

```bash
export AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND
export AZRAIL_STAGING_DEPLOY_APPROVAL=$(node -p "require('./package.json').version")
export AZRAIL_EXPECTED_STAGING_DEPLOYMENT=914363dc-2157-48a4-a28f-ac12fae38ef1
npm run deploy:staging:apply
```

Эти переменные не являются общим разрешением на production. Wrapper работает только с `wrangler.staging.json`.

Перед первым write он повторно требует exact-release receipts и выполняет canonical staging Wrangler dry-run. Если staging head изменился после read-only review, deployment lease должен быть обновлён только после новой read-only сверки.

## После будущего staging deploy

При успешной команде wrapper создаёт `.work/staging-deploy-applied.json` со статусом `DEPLOY_COMMAND_SUCCEEDED`, но это ещё не доказательство active deployment identity. Перед smoke нужно read-only получить новый Cloudflare deployment/version ID и обновить smoke snapshot. Следующий этап — **authenticated staging smoke**. Production, GitHub main и production D1 остаются замороженными.
