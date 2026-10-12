# Professional Audio Lab · RC32

Audio Lab выполняет **локальный offline-анализ** декодированного PCM. Аудио не отправляется в облако для измерения mastering-метрик.

## Метрики

- Integrated LUFS — BS.1770-style K-weighted gated estimate;
- Short-term LUFS — 3-секундные окна;
- Loudness Range — LRA estimate по gated short-term loudness;
- True Peak — 4× cubic inter-sample estimate;
- RMS и Crest Factor;
- stereo correlation и stereo width;
- clipping, silence и longest silence;
- DC offset;
- spectral balance, spectral centroid, dominant frequency;
- BPM estimate с confidence;
- key estimate с confidence;
- Waveform;
- Spectrogram;
- Reference Comparison.

## Инженерные границы

Audio Lab предназначен для профессиональной диагностики, но **не заявляет сертификацию broadcast/mastering meter**. Реализация loudness использует K-weighted gating по принципам BS.1770, а true peak вычисляется как bounded 4× cubic inter-sample estimate, а не сертифицированным oversampling meter.

BPM и key являются оценками. При недостаточной уверенности система возвращает `null`, а не выдумывает результат.

## Bounded contract

- mono/stereo;
- sample rate 8–192 kHz;
- decoded duration до 15 минут;
- input file до 30 MB;
- до 128 распределённых FFT-окон;
- 4096-point Hann FFT;
- bounded waveform/spectrogram summaries;
- AbortSignal останавливает CPU-анализ.

## Reference Comparison

Reference track анализируется тем же локальным pipeline. Сравнение показывает числовую разницу `candidate − reference` для loudness, true peak, LRA, RMS, stereo width, BPM и spectral balance. Оно не присваивает субъективный рейтинг качества.

## Cloud boundary

В RC32 Cloudflare/Workers AI не используется для mastering-метрик. Это намеренная truth boundary: текущие cloud audio models могут решать задачи speech/multimodal inference, но Audio Lab не маскирует их под LUFS/true-peak analyzer.
