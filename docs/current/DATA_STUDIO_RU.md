# Professional Data Studio · RC34

Status: current

Data Studio — локальный табличный workbench для CSV/TSV-like datasets. Анализ данных выполняется в браузере; Cloudflare используется только когда пользователь явно нажимает **Save dataset to Project**.

## Workflow

`CSV / TSV → bounded parser → schema inference → validation → filter/sort → statistics → chart → explicit transformations → export/save`.

## Bounded parser

- исходный текст: до 2 MB;
- строки: до 50 000;
- столбцы: до 256;
- суммарно: до 250 000 ячеек;
- RFC-style quoted cells, escaped quotes, multiline cells;
- BOM, comma, semicolon и TAB delimiter detection;
- decimal-comma numeric inference допускается для semicolon/TAB datasets, при этом исходное значение не переписывается автоматически.

Эти ограничения намеренно консервативны: Data Studio не должен превращать browser UI или Worker в неограниченный in-memory ETL runtime.

## Schema inference и validation

Для каждого столбца определяются:

- `number`, `boolean`, ISO `date`, `category`, `text` или `empty`;
- filled / missing;
- unique count;
- type mismatch count;
- для чисел: min, max, stable mean, median, standard deviation;
- top values для categorical/text inspection.

Validation отдельно показывает пустые/повторяющиеся headers, ragged rows, missing cells, duplicate rows и mixed-type mismatches. Inference — это диагностическая эвристика, а не автоматическое изменение исходных данных.

## Explorer и charts

Table explorer поддерживает global filter и type-aware sort. UI показывает максимум 200 совпавших строк за один preview, сохраняя полный bounded dataset для local export.

Chart строит histogram для numeric column или top-frequency bars для categorical/text column. Внешняя BI/analytics библиотека не требуется.

## Transformations

Transformations применяются только после явного действия пользователя:

- trim whitespace;
- drop empty rows;
- remove duplicate rows;
- normalize headers;
- drop empty columns.

Исходный `File` не изменяется. До save/export пользователь может вернуть исходный parsed dataset через **Reset dataset**.

## Export и project history

Data Studio может экспортировать:

- текущий filtered/sorted CSV;
- полный текущий dataset CSV;
- JSON analysis report.

При явном **Save dataset to Project** текущий CSV сначала сохраняется как private `studio_artifacts` object с `studio_id=data`, затем backend проверяет ownership/project binding и создаёт запись `data_analyses`.

Migration `026-professional-data-studio.sql` хранит:

- project/account provenance;
- dataset artifact ID;
- filename / delimiter;
- row / column / issue counts;
- transformations JSON;
- bounded schema JSON;
- summary JSON;
- created_at.

Удаление artifact не уничтожает analysis history: `dataset_artifact_id` использует `ON DELETE SET NULL`.

## Event Stream

После сохранения project-bound analysis публикуется:

`verification.data.analysis_saved`

Event Stream остаётся operational projection. Canonical history — `data_analyses`, а bytes/provenance dataset — private R2 + `studio_artifacts`.

## Cloud boundary

Local filter/sort/statistics/chart/transformations не используют Workers AI. Cloudflare R2/D1 задействуются только после явного save. Это соответствует privacy-first и simplicity contract Data Studio.
