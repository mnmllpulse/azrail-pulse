# Структура репозитория

Status: current

## Цель

Корень репозитория содержит только файлы, необходимые разработчику сразу: package/config/build manifests, README/START/DEPLOY, schema и canonical Wrangler configs. История релизов, старые аудиты и previous verification receipts вынесены из корня.

## Активные каталоги

`src/`, `ui/`, `public/`, `migrations/`, `scripts/`, `tests/`, `config/`, `verification/`, `.github/` — исполняемая/проверяемая часть проекта.

`docs/current/`, `docs/runbooks/`, `docs/product/`, `docs/releases/` — актуальная документация.

`docs/history/`, `verification/history/` и `references/legacy/` — неисполняемая история/референсы. Они не должны импортироваться production runtime или попадать в runtime bundle, но **RC52 Full Archive** сохраняет их внутри source ZIP для полного аудита, трассируемости и переноса репозитория.

## Автоматическое правило

`npm run repo:hygiene` проверяет root allowlist, JSON/UTF-8, JS/MJS syntax, shell/Python syntax, TypeScript parser diagnostics, активные Markdown links, junk-файлы, executable implementation stubs и исторические RC-файлы в корне.

Новый исторический файл нельзя класть в root. Changelog текущего RC хранится в `docs/releases/`, прошлые changelog — сводка `docs/history/CHANGELOG_ARCHIVE.md` (полные тексты в ветке `archive/docs-2026-11`), прошлые verification receipts — `verification/history/rc/`.
