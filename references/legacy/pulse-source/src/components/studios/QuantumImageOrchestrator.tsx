import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Sparkles, Zap, ShieldAlert, CheckCircle, Play, RefreshCw, 
  Layers, Gauge, Eye, Shield, Globe, Award, Database, ArrowRight,
  Image, Camera, Palette, Wand2, Monitor, Save, ImageIcon, Scan,
  Settings2, Trash2, ChevronRight, Binary, HeartPulse, Workflow, MessageSquare,
  Maximize, Clock, Ghost, Box, Mountain, Sun, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuantumImageOrchestratorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq?: number, duration?: number) => void;
  addTerminalLog: (msg: string) => void;
  suiteFunctions: Record<string, boolean>;
  setSuiteFunctions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function QuantumImageOrchestrator({ 
  t, 
  playBeep, 
  addTerminalLog,
  suiteFunctions,
  setSuiteFunctions 
}: QuantumImageOrchestratorProps) {
  
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

  // 2026 Visual Synthesis Agents
  const [agents, setAgents] = useState([
    { name: 'Latent Navigator', status: 'IDLE', color: 'text-purple-400', glow: 'bg-purple-500/20', active: false },
    { name: 'Texture Synthesizer', status: 'IDLE', color: 'text-sky-400', glow: 'bg-sky-500/20', active: false },
    { name: 'Lumen Master', status: 'IDLE', color: 'text-amber-400', glow: 'bg-amber-500/20', active: false },
    { name: 'Geometry Extractor', status: 'IDLE', color: 'text-emerald-400', glow: 'bg-emerald-500/20', active: false },
    { name: 'Semantic Polisher', status: 'IDLE', color: 'text-rose-400', glow: 'bg-rose-500/20', active: false },
  ]);

  // Top 10 Advanced Image Tools for 2026
  const advancedImageTools = [
    {
      title: t('★ Neural Lighting Relighter', '★ Нейро-переосвещение'),
      tag: 'LIGHTING',
      desc: t('Physically accurate light redirection in a 2D image by reconstructing a virtual 3D scene from the latent space.', 'Физически точное изменение направления света в 2D изображении путем реконструкции 3D сцены из латентного пространства.'),
      metric: 'Lumen-RTX Core',
      color: 'from-amber-500 to-orange-600',
      actionText: t('Relight Scene', 'Переосветить сцену'),
      log: 'LUMEN MASTER: Calculating light bounce vectors. Virtual sun positioned at 2PM. Shadow softness adjusted to 45%.'
    },
    {
      title: t('★ 16K Semantic Upscaler', '★ 16K Семантический апскейлер'),
      tag: 'RESOLUTION',
      desc: t('Upscales images to 16K while intelligently synthesizing realistic textures (pores, fabric, grain) based on content.', 'Масштабирует до 16K, интеллектуально синтезируя реалистичные текстуры (поры, ткань, зернистость).'),
      metric: '16K Ultra-Grain',
      color: 'from-sky-500 to-blue-600',
      actionText: t('Upscale to 16K', 'Апскейл до 16K'),
      log: 'TEXTURE SYNTH: Injecting sub-pixel micro-details. Semantic recognition: "Silk Fabric". Applying anisotropic texture maps.'
    },
    {
      title: t('★ Generative Out-painting', '★ Генеративная достройка (Out-paint)'),
      tag: 'CANVAS',
      desc: t('Expands any image beyond its borders with perfect structural and stylistic continuity using infinite latent noise.', 'Расширяет любое изображение за его пределы с идеальной структурной и стилистической непрерывностью.'),
      metric: 'Infinite Canvas V2',
      color: 'from-emerald-500 to-teal-600',
      actionText: t('Expand Canvas', 'Расширить холст'),
      log: 'LATENT NAVIGATOR: Extrapolating horizon line. Sampling environmental noise. Seamless edge blending initiated.'
    },
    {
      title: t('★ Latent Space Interpolator', '★ Интерполятор латентного пространства'),
      tag: 'CREATION',
      desc: t('Smoothly morphs between two or more images or prompts, finding the exact visual "middle ground" at any point.', 'Плавно переходит между двумя и более изображениями, находя точную визуальную "золотую середину".'),
      metric: 'Vector-Flow Morph',
      color: 'from-purple-500 to-fuchsia-600',
      actionText: t('Interpolate Points', 'Интерполировать'),
      log: 'VECTOR FLOW: Calculating shortest path in 512D latent space. Blending concept "Cyberpunk" with "Neo-Classical".'
    },
    {
      title: t('★ AI PBR Material Synth', '★ ИИ-синтез PBR материалов'),
      tag: 'TEXTURE',
      desc: t('Automatically generates high-res Albedo, Normal, Roughness, and Metallic maps from a single flat photo.', 'Автоматически генерирует карты Albedo, Normal, Roughness и Metallic из одной плоской фотографии.'),
      metric: 'PBR Texture Pack',
      color: 'from-rose-500 to-red-600',
      actionText: t('Extract PBR Maps', 'Извлечь PBR карты'),
      log: 'MATERIAL ENGINE: De-lighting source photo. Estimating surface roughness. Normal map generated at 32-bit depth.'
    },
    {
      title: t('★ Atmospheric Depth Engine', '★ Атмосферный движок глубины'),
      tag: 'DEPTH',
      desc: t('Adds realistic volumetric fog, haze, and lighting rays that interact with the actual geometry of your photo.', 'Добавляет объемный туман, дымку и световые лучи, взаимодействующие с геометрией вашего фото.'),
      metric: 'Volumetric Z-Scan',
      color: 'from-cyan-500 to-indigo-600',
      actionText: t('Inject Atmosphere', 'Добавить атмосферу'),
      log: 'LUMEN MASTER: Constructing volumetric depth grid. Scattering light through virtual haze. God-rays enabled.'
    },
    {
      title: t('★ Neural Style Morph 2.0', '★ Нейро-морфинг стиля 2.0'),
      tag: 'STYLE',
      desc: t('Applies physics-aware artistic styles that adapt to the objects and lighting in your scene, not just the pixels.', 'Применяет художественные стили, адаптирующиеся к объектам и освещению, а не просто к пикселям.'),
      metric: 'Style-Aware ML',
      color: 'from-violet-500 to-purple-700',
      actionText: t('Apply Style Morph', 'Применить стиль'),
      log: 'STYLE ENGINE: Deconstructing scene semantics. Applying "Van Gogh" brush strokes following surface contours.'
    },
    {
      title: t('★ 3D Object Extraction', '★ 3D Экстракция объектов'),
      tag: '3D-GEN',
      desc: t('Generates a fully textured 3D mesh from any single image object for use in AR, VR, or game engines.', 'Создает текстурированную 3D-модель любого объекта с фото для использования в AR, VR или играх.'),
      metric: 'Single-View 3D',
      color: 'from-orange-500 to-red-600',
      actionText: t('Export to 3D', 'Экспорт в 3D'),
      log: 'GEOMETRY EXTRACTOR: Estimating occulted geometry. Unwrapping UV coordinates. Mesh generated (45k triangles).'
    },
    {
      title: t('★ Quantum Object Eraser', '★ Квантовый ластик объектов'),
      tag: 'CLEANUP',
      desc: t('Removes objects with zero artifacts by perfectly reconstructing the background using global scene context.', 'Удаляет объекты без артефактов, идеально реконструируя фон с использованием контекста всей сцены.'),
      metric: 'Perfect In-paint',
      color: 'from-emerald-500 to-green-600',
      actionText: t('Erase & Reconstruct', 'Удалить и восстановить'),
      log: 'SEMANTIC POLISHER: Masking target pixels. Querying global scene latent for missing background data. Fill applied.'
    },
    {
      title: t('★ Neural Face Sculptor', '★ Нейро-скульптор лиц'),
      tag: 'PORTRAIT',
      desc: t('Modify facial features, age, or expression with professional anatomical precision and zero visual artifacts.', 'Изменение черт лица, возраста или выражения с анатомической точностью и отсутствием артефактов.'),
      metric: 'Anatomy-Safe ML',
      color: 'from-pink-500 to-rose-600',
      actionText: t('Sculpt Face', 'Скульптурировать'),
      log: 'POLISHER: Mapping 68 facial landmarks. Adjusting age weights. Skin texture preserved during transformation.'
    }
  ];

  // Top 20 Advanced Image Functions (i101-i120)
  const advancedImageFunctions = [
    { id: 'i101', labelEn: 'i101: Chromatic Abberation Fix', labelRu: 'i101: Исправление аберраций', descEn: 'Digitally removes color fringing from low-quality lenses.', descRu: 'Цифровое удаление цветных контуров от некачественных линз.' },
    { id: 'i102', labelEn: 'i102: HDR Dynamic Expander', labelRu: 'i102: HDR расширитель', descEn: 'Converts standard images to 32-bit high dynamic range.', descRu: 'Преобразование стандартных фото в 32-битный HDR.' },
    { id: 'i103', labelEn: 'i103: Neural Grain Synth', labelRu: 'i103: Нейро-синтез зерна', descEn: 'Adds organic film grain that reacts to image shadows.', descRu: 'Добавляет органическое зерно, реагирующее на тени.' },
    { id: 'i104', labelEn: 'i104: Lens Flare Designer', labelRu: 'i104: Дизайнер бликов', descEn: 'Generates custom optical flares based on scene light.', descRu: 'Создает оптические блики на основе света в сцене.' },
    { id: 'i105', labelEn: 'i105: Dynamic White Balance', labelRu: 'i105: Динамический баланс белого', descEn: 'Automatically corrects color temperature across segments.', descRu: 'Автоматическая коррекция температуры по сегментам.' },
    { id: 'i106', labelEn: 'i106: Neural Skin Retouch', labelRu: 'i106: Нейро-ретушь кожи', descEn: 'Frequency separation level retouching in one click.', descRu: 'Ретушь кожи на уровне частотного разложения в один клик.' },
    { id: 'i107', labelEn: 'i107: Perspective Warper', labelRu: 'i107: Перспективный деформатор', descEn: 'Corrects lens distortion and vanishing points dynamically.', descRu: 'Коррекция дисторсии линз и точек схода.' },
    { id: 'i108', labelEn: 'i108: AI Subject Isolation', labelRu: 'i108: ИИ-изоляция объекта', descEn: 'Pixel-perfect background removal including hair/fur.', descRu: 'Идеальное удаление фона, включая волосы и шерсть.' },
    { id: 'i109', labelEn: 'i109: Color Palette Gen', labelRu: 'i109: Генератор палитр', descEn: 'Extracts and optimizes color palettes for design work.', descRu: 'Извлекает и оптимизирует цветовые палитры для дизайна.' },
    { id: 'i110', labelEn: 'i110: Neural Sharpening', labelRu: 'i110: Нейро-повышение резкости', descEn: 'Restores blurry shots using generative fill logic.', descRu: 'Восстанавливает размытые фото через генеративную логику.' },
    { id: 'i111', labelEn: 'i111: RAW Data Reconstructor', labelRu: 'i111: Восстановитель RAW данных', descEn: 'Estimates missing shadow/highlight detail from JPGs.', descRu: 'Оценка потерянных деталей в тенях и светах из JPG.' },
    { id: 'i112', labelEn: 'i112: Bokeh Shape Designer', labelRu: 'i112: Дизайнер формы боке', descEn: 'Customizes the shape and texture of neural bokeh.', descRu: 'Настройка формы и текстуры нейронного боке.' },
    { id: 'i113', labelEn: 'i113: AI Sky Replacer', labelRu: 'i113: ИИ-замена неба', descEn: 'Seamlessly swaps skies with automatic scene relighting.', descRu: 'Бесшовная замена неба с авто-переосвещением сцены.' },
    { id: 'i114', labelEn: 'i114: Texture Harmonizer', labelRu: 'i114: Гармонизатор текстур', descEn: 'Matches grain and noise across composited elements.', descRu: 'Совмещение зернистости и шума разных элементов.' },
    { id: 'i115', labelEn: 'i115: Neural Mosaic Guard', labelRu: 'i115: Нейро-мозаичный щит', descEn: 'Automatically blurs sensitive faces or information.', descRu: 'Автоматическое размытие лиц и личных данных.' },
    { id: 'i116', labelEn: 'i116: Print Quality Optimizer', labelRu: 'i116: Оптимизатор для печати', descEn: 'Prepares digital art for large-scale physical print.', descRu: 'Подготовка цифрового арта к широкоформатной печати.' },
    { id: 'i117', labelEn: 'i117: Semantic Search Hub', labelRu: 'i117: Хаб семантического поиска', descEn: 'Finds visual assets via natural language description.', descRu: 'Поиск визуальных ресурсов через описание.' },
    { id: 'i118', labelEn: 'i118: AI Layout Assistant', labelRu: 'i118: ИИ-ассистент верстки', descEn: 'Suggests optimal cropping and rule-of-thirds framing.', descRu: 'Предлагает оптимальное кадрирование по правилу третей.' },
    { id: 'i119', labelEn: 'i119: Generative Logo Morph', labelRu: 'i119: Генеративный морф лого', descEn: 'Adapts logos to any surface texture or lighting.', descRu: 'Адаптация логотипов под любую текстуру и свет.' },
    { id: 'i120', labelEn: 'i120: Final Output Shield', labelRu: 'i120: Финальный защитный щит', descEn: 'Applies invisible watermarks and compression checks.', descRu: 'Наложение невидимых водяных знаков и проверка сжатия.' },
  ];

  const startImageSwarmSync = () => {
    if (swarmActive) return;
    setSwarmActive(true);
    setSimulationLogs([]);
    playBeep(1000, 0.15);
    addTerminalLog('INITIATING QUANTUM VISUAL SYNTHESIS SWARM...');

    const logSteps = [
      { delay: 300, msg: '🛰️ [LATENT NAVIGATOR] -> Mapping visual coordinates. Sampling latent manifold.', activeAgentIndex: 0 },
      { delay: 900, msg: '🛰️ [LATENT NAVIGATOR] -> Target concept stabilized. Neural weights balanced.', activeAgentIndex: 0 },
      { delay: 1600, msg: '🏗️ [GEOMETRY EXTRACTOR] -> Scanning pixel depth. Constructing volumetric mesh.', activeAgentIndex: 3 },
      { delay: 2200, msg: '🏗️ [GEOMETRY EXTRACTOR] -> Z-buffer validated. Occlusion maps generated.', activeAgentIndex: 3 },
      { delay: 2900, msg: '☀️ [LUMEN MASTER] -> Simulating global illumination. Tracing virtual photons.', activeAgentIndex: 2 },
      { delay: 3500, msg: '☀️ [LUMEN MASTER] -> Indirect lighting calculated. Ray-traced reflections active.', activeAgentIndex: 2 },
      { delay: 4200, msg: '🧵 [TEXTURE SYNTHESIZER] -> Generating micro-surface details. 16K target reached.', activeAgentIndex: 1 },
      { delay: 4800, msg: '🧵 [TEXTURE SYNTHESIZER] -> Grain patterns harmonized. Sharpness peak detected.', activeAgentIndex: 1 },
      { delay: 5500, msg: '✨ [SEMANTIC POLISHER] -> Finalizing neural render. Visual integrity 100% secured.', activeAgentIndex: 4 }
    ];

    logSteps.forEach((step, idx) => {
      const tId = setTimeout(() => {
        setAgents(prev => prev.map((agent, aIdx) => ({
          ...agent,
          active: aIdx === step.activeAgentIndex,
          status: aIdx === step.activeAgentIndex ? 'SYNTHESIZING' : 'CALIBRATED'
        })));
        setSimulationLogs(prev => [...prev, step.msg]);
        addTerminalLog(step.msg);
        playBeep(950 + (idx * 30), 0.05);

        if (idx === logSteps.length - 1) {
          setSwarmActive(false);
          setAgents(prev => prev.map(a => ({ ...a, active: false, status: 'READY' })));
          playBeep(1550, 0.3);
        }
      }, step.delay);
      timeoutRefs.current.push(tId);
    });
  };

  const triggerTool = (index: number) => {
    if (calibratingTool !== null) return;
    setCalibratingTool(index);
    setSelectedTool(index);
    const tool = advancedImageTools[index];
    playBeep(1150, 0.1);
    addTerminalLog(`CALIBRATING IMAGE MODULE: ${tool.title.toUpperCase()}`);
    addTerminalLog(tool.log);

    const tId = setTimeout(() => {
      setCalibratingTool(null);
      playBeep(1450, 0.08);
      addTerminalLog(`[SUCCESS] "${tool.title.toUpperCase()}" IMAGE MODULE ONLINE.`);
    }, 1500);
    timeoutRefs.current.push(tId);
  };

  const toggleFunction = (id: string) => {
    setSuiteFunctions(prev => {
      const state = !prev[id];
      playBeep(state ? 1250 : 650, 0.05);
      addTerminalLog(`IMAGE KERNEL OVERRIDE: ${id.toUpperCase()} is ${state ? 'ENABLED' : 'DISABLED'}`);
      return { ...prev, [id]: state };
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Orchestrator Card */}
      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 p-5 rounded-2xl border border-purple-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-mono tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-sky-400 flex items-center gap-2">
            <Scan className="w-5 h-5 text-purple-400 animate-pulse" />
            {t('QUANTUM VISUAL SYNTHESIS ORCHESTRATOR', 'КВАНТОВЫЙ ВИЗУАЛЬНЫЙ ОРКЕСТРАТОР')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">
            {t('Autonomous Multi-Agent Image Engine & Latent Space Console 2026', 'Автономный рой ИИ-агентов и консоль латентного пространства 2026')}
          </p>
        </div>
        <button 
          onClick={startImageSwarmSync}
          disabled={swarmActive}
          className={`px-5 py-2.5 text-[10px] font-mono uppercase font-bold rounded-xl tracking-wider flex items-center gap-2 transition-all ${
            swarmActive ? 'bg-zinc-800 text-zinc-500' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 active:scale-95'
          }`}
        >
          {swarmActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {swarmActive ? t('SYNTHESIZING...', 'СИНТЕЗ...') : t('ENGAGE VISUAL SWARM', 'ЗАПУСТИТЬ ОРКЕСТРАТОР')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Agents List */}
        <div className="lg:col-span-4 bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-mono uppercase text-purple-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Workflow className="w-3.5 h-3.5" /> {t('VISUAL COGNITIVE AGENTS', 'КОГНИТИВНЫЕ АГЕНТЫ ВИДЕНИЯ')}
          </div>
          {agents.map((a, i) => (
            <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${a.active ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.active ? 'bg-purple-400 animate-ping' : 'bg-zinc-600'}`} />
                <span className={`text-[10px] font-bold font-mono ${a.color}`}>{a.name}</span>
              </div>
              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${a.status === 'SYNTHESIZING' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>

        {/* Swarm Execution Feed */}
        <div className="lg:col-span-8 bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[220px]">
          <div className="text-[10px] font-mono uppercase text-sky-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Binary className="w-3.5 h-3.5" /> {t('LIVE VISUAL DATA STREAM', 'ПОТОК ДАННЫХ СИНТЕЗА')}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 flex flex-col gap-1.5 mt-3 pr-2 custom-scrollbar">
            {simulationLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                <span>{t('Orchestrator idle. Waiting for visual swarm engage.', 'Оркестратор в режиме ожидания.')}</span>
              </div>
            ) : (
              simulationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-purple-500">▶</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advanced Tools Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-purple-400 font-bold mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> {t('TOP 10 ADVANCED 2026 IMAGE NEURAL INSTRUMENTS', 'ТОП-10 НЕЙРО-ИНСТРУМЕНТОВ ИМИДЖА 2026')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedImageTools.map((tool, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border group transition-all relative overflow-hidden flex flex-col justify-between ${
                selectedTool === i ? 'bg-purple-950/20 border-purple-500/40 shadow-lg' : 'bg-black/40 border-white/5 hover:border-purple-500/20'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-extrabold text-white group-hover:text-purple-300 font-mono">{tool.title}</span>
                  <span className="text-[8px] font-mono text-purple-400 uppercase tracking-widest mt-0.5">{tool.tag}</span>
                </div>
                <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">{tool.metric}</span>
              </div>
              <p className="text-[9px] text-zinc-500 font-mono mb-4 leading-relaxed">{tool.desc}</p>
              <button 
                onClick={() => triggerTool(i)}
                disabled={calibratingTool !== null}
                className={`w-full py-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                  calibratingTool === i ? 'bg-purple-600/20 border-purple-400 text-purple-300' : 'bg-white/5 border-white/10 hover:bg-purple-600/10 hover:border-purple-500/40'
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
        <div className="text-[11px] font-mono uppercase text-sky-400 font-bold mb-3 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" /> {t('TOP 20 ADVANCED 2026 IMAGE KERNEL FUNCTIONS', 'ТОП-20 ПЕРЕДОВЫХ ФУНКЦИЙ ЯДРА 2026')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {advancedImageFunctions.map((f) => {
            const active = suiteFunctions[f.id] || false;
            return (
              <div 
                key={f.id}
                onClick={() => toggleFunction(f.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-[100px] ${
                  active ? 'bg-sky-600/10 border-sky-500/40 shadow-inner' : 'bg-black/40 border-white/5 hover:border-sky-500/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-bold font-mono uppercase ${active ? 'text-sky-300' : 'text-zinc-300'}`}>{language === 'en' ? f.labelEn : f.labelRu}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.5)]" />}
                </div>
                <p className="text-[8px] font-mono text-zinc-500 mt-1 leading-snug">{language === 'en' ? f.descEn : f.descRu}</p>
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-2">
                  <span className="text-[7px] font-mono text-zinc-600">KERNEL STATE</span>
                  <span className={`text-[8px] font-mono font-bold ${active ? 'text-sky-400' : 'text-zinc-600'}`}>{active ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
