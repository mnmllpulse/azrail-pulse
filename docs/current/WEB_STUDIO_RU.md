# Professional Web Studio — 1.5.0-rc.57

Web Studio использует immutable project workspace и теперь закрывает Series E **E17–E21** поверх существующего Files/Preview/Changes/Tests/Logs/Versions workbench.

## Рабочие области

- **Files** — bounded editor, content search, create/rename/move, optimistic `expectedSha256`, delete через Unified Approval.
- **Preview** — sandboxed iframe с `default-src 'none'`, source-aware Inspector, canonical responsive widths 390/768/1024/1440 и встроенный Browser QA.
- **Layers** — source-aware component tree из React/TSX declarations и HTML `id` / `data-component`; каждый элемент хранит реальный `path:line`.
- **Changes** — immutable snapshot compare/diff/revert в новую workspace revision.
- **Tests** — показывает только подтверждённые verification events; отсутствие события не считается PASS.
- **Logs** — Unified Event Stream.
- **Versions** — immutable snapshots, compare, approval-gated restore into a new workspace revision, ZIP export.

## E17 — Design Contract v2

Контракт проекта хранит не только accent/font, а строгую структуру до генерации кода:

- typography: base size, scale, line-height, heading/body weights;
- grid: columns, gutter, max width;
- breakpoints: 390 / 768 / 1024 / 1440;
- component density/border/focus ring;
- обязательные interaction states `default/hover/focus/active/disabled`;
- обязательные `loading/empty/error/success/offline`;
- `guided` empty state и `recoverable` error state.

Старые v1 contracts нормализуются в v2 при чтении. Контраст текста к background должен быть не ниже 4.5:1, accent — не ниже 3:1.

## E18 — Visual ↔ Code

Inspect mode работает внутри локального preview. При выборе DOM-элемента Web Studio получает selector, tag, безопасный набор attributes и source mapping. `Open source` открывает реальный файл/строку. `Edit with AZRAIL` создаёт scoped mission с указанием source file, selector и требования сохранить Design Contract/responsive/accessibility. Web Studio не делает скрытую remote mutation.

## E19 — Layers / Component Tree

Backend source scanner определяет:

- React function components;
- React const/arrow components;
- React class components;
- HTML элементы с `id`;
- HTML элементы с `data-component`.

Tree не выдаёт DOM-эвристику за точную AST-карту: если source mapping не доказан, UI показывает только найденную source declaration.

## E20 — Responsive Editing

Preview работает на канонических ширинах **390 / 768 / 1024 / 1440 px**. Это canvas review, а не отдельный production browser test.

## E21 — Browser QA

Проверка реально выполняется в браузерном DOM sandboxed preview и ищет:

- horizontal overflow;
- duplicate IDs;
- form inputs без label/aria-label;
- images без `alt`;
- interactive elements без accessible name;
- touch targets меньше 44px;
- heading-order gaps;
- text contrast < 4.5:1, когда background вычислим;
- console/runtime errors;
- CSP-blocked requests.

Score пересчитывается backend из findings, поэтому клиент не может прислать несогласованный score. Report пишется в Event Stream как `verification.web.browser_qa` с `source=client-dom-static-preview`. Это **не** заменяет E37 real E2E, Browser Rendering или production acceptance.

## Backend invariants

- максимум 400 файлов и 16 MiB на interactive workspace operation;
- editor file <= 1 MiB;
- writes только через `withProjectLock` + `publishWorkspace`;
- stale update блокируется `expectedSha256`;
- delete/restore требуют Unified Approval;
- Web Studio не выполняет auto-merge, push, deploy или production mutation.

## Release boundary

RC54 остаётся локальным source checkpoint. GitHub/Cloudflare/Canva проверялись read-only. Production release требует Node >=24, staging gates, live E2E, security verification, backup drill и отдельное approval.
