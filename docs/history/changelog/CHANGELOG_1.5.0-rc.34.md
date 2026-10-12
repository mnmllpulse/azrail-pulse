# AZRAIL 1.5.0-rc.34 — Stage 20 / Professional Data Studio

- Data Studio преобразован из базовой CSV-статистики в отдельный tabular workbench.
- Добавлены schema inference, validation, missing/duplicate/ragged/mixed-type diagnostics.
- Добавлены filter/sort, bounded table preview, numeric statistics и charts.
- Добавлены explicit reversible transformations: trim, empty-row removal, dedupe, header normalization и empty-column removal.
- Добавлены filtered/full CSV export и JSON report export.
- Добавлена migration `026-professional-data-studio.sql` и durable `data_analyses` project history.
- Save flow проверяет account/project/studio ownership private dataset artifact до записи history.
- Добавлен typed event `verification.data.analysis_saved`.
- Добавлен `data:check` и Data Studio architecture gate в static Quality Gate / release-preflight.
- GitHub, Cloudflare и Canva использовались только read-only; remote mutations не выполнялись.
