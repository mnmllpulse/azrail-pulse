# Product Intelligence — RC63

## Memory hierarchy

`user -> workspace -> project -> studio domain -> agent/session`

Каждая запись хранит scope, source, confidence, optional TTL и project/studio binding. TTL применяется при чтении; память не считается бессрочной автоматически.

## Asset Intelligence

Каждый новый Studio artifact получает базовую запись `asset_intelligence`: kind, mime, bytes, studio, project, tags и usage counter. `embedding_ref` отделён от базового сохранения: embedding может добавляться асинхронно и не блокирует загрузку файла.

## Professional Review

Review findings имеют четыре уровня: `critical`, `major`, `minor`, `improvement`. Хранилище сохраняет исходные findings и агрегированные counts. Safe auto-fix обозначается отдельно и не означает разрешение на внешнюю мутацию.

## Compare Mode

A|B сравнивает две разные версии/артефакта без изменения источников. Domain contract поддерживает music, image, video, web, prompt и generic.

## Music boundary

Beatport используется только как metadata/reference source. Audio metrics принимаются только как измеренный `MusicAnalysis`; production brief запрещает копирование melody/vocals/signature samples/exact arrangement.


## RC63 cross-cutting closure

Universal Compare Center использует реальные сохранённые artifacts и native MIME preview; Web source diff остаётся в Changes/Versions. Professional Review actions выполняются только по findings с `safeAutoFix=true`; unsafe findings не получают автоматический repair path. Полный contract описан в `docs/current/CROSS_CUTTING_FINAL_RU.md`.
