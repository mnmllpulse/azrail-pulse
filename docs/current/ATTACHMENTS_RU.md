# Attachment Manager — RC27

Status: current

Stage 13 закрывает пункт **Attachment Manager** из Professional UX плана.

## Что изменилось

- Composer больше не читает прикреплённые файлы целиком в браузере и не склеивает их с prompt.
- Каждый файл загружается через `/api/upload` в private R2 и передаётся в задачу как `AttachmentRef`.
- Upload привязан к `projectId`; доступ к проекту проверяется на сервере.
- Максимум за один запрос: 12 файлов; приложение принимает файлы до 50 MB каждый в рамках существующего upload contract.
- UI показывает состояние `queued / uploading / ready / failed`, размер, тип, удаление и retry.
- Отправка задачи блокируется, пока есть незавершённая или failed загрузка.
- Backend сохраняет старые bounded reads: текст читается ограниченно, ZIP анализируется с бюджетами, бинарные типы не выдаются за текст.
- R2/D1 publication остаётся fail-closed: ambiguous D1 response перепроверяется до cleanup.

## Поддерживаемые форматы

ZIP, PDF, DOCX, TXT/MD/JSON, HTML/CSS/JS/TS/TSX/JSX/PY, PNG/JPG/WEBP/SVG, MP3/WAV/M4A, MP4/MOV/WEBM.

## Security invariants

- filename sanitization;
- project ownership check;
- fresh UUID R2 key;
- bounded body size;
- no browser-side prompt stuffing;
- no automatic retry of unknown server outcome beyond explicit user retry;
- no GitHub/Cloudflare mutation performed by this stage.

RC27 остаётся source checkpoint. Production release требует Node >=24 canonical build и финальный Release-блок master-плана.
