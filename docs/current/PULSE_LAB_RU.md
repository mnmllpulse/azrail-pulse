# Professional Pulse Lab / System Control Center — AZRAIL 1.5.0-rc.36

Status: current

Pulse Lab больше не является простым capability/readiness экраном. Stage 22 превращает его в read-only System Control Center.

## Контур

```text
SYSTEM
  App version
  Build SHA
  Environment
  Worker

AUTH
  OIDC
  Session
  Access

STORAGE
  D1
  KV
  R2

AI
  Workers AI
  Gateway
  Model Registry

RUNTIME
  Orchestrator
  Sandbox
  Cron

RELEASE
  Migration version
  Config drift
  Last staging smoke

HEALTH
  API latency
  Errors
  Queue
```

Состояния: `Healthy / Warning / Blocked / Unknown`.

## Truth boundary

- D1/KV/R2 получают только read-only round-trip probes.
- Workers AI, Gateway, Sandbox и Queue **не запускаются** синтетически ради health check.
- Binding/config presence не выдаётся за доказанную работоспособность сервиса.
- `Build SHA` остаётся `Unknown`, пока deployment не передаст `AZRAIL_BUILD_SHA`.
- `Environment` остаётся `unknown`, если его нельзя безопасно вывести из runtime host/origin.
- Cron не объявляется healthy только по наличию кода: runtime не может доказать control-plane schedule без внешнего read-only evidence.
- Config drift и staging smoke берутся только из durable `release_evidence`; отсутствие записи отображается как `Unknown`.

## Release evidence

Migration `028-pulse-lab-release-evidence.sql` добавляет таблицу `release_evidence` для будущих approved release workflows. Stage 22 её **не заполняет** и не выполняет remote migration. Это только schema contract для последующих staging/release этапов.

## Safety

Pulse Lab не выполняет:

- model calls;
- queue sends;
- GitHub writes;
- Cloudflare control-plane writes;
- deploy;
- remote D1 migration apply;
- Canva edits.

Все текущие изменения существуют только в локальном RC ZIP.
