# Professional Connections — RC37

Status: current

`Settings → Connections` — отдельный control surface для внешних MCP-сервисов. Верхняя навигация AZRAIL остаётся минимальной: Create / Projects / Studios.

## Public connection profile

UI получает только безопасные поля: status, endpoint, auth mode, OAuth scopes, daily call limit, tool count, last checked, last call, error count и revision. `secret_cipher`, access token и OAuth client secret никогда не входят в public response.

## Verification / health

`POST /api/connectors/:id/discover` выполняет bounded MCP initialize + tools/list, обновляет verified catalog и пишет `connector_health_checks`: `healthy|warning`, latency, tool count, safe error code и timestamp. История owner-scoped.

## Tools / calls

Detail view показывает available tools, risk classification, последние connector calls и health/errors. Подготовка tool action сохраняет существующий exact-arguments + idempotency + Unified Approval boundary.

## Credential lifecycle

Bearer token rotation требует `secret_rotation` approval. После успешной ротации connection revision увеличивается, stale `tools_json/tools_digest/verified_at` сбрасываются, prepared calls отменяются, затем connection необходимо проверить заново.

OAuth re-authorization использует существующий PKCE flow. Для existing connection exact approval binding сохраняется внутри encrypted OAuth pending state; новый token заменяет credential только после approved `secret_rotation`. Refresh token намеренно не хранится.

## Disconnect

Disconnect очищает server-side credential, отключает connection и отменяет только ещё не отправленные prepared calls. Уже dispatched remote effects автоматически не откатываются.

## Release boundary

RC37 не меняет GitHub или Cloudflare. Migration `029-professional-connections.sql` добавлена только в локальный ZIP и должна пройти staging-first migration flow перед будущим release.
