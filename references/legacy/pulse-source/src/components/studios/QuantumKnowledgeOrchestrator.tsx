import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Sparkles, Zap, RefreshCw, 
  Layers, Eye, Shield, Globe, Database,
  Book, BookOpen, Brain, Search, Library,
  Settings2, Binary, Workflow, MessageSquare,
  Clock, Ghost, Box, Mountain, Sun, UserCircle,
  FileText, Share2, Lightbulb, GraduationCap,
  Microscope, Terminal, Award, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuantumKnowledgeOrchestratorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq?: number, duration?: number) => void;
  addTerminalLog: (msg: string) => void;
  suiteFunctions: Record<string, boolean>;
  setSuiteFunctions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function QuantumKnowledgeOrchestrator({ 
  t, 
  playBeep, 
  addTerminalLog,
  suiteFunctions,
  setSuiteFunctions 
}: QuantumKnowledgeOrchestratorProps) {
  
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

  // 2026 Knowledge Acquisition Agents
  const [agents, setAgents] = useState([
    { name: 'Semantic Crawler', status: 'IDLE', color: 'text-indigo-400', glow: 'bg-indigo-500/20', active: false },
    { name: 'Logic Validator', status: 'IDLE', color: 'text-emerald-400', glow: 'bg-emerald-500/20', active: false },
    { name: 'Concept Synthesizer', status: 'IDLE', color: 'text-amber-400', glow: 'bg-amber-500/20', active: false },
    { name: 'Bias Neutralizer', status: 'IDLE', color: 'text-rose-400', glow: 'bg-rose-500/20', active: false },
    { name: 'Context Weaver', status: 'IDLE', color: 'text-sky-400', glow: 'bg-sky-500/20', active: false },
  ]);

  // Top 10 Advanced Knowledge Tools for 2026
  const advancedKnowledgeTools = [
    {
      title: t('★ Neural Semantic Indexer', '★ Нейро-семантический индексатор'),
      tag: 'INDEXING',
      desc: t('Deep cross-domain knowledge mapping that understands connections between unrelated fields automatically.', 'Глубокое кросс-доменное картирование знаний, понимающее связи между несвязанными областями.'),
      metric: 'Vector-Space 8K',
      color: 'from-indigo-500 to-blue-600',
      actionText: t('Index Repository', 'Индексировать'),
      log: 'SEMANTIC CRAWLER: Mapping concept clusters. N-dimensional relationships identified. Cross-linkages: 850k.'
    },
    {
      title: t('★ Latent Concept Synthesizer', '★ Синтезатор латентных концептов'),
      tag: 'SYNTHESIS',
      desc: t('Creates new theoretical frameworks by blending disparate data points in latent space.', 'Создает новые теоретические основы, смешивая разрозненные точки данных в латентном пространстве.'),
      metric: 'Idea-Gen V9',
      color: 'from-amber-500 to-orange-600',
      actionText: t('Synthesize Concepts', 'Синтезировать'),
      log: 'SYNTHESIZER: Blending physics with philosophy. New hypothesis generated. Structural coherence: 94%.'
    },
    {
      title: t('★ Multi-Modal Fusion', '★ Мультимодальное слияние'),
      tag: 'FUSION',
      desc: t('Merges text, video, and audio into unified high-dimensional knowledge embeddings.', 'Объединяет текст, видео и аудио в единые многомерные вложения знаний.'),
      metric: 'Unified Embed-X',
      color: 'from-emerald-500 to-teal-600',
      actionText: t('Fuse Modalities', 'Слить модальности'),
      log: 'CONTEXT WEAVER: Synchronizing video frames with transcript logic. Unified vector generated.'
    },
    {
      title: t('★ Recursive Logic Auditor', '★ Рекурсивный логический аудитор'),
      tag: 'AUDIT',
      desc: t('Scans massive datasets for logical fallacies, circular reasoning, and structural gaps.', 'Сканирует массивы данных на наличие логических ошибок и структурных пробелов.'),
      metric: 'Zero-Fallacy Engine',
      color: 'from-rose-500 to-red-600',
      actionText: t('Audit Logic', 'Аудит логики'),
      log: 'LOGIC VALIDATOR: Scanning for contradictions. 3 circular references identified. Resolution initiated.'
    },
    {
      title: t('★ Predictive Insight Engine', '★ Движок предиктивных инсайтов'),
      tag: 'FORECAST',
      desc: t('Forecasts future technological and social trends based on historical and current data patterns.', 'Прогнозирует технологические и социальные тренды на основе исторических паттернов.'),
      metric: 'Trend-Flow Pro',
      color: 'from-sky-500 to-indigo-600',
      actionText: t('Forecast Trends', 'Прогноз трендов'),
      log: 'CRAWLER: Analyzing venture capital flow vs research papers. Predicted breakthrough: Q3 2027.'
    },
    {
      title: t('★ Cognitive Bias Shield', '★ Щит когнитивных искажений'),
      tag: 'ETHICS',
      desc: t('Identifies and neutralizes political, social, and statistical biases in information sources.', 'Выявляет и нейтрализует политические, социальные и статистические искажения в источниках.'),
      metric: 'Bias-Free ML',
      color: 'from-purple-500 to-fuchsia-600',
      actionText: t('Neutralize Bias', 'Нейтрализовать'),
      log: 'BIAS NEUTRALIZER: Source analysis complete. Identified 12% skew in perspective. Re-balancing data.'
    },
    {
      title: t('★ Fact-Check Swarm', '★ Рой факт-чекинга'),
      tag: 'VERIFICATION',
      desc: t('Autonomous verification of every statement against global real-time ground-truth databases.', 'Автономная проверка каждого утверждения по глобальным базам данных в реальном времени.'),
      metric: '99.9% Truth-Sync',
      color: 'from-cyan-500 to-blue-600',
      actionText: t('Verify Facts', 'Проверить факты'),
      log: 'LOGIC VALIDATOR: Cross-referencing with 50 authoritative nodes. Truth score: 98.7%.'
    },
    {
      title: t('★ Quantum Contextualizer', '★ Квантовый контекстуализатор'),
      tag: 'PERSONALIZATION',
      desc: t('Adapts complex knowledge to specific user mental models, experience levels, and goals.', 'Адаптирует сложные знания под конкретные ментальные модели и уровни опыта пользователя.'),
      metric: 'Mental-Map Sync',
      color: 'from-violet-500 to-purple-700',
      actionText: t('Contextualize', 'Контекстуализировать'),
      log: 'CONTEXT WEAVER: Mapping user expertise level (Advanced). Adjusting technical nuance depth.'
    },
    {
      title: t('★ Holographic Data Explorer', '★ Голографический исследователь'),
      tag: 'VISUALIZATION',
      desc: t('Interactive 4D visualization of complex knowledge structures and relationships.', 'Интерактивная 4D визуализация сложных структур знаний и связей.'),
      metric: '4D Graph-Render',
      color: 'from-orange-500 to-red-600',
      actionText: t('Render Graph', 'Отрендерить граф'),
      log: 'SYNTHESIZER: Constructing knowledge topology. 4D projection active. Navigation ready.'
    },
    {
      title: t('★ Neural Summary Architect', '★ Нейро-архитектор резюме'),
      tag: 'COMPRESSION',
      desc: t('Infinite compression of data without losing nuance, using recursive semantic distillation.', 'Бесконечное сжатие данных без потери нюансов через семантическую дистилляцию.'),
      metric: '1000:1 Distill',
      color: 'from-emerald-500 to-green-600',
      actionText: t('Distill Data', 'Дистиллировать'),
      log: 'BIAS NEUTRALIZER: Compressing 5,000 pages. Core essence extracted. Nuance preserved.'
    }
  ];

  // Expanded Top 25 Advanced Knowledge Functions (k101-k125)
  const advancedKnowledgeFunctions = [
    { id: 'k101', labelEn: 'k101: Cross-Language Translation', labelRu: 'k101: Кросс-языковой перевод', descEn: 'Translates concepts, not just words, across all major languages.', descRu: 'Перевод концепций, а не только слов, на всех языках.' },
    { id: 'k102', labelEn: 'k102: Temporal Data Anchoring', labelRu: 'k102: Темпоральное якорение', descEn: 'Tracks how knowledge evolves and changes over time.', descRu: 'Отслеживает эволюцию и изменение знаний во времени.' },
    { id: 'k103', labelEn: 'k103: Expert-Level Nuance Extraction', labelRu: 'k103: Извлечение нюансов', descEn: 'Identifies subtle expert-level details often missed by basic AI.', descRu: 'Выявление тонких деталей экспертного уровня.' },
    { id: 'k104', labelEn: 'k104: Semantic Relationship Mapping', labelRu: 'k104: Картирование связей', descEn: 'Finds non-obvious links between disparate pieces of info.', descRu: 'Поиск неочевидных связей между разными данными.' },
    { id: 'k105', labelEn: 'k105: Dynamic Taxonomy Generation', labelRu: 'k105: Динамическая таксономия', descEn: 'Automatically categorizes data into relevant hierarchies.', descRu: 'Автоматическая категоризация данных в иерархии.' },
    { id: 'k106', labelEn: 'k106: Automated Citation Verification', labelRu: 'k106: Верификация цитат', descEn: 'Checks every source and citation for validity and context.', descRu: 'Проверка каждого источника и цитаты на валидность.' },
    { id: 'k107', labelEn: 'k107: Knowledge Graph Auto-Healing', labelRu: 'k107: Авто-лечение графа знаний', descEn: 'Fixes broken links and outdated info in the knowledge base.', descRu: 'Исправление битых ссылок и устаревших данных.' },
    { id: 'k108', labelEn: 'k108: Multi-Agent Consensus', labelRu: 'k108: Консенсус агентов', descEn: 'Requires multiple agents to agree on a fact before indexing.', descRu: 'Требует согласия нескольких агентов перед индексацией.' },
    { id: 'k109', labelEn: 'k109: Ethical Constraint Verifier', labelRu: 'k109: Проверка этики', descEn: 'Ensures knowledge usage adheres to ethical guidelines.', descRu: 'Гарантирует соблюдение этических норм при работе.' },
    { id: 'k110', labelEn: 'k110: Generative Hypothesis Lab', labelRu: 'k110: Лаборатория гипотез', descEn: 'Suggests new areas for research based on knowledge gaps.', descRu: 'Предлагает области для исследований на базе пробелов.' },
    { id: 'k111', labelEn: 'k111: Sentiment & Intent Analysis', labelRu: 'k111: Анализ чувств и намерений', descEn: 'Understands the underlying tone and goal of information.', descRu: 'Понимание тона и целей информации.' },
    { id: 'k112', labelEn: 'k112: Zero-Shot Domain Adaptation', labelRu: 'k112: Zero-Shot адаптация', descEn: 'Instantly learns to work with completely new domains.', descRu: 'Мгновенное обучение работе с новыми доменами.' },
    { id: 'k113', labelEn: 'k113: Privacy-Preserving Extraction', labelRu: 'k113: Приватное извлечение', descEn: 'Extracts knowledge without exposing sensitive personal data.', descRu: 'Извлечение знаний без раскрытия личных данных.' },
    { id: 'k114', labelEn: 'k114: Real-Time Stream Enrichment', labelRu: 'k114: Обогащение потока', descEn: 'Adds context to incoming data streams in real-time.', descRu: 'Добавление контекста во входящие данные в реальном времени.' },
    { id: 'k115', labelEn: 'k115: Neural Note-Taking Assistant', labelRu: 'k115: Нейро-заметки', descEn: 'Captures and organizes thoughts automatically.', descRu: 'Автоматический захват и организация мыслей.' },
    { id: 'k116', labelEn: 'k116: Conflict Resolution Swarm', labelRu: 'k116: Разрешение конфликтов', descEn: 'Resolves contradictory information via logic trees.', descRu: 'Разрешение противоречий через деревья логики.' },
    { id: 'k117', labelEn: 'k117: Personalized Learning Pathway', labelRu: 'k117: Индивидуальное обучение', descEn: 'Creates a custom syllabus for any topic.', descRu: 'Создает индивидуальный план обучения по любой теме.' },
    { id: 'k118', labelEn: 'k118: Automated Wiki-Synthesizer', labelRu: 'k118: Авто-Вики синтезатор', descEn: 'Builds a complete encyclopedia on any niche subject.', descRu: 'Создает энциклопедию по любой узкой теме.' },
    { id: 'k119', labelEn: 'k119: Source Integrity Scoring', labelRu: 'k119: Рейтинг надежности', descEn: 'Ranks sources based on accuracy, bias, and history.', descRu: 'Рейтинг источников по точности и истории.' },
    { id: 'k120', labelEn: 'k120: Final Knowledge Guardian', labelRu: 'k120: Финальный страж знаний', descEn: 'Long-term preservation and security of the core database.', descRu: 'Долгосрочное сохранение и защита основной базы.' },
    // Premium 2026 Additions
    { id: 'k121', labelEn: 'k121: Semantic Drift Tracker', labelRu: 'k121: Трекер семантического дрейфа', descEn: 'Detects when words change meaning across chronological boundaries.', descRu: 'Обнаруживает изменение значений слов во времени.' },
    { id: 'k122', labelEn: 'k122: Dark-Data Mining Probe', labelRu: 'k122: Зонд скрытых данных', descEn: 'Locates unindexed academic research and classified patterns.', descRu: 'Ищет неиндексированные исследования и закрытые паттерны.' },
    { id: 'k123', labelEn: 'k123: Neuro-Syllabus Constructor', labelRu: 'k123: Конструктор нейро-планов', descEn: 'Generates bespoke modules for super-learning complex concepts.', descRu: 'Создает учебные планы быстрого освоения сложных тем.' },
    { id: 'k124', labelEn: 'k124: Synaptic Memory Anchor', labelRu: 'k124: Синаптический якорь памяти', descEn: 'Optimizes spaced repetition based on cognitive metrics.', descRu: 'Интервальное повторение по когнитивной метрике.' },
    { id: 'k125', labelEn: 'k125: Epistemic Certainty Auditor', labelRu: 'k125: Аудитор эпистемической верности', descEn: 'Calculates structural truth probability for any research.', descRu: 'Оценка вероятности истинности любого исследования.' }
  ];

  const startKnowledgeSwarmSync = () => {
    if (swarmActive) return;
    setSwarmActive(true);
    setSimulationLogs([]);
    playBeep(1000, 0.15);
    addTerminalLog('INITIATING QUANTUM KNOWLEDGE SYNC SWARM...');

    const logSteps = [
      { delay: 300, msg: '🕷️ [SEMANTIC CRAWLER] -> Penetrating information layers. Scraping latent nodes.', activeAgentIndex: 0 },
      { delay: 900, msg: '🕷️ [SEMANTIC CRAWLER] -> Concept manifold identified. Structure: RECURSIVE.', activeAgentIndex: 0 },
      { delay: 1600, msg: '⚖️ [LOGIC VALIDATOR] -> Auditing structural integrity. No fallacies detected.', activeAgentIndex: 1 },
      { delay: 2200, msg: '⚖️ [LOGIC VALIDATOR] -> Truth-sync completed. Reliability score: 99.4%.', activeAgentIndex: 1 },
      { delay: 2900, msg: '🧪 [CONCEPT SYNTHESIZER] -> Distilling core insights. Fusing disparate nodes.', activeAgentIndex: 2 },
      { delay: 3500, msg: '🧪 [CONCEPT SYNTHESIZER] -> New knowledge architecture stabilized.', activeAgentIndex: 2 },
      { delay: 4200, msg: '🛡️ [BIAS NEUTRALIZER] -> Sanitizing data. Subjectivity skew neutralized.', activeAgentIndex: 3 },
      { delay: 4800, msg: '🛡️ [BIAS NEUTRALIZER] -> Objective integrity secured. Ethics check: PASSED.', activeAgentIndex: 3 },
      { delay: 5500, msg: '🕸️ [CONTEXT WEAVER] -> Binding concepts to user intent. Final mesh ready.', activeAgentIndex: 4 }
    ];

    logSteps.forEach((step, idx) => {
      const tId = setTimeout(() => {
        setAgents(prev => prev.map((agent, aIdx) => ({
          ...agent,
          active: aIdx === step.activeAgentIndex,
          status: aIdx === step.activeAgentIndex ? 'PROCESSING' : 'SYNCHRONIZED'
        })));
        setSimulationLogs(prev => [...prev, step.msg]);
        addTerminalLog(step.msg);
        playBeep(900 + (idx * 35), 0.05);

        if (idx === logSteps.length - 1) {
          setSwarmActive(false);
          setAgents(prev => prev.map(a => ({ ...a, active: false, status: 'READY' })));
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
    const tool = advancedKnowledgeTools[index];
    playBeep(1150, 0.1);
    addTerminalLog(`CALIBRATING KNOWLEDGE MODULE: ${tool.title.toUpperCase()}`);
    addTerminalLog(tool.log);

    const tId = setTimeout(() => {
      setCalibratingTool(null);
      playBeep(1450, 0.08);
      addTerminalLog(`[SUCCESS] "${tool.title.toUpperCase()}" KNOWLEDGE MODULE ONLINE.`);
    }, 1500);
    timeoutRefs.current.push(tId);
  };

  const toggleFunction = (id: string) => {
    setSuiteFunctions(prev => {
      const state = !prev[id];
      playBeep(state ? 1250 : 650, 0.05);
      addTerminalLog(`KNOWLEDGE KERNEL OVERRIDE: ${id.toUpperCase()} is ${state ? 'ENABLED' : 'DISABLED'}`);
      return { ...prev, [id]: state };
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Orchestrator Card */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-emerald-900/40 p-5 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-mono tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-sky-400 flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-400 animate-pulse" />
            {t('QUANTUM KNOWLEDGE HUB ORCHESTRATOR', 'КВАНТОВЫЙ ОРКЕСТРАТОР ЗНАНИЙ')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-mono mt-1">
            {t('Autonomous Multi-Agent Intelligence Engine & Semantic Console 2026', 'Автономный интеллект-движок и семантическая консоль 2026')}
          </p>
        </div>
        <button 
          onClick={startKnowledgeSwarmSync}
          disabled={swarmActive}
          className={`px-5 py-2.5 text-[10px] font-mono uppercase font-bold rounded-xl tracking-wider flex items-center gap-2 transition-all ${
            swarmActive ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
          }`}
        >
          {swarmActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {swarmActive ? t('SYNCHRONIZING...', 'СИНХРОНИЗАЦИЯ...') : t('ENGAGE INTELLIGENCE SWARM', 'ЗАПУСТИТЬ ОРКЕСТРАТОР')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Agents List */}
        <div className="lg:col-span-4 bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Workflow className="w-3.5 h-3.5" /> {t('COGNITIVE DATA AGENTS', 'КОГНИТИВНЫЕ АГЕНТЫ ДАННЫХ')}
          </div>
          {agents.map((a, i) => (
            <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${a.active ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.active ? 'bg-indigo-400 animate-ping' : 'bg-zinc-600'}`} />
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
          <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Binary className="w-3.5 h-3.5" /> {t('LIVE SEMANTIC STREAM', 'ЖИВОЙ СЕМАНТИЧЕСКИЙ ПОТОК')}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 flex flex-col gap-1.5 mt-3 pr-2 custom-scrollbar">
            {simulationLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                <span>{t('Orchestrator idle. Waiting for data sync.', 'Оркестратор в режиме ожидания.')}</span>
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
          <GraduationCap className="w-4 h-4" /> {t('TOP 10 ADVANCED 2026 KNOWLEDGE INSTRUMENTS', 'ТОП-10 ИНСТРУМЕНТОВ ЗДОРОВЬЯ 2026')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedKnowledgeTools.map((tool, i) => (
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
                {calibratingTool === i ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                {calibratingTool === i ? t('Calibrating...', 'Калибровка...') : tool.actionText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Functions Grid */}
      <div>
        <div className="text-[11px] font-mono uppercase text-emerald-400 font-bold mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> {t('TOP 25 ADVANCED 2026 KNOWLEDGE FUNCTIONS', 'ТОП-25 ПЕРЕДОВЫХ ФУНКЦИЙ ЗНАНИЙ 2026')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {advancedKnowledgeFunctions.map((f) => {
            const active = suiteFunctions[f.id] || false;
            return (
              <div 
                key={f.id}
                onClick={() => toggleFunction(f.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-[110px] ${
                  active ? 'bg-emerald-600/10 border-emerald-500/40 shadow-inner' : 'bg-black/40 border-white/5 hover:border-emerald-500/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-bold font-mono uppercase ${active ? 'text-emerald-300' : 'text-zinc-300'}`}>{language === 'en' ? f.labelEn : f.labelRu}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
                </div>
                <p className="text-[8px] font-mono text-zinc-500 mt-1 leading-snug">{language === 'en' ? f.descEn : f.descRu}</p>
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-2">
                  <span className="text-[7px] font-mono text-zinc-600">KERNEL STATE</span>
                  <span className={`text-[8px] font-mono font-bold ${active ? 'text-emerald-400' : 'text-zinc-600'}`}>{active ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
