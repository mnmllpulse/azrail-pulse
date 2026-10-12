# Professional Projects — RC26

Stage 12 закрывает пункт **Projects** из Professional UX плана. Проект становится рабочим центром, а не только карточкой с последней миссией.

## Контракт данных

Canonical таблица `projects` остаётся базовым жизненным циклом. Дополнительные пользовательские метаданные вынесены в безопасный sidecar `project_profiles`, чтобы не переписывать существующие строки destructive ALTER-операциями.

`project_profiles` хранит pinned/favorite, основную студию, tags, archive/delete timestamps и provenance дубликата. `studio_artifact_projects` связывает Studio artifacts с конкретным проектом, чтобы карточка и detail view могли показывать количество и последние результаты.

Migration: `020-professional-projects.sql`.

## Projects API

- `GET /api/projects` — search, status/studio filters и sorting;
- `POST /api/projects` — создать проект;
- `GET /api/projects/{id}` — detail view: missions, versions, artifacts и recent activity;
- `PATCH /api/projects/{id}` — rename, description, favorite, studio, tags, archive/restore;
- `POST /api/projects/{id}/duplicate` — bounded snapshot duplication под project locks;
- `DELETE /api/projects/{id}` — soft delete только с точным заголовком `X-AZRAIL-Confirm-Project: {id}`.

Viewer остаётся read-only. Archive/delete переходы блокируются при активной mission. Удаление на этом этапе мягкое: пользователь может восстановить проект из фильтра «Удалённые».

## UX

На карточке видны только необходимые элементы: название, runtime status, studio, last activity, artifacts/versions/missions, tags, favorite, одна primary кнопка **Открыть** и overflow **⋯**. Rename, Duplicate, Export, Archive и Delete спрятаны в detail/action flow вместо стены из кнопок.

Фильтры: search, status, studio и sort. Legacy project, у которого исторически `name == id`, временно получает понятное display name из последней mission goal до первого rename.

## Ограничения дублирования

Автоматическое дублирование ограничено 400 файлами и 16 MiB текущего workspace snapshot. Source и target сериализуются project locks; при изменении source во время чтения операция прекращается. История missions/версий не клонируется — создаётся новый проект с копией текущего рабочего состояния.

## Release truth

Stage 12 не является production deploy. GitHub/Cloudflare mutations не выполняются. Full release остаётся заблокирован до canonical Node >=24 build, `npm ci`, full typecheck/Vitest/Wrangler dry-run, authenticated runtime smoke и последующих staging/release этапов.
