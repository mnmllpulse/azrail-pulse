# AZRAIL 2.0 — матрица переноса

Состояния: `LEGACY` — старый контур, не трогать без плана. `COMPATIBILITY` — живой код, к нему подключаться. `NEW` — в этом проходе не создаётся. `VERIFIED` здесь не ставится: выпуск остаётся CONDITIONAL.

Старые миграции не переписываются. Новые таблицы не добавляются, пока не разобрана уже лежащая схема. Удаление исторического дерева `references/legacy` ради меньшего архива не делается.

| Предложение сценария | Что уже есть | Действие |
|---|---|---|
| `src/intelligence/intent` | `src/agents/orchestrator-intent.ts`, `src/lib/quick-intent.ts`, `src/lib/assignment-plan.ts` | COMPATIBILITY. Сначала расширить контракт намерения здесь |
| `src/intelligence/context` | Память проекта, вложения, история чата, `mission_memory_reads` | COMPATIBILITY. Общий Context Engine не заводить вторым хранилищем |
| `src/intelligence/decisions` | `src/lib/mission-decision-log.ts` | COMPATIBILITY |
| `src/intelligence/memory` | `src/lib/memory-agent.ts` | COMPATIBILITY. Секреты в память не писать |
| `src/intelligence/policies` | `src/lib/model-policy.ts`, `src/lib/neuron-paid.ts`, квоты, бюджет миссии | COMPATIBILITY |
| `src/orchestrator/graph` | `src/lib/mission-graph.ts` и снимок `derived-linear` в `src/lib/metatron-ops.ts` | COMPATIBILITY. Явные рёбра хранить в существующем контуре миссии |
| `src/orchestrator/recovery` | `src/lib/checkpoints.ts`, fencing, идемпотентность `src/lib/mission-admission.ts` | COMPATIBILITY. Повтор внешнего эффекта только после сверки |
| Agent Contract на 12 ролей | Реестр из девяти классов в `src/lib/agent-registry.ts` | COMPATIBILITY. Новые роли не регистрировать пустым классом |
| Provider Adapter | `src/lib/model-router.ts`, Workers AI, голосовой адаптер `src/unified/voice.ts` | COMPATIBILITY. Платные провайдеры не включать флагом |
| Universal Tool Gateway | `src/unified/mcp-client.ts`, `src/unified/connectors.ts` | COMPATIBILITY. Интеграция без connection test остаётся не готовой |
| Sandbox Manager | `src/core/azrail-sandbox.ts`, `src/core/sandbox.ts` | COMPATIBILITY. Секрет передаётся не через промпт |
| Studio Runtime | `ui/studio-manifest.ts` и `ui/studio-modules/*` | COMPATIBILITY. Вторая студия с тем же именем запрещена |
| Web / Image / Music / Video / Audio / Ableton / Data / Ledger / Pulse | Модули `web`, `image`, `music`, `video`, `audio`, `als`, `data`, `ledger`, `lab`, плюс `prose` | COMPATIBILITY |
| Architecture, Development, Creative, Market как студии | Только старые экраны в `references/legacy` | LEGACY. В манифест не копировать |
| Голос | Жизненный цикл голоса и STT-адаптер. Ключ озвучки на воркере не установлен | COMPATIBILITY. Ключ не выдумывать и не класть в исходник |
| Маски картинки, Kling, увеличение ролика | Закрыты, пока нет проверенного провайдера | NEW не открывать |
| Новый Command Workspace | Тихое лицо чата и полоса поручения | COMPATIBILITY. Отдельный каркас навигации из десяти пунктов не строить поверх рабочего чата в этом пакете |
| `wrangler.production.json` | Историческая конфигурация удалённого воркера | LEGACY. Не выкладывать и не назначать рабочим сайтом |
| Миграция `034-metatron-lab-2.sql` | Файл есть локально | LEGACY до отдельного разрешения на удалённую миграцию. К D1 не применялась |

Переключение трафика на новый механизм допускается только после сравнения результата и проверенного отката. Пустой интерфейс вместо функции не считается шагом переноса.
