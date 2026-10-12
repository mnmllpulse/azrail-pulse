# AZRAIL PULSE 1.5.0-rc.11

Локальный release candidate. GitHub и Cloudflare этим архивом не изменялись.

## Recovery / checkpoints

- Все durable checkpoints теперь валидируются как упорядоченная replay-цепочка перед восстановлением миссии. `running`, `uncertain`, повреждённые input/result и шаги вне бюджета блокируют автоматический replay.
- `waiting_approval` восстанавливается только при доказанном durable `connector_call` с `approvalRequired=true`; malformed result больше нельзя молча пропустить.
- Canonical mission plan загружается из `mission_steps` после restart вместо повторного scout/model plan generation.

## Transactional plan state

- `savePlan`, `advancePlan` и `revisePlan` используют D1 batch для связанных multi-row переходов.
- При ambiguous D1 response planner перечитывает durable state и не продолжает с противоречивым in-memory планом.
- Replan budget перенесён из process memory в `mission_recovery_state`; restart не выдаёт новые попытки.

## Regression recovery

- Автоматический rollback-and-retry также имеет restart-safe durable counter.
- Исходный тестовый baseline сохраняется один раз в `mission_test_baselines`; после частичных mutation recovery не переснимает baseline с уже изменённого workspace.
- Reflection/reporting читает durable recovery state, поэтому факт предыдущего rollback не теряется после restart.

## Regression tests / compile hygiene

- Обновлены старые regression tests под текущий `validateTrustedHttpsUrl(value,label,...)`: пять вызовов RC5 больше не используют устаревшую сигнатуру.
- RC6 attachment test дополнен обязательным `inputType`, соответствующим актуальному `AttachmentRef`.
- Удалены stale source-contract assertions на process-local `revisions/regressions`.

## Schema

Добавлена `migrations/011-recovery-state.sql` с таблицами `mission_recovery_state` и `mission_test_baselines`; migration planner и canonical schema обновлены.

## Verification policy

RC остаётся review candidate. Полный dependency-backed `npm ci -> typecheck -> Vitest -> Wrangler dry-run` должен быть воспроизведён перед публикацией/deploy.
