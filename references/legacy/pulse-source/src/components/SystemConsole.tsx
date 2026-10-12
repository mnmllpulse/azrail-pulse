import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Settings, 
  Activity, 
  RefreshCw, 
  X, 
  Search, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Server, 
  Layers, 
  Brain,
  Wifi,
  Database
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

interface SystemConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'AZRAIL';
  module: 'L1_VOLATILE' | 'L2_EPISODIC' | 'L3_SEMANTIC' | 'L4_KNOWLEDGE' | 'L5_SYSTEM' | 'METATRON' | 'GEMINI_AI';
  messageEn: string;
  messageRu: string;
}

const MODULES = [
  'L1_VOLATILE',
  'L2_EPISODIC',
  'L3_SEMANTIC',
  'L4_KNOWLEDGE',
  'L5_SYSTEM',
  'METATRON',
  'GEMINI_AI'
] as const;

const TEMPLATE_LOGS: Omit<DiagnosticLog, 'id' | 'timestamp'>[] = [
  {
    level: 'INFO',
    module: 'L1_VOLATILE',
    messageEn: 'Garbage collector initiated. Pruned 14 dead context synapses from active RAM.',
    messageRu: 'Запущен сборщик мусора. Очищено 14 неактивных синапсов контекста из активной памяти.'
  },
  {
    level: 'SUCCESS',
    module: 'L2_EPISODIC',
    messageEn: 'Episodic database integrity check complete. 0 corrupted blocks detected.',
    messageRu: 'Проверка целостности эпизодической базы данных завершена. Поврежденных блоков не обнаружено.'
  },
  {
    level: 'AZRAIL',
    module: 'GEMINI_AI',
    messageEn: 'Core intelligence engine response proxy established under 124ms.',
    messageRu: 'Прокси-ответ ядра искусственного интеллекта установлен за 124 мс.'
  },
  {
    level: 'WARN',
    module: 'L5_SYSTEM',
    messageEn: 'Memory core warmth threshold reached 44.2°C. Dynamic cooling pipeline active.',
    messageRu: 'Температурный порог памяти достиг 44.2°C. Конвейер динамического охлаждения активен.'
  },
  {
    level: 'INFO',
    module: 'L3_SEMANTIC',
    messageEn: 'Recalculating K-Nearest-Neighbor (KNN) vector embeddings for semantic search index.',
    messageRu: 'Пересчет векторных представлений KNN для семантического поискового индекса.'
  },
  {
    level: 'ERROR',
    module: 'METATRON',
    messageEn: 'Port 3001 daemon experienced jitter during socket handshake. Auto-realigning frequency.',
    messageRu: 'В демоне порта 3001 зафиксирован джиттер во время сопряжения сокетов. Автоподстройка частоты.'
  },
  {
    level: 'SUCCESS',
    module: 'L4_KNOWLEDGE',
    messageEn: 'Loaded core system specifications and neural model temperatures into L4 cache.',
    messageRu: 'Спецификации ядра системы и температура нейромодели загружены в кэш L4.'
  },
  {
    level: 'AZRAIL',
    module: 'L2_EPISODIC',
    messageEn: 'Synthesizing episodic memories for the user sequence. Token compression factor: 1.4x.',
    messageRu: 'Синтез эпизодических воспоминаний для пользовательской сессии. Сжатие токенов: 1.4x.'
  }
];

export function SystemConsole({ isOpen, onClose, isLight = false }: SystemConsoleProps) {
  const { playHover, playActivation } = useAudio();
  const { triggerDiagnostics, activeShader } = useSystemState();
  const { language } = useLanguage();

  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'AZRAIL'>('ALL');
  
  // Integrity Sweep state
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [sweepStage, setSweepStage] = useState('');

  // Memory gauges
  const [memoryUsage, setMemoryUsage] = useState({
    L1: 42,
    L2: 78,
    L3: 54,
    L4: 91,
    L5: 35
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial seed logs
  useEffect(() => {
    const seed: DiagnosticLog[] = [];
    const now = Date.now();
    for (let i = 0; i < 15; i++) {
      const template = TEMPLATE_LOGS[Math.floor(Math.random() * TEMPLATE_LOGS.length)];
      seed.push({
        id: `${now - (15 - i) * 5000}`,
        timestamp: new Date(now - (15 - i) * 5000).toISOString(),
        ...template
      });
    }
    setLogs(seed);
  }, []);

  // Live log simulation on interval
  useEffect(() => {
    if (!isPlaying || isSweeping) return;

    const interval = setInterval(() => {
      const template = TEMPLATE_LOGS[Math.floor(Math.random() * TEMPLATE_LOGS.length)];
      const newLog: DiagnosticLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...template
      };

      setLogs(prev => {
        const next = [...prev, newLog];
        // Keep last 150 logs for performance
        if (next.length > 150) next.shift();
        return next;
      });

      // Update memory usage gauges slightly
      setMemoryUsage(prev => ({
        L1: Math.min(100, Math.max(10, prev.L1 + Math.floor(Math.random() * 7) - 3)),
        L2: Math.min(100, Math.max(10, prev.L2 + Math.floor(Math.random() * 5) - 2)),
        L3: Math.min(100, Math.max(10, prev.L3 + Math.floor(Math.random() * 5) - 2)),
        L4: Math.min(100, Math.max(10, prev.L4 + Math.floor(Math.random() * 3) - 1)),
        L5: Math.min(100, Math.max(10, prev.L5 + Math.floor(Math.random() * 3) - 1))
      }));
    }, 1800);

    return () => clearInterval(interval);
  }, [isPlaying, isSweeping]);

  // Autoscroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle diagnostics cascade sweep
  const handleStartSweep = () => {
    playActivation();
    setIsSweeping(true);
    setSweepProgress(0);
    setSweepStage('Initiating synapse handshake...');

    const stages = [
      { progress: 15, stageEn: 'Locking episodic memory write buffers...', stageRu: 'Блокировка буферов записи эпизодической памяти...' },
      { progress: 35, stageEn: 'Scanning L1 volatile segments for leaky nodes...', stageRu: 'Сканирование сегментов L1 на утечки синапсов...' },
      { progress: 55, stageEn: 'Rebuilding vector tree structures in L3 Semantic Core...', stageRu: 'Перестроение структур векторных деревьев в семантическом ядре L3...' },
      { progress: 75, stageEn: 'Cross-verifying DNS pointers & Cloud Run health indices...', stageRu: 'Проверка указателей DNS и показателей работоспособности Cloud Run...' },
      { progress: 90, stageEn: 'Synchronizing uploads/feedback.json with telemetry registers...', stageRu: 'Синхронизация uploads/feedback.json с регистрами телеметрии...' },
      { progress: 100, stageEn: 'Core diagnostics successfully compiled.', stageRu: 'Диагностика ядра успешно скомпилирована.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep >= stages.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsSweeping(false);
          triggerDiagnostics(); // Trigger system state diagnostics too!
          toast.success(language === 'en' ? 'Diagnostics integrity sweep: 100% SECURE' : 'Инспекция целостности диагностики: 100% БЕЗОПАСНО');
        }, 600);
        return;
      }

      const step = stages[currentStep];
      setSweepProgress(step.progress);
      setSweepStage(language === 'en' ? step.stageEn : step.stageRu);

      // Append sweep log to list
      const sweepLog: DiagnosticLog = {
        id: `sweep-${Date.now()}-${currentStep}`,
        timestamp: new Date().toISOString(),
        level: 'AZRAIL',
        module: 'L5_SYSTEM',
        messageEn: `[SWEEP] ${step.stageEn}`,
        messageRu: `[ТЕСТ] ${step.stageRu}`
      };

      setLogs(prev => [...prev, sweepLog]);
      currentStep++;
    }, 900);
  };

  const handleClearLogs = () => {
    playActivation();
    setLogs([]);
    toast.success(language === 'en' ? 'Diagnostic console buffer cleared.' : 'Буфер консоли диагностики очищен.');
  };

  const handleExportLogs = () => {
    playActivation();
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    const content = logs.map(l => `[${l.timestamp}] [${l.level}] [${l.module}] EN: ${l.messageEn} | RU: ${l.messageRu}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azrail-diagnostics-${new Date().toISOString().replace(/:/g, '-')}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(language === 'en' ? 'Exported diagnostic logs successfully.' : 'Логи диагностики успешно экспортированы.');
  };

  // Filtered logs list
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const levelMatch = selectedLevel === 'ALL' || log.level === selectedLevel;
      const searchStr = searchQuery.toLowerCase();
      const contentMatch = 
        log.messageEn.toLowerCase().includes(searchStr) || 
        log.messageRu.toLowerCase().includes(searchStr) || 
        log.module.toLowerCase().includes(searchStr) || 
        log.level.toLowerCase().includes(searchStr);
      return levelMatch && contentMatch;
    });
  }, [logs, selectedLevel, searchQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs"
          />

          {/* Bottom Terminal Drawer Component */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 180 }}
            className={`fixed bottom-0 left-0 right-0 z-[101] h-[58vh] max-h-[580px] min-h-[400px] border-t flex flex-col overflow-hidden shadow-2xl select-none font-mono ${
              isLight 
                ? 'bg-[#F9FAFB]/95 border-zinc-200 text-zinc-900 shadow-xl' 
                : 'bg-[#06040C]/95 border-purple-900/30 text-zinc-200'
            }`}
          >
            {/* Console Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-zinc-100/90 border-zinc-200' : 'bg-[#090614] border-white/5'
            }`}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <div className={`p-1.5 rounded-lg ${isLight ? 'bg-zinc-200 text-zinc-800' : 'bg-white/5 text-cyan-400'}`}>
                    <Terminal className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Azrail Diagnostic Terminal</h2>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-white/5 text-zinc-500'}`}>
                      DAEMON: CORE_PULSE_V3
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    {language === 'en' ? 'Real-time cognitive diagnostics stream' : 'Поток когнитивной диагностики ядра в реальном времени'}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                {/* Play/Pause Stream */}
                <button
                  onClick={() => {
                    playActivation();
                    setIsPlaying(prev => !prev);
                  }}
                  onMouseEnter={() => playHover()}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                    isLight 
                      ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100' 
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                  title={isPlaying ? "Pause Stream" : "Resume Stream"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
                </button>

                {/* Sweep Integrity Action */}
                <button
                  onClick={handleStartSweep}
                  disabled={isSweeping}
                  onMouseEnter={() => playHover()}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold tracking-wider ${
                    isSweeping
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'
                      : isLight 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 shadow-sm' 
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                  }`}
                  title="Run Full System Integrity Sweep"
                >
                  <Activity className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSweeping ? 'Sweeping...' : 'Integrity Sweep'}</span>
                </button>

                {/* Export Log */}
                <button
                  onClick={handleExportLogs}
                  onMouseEnter={() => playHover()}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                    isLight 
                      ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100' 
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                  title="Export diagnostics log file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Clear console buffer */}
                <button
                  onClick={handleClearLogs}
                  onMouseEnter={() => playHover()}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                    isLight 
                      ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100' 
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                  title="Clear Console Stream Buffer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  onMouseEnter={() => playHover()}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ml-2 ${
                    isLight 
                      ? 'bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300' 
                      : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-Header: Search bar, Level selectors, live Gauges */}
            <div className={`px-6 py-3 border-b flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shrink-0 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#07050F] border-white/[0.03]'
            }`}>
              
              {/* Level select & Search filter */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Level tags */}
                <div className="flex rounded-lg border border-white/5 overflow-hidden p-0.5 bg-black/20 text-[9px]">
                  {(['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS', 'AZRAIL'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => {
                        playActivation();
                        setSelectedLevel(lvl);
                      }}
                      className={`px-2 py-1 rounded transition-colors cursor-pointer font-bold ${
                        selectedLevel === lvl
                          ? isLight
                            ? 'bg-zinc-800 text-white'
                            : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/20'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3 h-3 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'en' ? 'Filter core synapses...' : 'Фильтр синапсов ядра...'}
                    className={`pl-8 pr-3 py-1 text-[10px] w-48 border rounded-lg focus:outline-none ${
                      isLight 
                        ? 'bg-white border-zinc-200 text-zinc-900 focus:border-indigo-500' 
                        : 'bg-black/30 border-white/5 text-zinc-100 placeholder-zinc-600 focus:border-indigo-500/50'
                    }`}
                  />
                </div>
              </div>

              {/* Memory Level Progress Gauges */}
              <div className="flex items-center gap-4 text-[9px] overflow-x-auto py-1">
                <span className="text-zinc-500 font-bold shrink-0 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Core Levels:
                </span>
                {(['L1', 'L2', 'L3', 'L4', 'L5'] as const).map(lvl => {
                  const val = memoryUsage[lvl];
                  const barColor = val > 85 ? 'bg-red-500' : val > 65 ? 'bg-amber-500' : 'bg-cyan-500';
                  return (
                    <div key={lvl} className="flex items-center gap-1.5 shrink-0" title={`${lvl} Cache usage: ${val}%`}>
                      <span className="text-zinc-400 font-bold">{lvl}:</span>
                      <div className="w-12 h-1.5 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${val}%` }} />
                      </div>
                      <span className="text-[8px] text-zinc-500 w-6 text-right font-mono">{val}%</span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Main Terminal Output Content Area */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
              
              {/* Core Terminal Output logs */}
              <div className="flex-1 min-h-0 flex flex-col relative">
                {/* Sweeping Overlay */}
                <AnimatePresence>
                  {isSweeping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 ${
                        isLight ? 'bg-white/95' : 'bg-[#06040C]/95'
                      }`}
                    >
                      <div className="text-center space-y-2 max-w-sm px-4">
                        <Cpu className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                          Integrity Sweep In Progress
                        </h3>
                        <p className="text-[10px] text-zinc-500 uppercase animate-pulse">
                          {sweepStage}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-64 h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                          style={{ width: `${sweepProgress}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">{sweepProgress}% COMPLETE</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Logs list scroll area */}
                <div 
                  ref={scrollRef}
                  className={`flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar ${
                    isLight ? 'bg-zinc-50' : 'bg-black/30'
                  }`}
                >
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map(log => {
                      const levelColors = {
                        INFO: 'text-zinc-400',
                        WARN: 'text-amber-400 bg-amber-500/5 px-1 py-0.5 rounded border border-amber-500/10',
                        ERROR: 'text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 font-bold',
                        SUCCESS: 'text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10',
                        AZRAIL: 'text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-extrabold'
                      };

                      const moduleColors = {
                        L1_VOLATILE: 'text-orange-400',
                        L2_EPISODIC: 'text-indigo-400',
                        L3_SEMANTIC: 'text-cyan-400',
                        L4_KNOWLEDGE: 'text-teal-400',
                        L5_SYSTEM: 'text-purple-400',
                        METATRON: 'text-blue-400',
                        GEMINI_AI: 'text-pink-400'
                      };

                      return (
                        <div key={log.id} className="text-[10px] flex items-start gap-2.5 hover:bg-white/[0.02] p-1 rounded transition-colors group">
                          {/* Log Timestamp */}
                          <span className="text-zinc-500 select-none font-mono text-[9px] shrink-0 mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                          </span>

                          {/* Level stamp */}
                          <span className={`text-[8px] font-mono font-extrabold tracking-wider uppercase shrink-0 mt-0.5 w-14 text-center ${levelColors[log.level]}`}>
                            {log.level}
                          </span>

                          {/* Module origin stamp */}
                          <span className={`text-[8px] font-mono uppercase tracking-wider shrink-0 mt-0.5 w-20 truncate border-r border-white/5 pr-1.5 text-right font-bold ${moduleColors[log.module]}`}>
                            {log.module}
                          </span>

                          {/* Log Message Content */}
                          <p className="text-xs text-zinc-300 leading-normal break-all font-mono">
                            {language === 'en' ? log.messageEn : log.messageRu}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
                      <Terminal className="w-8 h-8 opacity-25" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Console Buffer Empty</span>
                      <span className="text-[9px] opacity-60 uppercase">No telemetry matching query filters.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Side panel statistics pane */}
              <div className={`w-full md:w-56 p-4 border-t md:border-t-0 md:border-l flex flex-col justify-between shrink-0 ${
                isLight ? 'bg-zinc-100/50 border-zinc-200' : 'bg-black/40 border-white/[0.03]'
              }`}>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 border-b border-white/5 pb-1">
                    Core Metrics
                  </h3>

                  <div className="space-y-3 font-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">DAEMON PORT</span>
                      <span className="text-zinc-300">3000 / 3001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">ACTIVE SHADER</span>
                      <span className="text-cyan-400 font-bold uppercase">{activeShader}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">MEMORY RETENTION</span>
                      <span className="text-emerald-400">99.8% INF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">DIAGNOSTICS</span>
                      <span className="text-emerald-400">STABLE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">LATENCY JITTER</span>
                      <span className="text-zinc-400">0.02ms</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase tracking-widest">
                    <Database className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>File DB Register</span>
                  </div>
                  <div className={`p-2 rounded-lg text-[8px] leading-relaxed text-zinc-400 ${
                    isLight ? 'bg-zinc-200/50' : 'bg-[#0A0716]'
                  }`}>
                    uploads/feedback.json <br />
                    Connected via localized Node state engine.
                  </div>
                </div>
              </div>

            </div>

            {/* Console Footer */}
            <div className={`px-6 py-2 border-t flex justify-between items-center text-[8px] text-zinc-500 uppercase tracking-wider shrink-0 ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#090614] border-white/5'
            }`}>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5 text-emerald-500 animate-pulse" /> SYSTEM LINK ACTIVE
                </span>
                <span>SECURE PROXY INTEGRATED</span>
              </div>
              <div className="flex gap-4">
                <span>BUFFER: {logs.length} ITEMS</span>
                <span>ESC / CLICK OUTSIDE TO CLOSE</span>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
