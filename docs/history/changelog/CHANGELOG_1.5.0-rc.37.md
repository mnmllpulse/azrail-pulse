# AZRAIL 1.5.0-rc.37 — Stage 23 / Professional Connections

- Connections вынесен из modal на отдельную `/settings/connections` page, сохранив верхнюю навигацию Create / Projects / Studios.
- Добавлены status / endpoint / auth / scopes / last checked / last call / errors / tool count.
- Добавлен owner-scoped detail API с available tools, call history и recent verification checks.
- Добавлена migration `029-professional-connections.sql` и `connector_health_checks`.
- MCP discovery теперь пишет bounded health history: healthy/warning, latency, tool count, safe error code.
- Bearer credential rotation защищена Unified Approval `secret_rotation`; revision увеличивается, stale tool catalog сбрасывается.
- OAuth existing-connection re-authorization также exact-approval-gated и сохраняет PKCE/resource/origin boundary.
- Secrets не возвращаются в public connection API/UI.
- Добавлен `connections:check`; gate включён в static Quality Gate и release-preflight.
- GitHub, Cloudflare и Canva использовались только read-only; remote mutations не выполнялись.
