# Metatron Lab 2.0 — Agent Operations Center

Metatron — не отдельная декоративная студия, а **control plane агентной системы AZRAIL**. Он объединяет уже существующие mission lifecycle, checkpoints, traces, approvals, fencing и durable event stream в один операторский экран.

## F61–F80

- **Live Mission Graph** отображает persisted `mission_steps`. Пока planner не сохраняет явные dependency edges, граф честно маркируется `derived-linear`; скрытый параллельный DAG не выдумывается.
- **Agent Cards** совмещают runtime instance state с реальным health probe через `agent.ping()` и `storageReadable`.
- **Start / Pause / Resume / Cancel / Terminate** проходят через durable mission state. Pause/Terminate активной миссии передают cooperative abort в Orchestrator и завершаются на безопасной границе.
- **Real AbortSignal** создаётся Orchestrator и передаётся Execution Engine / model / connector boundaries.
- **Live Logs** используют существующий project WebSocket и durable event replay.
- **Trace Explorer** объединяет `trace_links`, tool calls и model calls.
- **Resource display** показывает prompt/completion tokens, reserved/actual micro-USD, elapsed time, risk и текущий fencing token.
- **Checkpoint / Resume / Replay** используют durable checkpoint+receipt chain. Mission Replay — только чтение и никогда повторно не вызывает provider/tool effects.
- **Step Retry** разрешён только для доказанно `failed` checkpoint + `failed` receipt и только если после него нет более поздних durable checkpoints.
- **uncertain_effect** никогда не считается обычным failure.
- **Effect Reconciliation Engine** работает fail-closed: Connector uncertain outcome сверяется через `/api/connectors/calls/:id/reconcile`, model billing — через `/api/admin/billing`. Metatron не угадывает внешний outcome и не включает автоматический retry после uncertain effect.
- **Fencing Tokens** остаются authoritative writer fence; terminal cleanup удаляет только lease, всё ещё принадлежащий terminal mission.
- **Agent Health Monitoring / Replacement**: автоматическая replacement разрешена только при pre-dispatch health/bootstrap failure. После начала `run()` задача автоматически не воспроизводится, потому что side effects могут быть uncertain.
- **Human Approval Nodes** отображают durable `approval_requests`.
- **Fault Injection Lab** в rc.60 — строго `SIMULATION ONLY`: timeout/provider-down/D1-failure/network-loss проверяют recovery contracts, но не ломают реальный provider, D1 или сеть.
- **Memory Inspector** пишет audit только для фактов, реально попавших в bounded recall context.
- **Decision Explanation Panel** сохраняет model/tool/route/retry/recovery/replacement/control decisions и причины выбора.

## Persistence

Migration `034-metatron-lab-2.sql` добавляет:

- `mission_controls`;
- `mission_agent_runtime`;
- `mission_decisions`;
- `mission_memory_reads`;
- `mission_fault_runs`.

Migration включена в локальный source package, но **не применялась к Cloudflare D1**.

## Границы доказательства

- Graph mode `derived-linear` не выдаётся за planner-authored parallel DAG.
- Health = реальный ping/storage-readability, а не фиктивный `online`.
- Fault injection не разрушительный.
- Mission Replay read-only.
- Replacement никогда не переигрывает уже начавшуюся effectful задачу автоматически.
- Reconciliation требует внешнего evidence.
- Full release verification требует Node 24.18.0, dependency-backed build/tests/Wrangler dry-run и authenticated live smoke.
