# Studio Module Registry — текущий контракт

Начиная с RC22 каталог студий и исполняемая логика разделены.

## Source of Truth

- `ui/studio-manifest.ts` — названия, маршруты, тип, действие, icon key и capabilities.
- `ui/studio-registry.ts` — только lazy loaders модулей.
- `ui/studio-types.ts` — контракт `StudioModule` и runtime context.
- `ui/studio-modules/*.ts` — отдельная реализация каждой студии.
- `ui/app.ts` — shell маршрутизации и lifecycle; не содержит `if (id === '...')` для конкретных студий.

## Правила

1. Каждая студия открывается по собственному адресу `/studios/:id`.
2. Новая студия добавляется через manifest + отдельный module file + registry loader.
3. Модуль обязан использовать canonical metadata через `studioMeta(id)`, чтобы title/action/type не расходились.
4. Cloud write capability блокируется для viewer и для неавторизованного пользователя, если studio cloud-only.
5. При уходе со страницы предыдущий module run получает AbortSignal/epoch fencing и не может перезаписать новую страницу поздним результатом.
6. Черновики остаются изолированными по studio ID и account scope.
7. `npm run studios:check` и release preflight блокируют возврат центрального per-studio branching.

## Текущие модули

`web`, `image`, `music`, `video`, `audio`, `als`, `data`, `ledger`, `lab`.

Следующие профессиональные UX-апгрейды каждой студии выполняются поверх этого контракта, а не внутри центрального `app.ts`.

## Preview и release build

В среде без локального `esbuild` допускается только preview build через `scripts/build-unified-fallback.mjs`. Он создаёт `.work/ui-build-mode.json` с `release_verified=false`.

`npm run release:package` теперь откажется собирать release artifact из такого preview. Для release требуется canonical `scripts/build-unified.mjs` под Node >=24, который ставит `mode=esbuild` и `release_verified=true`.
