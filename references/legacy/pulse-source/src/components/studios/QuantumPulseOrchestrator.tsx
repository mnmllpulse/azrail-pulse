import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Sparkles, Zap, ShieldAlert, CheckCircle, Play, RefreshCw, 
  Layers, Gauge, Eye, Shield, Globe, Award, Database, ArrowRight,
  Heart, Activity, Thermometer, Droplets, ZapOff, Fingerprint,
  Settings2, Trash2, ChevronRight, Binary, HeartPulse, Workflow, MessageSquare,
  Maximize, Clock, Ghost, Microscope, Pill, FlaskConical, BrainCircuit, Lightbulb,
  TrendingUp, Activity as VitalityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuantumPulseOrchestratorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq?: number, duration?: number) => void;
  addTerminalLog: (msg: string) => void;
  suiteFunctions: Record<string, boolean>;
  setSuiteFunctions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function QuantumPulseOrchestrator({ 
  t, 
  playBeep, 
  addTerminalLog,
  suiteFunctions,
  setSuiteFunctions 
}: QuantumPulseOrchestratorProps) {
  
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

  // 2026 Psycho-Cognitive Agents
  const [agents, setAgents] = useState([
    { name: 'Psycho-Social Analyst', status: 'IDLE', color: 'text-rose-400', glow: 'bg-rose-500/20', active: false },
    { name: 'Psychology Civilization', status: 'IDLE', color: 'text-amber-400', glow: 'bg-amber-500/20', active: false },
    { name: 'Cognitive Balance Engine', status: 'IDLE', color: 'text-indigo-400', glow: 'bg-indigo-500/20', active: false },
    { name: 'Mental Shield Guard', status: 'IDLE', color: 'text-emerald-400', glow: 'bg-emerald-500/20', active: false },
    { name: 'Civilization Dynamics', status: 'IDLE', color: 'text-cyan-400', glow: 'bg-cyan-500/20', active: false },
  ]);

  // Top 10 Advanced Pulse Lab Tools for 2026
  const advancedPulseTools = [
    {
      title: t('★ Cultural Archetype Mapper', '★ Картировщик культурных архетипов'),
      tag: 'ARCHETYPES',
      desc: t('Performs real-time cognitive mapping and predicts cultural pattern changes based on current social environments.', 'Выполняет когнитивное картирование в реальном времени и прогнозирует изменение культурных паттернов.'),
      metric: 'Archetype AI',
      color: 'from-rose-500 to-pink-600',
      actionText: t('Map Archetypes', 'Картировать архетипы'),
      log: 'ARCHETYPE CORE: Analyzing behavioral patterns. Deep structural symbols identified. Culture alignment: ACTIVE.'
    },
    {
      title: t('★ Cognitive Load Synthesizer', '★ Синтезатор когнитивной нагрузки'),
      tag: 'COGNITION',
      desc: t('Monitors mental focus levels and predicts cognitive burnout 72 hours in advance using psychological metrics.', 'Мониторит уровни ментального фокуса и предсказывает когнитивное выгорание за 72 часа.'),
      metric: '99% Coherence Prediction',
      color: 'from-amber-500 to-orange-600',
      actionText: t('Sync Cognition', 'Синхронизировать разум'),
      log: 'COGNITION ENGINE: Analyzing informational flow. Stress factors: NOMINAL. Predicted peak focus: 3:00 PM.'
    },
    {
      title: t('★ Behavioral Protocol Engine', '★ Движок поведенческих протоколов'),
      tag: 'BEHAVIOR',
      desc: t('Designs custom interaction formulas and behavioral schemas optimized for collaborative multi-agent tasks.', 'Разрабатывает индивидуальные формулы взаимодействия, оптимизированные для совместных задач агентов.'),
      metric: 'Hyper-Personalized',
      color: 'from-emerald-500 to-teal-600',
      actionText: t('Synthesize Behavior', 'Синтезировать протокол'),
      log: 'BEHAVIOR-LAB: Calculating cooperative balance. Optimizing communication stacks. Schema ready.'
    },
    {
      title: t('★ Social Swarm Coordinator', '★ Координатор социального роя'),
      tag: 'SOCIETY',
      desc: t('Coordinates virtual communication agents to simulate targeted consensus and resolve linguistic conflict.', 'Координирует виртуальных агентов общения для симуляции согласия и разрешения конфликтов.'),
      metric: 'Swarm-Level Harmony',
      color: 'from-indigo-500 to-purple-600',
      actionText: t('Deploy Swarm', 'Развернуть рой'),
      log: 'SOCIETY SWARM: Navigating discussion pathways. Target: Semantic friction. Initiating alignment sequence.'
    },
    {
      title: t('★ Psychology Civilization Core', '★ Ядро психологии цивилизации'),
      tag: 'CIVILIZATION',
      desc: t('Tracks real-time cultural narratives and linguistic coherence to optimize collaborative communication.', 'Отслеживает культурные нарративы и лингвистическую когерентность для оптимизации совместного общения.'),
      metric: 'Civilization V9',
      color: 'from-blue-500 to-cyan-600',
      actionText: t('Sync Civilization', 'Синхронизировать цивилизацию'),
      log: 'CIVILIZATION CORE: Monitoring societal trends. Deep consensus state detected. Harmonizing neural narratives.'
    },
    {
      title: t('★ Psycho-Social Twin Simulator', '★ Психосоциальный цифровой двойник'),
      tag: 'SIMULATION',
      desc: t('Stress-tests your communication systems in virtual community models to predict cooperative response.', 'Тестирует системы коммуникации в виртуальных моделях сообществ для предсказания сотрудничества.'),
      metric: 'Real-Time Simulation',
      color: 'from-teal-500 to-emerald-700',
      actionText: t('Run Social Test', 'Запустить социальный тест'),
      log: 'SIMULATOR: Injecting virtual disruption variable. Narrative feedback loop: STABLE. Social rate: +15%.'
    },
    {
      title: t('★ Cognitive Biases Auditor', '★ Аудитор когнитивных искажений'),
      tag: 'COGNITION',
      desc: t('Calculates and filters cognitive errors and logical fallacies in reasoning streams with high accuracy.', 'Рассчитывает и фильтрует логические ошибки в цепочках рассуждений с высокой точностью.'),
      metric: 'Bias Audit Precision',
      color: 'from-purple-500 to-fuchsia-600',
      actionText: t('Audit Biases', 'Аудит искажений'),
      log: 'AUDITOR: Analyzing communication logic. Logical fallacy risk: 0.12%. Status: COMPLIANT.'
    },
    {
      title: t('★ Emotional Resonance Mapper', '★ Карта эмоционального резонанса'),
      tag: 'EMOTION',
      desc: t('Tracks empathy levels and communicative resonance in real-time to locate ideal dialogue windows.', 'Отслеживает уровень эмпатии и коммуникативный резонанс в реальном времени для идеальных окон диалога.'),
      metric: 'Resonance Telemetry',
      color: 'from-orange-500 to-red-600',
      actionText: t('Analyze Resonance', 'Анализ резонанса'),
      log: 'EMOTION CORE: Group empathy index: 87%. Mutual trust level: High. Collaboration window: OPEN.'
    },
    {
      title: t('★ Cultural Narrative Shield', '★ Щит культурных нарративов'),
      tag: 'NARRATIVE',
      desc: t('Predicts cognitive vulnerability and simulates logical defenses against informational noise.', 'Предсказывает когнитивную уязвимость и симулирует защиту от информационного шума.'),
      metric: 'Narrative Guard',
      color: 'from-emerald-600 to-green-700',
      actionText: t('Test Narrative', 'Тест нарратива'),
      log: 'NARRATIVE SHIELD: Scanning communication nodes. Misinformation threat: NONE. Protection level: HIGH.'
    },
    {
      title: t('★ Haptic Empathy Interface', '★ Тактильный интерфейс эмпатии'),
      tag: 'EMPATHY',
      desc: t('Advanced haptic feedback system that maps communicative warmth to physical digital insights.', 'Интерфейс тактильной связи, связывающий теплоту коммуникации с цифровыми инсайтами.'),
      metric: 'Empathy Sync V2',
      color: 'from-rose-400 to-rose-600',
      actionText: t('Calibrate Empathy', 'Калибровать эмпатию'),
      log: 'INTERFACE: Mapping communicative nodes. Signal strength: 100%. Empathy feedback loop established.'
    }
  ];

  // Expanded Advanced Pulse Functions (p101-p125) with top 2026 additions
  const advancedPulseFunctions = [
    { id: 'p101', labelEn: 'p101: Psycho-Social Archetyping', labelRu: 'p101: Психосоциальное архетипирование', descEn: 'Maps behavioral patterns to cultural and societal archetypes.', descRu: 'Картирует поведенческие модели под культурные и социальные архетипы.' },
    { id: 'p102', labelEn: 'p102: Cognitive Entropy Minimizer', labelRu: 'p102: Минимизатор когнитивной энтропии', descEn: 'Measures and stabilizes focal attention during high mental strain.', descRu: 'Измеряет и стабилизирует фокус внимания при высоких умственных нагрузках.' },
    { id: 'p103', labelEn: 'p103: Emotional Resonance Tracker', labelRu: 'p103: Трекер эмоционального резонанса', descEn: 'Analyzes empathy levels and micro-expressions in swarm dialogues.', descRu: 'Анализирует уровни эмпатии и микровыражений в диалогах роя.' },
    { id: 'p104', labelEn: 'p104: Narrative Flow Alignment', labelRu: 'p104: Синхронизация нарративного потока', descEn: 'Aligns agent messaging styles with current cultural contexts.', descRu: 'Выравнивает стили общения агентов со сложившимся культурным контекстом.' },
    { id: 'p105', labelEn: 'p105: Cognitive Bias Scanner', labelRu: 'p105: Сканнер когнитивных искажений', descEn: 'Instantly identifies active logical fallacies in reasoning streams.', descRu: 'Мгновенно выявляет активные логические ошибки в цепочках рассуждений.' },
    { id: 'p106', labelEn: 'p106: Linguistic Density Index', labelRu: 'p106: Индекс лингвистической плотности', descEn: 'Measures vocabulary depth and structural complexity of generated texts.', descRu: 'Измеряет глубину словаря и структурную сложность текстов.' },
    { id: 'p107', labelEn: 'p107: Focus Coherence Optimizer', labelRu: 'p107: Оптимизатор когерентности фокуса', descEn: 'Synchronizes cognitive resources during multi-task agent workloads.', descRu: 'Синхронизирует когнитивные ресурсы при многозадачной нагрузке агентов.' },
    { id: 'p108', labelEn: 'p108: Social Group Dynamics Model', labelRu: 'p108: Моделирование групповой динамики', descEn: 'Simulates consensus and polarization in multi-agent environments.', descRu: 'Моделирует консенсус и поляризацию в многоагентных средах.' },
    { id: 'p109', labelEn: 'p109: Semantic Connection Mapper', labelRu: 'p109: Карта семантических связей', descEn: 'Tracks semantic drift across multi-turn dialog structures.', descRu: 'Отслеживает семантический дрейф в многостраничных диалогах.' },
    { id: 'p110', labelEn: 'p110: Empathy Coherence Score', labelRu: 'p110: Индекс эмпатической когерентности', descEn: 'Evaluates alignment and positive feedback loops between communication nodes.', descRu: 'Оценивает соответствие и положительную обратную связь между узлами.' },
    { id: 'p111', labelEn: 'p111: Logic Consistency Guard', labelRu: 'p111: Контроль логической консистентности', descEn: 'Prevents contradictory conclusions in complex deduction pipelines.', descRu: 'Предотвращает противоречивые выводы в сложных цепочках дедукции.' },
    { id: 'p112', labelEn: 'p112: Behavioral Typology Analysis', labelRu: 'p112: Анализ поведенческой типологии', descEn: 'Classifies agent communication styles into structured typologies.', descRu: 'Классифицирует коммуникационные стили агентов в структурированные типы.' },
    { id: 'p113', labelEn: 'p113: Cultural Bias Shield', labelRu: 'p113: Щит культурных искажений', descEn: 'Identifies and mitigates stereotypical biases in response generation.', descRu: 'Выявляет и смягчает стереотипные предубеждения при генерации ответов.' },
    { id: 'p114', labelEn: 'p114: Mental Energy Reserve Map', labelRu: 'p114: Карта резерва ментальной энергии', descEn: 'Prevents cognitive exhaustion of active agents under stress variables.', descRu: 'Предотвращает когнитивное истощение активных агентов под нагрузкой.' },
    { id: 'p115', labelEn: 'p115: Cognitive Schema Sync', labelRu: 'p115: Синхронизация когнитивных схем', descEn: 'Synchronizes system models with external updates in real-time.', descRu: 'Синхронизирует модели системы с внешними обновлениями.' },
    { id: 'p116', labelEn: 'p116: Linguistic Tension Map', labelRu: 'p116: Карта лингвистического напряжения', descEn: 'Pinpoints stylistic friction and narrative blockages.', descRu: 'Определяет стилистическое трение и повествовательные блокировки.' },
    { id: 'p117', labelEn: 'p117: Semantic Flow Guard', labelRu: 'p117: Защита семантического потока', descEn: 'Filters low-quality noise and maintains structural integrity of output.', descRu: 'Фильтрует низкокачественный шум и сохраняет целостность выдачи.' },
    { id: 'p118', labelEn: 'p118: Bio-Feedback Meditation', labelRu: 'p118: Медитация с био-связью', descEn: 'Visualizes mental clarity and calmness metrics.', descRu: 'Визуализирует метрики ясности ума и ментального спокойствия.' },
    { id: 'p119', labelEn: 'p119: Smart Recovery Protocol', labelRu: 'p119: Умный протокол отдыха', descEn: 'Calculates restorative cognitive intervals after heavy workloads.', descRu: 'Вычисляет восстановительные когнитивные интервалы после работы.' },
    { id: 'p120', labelEn: 'p120: Final Vitality Shield', labelRu: 'p120: Финальный щит витальности', descEn: 'Predictive mental resilience scan for complex environments.', descRu: 'Предиктивный скан психологической устойчивости для сложных сред.' },
    { id: 'p121', labelEn: 'p121: Mental Focus Calibrator', labelRu: 'p121: Калибратор ментального фокуса', descEn: 'Calibrates focus and attention depth via targeted cognitive tasks.', descRu: 'Калибрует глубину фокуса и внимания с помощью когнитивных задач.' },
    { id: 'p122', labelEn: 'p122: Archetypal Myth Resonator', labelRu: 'p122: Резонатор архетипических мифов', descEn: 'Traces deep underlying cultural narratives and motifs.', descRu: 'Отслеживает глубокие лежащие в основе культурные нарративы и мотивы.' },
    { id: 'p123', labelEn: 'p123: Social Trust Pacemaker', labelRu: 'p123: Пейсмейкер социального доверия', descEn: 'Regulates dynamic parameters of cooperation in agent clusters.', descRu: 'Регулирует динамические параметры сотрудничества в кластерах агентов.' },
    { id: 'p124', labelEn: 'p124: Cognitive Rejuvenation Simulator', labelRu: 'p124: Симулятор когнитивного обновления', descEn: 'Models therapeutic techniques to refresh active mental states.', descRu: 'Моделирует терапевтические техники для обновления ментальных состояний.' },
    { id: 'p125', labelEn: 'p125: Civilization Archetype Tracker', labelRu: 'p125: Планировщик цивилизационных архетипов', descEn: 'Preserves long-term structural memories of core cultural logic.', descRu: 'Сохраняет долгосрочную структурную память ключевой культурной логики.' },
  ];

  const startPulseSwarmSync = () => {
    if (swarmActive) return;
    setSwarmActive(true);
    setSimulationLogs([]);
    playBeep(1000, 0.15);
    addTerminalLog('INITIATING PSYCHO-COGNITIVE SWARM SYNC...');

    const logSteps = [
      { delay: 300, msg: '🧠 [PSYCHO-SOCIAL ANALYST] -> Indexing cultural markers. Historical context loaded.', activeAgentIndex: 0 },
      { delay: 900, msg: '🧠 [PSYCHO-SOCIAL ANALYST] -> Social pathway optimized. Narrative drift: 0.00%.', activeAgentIndex: 0 },
      { delay: 1600, msg: '🏛️ [PSYCHOLOGY CIVILIZATION] -> Scanning group coherence. Consensus level verified.', activeAgentIndex: 1 },
      { delay: 2200, msg: '🏛️ [PSYCHOLOGY CIVILIZATION] -> Archetype alignment prediction: ACTIVE. Swarm stable.', activeAgentIndex: 1 },
      { delay: 2900, msg: '⚡ [COGNITIVE BALANCE ENGINE] -> Mapping focus coherence. Processing latency: 2ms.', activeAgentIndex: 2 },
      { delay: 3500, msg: '⚡ [COGNITIVE BALANCE ENGINE] -> Flow-state reached. Cognitive load balanced.', activeAgentIndex: 2 },
      { delay: 4200, msg: '🛡️ [MENTAL SHIELD GUARD] -> Probing logical defense. Fallacy risk minimized.', activeAgentIndex: 3 },
      { delay: 4800, msg: '🛡️ [MENTAL SHIELD GUARD] -> Narrative shield online. Cognitive integrity at 100%.', activeAgentIndex: 3 },
      { delay: 5500, msg: '🪐 [CIVILIZATION DYNAMICS] -> Recalculating archetypal age. Information-flow normalized.', activeAgentIndex: 4 }
    ];

    logSteps.forEach((step, idx) => {
      const tId = setTimeout(() => {
        setAgents(prev => prev.map((agent, aIdx) => ({
          ...agent,
          active: aIdx === step.activeAgentIndex,
          status: aIdx === step.activeAgentIndex ? 'SYNCING' : 'CALIBRATED'
        })));
        setSimulationLogs(prev => [...prev, step.msg]);
        addTerminalLog(step.msg);
        playBeep(850 + (idx * 40), 0.05);

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
    const tool = advancedPulseTools[index];
    playBeep(1100, 0.1);
    addTerminalLog(`CALIBRATING PULSE MODULE: ${tool.title.toUpperCase()}`);
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
      addTerminalLog(`PULSE KERNEL OVERRIDE: ${id.toUpperCase()} is ${state ? 'ENABLED' : 'DISABLED'}`);
      return { ...prev, [id]: state };
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Orchestrator Card */}
      <div className="bg-gradient-to-r from-rose-900/40 to-amber-900/40 p-5 rounded-2xl border border-rose-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-mono tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-400 to-orange-400 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400 animate-pulse" />
            {t('QUANTUM BIOMETRIC PULSE ORCHESTRATOR', 'КВАНТОВЫЙ БИОМЕТРИЧЕСКИЙ ОРКЕСТРАТОР')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">
            {t('Autonomous Multi-Agent Health Engine & Longevity Console 2026', 'Автономный рой ИИ-агентов здоровья и консоль долголетия 2026')}
          </p>
        </div>
        <button 
          onClick={startPulseSwarmSync}
          disabled={swarmActive}
          className={`px-5 py-2.5 text-[10px] font-mono uppercase font-bold rounded-xl tracking-wider flex items-center gap-2 transition-all ${
            swarmActive ? 'bg-zinc-800 text-zinc-500' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-95'
          }`}
        >
          {swarmActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {swarmActive ? t('CALIBRATING SWARM...', 'КАЛИБРОВКА РОЯ...') : t('ENGAGE BIOMETRIC SWARM', 'ЗАПУСТИТЬ ОРКЕСТРАТОР')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Agents List */}
        <div className="lg:col-span-4 bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-mono uppercase text-rose-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Microscope className="w-3.5 h-3.5" /> {t('HEALTH COGNITIVE AGENTS', 'КОГНИТИВНЫЕ АГЕНТЫ ЗДОРОВЬЯ')}
          </div>
          {agents.map((a, i) => (
            <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${a.active ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.active ? 'bg-rose-400 animate-ping' : 'bg-zinc-600'}`} />
                <span className={`text-[10px] font-bold font-mono ${a.color}`}>{a.name}</span>
              </div>
              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${a.status === 'SYNCING' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>

        {/* Swarm Execution Feed */}
        <div className="lg:col-span-8 bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[220px]">
          <div className="text-[10px] font-mono uppercase text-amber-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Binary className="w-3.5 h-3.5" /> {t('LIVE BIOMETRIC DATA STREAM', 'ПОТОК БИОМЕТРИЧЕСКИХ ДАННЫХ')}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 flex flex-col gap-1.5 mt-3 pr-2 custom-scrollbar">
            {simulationLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                <span>{t('Orchestrator idle. Waiting for pulse sync.', 'Оркестратор в режиме ожидания.')}</span>
              </div>
            ) : (
              simulationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-rose-500">▶</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* NEW: Interactive Waveform Monitor Visualizer */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
        <div className="text-[10px] font-mono uppercase text-rose-400 font-bold border-b border-white/5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VitalityIcon className="w-3.5 h-3.5" />
            {t('LIVE PSYCHO-COGNITIVE RESONANCE', 'КОГНИТИВНЫЙ РЕЗОНАНС РАЗУМА')}
          </div>
          <span className="text-[8px] font-mono text-zinc-500">
            {t('ACTIVE MODULE: ', 'АКТИВНЫЙ МОДУЛЬ: ')} {advancedPulseTools[selectedTool].tag}
          </span>
        </div>

        <div className="h-[120px] bg-black/80 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
          
          <svg className="w-full h-full absolute inset-0" viewBox="0 0 800 120" preserveAspectRatio="none">
            {/* Animating Wave based on selected tool */}
            <motion.path
              d={
                selectedTool === 4 // Psychology Civilization Core (Theta/Alpha waves)
                  ? "M 0,60 Q 50,20 100,60 T 200,60 T 300,60 T 400,60 T 500,60 T 600,60 T 700,60 T 800,60"
                  : selectedTool === 1 // Cognitive Load (High pulse wave)
                  ? "M 0,60 L 50,60 L 60,30 L 70,90 L 80,60 L 150,60 L 160,20 L 170,100 L 180,60 L 250,60 L 260,30 L 270,90 L 280,60 L 350,60 L 360,20 L 370,100 L 380,60 L 450,60 L 460,30 L 470,90 L 480,60 L 550,60 L 560,20 L 570,100 L 580,60 L 650,60 L 660,30 L 670,90 L 680,60 L 750,60 L 760,20 L 770,100 L 780,60 L 800,60"
                  : "M 0,60 C 100,20 150,100 250,60 C 350,20 400,100 500,60 C 600,20 650,100 750,60 C 800,40 850,60 900,60"
              }
              fill="transparent"
              stroke={selectedTool === 4 ? "#6366f1" : selectedTool === 1 ? "#f59e0b" : "#f43f5e"}
              strokeWidth="2"
              initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
              animate={{ strokeDashoffset: [1000, 0] }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            />
          </svg>

          <div className="absolute bottom-2 right-3 font-mono text-[8px] text-zinc-500 bg-black/60 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            {t('COHERENCE: 98.7% (STABLE)', 'КОГЕРЕНТНОСТЬ: 98.7% (СТАБИЛЬНО)')}
          </div>
        </div>
      </div>

      {/* Advanced Tools Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-rose-400 font-bold mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" /> {t('TOP 10 ADVANCED 2026 HEALTH INSTRUMENTS', 'ТОП-10 ИНСТРУМЕНТОВ ЗДОРОВЬЯ 2026')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedPulseTools.map((tool, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border group transition-all relative overflow-hidden flex flex-col justify-between ${
                selectedTool === i ? 'bg-rose-950/20 border-rose-500/40 shadow-lg' : 'bg-black/40 border-white/5 hover:border-rose-500/20'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-extrabold text-white group-hover:text-rose-300 font-mono">{tool.title}</span>
                  <span className="text-[8px] font-mono text-rose-400 uppercase tracking-widest mt-0.5">{tool.tag}</span>
                </div>
                <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">{tool.metric}</span>
              </div>
              <p className="text-[9px] text-zinc-500 font-mono mb-4 leading-relaxed">{tool.desc}</p>
              <button 
                onClick={() => triggerTool(i)}
                disabled={calibratingTool !== null}
                className={`w-full py-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                  calibratingTool === i ? 'bg-rose-600/20 border-rose-400 text-rose-300' : 'bg-white/5 border-white/10 hover:bg-rose-600/10 hover:border-rose-500/40'
                }`}
              >
                {calibratingTool === i ? <RefreshCw className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                {calibratingTool === i ? t('Calibrating...', 'Калибровка...') : tool.actionText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Functions Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-amber-400 font-bold mb-3 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" /> {t('TOP 25 ADVANCED 2026 KERNEL BIOMETRICS', 'ТОП-25 ПЕРЕДОВЫХ БИОМЕТРИК ЯДРА 2026')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {advancedPulseFunctions.map((f) => {
            const active = suiteFunctions[f.id] || false;
            return (
              <div 
                key={f.id}
                onClick={() => toggleFunction(f.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-[110px] ${
                  active ? 'bg-amber-600/10 border-amber-500/40 shadow-inner' : 'bg-black/40 border-white/5 hover:border-amber-500/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-bold font-mono uppercase ${active ? 'text-amber-300' : 'text-zinc-300'}`}>{language === 'en' ? f.labelEn : f.labelRu}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" />}
                </div>
                <p className="text-[8px] font-mono text-zinc-500 mt-1 leading-snug">{language === 'en' ? f.descEn : f.descRu}</p>
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-2">
                  <span className="text-[7px] font-mono text-zinc-600">KERNEL STATE</span>
                  <span className={`text-[8px] font-mono font-bold ${active ? 'text-amber-400' : 'text-zinc-600'}`}>{active ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
