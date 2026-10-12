# AZRAIL PULSE 1.5.0-rc.44 — Stage 30 / Backup & Restore Proof

## Scope

Stage D #35 подготовлен без GitHub/Cloudflare/Canva mutations. Live production/staging restore не выполнялся.

## Read-only Cloudflare evidence

- зафиксированы текущие D1 Time Travel bookmarks для `azrail-db` и `azrail-db-staging`;
- snapshot содержит только database identity/bookmark metadata;
- secret values не читались и не сохранялись;
- D1/R2 writes и restore calls не выполнялись.

## Backup/restore contract

Добавлены:

- `verification/backup-restore-readonly-snapshot.json`;
- `verification/backup-restore-contract.json`;
- `scripts/check-backup-restore-proof.mjs`;
- `scripts/backup-restore-simulate.mjs`;
- `scripts/backup-restore-plan.mjs`;
- `scripts/lib/production-legacy-fixture.mjs`;
- `docs/runbooks/BACKUP_RESTORE_PROOF_RU.md`.

`backup:restore:strict` требует реального disposable Cloudflare recovery receipt и запрещает live production restore.

## Local D1 restore drill

Production-compatible legacy fixture экспортируется в logical SQL backup, backup получает SHA-256, source намеренно изменяется после backup, а restore выполняется в новую SQLite DB. Schema/data fingerprints должны совпасть с pre-backup state. Tampered backup отклоняется до restore. После restore выполняется migration path 002–029, затем additive 003–029 повторно проверяются на idempotency.

## Local R2 restore drill

Manifest v2 хранит path/key/size/SHA-256. Все объекты валидируются до первой записи в новый target. Unicode path round-trip проверен. Повреждённый object блокирует restore до создания target.

## Secret recovery boundary

Backup receipts не содержат credential values. Disaster recovery credentials должны re-provision/rotate из внешнего secret authority; ZIP не является secret backup.

## Verification results

- backup/restore preparation: 23 PASS;
- local disposable D1+R2 restore drill: PASS;
- negative mutation-free evidence test: expected exit 1;
- strict backup/restore proof: expected BLOCKED because disposable Cloudflare restore was not authorized/executed;
- static quality gate: 38 passed / 0 failed / 0 blocked — VERIFIED;
- full quality gate: 38 passed / 0 failed / 5 blocked — BLOCKED;
- UI TypeScript: PASS;
- TypeScript syntax transpile: 254 files / 0 diagnostics;
- Node24 suite: BLOCKED under Node 22.16.0;
- release package: blocked by non-VERIFIED Node24 receipt;
- release preflight: PASS with existing production OIDC warning.
