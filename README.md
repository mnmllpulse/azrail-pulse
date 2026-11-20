# AZRAIL × MNMLL PULSE OS — Unified 1.5.0-rc.63

AZRAIL PULSE is a Cloudflare-first multi-agent platform with project workspaces, studios, approval controls, durable event/recovery state, OIDC access, staging/production separation, and fail-closed release tooling.

Состояние на 20 ноября 2026: репозиторий опубликован (закрытый `mnmllpulse/azrail-pulse`, ветка `main`), рабочий сайт — воркер `azrail-pulse`, учебная копия — `azrail-pulse-staging`. Подробности — в `docs/current/RELEASE_STATUS_RU.md`.

This repository is the **full audited source archive**: active runtime plus non-runtime history/legacy material kept for traceability. Runtime/deploy packaging still excludes historical/reference material. Historical audits and old release evidence are no longer scattered across the root; current code, current operator documentation, verification contracts, and archived material are separated explicitly.

## Repository map

| Path | Purpose |
|---|---|
| `src/` | Worker runtime, agents, execution engine, storage, auth and APIs |
| `ui/` | Current Unified UI source and lazy studio modules |
| `public/` | Static/legacy-compatible public surfaces still used by the Worker |
| `site/` | Generated Cloudflare asset bundle used by the current build flow |
| `migrations/` | Ordered D1 migrations (`002` → current) |
| `config/` | Canonical environment model; generated Wrangler configs derive from it |
| `scripts/` | Quality, security, migration, staging, release and packaging tooling |
| `tests/` | Regression and architecture tests |
| `verification/` | Current release/security contracts and current RC evidence |
| `docs/current/` | Current operational truth |
| `docs/runbooks/` | Operator/release procedures |
| `docs/product/` | Product architecture/specification/branding source documents |
| `docs/releases/` | Current release changelog |

See [`docs/product/README.md`](docs/product/README.md) and [`docs/current/REPO_LAYOUT_RU.md`](docs/current/REPO_LAYOUT_RU.md).

## Current product surface

Интерфейс — **один чат**. Фраза сама выбирает действие: ответ, картинка («нарисуй…»; «рисуй» без описания берёт прошлый промпт; правка приложенной картинки идёт в том же чате), страница, файл, схема, трек, раскадровка или команда локальному агенту. «Промпт этой картинки», «опиши фото» остаются разговором. Студии (Web, Image, Music, Video, Audio, Ableton, Data, Ledger, Pulse) и Metatron сохранены как внутренние модули и не показаны на главном экране; служебные экраны открываются переключателем «Эксперт».

- Сайдбар: «Новый чат», «Поиск», «Проекты», «Архив», список чатов, меню аккаунта (ник вместо почты, фото профиля).
- Поле ввода: вложения (скрепка, вставка, перетаскивание), микрофон, кнопка модели с уровнем усилий, отправка сразу без ожидания.
- Меню моделей: каталог Cloudflare и отдельная группа OpenRouter; метки бесплатных, Workers Paid и сторонних. См. [`docs/current/MODELS_RU.md`](docs/current/MODELS_RU.md).
- Ответы AZRAIL структурированы (заголовки `###`, списки, цитаты, разделители), рендерер — `ui/chat-markdown.ts`.
- Настройки: единый Settings Center — аккаунт и профиль, внешний вид, управление и доступность, AI и модели, голос, провайдеры и API, подключения, локальный агент, безопасность и разрешения, данные и память, использование и лимиты, о системе и диагностика.
- Остаток чата и генерации (200 / 500 в сутки) и остаток нейронов показываются в интерфейсе.

Projects, attachments, approval receipts, event replay, observability correlation, project ownership, connector health, workspace snapshots, budgets and release evidence are wired into the Worker architecture. Подробный список изменений после rc.63 — в `docs/releases/CHANGELOG_1.5.0-rc.63.md`.

The event stream now has a SHA-256 tamper-evident integrity sidecar (`event_integrity`) for newly written events. Forks are rejected by a unique predecessor constraint and writers retry against the new durable head.

## API surface and core modules

Worker routes (`src/index.ts`): `/api/task`, `/api/upload`, `/api/uploads`, `/api/agents`, `/api/selftest`, `/api/models`, `/api/tools`, `/api/chat`, `/api/tts`, `/api/trial`, `/api/plan`, `/api/limits`, `/api/mission`, `/api/conversations`, `/api/polish`, `/api/stream`, `/api/bench`, `/api/admin`, `/api/metrics`, `/api/approvals`, `/api/backups`, `/api/me`, `/api/metatron`, `/api/openrouter-status`, `/api/admin/openrouter-refresh`, `/health`, `/health/live` (plus the unified/studio routes under `src/unified/`, включая `/api/studio/budget` и `/api/studio/image`). `/health/live` отвечает JSON с версией сборки и используется проверкой staging. `/api/plan` turns a phrase into parts. `/api/limits` reads the daily chat and generation remainder without spending it.

Core modules: `src/core/execution-engine.ts` (execution-engine: mission loop), `src/lib/tool-registry.ts` (tool-registry), `src/lib/workspace.ts` / `workspace-head.ts` (workspace), `src/lib/chat-store.ts` (chat-store), `src/lib/event-store.ts` (event-store). Request input contracts live in `src/shared/schemas.ts` (Zod).

## Local verification

**Canonical release runtime: Node.js 24.18.0.**

```sh
npm ci
npm run repo:exhaustive
npm run repo:hygiene
npm run quality:static
npm run node24:suite
npm run build:check
```

`npm run quality:static` is intentionally dependency-light and verifies architecture/contracts without changing GitHub or Cloudflare. `node24:suite` is the canonical dependency-backed verification and must run under Node 24 with `npm ci` completed.

The package includes `.nvmrc` and `.node-version` pinned to Node `24.18.0`.

## Release safety

Как выкладывается сейчас:

- Слияние PR в `main` запускает GitHub Actions: полный `check`/`verify` под Node 24, затем `deploy_staging` (`.github/workflows/staging-auto-deploy.yml`) и проверку `npm run staging:auto-health` (`/health/live`, версия сборки = `package.json`).
- Рабочий воркер `azrail-pulse` обновляет **Cloudflare Workers Builds**: репозиторий подключён к Cloudflare, и после слияния в `main` воркер собирается и выкладывается сам (check «Workers Builds: azrail-pulse» на коммите). GitHub-workflow `deploy.yml` для production остаётся отключённым (`if: false`).
- Проверки GitHub не блокируют сборку Cloudflare: красный Verify на `main` не останавливает выкладку. Поэтому PR сливается только после зелёных проверок.
- Секреты (`OPENROUTER_API_KEY`, `OIDC_CLIENT_SECRET` и др.) хранятся только как секреты Worker и в чат/репозиторий не попадают.

Строгий контур `production:*` (ниже) описан и проверяется скриптами, но им не пользуются для ежедневных выкладок; квитанция `VERIFIED_RELEASED` не записана, статус выпуска — **CONDITIONAL** (`docs/current/PRODUCTION_READINESS.md`).

- generic `deploy`, direct schema writes and direct production deploy scripts are disabled;
- staging migration/deploy, GitHub PR publication and production release each have separate fail-closed gates;
- the strict production release path requires verified Node24 evidence, staging evidence, security evidence, backup/restore evidence, production approval, a reviewed/merged GitHub PR and fresh Cloudflare/GitHub leases;
- migration/release tooling requires backup-before-mutation;
- production Time Travel restore is never automatic.

Operator entry points:

```sh
npm run release:preflight
npm run staging:migration:check
npm run staging:deploy:check
npm run staging:smoke:check
npm run security:verify:check
npm run production:drift:check
npm run backup:restore:check
npm run production:approval:check
npm run github:pr:check
npm run production:release:check
```

Read the runbooks before any remote mutation: [`DEPLOY_RU.md`](DEPLOY_RU.md) and [`docs/runbooks/`](docs/runbooks/).

## Environment truth

`config/environments.json` is the canonical source for staging/production configuration. `wrangler.staging.json` and `wrangler.production.json` are generated and verified from it.

Production OIDC identifiers are intentionally **not invented** in source. A production release remains blocked until the real production OIDC client/issuer and preview-access policy are explicitly verified.

### OIDC admin groups

Web (OIDC) users are `editor` by default. An OIDC user becomes `admin` (can decide approvals, manage accounts/backups) only when the verified ID token carries a configured admin group:

| Var | Default | Meaning |
| --- | --- | --- |
| `OIDC_ADMIN_GROUPS` | `pulse-admins` | Comma-separated group names that grant admin. Set to an empty string to disable admin for OIDC entirely. |
| `OIDC_GROUPS_CLAIM` | `groups` | ID-token claim holding the groups. If that claim is absent, `roles` is checked. |

Fail closed: a missing, empty or non-array claim (or non-string entries) gives `editor`. The role is recomputed on every login (removing a user from the group takes effect at their next login; existing sessions last up to 12 h). Emptying `OIDC_ADMIN_GROUPS` downgrades all live OIDC sessions immediately. A manual `viewer` downgrade is kept. API-key accounts are unaffected; non-OIDC accounts never get admin through a web session.

The IdP must put the groups into the **ID token** (Cloudflare Access: enable the `groups` claim for the OIDC SaaS application). Both values live in `config/environments.json` → `vars` and are generated into `wrangler.*.json` by `npm run config:generate`.

## Historical material

Historical changelogs, previous RC receipts, old audits and legacy source snapshots remain in this Full Archive source package for traceability, but are excluded from the runtime/release bundle by `release-manifest.json`. Current operational truth lives only in `docs/current/`, `docs/runbooks/`, `docs/product/`, `docs/releases/` and `verification/`.

## Current status

See [`docs/current/RELEASE_STATUS_RU.md`](docs/current/RELEASE_STATUS_RU.md) and [`docs/current/REPOSITORY_AUDIT_RU.md`](docs/current/REPOSITORY_AUDIT_RU.md).

Версия в `package.json` — `1.5.0-rc.63`; изменения после неё перечислены в changelog без повышения версии. Проверки на 20 ноября 2026: 204 тестовых файла / 2072 теста, `quality:static` 59 из 59, миграции D1 `002`–`038`.
