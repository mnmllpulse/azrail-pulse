Status: planned (принято владельцем, реализация после текущих задач)

# AZRAIL PULSE — MASTER SPECIFICATION
## Hybrid AI Development Platform
**Product:** AZRAIL PULSE  
**Brand:** MNMLLPULSE  
**Vision:** Intelligence That Moves the Planet  
**Product category:** AI IDE / Autonomous Development Platform / Hybrid SaaS  
**Target:** Commercial product with future acquisition potential  
**Repository:** `https://github.com/mnmllpulse/azrail-pulse`

---

# 1. PRODUCT VISION

AZRAIL PULSE — это гибридная AI-платформа, объединяющая облачный AI-интеллект, локальный компьютер пользователя, разработку программного обеспечения, автоматизацию GitHub и публикацию приложений через Cloudflare.

Пользователь взаимодействует с системой через один универсальный чат.

AI самостоятельно определяет, какие инструменты нужны для выполнения задачи, планирует действия, выполняет работу, проверяет результат и сообщает о завершении.

Пользователь не должен вручную переключаться между множеством отдельных студий.

## Основной принцип

ONE CHAT. ONE INTELLIGENCE. REAL EXECUTION.

AZRAIL PULSE не должен быть обычным чатботом, который только генерирует текст или код.

Он должен быть AI-исполнителем, который выполняет реальные задачи в рамках разрешений пользователя.

# 2. PRODUCT ARCHITECTURE

Платформа состоит из следующих систем:

1. AZRAIL PULSE Web App
2. AZRAIL AI Agent
3. AI Model Router
4. Execution Engine
5. Cloud Sandbox
6. AZRAIL Desktop Agent
7. Local Agent Bridge
8. GitHub Integration
9. Cloudflare Integration
10. Permission & Security Engine
11. Project Workspace
12. Live Preview
13. User Accounts
14. Billing & Usage Metering
15. Admin Dashboard

Не создавать отдельные пользовательские студии для каждой функции. Все действия должны быть доступны через универсальный чат и контекстные элементы интерфейса.

# 3. UNIVERSAL AI CHAT

Чат является главным интерфейсом продукта.

Пользователь должен иметь возможность запросить:

- Создание веб-сайта.
- Создание приложения.
- Создание интерфейса.
- Генерацию изображений через доступные модели.
- Анализ файлов.
- Написание кода.
- Изменение существующего кода.
- Исправление ошибок.
- Запуск программ.
- Выполнение команд.
- Управление GitHub.
- Публикацию приложений.
- Автоматизацию задач.
- Работу с подключёнными интеграциями.

## Chat capabilities

- Streaming responses.
- Context-aware conversation.
- Project context.
- File attachments.
- Tool calling.
- Execution status.
- Task progress.
- Error reporting.
- Result preview.
- Action confirmation.
- Conversation history.
- Cancellation.
- Retry.
- Resume interrupted task.

Чат должен различать обычный ответ, действие, требующее инструмента, и действие, требующее разрешения.

# 4. AI EXECUTION ENGINE

Execution Engine является центральным механизмом исполнения задач.

## Required workflow

1. Получить задачу пользователя.
2. Определить контекст проекта.
3. Проанализировать доступные инструменты.
4. Сформировать план.
5. Определить необходимые разрешения.
6. Выполнить действия.
7. Проверить результаты.
8. Исправить ошибки при необходимости.
9. Повторно проверить.
10. Представить результат пользователю.

## Required execution loop

`PLAN → EXECUTE → OBSERVE → VERIFY → FIX → VERIFY → REPORT`

## Required capabilities

- Tool registry.
- Tool selection.
- Task execution.
- Execution state.
- Timeout handling.
- Retry policy.
- Cancellation.
- Checkpoint.
- Restore.
- Error classification.
- Execution logs.
- Context management.

Не создавать чрезмерно сложную мультиагентную архитектуру без необходимости.

Использовать существующий Orchestrator и Execution Engine. Специализированные агенты должны подключаться только тогда, когда они действительно повышают качество выполнения задачи.

# 5. LOCAL AGENT BRIDGE

## Purpose

Local Agent Bridge предоставляет облачному AI безопасный доступ к разрешённым возможностям компьютера пользователя.

Это отдельный локальный компонент, который должен быть установлен пользователем.

## Target platform

Первоначальная платформа: Windows 10/11.

В дальнейшем:
- macOS.
- Linux.

## Required capabilities

- Secure account pairing.
- Secure connection to AZRAIL Cloud.
- Local file operations.
- Project directory access.
- Process management.
- Application launching.
- Terminal execution.
- Local development server.
- Preview forwarding.
- Git CLI.
- Build execution.
- Debug logs.
- Agent disconnect.
- Automatic reconnect.
- Desktop Agent update mechanism.

## Application launching

AZRAIL должен уметь запускать программы, установленные пользователем.

Примеры:
- Visual Studio Code.
- Web browser.
- Terminal.
- Git GUI.
- Other explicitly authorized applications.

Не использовать shell-команды с неконтролируемой конкатенацией пользовательского ввода.

Применять allowlist, structured command arguments и проверку путей.

# 6. PERMISSION ENGINE

Каждый инструмент должен иметь определённый уровень риска.

## Permission levels

### Level 0 — Read-only

- Просмотр файлов в разрешённой папке.
- Анализ проекта.
- Чтение Git status.
- Чтение логов.

### Level 1 — Safe operations

- Создание файлов в разрешённой рабочей папке.
- Изменение файлов проекта.
- Запуск локального Preview.
- Выполнение безопасных операций в Sandbox.

### Level 2 — Sensitive operations

Требуется явное подтверждение:

- Запуск сторонних программ.
- Установка пакетов.
- Изменение системных настроек.
- Git Push.
- Создание публичного репозитория.
- Публикация приложения.

### Level 3 — Critical operations

Обязательное подтверждение:

- Удаление файлов вне рабочей области.
- Административные команды.
- Удаление репозитория.
- Production Deployment с критическими изменениями.
- Изменение прав доступа.
- Действия с секретами.

## Permission modes

- Ask Every Time.
- Trusted Actions.
- Restricted Autonomous Mode.

Пользователь должен иметь возможность отменить действие и отключить Local Agent.

# 7. PROFESSIONAL SANDBOX

Sandbox должен обеспечивать реальное исполнение кода, а не имитацию терминала.

## Required components

- Isolated runtime.
- Project filesystem.
- Terminal.
- Package manager.
- Build system.
- Debugging.
- Live Preview.
- Port management.
- Process management.
- Resource limits.
- Timeout handling.
- Logs.
- Checkpoints.
- Restore.
- ZIP import.
- ZIP export.

## Required workflow

`Create Project → Install Dependencies → Build → Debug → Fix → Build → Preview → Export`

## Preview requirements

- Реальный запущенный сайт.
- Доступ к Preview из Web App.
- Обновление после изменений.
- Отображение ошибок.
- Управление процессом Preview.
- Возможность остановить Preview.

Не заявлять о полноценном Live Preview до end-to-end проверки.

# 8. CODE WORKSPACE

Платформа должна иметь рабочую область для проектов.

## Features

- Project Explorer.
- File tree.
- File viewer.
- Code editor.
- Syntax highlighting.
- Search.
- File editing.
- Git Diff.
- Change review.
- Checkpoints.
- Restore.
- Terminal panel.
- Preview panel.
- Build status.

Code editor должен поддерживать распространённые языки программирования.

Приоритет: TypeScript, JavaScript, HTML, CSS, JSON, Markdown.

Не заменять рабочий Code Editor декоративным интерфейсом.

# 9. GITHUB INTEGRATION

Использовать GitHub App или OAuth с минимально необходимыми разрешениями.

## Required functionality

- Connect GitHub account.
- List repositories.
- Create repository.
- Clone repository.
- Import repository.
- Read files.
- Create files.
- Modify files.
- Git status.
- Git Diff.
- Commit.
- Push.
- Pull.
- Branch management.
- Pull Request creation.
- Repository visibility configuration.
- Repository URL reporting.

## Commit workflow

1. Изменить проект.
2. Выполнить проверки.
3. Показать Git Diff.
4. Получить подтверждение пользователя.
5. Выполнить Commit.
6. Выполнить Push.
7. Подтвердить результат.

Не сообщать об успешном Push, если операция не завершилась успешно.

# 10. CLOUDFLARE INTEGRATION

Cloudflare является основной инфраструктурной платформой AZRAIL PULSE.

## Required functionality

- Connect Cloudflare account.
- Secure credential handling.
- Project configuration.
- Environment configuration.
- Build.
- Deploy.
- Deployment status.
- Logs.
- Preview deployment.
- Production deployment.
- Rollback.
- Deployment URL reporting.

## Deployment workflow

`Project → Build → Verify → User Approval → Deploy → Verify Deployment → Return URL`

Использовать Wrangler CLI и Cloudflare API в соответствии с доступными возможностями.

Поддерживать Worker и Pages там, где это оправдано архитектурой.

Не хранить Cloudflare API credentials в открытом виде и не передавать секреты AI-модели.

# 11. USER ACCOUNTS & SAAS

AZRAIL PULSE должен поддерживать коммерческую модель SaaS.

## Required

- User registration.
- Authentication.
- Account management.
- Password recovery.
- Session management.
- User workspace.
- Project management.
- Subscription plans.
- Billing integration.
- Usage metering.
- AI usage limits.
- Resource limits.
- Account cancellation.
- Data deletion.

## Subscription model

Начальная гипотеза:

- Free.
- Developer.
- Pro.
- Power.
- Team.

Цены должны быть определены после расчёта себестоимости и проверки спроса.

Не предоставлять неограниченное AI-использование без экономического контроля.

# 12. ADMIN DASHBOARD

Admin Dashboard должен обеспечивать:

- User management.
- Subscription management.
- Usage analytics.
- AI model usage.
- Cost analytics.
- Sandbox monitoring.
- Deployment monitoring.
- Error monitoring.
- Security events.
- System health.
- Rate limit management.

Администратор не должен иметь бесконтрольный доступ к личным файлам клиентов.

# 13. SECURITY REQUIREMENTS

Обязательные требования:

- User isolation.
- Project isolation.
- Sandbox isolation.
- Secure credential storage.
- Encryption in transit.
- Encryption at rest where applicable.
- Permission enforcement.
- Audit logs.
- Rate limiting.
- Abuse prevention.
- Prompt injection defense.
- Secret redaction.
- Kill switch.
- Resource limits.
- Secure Desktop Agent pairing.
- Dependency scanning.
- Security testing.

Инструкции, полученные из файлов, веб-страниц и сторонних репозиториев, должны рассматриваться как недоверенные данные.

# 14. UI/UX

## Design direction

- Premium dark interface.
- Minimalist.
- Black background.
- Violet accents.
- High-quality typography.
- Professional developer experience.
- Responsive design.

## Main interface

Главный интерфейс должен содержать:

- Universal Chat.
- Project selector.
- Attachments.
- Execution status.
- Tool activity.
- Terminal access.
- Preview access.
- Project Explorer.
- Git status.
- Account settings.
- Integration settings.

Большинство дополнительных инструментов должны быть доступны через контекстные панели и меню.

Не перегружать основной интерфейс.

# 15. OBSERVABILITY

Каждая задача должна иметь диагностическую информацию.

## Required

- Task ID.
- Execution status.
- Selected tools.
- Execution duration.
- Error details.
- Build logs.
- Sandbox logs.
- Deployment logs.
- Resource usage.
- AI usage.
- Cost tracking.

Logs должны скрывать секреты и чувствительные данные.

# 16. TESTING & QUALITY

Обязательные тесты:

- Unit Tests.
- Integration Tests.
- E2E Tests.
- TypeScript checks.
- Build verification.
- Sandbox tests.
- GitHub integration tests.
- Cloudflare integration tests.
- Permission tests.
- Security tests.
- Desktop Agent tests.

## Critical acceptance criteria

### AI Execution

- AI способен выполнить реальную задачу.
- AI способен изменять существующий проект.
- AI способен запускать Build.
- AI способен получать ошибки.
- AI способен исправлять ошибки.
- AI проверяет конечный результат.

### Local Agent

- Desktop Agent устанавливается на Windows.
- Agent подключается к пользовательскому аккаунту.
- Пользователь контролирует доступ.
- Разрешённая программа запускается.
- Terminal выполняет разрешённую команду.
- Пользователь может остановить Agent.

### Sandbox

- Код реально исполняется.
- Build реально запускается.
- Preview отображает работающий проект.
- Ошибки доступны AI.
- Изоляция проверена.

### GitHub

- Репозиторий подключается.
- Commit создаётся.
- Push выполняется.
- URL репозитория возвращается пользователю.

### Cloudflare

- Проект собирается.
- Deployment выполняется.
- Deployment status проверяется.
- URL опубликованного приложения возвращается пользователю.

### Commercial

- Пользователь может зарегистрироваться.
- Пользователь может подключить интеграции.
- Usage limits работают.
- Subscription system работает.
- Пользовательские данные изолированы.

# 17. DEVELOPMENT PHASES

## Phase 0 — Repository Audit

Провести полный аудит существующего репозитория.

Не переписывать код без необходимости.

Определить:
- Реально работающие функции.
- Частично реализованные функции.
- Неиспользуемые модули.
- Дублирующие системы.
- Ошибки архитектуры.
- Недостающие зависимости.
- Security gaps.
- Build failures.
- Test failures.

Подготовить точный список файлов, которые необходимо изменить.

## Phase 1 — Core Stabilization

- Исправить Execution Engine.
- Проверить Tool Registry.
- Проверить Model Router.
- Проверить Orchestrator.
- Проверить Sandbox.
- Обеспечить надёжный task execution.
- Добавить необходимые тесты.

## Phase 2 — Universal Chat

- Единый чат.
- Tool calling.
- Task status.
- Execution logs.
- Project context.
- File attachments.
- Error reporting.

## Phase 3 — Sandbox & Workspace

- Terminal.
- Code Editor.
- Live Preview.
- Build.
- Debug.
- Checkpoints.
- ZIP import/export.

## Phase 4 — Desktop Agent

- Windows Desktop Agent.
- Local Agent Bridge.
- Local filesystem.
- Process management.
- Application launching.
- Permission Engine.
- Secure connection.

## Phase 5 — GitHub

- OAuth / GitHub App.
- Repository management.
- Commit.
- Push.
- Pull.
- Pull Requests.

## Phase 6 — Cloudflare Deployment

- Account connection.
- Build.
- Deploy.
- Logs.
- Rollback.
- Deployment verification.

## Phase 7 — Commercial SaaS

- Accounts.
- Billing.
- Usage metering.
- Subscription plans.
- Admin Dashboard.
- Analytics.

## Phase 8 — Production Readiness

- Security audit.
- Performance testing.
- E2E testing.
- Documentation.
- Deployment pipeline.
- Monitoring.
- Release process.

# 18. IMPLEMENTATION RULES

1. Работать с существующим репозиторием AZRAIL PULSE.
2. Не создавать новый проект вместо текущего.
3. Не переписывать архитектуру без технического обоснования.
4. Не добавлять декоративные функции вместо работающих.
5. Не имитировать Terminal, Sandbox, GitHub или Deployment.
6. Не сообщать об успехе без подтверждённого результата.
7. Использовать существующие Cloudflare bindings.
8. Сохранять TypeScript.
9. Использовать минимально необходимое количество новых зависимостей.
10. Все изменения должны быть проверяемыми.
11. Все критические функции должны иметь тесты.
12. Сначала стабилизировать ядро, затем расширять функциональность.
13. Не раскрывать API keys и secrets.
14. Не выполнять destructive operations без подтверждения.
15. Не делать commit или push в репозиторий без отдельного разрешения пользователя.

# 19. DEFINITION OF DONE

AZRAIL PULSE считается готовым к коммерческому MVP только тогда, когда пользователь может выполнить следующий сценарий:

1. Зарегистрироваться.
2. Открыть универсальный чат.
3. Создать новый проект.
4. Попросить AI создать приложение.
5. AI генерирует и записывает код.
6. AI запускает Build.
7. AI получает ошибки.
8. AI исправляет ошибки.
9. AI повторно выполняет Build.
10. AI запускает Preview.
11. Пользователь видит реальный результат.
12. Пользователь подключает GitHub.
13. AI создаёт репозиторий.
14. AI выполняет Commit и Push после разрешения.
15. Пользователь подключает Cloudflare.
16. AI разворачивает приложение.
17. AI проверяет Deployment.
18. Пользователь получает рабочий URL.

Все перечисленные операции должны быть реально проверены в end-to-end сценарии.

# 20. FINAL PRODUCT GOAL

AZRAIL PULSE — это коммерческая Hybrid AI Development Platform.

Облачный интеллект управляет процессом.
Desktop Agent выполняет локальные действия.
Sandbox обеспечивает безопасную среду.
GitHub хранит код.
Cloudflare обеспечивает публикацию.
Universal Chat объединяет весь пользовательский опыт.

Продукт должен быть:
- Рабочим.
- Безопасным.
- Масштабируемым.
- Экономически контролируемым.
- Коммерчески готовым.
- Технически документированным.
- Подготовленным к дальнейшему развитию или продаже.

**Final principle:**

Build a real AI execution platform.
Do not build a collection of mock features.
