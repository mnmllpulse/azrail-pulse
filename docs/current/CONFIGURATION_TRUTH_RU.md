# Canonical Configuration Truth — AZRAIL 1.5.0-rc.20

Status: current

Единственный source of truth для Cloudflare environment-конфигурации:

`config/environments.json`

Активные `wrangler.staging.json` и `wrangler.production.json` являются **generated artifacts**. Их нельзя редактировать вручную.

## Команды

- `npm run config:generate` — детерминированно пересобирает оба Wrangler config из canonical model.
- `npm run config:check` — read-only gate: завершает работу с ошибкой, если generated config расходится с canonical model.

## Удалённые активные дубли

С RC18 больше не используются как активные конфиги:

- `wrangler.json`;
- `wrangler.paid.json`;
- `wrangler.free.example.toml`;
- `deploy/free.json`;
- `deploy/paid.json`.

Исторические копии сохранены только в `docs/archive/config-pre-RC18/` и исключены из clean release package.

## Production OIDC

`OIDC_CLIENT_ID` и `OIDC_ISSUER` для production намеренно не выдумываются. Production release остаётся заблокированным до их явной проверки и фиксации.
