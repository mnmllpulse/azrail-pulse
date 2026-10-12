# Полный построчный аудит репозитория — RC50

## Цель

RC50 выполняет более строгую проверку, чем предыдущая уборка RC48: **каждый файл будущего GitHub ZIP проходит inventory/hash pass, а каждый декодируемый текстовый файл — построчный scan**. Исторические `docs/history/`, `verification/history/` и `references/legacy/` также входят в проверку, хотя они остаются non-runtime и non-authoritative.

Это не означает, что удалённые runtime-проверки можно подменить статическим анализом. Локальная среда всё ещё Node 22.16.0, тогда как canonical release runtime — Node 24.18.0. Поэтому dependency-backed Node24 suite и live Cloudflare smoke не объявляются выполненными.

## Два repository gates

`npm run repo:exhaustive` проверяет всё дерево, кроме только transient `.git`, `.work`, `node_modules` и `backups`. Проверяются:

- SHA/inventory каждого файла;
- UTF-8 и **каждая строка** текста на control characters и merge-conflict markers;
- JSON/JSONC, YAML structure, TOML, XML/SVG;
- JS/MJS/CJS syntax для current + history/legacy;
- Python и shell syntax без создания `__pycache__`;
- TypeScript parser для **всех TS/TSX**, включая legacy snapshot;
- все relative Markdown links во всех Markdown-файлах;
- PNG/JPEG/WebP container signatures, DOCX ZIP integrity и PDF container markers;
- static relative imports в active `src/`, `ui/`, `scripts/`, `tests/` через TypeScript AST;
- package script entrypoints;
- executable placeholder/TODO patterns в active source;
- case-insensitive path collisions и exact duplicate groups.

`npm run repo:hygiene` остаётся более быстрым structural gate для root-layout, current docs, active syntax и current implementation stubs. Оба встроены в `quality:static` и Node24 suite.

## Исправления, найденные именно глубоким audit

В дополнение к RC48 cleanup исправлено:

1. Удалены случайные Python `__pycache__`/`.pyc`, которые могли появляться от старого checker; `.gitignore` теперь блокирует их, а оба checker используют compile-without-output.
2. Из четырёх исторических Worker dry-run логов удалены ANSI control sequences.
3. Исправлены старые relative Markdown links в архивных DEPLOY/START/README и `GITHUB_CANVA_REVIEW_RU.md`.
4. `tsconfig.json` корректно проверяется как JSONC, а не ошибочно как строгий JSON.
5. Static import audit переведён на AST, поэтому строки с fixture-кодом не дают ложные unresolved-import errors.
6. Добавлен отдельный self-contained `repo:exhaustive`, который в CI не требует Pillow/PyYAML.
7. `scripts/deploy-ci.mjs` усилен: OIDC deployment без `OIDC_CLIENT_SECRET` запрещён; staging может брать публичные OIDC issuer/client из canonical config, production — только из проверенных внешних inputs.
8. Добавлен автоматический **staging-only** GitHub → Cloudflare pipeline после полного CI. Production auto-deploy остаётся намеренно отключён.

## Автоматический GitHub → Cloudflare staging

`.github/workflows/staging-auto-deploy.yml` запускается при `push` в `main`. Сначала он выполняет `npm ci`, dependency audit, exact source-manifest check, exhaustive + hygiene audit, `quality:static` и canonical Node24 suite. Только после успешного `verify` отдельный `deploy_staging` job с GitHub Environment `staging` запускает guarded `npm run deploy:ci`.

Для реального future deployment в GitHub Environment `staging` должны быть настроены `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` и `OIDC_CLIENT_SECRET`; optional integration secrets остаются отдельными. В ZIP никаких secret values нет.

**Production не деплоится автоматически.** `.github/workflows/deploy.yml` по-прежнему содержит fail-closed `if: ${{ false }}` и остаётся под Stage D #38 approval/release contract.

## Что означает «проверен каждый файл»

Финальный exhaustive report фиксирует `files_scanned`, `text_files_scanned`, `lines_scanned`, `bytes_scanned`, все checks, warnings и failures в `.work/repo-exhaustive.json`. Сам `.work` не входит в GitHub ZIP; итоговая трассируемость обеспечивается `verification/current/VERIFICATION_RC50.json` и `SOURCE_MANIFEST.json`.

Статический проход способен доказать parse/syntax/structure/integrity и множество архитектурных инвариантов. Он **не может честно доказать** runtime behavior зависимостей, Cloudflare deployment, OIDC login или production readiness без Node24/dependencies/live environment. Эти состояния остаются отдельными fail-closed gates.

## Удалённые системы

На RC50 GitHub, Cloudflare и Canva использовались только read-only для свежей сверки. Ads Manager не относится к repository build/deploy path и не изменялся. Remote GitHub branch/PR, Worker deploy, D1 migration, secret mutation и Canva edit не выполнялись.

## Итог

RC52 — **Full Archive GitHub source package**: весь current/history/legacy контур сохранён в одном ZIP и проходит exhaustive static audit; staging auto-deploy wiring сохранён. Для production по-прежнему обязательны незакрытые master prerequisites: Node24 evidence, staging migration/deploy/smoke/security, cloud restore proof, production approval, reviewed GitHub PR и Stage D #38 release verification.

## RC50 deep architecture audit

`npm run repo:deep` добавляет regression checks для bounded ZIP inspection, shared GitHub transport, bounded OSV/npm networking, Video Studio resource cleanup, visible studio history error/retry states, shared UI DOM helpers, Web Workbench escaping и CI fail-closed invariants. `npm run repo:hygiene` остаётся базовым layout/hygiene gate.


## RC52 — полный архив

RC52 сохраняет весь проверенный исторический и legacy-контур (`docs/history/`, `verification/history/`, `references/legacy/`) внутри итогового ZIP. Эти файлы не участвуют в runtime/deploy, но проходят exhaustive-аудит вместе с активным деревом. Активная реализация использует hardening/refactoring RC50 без удаления исторических материалов.
