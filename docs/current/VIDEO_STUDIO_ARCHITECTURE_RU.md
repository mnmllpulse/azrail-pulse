# Video Studio 2.0 · AZRAIL 1.5.0-rc.59

Status: current

Video Studio теперь реализует Series F **F41–F60** как профессиональный bounded workflow:

`Creative brief → Project Storyboard → Shot List / Scene Cards → Timeline Editor → Assets / Reference Board → Continuity Memory → Camera / Keyframes / Transitions → Voice/Music/SFX → Captions → Color Grading → Render Queue → Proxy/Final WebM → Video QA → Export`.

## Что работает локально

- Project Storyboard и Shot List.
- Timeline Editor и editable Scene Cards.
- Asset Library для image/audio inputs.
- Reference Video Board: до 4 локальных reference-видео; они не загружаются автоматически.
- Prompt Suggestions per shot.
- Shot-level routing intent: `AUTO` или `local-canvas`.
- Continuity Memory: character, clothing, lighting, location, camera, props, color palette.
- Camera controls: static, pan, tilt, dolly in/out, zoom in/out, orbit.
- Start/end keyframes для zoom/X/Y/rotation.
- Transition editor: cut/fade/slide/wipe/dissolve.
- Voice-over, Music и SFX tracks с отдельным gain.
- Automatic captions из scene script (это не скрытая STT-транскрипция).
- Color grading: brightness, contrast, saturation, hue.
- Render Queue + Proxy Preview + final WebM через Canvas/MediaRecorder.
- Video QA Agent foundation: continuity coverage, caption-overlap risk, camera/asset coverage, flicker-risk heuristics и measured audio peak clipping check.
- Export profiles: Web 16:9, Social 9:16, Social 1:1, Presentation 16:9, explicit 4K Master.
- Durable storyboard state в `video_storyboards` через migration `033-video-studio-2.sql`.
- Финальные локальные WebM exports по-прежнему сохраняются только явным действием в существующий `video_sessions` + private Studio artifact flow.

## Provider boundary

Cloudflare Stream и Media Transformations являются подходящим production media layer, но в rc.59 их bindings **не объявляются активными**. Также не подключаются Veo/Seedance/Runway и другие video models: пользовательский AI model catalog отложен до отдельного Model Registry этапа.

Поэтому `AUTO` в shot card сейчас хранит routing intent, а не выполняет скрытый provider-generation. Provider-grade frame QA также не выдаётся за выполненный: локальный QA явно маркируется как deterministic/bounded.

## Safety / resource bounds

- 1–12 shots.
- 4 / 8 / 12 секунд.
- 24 / 30 FPS.
- Image assets: до 12, каждый ≤16 MB.
- Reference videos: до 4, каждый ≤150 MB, local-only.
- Voice/Music/SFX: по одному файлу каждого типа, ≤80 MB каждый.
- 4K — только explicit profile, никогда не выбирается автоматически.
- Save Storyboard требует account + Project; Save Session остаётся явным действием после render.
