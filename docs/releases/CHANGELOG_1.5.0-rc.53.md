# AZRAIL PULSE 1.5.0-rc.53

## Series E — Runtime & Connector Control Plane (E11–E16)

- Added durable + live mission cancellation: D1 remains the durable cancellation source of truth while an in-memory AbortController stops the active Durable Object turn immediately when available.
- Propagated AbortSignal through ExecutionContext, model retry boundaries and MCP connector execution; retries/fallback stop after cancellation.
- Added signal-aware MCP transport using a combined user-cancel + timeout signal.
- Exposed uncertain-effect reconciliation directly in Connections UI with explicit succeeded / failed / not-executed outcomes and required evidence.
- Added a reusable Studio recovery boundary with Retry, Restore last stable state, Open logs and Report actions.
- Expanded connection health states to Connected, Degraded, Rate limited, Authentication expired and Unavailable.
- Added a stable ConnectorAdapter gateway contract for future provider-specific integrations without duplicating control-plane logic.
- Added `series:e:runtime` and made it a mandatory static Quality Gate.
- No GitHub or Cloudflare mutation was performed. Production remains fail-closed.
