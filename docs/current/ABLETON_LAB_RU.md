# Professional Ableton Lab · RC33

Ableton Lab анализирует `.als` / Ableton XML как **read-only project structure**. Исходный Live Set не изменяется.

## Что извлекается

- BPM;
- time signature;
- scenes;
- groups;
- Audio / MIDI / Group / Return tracks;
- clips;
- devices;
- third-party plugin descriptors;
- automation envelopes;
- track routing;
- sidechain metadata;
- sample/FileRef inventory;
- master chain;
- frozen/inactive state metadata.

## Project checks

Проверки разделены на факты из ALS и эвристики:

- missing plugins — только если ALS явно содержит unavailable/missing marker;
- missing samples — только если FileRef явно помечен unavailable/missing;
- duplicated processing — эвристика одинаковых device names на одном track;
- routing loops — только для output routes, которые можно сопоставить с именами треков;
- sidechain topology — по сохранённым sidechain nodes;
- gain staging warnings — консервативная эвристика stored mixer values;
- CPU-heavy devices — эвристика известных тяжёлых devices/plugins;
- frozen tracks;
- inactive devices.

Ableton Lab **не проверяет локальную файловую систему и установленные плагины пользователя**, поэтому отсутствие sample/plugin на конкретном компьютере не объявляется фактом без соответствующего ALS marker.

## Safety bounds

- compressed input: до 12 MiB;
- unpacked XML: до 24 MiB;
- DTD / ENTITY запрещены;
- XML entity processing отключён;
- traversal ограничен node budget;
- source сохраняется только в private project artifact flow после явного запуска анализа в выбранном Project.

Cloudflare Workers имеют ограниченную память, поэтому large-file contract намеренно bounded. Для очень больших media/object uploads R2 поддерживает streaming/multipart flows, но Ableton parser не должен загружать неограниченный XML в память Worker.

## Durable history

Migration `025-professional-ableton-lab.sql` создаёт `ableton_analyses`.

History хранит:

- account/project provenance;
- source artifact ID;
- filename;
- Ableton version;
- BPM/time signature;
- track/scene/issue counts;
- bounded JSON report snapshot;
- `report_truncated` marker;
- created_at.

Исходный `.als` хранится как private `studio_artifacts` object, а связь с Project проходит через `studio_artifact_projects` с `studio_id = als`.

## Event Stream

После project-bound анализа публикуется typed event:

`verification.ableton.analysis_completed`

Event Stream является operational projection; canonical history остаётся в `ableton_analyses`, а source provenance — в `studio_artifacts` / R2.
