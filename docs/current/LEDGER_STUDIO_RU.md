# Professional Ledger Studio — AZRAIL 1.5.0-rc.35

Status: current

Ledger Studio — read-only cost/usage workbench поверх внутреннего AZRAIL metering. Он не является копией счёта Cloudflare или другого provider billing.

## Контракт

```text
model_calls (authoritative call state/cost)
        +
model_call_dimensions (provider / route attempt / retry attempt)
        +
model_call_budget_scopes (reservation / reconciliation map)
        +
trace_links → mission / task / agent / project
        ↓
Professional Ledger Studio
```

`model_call_dimensions` добавлен migration `027-professional-ledger-studio.sql`. Новые model calls получают provider, номер model-route candidate и номер retry в момент dispatch. Исторические calls получают `provider=unknown`: отсутствующая provenance не выдумывается. Для отображения старых строк UI может пометить provider как `registry-inferred` или `slug-inferred`.

## Overview

- `Today's Spend` — внутренний spend текущего UTC-дня в выбранном контуре;
- `Budget` — один семантически корректный budget scope: mission → project → account; operator может видеть paid-month scope;
- `Remaining` — остаток того же scope без суммирования перекрывающихся hierarchical budgets.

## Filters

`project / mission / model / provider / agent / date / status`.

Скан bounded: максимум 3000 доступных аккаунту calls на выбранное date-window, preview/export текущего отчёта — максимум 500 строк. Фильтры применяются только внутри resource ownership boundary.

## Metrics

- tokens (prompt / completion);
- calls;
- mean и P95 latency;
- retries;
- errors;
- estimated;
- actual;
- reserved;
- uncertain.

`actual` учитывается как известная usage-backed стоимость. Для `running / uncertain / unpriced` reservation остаётся отдельным held state и не маскируется под подтверждённый invoice.

## Anomaly detector

Детерминированные bounded проверки без платных model health-check calls:

- hourly spend growth > 2x;
- uncertain outcomes;
- error/uncertain rate >= 20% при достаточной выборке;
- P95 model latency > 15 s.

Пример: `Model spend grew 340% in the last hour.`

## Export

- CSV — текущие model-call rows с provider provenance, route/retry attempts и cost states;
- JSON — полный текущий Ledger report.

## Billing truth boundary

AZRAIL Ledger — application-level metering и budget-control surface. `estimated` и `reserved` — внутренние значения. Даже `actual` здесь означает стоимость, рассчитанную по известным usage + model pricing внутри AZRAIL. Точный внешний биллинг подтверждается Cloudflare/provider billing и не подменяется этим интерфейсом.

## Safety

Ledger Studio не выполняет deploy, D1 remote migration, GitHub write, Cloudflare mutation, Canva edit или model call. Stage 21 меняет только локальный source ZIP.
