# Stage D #35 — Backup / Restore Proof

## Цель

Backup считается доказанным только после **restore drill**. Этот этап не разрешает восстановление поверх live `azrail-db` или `azrail-db-staging` и не меняет GitHub/Cloudflare/Canva.

## Что уже доказано локально

`npm run backup:restore:simulate` создаёт production-compatible disposable fixture из read-only наблюдаемой legacy production schema, затем:

1. делает logical SQL backup;
2. фиксирует SHA-256 backup;
3. изменяет source после backup, чтобы доказать, что restore действительно возвращает прежнее состояние;
4. восстанавливает backup в **новую** SQLite DB;
5. сравнивает schema/data fingerprints до backup и после restore;
6. намеренно портит backup и доказывает rejection **до restore**;
7. применяет migrations 002–032 к восстановленной DB и проверяет сохранность legacy данных;
8. повторно применяет additive migrations 003–032 для idempotency;
9. отдельно проверяет R2-style manifest restore: size + SHA-256 каждого объекта валидируются до первой записи в новый target;
10. повреждённый R2 object блокирует restore до создания target.

## Live Cloudflare evidence — только чтение

В `verification/backup-restore-readonly-snapshot.json` сохранены только имена/ID D1 и текущие Time Travel bookmarks production + staging. Secret values не читались и не сохранялись.

## Canonical migration backup ordering

`scripts/migrate.mjs` обязан выполнять:

```text
D1 export
  ↓
local SQL file
  ↓
private environment R2 copy
  ↓
только затем schema_migrations bootstrap / migration apply
```

Если R2 backup bucket отсутствует, migration apply останавливается.

## Application project backups

`src/lib/backups.ts` сохраняет manifest с path/key/size/SHA-256 и восстанавливает backup только:

- в новый `projectId`;
- в пустой target;
- после полной проверки manifest, размеров и SHA-256 всех объектов;
- через project lock;
- через Unified Approval Engine для restore action.

Текущая рабочая revision не перезаписывается на месте.

## Secrets

Cloudflare secrets не должны попадать в SQL/R2 backup, ZIP, logs или verification receipts. Disaster recovery для credentials означает:

```text
restore D1/R2
→ re-provision required secret names from an external secret authority
→ rotate/revoke as needed
→ verify OIDC/connectors
```

Secret value нельзя «восстановить» из этого репозитория, потому что он намеренно его не хранит.

## Что ещё нужно для strict proof

Локальный drill недостаточен для production approval. После отдельного разрешения владельца нужен disposable Cloudflare recovery environment, не production и не текущий staging. В нём надо доказать реальный D1/R2 restore, re-provision secrets, smoke/security и сохранить `.work/backup-restore-cloud-drill.json` со статусом `VERIFIED_DISPOSABLE_CLOUD` и `production_targeted=false`.

До этого:

```text
npm run backup:restore:check     # PASS preparation
npm run backup:restore:simulate  # PASS local disposable drill
npm run backup:restore:plan      # показывает remote blockers
npm run backup:restore:strict    # ожидаемо BLOCKED
```

Production restore в Stage 30 запрещён.
