# AZRAIL PULSE Unified 1.5.0-rc.3

Локальный кандидат. Ничего из этого релиза не публиковалось в `main` и не развёртывалось в Cloudflare.

## Исправлено

- **Mission lifecycle:** `waiting_approval` больше не является ловушкой без выхода. Владелец может отменить такую миссию; подготовленный `connector_call` переводится `prepared → cancelled` через CAS перед закрытием миссии.
- **Race safety:** если внешний вызов уже `running` или имеет `uncertain` outcome, сервер не выдаёт ложное «успешно отменено» и оставляет миссию на ручной проверке.
- **Recovery isolation:** восстановление connector-approval теперь принимает успешный call только если `connector_calls.account_id` совпадает с владельцем проекта через `resource_owners`; одного opaque call ID недостаточно.
- **Corrupt outbox:** повреждённые `mission_outbox.params` больше не приводят к слепому restart; восстановление fail-closed с понятной причиной.
- **Staging auth provenance:** в `wrangler.staging.json` закреплены текущие non-secret OIDC issuer/client bindings, чтобы будущий deploy из файла не стёр рабочие plain-text bindings.
- **Cloud-write interlock:** `deploy-ci`, `provision --apply` и remote migration `--apply` требуют `AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND`.
- **GitHub publish interlock:** `push-to-github.sh` теперь требует `AZRAIL_ALLOW_GITHUB_MUTATION=I_UNDERSTAND`; заодно исправлена устаревшая проверка несуществующего `wrangler.toml` и удалена подсказка на небезопасный generic `wrangler deploy`.
- **Dangerous aliases removed:** прямые `db:schema` и `db:security` remote writes заблокированы; добавлены явные read/plan migration commands.
- **Build provenance:** generic `build:check` больше не использует legacy `wrangler.json` с placeholder IDs; он проверяет staging + production configs явно.
- **Release preflight:** бюджет staging теперь проверяется как численно меньший production, проверяются fail-closed metering, OIDC staging и RC cloud locks.

## Инфраструктурный drift, обнаруженный read-only

Текущий Cloudflare production всё ещё отличается от release-config: deployed `compatibility_date=2026-08-08` против `2026-09-29`, `AZRAIL_METERING=observe` против ожидаемого `enforce`, присутствует legacy `CORS_ORIGIN=*`, а OIDC issuer/client не закреплены как plain-text bindings. RC3 **не исправляет production удалённо** — это сознательно оставлено до отдельного решения после проверок.

## Проверка

См. `VERIFICATION_RC3.json` и `docs/AUDIT_1.5_RC3_RU.md`. Полный `npm ci → typecheck → vitest → wrangler dry-run` не заявляется пройденным: пакетный registry в текущем изолированном окружении недоступен.
