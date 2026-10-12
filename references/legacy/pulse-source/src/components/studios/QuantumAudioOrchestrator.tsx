import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Sparkles, Zap, ShieldAlert, CheckCircle, Play, RefreshCw, 
  Layers, Gauge, Eye, Shield, Globe, Award, Database, ArrowRight,
  Music, Sliders, Scissors, Wand2, Volume2, Save, Pause, Radio, Disc,
  Settings2, Trash2, ChevronRight, Binary, HeartPulse, Workflow, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuantumAudioOrchestratorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq?: number, duration?: number) => void;
  addTerminalLog: (msg: string) => void;
  suiteFunctions: Record<string, boolean>;
  setSuiteFunctions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function QuantumAudioOrchestrator({ 
  t, 
  playBeep, 
  addTerminalLog,
  suiteFunctions,
  setSuiteFunctions 
}: QuantumAudioOrchestratorProps) {
  
  const { language } = useLanguage();
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<number>(0);
  const [swarmActive, setSwarmActive] = useState<boolean>(false);
  const [calibratingTool, setCalibratingTool] = useState<number | null>(null);

  const timeoutRefs = useRef<any[]>([]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  // Simulated agent statuses for Quantum Multi-Agent Audio Orchestrator
  const [agents, setAgents] = useState([
    { name: 'Sound Architect', status: 'IDLE', color: 'text-blue-400', glow: 'bg-blue-500/20', active: false },
    { name: 'Neuro-Synthesizer', status: 'IDLE', color: 'text-amber-400', glow: 'bg-amber-500/20', active: false },
    { name: 'Spectral Guard', status: 'IDLE', color: 'text-rose-400', glow: 'bg-rose-500/20', active: false },
    { name: 'Phase Calibrator', status: 'IDLE', color: 'text-cyan-400', glow: 'bg-cyan-500/20', active: false },
    { name: 'LUFS Maximizer', status: 'IDLE', color: 'text-purple-400', glow: 'bg-purple-500/20', active: false },
  ]);

  // Top 10 Advanced Tools for 2026 (Audio-specific)
  const advancedTools = [
    {
      title: t('★ Synaptic Stem Separator', '★ Нейро-сепаратор Семов'),
      tag: 'STEMS',
      desc: t('Separates mixed audio tracks into independent, studio-quality stem files with absolute phase preservation and zero bleeding.', 'Разделяет готовый аудиомикс на независимые стемы студийного качества со стопроцентным сохранением фазы и без взаимопроникновения.'),
      metric: '99.9% Spectral Purity',
      color: 'from-purple-500 to-indigo-600',
      actionText: t('Isolate Stems', 'Изолировать стемы'),
      log: 'STEM SEPARATOR: Initiating neural multi-band isolation. Processing spectral mesh. Drums, Bass, Vocals and Melodics fully isolated.'
    },
    {
      title: t('★ Quantum Harmony Synthesizer', '★ Квантовый Синтезатор Гармоний'),
      tag: 'COMPOSER',
      desc: t('Generates intricate, multi-layered chord progressions and counter-melodies based on quantum probability wave states.', 'Генерирует сложные многослойные аккордовые прогрессии и контрапункты на основе квантовых вероятностных волновых состояний.'),
      metric: 'Quantum Probability Gen',
      color: 'from-pink-500 to-rose-600',
      actionText: t('Inject Harmonies', 'Внедрить гармонии'),
      log: 'HARMONY GEN: Computing 7-dimensional probability wave. Overlapping chord nodes resolved. Golden ratio modal transition applied.'
    },
    {
      title: t('★ Spectral Anti-Collision Matrix', '★ Спектральная Матрица Анти-Коллизий'),
      tag: 'MIXING',
      desc: t('Resolves clashing frequencies (e.g. Kick & Sub) in real-time, sidechaining only conflicting harmonic peaks dynamically.', 'Устраняет конфликты частот (например, бочки и баса) в реальном времени с помощью умного динамического сайдчейна перекрывающихся пиков.'),
      metric: '0.00ms Inter-mask delay',
      color: 'from-emerald-500 to-teal-600',
      actionText: t('Resolve Clashes', 'Устранить коллизии'),
      log: 'COLLISION MATRIX: Deep scan of frequency nodes... Clash detected between Kick (48Hz) and Rolling Bassline (45Hz). Dynamically ducking overlapping bands by 4.2dB.'
    },
    {
      title: t('★ Emotional Neuro-Timbre Generator', '★ Нейро-Тембральный Эмо-Синтезатор'),
      tag: 'SYNTHESIS',
      desc: t('Synthesizes completely organic and synthetic textures from text, vocal inflections, or raw emotional state vector presets.', 'Синтезирует полностью органические и синтетические звуковые текстуры на основе текстовых запросов, интонаций или эмоциональных векторов.'),
      metric: '16-core Neural Synth',
      color: 'from-amber-500 to-orange-600',
      actionText: t('Synthesize Timbre', 'Синтезировать тембр'),
      log: 'TIMBRE SYNTH: Parsing emotional parameters. Generating warmth-factor: 85%, brightness: 40%. Wavetable generated and mapped to oscillator array.'
    },
    {
      title: t('★ Beatport Top-1 Arrangement Aligner', '★ Алгоритм Структуры Beatport Top-1'),
      tag: 'ARRANGEMENT',
      desc: t('Compares your timeline structure against historic Top-1 chart tracks, aligning transitions, energy drops, and builds for club impact.', 'Сравнивает структуру трека на таймлайне с историческими хитами Beatport Top-1, выравнивая ямы, разгоны и дропы для клубного взрыва.'),
      metric: '100% Dancefloor Optimized',
      color: 'from-cyan-500 to-blue-600',
      actionText: t('Align Timeline', 'Выровнять структуру'),
      log: 'ARRANGEMENT ALIGNER: Parsing project blocks. Syncing energy curves... Dynamic shift applied. Structural tension release optimized.'
    },
    {
      title: t('★ AI Vocal Holographic Resonator', '★ ИИ Голографический Вокал'),
      tag: 'VOCALS',
      desc: t('Synthesizes hyper-realistic vocal hooks, ad-libs, and choral textures in any language, carrying authentic human throat mechanics.', 'Синтезирует гиперреалистичный вокал, бэк-вокалы и хоровые текстуры на любом языке с имитацией физики голосовых связок человека.'),
      metric: 'Biomimetic Vocal Core',
      color: 'from-red-500 to-rose-700',
      actionText: t('Generate Vocal', 'Создать вокал'),
      log: 'VOCAL HOLOGRAM: Initializing vocal tract physical modeling. Injecting breath-artifacts. Perfect phrasing and pronunciation rendered.'
    },
    {
      title: t('★ LUFS Smart Target Mastering', '★ LUFS Интеллектуальный Мастеринг'),
      tag: 'MASTERING',
      desc: t('Precision AI mastering calibrated to target specific platforms (Spotify, Apple Music, Beatport) without clipping or over-compression.', 'Прецизионный ИИ-мастеринг, откалиброванный под платформы вещания (Spotify, Beatport) без клиппинга и пережатия.'),
      metric: '-7.5 LUFS Integrated Target',
      color: 'from-sky-500 to-indigo-600',
      actionText: t('Execute Master', 'Выполнить мастер'),
      log: 'LUFS MASTER: Analyzing spectral envelope... Enhancing transient impact... Target LUFS achieved at -7.8 dB. Inter-sample peaks shielded.'
    },
    {
      title: t('★ Sub-Bass Phase Alignment Calibrator', '★ Калибратор Фазы Саб-Баса'),
      tag: 'LOW END',
      desc: t('Calculates low-end phase cancellations and realigns phase rotation on sub-bass channels to guarantee massive club system punch.', 'Рассчитывает деструктивную фазовую интерференцию и выравнивает вращение фазы баса для максимальной пробивной силы на сабвуферах.'),
      metric: 'Perfect Phase Match',
      color: 'from-indigo-500 to-purple-600',
      actionText: t('Re-align Phase', 'Выровнять фазу саб'),
      log: 'PHASE CALIBRATOR: Scanning low frequency spectrum... Discovered 45-degree phase cancellation at 50Hz. Rotating sub phase to 0 degrees.'
    },
    {
      title: t('★ Swarm Granular Sound Spatializer', '★ Роевой Гранулярный Резонатор'),
      tag: 'SOUND DESIGN',
      desc: t('Spawns hundreds of spatial audio micro-grains that orbit around the listener, creating deeply immersive soundscapes.', 'Запускает сотни пространственных микро-гранул звука, вращающихся вокруг слушателя, создавая глубокие объемные ландшафты.'),
      metric: '3D Psychoacoustic Render',
      color: 'from-violet-500 to-fuchsia-600',
      actionText: t('Trigger Swarm', 'Запустить рой гранул'),
      log: 'GRANULAR SWARM: Splitting audio stream into 500 micro-grains. Spatial trajectories calculated using fluid-dynamics physics simulations.'
    },
    {
      title: t('★ 3D Binaural Spatialization Reverb', '★ 3D Бинауральный Ревербератор'),
      tag: 'SPATIAL',
      desc: t('Places your sounds inside advanced psychoacoustic models of physical spaces, complete with elevation, width, and distance vectors.', 'Размещает звуки в сложных психоакустических 3D-моделях помещений с учетом высоты, глубины и расстояния до источника.'),
      metric: '360° Sphere Positioning',
      color: 'from-teal-500 to-emerald-600',
      actionText: t('Create 3D Room', 'Смоделировать 3D комнату'),
      log: '3D SPATIALIZER: Constructing high-resolution virtual acoustic room. Convolution impulses calibrated. Audio source positioned 3 meters back-right.'
    }
  ];

  // Execute continuous multi-agent swarm synthesis simulation
  const startAudioSwarmConsensus = () => {
    if (swarmActive) return;
    setSwarmActive(true);
    setSimulationLogs([]);
    playBeep(900, 0.15);
    addTerminalLog('STARTING AUDIO MULTI-AGENT SYNAPTIC PIPELINE...');

    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    const logSteps = [
      { delay: 300, msg: '🤖 [SOUND ARCHITECT] -> Analyzing target energy levels against Beatport top-1 hits...', activeAgentIndex: 0 },
      { delay: 800, msg: '⚙️ [SOUND ARCHITECT] -> Layout structured. Target master ceiling identified at -8.0 LUFS.', activeAgentIndex: 0 },
      { delay: 1400, msg: '🎹 [NEURO-SYNTHESIZER] -> Generating harmonic chord progression... Mapping probability wave matrix.', activeAgentIndex: 1 },
      { delay: 2000, msg: '🎹 [NEURO-SYNTHESIZER] -> Advanced modular waves synthesized. Injecting analog drift and warmth.', activeAgentIndex: 1 },
      { delay: 2600, msg: '🛡️ [SPECTRAL GUARD] -> Active frequency collision scanning... Discovered low-mid muddiness.', activeAgentIndex: 2 },
      { delay: 3200, msg: '🛡️ [SPECTRAL GUARD] -> Isolating harsh frequencies between 2kHz and 4kHz. Dynamics stabilized.', activeAgentIndex: 2 },
      { delay: 3800, msg: '⚡ [PHASE CALIBRATOR] -> Low-end phase correlation checker running... Phase rotated on sub-bass (40Hz).', activeAgentIndex: 3 },
      { delay: 4400, msg: '⚡ [PHASE CALIBRATOR] -> Perfect sub-drum phase alignment reached. No-cancellation punch guaranteed.', activeAgentIndex: 3 },
      { delay: 5000, msg: '🚀 [LUFS MAXIMIZER] -> Processing master compression chain. Dynamic look-ahead limiters set.', activeAgentIndex: 4 },
      { delay: 5600, msg: '🚀 [LUFS MAXIMIZER] -> Golden standard Master audio exported successfully. System calibrated to 100%.', activeAgentIndex: 4 }
    ];

    logSteps.forEach((step, idx) => {
      const tId = setTimeout(() => {
        setAgents(prev => prev.map((agent, aIdx) => ({
          ...agent,
          active: aIdx === step.activeAgentIndex,
          status: aIdx === step.activeAgentIndex ? 'PROCESSING' : 'IDLE'
        })));
        setSimulationLogs(prev => [...prev, step.msg]);
        addTerminalLog(step.msg);
        playBeep(700 + (idx * 60), 0.05);

        if (idx === logSteps.length - 1) {
          setSwarmActive(false);
          setAgents(prev => prev.map(a => ({ ...a, active: false, status: 'CALIBRATED' })));
          playBeep(1200, 0.3);
        }
      }, step.delay);

      timeoutRefs.current.push(tId);
    });
  };

  // Triggering specific tool simulation with calibration state
  const triggerToolAction = (toolIndex: number) => {
    if (calibratingTool !== null) return;
    const tool = advancedTools[toolIndex];
    setCalibratingTool(toolIndex);
    playBeep(1000, 0.1);
    addTerminalLog(`CALIBRATING AUDIO MODULE: ${tool.title.toUpperCase()}...`);
    addTerminalLog(tool.log);
    
    setSelectedTool(toolIndex);

    const tId = setTimeout(() => {
      setCalibratingTool(null);
      playBeep(1300, 0.08);
      addTerminalLog(`[SUCCESS] AUDIO MODULE "${tool.title.toUpperCase()}" FULLY CALIBRATED.`);
    }, 1200);

    timeoutRefs.current.push(tId);
  };

  // 20 Elite Technological Audio Features for 2026 (f51 to f70)
  const advancedAudioFeatures = [
    { id: 'f51', labelEn: 'f51: Neuro-Transient Shaper', labelRu: 'f51: Нейро-шейпер транзиентов', descEn: 'Dynamically shapes drum attack envelopes via neural AI scans.', descRu: 'Интеллектуальное управление атакой барабанов на основе нейросети.' },
    { id: 'f52', labelEn: 'f52: Sub-Harmonic Synthesizer', labelRu: 'f52: Синтезатор субгармоник', descEn: 'Synthesizes clean fundamental octaves below 40Hz for extreme low end.', descRu: 'Добавляет чистые инфранизкие субгармоники ниже 40 Гц для мощного баса.' },
    { id: 'f53', labelEn: 'f53: 3D Binaural Head-Tracker', labelRu: 'f53: 3D Бинауральное слежение', descEn: 'Compiles real-time spatial binaural 360 audio coordinates.', descRu: 'Слежение и распределение координат 360-звука в бинауральном поле.' },
    { id: 'f54', labelEn: 'f54: AI Chord Substituter', labelRu: 'f54: ИИ Замена Аккордов', descEn: 'Replaces basic progressions with jazz modal extensions.', descRu: 'Заменяет стандартные аккорды сложными джазовыми и модальными ступенями.' },
    { id: 'f55', labelEn: 'f55: Dynamic Sidechain Masker', labelRu: 'f55: Динамический сайдчейн-маскинг', descEn: 'Suppresses only clashing frequency bands dynamically on background tracks.', descRu: 'Подавляет только конфликтующий спектр частот на второстепенных каналах.' },
    { id: 'f56', labelEn: 'f56: Neural De-Esser', labelRu: 'f56: Нейро-деэссер вокала', descEn: 'Instantly suppresses harsh vocal sibilants via neural network.', descRu: 'Подавляет резкие шипящие звуки вокала с помощью ИИ в реальном времени.' },
    { id: 'f57', labelEn: 'f57: Hum & Noise Gate', labelRu: 'f57: Умный шумоподавитель', descEn: 'Filters analog ground loops, hiss, and electrical hum smoothly.', descRu: 'Качественно фильтрует аналоговые шумы, шипение и сетевой гул.' },
    { id: 'f58', labelEn: 'f58: Automatic Tempo Warping', labelRu: 'f58: Авто-варпинг темпа', descEn: 'Instantly warps imported stems to match master timeline BPM.', descRu: 'Автоматически подтягивает сетку импортированных аудиофайлов под BPM.' },
    { id: 'f59', labelEn: 'f59: Microtonal Tuning Matrix', labelRu: 'f59: Микротональная сетка', descEn: 'Switches master pitch frequency calibration to alternative historical tunings.', descRu: 'Переводит основную частоту настройки в исторические строи.' },
    { id: 'f60', labelEn: 'f60: Dynamic Automation Gen', labelRu: 'f60: Умный генератор автоматизаций', descEn: 'Generates complex organic movement curves for filter sweeps.', descRu: 'Рисует фрактальные и природные кривые автоматизации для фильтров.' },
    { id: 'f61', labelEn: 'f61: Glitch Swarm Patternizer', labelRu: 'f61: Роевой генератор глитчей', descEn: 'Injects micro-glitches and rhythm variations into hi-hat channels.', descRu: 'Рандомизированно наполняет партии хэтов микро-глитчами и сбивками.' },
    { id: 'f62', labelEn: 'f62: Live LUFS Target Analyzer', labelRu: 'f62: Живой анализатор LUFS', descEn: 'Continuous integrated LUFS metering on the master output.', descRu: 'Постоянное измерение интегрированной громкости LUFS на мастер-шине.' },
    { id: 'f63', labelEn: 'f63: Master Phase Correlator', labelRu: 'f63: Коррелятор фазы мастера', descEn: 'Monitors stereofield width and alerts if out-of-phase audio cancels.', descRu: 'Показывает совместимость стереомикса в моно и фазовые конфликты.' },
    { id: 'f64: Mid/Side Stereo Widener', labelEn: 'f64: Mid/Side Stereo Widener', labelRu: 'f64: Расширитель стерео M/S', descEn: 'Widens side frequencies while protecting solid center mono kick.', descRu: 'Расширяет боковую составляющую звука, сохраняя бочку четко в центре.' },
    { id: 'f65', labelEn: 'f65: Valve & Tape Warmth', labelRu: 'f65: Теплота лампы и ленты', descEn: 'Emulates tape saturator tape compression and vacuum tube harmonics.', descRu: 'Симулирует насыщение аналоговой магнитной ленты и теплоту ламп.' },
    { id: 'f66', labelEn: 'f66: MIDI Velocity Humanizer', labelRu: 'f66: Гуманизатор MIDI-нот', descEn: 'Applies human timing and velocity deviations to midi sequences.', descRu: 'Слегка сдвигает сетку времени и силу удара клавиш для живого ощущения.' },
    { id: 'f67', labelEn: 'f67: Vintage Analog Drift', labelRu: 'f67: Дрейф аналогового железа', descEn: 'Mimics natural pitch and filter drift of classic synthesizers.', descRu: 'Моделирует легкую расстройку генераторов и фильтров аналогового синтезатора.' },
    { id: 'f68', labelEn: 'f68: Neural Re-Reverberation', labelRu: 'f68: Нейро-реверберация', descEn: 'Constructs custom reflective room spaces for dry microphones.', descRu: 'Воссоздает отражение звука в реальном времени по характеристикам помещения.' },
    { id: 'f69', labelEn: 'f69: Intelligent De-Reverb', labelRu: 'f69: Нейро-дереверберация', descEn: 'Strips out unwanted room echoes from muddy acoustic stems.', descRu: 'Устраняет эхо и комнатные отражения из грязных записанных аудиоматериалов.' },
    { id: 'f70', labelEn: 'f70: Look-Ahead Dynamic Limiter', labelRu: 'f70: Лимитер с опережением', descEn: 'Look-ahead dynamic brickwall limiter preventing any digital clipping.', descRu: 'Прецизионный лимитер с опережением на 1.5мс для полного исключения клиппинга.' },
  ];

  const toggleFeature = (id: string) => {
    setSuiteFunctions(prev => {
      const active = !prev[id];
      playBeep(active ? 1100 : 800, 0.05);
      addTerminalLog(`MANUAL OVERRIDE: ${id.toUpperCase()} is now ${active ? 'ENABLED [ONLINE]' : 'DISABLED [OFFLINE]'}`);
      return {
        ...prev,
        [id]: active
      };
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Interactive Title Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900/40 to-fuchsia-900/40 p-5 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
        <div>
          <h2 className="text-sm font-mono tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            {t('QUANTUM SYNAPTIC SWARM ORCHESTRATOR v6', 'КВАНТОВЫЙ СИНАПТИЧЕСКИЙ ОРКЕСТРАТОР v6')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">
            {t('Autonomous Multi-Agent AI Swarm & Neural Audio Engineering Console for 2026', 'Автономный рой ИИ-агентов и нейронная консоль аудиоинженерии 2026 года')}
          </p>
        </div>
        <button 
          onClick={startAudioSwarmConsensus}
          disabled={swarmActive}
          className={`px-4 py-2 text-[10px] font-mono uppercase font-bold rounded-xl tracking-wider flex items-center gap-2 shadow-lg transition-all ${
            swarmActive 
              ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 hover:scale-105 active:scale-95'
          }`}
        >
          {swarmActive ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500" />
              {t('SWARM SYNCING...', 'СИНХРОНИЗАЦИЯ РОЯ...')}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
              {t('RUN SWARM DEEP HEAL', 'ЗАПУСТИТЬ ИСПРАВЛЕНИЕ РОЕМ')}
            </>
          )}
        </button>
      </div>

      {/* Multi-Agent Swarm Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Swarm Agents Status Dashboard */}
        <div className="lg:col-span-4 bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold border-b border-white/5 pb-2 flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5" />
            {t('SYNAPTIC COGNITIVE AGENTS', 'СИНАПТИЧЕСКИЕ ИИ-АГЕНТЫ')}
          </div>
          <div className="flex flex-col gap-2">
            {agents.map((agent, idx) => (
              <div 
                key={agent.name}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  agent.active 
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.15)] scale-[1.02]' 
                    : 'bg-white/5 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${agent.active ? 'bg-indigo-400 animate-ping' : 'bg-zinc-500'}`} />
                  <span className={`text-[10px] font-bold font-mono ${agent.color}`}>{agent.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${
                    agent.status === 'PROCESSING' 
                      ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
                      : agent.status === 'CALIBRATED' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Multi-Agent Execution Log Feed */}
        <div className="lg:col-span-8 bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[190px]">
          <div className="text-[10px] font-mono uppercase text-fuchsia-400 font-bold border-b border-white/5 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Binary className="w-3.5 h-3.5" /> {t('SWARM LOG STREAM', 'ПОТОК ЛОГОВ РОЯ')}</span>
            {swarmActive && <span className="text-[8px] px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-mono animate-pulse">{t('COMPUTING CONCENSUS...', 'ВЫЧИСЛЕНИЕ КОНСЕНСУСА...')}</span>}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-300 flex flex-col gap-1.5 mt-3 pr-2 custom-scrollbar max-h-[170px]">
            {simulationLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-8">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <span>{t('Click "RUN SWARM DEEP HEAL" to engage the multi-agent neural network.', 'Нажмите "ЗАПУСТИТЬ ИСПРАВЛЕНИЕ РОЕМ" для активации ИИ-сети.')}</span>
              </div>
            ) : (
              simulationLogs.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-1"
                >
                  <span className="text-indigo-500">›</span>
                  <span className="leading-relaxed">{log}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top 10 Advanced Technological Instruments */}
      <div>
        <div className="text-[11px] font-mono uppercase text-indigo-400 font-bold mb-3 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-indigo-400" />
          {t('TOP 10 ADVANCED 2026 AUDIO NEURAL TOOLS', 'ТОП-10 ПЕРЕДОВЫХ НЕЙРО-ИНСТРУМЕНТОВ 2026')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedTools.map((tool, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border group transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                selectedTool === i 
                  ? 'bg-gradient-to-b from-indigo-950/40 to-black border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                  : 'bg-[#030303]/80 border-white/5 hover:border-indigo-500/30'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-extrabold font-mono text-white group-hover:text-indigo-300 transition-colors">{tool.title}</span>
                    <span className="text-[8px] font-mono text-indigo-400 font-bold tracking-widest mt-0.5 uppercase">{tool.tag}</span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-zinc-300 rounded border border-white/5 font-semibold group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">{tool.metric}</span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-relaxed font-mono mb-4">{tool.desc}</p>
              </div>

              <button 
                onClick={() => triggerToolAction(i)}
                disabled={calibratingTool !== null}
                className={`w-full py-2.5 border rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  calibratingTool === i
                    ? 'bg-indigo-600/20 border-indigo-400 text-indigo-300'
                    : 'bg-white/5 hover:bg-indigo-600/10 border-white/10 group-hover:border-indigo-500/40 hover:text-indigo-300'
                }`}
              >
                {calibratingTool === i ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                    {t('Calibrating...', 'Калибровка...')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin-slow text-zinc-400 group-hover:text-indigo-400" />
                    {tool.actionText}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Top 20 Advanced Functions for 2026 */}
      <div>
        <div className="text-[11px] font-mono uppercase text-fuchsia-400 font-bold mb-3 flex items-center gap-1.5">
          <HeartPulse className="w-4 h-4 text-fuchsia-400" />
          {t('TOP 20 ADVANCED 2026 COGNITIVE FUNCTIONS', 'ТОП-20 ПЕРЕДОВЫХ КОГНИТИВНЫХ ФУНКЦИЙ 2026')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {advancedAudioFeatures.map((f) => {
            const active = suiteFunctions[f.id] || false;
            return (
              <div 
                key={f.id}
                onClick={() => toggleFeature(f.id)}
                className={`p-3 rounded-xl border cursor-pointer select-none transition-all group relative flex flex-col justify-between h-[105px] ${
                  active 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.1)] scale-[1.01]' 
                    : 'bg-black/40 border-white/5 hover:border-indigo-500/20'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-bold uppercase font-mono tracking-tight transition-colors ${active ? 'text-indigo-300' : 'text-zinc-300'}`}>
                      {language === 'en' ? f.labelEn : f.labelRu}
                    </span>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    )}
                  </div>
                  <p className="text-[8px] font-mono text-zinc-500 leading-snug group-hover:text-zinc-400 transition-colors">
                    {language === 'en' ? f.descEn : f.descRu}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-2">
                  <span className="text-[7px] font-mono text-zinc-600 tracking-wider">STATE</span>
                  <span className={`text-[8px] font-mono font-bold ${active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {active ? 'ACTIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
