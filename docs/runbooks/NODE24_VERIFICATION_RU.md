# Node24 Verification Runbook

Stage D / пункт 29 требует отдельного канонического verification pass под Node.js 24. Node 22, fallback UI build и historical receipts не считаются доказательством.

## Каноническая среда

Репозиторий фиксирует reference runtime в `.nvmrc` и `.node-version`:

```text
24.18.0
```

Cloudflare Workers Builds использует Node.js 24 по умолчанию, но локальный release proof всё равно должен быть получен из текущего RC и текущего lockfile.

## Чистый запуск

```bash
npm run node24:suite:install
```

Команда выполняет `npm ci`, затем обязательные проверки:

1. version truth;
2. documentation truth;
3. migration integrity;
4. canonical config;
5. lint / format / security;
6. полный TypeScript typecheck;
7. canonical esbuild UI build;
8. Vitest;
9. Wrangler staging dry-run;
10. Wrangler production dry-run;
11. release preflight.

Результат пишется в `.work/node24-suite.json`.

## Fail-closed правило

Production packaging разрешён только если receipt:

- имеет `status = VERIFIED`;
- относится к точной текущей версии `package.json`;
- получен под Node >=24.

`BLOCKED` или `FAILED` не превращаются в green status.

## Что suite НЕ делает

Node24 suite не выполняет GitHub push/PR/merge, Cloudflare deploy, remote D1 migration, KV/R2 mutation и Canva edit. Authenticated runtime smoke остаётся отдельным этапом, потому что требует уже развёрнутый URL и credential.
