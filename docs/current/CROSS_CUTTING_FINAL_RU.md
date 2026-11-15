# Final Cross-Cutting Closure — RC63

Status: current

RC63 закрывает последние сквозные пункты PDF после завершения Series F и Series G: **Compare Mode**, **Professional Review Agent** и **canonical Studio naming/descriptor governance**.

## Universal Compare Center / Compare Mode

Один вход `A | B Compare` доступен из Studio Tools и Command Palette. Compare Center использует только реальные сохранённые `studio_artifacts` из Asset Intelligence Library и не изменяет источники.

Поддерживаемый preview:

- image → нативный `<img>`;
- audio → нативный `<audio>`;
- video → нативный `<video>`;
- text / JSON / XML / code → bounded text preview;
- неподдерживаемый binary → только metadata/evidence, без ложного preview.

A и B обязаны быть разными artifact IDs. Сравнение разных media families разрешено только как side-by-side inspection; система явно предупреждает, что метрики между разными типами не эквивалентны.

Для Web Studio source-level Before/After по-прежнему точнее выполняется через `Changes / Versions`, где сравниваются immutable workspace snapshots и реальные файлы.

## Professional Review Agent

Review persistence использует существующую таблицу `studio_reviews`. Findings имеют уровни:

- Critical;
- Major;
- Minor;
- Improvement.

Каждый finding может иметь `safeAutoFix=true`, но это **не разрешение на внешнюю мутацию**.

UI реализует три действия из PDF:

- `Fix critical` — только Critical findings с `safeAutoFix=true`;
- `Fix all safe issues` — только findings с `safeAutoFix=true`;
- `Review manually` — показывает полный structured review без изменений.

Repair mission ограничена локальными обратимыми изменениями. В prompt явно запрещены deploy, push, PR, remote migration и внешние действия. Если precondition изменился или исправление перестало быть безопасным, mission обязана остановиться и оставить finding для ручной проверки.

## Brand governance

Канонические названия:

- Web Studio
- Image Studio
- Music Studio
- Video Studio
- Pulse Lab
- Ledger Studio
- Data Studio
- Ableton Lab
- Audio Lab

Названия остаются английскими; под ними отображается краткое русское описание. `Pulse Lad` и повторное `Web Studio` для Image из последней страницы исходного PDF трактуются как опечатки и не применяются.

В пользовательских labels термин `Prompt` приведён к форме **«Промпт»** там, где он является подписью/подсказкой интерфейса.

## Verification

`npm run cross:final` проверяет canonical names, русские descriptors, universal Compare wiring, native media boundaries, safe review actions и remote-mutation prohibition. Этот gate входит в `quality:static`.
