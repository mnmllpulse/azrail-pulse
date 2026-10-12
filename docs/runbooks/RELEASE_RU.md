# Runbook: release gate — AZRAIL 1.5.0-rc.18

Порядок неизменяемый:

1. локальная проверка версии/документации/migrations;
2. Node 24 dependency install и полный test/type/build suite;
3. read-only Cloudflare drift report;
4. migration plan;
5. staging backup + migration + invariants;
6. restore drill;
7. staging deploy;
8. smoke/security/observability verification;
9. production drift reconciliation;
10. отдельное одобрение GitHub/production;
11. только после этого PR/merge/deploy.

Нельзя переставлять production раньше staging. Нельзя считать backup подтверждённым без restore drill.
