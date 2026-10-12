# Stage D #32 — authenticated staging smoke

Цель этапа — доказать, что **уже развёрнутый** staging RC отвечает корректно на безопасные read-only запросы. Этот этап не заменяет Node24 suite, migration или deploy proof и не выполняется до них.

## Жёсткие границы

Smoke использует только `GET`. Он не запускает миссии, модели, MCP tools, загрузки, approvals, backup/restore, queue writes или любые другие mutation-paths. Credential передаётся только через environment (`AZRAIL_SESSION_COOKIE` для OIDC или `AZRAIL_TOKEN` для token mode) и не сохраняется в receipt.

## Что проверяется

1. public shell доступен;
2. `/api/me` без auth возвращает `401`;
3. прямой `/agents/...` остаётся закрыт `404`;
4. authenticated identity читается;
5. `/health` возвращает `healthy`, **точную текущую RC-версию**, а D1/KV/R2 проходят реальные read round-trip;
6. agent registry доступен;
7. routing policy читается;
8. Studio capabilities читаются;
9. Pulse Lab доступен;
10. Ledger read surface доступен;
11. Connections read surface доступен и не содержит secret-like полей.

## Почему нужен post-deploy Cloudflare snapshot

Успех команды deploy ещё не доказывает, что smoke идёт против нового active deployment. После разрешённого staging deploy нужно read-only получить новый deployment/version ID, обновить `verification/staging-smoke-readonly-snapshot.json`, выставить `post_deploy=true`, и только затем запускать smoke.

## Порядок

```sh
npm run staging:smoke:check
npm run staging:smoke:plan
```

После выполненных Node24/migration/deploy prerequisites и свежего post-deploy snapshot:

```sh
export AZRAIL_SESSION_COOKIE='__Host-pulse-session=<live-session>'
export AZRAIL_EXPECTED_STAGING_DEPLOYMENT='<deployment-id-from-readonly-snapshot>'
npm run staging:smoke:run
```

Успешный запуск создаёт `.work/staging-smoke-verified.json` со статусом `VERIFIED`. В нём нет cookie/token.

## Локальная симуляция

```sh
npm run staging:smoke:simulate
```

Симуляция запускает локальный HTTP fixture, доказывает положительный сценарий и отдельный negative case: если `/health.version` не совпадает с текущей RC, smoke обязан завершиться `FAILED`.

## Сейчас

До отдельного разрешения пользователя Cloudflare deploy/migration не выполняются. Поэтому Stage D #32 может быть только **PREPARED / BLOCKED FOR REAL SMOKE**, а не `VERIFIED`.
