# AZRAIL PULSE 1.5.0-rc.21 — Stage 7

## Orchestrator decomposition

- Durable Object shell reduced from roughly 1,050 lines to roughly 430 lines.
- Intent classification/sufficiency moved to `orchestrator-intent.ts`.
- Capability selection and explicit Git handoff moved to `orchestrator-capabilities.ts`.
- Task history/event sink moved to `orchestrator-history.ts`.
- Agent/storage self-test moved to `orchestrator-self-test.ts`.
- Mission scheduling, delivery generation fencing, recovery and background execution moved to `mission-coordinator.ts`.
- Public Orchestrator RPC/WebSocket contracts remain at the previous module path.
- Release preflight and source-inspection regression tests were updated to follow the new module boundaries instead of requiring monolithic implementation details.

## Safety

- GitHub remains read-only.
- Cloudflare remains read-only.
- Deployment and remote mutation interlocks remain enabled.
