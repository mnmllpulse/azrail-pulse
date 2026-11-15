# Professional Music Studio — 1.5.0-rc.57

Status: current

Stage 16 закрывает пункт **Music Studio** из Professional UX master-плана.

## UX-контракт

Music Studio держит один основной CTA — **Generate**. Пользователь задаёт Prompt, Genre, Mood, BPM (или Auto), Key (или Auto), Scale, Bars, Time signature, Pattern, Arrangement и Synth preset. После генерации доступны встроенное прослушивание, Waveform, Piano Roll, Download WAV, Download MIDI и Save session.

## Честная модель исполнения

Текущий Cloudflare Workers AI каталог не подтверждает text-to-music модель, поэтому RC30 не имитирует несуществующий provider. Музыка синтезируется локально через bounded `OfflineAudioContext` и deterministic procedural engine. Cloudflare используется только для уже существующего authenticated storage/session metadata path при явном Save session.

## Bounded engine

- BPM: 60–180 или Auto;
- Bars: 1–16;
- Scale: Minor / Major / Dorian / Phrygian;
- Time signature: 4/4, 3/4, 6/8;
- Pattern: Pulse / Arpeggio / Bassline / Chords / Ambient;
- Arrangement: Loop / Intro-Build-Drop / Minimal Evolution;
- Synth preset: Dark Pulse / Warm Pad / Glass / Sub / Acid.

Auto BPM и Auto Key вычисляются детерминированно из prompt/config, поэтому одна и та же сессия воспроизводится одинаково. MIDI содержит tempo/time-signature metadata и ноты arrangement. WAV рендерится локально в 44.1 kHz stereo PCM.

## Durable sessions

Migration `023-professional-music-studio.sql` добавляет `music_sessions`. При Save session UI сохраняет WAV и MIDI через приватный Studio artifact path, после чего создаёт metadata record с project binding, resolved BPM/key/scale, arrangement, synth preset и seed. Artifact ownership проверяется на backend; чужой artifact или artifact другого проекта не принимается.

Удаление сохранённого WAV/MIDI не блокируется metadata: foreign keys используют `ON DELETE SET NULL`.

## Safety / truthfulness

- ordinary user не выбирает несуществующую cloud music model;
- локальный движок не выдаётся за generative provider;
- browser render bounded до 16 bars;
- cloud writes происходят только по явному Save session;
- GitHub/Cloudflare/Canva remote mutations в Stage 16 не выполняются.

## RC56 — Music Intelligence Studio 2.0 / F01–F16

RC56 добавляет профессиональный measured-audio слой поверх существующего procedural composer.

### Multi-track Intake

- локальная очередь **1–20** аудиофайлов;
- состояния `waiting → analyzing → done / failed / cancelled`;
- тяжёлый анализ выполняется последовательно, чтобы не блокировать UI несколькими декодерами одновременно;
- аудиофайлы не отправляются во внешний provider только ради анализа.

### Measured intelligence

Для каждого трека используются реальные данные существующего PCM analyzer: BPM/confidence, global key/confidence, Integrated/Short-term LUFS, LRA, true peak estimate, crest factor, spectrum, stereo correlation/width и pitch-class energy profile.

Дополнительно RC56 строит адаптивные локальные окна анализа. Из них формируются:

- Local key / Camelot timeline;
- measured energy timeline;
- Auto Structure как **явно обозначенная эвристика** на базе измеренных окон;
- chord tendencies из нормализованного chroma-профиля. Это не exact chord transcription.

### Reference workflow

Reference Matrix показывает BPM, key, Camelot, LUFS, energy и количество structural sections для всех проанализированных треков. A/B player умеет относительный LUFS Match только через ослабление более громкого файла, без boost выше unity.

### Production Brief / Learning Coach

Production Brief строится из измеренных характеристик и всегда содержит Originality Guard: не копировать melodies, vocals, signature samples и exact arrangement. Learning Coach сравнивает V1/V2 только по доступным измеряемым метрикам и не присваивает художественный score.

### Music Memory

Пользователь может сохранить измеренный analysis в существующую hierarchical Music Memory. В память записываются метрики и structure summary, а не содержимое чужой мелодии.

## RC57 — F17–F20 DAW / Composition / Render Intelligence

### F17 — DAW Project Import Gateway

Локально добавлен единый `DAWImportAdapter` с безопасным структурным импортом:

- `.dawproject` — ZIP-контейнер с обязательным `project.xml` и optional `metadata.xml`;
- `.als` — существующий Ableton Live Set parser;
- Ableton Project ZIP — поиск и разбор Live Set внутри project container;
- Generic Project ZIP fallback — stems/MIDI/audio + optional `project.json`.

ZIP до распаковки проходит central-directory safety scan: bounded entry count, single-entry size, expanded-size quota и path traversal rejection. Текущий синхронный Worker intake намеренно ограничен **12 MiB compressed / 64 MiB expanded**. Большие production DAW projects должны перейти на direct R2 multipart ingest + durable processing, а не буферизоваться целиком в Worker request.

### F18 — Plugin Compatibility Scanner

Scanner извлекает plugin descriptors из доступной project metadata, но **не притворяется**, что browser/Worker умеет проверять локально установленный VST/AU. По умолчанию статус — `local-status-unknown`. `declared-installed` появляется только когда установка подтверждена доверенным inventory. Доступные safe actions: Keep placeholder / Use audio bounce / Replace device. Plugin state не исполняется при импорте.

### F19 — Composition Engine

Measured analysis преобразуется в абстрактный Composition Plan: target BPM/key/Camelot, harmonic skeleton, arrangement, bass/arp/lead/pads/drums/FX/transitions/automation. Кнопка **Apply safe settings** переносит только безопасные параметры в procedural composer (tempo/key/scale/bars) и не копирует melody, plugin state или reference audio.

### F20 — Render → Analyze → Improve

После WAV render итоговый файл автоматически проходит тот же measured PCM analyzer. Review проверяет target BPM/key, true peak, optional explicit LUFS target, correlation/stereo diagnostics и формирует конкретные next actions. Это измерительный production loop, а не субъективный «artistic quality score». Следующая итерация запускает новый render через существующий composer.

### Persistence

Migration `032-music-daw-import.sql` добавляет `music_daw_imports`. При наличии `projectId` source artifact и compact structured report сохраняются через существующие ownership/project boundaries; без `projectId` импорт остаётся analysis-only. Remote D1 migration в RC57 не выполнялась.
