# AZRAIL 1.5.0-rc.60 — Metatron Lab 2.0

## Series F F61–F80

Локально реализован Agent Operations Center: Live Mission Graph, Agent Cards, mission lifecycle controls, cooperative AbortSignal, WebSocket + durable replay logs, Trace Explorer, token/cost/resource telemetry, checkpoints/resume/read-only replay, safe failed-step retry, uncertain-effect handling, fail-closed reconciliation, fencing tokens, real agent health probes, pre-dispatch replacement, approval nodes, simulation-only fault injection, Memory Inspector и Decision Explanation Panel.

## Persistence

Добавлена additive migration `034-metatron-lab-2.sql` с `mission_controls`, `mission_agent_runtime`, `mission_decisions`, `mission_memory_reads` и `mission_fault_runs`. `schema.sql` синхронизирован. Remote migration не выполнялась.

## Safety boundaries

- Mission graph помечается `derived-linear`, пока planner не сохраняет explicit dependencies.
- Automatic replacement разрешён только до начала agent task.
- `uncertain_effect` запрещает automatic retry до evidence-based reconciliation.
- Fault Injection Lab не создаёт реальных outages и работает только как deterministic simulation.
- Mission Replay — read-only.
- GitHub, Cloudflare и Canva в этом локальном обновлении не изменялись.

## Release proof

Canonical release runtime остаётся Node 24.18.0. На текущем Node 22 host dependency-backed typecheck/build/tests/Wrangler dry-run и authenticated live smoke не считаются доказанными. Финальные gate numbers фиксируются в `verification/current/VERIFICATION_RC60.json` после последнего прогона.


## Final local gate receipt

- Static: **56 PASS / 0 FAIL / 0 BLOCKED**.
- Full: **56 PASS / 0 FAIL / 5 BLOCKED**.
- UI TypeScript: **PASS**.
- Migration chain: **002–034 PASS**.
- Production drift stays **RECONCILIATION_REQUIRED / 17 blockers** from read-only evidence.
