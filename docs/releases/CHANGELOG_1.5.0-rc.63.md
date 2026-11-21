# AZRAIL 1.5.0-rc.63

## Final cross-cutting closure

- Added Universal Compare Center available from every Studio through compact Tools and Ctrl/Cmd+K.
- Compare Mode renders real saved image/audio/video/text artifacts and never mutates A/B sources.
- Preserved Web Studio source/snapshot diff as the authoritative Before/After path for code workspaces.
- Upgraded Professional Review UI with `Fix critical`, `Fix all safe issues`, and `Review manually`.
- Review remediation is strictly gated by `safeAutoFix=true`; unsafe findings remain manual-review only.
- Added explicit local-only remediation prompt boundaries: no deploy, push, PR, remote migration, or external mutation.
- Hardened canonical Studio naming and Russian descriptors; `Pulse Lab` remains canonical.
- Localized key user-facing Prompt labels to `Промпт`.
- Added mandatory `cross:final` repository gate.
- No GitHub, Cloudflare, or Canva mutation was performed.

## После rc.63 (PR #46–#125, 15–20 ноября 2026; версия не повышалась)

**Чат и интерфейс**
- Единый чат вместо студий; Dark Premium Workspace, единые токены, иконки и типографика; сайдбар (Новый чат, Поиск, Проекты, Архив); поле ввода одной рамкой; меню аккаунта; Settings Center с 12 разделами без дублей.
- Мгновенная отправка, очистка вложений при отправке, картинка над текстом сообщения, компактные карточки вложений, вставка и перетаскивание картинок, свой аватар и ник вместо почты.
- «Рисуй» берёт прошлый промпт, правка приложенной картинки идёт в том же чате; «промпт/описание картинки» — разговор; картинка во вложении загружается в хранилище (исправлено «Некорректное вложение»).
- Структурированный стиль ответов и рендерер списков, цитат и разделителей; уровень усилий влияет на глубину, бюджет токенов и модель; сворачиваемый «Ход выполнения»; hover-действия, ветка и сохранение сообщений.
- Экспорт данных и срок хранения чатов, выбор шрифта.

**Модели**
- Меню моделей: весь каталог, метки бесплатных / Workers Paid / сторонних; бесплатные модели OpenRouter (15, секрет `OPENROUTER_API_KEY`, автосверка списка).
- Сверка с отключением 20.11.2026: 10 моделей помечены, 14 слагов вне реестра закрыты в каталоге; добавлено 10 живых моделей, флаг `manualOnly`; платный автовыбор — только `deepseek-v4.1-flash-1017` для тяжёлых задач.
- Остаток нейронов `/api/studio/budget`; разбор Responses-ответов; сообщение о таймауте 55 с без повторов.

**Локальный агент и безопасность**
- Несколько папок, терминал с белым списком и подтверждением, цикл исправления до 3 раундов, откат правок, режимы разрешений 0–3, защита от подмены инструкций и утечки секретов во вложениях, tar/gz и текст по содержимому.

**Эксплуатация**
- Маршрут `/health/live`, проверка staging `staging:auto-health`; снимки облака и закладка бэкапа, гейт свежести 24 часа; песочница включена на рабочем воркере по пробному флагу владельца.
- Автоснимок облака в CI (секрет `CLOUDFLARE_API_TOKEN` только на чтение); автотест интерфейса `npm run ui:smoke` (3 размера экрана, гость и вход: ошибки JS, переполнение, axe WCAG A/AA, цели касания ≥44px) запускается в каждой проверке.
- Документация обновлена 20.11.2026 (`CHAT_RU.md`, `MODELS_RU.md`, `NEURON_BUDGET.md`, README, DEPLOY, START_HERE).
