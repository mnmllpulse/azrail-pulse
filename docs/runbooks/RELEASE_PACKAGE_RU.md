# Runbook: Clean Release Package — AZRAIL 1.5.0-rc.18

Политика содержимого задаётся в `release-manifest.json`.

## Цель

Release artifact содержит runtime, build/release scripts, тесты и текущую эксплуатационную документацию, но не содержит исторические/reference материалы.

## Команды

1. `npm run config:check`
2. `npm run release:package`
3. `npm run release:verify`

Пакет собирается в `.work/release/AZRAIL_PULSE_<version>_release/`. Внутри создаётся `RELEASE_FILES.json` с SHA-256 каждого файла.

## Жёстко исключаются

- `references/`;
- `docs/archive/`;
- старые screenshots/PDF/review assets;
- старые CHANGELOG/VERIFICATION версии;
- legacy Wrangler/deploy config duplicates;
- `.work/` и `node_modules/`.

`release:verify` повторно считает SHA-256 и останавливает release при отсутствии, подмене или попадании запрещённого файла.

## UI build provenance

Перед `npm run release:package` файл `.work/ui-build-mode.json` должен подтверждать canonical `esbuild` build под Node >=24 (`release_verified=true`). Preview fallback build намеренно блокирует release packaging.
