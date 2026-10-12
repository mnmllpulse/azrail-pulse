import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Sparkles, Zap, ShieldAlert, CheckCircle, Play, RefreshCw, 
  Layers, Gauge, Eye, Shield, Globe, Award, Database, ArrowRight,
  Video, Film, Camera, Wand2, Monitor, Save, Pause, Radio, Disc,
  Settings2, Trash2, ChevronRight, Binary, HeartPulse, Workflow, MessageSquare,
  Scissors, Palette, Maximize, Clock, Ghost
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuantumVideoOrchestratorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq?: number, duration?: number) => void;
  addTerminalLog: (msg: string) => void;
  suiteFunctions: Record<string, boolean>;
  setSuiteFunctions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function QuantumVideoOrchestrator({ 
  t, 
  playBeep, 
  addTerminalLog,
  suiteFunctions,
  setSuiteFunctions 
}: QuantumVideoOrchestratorProps) {
  
  const { language } = useLanguage();
  const [swarmActive, setSwarmActive] = useState<boolean>(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<number>(0);
  const [calibratingTool, setCalibratingTool] = useState<number | null>(null);

  const timeoutRefs = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  // 2026 Synaptic Agents for Video
  const [agents, setAgents] = useState([
    { name: 'Visual Architect', status: 'IDLE', color: 'text-emerald-400', glow: 'bg-emerald-500/20', active: false },
    { name: 'Temporal Chronos', status: 'IDLE', color: 'text-cyan-400', glow: 'bg-cyan-500/20', active: false },
    { name: 'Neural Colorist', status: 'IDLE', color: 'text-amber-400', glow: 'bg-amber-500/20', active: false },
    { name: 'Cine-Master', status: 'IDLE', color: 'text-rose-400', glow: 'bg-rose-500/20', active: false },
    { name: 'Motion Logic', status: 'IDLE', color: 'text-violet-400', glow: 'bg-violet-500/20', active: false },
  ]);

  // Top 10 Advanced Video Tools for 2026
  const advancedVideoTools = [
    {
      title: t('★ Neural Scene Re-Lighting', '★ Нейро-переосвещение сцены'),
      tag: 'LIGHTING',
      desc: t('Physically re-calculates lighting sources in a 2D video as if they were 3D assets, allowing complete light redirection.', 'Физически пересчитывает источники света в 2D видео, как в 3D сцене, позволяя полностью менять направление освещения.'),
      metric: 'RTX Neural Core',
      color: 'from-amber-500 to-orange-600',
      actionText: t('Recalculate Light', 'Пересчитать свет'),
      log: 'LIGHTING ORCHESTRATOR: Injecting virtual photons into frame stack. Shadow depth re-calibrated. New light source at 45° azimuth applied.'
    },
    {
      title: t('★ Quantum Frame Interpolator', '★ Квантовый интерполятор кадров'),
      tag: 'TEMPORAL',
      desc: t('Generates hyper-smooth 240fps slow-motion from 24fps source without artifacts using quantum motion vector prediction.', 'Создает идеально плавное замедление 240fps из источника 24fps без артефактов, используя квантовое предсказание векторов движения.'),
      metric: '240fps Super-Fluid',
      color: 'from-blue-500 to-indigo-600',
      actionText: t('Interpolate Frames', 'Интерполировать кадры'),
      log: 'TEMPORAL ENGINE: Generating 9 intermediate frames between T0 and T1. Optical flow mesh validated. Zero-artifact fluid motion rendered.'
    },
    {
      title: t('★ Holographic Depth Reconstruction', '★ Голографическая реконструкция глубины'),
      tag: 'DEPTH',
      desc: t('Extracts a high-resolution 3D depth map from any flat video file to apply precise bokeh and volumetric effects.', 'Извлекает 3D карту глубины высокого разрешения из любого плоского видео для наложения боке и объемных эффектов.'),
      metric: 'Z-Buffer AI Scan',
      color: 'from-teal-500 to-emerald-600',
      actionText: t('Extract Depth', 'Извлечь карту глубины'),
      log: 'DEPTH SCANNER: Parsing pixel parallax... Constructing Z-axis mesh. Foreground/Background separation complete. Depth-of-field active.'
    },
    {
      title: t('★ Dynamic Object Eraser', '★ Динамический ластик объектов'),
      tag: 'CLEANUP',
      desc: t('Automatically tracks and removes unwanted people, wires, or equipment from shots with seamless neural in-painting.', 'Автоматически отслеживает и удаляет людей, провода или оборудование из кадра с помощью бесшовной нейронной дорисовки.'),
      metric: 'One-Click In-painting',
      color: 'from-rose-500 to-red-600',
      actionText: t('Erase & In-paint', 'Удалить и дорисовать'),
      log: 'OBJECT ERASER: Target identified in frame sequence. Masking temporal consistency... Neural fill applied from surrounding environmental data.'
    },
    {
      title: t('★ Cinematic Emotion Grader', '★ Кинематографический Эмо-грейдер'),
      tag: 'COLOR',
      desc: t('Analyzes the emotional tone of the scene and automatically applies a color grade that enhances that specific mood.', 'Анализирует эмоциональный тон сцены и автоматически применяет цветокоррекцию, усиливающую это конкретное настроение.'),
      metric: 'Mood-Sync AI',
      color: 'from-purple-500 to-fuchsia-600',
      actionText: t('Apply Mood Grade', 'Применить Эмо-грейд'),
      log: 'EMO-GRADER: Detecting "Melancholic Nostalgia". Shifting mid-tones to teal, highlights to warm gold. Contrast curve adjusted for soft cinematic feel.'
    },
    {
      title: t('★ AI Foley Video Sync', '★ ИИ-синхронизация шумов с видео'),
      tag: 'AUDIO-SYNC',
      desc: t('Automatically generates and syncs foley sounds (footsteps, fabric, environment) based on visual action detection.', 'Автоматически генерирует и синхронизирует шумовые эффекты (шаги, одежда, окружение) на основе анализа движений.'),
      metric: 'Perfect Foley Match',
      color: 'from-cyan-500 to-blue-600',
      actionText: t('Generate Foley', 'Синхронизировать шумы'),
      log: 'FOLEY GENERATOR: Movement detected: "Human walking on gravel". Synthesizing high-res audio steps. Syncing to frame-level transients.'
    },
    {
      title: t('★ Semantic Green-Screen', '★ Семантический хромакей без фона'),
      tag: 'MASKING',
      desc: t('Isolates any subject from any background without a green screen, preserving hair, fur, and transparency perfectly.', 'Изолирует любой объект от любого фона без хромакея, идеально сохраняя волосы, шерсть и прозрачные элементы.'),
      metric: 'Neural Rotoscoping',
      color: 'from-emerald-500 to-green-600',
      actionText: t('Isolate Subject', 'Изолировать объект'),
      log: 'SEMANTIC MASKER: Training localized neural model on subject. Isolating 4.5 million pixels. Alpha channel rendered with hair-level precision.'
    },
    {
      title: t('★ Fractal Particle Generator', '★ Фрактальный генератор частиц'),
      tag: 'VFX',
      desc: t('Integrates hyper-realistic smoke, fire, and liquid simulations that react to the lighting and movement in your shot.', 'Интегрирует гиперреалистичный дым, огонь и жидкости, реагирующие на освещение и движение в вашем кадре.'),
      metric: 'Fluid Dynamics V6',
      color: 'from-orange-500 to-red-600',
      actionText: t('Inject Particles', 'Внедрить частицы'),
      log: 'PARTICLE SWARM: Calculating wind vectors from camera motion. Emitting 50k volumetric smoke particles. Interacting with light source A.'
    },
    {
      title: t('★ Neural Style Morph', '★ Нейронный морфинг стилей'),
      tag: 'STYLE',
      desc: t('Morphes the visual style of your video into any cinematic or artistic look while maintaining structural integrity.', 'Превращает визуальный стиль вашего видео в любой кинофильм или арт-стиль, сохраняя целостность структуры.'),
      metric: 'Multi-Pass Stylizer',
      color: 'from-indigo-500 to-purple-600',
      actionText: t('Morph Style', 'Морфинг стиля'),
      log: 'STYLE MORPHER: Injecting "Cyberpunk 2077" visual weights. Re-texturing surfaces. Applying neon chromatic aberration overlay.'
    },
    {
      title: t('★ 8K Neural Super-Resolution', '★ 8K Нейро-сверхразрешение'),
      tag: 'RESOLUTION',
      desc: t('Upscales low-res or shaky footage to crystal clear 8K with AI-generated details and denoising.', 'Масштабирует видео низкого разрешения в четкие 8K с генерацией деталей и интеллектуальным подавлением шумов.'),
      metric: '8K Upscale Engine',
      color: 'from-sky-500 to-blue-700',
      actionText: t('Upscale to 8K', 'Масштабировать в 8K'),
      log: 'SUPER-RESOLUTION: Reconstructing missing sub-pixel data. Enhancing edge contrast. Denoising grain patterns. 8K export ready.'
    }
  ];

  // Top 20 Advanced Video Functions (v81-v100)
  const advancedVideoFunctions = [
    { id: 'v81', labelEn: 'v81: Neural Motion Blur', labelRu: 'v81: Нейро-размытие движения', descEn: 'Applies physically accurate motion blur based on optical flow.', descRu: 'Накладывает физически точное размытие движения на основе векторов.' },
    { id: 'v82', labelEn: 'v82: Lens Flare Synthesis', labelRu: 'v82: Нейро-синтез бликов', descEn: 'Generates organic lens flares that interact with scene brightness.', descRu: 'Создает органичные блики линз, реагирующие на яркость сцены.' },
    { id: 'v83', labelEn: 'v83: Dynamic Shutter Calibrator', labelRu: 'v83: Калибратор затвора', descEn: 'Corrects rolling shutter distortion and temporal jitter.', descRu: 'Исправляет искажения скользящего затвора и временное дрожание.' },
    { id: 'v84', labelEn: 'v84: AI Eye-Contact Correction', labelRu: 'v84: ИИ-коррекция взгляда', descEn: 'Digitally redirects subjects gaze to look directly at camera.', descRu: 'Цифровая коррекция взгляда персонажа прямо в камеру.' },
    { id: 'v85', labelEn: 'v85: Deepfake Guard Scan', labelRu: 'v85: Скан защиты Deepfake', descEn: 'Verifies face authenticity and prevents malicious manipulation.', descRu: 'Проверяет подлинность лиц и предотвращает манипуляции.' },
    { id: 'v86', labelEn: 'v86: Temporal Noise Reduction', labelRu: 'v86: Временное шумоподавление', descEn: 'Cleans low-light grain across multiple frames without blurring.', descRu: 'Очищает шумы по каскаду кадров без потери четкости.' },
    { id: 'v87', labelEn: 'v87: Dynamic Aspect Morph', labelRu: 'v87: Динамический морф сторон', descEn: 'Smoothly transitions between cinematic and social aspect ratios.', descRu: 'Плавный переход между кино-форматом и вертикальным видео.' },
    { id: 'v88', labelEn: 'v88: AI Subtitle Localization', labelRu: 'v88: ИИ-локализация субтитров', descEn: 'Translates and styles subtitles with semantic accuracy.', descRu: 'Переводит и стилизует субтитры с учетом контекста.' },
    { id: 'v89', labelEn: 'v89: Neural Lip-Sync', labelRu: 'v89: Нейронный Липсинк', descEn: 'Matches lip movements to translated audio tracks automatically.', descRu: 'Автоматически подстраивает движение губ под переведенную речь.' },
    { id: 'v90', labelEn: 'v90: Color Space Transformer', labelRu: 'v90: Трансформер цветовых пространств', descEn: 'Converts LOG/RAW footage to HDR10+ or Rec.709 with AI precision.', descRu: 'Преобразование LOG/RAW в HDR10+ с ИИ-точностью.' },
    { id: 'v91', labelEn: 'v91: Dynamic Lighting Swarm', labelRu: 'v91: Роевое динамическое освещение', descEn: 'Simulates multiple interactive light sources in scene.', descRu: 'Симуляция множества интерактивных источников света в сцене.' },
    { id: 'v92', labelEn: 'v92: Volumetric Fog Gen', labelRu: 'v92: Генератор объемного тумана', descEn: 'Adds realistic light-scattering fog and haze to shots.', descRu: 'Добавляет реалистичный туман с эффектом рассеивания света.' },
    { id: 'v93', labelEn: 'v93: Neural Texture Enhancer', labelRu: 'v93: Нейро-улучшитель текстур', descEn: 'Sharpens fabric, skin, and environmental textures dynamically.', descRu: 'Динамически повышает четкость тканей, кожи и текстур окружения.' },
    { id: 'v94', labelEn: 'v94: AI Camera Shake Stabilizer', labelRu: 'v94: ИИ-стабилизатор тряски', descEn: 'Removes micro-shakes while preserving cinematic handheld feel.', descRu: 'Устраняет тряску, сохраняя художественный эффект "ручной камеры".' },
    { id: 'v95', labelEn: 'v95: Anamorphic Distortion', labelRu: 'v95: Анаморфная дисторсия', descEn: 'Mimics expensive anamorphic lens characteristics and flares.', descRu: 'Имитирует характеристики дорогих анаморфных линз.' },
    { id: 'v96', labelEn: 'v96: Smart AI Trim & Cut', labelRu: 'v96: Умная ИИ-обрезка', descEn: 'Automatically edits footage based on rhythm and pacing logic.', descRu: 'Автоматический монтаж на основе ритма и темпа сцен.' },
    { id: 'v97', labelEn: 'v97: RT Ray Tracing Overlay', labelRu: 'v97: RT Трассировка лучей', descEn: 'Overlays real-time ray-traced reflections on shiny surfaces.', descRu: 'Накладывает отражения с трассировкой лучей в реальном времени.' },
    { id: 'v98', labelEn: 'v98: Depth-of-Field Blur', labelRu: 'v98: Размытие глубины резкости', descEn: 'Neural bokeh mimicking specific high-end cinema lenses.', descRu: 'Нейро-боке, имитирующее конкретные кинообъективы.' },
    { id: 'v99', labelEn: 'v99: HDR Dynamic Expander', labelRu: 'v99: HDR расширитель диапазона', descEn: 'Expands standard footage into high dynamic range depth.', descRu: 'Расширяет стандартное видео до глубокого HDR-диапазона.' },
    { id: 'v100', labelEn: 'v100: Final Output Neural Shield', labelRu: 'v100: Нейро-щит финального рендера', descEn: 'Checks for compression artifacts and optimizes for 2026 displays.', descRu: 'Проверяет артефакты и оптимизирует видео под дисплеи 2026.' },
  ];

  const startVideoSwarmSync = () => {
    if (swarmActive) return;
    setSwarmActive(true);
    setSimulationLogs([]);
    playBeep(1000, 0.15);
    addTerminalLog('INITIATING QUANTUM TEMPORAL VISION SWARM...');

    const logSteps = [
      { delay: 300, msg: '👁️ [VISUAL ARCHITECT] -> Constructing 4D scene geometry from frame sequences.', activeAgentIndex: 0 },
      { delay: 900, msg: '👁️ [VISUAL ARCHITECT] -> Perspective alignment calibrated. 3D depth map extracted.', activeAgentIndex: 0 },
      { delay: 1600, msg: '⏳ [TEMPORAL CHRONOS] -> Scanning temporal consistency... Calculating motion vectors.', activeAgentIndex: 1 },
      { delay: 2200, msg: '⏳ [TEMPORAL CHRONOS] -> Frame interpolation active. Fluidity reached 120fps virtual target.', activeAgentIndex: 1 },
      { delay: 2900, msg: '🎨 [NEURAL COLORIST] -> Analyzing spectral energy. Applying cinema-X LUT weights.', activeAgentIndex: 2 },
      { delay: 3500, msg: '🎨 [NEURAL COLORIST] -> Dynamic range expanded. Shadows neutralized, skin tones protected.', activeAgentIndex: 2 },
      { delay: 4200, msg: '🎬 [CINE-MASTER] -> Compiling final neural render... 8K Super-Res upscaling engaged.', activeAgentIndex: 3 },
      { delay: 4800, msg: '🎬 [CINE-MASTER] -> Final grain synthesis complete. Master file stabilized and shielded.', activeAgentIndex: 3 },
      { delay: 5500, msg: '🧠 [MOTION LOGIC] -> Verifying semantic integrity. Autonomous pipeline optimized at 100%.', activeAgentIndex: 4 }
    ];

    logSteps.forEach((step, idx) => {
      const tId = setTimeout(() => {
        setAgents(prev => prev.map((agent, aIdx) => ({
          ...agent,
          active: aIdx === step.activeAgentIndex,
          status: aIdx === step.activeAgentIndex ? 'PROCESSING' : 'CALIBRATED'
        })));
        setSimulationLogs(prev => [...prev, step.msg]);
        addTerminalLog(step.msg);
        playBeep(800 + (idx * 50), 0.05);

        if (idx === logSteps.length - 1) {
          setSwarmActive(false);
          setAgents(prev => prev.map(a => ({ ...a, active: false, status: 'READY' })));
          playBeep(1400, 0.3);
        }
      }, step.delay);
      timeoutRefs.current.push(tId);
    });
  };

  const triggerTool = (index: number) => {
    if (calibratingTool !== null) return;
    setCalibratingTool(index);
    setSelectedTool(index);
    const tool = advancedVideoTools[index];
    playBeep(1100, 0.1);
    addTerminalLog(`CALIBRATING VIDEO MODULE: ${tool.title.toUpperCase()}`);
    addTerminalLog(tool.log);

    const tId = setTimeout(() => {
      setCalibratingTool(null);
      playBeep(1500, 0.08);
      addTerminalLog(`[SUCCESS] "${tool.title.toUpperCase()}" MODULE ONLINE.`);
    }, 1500);
    timeoutRefs.current.push(tId);
  };

  const toggleFunction = (id: string) => {
    setSuiteFunctions(prev => {
      const state = !prev[id];
      playBeep(state ? 1200 : 700, 0.05);
      addTerminalLog(`VIDEO KERNEL OVERRIDE: ${id.toUpperCase()} is ${state ? 'ENABLED' : 'DISABLED'}`);
      return { ...prev, [id]: state };
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Orchestrator Card */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 p-5 rounded-2xl border border-emerald-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-mono tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 flex items-center gap-2">
            <Maximize className="w-5 h-5 text-emerald-400 animate-pulse" />
            {t('QUANTUM TEMPORAL VISION ORCHESTRATOR v8', 'КВАНТОВЫЙ ТЕМПОРАЛЬНЫЙ ОРКЕСТРАТОР v8')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">
            {t('Autonomous Multi-Agent Video Engine & Neural Cinema Console 2026', 'Автономный рой ИИ-агентов и нейронная кино-консоль 2026')}
          </p>
        </div>
        <button 
          onClick={startVideoSwarmSync}
          disabled={swarmActive}
          className={`px-5 py-2.5 text-[10px] font-mono uppercase font-bold rounded-xl tracking-wider flex items-center gap-2 transition-all ${
            swarmActive ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
          }`}
        >
          {swarmActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {swarmActive ? t('CALIBRATING SWARM...', 'КАЛИБРОВКА РОЯ...') : t('ENGAGE TEMPORAL VISION', 'ЗАПУСТИТЬ ОРКЕСТРАТОР')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Agents List */}
        <div className="lg:col-span-4 bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Workflow className="w-3.5 h-3.5" /> {t('VISION COGNITIVE AGENTS', 'КОГНИТИВНЫЕ АГЕНТЫ ВИДЕНИЯ')}
          </div>
          {agents.map((a, i) => (
            <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${a.active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.active ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                <span className={`text-[10px] font-bold font-mono ${a.color}`}>{a.name}</span>
              </div>
              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${a.status === 'PROCESSING' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>

        {/* Swarm Execution Feed */}
        <div className="lg:col-span-8 bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[220px]">
          <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Binary className="w-3.5 h-3.5" /> {t('LIVE VISION DATA STREAM', 'ПОТОК ДАННЫХ ОРКЕСТРАТОРА')}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 flex flex-col gap-1.5 mt-3 pr-2 custom-scrollbar">
            {simulationLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                <span>{t('Orchestrator idle. Waiting for temporal vision engage.', 'Оркестратор в режиме ожидания.')}</span>
              </div>
            ) : (
              simulationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-emerald-500">▶</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advanced Tools Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-emerald-400 font-bold mb-3 flex items-center gap-2">
          <Film className="w-4 h-4" /> {t('TOP 10 ADVANCED 2026 VIDEO NEURAL INSTRUMENTS', 'ТОП-10 НЕЙРО-ИНСТРУМЕНТОВ ВИДЕО 2026')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedVideoTools.map((tool, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border group transition-all relative overflow-hidden flex flex-col justify-between ${
                selectedTool === i ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg' : 'bg-black/40 border-white/5 hover:border-emerald-500/20'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-extrabold text-white group-hover:text-emerald-300 font-mono">{tool.title}</span>
                  <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest mt-0.5">{tool.tag}</span>
                </div>
                <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">{tool.metric}</span>
              </div>
              <p className="text-[9px] text-zinc-500 font-mono mb-4 leading-relaxed">{tool.desc}</p>
              <button 
                onClick={() => triggerTool(i)}
                disabled={calibratingTool !== null}
                className={`w-full py-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                  calibratingTool === i ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300' : 'bg-white/5 border-white/10 hover:bg-emerald-600/10 hover:border-emerald-500/40'
                }`}
              >
                {calibratingTool === i ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {calibratingTool === i ? t('Calibrating...', 'Калибровка...') : tool.actionText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Functions Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-cyan-400 font-bold mb-3 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" /> {t('TOP 20 ADVANCED 2026 COGNITIVE FUNCTIONS', 'ТОП-20 ПЕРЕДОВЫХ КОГНИТИВНЫХ ФУНКЦИЙ 2026')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {advancedVideoFunctions.map((f) => {
            const active = suiteFunctions[f.id] || false;
            return (
              <div 
                key={f.id}
                onClick={() => toggleFunction(f.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-[100px] ${
                  active ? 'bg-cyan-600/10 border-cyan-500/40 shadow-inner' : 'bg-black/40 border-white/5 hover:border-cyan-500/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-bold font-mono uppercase ${active ? 'text-cyan-300' : 'text-zinc-300'}`}>{language === 'en' ? f.labelEn : f.labelRu}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />}
                </div>
                <p className="text-[8px] font-mono text-zinc-500 mt-1 leading-snug">{language === 'en' ? f.descEn : f.descRu}</p>
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-2">
                  <span className="text-[7px] font-mono text-zinc-600">KERNEL STATE</span>
                  <span className={`text-[8px] font-mono font-bold ${active ? 'text-cyan-400' : 'text-zinc-600'}`}>{active ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
