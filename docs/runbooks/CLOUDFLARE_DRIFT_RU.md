# Cloudflare Config Drift — read-only runbook

Этот контроль сравнивает ожидаемую конфигурацию из `wrangler.staging.json` / `wrangler.production.json` с read-only snapshot фактически развернутых Cloudflare ресурсов.

## Гарантия безопасности

`npm run cloud:drift` **не вызывает Cloudflare API и ничего не изменяет**. Он только читает локальный JSON snapshot и локальные Wrangler-конфиги.

Snapshot должен быть получен отдельной read-only инспекцией и иметь `mutation_free: true`.

## Команды

```bash
npm run cloud:drift
npm run cloud:drift:staging
npm run cloud:drift:production
```

Отчет пишется в `.work/cloud-drift-report.json`.

## Статусы

- `PASS` — совпадает с release-конфигом.
- `WARNING` — не блокирует сам по себе, но требует ручной проверки.
- `DRIFT` — конфигурация отличается; release должен быть остановлен до решения.
- `BLOCKER` — опасное или обязательное несоответствие. Production release запрещен.

## Что проверяется

- Worker name;
- compatibility date / flags;
- D1, KV, R2 identities;
- Durable Object bindings;
- AI / Assets bindings;
- cron;
- AUTH_MODE;
- PUBLIC_ORIGINS;
- metering;
- mission budget и provider limits;
- unified ledger;
- OIDC client / issuer presence;
- wildcard CORS;
- существование D1/KV/R2 ресурсов в account inventory;
- observability, если поле доступно в snapshot.

## Release rule

Нельзя "исправлять" production автоматически по результату drift detector. Сначала: snapshot → diff → review → approved migration/config plan → staging proof → отдельное разрешение на production mutation.
