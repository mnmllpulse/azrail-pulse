# AZRAIL 1.5.0-rc.35 — Stage 21 / Professional Ledger Studio

- Ledger Studio преобразован из базовой таблицы model calls в профессиональный read-only cost/usage workbench.
- Добавлены Today's Spend, Budget и Remaining с семантически корректным выбором одного budget boundary вместо двойного суммирования hierarchical scopes.
- Добавлены фильтры project / mission / model / provider / agent / date / status.
- Добавлены tokens, calls, mean/P95 latency, retries, errors, estimated, actual, reserved и uncertain metrics.
- Добавлена migration `027-professional-ledger-studio.sql` и sidecar `model_call_dimensions` для provider / route attempt / retry attempt provenance.
- Model Router и metering boundary теперь фиксируют provider и attempt dimensions в момент dispatch.
- Исторические calls не получают выдуманную provenance: migration backfill сохраняет `provider=unknown`.
- Добавлен bounded anomaly detector для hourly spend growth, uncertain outcomes, error rate и P95 latency.
- Добавлены CSV и JSON export текущего отчёта.
- Удалён legacy `renderLedger`, чтобы не поддерживать два конкурирующих Ledger UI.
- Добавлены `tests/ledger-studio.test.ts`, `ledger:check`, migration/runtime checks и Ledger architecture gate.
- Billing boundary зафиксирован явно: внутренний AZRAIL ledger не является точным Cloudflare/provider invoice.
- GitHub, Cloudflare и Canva использовались только read-only; remote mutations не выполнялись.
