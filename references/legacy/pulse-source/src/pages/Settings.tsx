import React, { useState, useEffect, useMemo } from 'react';
import { useSystemState } from '../contexts/SystemStateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Settings, Moon, Sun, Palette, ShieldAlert, BookOpen, Languages, Cog, CreditCard, Search, Download, Upload, Shield, Activity, Waves, ArrowLeft } from 'lucide-react';
import { ConfigService } from '../services/ConfigService';
import { AuditService, AuditLogEntry } from '../services/AuditService';
import DocumentationModal from '../components/common/DocumentationModal';
import GlobalMotionController from '../components/common/GlobalMotionController';
import { useDeepWork } from '../contexts/DeepWorkContext';
import { useDynamicContrast } from '../hooks/useDynamicContrast';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import ArchitectureReport from '../components/ArchitectureReport';

export default function SettingsPage() {
  const { t, setLanguage, language } = useLanguage();
  const { triggerDiagnostics, triggerPulseWave, isAdmin, uiPreferences, setUIPreferences } = useSystemState();
  const { isDeepWork, toggleDeepWork } = useDeepWork();
  const { config: contrastConfig, setContrastMode, toggleAutoAdapt } = useDynamicContrast();
  const { onUpgrade } = useOutletContext<{ onUpgrade: () => void }>();
  const [activeTab, setActiveTab] = useState<'system' | 'ui' | 'language' | 'account' | 'admin' | 'core' | 'design-system'>('system');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLight = uiPreferences.theme === 'light';
  const setIsLight = (light: boolean) => {
    setUIPreferences({ ...uiPreferences, theme: light ? 'light' : 'dark' });
  };
  
  // Admin state
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [healthData, setHealthData] = useState<{ time: string, cpu: number, memory: number }[]>([]);
  const [users, setUsers] = useState([{ name: 'mnmllpulse', role: 'Owner' }, { name: 'user1', role: 'User' }]);

  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
        setLogs(AuditService.getLogs());
        const interval = setInterval(() => {
            const now = new Date().toLocaleTimeString();
            setHealthData(prev => [...prev.slice(-19), { time: now, cpu: Math.floor(Math.random() * 30) + 10, memory: Math.floor(Math.random() * 20) + 40 }]);
        }, 3000);
        return () => clearInterval(interval);
    }
  }, [activeTab, isAdmin]);

  const filteredLogs = useMemo(() => logs.filter(l => l.action.toLowerCase().includes(searchTerm.toLowerCase()) || l.details.toLowerCase().includes(searchTerm.toLowerCase())), [logs, searchTerm]);

  const exportConfig = () => {
    const data = JSON.stringify({ theme: localStorage.getItem('ui_preferences'), accent: localStorage.getItem('pulse_accent_color') });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config_export.json';
    a.click();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const data = JSON.parse(ev.target?.result as string);
        if (data.theme) localStorage.setItem('ui_preferences', data.theme);
        if (data.accent) localStorage.setItem('pulse_accent_color', data.accent);
        AuditService.log('CONFIG', 'Imported configuration');
        alert('Config imported');
    };
    reader.readAsText(file);
  };

    const tabs = [
    { id: 'system', label: 'System Config', icon: Cog },
    { id: 'core', label: 'Core Mapping (OS)', icon: Activity },
    { id: 'design-system', label: 'Architecture & Design System', icon: Palette },
    { id: 'ui', label: 'UI/UX Preferences', icon: Palette },
    { id: 'language', label: 'Language & Localization', icon: Languages },
    { id: 'account', label: 'Account', icon: CreditCard },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldAlert }] : []),
  ] as const;

  // State for Core Mapping
  const { systemConfig, setSystemConfig } = useSystemState();
  const coreSensitivity = systemConfig.azrailCoreSensitivity;
  const setCoreSensitivity = (v: number) => setSystemConfig({ ...systemConfig, azrailCoreSensitivity: v });
  const cloudRatio = systemConfig.cloudLocalRatio;
  const setCloudRatio = (v: number) => setSystemConfig({ ...systemConfig, cloudLocalRatio: v });
  const swarmPriority = systemConfig.swarmPriority;
  const setSwarmPriority = (v: number) => setSystemConfig({ ...systemConfig, swarmPriority: v });
  const securityLevel = systemConfig.securityAlertLevel;
  const setSecurityLevel = (v: number) => setSystemConfig({ ...systemConfig, securityAlertLevel: v });
  const [apiKey, setApiKey] = useState('sk-live-...');
  const [telemetryFilter, setTelemetryFilter] = useState('Global Node');

  return (
    <div className="flex flex-col md:flex-row h-full bg-zinc-950 text-zinc-100 font-sans">
      {/* Navigation Sidebar */}
      <div className="w-full md:w-72 border-r border-white/10 p-6 space-y-8 overflow-y-auto">
        <div className="flex flex-col gap-4">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-fit text-sm font-mono uppercase tracking-wider"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
            <input placeholder="Search settings..." className="w-full bg-white/5 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-white/5 focus:border-pulse-primary outline-none" />
        </div>
        <nav className="space-y-1">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-pulse-primary/20 text-pulse-primary' : 'hover:bg-white/5 text-zinc-400'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{tab.label}</span>
            </motion.button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
            <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl space-y-8"
            >
                <h2 className="text-3xl font-bold tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
                <div className="space-y-6">
                    {activeTab === 'system' && (
                        <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                            <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">System Utilities</h2>
                            <motion.button whileHover={{scale: 1.01}} whileTap={{scale: 0.99}} onClick={triggerDiagnostics} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 px-4 text-sm font-medium"><Activity className="w-4 h-4"/> Diagnostics</motion.button>
                            <motion.button whileHover={{scale: 1.01}} whileTap={{scale: 0.99}} onClick={triggerPulseWave} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 px-4 text-sm font-medium"><Waves className="w-4 h-4"/> Pulse Wave</motion.button>
                        </div>
                    )}

                    {activeTab === 'core' && (
                        <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-8 font-mono">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="p-3 bg-pulse-primary/20 rounded-2xl">
                                    <Cog className="w-6 h-6 text-pulse-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold uppercase tracking-wider text-white">System Settings & Configuration Mapping</h2>
                                    <p className="text-xs text-zinc-500 uppercase">Modular settings panel view, based on conceptual data from Pulse OC</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                {/* Sliders */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">AZRAIL Core Sensitivity</span>
                                            <span className="text-pulse-primary">{coreSensitivity}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={coreSensitivity} onChange={(e) => setCoreSensitivity(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pulse-primary" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">Cloud/Local Processing Ratio</span>
                                            <span className="text-pulse-primary">{cloudRatio}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={cloudRatio} onChange={(e) => setCloudRatio(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pulse-primary" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">Swarm Intelligence priority</span>
                                            <span className="text-pulse-primary">{swarmPriority}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={swarmPriority} onChange={(e) => setSwarmPriority(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pulse-primary" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">Security threat alert level</span>
                                            <span className="text-pulse-primary">{securityLevel}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={securityLevel} onChange={(e) => setSecurityLevel(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pulse-primary" />
                                    </div>
                                </div>

                                {/* Inputs and Selects */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">Marketplace API keys</span>
                                        </div>
                                        <div className="relative">
                                            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-pulse-primary outline-none transition-colors" />
                                            <CreditCard className="w-4 h-4 absolute right-4 top-3 text-zinc-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">Global Node telemetry filters</span>
                                        </div>
                                        <div className="relative">
                                            <select value={telemetryFilter} onChange={(e) => setTelemetryFilter(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-pulse-primary outline-none appearance-none cursor-pointer text-zinc-300">
                                                <option value="Global Node">Global Node</option>
                                                <option value="Local Edge">Local Edge</option>
                                                <option value="Swarm Only">Swarm Only</option>
                                            </select>
                                            <div className="absolute right-4 top-3 pointer-events-none">
                                                <div className="w-2 h-2 border-b-2 border-r-2 border-zinc-500 transform rotate-45 translate-y-[-2px]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'design-system' && (
                        <ArchitectureReport />
                    )}

                    {activeTab === 'ui' && (
                        <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-6">
                            <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Appearance</h2>
                            
                            {/* DeepWork Focus Mode Switch */}
                            <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-3 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                            <h3 className="text-sm font-mono font-bold text-purple-300 uppercase tracking-wider">
                                                {language === 'ru' ? 'ГЛУБОКАЯ РАБОТА (РЕЖИМ ФОКУСИРОВКИ)' : 'DEEPWORK FOCUS MODE'}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-zinc-300">
                                            {language === 'ru' 
                                                ? 'Подавляет все несущественные анимации интерфейса, упрощает иерархию компонентов для снижения когнитивной нагрузки и активирует низкочастотный медитативный звуковой контекст (40Hz).'
                                                : 'Suppresses non-essential UI animations, simplifies component hierarchy to reduce cognitive load, and configures low-frequency meditative audio context (40Hz).'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                        <input 
                                            type="checkbox" 
                                            checked={isDeepWork} 
                                            onChange={toggleDeepWork} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white shadow-[0_0_15px_#a855f7]"></div>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-purple-500/20 text-[10px] font-mono text-purple-300/80">
                                    <span>• Audio: 40Hz Meditative Drone</span>
                                    <span>• UI: Simplified Hierarchy</span>
                                    <span>• Motion: Suppressed FX</span>
                                </div>
                            </div>

                            {/* Dynamic Contrast Engine */}
                            <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-wider">
                                            {language === 'ru' ? 'ДИНАМИЧЕСКАЯ КОНТРАСТНОСТЬ' : 'DYNAMIC CONTRAST MECHANISM'}
                                        </h3>
                                        <p className="text-xs text-zinc-400">
                                            {language === 'ru'
                                                ? 'Автоматически адаптирует CSS-переменные палитры для высокой читаемости и сохранения премиального темного стиля в любых условиях освещения.'
                                                : 'Automatically adapts CSS color variables for readability while preserving the premium dark aesthetic across display environments.'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                        <input 
                                            type="checkbox" 
                                            checked={contrastConfig.autoAdapt} 
                                            onChange={toggleAutoAdapt} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 peer-checked:after:bg-white"></div>
                                    </label>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-cyan-500/20">
                                    <button
                                        onClick={() => setContrastMode('standard')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${contrastConfig.contrastMode === 'standard' ? 'bg-cyan-500 text-black font-bold' : 'bg-black/40 text-zinc-400 hover:text-white'}`}
                                    >
                                        Standard Dark
                                    </button>
                                    <button
                                        onClick={() => setContrastMode('high')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${contrastConfig.contrastMode === 'high' ? 'bg-cyan-500 text-black font-bold' : 'bg-black/40 text-zinc-400 hover:text-white'}`}
                                    >
                                        High Contrast
                                    </button>
                                    <button
                                        onClick={() => setContrastMode('ultra-dark')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${contrastConfig.contrastMode === 'ultra-dark' ? 'bg-cyan-500 text-black font-bold' : 'bg-black/40 text-zinc-400 hover:text-white'}`}
                                    >
                                        Ultra OLED
                                    </button>
                                </div>
                            </div>

                            {/* John Maeda's Simplicity Mode Toggle */}
                            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-mono font-bold text-indigo-400 uppercase tracking-wider">
                                            {language === 'ru' ? 'РЕЖИМ ПРОСТОТЫ ДЖОНА МАЭДЫ (10 ЗАКОНОВ)' : "JOHN MAEDA'S SIMPLICITY MODE (10 LAWS)"}
                                        </h3>
                                        <p className="text-xs text-zinc-400">
                                            {language === 'ru' 
                                                ? 'Оптимизирует плотность интерфейса, выгружает фоновые процессы WebGL, отключает лишние анимации и максимизирует время отклика.'
                                                : 'Optimizes layout density, unloads background WebGL processes, disables redundant animations, and maximizes response latency.'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                        <input 
                                            type="checkbox" 
                                            checked={uiPreferences.simplicityMode} 
                                            onChange={() => setUIPreferences({ ...uiPreferences, simplicityMode: !uiPreferences.simplicityMode })} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-white/5 text-[9px] font-mono text-zinc-500">
                                    <span>[01] REDUCE</span>
                                    <span>[02] ORGANIZE</span>
                                    <span>[03] TIME</span>
                                    <span>[04] LEARN</span>
                                    <span>[05] DIFFERENCES</span>
                                    <span>[06] CONTEXT</span>
                                    <span>[07] EMOTION</span>
                                    <span>[08] TRUST</span>
                                    <span>[09] FAILURE</span>
                                    <span>[10] THE ONE</span>
                                </div>
                            </div>

                            <motion.button 
                                whileHover={{scale: 1.01}} whileTap={{scale: 0.99}}
                                onClick={() => setIsLight(!isLight)}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors w-full bg-white/10 hover:bg-white/15"
                            >
                                {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                <span>Theme: {isLight ? t('themeDark') : t('themeLight')}</span>
                            </motion.button>
                            
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-400">Accent Color:</span>
                                <div className="flex gap-2">
                                    <motion.button whileHover={{scale: 1.2}} onClick={() => ConfigService.set('pulse_accent_color', 'purple')} className="w-8 h-8 rounded-full bg-[#7B4DFF]" />
                                    <motion.button whileHover={{scale: 1.2}} onClick={() => ConfigService.set('pulse_accent_color', 'cyan')} className="w-8 h-8 rounded-full bg-[#06b6d4]" />
                                    <motion.button whileHover={{scale: 1.2}} onClick={() => ConfigService.set('pulse_accent_color', 'amber')} className="w-8 h-8 rounded-full bg-[#f59e0b]" />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-6">
                                <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Accessibility & Productivity</h2>
                                
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-medium">Text-to-Speech (Accessibility)</h3>
                                        <p className="text-xs text-zinc-400">Automatically reads AI responses aloud in Chat & Studio modules.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                        <input 
                                            type="checkbox" 
                                            checked={uiPreferences.ttsEnabled} 
                                            onChange={() => setUIPreferences({ ...uiPreferences, ttsEnabled: !uiPreferences.ttsEnabled })} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pulse-primary peer-checked:after:bg-white"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-medium">Focus Mode (Dim Surroundings)</h3>
                                        <p className="text-xs text-zinc-400">Dims non-active UI elements to reduce cognitive load while working.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                        <input 
                                            type="checkbox" 
                                            checked={uiPreferences.focusMode} 
                                            onChange={() => setUIPreferences({ ...uiPreferences, focusMode: !uiPreferences.focusMode })} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pulse-primary peer-checked:after:bg-white"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-4">Motion Controller</h2>
                                <GlobalMotionController isLight={isLight} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'language' && (
                        <div className="space-y-6">
                            {/* Language Configuration */}
                            <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-6">
                                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                    <div className="p-3 bg-pulse-primary/20 rounded-2xl">
                                        <Languages className="w-6 h-6 text-pulse-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold uppercase tracking-wider text-white">Localization & Scenarios</h2>
                                        <p className="text-xs text-zinc-500 uppercase">System Language Configuration</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button 
                                        onClick={() => setLanguage('en')}
                                        className={`p-6 rounded-2xl text-left border transition-all ${language === 'en' ? 'bg-pulse-primary/10 border-pulse-primary' : 'bg-black/40 border-white/5 hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-white uppercase tracking-widest">English (Global)</h3>
                                            <div className={`w-3 h-3 rounded-full ${language === 'en' ? 'bg-pulse-primary shadow-[0_0_10px_#7B4DFF]' : 'bg-zinc-700'}`}></div>
                                        </div>
                                        <p className="text-xs text-zinc-400 mb-2 font-mono uppercase">Scenario: Global Deployment</p>
                                        <p className="text-sm text-zinc-500">Standard nomenclature for international operations, Edge Node telemetry, and AZRAIL Core global administration. Recommended for distributed teams and Cloudflare global sync.</p>
                                    </button>

                                    <button 
                                        onClick={() => setLanguage('ru')}
                                        className={`p-6 rounded-2xl text-left border transition-all ${language === 'ru' ? 'bg-pulse-primary/10 border-pulse-primary' : 'bg-black/40 border-white/5 hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-white uppercase tracking-widest">Русский (Локальный)</h3>
                                            <div className={`w-3 h-3 rounded-full ${language === 'ru' ? 'bg-pulse-primary shadow-[0_0_10px_#7B4DFF]' : 'bg-zinc-700'}`}></div>
                                        </div>
                                        <p className="text-xs text-zinc-400 mb-2 font-mono uppercase">Сценарий: Локальный Хаб</p>
                                        <p className="text-sm text-zinc-500">Полная локализация интерфейса, модулей сборки и телеметрии. Рекомендуется для локальных лабораторий, русскоязычных команд и тестирования архитектуры в СНГ регионе.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Complete Application Manual */}
                            <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-8 font-sans">
                                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-zinc-800 rounded-2xl">
                                            <BookOpen className="w-6 h-6 text-zinc-300" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold uppercase tracking-wider text-white">System Manual & Directory</h2>
                                            <p className="text-xs text-zinc-500 uppercase">Complete documentation from A to Z</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsDocModalOpen(true)} className="px-4 py-2 bg-pulse-primary/20 text-pulse-primary rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-pulse-primary hover:text-white transition-all">
                                        Open Blueprint
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        {
                                            id: "01",
                                            title: "AZRAIL Core Engine (Центральное Ядро)",
                                            description: "The primary artificial intelligence orchestrator and nervous system of Pulse OS.",
                                            usage: "Automatically processes complex logical tasks, manages agent swarms, and optimizes cloud/local resource distribution.",
                                            application: "Used as the baseline brain for the whole UI. It continuously runs in the background. Navigate to 'Core Mapping' to adjust its sensitivity and threat response.",
                                            load: "Pre-loaded on boot (WASM Module #1)."
                                        },
                                        {
                                            id: "02",
                                            title: "Agent Swarm (Рой Агентов)",
                                            description: "A collective of specialized nano-agents performing parallel tasks.",
                                            usage: "Executing mass-data processing, web scraping, and UI auto-testing in real time.",
                                            application: "Deployed automatically by AZRAIL when processing loads exceed threshold. Supervised via the DevOps Command Panel.",
                                            load: "Dynamically instantiated upon demand."
                                        },
                                        {
                                            id: "03",
                                            title: "DevOps CI/CD Console (Консоль Развертывания)",
                                            description: "Real-time command center for build status, UI testing, and Cloudflare Edge deployment.",
                                            usage: "Monitors WebAssembly compilation, verifies Color/Typography/Animation specifications, and pushes updates to 56 global nodes.",
                                            application: "Navigate to the Admin Panel -> DevOps. Click 'INITIALIZE DEPLOYMENT' to trigger a live production sync.",
                                            load: "Loaded on demand from the Admin Settings."
                                        },
                                        {
                                            id: "04",
                                            title: "Global Knowledge Hub (Глобальный Хаб Знаний)",
                                            description: "A structured, 3D index tree containing project data, telemetry streams, and cognitive memory.",
                                            usage: "Searching historical interactions, reviewing R2 Storage mirrors, and retrieving semantic context.",
                                            application: "Accessible via the main dashboard's central globe widget. Used to feed context to AZRAIL.",
                                            load: "Connected via persistent WebSocket to P2P CRDT storage."
                                        },
                                        {
                                            id: "05",
                                            title: "Pulse Studio & Lab (Студия и Лаборатория)",
                                            description: "Creative environments for designing UI architectures and testing agent behaviors.",
                                            usage: "Drafting color swatches, fine-tuning 'Globe Respiration' physics, and defining Typography rules.",
                                            application: "Found in Settings -> Design System. Used by UX engineers to enforce <STD> standards.",
                                            load: "Client-side initialized modules."
                                        },
                                        {
                                            id: "06",
                                            title: "Security Shield Layer (Уровень Безопасности)",
                                            description: "Zero-Trust network architecture and biometric enclave for threat mitigation.",
                                            usage: "Blocking unauthorized API access and encrypting local states.",
                                            application: "Configured via Admin Panel -> Security. Allows adjusting 'Security threat alert level'.",
                                            load: "Always active, acts as a middleware interceptor."
                                        },
                                        {
                                            id: "07",
                                            title: "Telemetry & Status Visualization Maps (Карты Телеметрии)",
                                            description: "Real-time data flow tracking rendering latency, network load, and error logs.",
                                            usage: "Providing visual feedback on the health of the 56 nodes network and P2P sync status.",
                                            application: "Embedded in DevOps and Architecture panels. Monitor the glowing pulses and data streams to ensure system integrity.",
                                            load: "Subscribes to live edge metrics."
                                        }
                                    ].map((module) => (
                                        <div key={module.id} className="bg-black/30 border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-pulse-primary/30 transition-all">
                                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] font-mono text-8xl font-bold group-hover:opacity-10 group-hover:text-pulse-primary transition-all pointer-events-none">
                                                {module.id}
                                            </div>
                                            <div className="relative z-10 space-y-4">
                                                <h3 className="text-base font-bold text-white uppercase tracking-widest">{module.id}. {module.title}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">What it does (Описание)</p>
                                                        <p className="text-zinc-300">{module.description}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">How to use (Сценарий)</p>
                                                        <p className="text-zinc-300">{module.usage}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Application (Применение)</p>
                                                        <p className="text-zinc-300">{module.application}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Loading (Загрузка)</p>
                                                        <p className="text-emerald-400/80 font-mono text-xs">{module.load}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                            <h2 className="text-sm font-mono text-zinc-400 uppercase">Account</h2>
                            <button
                                onClick={onUpgrade}
                                className="w-full py-3 rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all shadow-lg bg-gradient-to-r from-pulse-primary to-pulse-accent text-white hover:shadow-pulse-primary/20"
                            >
                                {t('upgradePlan')}
                            </button>
                        </div>
                    )}

                    {activeTab === 'admin' && isAdmin && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                                    <h2 className="text-sm font-mono text-zinc-400">System Diagnostics</h2>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={healthData}>
                                                <XAxis dataKey="time" hide />
                                                <YAxis hide />
                                                <RechartsTooltip contentStyle={{backgroundColor: '#18181b', border: 'none'}} />
                                                <Line type="monotone" dataKey="cpu" stroke="#7B4DFF" dot={false} />
                                                <Line type="monotone" dataKey="memory" stroke="#06b6d4" dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                                    <h2 className="text-sm font-mono text-zinc-400">Configuration</h2>
                                    <div className="flex gap-2">
                                        <button onClick={exportConfig} className="flex-1 py-2 bg-white/5 rounded-lg flex items-center justify-center gap-2"><Download className="w-4 h-4"/> Export</button>
                                        <label className="flex-1 py-2 bg-white/5 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                                            <Upload className="w-4 h-4"/> Import
                                            <input type="file" onChange={importConfig} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                                <h2 className="text-sm font-mono text-zinc-400 uppercase">User Roles</h2>
                                {users.map(u => (
                                    <div key={u.name} className="flex justify-between text-xs font-mono py-2 border-b border-white/5">
                                        <span>{u.name}</span>
                                        <select value={u.role} onChange={e => setUsers(prev => prev.map(user => user.name === u.name ? {...user, role: e.target.value} : user))} className="bg-transparent text-pulse-primary">
                                            <option value="Owner">Owner</option>
                                            <option value="Admin">Admin</option>
                                            <option value="User">User</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-mono text-zinc-400 uppercase">Audit Log</h2>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-2 top-2.5 text-zinc-500"/>
                                        <input placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white/5 pl-8 pr-4 py-2 rounded-lg text-xs font-mono" />
                                    </div>
                                </div>
                                <div className="space-y-2 h-48 overflow-y-auto">
                                    {filteredLogs.map((log, i) => (
                                        <div key={i} className="text-xs font-mono border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span> - {log.action}: {log.details}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
      </div>

      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        isLight={isLight}
        currentPath={location.pathname}
      />
    </div>
  );
}
