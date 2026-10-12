import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, Sliders, Cpu, Activity, Zap, RefreshCw, 
  Download, Globe, Database, ToggleLeft, ToggleRight,
  Sun, Moon, Leaf, Monitor, Eye, Trash2, Check, Sparkles,
  Layers, ChevronRight, Fingerprint, Waves, Key, Lock, Settings, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { useAudio } from '../contexts/AudioContext';
import { PlanetCanvas } from './PlanetCanvas';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  onAction: (action: string) => void;
}

export default function AdminPanel({ isOpen, onClose, isLight, onAction }: AdminPanelProps) {
  const { language, t } = useLanguage();
  const { triggerDiagnostics, triggerPulseWave } = useSystemState();
  const audio = useAudio();
  const [activeTab, setActiveTab] = useState<'cockpit' | 'neural' | 'tactile' | 'inclusive' | 'architecture' | 'engineering' | 'security' | 'devops'>('cockpit');

  // Interactive local states for Part 4 & 5
  const [ecoMode, setEcoMode] = useState(false);
  const [frameRateCap, setFrameRateCap] = useState<'auto' | '30' | '60' | '120'>('auto');
  const [localAIProfile, setLocalAIProfile] = useState<'eco' | 'balanced' | 'perf'>('balanced');
  const [zeroKnowledge, setZeroKnowledge] = useState(true);
  const [ambientLight, setAmbientLight] = useState(120); // Simulated Lux
  const [activeModel, setActiveModel] = useState<string>('gemma-2b');
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [isDownloadingUpdates, setIsDownloadingUpdates] = useState(false);
  const [hybridMode, setHybridMode] = useState<'cloud' | 'local' | 'hybrid'>('hybrid');
  const [widgetsEnabled, setWidgetsEnabled] = useState({
    telemetry: true,
    activity: true,
    nodes: true,
    clock: true
  });

  // Part 6 & 7 & 8 Local States
  const [simplifiedText, setSimplifiedText] = useState(false);
  const [minimizedUI, setMinimizedUI] = useState(false);
  const [isRebuildingNav, setIsRebuildingNav] = useState(false);
  
  const [aiTone, setAITone] = useState<'formal' | 'friendly' | 'concise'>('concise');
  const [contextAwareness, setContextAwareness] = useState(false);
  
  const [spatialPlates, setSpatialPlates] = useState(false);
  const [p2pSync, setP2pSync] = useState(false);

  // Part 9 & 10 Local States (Deep Engineering & Crypto)
  const [wasmIsolation, setWasmIsolation] = useState(true);
  const [workerStrategy, setWorkerStrategy] = useState<'cache-first' | 'network-first' | 'bypass'>('cache-first');
  const [hardwarePriority, setHardwarePriority] = useState<'npu' | 'gpu' | 'cpu'>('npu');
  
  const [quantumCrypto, setQuantumCrypto] = useState(true);
  const [biometricEnclave, setBiometricEnclave] = useState(true);
  const [zeroTrustNetwork, setZeroTrustNetwork] = useState(true);

  // DevOps States
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployPhase, setDeployPhase] = useState<'idle' | 'started' | 'starting' | 'edge' | 'impacting'>('idle');
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([
    'SYSTEM READY',
    'AWAITING DEPLOYMENT COMMAND'
  ]);

  // Haptic feedback simulation trigger
  const [simulatedVibe, setSimulatedVibe] = useState<'success' | 'error' | 'scroll' | null>(null);

  // Parallax Hover Ref & Coordinates
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 10;
    const y = (e.clientY - rect.top - rect.height / 2) / 10;
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setCoords({ x: 0, y: 0 });
  };

  // Trigger simulated vibration
const triggerSimulatedHaptic = (type: 'success' | 'error' | 'scroll') => {
    setSimulatedVibe(type);
    if (type === 'success') {
      if (audio?.playSuccess) audio.playSuccess();
      toast.success('Haptic simulated: Double soft pulse (Success)');
    } else if (type === 'error') {
      if (audio?.playError) audio.playError();
      toast.error('Haptic simulated: Single heavy vibration (Error)');
    } else {
      if (audio?.playActivation) audio.playActivation();
      toast.info('Haptic simulated: Light tick (Scroll feel)');
    }
    setTimeout(() => setSimulatedVibe(null), 500);
  };

  // Rebuild Index Action
  const handleRebuildIndex = () => {
    setIsRebuildingIndex(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2500)),
      {
        loading: 'Rebuilding local neural vector database (Zero-Knowledge indices)...',
        success: 'Local vector database indices successfully rebuilt and optimized!',
        error: 'Failed to optimize index',
      }
    );
    setTimeout(() => setIsRebuildingIndex(false), 2500);
  };

  // Download Model Weight Updates
  const handleDownloadUpdates = () => {
    setIsDownloadingUpdates(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 3000)),
      {
        loading: 'Checking local model SHA hashes & downloading cognitive weights (840 MB)...',
        success: 'Neural update complete: Weights for local models are fully up-to-date!',
        error: 'Update failed',
      }
    );
    setTimeout(() => setIsDownloadingUpdates(false), 3000);
  };

  // Export Local Archive
  const handleExportArchive = () => {
    const backupData = {
      manifest: 'DARK MNMLL PULSE OS INTEGRITY ARCHIVE',
      timestamp: new Date().toISOString(),
      encryption: 'System-Key Local AES-256 GCM',
      data: {
        zeroKnowledgeState: zeroKnowledge,
        localAIProfile,
        ecoMode,
        widgetsEnabled,
        ambientLux: ambientLight,
        modelLoaded: activeModel
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mnmll_pulse_encrypted_backup_${Date.now()}.json`;
    a.click();
    toast.success('Zero-knowledge local archive backup downloaded successfully!');
  };

  // Rebuild Nav Action
  const handleRebuildNav = () => {
    setIsRebuildingNav(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'AI analyzing user behavior and rebuilding navigation layout...',
        success: 'Navigation hierarchy hyper-personalized successfully!',
        error: 'Failed to rebuild navigation',
      }
    );
    setTimeout(() => setIsRebuildingNav(false), 2000);
  };

  // Live Nodes Coordinate list for Map
  const mapNodes = [
    { x: '25%', y: '40%', name: 'North America Edge' },
    { x: '45%', y: '35%', name: 'Europe Hub' },
    { x: '70%', y: '42%', name: 'Asia Gateway' },
    { x: '35%', y: '68%', name: 'South America Node' },
    { x: '55%', y: '72%', name: 'Africa Core' },
    { x: '82%', y: '65%', name: 'Australia Relay' },
  ];

  // Dynamic Theme state based on ambient light
  const ambientThemeName = ambientLight < 50 ? 'OLED Ultra Dark' : ambientLight > 500 ? 'Solar Light Accent' : 'Standard Cosmic Slate';

  // English & Russian Translation Object
  const isRu = language === 'ru';
  const labels = {
    title: isRu ? 'ТЕМНАЯ MNMLL PULSE OC' : 'DARK MNMLL PULSE OS',
    subtitle: isRu ? 'Интеллект, Двигающий Планету.' : 'Intelligence that moves the planet.',
    sloganLeft: isRu ? 'АРХИТЕКТУРНАЯ СПЕЦИФИКАЦИЯ' : 'ARCHITECTURE SPECIFICATION',
    edition: isRu ? 'ИЗДАНИЕ 2026' : 'EDITION 2026',
    tabCockpit: isRu ? 'Панель Управления' : 'OS Cockpit',
    tabNeural: isRu ? 'ИИ и Оптимизация' : 'AI Neural & OS',
    tabTactile: isRu ? 'Тактильный Тест' : 'Tactile & Springs',
    tabInclusive: isRu ? 'Инклюзивность' : 'Inclusive AI',
    tabArch: isRu ? 'Архитектура (XR)' : 'Architecture & XR',
    tabEng: isRu ? 'Ядро ОС' : 'OS Kernel & HW',
    tabSec: isRu ? 'Криптография' : 'Quantum Crypto',
    tabDevops: isRu ? 'DevOps CI/CD' : 'DevOps CI/CD',
    statusOnline: isRu ? 'СТАТУС СИСТЕМЫ • ОНЛАЙН' : 'SYSTEM STATUS • ONLINE',
    coreLoad: isRu ? 'ЯДРО AZRAIL - Central Intelligence' : 'CORE AZRAIL - Central Intelligence',
    hybridIntel: isRu ? 'ГИБРИДНЫЙ ИНТЕЛЛЕКТ' : 'HYBRID INTELLIGENCE',
    cloud: isRu ? 'Облако' : 'Cloud',
    local: isRu ? 'Локальный ИИ' : 'Local AI',
    globalNetwork: isRu ? 'ГЛОБАЛЬНАЯ СЕТЬ • 56 АКТИВНЫХ УЗЛОВ' : 'GLOBAL NETWORK • 56 ACTIVE NODES',
    platformOverview: isRu ? 'ОБЗОР ПЛАТФОРМЫ' : 'PLATFORM OVERVIEW',
    overviewText: isRu ? 'Dark MNMLL Pulse OS — это операционная система искусственного интеллекта нового поколения, объединяющая периферийные векторные нейросети, гибридные облачные транзакции и микро-секундный тактильный отклик в единый бесшовный интерфейс.' : 'Dark MNMLL Pulse OS is a next-generation AI operating system, unifying edge neural vectors, hybrid cloud transactions, and micro-second haptic responses into a single seamless, low-latency interface.',
    architectureTitle: isRu ? 'АРХИТЕКТУРА ПЛАТФОРМЫ' : 'PLATFORM ARCHITECTURE',
    badge1: isRu ? '18 БАЗОВЫХ МОДУЛЕЙ' : '18 CORE MODULES',
    badge2: isRu ? '100+ МОДЕЛЕЙ ИИ' : '100+ AI MODELS',
    badge3: isRu ? '∞ ВОЗМОЖНОСТЕЙ' : '∞ CAPABILITIES',
    badge4: isRu ? '24/7 СВЯЗЬ' : '24/7 INTERNET',
    inputLayer: isRu ? 'ВХОДНОЙ СЛОЙ' : 'INPUT LAYER',
    coreEngine: isRu ? 'БАЗОВЫЙ ДВИЖОК' : 'CORE ENGINE',
    processingLayer: isRu ? 'ПРОЦЕССНЫЙ СЛОЙ' : 'PROCESSING LAYER',
    outputLayer: isRu ? 'ВЫХОДНОЙ СЛОЙ' : 'OUTPUT LAYER',
    infraCloudflare: isRu ? 'ОБЛАЧНАЯ ИНФРАСТРУКТУРА (CLOUDFLARE)' : 'CLOUD INFRASTRUCTURE (CLOUDFLARE)',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[150] bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-y-auto overflow-x-hidden selection:bg-pulse-primary/40"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(20, 10, 45, 0.4) 0%, rgba(5, 5, 10, 1) 100%)`
          }}
        >
          {/* Subtle Cyber Grid Lines Background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

          {/* Top Control Bar */}
          <header className="border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-[160] shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 bg-pulse-primary/20 rounded-xl border border-pulse-primary/30">
                <Shield className="w-6 h-6 text-pulse-primary animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase block">MNMLLPULSE SYSTEM CONTROL</span>
                <h1 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
                  {labels.title} <span className="text-[9px] bg-pulse-primary/30 text-pulse-accent px-1.5 py-0.5 rounded font-mono font-normal">v2026.4</span>
                </h1>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 shadow-inner gap-1">
              <button
                onClick={() => setActiveTab('cockpit')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'cockpit' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                {labels.tabCockpit}
              </button>
              <button
                onClick={() => setActiveTab('neural')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'neural' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Cpu className="w-3.5 h-3.5" />
                {labels.tabNeural}
              </button>
              <button
                onClick={() => setActiveTab('tactile')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'tactile' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Sliders className="w-3.5 h-3.5" />
                {labels.tabTactile}
              </button>
              <button
                onClick={() => setActiveTab('inclusive')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'inclusive' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Eye className="w-3.5 h-3.5" />
                {labels.tabInclusive}
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'architecture' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                {labels.tabArch}
              </button>
              <button
                onClick={() => setActiveTab('engineering')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'engineering' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Settings className="w-3.5 h-3.5" />
                {labels.tabEng}
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'security' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Key className="w-3.5 h-3.5" />
                {labels.tabSec}
              </button>
              <button
                onClick={() => setActiveTab('devops')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'devops' ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Activity className="w-3.5 h-3.5" />
                {labels.tabDevops}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-300 transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-bold uppercase"
              >
                <X className="w-4 h-4" />
                {isRu ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </header>

          {/* Main Workspace Frame */}
          <main className="flex-1 max-w-[1700px] mx-auto w-full p-6 md:p-8 relative z-10">
            <AnimatePresence mode="wait">
              {/* TAB 1: COCKPIT (100% IMAGE REPLICA VIEW) */}
              {activeTab === 'cockpit' && (
                <motion.div
                  key="cockpit"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 xl:grid-cols-12 gap-8"
                >
                  {/* Left Column (60% equivalent: 7/12 cols) */}
                  <div className="xl:col-span-7 flex flex-col gap-6">
                    {/* Top Architectural Headline */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-4">
                      <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] text-pulse-primary uppercase block">
                          {labels.sloganLeft}
                        </span>
                        <h2 className="text-3xl font-extrabold tracking-tighter mt-1 font-mono uppercase bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
                          {labels.title}
                        </h2>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs bg-white/5 border border-white/10 text-zinc-400 px-2.5 py-1 rounded-md">
                          {labels.edition}
                        </span>
                      </div>
                    </div>

                    {/* Central Rotating breathing Planet Block */}
                    <div className="relative aspect-video xl:aspect-auto xl:h-[450px] rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-center items-center bg-zinc-950/60 shadow-2xl group">
                      {/* Laser Heartbeat Line slicing horizontally */}
                      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pulse-primary/80 to-transparent top-1/2 -translate-y-1/2 z-20 shadow-[0_0_15px_rgba(123,77,255,0.8)] animate-pulse" />

                      {/* Slowly breathing container for rotating planet */}
                      <motion.div
                        animate={{
                          scale: ecoMode ? 1.0 : [0.96, 1.04, 0.96],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 5,
                          ease: "easeInOut"
                        }}
                        className="w-[280px] h-[280px] relative z-10 flex items-center justify-center pointer-events-none"
                      >
                        {!ecoMode ? (
                          <PlanetCanvas />
                        ) : (
                          // Lightweight ECO mode 2D Blueprint Planet
                          <div className="w-56 h-56 rounded-full border-2 border-dashed border-pulse-primary/40 flex items-center justify-center animate-[spin_40s_linear_infinity]">
                            <div className="w-44 h-44 rounded-full border border-zinc-700 flex items-center justify-center">
                              <div className="w-24 h-24 rounded-full border border-zinc-800 flex items-center justify-center">
                                <Globe className="w-12 h-12 text-pulse-primary opacity-50" />
                              </div>
                            </div>
                            {/* Inner Orbit ring */}
                            <div className="absolute w-64 h-20 border border-pulse-primary/30 rounded-full rotate-12" />
                          </div>
                        )}
                      </motion.div>

                      {/* Overlay Brand Logo */}
                      <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col md:flex-row justify-between items-center bg-black/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 gap-2">
                        <div>
                          <span className="text-xs font-mono font-bold tracking-widest text-pulse-accent uppercase block">
                            {labels.title}
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase font-mono">
                            {labels.subtitle}
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                          <span className="text-[9px] bg-pulse-primary/20 text-pulse-accent font-mono px-2 py-0.5 rounded border border-pulse-primary/30">
                            {labels.badge1}
                          </span>
                          <span className="text-[9px] bg-pulse-primary/20 text-pulse-accent font-mono px-2 py-0.5 rounded border border-pulse-primary/30">
                            {labels.badge2}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Platform Overview */}
                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-pulse-primary" />
                      <h3 className="text-xs font-mono font-bold text-pulse-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5" />
                        {labels.platformOverview}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        {labels.overviewText}
                      </p>
                    </div>

                    {/* Platform Architecture Diagram */}
                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5">
                      <h3 className="text-xs font-mono font-bold text-pulse-accent uppercase tracking-widest mb-4">
                        {labels.architectureTitle}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                        {/* Layer 1 */}
                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col justify-between hover:border-pulse-primary/30 transition-all">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">01 / INPUT LAYER</span>
                          <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-300 mt-2 block">{labels.inputLayer}</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">Voice & File streams</span>
                        </div>
                        {/* Layer 2 */}
                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col justify-between hover:border-pulse-primary/30 transition-all">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">02 / CORE ENGINE</span>
                          <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-300 mt-2 block">{labels.coreEngine}</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">Azrail Swarm Mind</span>
                        </div>
                        {/* Layer 3 */}
                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col justify-between hover:border-pulse-primary/30 transition-all">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">03 / COGNITIVE</span>
                          <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-300 mt-2 block">{labels.processingLayer}</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">WebGPU/WebNN Node</span>
                        </div>
                        {/* Layer 4 */}
                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col justify-between hover:border-pulse-primary/30 transition-all">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">04 / OUTPUT LAYER</span>
                          <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-300 mt-2 block">{labels.outputLayer}</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">Unified Workspace</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (40% equivalent: 5/12 cols) */}
                  <div className="xl:col-span-5 flex flex-col gap-6">
                    {/* Live System Status Board */}
                    <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-5 shadow-xl relative overflow-hidden">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
                            {labels.statusOnline}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">PING: 8ms</span>
                      </div>

                      {/* Continuous Heartbeat Pulse wave (SVG) */}
                      <div className="h-16 w-full bg-black/40 rounded-xl border border-white/5 overflow-hidden relative">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <motion.path
                            d="M0,20 L15,20 L20,15 L25,25 L30,20 L45,20 L48,10 L52,30 L55,20 L70,20 L75,18 L80,22 L85,20 L100,20"
                            fill="none"
                            stroke="#7B4DFF"
                            strokeWidth="2"
                            initial={{ strokeDasharray: 200, strokeDashoffset: 200 }}
                            animate={{ strokeDashoffset: [200, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                              ease: "linear"
                            }}
                          />
                        </svg>
                      </div>

                      {/* Core Azrail load indicator */}
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1.5 text-zinc-300">
                          <span>{labels.coreLoad}</span>
                          <span className="text-pulse-accent">96.4% ACTIVE</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '96.4%' }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-pulse-primary to-pulse-accent relative"
                          >
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white animate-pulse" />
                          </motion.div>
                        </div>
                      </div>

                      {/* Hybrid intelligence toggles */}
                      <div>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
                          {labels.hybridIntel}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setHybridMode('cloud')}
                            className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${hybridMode === 'cloud' ? 'bg-pulse-primary text-white border-pulse-primary/30' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
                          >
                            {labels.cloud}
                          </button>
                          <button
                            onClick={() => setHybridMode('local')}
                            className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${hybridMode === 'local' ? 'bg-pulse-primary text-white border-pulse-primary/30' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
                          >
                            {labels.local}
                          </button>
                          <button
                            onClick={() => setHybridMode('hybrid')}
                            className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${hybridMode === 'hybrid' ? 'bg-pulse-primary text-white border-pulse-primary/30' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
                          >
                            HYBRID
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Global Networks Nodes Map */}
                    <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="text-xs font-mono font-bold text-pulse-accent uppercase tracking-widest">
                          {labels.globalNetwork}
                        </h3>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono text-zinc-400">
                          UTC +3
                        </span>
                      </div>

                      {/* World Vector Outline Mock Map */}
                      <div className="h-44 bg-zinc-950/80 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center p-2">
                        {/* Simplified vector world outline SVG */}
                        <svg className="w-full h-full text-zinc-800 opacity-20" viewBox="0 0 100 50">
                          <path d="M 10 15 Q 15 10 20 15 T 30 15 T 40 20 T 45 15 T 50 25 T 60 15 T 70 20 T 80 15 T 90 20" fill="none" stroke="currentColor" strokeWidth="1" />
                          <path d="M 15 25 Q 25 35 30 25 T 50 35 T 70 25 T 85 35" fill="none" stroke="currentColor" strokeWidth="1" />
                          <path d="M 20 40 Q 30 45 40 40 T 60 45 T 80 40" fill="none" stroke="currentColor" strokeWidth="1" />
                        </svg>

                        {/* Interactive pulsing map nodes */}
                        {mapNodes.map((node, i) => (
                          <div
                            key={i}
                            className="absolute cursor-pointer group"
                            style={{ left: node.x, top: node.y }}
                            onClick={() => toast(`Node Info: ${node.name} (Latency: 12ms)`)}
                          >
                            <span className="absolute w-4 h-4 bg-pulse-primary/40 rounded-full -left-1.5 -top-1.5 animate-ping" />
                            <span className="relative block w-1.5 h-1.5 rounded-full bg-pulse-accent border border-white shadow-[0_0_8px_rgba(123,77,255,1)]" />
                            
                            {/* Hover label */}
                            <span className="absolute left-3 top-[-10px] hidden group-hover:block bg-zinc-900 border border-white/10 px-2 py-0.5 rounded text-[8px] font-mono whitespace-nowrap z-50 text-white shadow-lg">
                              {node.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Specifications & Features Checklist */}
                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5 space-y-3">
                      <h3 className="text-xs font-mono font-bold text-pulse-accent uppercase tracking-widest">
                        KEY SPECS & ZERO-KNOWLEDGE
                      </h3>
                      <ul className="space-y-2 text-[11px] font-mono text-zinc-400">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-pulse-accent shrink-0" />
                          <span>Strict zero-knowledge client isolation (No Cloud tracking)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-pulse-accent shrink-0" />
                          <span>Local AI engine WebGPU models with direct WebNN support</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-pulse-accent shrink-0" />
                          <span>Ambient brightness auto-tuning layout parameters</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-pulse-accent shrink-0" />
                          <span>Simulated Taptic haptic responses configured for mobile PWA</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: NEURAL & HARDWARE DEEP SPEC (PART 4 FEATURES) */}
              {activeTab === 'neural' && (
                <motion.div
                  key="neural"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {/* Local AI Neural Center (Section 4) */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-pulse-accent/20 rounded-xl">
                        <Cpu className="w-5 h-5 text-pulse-accent" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Local AI Neural Center</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Edge Computing & Weight manager</p>
                      </div>
                    </div>

                    {/* Mode profile selectors */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                        Neural Core Power Profile:
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'eco', label: 'Eco Power', desc: 'Saves battery' },
                          { id: 'balanced', label: 'Balanced', desc: 'Standard performance' },
                          { id: 'perf', label: 'High Perf', desc: 'WebGPU full throttle' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setLocalAIProfile(p.id as any)}
                            className={`p-3 rounded-2xl border text-left transition-all ${localAIProfile === p.id ? 'bg-pulse-primary/20 border-pulse-primary text-white' : 'bg-black/20 border-white/5 text-zinc-400 hover:border-white/10'}`}
                          >
                            <span className="text-xs font-bold font-mono uppercase block">{p.label}</span>
                            <span className="text-[8px] opacity-70 block mt-1">{p.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Loaded Local Models overview */}
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">
                        LOADED LOCAL MODEL INSTANCES:
                      </span>
                      <div className="space-y-2">
                        {[
                          { id: 'gemma-2b', name: 'Gemma 2B Quantized (WebGPU)', size: '1.2 GB', status: 'Loaded' },
                          { id: 'llama-3b', name: 'Llama 3B-Quantized (WebNN)', size: '1.8 GB', status: 'Standby' },
                          { id: 'whisper-micro', name: 'Whisper Cognitive Mic (Audio)', size: '180 MB', status: 'Active' },
                        ].map((model) => (
                          <div
                            key={model.id}
                            onClick={() => setActiveModel(model.id)}
                            className={`p-2.5 rounded-xl border text-xs font-mono flex justify-between items-center cursor-pointer transition-all ${activeModel === model.id ? 'bg-pulse-primary/10 border-pulse-primary text-white' : 'bg-transparent border-white/5 text-zinc-400 hover:bg-white/5'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${activeModel === model.id ? 'bg-pulse-accent animate-pulse' : 'bg-zinc-600'}`} />
                              <span>{model.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">{model.size}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${model.status === 'Active' || model.status === 'Loaded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {model.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons with load states */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleRebuildIndex}
                        disabled={isRebuildingIndex}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRebuildingIndex ? 'animate-spin text-pulse-primary' : ''}`} />
                        {isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}
                      </button>
                      <button
                        onClick={handleDownloadUpdates}
                        disabled={isDownloadingUpdates}
                        className="flex-1 py-3 bg-pulse-primary hover:bg-pulse-primary/80 rounded-2xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 text-white"
                      >
                        <Download className={`w-3.5 h-3.5 ${isDownloadingUpdates ? 'animate-bounce' : ''}`} />
                        {isDownloadingUpdates ? 'Downloading...' : 'Update Models'}
                      </button>
                    </div>
                  </div>

                  {/* Eco-Mode & Zero-Knowledge Storage (Section 4 & 5) */}
                  <div className="space-y-6">
                    {/* Zero-Knowledge Privacy Manager */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-5 h-5 text-pulse-accent" />
                          <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest">
                            Zero-Knowledge Store
                          </h4>
                        </div>
                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                          SYSTEM ENCRYPTED
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Fully Isolate Data in IndexedDB</span>
                          <span className="text-[10px] text-zinc-500 block">Restricts transmission to clouds</span>
                        </div>
                        <button
                          onClick={() => {
                            setZeroKnowledge(!zeroKnowledge);
                            toast.success(zeroKnowledge ? 'Local isolation disabled' : 'Local isolation fully active!');
                          }}
                          className="text-pulse-primary"
                        >
                          {zeroKnowledge ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5 text-xs font-mono">
                        <span className="text-zinc-500">Local Archive: IndexedDB Base</span>
                        <button
                          onClick={handleExportArchive}
                          className="text-pulse-accent hover:underline flex items-center gap-1 font-bold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          EXPORT
                        </button>
                      </div>
                    </div>

                    {/* Eco-Mode & Green Computing (Section 5) */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-5 h-5 text-emerald-400" />
                          <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                            Green Computing & Eco-Mode
                          </h4>
                        </div>
                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                          ECO ACTIVE
                        </span>
                      </div>

                      {/* Eco Mode master switch */}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Eco Mode Activation</span>
                          <span className="text-[10px] text-zinc-500 block">Pauses heavy WebGL canvas & limits stream</span>
                        </div>
                        <button
                          onClick={() => {
                            setEcoMode(!ecoMode);
                            toast.success(ecoMode ? 'Eco Mode disabled. Immersive Three.js enabled.' : 'Eco Mode active. CPU load restricted.');
                          }}
                          className="text-emerald-400"
                        >
                          {ecoMode ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      {/* Frame Rate Cap selector */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Limit Frame Rate (Frame Rate Cap):
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'auto', label: 'Auto' },
                            { id: '30', label: '30 FPS' },
                            { id: '60', label: '60 FPS' },
                            { id: '120', label: '120+' }
                          ].map((cap) => (
                            <button
                              key={cap.id}
                              onClick={() => {
                                setFrameRateCap(cap.id as any);
                                toast.info(`Frame rate cap adjusted to ${cap.label}`);
                              }}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] font-mono transition-all ${frameRateCap === cap.id ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-400'}`}
                            >
                              {cap.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ambient Light Theme Adaptor */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Sun className="w-5 h-5 text-pulse-accent" />
                        <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest">
                          Dynamic Ambient Adaptation
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400">Simulate Ambient Light sensor:</span>
                          <span className="text-pulse-accent">{ambientLight} Lux ({ambientThemeName})</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="1000"
                          value={ambientLight}
                          onChange={(e) => setAmbientLight(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pulse-primary"
                        />
                        <span className="text-[9px] text-zinc-500 font-mono block mt-1">
                          In 2026, the UI theme adapts on-the-fly to room light lux level, geolocation coordinates, and timezone cycles.
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: TACTILE PLAYGROUND & PERSPECTIVE HOVER CARDS (PART 5 ADVANCED PATTERNS) */}
              {activeTab === 'tactile' && (
                <motion.div
                  key="tactile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {/* Tactile Simulated Haptic Patterns */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-pulse-primary/20 rounded-xl">
                        <Waves className="w-5 h-5 text-pulse-primary" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Taptic / Haptic Feedback 2.0</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Micro-interactions simulated for PWA</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        Press the diagnostic triggers to experience simulated taptic rhythms. On supported mobile platforms, this fires actual hardware vibration pulses.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => triggerSimulatedHaptic('success')}
                          className="btn-pulse p-4 rounded-2xl text-left flex flex-col justify-between h-28"
                        >
                          <span className="text-[10px] font-mono text-emerald-400 uppercase block">SUCCESS VIBE</span>
                          <span className="text-xs font-bold font-mono tracking-tight text-zinc-300 block mt-2">Double Tap</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">2 short, soft pulses</span>
                        </button>

                        <button
                          onClick={() => triggerSimulatedHaptic('error')}
                          className="btn-pulse p-4 rounded-2xl text-left flex flex-col justify-between h-28"
                        >
                          <span className="text-[10px] font-mono text-red-400 uppercase block">ERROR VIBE</span>
                          <span className="text-xs font-bold font-mono tracking-tight text-zinc-300 block mt-2">Heavy Warning</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">1 heavy sharp pulse</span>
                        </button>

                        <button
                          onClick={() => triggerSimulatedHaptic('scroll')}
                          className="btn-pulse p-4 rounded-2xl text-left flex flex-col justify-between h-28"
                        >
                          <span className="text-[10px] font-mono text-pulse-accent uppercase block">SCROLL TICK</span>
                          <span className="text-xs font-bold font-mono tracking-tight text-zinc-300 block mt-2">Light Tick</span>
                          <span className="text-[9px] text-zinc-500 mt-1 block">Light click sensation</span>
                        </button>
                      </div>
                    </div>

                    {/* Simulated Screen Vibration Indicator */}
                    <div className="h-12 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                      <AnimatePresence mode="wait">
                        {simulatedVibe && (
                          <motion.div
                            initial={{ scale: 0.98 }}
                            animate={{ 
                              scale: [1, 1.05, 0.95, 1],
                              x: simulatedVibe === 'error' ? [0, -10, 10, -5, 5, 0] : [0, -2, 2, 0]
                            }}
                            exit={{ scale: 1 }}
                            className="absolute inset-0 bg-pulse-primary/10 border border-pulse-primary/30 flex items-center justify-center"
                          >
                            <span className="text-xs font-mono font-bold uppercase text-pulse-accent animate-pulse">
                              {simulatedVibe === 'success' ? 'VIBRATING: SUCCESS_DOUBLE_TAP' : simulatedVibe === 'error' ? 'VIBRATING: FATAL_SYSTEM_SURGE' : 'VIBRATING: TICK_STEP'}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        TACTILE SENSOR IDLE
                      </span>
                    </div>
                  </div>

                  {/* Parallax Hover & Spring Physics */}
                  <div className="space-y-6">
                    {/* Parallax Hover Depth Card */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Sparkles className="w-5 h-5 text-pulse-accent" />
                        <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest">
                          Parallax 3D Depth Card (Section 5.3)
                        </h4>
                      </div>

                      <div className="perspective-1000 flex justify-center py-4">
                        <div
                          ref={cardRef}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          className="w-full max-w-sm h-48 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden cursor-pointer select-none transition-all duration-200"
                          style={{
                            transform: `rotateX(${-coords.y}deg) rotateY(${coords.x}deg)`,
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),rgba(123,77,255,0.15)_0%,transparent_100%)] pointer-events-none" />
                          <div className="flex justify-between items-start" style={{ transform: 'translateZ(30px)' }}>
                            <div>
                              <span className="text-[9px] font-mono text-pulse-accent tracking-widest uppercase block">MNMLL PULSE CARD</span>
                              <h5 className="text-sm font-bold font-mono tracking-wider mt-1">CORE NEURAL IDENT</h5>
                            </div>
                            <Fingerprint className="w-8 h-8 text-pulse-primary" />
                          </div>

                          <div className="space-y-2" style={{ transform: 'translateZ(20px)' }}>
                            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                              <span>HOLO ENCRYPTED NO:</span>
                              <span>987-AZR-2026</span>
                            </div>
                            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-pulse-primary w-2/3" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono block text-center">
                        Hover cursor over the card to experience dynamic 3D perspective tilting.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: INCLUSIVE & ACCESSIBILITY 3.0 (PART 6 & 7) */}
              {activeTab === 'inclusive' && (
                <motion.div
                  key="inclusive"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-pulse-primary/20 rounded-xl">
                        <Eye className="w-5 h-5 text-pulse-primary" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Accessibility 3.0</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Cognitive Load Management</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Simplify Text Content</span>
                          <span className="text-[10px] text-zinc-500 block">Summarize to 8th grade reading level</span>
                        </div>
                        <button
                          onClick={() => {
                            setSimplifiedText(!simplifiedText);
                            toast.success(simplifiedText ? 'Original text restored' : 'Text simplification active');
                          }}
                          className="text-pulse-primary"
                        >
                          {simplifiedText ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Minimize UI Complexity</span>
                          <span className="text-[10px] text-zinc-500 block">Hide non-critical elements & animations</span>
                        </div>
                        <button
                          onClick={() => {
                            setMinimizedUI(!minimizedUI);
                            toast.success(minimizedUI ? 'Full UI restored' : 'UI minimized for focus');
                          }}
                          className="text-pulse-primary"
                        >
                          {minimizedUI ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                         <div className="flex justify-between items-center mb-3">
                           <div>
                             <span className="text-xs font-bold text-zinc-200 block">Hyper-Personalized Navigation</span>
                             <span className="text-[10px] text-zinc-500 block">AI adapts hierarchy to your behavior</span>
                           </div>
                         </div>
                         <button
                            onClick={handleRebuildNav}
                            disabled={isRebuildingNav}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRebuildingNav ? 'animate-spin text-pulse-primary' : ''}`} />
                            {isRebuildingNav ? 'Rebuilding Layout...' : 'Rebuild Navigation For Me'}
                          </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-pulse-accent/20 rounded-xl">
                        <Cpu className="w-5 h-5 text-pulse-accent" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">AI Persona Control</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Tone & Context Awareness</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Assistant Voice Tone:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'formal', label: 'Formal' },
                            { id: 'friendly', label: 'Friendly' },
                            { id: 'concise', label: 'Concise' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setAITone(t.id as any)}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] font-mono transition-all ${aiTone === t.id ? 'bg-pulse-primary/20 border-pulse-primary text-white' : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-400'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Contextual Awareness</span>
                          <span className="text-[10px] text-zinc-500 block">AI access to calendar & location</span>
                        </div>
                        <button
                          onClick={() => {
                            setContextAwareness(!contextAwareness);
                            toast.info(contextAwareness ? 'Context restricted' : 'Full context access granted');
                          }}
                          className="text-pulse-primary"
                        >
                          {contextAwareness ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: ARCHITECTURE & XR (PART 7 & 8) */}
              {activeTab === 'architecture' && (
                <motion.div
                  key="architecture"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-emerald-500/20 rounded-xl">
                        <Layers className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Spatial Computing (XR)</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">WebXR & Depth Scaling</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Spatial Plates Mode</span>
                          <span className="text-[10px] text-zinc-500 block">Converts Z-index to physical depth (meters)</span>
                        </div>
                        <button
                          onClick={() => {
                            setSpatialPlates(!spatialPlates);
                            toast.success(spatialPlates ? 'Standard 2D layout active' : 'Spatial Plates XR mode active');
                          }}
                          className="text-emerald-400"
                        >
                          {spatialPlates ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>
                      
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
                         <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-2">XR Target Scaling</span>
                         <span className="text-xs text-zinc-300">Min Element Size: 20cm at 1m distance. Current UI fluidly maps to these spatial dimensions when XR session begins.</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="p-2 bg-pulse-accent/20 rounded-xl">
                          <Database className="w-5 h-5 text-pulse-accent" />
                        </div>
                        <div>
                          <h3 className="text-md font-bold font-mono uppercase tracking-wider">Distributed State</h3>
                          <p className="text-[10px] text-zinc-500 font-mono">P2P IPFS Sync (Off-chain)</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">P2P Peer Sync Status</span>
                          <span className="text-[10px] text-zinc-500 block">Serverless state propagation</span>
                        </div>
                        <button
                          onClick={() => {
                            setP2pSync(!p2pSync);
                            toast.info(p2pSync ? 'P2P network disconnected' : 'Connecting to local P2P mesh...');
                          }}
                          className="text-pulse-primary"
                        >
                          {p2pSync ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                         <span className="text-xs font-mono text-zinc-400">Connected Peers:</span>
                         <span className="text-xs font-mono font-bold text-emerald-400">{p2pSync ? '12 Nodes' : '0 Nodes'}</span>
                      </div>
                    </div>

                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="p-2 bg-pulse-primary/20 rounded-xl">
                          <Activity className="w-5 h-5 text-pulse-primary" />
                        </div>
                        <div>
                          <h3 className="text-md font-bold font-mono uppercase tracking-wider">Telemetry & Perf</h3>
                          <p className="text-[10px] text-zinc-500 font-mono">Architectural Constraints</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                            <span className="text-[10px] font-mono text-zinc-500 block uppercase">TTI Target</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">&lt; 1.0s</span>
                         </div>
                         <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                            <span className="text-[10px] font-mono text-zinc-500 block uppercase">LCP Target</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">&lt; 1.2s</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: ENGINEERING (PART 9) */}
              {activeTab === 'engineering' && (
                <motion.div
                  key="engineering"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Settings className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Kernel & Runtime</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Module Isolation & HW Allocator</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">WASM Sandbox Isolation</span>
                          <span className="text-[10px] text-zinc-500 block">Isolate 3rd-party WASM execution states</span>
                        </div>
                        <button
                          onClick={() => {
                            setWasmIsolation(!wasmIsolation);
                            toast.success(wasmIsolation ? 'WASM isolation disabled. Kernel open.' : 'Strict WASM sandboxing enforced.');
                          }}
                          className="text-blue-400"
                        >
                          {wasmIsolation ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Service Worker Strategy:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'cache-first', label: 'Cache-First' },
                            { id: 'network-first', label: 'Net-First' },
                            { id: 'bypass', label: 'Bypass' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setWorkerStrategy(t.id as any);
                                toast.info(`Worker strategy set to: ${t.label}`);
                              }}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] font-mono transition-all ${workerStrategy === t.id ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-400'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-white/5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Hardware Priority Allocator:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'npu', label: 'NPU Focus' },
                            { id: 'gpu', label: 'GPU Offload' },
                            { id: 'cpu', label: 'CPU Strict' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setHardwarePriority(t.id as any);
                                toast.success(`Hardware priority shifted to ${t.label}`);
                              }}
                              className={`py-2 px-1.5 rounded-xl border text-[10px] font-mono transition-all ${hardwarePriority === t.id ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-400'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-pulse-primary/20 rounded-xl">
                        <Activity className="w-5 h-5 text-pulse-primary" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Memory Profiler</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Heap Limits & GC Hooks</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                         <div className="flex justify-between items-center text-xs font-mono">
                           <span className="text-zinc-400">Total Heap Limit</span>
                           <span className="text-zinc-200">4096 MB</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-mono">
                           <span className="text-zinc-400">Current Usage</span>
                           <span className="text-pulse-accent">842 MB</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-mono">
                           <span className="text-zinc-400">WebGPU VRAM</span>
                           <span className="text-emerald-400">1.2 GB</span>
                         </div>
                      </div>

                      <button
                        onClick={() => {
                           toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
                              loading: 'Forcing aggressive garbage collection...',
                              success: 'Heap optimized. Freed 120MB.',
                              error: 'GC failed.'
                           });
                        }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Force GC Cycle
                      </button>
                    </div>
                  </div>

                  {/* Defender Agents */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pulse-primary/20 rounded-xl">
                          <Eye className="w-5 h-5 text-pulse-primary" />
                        </div>
                        <div>
                          <h3 className="text-md font-bold font-mono uppercase tracking-wider">Defender Agents</h3>
                          <p className="text-[10px] text-zinc-500 font-mono">Real-time threat monitoring</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pulse-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-pulse-primary"></span>
                        </span>
                        <span className="text-xs text-pulse-primary font-mono">ACTIVE SCANNING</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-pulse-primary"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-zinc-200">AZRAIL-Core</span>
                          <span className="text-[10px] bg-pulse-primary/20 text-pulse-primary px-2 py-1 rounded-md">Heuristics</span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4">Deep packet inspection and payload analysis. Currently monitoring 1,204 active streams.</p>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-mono text-emerald-400">0 anomalies detected</span>
                          <Activity className="w-4 h-4 text-zinc-600 animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-zinc-200">ANUBIS-Gate</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-1 rounded-md">Injection Shield</span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4">Validating incoming data against known XSS/SQLi vectors. Filtering raw inputs.</p>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-mono text-zinc-500">All gates secured</span>
                          <Shield className="w-4 h-4 text-zinc-600 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Shield Status */}
                    <div className="pt-4 border-t border-white/5">
                      <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block mb-4">Shield-Status: Data Transparency Map</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="bg-black/20 border border-emerald-500/30 p-3 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-mono mb-1">LOCAL STATE</div>
                          <div className="text-xs text-emerald-400 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> Encrypted Volatile</div>
                        </div>
                        <div className="bg-black/20 border border-pulse-primary/30 p-3 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-mono mb-1">CLOUDFLARE R2</div>
                          <div className="text-xs text-pulse-primary font-bold flex items-center gap-1"><Database className="w-3 h-3"/> AES-256 E2E</div>
                        </div>
                        <div className="bg-black/20 border border-amber-500/30 p-3 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-mono mb-1">P2P MESH</div>
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1"><Globe className="w-3 h-3"/> Split Tunnel</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* TAB 7: SECURITY (PART 10) */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-amber-500/20 rounded-xl">
                        <Key className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Quantum Security</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Post-Quantum Cryptography</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Kyber/Dilithium PQC</span>
                          <span className="text-[10px] text-zinc-500 block">Enable quantum-safe tunnel encryption</span>
                        </div>
                        <button
                          onClick={() => {
                            setQuantumCrypto(!quantumCrypto);
                            toast.success(quantumCrypto ? 'Standard TLS 1.3 fallback active' : 'PQC Hybrid Kyber-1024 encryption enabled');
                          }}
                          className="text-amber-400"
                        >
                          {quantumCrypto ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">Hardware Biometric Enclave</span>
                          <span className="text-[10px] text-zinc-500 block">Store derived keys in Secure Enclave</span>
                        </div>
                        <button
                          onClick={() => {
                            setBiometricEnclave(!biometricEnclave);
                            toast.success(biometricEnclave ? 'Keys shifted to memory cache' : 'Keys locked to hardware enclave');
                          }}
                          className="text-amber-400"
                        >
                          {biometricEnclave ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl mt-4">
                         <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-2">PQC Handshake Status</span>
                         <span className="text-xs text-amber-400 font-bold font-mono">SECURE (X25519Kyber768Draft00)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-red-500/20 rounded-xl">
                        <Shield className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold font-mono uppercase tracking-wider">Zero-Trust Network</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Edge Identity Firewall</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">ZTNA Micro-segmentation</span>
                          <span className="text-[10px] text-zinc-500 block">Verify identity on every component API call</span>
                        </div>
                        <button
                          onClick={() => {
                            setZeroTrustNetwork(!zeroTrustNetwork);
                            toast.info(zeroTrustNetwork ? 'ZTNA policies relaxed for dev' : 'Strict ZTNA policies enforced');
                          }}
                          className="text-red-400"
                        >
                          {zeroTrustNetwork ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-zinc-600" />}
                        </button>
                      </div>

                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                         <div className="flex justify-between items-center text-xs font-mono">
                           <span className="text-zinc-400">Blocked Micro-Intrusions</span>
                           <span className="text-red-400">2,419</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-mono">
                           <span className="text-zinc-400">Identity Context</span>
                           <span className="text-zinc-200">VALID (Token TTL: 14m)</span>
                         </div>
                      </div>

                      <button
                        onClick={() => {
                           toast.success('Identity tokens rotated and P2P mesh re-verified.');
                        }}
                        className="btn-pulse w-full py-3 text-red-400 rounded-2xl text-xs font-mono font-bold uppercase flex items-center justify-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5" /> Rotate JWT Identities
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'devops' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 flex flex-col h-full"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold font-mono text-pulse-primary uppercase tracking-widest flex items-center gap-2">
                        {isRu ? 'ТЕМНАЯ MNMLL PULSE OC' : 'DARK MNMLL PULSE OS'}
                      </h2>
                      <p className="text-sm font-mono text-pulse-primary">DEVOPS COMMAND PANEL</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-mono text-emerald-400 tracking-wider">BUILD ENGINE STATUS: ACTIVE</div>
                      <div className="text-xs font-mono text-zinc-500 uppercase">{isRu ? 'Статус движка сборки: Активен' : 'Build engine status: Active'}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-mono text-emerald-400 tracking-wider flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         AZRAIL CORE BUILD (WASM): COMPILING
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: WASM & File Size */}
                    <div className="space-y-6">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">{isRu ? 'Модули Сборки WASM' : 'WASM BUILD MODULES'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-pulse-primary" /> AZRAIL CORE:</span>
                              <span className="text-pulse-primary">96% Complete</span>
                            </div>
                            <div className="h-8 border-b border-l border-white/10 relative overflow-hidden">
                               <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                 <path d="M0,20 L10,18 L20,15 L30,12 L40,10 L50,8 L60,10 L70,5 L80,3 L90,5 L100,2" fill="none" stroke="#7B4DFF" strokeWidth="1" />
                               </svg>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                              <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-pulse-primary" /> AGENT SWARM:</span>
                              <span className="text-emerald-400">OK</span>
                            </div>
                            <div className="h-8 border-b border-l border-white/10 relative overflow-hidden flex items-end gap-[1px]">
                               {[...Array(20)].map((_, i) => (
                                 <div key={i} className="bg-pulse-primary/60 w-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                               ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                              <span>MEMORY KERNEL:</span>
                              <span className="text-zinc-500">16% Complete</span>
                            </div>
                            <div className="h-8 border-b border-l border-white/10 relative overflow-hidden">
                               <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                 <path d="M0,20 L20,20 L20,10 L40,10 L40,20 L60,20 L60,15 L80,15 L80,20 L100,20" fill="none" stroke="#7B4DFF" strokeWidth="1" opacity="0.5" />
                               </svg>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-pulse-primary" /> SECURITY LAYER:</span>
                              <span className="text-zinc-500">16% Complete</span>
                            </div>
                            <div className="h-8 border-b border-l border-white/10 relative overflow-hidden flex items-end gap-[1px]">
                               {[...Array(20)].map((_, i) => (
                                 <div key={i} className="bg-red-500/30 w-full" style={{ height: `${Math.max(10, Math.random() * 40)}%` }}></div>
                               ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">{isRu ? 'Телеметрия Размера Файлов' : 'FILE SIZE TELEMETRY'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                           {['AZRAIL CORE', 'AGENT SWARM', 'MEMORY KERNEL', 'SWITCHES'].map((name) => (
                              <div key={name} className="space-y-1">
                                <div className="text-[10px] text-zinc-300 font-bold uppercase">{name}</div>
                                <div className="h-10 border-b border-l border-white/10 relative overflow-hidden">
                                   <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                     <path d={`M0,20 Q25,10 50,15 T100,5`} fill="none" stroke="#7B4DFF" strokeWidth="1" />
                                   </svg>
                                </div>
                                <div className="flex justify-between text-[8px] text-zinc-500">
                                   <span>Time</span><span>100m</span><span>Time</span>
                                </div>
                              </div>
                           ))}
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Edge Status */}
                    <div className="space-y-6">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4 relative overflow-hidden flex flex-col justify-between h-full">
                         {/* World Map Backdrop */}
                         <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border border-pulse-primary/30 rounded-full animate-[spin_60s_linear_infinite]"></div>
                            <div className="w-48 h-48 border border-pulse-primary/40 rounded-full absolute animate-[spin_40s_linear_infinite_reverse]"></div>
                         </div>
                         
                         <div>
                            <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest relative z-10">{isRu ? 'Статус Клаудфлар Эдж' : 'CLOUDFLARE EDGE STATUS'}</h3>
                         </div>

                         <div className="space-y-4 relative z-10 mt-auto">
                            <div className="flex justify-between items-end">
                               <div className="space-y-1">
                                 <div className="text-[10px] text-zinc-400 uppercase">GLOBAL NODES:</div>
                                 <div className="text-2xl font-mono text-white">56/56 ONLINE</div>
                               </div>
                               <div className="space-y-1 text-right">
                                 <div className="text-[10px] text-zinc-400 uppercase">AUTOMATED DATA FLOW TELEMETRY</div>
                                 <div className="h-10 w-32 border-b border-l border-white/10 relative overflow-hidden">
                                    <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                      {[...Array(5)].map((_, i) => (
                                        <path key={i} d={`M0,${2+i*4} Q25,${10+i*2} 50,${15-i*2} T100,${5+i*3}`} fill="none" stroke="#7B4DFF" strokeWidth="0.5" opacity={1 - i*0.15} />
                                      ))}
                                    </svg>
                                 </div>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <div className="text-[10px] text-zinc-400 uppercase">R2 STORAGE SYNC:</div>
                               <div className="text-xl font-mono text-white">98%</div>
                               <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-2">
                                 <div className="h-full bg-pulse-primary w-[98%]"></div>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>

                    {/* Right Column: Automated UI Testing */}
                    <div className="space-y-6">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest leading-tight">{isRu ? 'Автоматизированное Тестирование UI (Стандарты)' : 'AUTOMATED UI TESTING (<STD> STANDARDS)'}</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                           <div className="space-y-2">
                             <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                               <span>COLOR SYSTEM:</span><span className="text-emerald-400">OK</span>
                             </div>
                             <div className="flex gap-1 h-6">
                               <div className="flex-1 bg-zinc-950 border border-white/10"></div>
                               <div className="flex-1 bg-pulse-primary"></div>
                               <div className="flex-1 bg-[#3BCCFF]"></div>
                               <div className="flex-1 bg-red-500"></div>
                               <div className="flex-1 bg-white"></div>
                             </div>
                           </div>
                           <div className="space-y-2">
                             <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                               <span>TYPOGRAPHY:</span><span className="text-emerald-400">OK</span>
                             </div>
                             <div className="text-lg font-bold font-sans text-pulse-primary/70">TA/Aal<span className="font-mono text-zinc-500">a/l/a</span></div>
                           </div>
                           <div className="space-y-2">
                             <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                               <span>GLOBE ANIMATION:</span><span className="text-emerald-400">OK</span>
                             </div>
                             <div className="h-6 border-b border-l border-white/10 relative overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                  <path d="M0,20 Q25,20 40,5 T60,5 T100,20" fill="none" stroke="#7B4DFF" strokeWidth="1" />
                                </svg>
                             </div>
                           </div>
                           <div className="space-y-2">
                             <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                               <span>BUTTONS & CONTROLS:</span><span className="text-emerald-400">OK</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <div className="h-5 w-10 bg-pulse-primary rounded-full text-[6px] flex items-center justify-center font-bold text-white">BTN</div>
                               <div className="h-5 w-10 bg-white/10 border border-white/20 rounded-full text-[6px] flex items-center justify-center font-bold text-white">BTN</div>
                             </div>
                           </div>
                           <div className="space-y-2">
                             <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                               <span>SWITCHES:</span><span className="text-emerald-400">OK</span>
                             </div>
                             <div className="h-6 border-b border-l border-white/10 relative overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                  <path d="M0,10 L20,10 L30,5 L40,15 L50,10 L100,10" fill="none" stroke="#7B4DFF" strokeWidth="1" />
                                </svg>
                             </div>
                           </div>
                           <div className="space-y-2">
                             <div className="text-[10px] text-zinc-300 font-bold uppercase flex justify-between">
                               <span>ICONOGRAPHY:</span><span className="text-emerald-400">OK</span>
                             </div>
                             <div className="h-6 border-b border-l border-white/10 relative overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                                  <path d="M0,15 L10,5 L20,15 L30,5 L40,15 L50,5 L60,15 L70,5 L80,15 L90,5 L100,15" fill="none" stroke="#3BCCFF" strokeWidth="0.5" />
                                </svg>
                             </div>
                           </div>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
                         <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">{isRu ? 'Метрики Доступности' : 'ACCESSIBILITY METRICS'}</h3>
                         <div className="flex items-center justify-between text-zinc-500">
                           <Eye className="w-5 h-5 text-pulse-primary" />
                           <span className="text-[10px]">→</span>
                           <Activity className="w-5 h-5 text-pulse-primary" />
                         </div>
                         <div className="space-y-2">
                           {[1, 2, 3, 4].map(i => (
                             <div key={i} className="flex gap-2 items-center">
                                <div className="h-1 bg-pulse-primary/50 w-full rounded-full"></div>
                                <div className="w-2 h-2 rounded-full border border-pulse-primary/50"></div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Panel: Production Deployment */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-6 mt-4">
                     <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">{isRu ? 'Панель Развертывания Production' : 'PRODUCTION DEPLOYMENT PANEL'}</h3>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1">
                             <div className="text-[10px] text-zinc-400 uppercase">GLOBAL R2 MIRROR</div>
                             <div className="text-xl font-mono text-white flex items-center gap-2">100% <Shield className="w-4 h-4 text-pulse-primary" /></div>
                           </div>
                           <div className="space-y-1">
                             <div className="text-[10px] text-zinc-400 uppercase">Edge Workers</div>
                             <div className="text-xl font-mono text-white">LAUNCH</div>
                           </div>
                           <div className="space-y-1">
                             <div className="text-[10px] text-zinc-400 uppercase">P2P SYNC STATUS</div>
                             <div className="flex items-center gap-2">
                               <div className="text-xl font-mono text-white">98%</div>
                               <div className="w-8 h-4 border border-pulse-primary/50 rounded-full relative">
                                  <div className="w-3 h-3 bg-pulse-primary rounded-full absolute right-0.5 top-0.5 shadow-[0_0_10px_#7B4DFF]"></div>
                               </div>
                             </div>
                           </div>
                        </div>

                        <div className="flex flex-col gap-3">
                           <button 
                             onClick={() => {
                               setIsDeploying(true);
                               setDeployPhase('starting');
                               setTelemetryLogs(prev => [...prev, 'DEPLOYMENT TO 56 NODES STARTED']);
                               setTimeout(() => { setDeployPhase('edge'); setTelemetryLogs(prev => [...prev, 'R2 MIRROR SYNCHRONIZING']); }, 1000);
                               setTimeout(() => { setTelemetryLogs(prev => [...prev, 'R2 MIRROR SYNCHRONIZING']); }, 1500);
                               setTimeout(() => { setTelemetryLogs(prev => [...prev, 'DEPLOYMENT SYNCHRONIZING']); }, 2000);
                               setTimeout(() => { setDeployPhase('impacting'); setTelemetryLogs(prev => [...prev, 'DEPLOYMENT SUCCESSFUL']); setIsDeploying(false); }, 3500);
                             }}
                             disabled={isDeploying}
                             className={`px-8 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all ${isDeploying ? 'bg-pulse-primary/50 text-white/50 cursor-not-allowed shadow-[0_0_20px_rgba(123,77,255,0.4)]' : 'bg-pulse-primary text-white hover:bg-pulse-primary/80 shadow-[0_0_20px_rgba(123,77,255,0.4)] hover:shadow-[0_0_30px_rgba(123,77,255,0.6)]'}`}
                           >
                             {isRu ? 'ИНИЦИАЛИЗИРОВАТЬ РАЗВЕРТЫВАНИЕ' : 'INITIALIZE DEPLOYMENT'}
                           </button>
                           <button className="px-8 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                             {isRu ? 'ОТКАТ СБОРКИ' : 'ROLLBACK BUILD'}
                           </button>
                        </div>
                     </div>

                     <div className="relative mt-4">
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2"></div>
                        <div className="relative flex justify-between px-2">
                           <div className="flex flex-col items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 z-10 ${deployPhase !== 'idle' ? 'bg-pulse-primary shadow-[0_0_10px_#7B4DFF]' : 'bg-zinc-600'}`}></div>
                             <span className="text-[10px] text-zinc-500 uppercase font-mono">Started</span>
                           </div>
                           <div className="flex flex-col items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 z-10 ${['starting', 'edge', 'impacting'].includes(deployPhase) ? 'bg-pulse-primary shadow-[0_0_10px_#7B4DFF]' : 'bg-zinc-600'}`}></div>
                             <span className="text-[10px] text-zinc-500 uppercase font-mono">Starting</span>
                           </div>
                           <div className="flex flex-col items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 z-10 ${['edge', 'impacting'].includes(deployPhase) ? 'bg-pulse-primary shadow-[0_0_10px_#7B4DFF]' : 'bg-zinc-600'}`}></div>
                             <span className="text-[10px] text-zinc-500 uppercase font-mono">Edge</span>
                           </div>
                           <div className="flex flex-col items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 z-10 ${deployPhase === 'impacting' ? 'bg-pulse-primary shadow-[0_0_10px_#7B4DFF]' : 'bg-zinc-600'}`}></div>
                             <span className="text-[10px] text-zinc-500 uppercase font-mono">Impacting</span>
                           </div>
                        </div>
                     </div>

                     <div className="mt-4 border-t border-white/5 pt-4">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-mono">TELEMETRY LOGS</div>
                        <div className="font-mono text-[10px] text-zinc-400 space-y-1 max-h-24 overflow-y-auto">
                          {telemetryLogs.map((log, i) => (
                            <div key={i} className="flex gap-4">
                              <span className="text-zinc-600">[{i.toString().padStart(4, '0')}]</span>
                              <span className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : ''}>{log}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Immersive System Footer */}
          <footer className="border-t border-white/5 py-5 px-6 shrink-0 bg-zinc-950 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest gap-4 z-50">
            <div className="flex items-center gap-3">
              <span>{labels.infraCloudflare}:</span>
              <div className="flex gap-2 flex-wrap text-zinc-400">
                {['Workers', 'Durable Objects', 'D1 Database', 'R2 Storage', 'Queues', 'AI Gateway', 'Vectorize', 'Analytics'].map((s, i) => (
                  <span key={s} className="hover:text-pulse-accent transition-colors">
                    {s}
                    {i < 7 && <span className="text-zinc-600 ml-2">•</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center md:text-right flex flex-col gap-1 text-[9px] text-zinc-600">
              <span>MNMLLPULSE OWNER & CREATOR EDITION 2026</span>
              <span>© 2026 MNMLLPULSE. ALL RIGHTS RESERVED. INTELLIGENCE THAT MOVES THE PLANET.</span>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
