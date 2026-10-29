# Stage D #33 — Security verification

RC: `1.5.0-rc.43`.

Этот этап готовит **post-deploy security verification** для staging. Он не является доказательством production security до тех пор, пока exact RC не пройдёт Node24, staging migration, staging deploy и authenticated staging smoke.

## Политика

- только `azrail-pulse-staging`;
- runtime security probe использует только `GET` и `OPTIONS`;
- никаких model calls;
- никаких Cloudflare/GitHub/Canva mutation;
- credentials передаются только через process environment и не попадают в receipt;
- wildcard CORS запрещён;
- production остаётся нетронутым.

## Локальные проверки

```sh
npm run dependency:check
npm run sbom:build
npm run security:check
npm run security:verify:check
npm run security:verify:simulate
npm run security:verify:plan
```

`security:verify:plan` намеренно остаётся `BLOCKED`, пока отсутствуют:

- `.work/node24-suite.json` со статусом `VERIFIED` для exact RC;
- `.work/staging-migration-applied.json`;
- `.work/staging-deploy-applied.json`;
- `.work/staging-smoke-verified.json`;
- live OIDC session/token только в runtime environment;
- цепочка SHA-256 у новых событий (`event_integrity`, миграция 030) должна проходить проверку `audit-integrity`;
- `.work/dependency-cve-audit.json` со статусом `VERIFIED` для exact RC: Node 24, живой `npm audit --json`, high=0 и critical=0. Moderate и low остаются в отчёте и не прячутся.

## Реальный staging security run

После выполнения prerequisites:

```sh
export AZRAIL_SESSION_COOKIE='__Host-pulse-session=...'
# либо AZRAIL_TOKEN для legacy/token режима
npm run security:verify:run
```

Runner проверяет strict CORS, security headers, unauthenticated/admin boundaries, authenticated identity boundary, отсутствие secret-like data и exact `/health.version`. Receipt: `.work/staging-security-verified.json`.

## Журнал и реестр

Новые события пишутся в `event_integrity` со связкой SHA-256 и запретом развилки на одном предшественнике. Проверка пересчитывает цепочку. Старые строки журнала без этой связки остаются читаемыми.

Реестровый аудит:

```sh
node scripts/dependency-cve-audit.mjs
```

`VERIFIED` ставится только когда реестр ответил и high/critical равны нулю. Иначе отчёт `FAILED`, и живой security run не стартует. Пустую отметку без ответа реестра скрипт не пишет.

Этот прогон не одобряет бой и не делает выклад.
