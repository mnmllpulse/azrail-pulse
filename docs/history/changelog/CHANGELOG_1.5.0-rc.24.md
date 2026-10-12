# AZRAIL 1.5.0-rc.24 — Stage 10 Unified Event Stream

## Added

- `event_stream` append-only D1 table with monotonic `seq` cursor;
- migration `018-unified-event-stream.sql` with legacy mission-event backfill;
- typed `src/lib/event-stream.ts` contract;
- project replay endpoint `GET /api/projects/:projectId/events`;
- browser replay + WebSocket client `ui/event-stream.ts`;
- `npm run events:check` release gate.

## Integrated

- mission/tool/verification events;
- agent task lifecycle;
- approval lifecycle;
- connector operation lifecycle;
- recovery lifecycle;
- workspace publication lifecycle.

Realtime delivery now sends one `{type:"event_stream", event}` application frame after the event is durable. The UI resumes from the last monotonic sequence instead of relying on timestamps.

## Safety

No GitHub or Cloudflare mutation was executed while preparing this checkpoint. Production deploy and remote migrations remain disabled.
