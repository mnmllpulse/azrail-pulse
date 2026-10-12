import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Sparkles, Zap, ShieldAlert, CheckCircle, Play, RefreshCw, 
  Layers, Gauge, Eye, Shield, Globe, Award, Database, ArrowRight,
  Bot, Brain, Network, Workflow, MessageSquare, TerminalSquare,
  History, Settings2, Trash2, ChevronRight, Binary, HeartPulse,
  Share2, ImagePlus, Loader2, Search, ZapOff, Fingerprint, Activity,
  Boxes, Target, Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuantumAgentOrchestratorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq?: number, duration?: number) => void;
  addTerminalLog: (msg: string) => void;
  suiteFunctions: Record<string, boolean>;
  setSuiteFunctions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function QuantumAgentOrchestrator({ 
  t, 
  playBeep, 
  addTerminalLog,
  suiteFunctions,
  setSuiteFunctions 
}: QuantumAgentOrchestratorProps) {
  
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

  // 2026 Synaptic Agents for Agent Studio
  const [agents, setAgents] = useState([
    { name: 'Synaptic Architect', status: 'IDLE', color: 'text-indigo-400', glow: 'bg-indigo-500/20', active: false },
    { name: 'Reasoning Engine', status: 'IDLE', color: 'text-rose-400', glow: 'bg-rose-500/20', active: false },
    { name: 'Memory Weaver', status: 'IDLE', color: 'text-cyan-400', glow: 'bg-cyan-500/20', active: false },
    { name: 'Constraint Master', status: 'IDLE', color: 'text-amber-400', glow: 'bg-amber-500/20', active: false },
    { name: 'Ethics Guard', status: 'IDLE', color: 'text-emerald-400', glow: 'bg-emerald-500/20', active: false },
  ]);

  // Top 10 Advanced Agent Tools for 2026
  const advancedAgentTools = [
    {
      title: t('★ Neural Memory Mesh', '★ Нейронная сеть памяти'),
      tag: 'MEMORY',
      desc: t('Implements a cognitive RAG system that mimics long-term human memory with dynamic association and decay.', 'Реализует когнитивную систему RAG, имитирующую долговременную человеческую память с динамическими ассоциациями.'),
      metric: 'Petabyte Context',
      color: 'from-cyan-500 to-blue-600',
      actionText: t('Initialize Mesh', 'Инициализировать сеть'),
      log: 'MEMORY CORE: Allocating synaptic storage... Building associative vector graph. Long-term retrieval path verified.'
    },
    {
      title: t('★ Multi-Agent Swarm Orchestrator', '★ Оркестратор роя агентов'),
      tag: 'SWARM',
      desc: t('Coordinates hundreds of specialized sub-agents to solve complex tasks through autonomous consensus and collaboration.', 'Координирует сотни специализированных подагентов для решения сложных задач через автономный консенсус.'),
      metric: '500+ Active Agents',
      color: 'from-indigo-500 to-purple-600',
      actionText: t('Deploy Swarm', 'Развернуть рой'),
      log: 'SWARM MANAGER: Spawning 128 task-specific instances. Establishing P2P communication mesh. Consensus protocol: ACTIVE.'
    },
    {
      title: t('★ Autonomous Goal Decomposer', '★ Автономный декомпозитор целей'),
      tag: 'LOGIC',
      desc: t('Automatically breaks down high-level ambiguous goals into executable, prioritized sub-tasks with dependency mapping.', 'Автоматически разбивает высокоуровневые неопределенные цели на исполняемые подзадачи с картой зависимостей.'),
      metric: 'Zero-Prompt Planning',
      color: 'from-emerald-500 to-teal-600',
      actionText: t('Decompose Goal', 'Разбить цель'),
      log: 'LOGIC ENGINE: Parsing user intent "Build Global Brand". Generating 42 sub-tasks. Critical path identified: Task 4, 12, 18.'
    },
    {
      title: t('★ Real-time Sensory Fusion', '★ Сенсорный синтез реального времени'),
      tag: 'MULTIMODAL',
      desc: t('Merges video, audio, and text streams into a unified world-view for agents to act in physical or virtual environments.', 'Объединяет видео, аудио и текстовые потоки в единую картину мира для действий агента в любой среде.'),
      metric: 'Unified Input V4',
      color: 'from-rose-500 to-orange-600',
      actionText: t('Engage Fusion', 'Запустить синтез'),
      log: 'SENSORY CORE: Syncing Vision (60fps) + Audio (48kHz) + Text. Spatial coordinates mapped. Object recognition: 99.8% confidence.'
    },
    {
      title: t('★ Recursive Self-Correction Loop', '★ Цикл рекурсивной самокоррекции'),
      tag: 'REASONING',
      desc: t('Enables agents to audit their own reasoning and code outputs in real-time to eliminate hallucination and errors.', 'Позволяет агентам проверять собственные рассуждения и код в реальном времени для устранения галлюцинаций.'),
      metric: 'Error-Free Logic',
      color: 'from-amber-500 to-yellow-600',
      actionText: t('Start Self-Audit', 'Начать самоаудит'),
      log: 'AUDIT MODULE: Monitoring reasoning chain. Detected logic jump in Step 3. Re-routing through formal verification kernel. Fixed.'
    },
    {
      title: t('★ Cross-Domain Knowledge Transfer', '★ Трансфер знаний между доменами'),
      tag: 'COGNITION',
      desc: t('Allows agents to apply logic from one field (e.g. physics) to solve problems in another (e.g. finance) autonomously.', 'Позволяет агентам применять логику из одной области (напр. физика) для решения задач в другой (напр. финансы).'),
      metric: 'Analogical Reasoning',
      color: 'from-violet-500 to-purple-700',
      actionText: t('Transfer Knowledge', 'Трансфер знаний'),
      log: 'COGNITION HUB: Mapping "Fluid Dynamics" patterns to "Market Volatility". Analogical bridge established. New trading model generated.'
    },
    {
      title: t('★ Synthetic Persona Generator', '★ Генератор синтетических персон'),
      tag: 'PERSONA',
      desc: t('Generates deep, consistent psychological profiles and backstories for agents to maintain perfect immersion.', 'Создает глубокие, последовательные психологические профили и предыстории для идеального погружения агента.'),
      metric: 'Deep-Trace Identity',
      color: 'from-sky-500 to-blue-600',
      actionText: t('Forge Identity', 'Создать личность'),
      log: 'IDENTITY FORGE: Generating backstory for "Detective Orion". Traits: Stoic, Analytical, Night-owl. Consistent voice weights applied.'
    },
    {
      title: t('★ Predictive Intent Analyzer', '★ Предиктивный анализатор намерений'),
      tag: 'PREDICTION',
      desc: t('Predicts user next steps and needs before they are explicitly stated, enabling proactive agent assistance.', 'Предсказывает следующие шаги и потребности пользователя до того, как они будут высказаны.'),
      metric: '95% Intent Accuracy',
      color: 'from-fuchsia-500 to-pink-600',
      actionText: t('Analyze Intent', 'Анализ намерений'),
      log: 'PREDICTION CORE: Scanning behavioral history. 89% probability user will request "Deployment to Cloud". Pre-caching resources.'
    },
    {
      title: t('★ Dynamic Tool-Use Fabric', '★ Ткань динамических инструментов'),
      tag: 'TOOLS',
      desc: t('Agents can discover, learn, and create their own software tools to solve unique engineering challenges.', 'Агенты могут находить, изучать и создавать собственные инструменты для решения уникальных задач.'),
      metric: 'Auto-Scaling Tools',
      color: 'from-orange-500 to-red-700',
      actionText: t('Synthesize Tool', 'Синтезировать инструмент'),
      log: 'TOOL FABRIC: No tool found for "Quantum Bit Analysis". Synthesizing Python script... Tool validated and added to local library.'
    },
    {
      title: t('★ Federated Agent Learning', '★ Федеративное обучение агентов'),
      tag: 'LEARNING',
      desc: t('Agents learn from collective experiences across the network without compromising individual data privacy.', 'Агенты учатся на коллективном опыте всей сети без ущерба для конфиденциальности данных.'),
      metric: 'Global Hive Mind',
      color: 'from-blue-500 to-indigo-700',
      actionText: t('Sync Hive Mind', 'Синхронизировать разум'),
      log: 'HIVE SYNC: Downloading 4.2k updated behavioral weights. Privacy mask applied. Local model upgraded with network wisdom.'
    }
  ];

  // Top 20 Advanced Agent Functions (a51-a70)
  const advancedAgentFunctions = [
    { id: 'a51', labelEn: 'a51: Context Window Expander', labelRu: 'a51: Расширитель окна контекста', descEn: 'Dynamically expands context to handle millions of lines of data.', descRu: 'Динамически расширяет контекст для работы с миллионами строк.' },
    { id: 'a52', labelEn: 'a52: Latent Space Navigator', labelRu: 'a52: Навигатор латентного пространства', descEn: 'Directly manipulates model embeddings for precise control.', descRu: 'Прямое манипулирование эмбеддингами для точного управления.' },
    { id: 'a53', labelEn: 'a53: Multi-Modal Bridge', labelRu: 'a53: Мультимодальный мост', descEn: 'Seamlessly translates intent across vision, text, and voice.', descRu: 'Бесшовный перевод намерений между видео, текстом и голосом.' },
    { id: 'a54', labelEn: 'a54: EQ Guardrail', labelRu: 'a54: EQ Ограничитель', descEn: 'Maintains emotional stability and empathy in agent interactions.', descRu: 'Поддерживает эмоциональную стабильность и эмпатию агента.' },
    { id: 'a55', labelEn: 'a55: Prompt Compressor', labelRu: 'a55: Оптимизатор промптов', descEn: 'Reduces token usage by 80% without losing semantic meaning.', descRu: 'Снижает использование токенов на 80% без потери смысла.' },
    { id: 'a56', labelEn: 'a56: Zero-Shot Induction', labelRu: 'a56: Zero-Shot Индукция', descEn: 'Agent performs new tasks without any prior examples.', descRu: 'Агент выполняет новые задачи без каких-либо примеров.' },
    { id: 'a57', labelEn: 'a57: Temporal Causality Map', labelRu: 'a57: Карта временной причинности', descEn: 'Tracks long-term chains of cause and effect in agent actions.', descRu: 'Отслеживает долгосрочные цепочки причин и следствий.' },
    { id: 'a58', labelEn: 'a58: Neural Code Synthesis', labelRu: 'a58: Нейронный синтез кода', descEn: 'Generates high-performance low-level code autonomously.', descRu: 'Автономно генерирует высокопроизводительный код.' },
    { id: 'a59', labelEn: 'a59: API Orchestrator', labelRu: 'a59: API Оркестратор', descEn: 'Autonomously integrates and manages third-party API keys.', descRu: 'Автономно интегрирует и управляет API сторонних сервисов.' },
    { id: 'a60', labelEn: 'a60: Privacy Shield', labelRu: 'a60: Щит приватности', descEn: 'Automatically redacts sensitive data before model processing.', descRu: 'Автоматически скрывает личные данные до обработки моделью.' },
    { id: 'a61', labelEn: 'a61: RL Feedback Loop', labelRu: 'a61: Петля обратной связи RL', descEn: 'Continuous learning from user corrections and ratings.', descRu: 'Постоянное обучение на основе правок и оценок пользователя.' },
    { id: 'a62', labelEn: 'a62: Voice Clone Sync', labelRu: 'a62: Синхронизация клона голоса', descEn: 'Perfectly syncs agent identity with high-fidelity voice.', descRu: 'Идеально синхронизирует личность агента с клоном голоса.' },
    { id: 'a63', labelEn: 'a63: Behavioral Pattern Rec', labelRu: 'a63: Распознавание паттернов', descEn: 'Identifies complex human behavioral patterns in real-time.', descRu: 'Распознает сложные паттерны поведения человека в реальном времени.' },
    { id: 'a64', labelEn: 'a64: Dynamic Constraint Solver', labelRu: 'a64: Решатель ограничений', descEn: 'Solves multi-variable problems with strict user constraints.', descRu: 'Решает многофакторные задачи со строгими ограничениями.' },
    { id: 'a65', labelEn: 'a65: Meta-Cognitive Monitor', labelRu: 'a65: Мета-когнитивный монитор', descEn: 'Reports agent "confidence" and reasoning health status.', descRu: 'Отчет об уровне "уверенности" и здоровье логики агента.' },
    { id: 'a66', labelEn: 'a66: Cross-Platform Hub', labelRu: 'a66: Кросс-платформенный хаб', descEn: 'Deploys agents to web, mobile, and IoT simultaneously.', descRu: 'Развертывание агента на веб, мобильные и IoT устройства.' },
    { id: 'a67', labelEn: 'a67: Quantum Encryption', labelRu: 'a67: Квантовое шифрование', descEn: 'Protects agent weights with post-quantum security.', descRu: 'Защита весов агента с помощью постквантовой безопасности.' },
    { id: 'a68', labelEn: 'a68: Neural Network Pruning', labelRu: 'a68: Прунинг нейронной сети', descEn: 'Optimizes agent performance for low-power edge devices.', descRu: 'Оптимизирует работу агента для слабых устройств.' },
    { id: 'a69', labelEn: 'a69: Explainable AI Trace', labelRu: 'a69: Трассировка объяснимого ИИ', descEn: 'Provides human-readable logs for every agent decision.', descRu: 'Предоставляет понятные логи для каждого решения агента.' },
    { id: 'a70', labelEn: 'a70: Final Integrity Shield', labelRu: 'a70: Финальный щит целостности', descEn: 'Prevents adversarial attacks and jailbreaking attempts.', descRu: 'Предотвращает атаки и попытки взлома (jailbreak).' },
  ];

  const startAgentSwarmSync = () => {
    if (swarmActive) return;
    setSwarmActive(true);
    setSimulationLogs([]);
    playBeep(1000, 0.15);
    addTerminalLog('INITIATING QUANTUM SYNAPTIC SWARM ORCHESTRATOR...');

    const logSteps = [
      { delay: 300, msg: '🧠 [SYNAPTIC ARCHITECT] -> Constructing cognitive framework. Allocating memory buffers.', activeAgentIndex: 0 },
      { delay: 900, msg: '🧠 [SYNAPTIC ARCHITECT] -> Semantic graph initialized. 500+ nodes connected.', activeAgentIndex: 0 },
      { delay: 1600, msg: '⚡ [REASONING ENGINE] -> Scanning logic chains... Verified 0.00% hallucination risk.', activeAgentIndex: 1 },
      { delay: 2200, msg: '⚡ [REASONING ENGINE] -> Inference speed optimized. Latency reduced to 4ms per token.', activeAgentIndex: 1 },
      { delay: 2900, msg: '🕸️ [MEMORY WEAVER] -> Indexing long-term vector storage. Association mesh active.', activeAgentIndex: 2 },
      { delay: 3500, msg: '🕸️ [MEMORY WEAVER] -> RAG pipeline hot-loaded. Retrieval accuracy at 99.9%.', activeAgentIndex: 2 },
      { delay: 4200, msg: '🛡️ [ETHICS GUARD] -> Injecting safety alignment. Guardrails locked for high-stakes mode.', activeAgentIndex: 4 },
      { delay: 4800, msg: '🛡️ [ETHICS GUARD] -> Integrity shield active. Adversarial protection enabled.', activeAgentIndex: 4 },
      { delay: 5500, msg: '🤖 [SWARM ORCHESTRATOR] -> All agents calibrated. Synaptic swarm is now AUTONOMOUS.', activeAgentIndex: -1 }
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
        playBeep(900 + (idx * 40), 0.05);

        if (idx === logSteps.length - 1) {
          setSwarmActive(false);
          setAgents(prev => prev.map(a => ({ ...a, active: false, status: 'ONLINE' })));
          playBeep(1500, 0.3);
        }
      }, step.delay);
      timeoutRefs.current.push(tId);
    });
  };

  const triggerTool = (index: number) => {
    if (calibratingTool !== null) return;
    setCalibratingTool(index);
    setSelectedTool(index);
    const tool = advancedAgentTools[index];
    playBeep(1200, 0.1);
    addTerminalLog(`CALIBRATING AGENT MODULE: ${tool.title.toUpperCase()}`);
    addTerminalLog(tool.log);

    const tId = setTimeout(() => {
      setCalibratingTool(null);
      playBeep(1600, 0.08);
      addTerminalLog(`[SUCCESS] "${tool.title.toUpperCase()}" AGENT MODULE ONLINE.`);
    }, 1500);
    timeoutRefs.current.push(tId);
  };

  const toggleFunction = (id: string) => {
    setSuiteFunctions(prev => {
      const state = !prev[id];
      playBeep(state ? 1300 : 600, 0.05);
      addTerminalLog(`AGENT KERNEL OVERRIDE: ${id.toUpperCase()} is ${state ? 'ENABLED' : 'DISABLED'}`);
      return { ...prev, [id]: state };
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Orchestrator Card */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-violet-900/40 p-5 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-mono tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            {t('QUANTUM SYNAPTIC AGENT ORCHESTRATOR', 'КВАНТОВЫЙ СИНАПТИЧЕСКИЙ ОРКЕСТРАТОР')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">
            {t('Central Command for Autonomous Multi-Agent Swarms & Cognitive Nodes 2026', 'Центральное управление роями агентов и когнитивными узлами 2026')}
          </p>
        </div>
        <button 
          onClick={startAgentSwarmSync}
          disabled={swarmActive}
          className={`px-5 py-2.5 text-[10px] font-mono uppercase font-bold rounded-xl tracking-wider flex items-center gap-2 transition-all ${
            swarmActive ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
          }`}
        >
          {swarmActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {swarmActive ? t('SYNCING SWARM...', 'СИНХРОНИЗАЦИЯ...') : t('ENGAGE SYNAPTIC SWARM', 'ЗАПУСТИТЬ ОРКЕСТРАТОР')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Agents List */}
        <div className="lg:col-span-4 bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Scan className="w-3.5 h-3.5" /> {t('ACTIVE COGNITIVE AGENTS', 'АКТИВНЫЕ КОГНИТИВНЫЕ АГЕНТЫ')}
          </div>
          {agents.map((a, i) => (
            <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${a.active ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.active ? 'bg-indigo-400 animate-ping' : 'bg-zinc-600'}`} />
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
          <div className="text-[10px] font-mono uppercase text-violet-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Binary className="w-3.5 h-3.5" /> {t('SYNAPTIC EXECUTION LOGS', 'ЛОГИ СИНАПТИЧЕСКОГО ВЫПОЛНЕНИЯ')}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 flex flex-col gap-1.5 mt-3 pr-2 custom-scrollbar">
            {simulationLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <Target className="w-8 h-8 opacity-20 mb-2" />
                <span>{t('Orchestrator idle. Waiting for synaptic command.', 'Оркестратор ожидает синаптической команды.')}</span>
              </div>
            ) : (
              simulationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-indigo-500">▶</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advanced Tools Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-indigo-400 font-bold mb-3 flex items-center gap-2">
          <Boxes className="w-4 h-4" /> {t('TOP 10 ADVANCED 2026 AGENT INSTRUMENTS', 'ТОП-10 ПЕРЕДОВЫХ ИНСТРУМЕНТОВ АГЕНТОВ 2026')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedAgentTools.map((tool, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border group transition-all relative overflow-hidden flex flex-col justify-between ${
                selectedTool === i ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg' : 'bg-black/40 border-white/5 hover:border-indigo-500/20'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-extrabold text-white group-hover:text-indigo-300 font-mono">{tool.title}</span>
                  <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest mt-0.5">{tool.tag}</span>
                </div>
                <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">{tool.metric}</span>
              </div>
              <p className="text-[9px] text-zinc-500 font-mono mb-4 leading-relaxed">{tool.desc}</p>
              <button 
                onClick={() => triggerTool(i)}
                disabled={calibratingTool !== null}
                className={`w-full py-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                  calibratingTool === i ? 'bg-indigo-600/20 border-indigo-400 text-indigo-300' : 'bg-white/5 border-white/10 hover:bg-indigo-600/10 hover:border-indigo-500/40'
                }`}
              >
                {calibratingTool === i ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Fingerprint className="w-3 h-3" />}
                {calibratingTool === i ? t('Syncing...', 'Синхронизация...') : tool.actionText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Functions Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-violet-400 font-bold mb-3 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" /> {t('TOP 20 ADVANCED 2026 AGENT KERNEL FUNCTIONS', 'ТОП-20 ПЕРЕДОВЫХ ФУНКЦИЙ ЯДРА 2026')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {advancedAgentFunctions.map((f) => {
            const active = suiteFunctions[f.id] || false;
            return (
              <div 
                key={f.id}
                onClick={() => toggleFunction(f.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-[100px] ${
                  active ? 'bg-violet-600/10 border-violet-500/40 shadow-inner' : 'bg-black/40 border-white/5 hover:border-violet-500/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-bold font-mono uppercase ${active ? 'text-violet-300' : 'text-zinc-300'}`}>{language === 'en' ? f.labelEn : f.labelRu}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]" />}
                </div>
                <p className="text-[8px] font-mono text-zinc-500 mt-1 leading-snug">{language === 'en' ? f.descEn : f.descRu}</p>
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-2">
                  <span className="text-[7px] font-mono text-zinc-600">KERNEL STATUS</span>
                  <span className={`text-[8px] font-mono font-bold ${active ? 'text-violet-400' : 'text-zinc-600'}`}>{active ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
