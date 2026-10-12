# AZRAIL PULSE 1.5.0-rc.25

## Stage 11 — Observability IDs / Trace Correlation

- Added canonical `TraceContext` with request, trace, mission, task, tool, approval, connector and model identifiers.
- Added W3C `traceparent` ingestion with validation and generated fallback trace IDs.
- Added `migrations/019-observability-trace-links.sql` and canonical `trace_links` sidecar indexes.
- Propagated trace context through HTTP → Orchestrator → Mission → Agent → Model → Tool → Approval → Connector → Event Stream → Publication paths.
- Added durable links for task, mission, model call, tool call, approval, connector call, mission check and event entities.
- Added admin-only trace traversal endpoint and `X-Request-Id` / `X-Trace-Id` response headers.
- Added `listTraceEvents()` to the Unified Event Stream.
- Trace sidecar failures are logged but cannot abort/replay authoritative business mutations.
- Added `npm run observability:check` and made it a static Quality Gate / release-preflight invariant.
- No GitHub or Cloudflare mutation was performed.
