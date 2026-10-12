# AZRAIL 1.5.0-rc.23 — Stage 9 Unified Approval Engine

## Added

- `approval_requests` — canonical exact-payload approval state;
- `approval_receipts` — durable audit trail;
- migration `017-unified-approval-engine.sql`;
- `src/lib/approval-engine.ts` and closed approval action/status types;
- admin decision API `/api/approvals/:id/decision`;
- `npm run approvals:check` architecture gate.

## Integrated

- Connector write approvals;
- Git branch/file writes;
- GitHub PR opening;
- deployment pipeline dispatch;
- backup restore;
- mission requests for unavailable approval-risk tools.

Approvals are SHA-256-bound to exact parameters, expire, are single-use, and distinguish failed from uncertain external execution.

## Safety

No GitHub or Cloudflare mutation was executed while preparing this checkpoint. Production deployment and remote migrations remain disabled by the existing operator interlocks.
