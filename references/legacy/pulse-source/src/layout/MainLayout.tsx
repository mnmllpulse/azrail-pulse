import { motion, AnimatePresence } from 'motion/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Sun, Moon, Bot, Cpu, LayoutGrid, Music, Video, Image as ImageIcon, Sparkles, CreditCard, BookOpen, ShieldAlert, Globe, Keyboard, Terminal } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { PlanetCanvas } from '../components/PlanetCanvas';
import VoiceInputButton from '../components/VoiceInputButton';
import UniversalFileAction from '../components/UniversalFileAction';
import CommandPalette from '../components/CommandPalette';
import TelegramBotsPortal from '../components/TelegramBotsPortal';
import QuickActions from '../components/QuickActions';
import PricingModal from '../components/PricingModal';
import { Sidebar } from '../components/Sidebar';
import ThorButton from '../components/ThorButton';
import { LiquidMeshCanvas } from '../components/LiquidMeshCanvas';
import { AudioWaveform } from '../components/AudioWaveform';
import { CRTOverlay } from '../components/CRTOverlay';
import { KeyboardShortcutManager } from '../components/KeyboardShortcutManager';
import { AgeGate } from '../components/common/AgeGate';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import AdminPanel from '../components/AdminPanel';
import { AzrailMemoryCorePanel } from '../components/AzrailMemoryCorePanel';
import { SystemConsole } from '../components/SystemConsole';
import { PulsePersonalization } from '../components/PulsePersonalization';
import SystemSyncIndicator from '../components/SystemSyncIndicator';
import { useLanguage, LANGUAGES, Language } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { useGlobalMotion } from '../contexts/GlobalMotionContext';
import LayoutEngine from '../components/common/LayoutEngine';
import NeuralTimeline from '../components/common/NeuralTimeline';
import UserGuideDrawer from '../components/UserGuideDrawer';
import { ConfigService } from '../services/ConfigService';
import { DocumentationModal } from '../components/common/DocumentationModal';
import { Tooltip } from '../components/common/Tooltip';
import { GestureNavigationProvider, useGestureNavigation } from '../contexts/GestureNavigationContext';
import { GestureNavigationIndicator } from '../components/common/GestureNavigationIndicator';
import { AnimatedPlanet } from '../components/AnimatedPlanet';
import { InteractionRipple } from '../components/InteractionRipple';
import { DeepWorkProvider, useDeepWork } from '../contexts/DeepWorkContext';
import { useAudio } from '../contexts/AudioContext';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { SystemPulseHeaderIndicator } from '../components/SystemPulseHeaderIndicator';
import { SystemPulseIndicator } from '../components/SystemPulseIndicator';
import { HeaderSpaceAudioControl } from '../components/HeaderSpaceAudioControl';
import { IdleSaver } from '../components/IdleSaver';
import { useDynamicContrast } from '../hooks/useDynamicContrast';
import { CloudflareWorkspaceBar } from '../components/CloudflareWorkspaceBar';

function MainLayoutContent() {
  const [time, setTime] = useState<Date>(new Date());
  const [isTelegramPortalOpen, setIsTelegramPortalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [activeStudio, setActiveStudio] = useState('agent');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [accentColor, setAccentColor] = useState<'purple' | 'cyan' | 'amber'>(() => {
    return ConfigService.get('pulse_accent_color', 'purple') as 'purple' | 'cyan' | 'amber';
  });

  const { language, setLanguage, t, isTranslating, smartTranslate } = useLanguage();
  const { activeShader, triggerDiagnostics, triggerPulseWave, exportSystemLogs, uiPreferences, setUIPreferences, hoverPreload } = useSystemState();
  const { getTransition, getVariants, config: globalMotionConfig } = useGlobalMotion();
  const { slideDirection } = useGestureNavigation();
  const { setSoundscape } = useAudio();
  const { isDeepWork, toggleDeepWork } = useDeepWork();
  const location = useLocation();
  const navigate = useNavigate();
  const [globalVoiceInput, setGlobalVoiceInput] = useState('');
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  // Minimalist Voice Navigation Handler
  const handleVoiceCommand = (rawCommand: string) => {
    const cmd = rawCommand.toLowerCase();
    
    if (cmd.includes('dna') || cmd.includes('днк')) {
      navigate('/studio/dna');
      setVoiceToast('Navigated to DNA Studio');
    } else if (cmd.includes('code') || cmd.includes('код')) {
      navigate('/studio/code');
      setVoiceToast('Navigated to Code Studio');
    } else if (cmd.includes('web') || cmd.includes('веб')) {
      navigate('/studio/web');
      setVoiceToast('Navigated to Web Studio');
    } else if (cmd.includes('audio') || cmd.includes('music') || cmd.includes('звук') || cmd.includes('музыка')) {
      navigate('/studio/audio');
      setVoiceToast('Navigated to Audio Studio');
    } else if (cmd.includes('video') || cmd.includes('видео')) {
      navigate('/studio/video');
      setVoiceToast('Navigated to Video Studio');
    } else if (cmd.includes('image') || cmd.includes('изображен')) {
      navigate('/studio/image');
      setVoiceToast('Navigated to Image Studio');
    } else if (cmd.includes('dashboard') || cmd.includes('дашборд') || cmd.includes('главн')) {
      navigate('/dashboard');
      setVoiceToast('Navigated to Dashboard');
    } else if (cmd.includes('history') || cmd.includes('история')) {
      navigate('/history');
      setVoiceToast('Navigated to History');
    } else if (cmd.includes('deep work') || cmd.includes('глубокая работа')) {
      toggleDeepWork();
      setVoiceToast('Toggled DeepWork Mode');
    }

    setTimeout(() => setVoiceToast(null), 3000);
  };

  const { isListening: isVoiceListening, startListening: startVoiceListening } = useVoiceCommands(handleVoiceCommand);

  // AutoAdaptiveUI: Determine which components to show based on context
  const AutoAdaptiveUI = (componentName: string) => {
    if (uiPreferences.simplicityMode) return false;
    
    // Logic to determine visibility based on path
    const path = location.pathname;
    
    if (path.startsWith('/studio')) {
      // In a studio, hide some global noise
      if (['Sidebar', 'SystemSyncIndicator'].includes(componentName)) return true;
      return false; // Hide others by default in studio
    }
    
    return true; // Show everything else
  };

  const isLight = uiPreferences.theme === 'light';
  const setIsLight = (light: boolean) => {
    setUIPreferences({ ...uiPreferences, theme: light ? 'light' : 'dark' });
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [isLight]);

  // Accent Color CSS variable updates
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('pulse_accent_color', accentColor);
    
    if (accentColor === 'cyan') {
      root.style.setProperty('--pulse-primary', '#06b6d4');
      root.style.setProperty('--pulse-accent', '#67e8f9');
      root.style.setProperty('--pulse-deep', '#0891b2');
      root.style.setProperty('--border-subtle', 'rgba(6, 182, 212, 0.15)');
      root.style.setProperty('--pulse-glow', 'rgba(6, 182, 212, 0.3)');
    } else if (accentColor === 'amber') {
      root.style.setProperty('--pulse-primary', '#f59e0b');
      root.style.setProperty('--pulse-accent', '#fcd34d');
      root.style.setProperty('--pulse-deep', '#d97706');
      root.style.setProperty('--border-subtle', 'rgba(245, 158, 11, 0.15)');
      root.style.setProperty('--pulse-glow', 'rgba(245, 158, 11, 0.3)');
    } else {
      // Default Purple
      root.style.setProperty('--pulse-primary', '#7840ff');
      root.style.setProperty('--pulse-accent', '#3bccff');
      root.style.setProperty('--pulse-deep', '#6e3bff');
      root.style.setProperty('--border-subtle', 'rgba(120, 64, 255, 0.1)');
      root.style.setProperty('--pulse-glow', 'rgba(120, 64, 255, 0.3)');
    }
  }, [accentColor]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDragonPremium, setShowDragonPremium] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isSystemConsoleOpen, setIsSystemConsoleOpen] = useState(false);
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);

  return (
    <AgeGate>
      <KeyboardShortcutManager 
        isLight={isLight}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleCommandPalette={() => setIsCommandPaletteOpen(!isCommandPaletteOpen)}
        onToggleTheme={() => setIsLight(!isLight)}
        onTriggerPulse={triggerPulseWave}
        onTriggerDiagnostics={triggerDiagnostics}
        onOpenPersonalization={() => setIsPersonalizationOpen(true)}
        onToggleSystemConsole={() => setIsSystemConsoleOpen(prev => !prev)}
        onCloseAll={() => {
          setIsCommandPaletteOpen(false);
          setIsTelegramPortalOpen(false);
          setIsPricingModalOpen(false);
          setIsAdminPanelOpen(false);
          setIsTimelineOpen(false);
          setIsMemoryPanelOpen(false);
          setIsSystemConsoleOpen(false);
        }}
      />
      <div className={`flex h-screen overflow-hidden selection:bg-pulse-primary/30 ${isLight ? 'bg-white' : 'bg-depth-space'}`}>
        {/* Sidebar Navigation */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          isLight={isLight} 
          onToggleTheme={() => setIsLight(!isLight)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          onOpenTimeline={() => setIsTimelineOpen(true)}
          language={language}
          setLanguage={setLanguage}
          onUpgrade={() => {
            setIsPricingModalOpen(true);
            setShowDragonPremium(true);
            setTimeout(() => setShowDragonPremium(false), 8000);
          }}
          onOpenMemoryPanel={() => setIsMemoryPanelOpen(true)}
          onOpenPersonalization={() => setIsPersonalizationOpen(true)}
        />

        <div className="flex-1 flex flex-col min-w-0 h-full p-4 relative">
          {/* Voice Command Execution Toast */}
          <AnimatePresence>
            {voiceToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-indigo-950/90 border border-cyan-400/60 text-cyan-300 font-mono text-xs shadow-[0_0_20px_rgba(56,189,248,0.5)] backdrop-blur-md flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>{voiceToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Three.js Liquid Mesh Background */}
          <LiquidMeshCanvas />

          {/* CRT Effect Overlay */}
          {AutoAdaptiveUI('CRTOverlay') && <CRTOverlay />}

          {/* Audio Waveform / Listening Mode */}
          {AutoAdaptiveUI('AudioWaveform') && <AudioWaveform />}

          {/* Ambient Background Shader */}
          {AutoAdaptiveUI('AmbientShaderBackground') && !isLight && !uiPreferences.simplicityMode && <AmbientShaderBackground shader={activeShader} isLight={isLight} />}

          {/* Cinematic Background Glows */}
          {!isLight && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pulse-primary/5 blur-[120px] animate-pulse" />
              <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-pulse-deep/5 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
          )}

          {/* Background Noise/Grid */}
          <div 
            className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${isLight ? '%23000000' : '%23ffffff'}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />

          {/* Header */}
          <header className="flex items-center justify-between mb-6 px-2 shrink-0 relative z-20">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex items-center gap-3 relative"
            >
              <div className="relative">
                <Tooltip
                  contentEn="Access system configuration, accent colors, theme switching, and bot network integrations."
                  contentRu="Доступ к настройкам системы, акцентным цветам, переключению тем и интеграции с сетью ботов."
                  titleEn="System Preferences"
                  titleRu="Настройки системы"
                  position="bottom"
                >
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:ring-2 ring-indigo-500/50 transition-all outline-none"
                  >
                    <span className="text-[10px] font-bold">MP</span>
                  </button>
                </Tooltip>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute top-10 left-0 w-48 p-2 rounded-xl shadow-lg border flex flex-col gap-1 z-50 ${isLight ? 'bg-white border-gray-200' : 'bg-[#0F0F13] border-white/10'}`}
                    >
                      <button
                        onClick={() => { setIsTelegramPortalOpen(true); setIsProfileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase rounded-lg transition-colors w-full text-left ${isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
                      >
                        <Bot className="w-4 h-4" />
                        <span>Bots Network</span>
                      </button>
                      <button
                        onClick={() => { navigate('/studio/billing'); setIsProfileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase rounded-lg transition-colors w-full text-left ${isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Billing & Plans</span>
                      </button>
                      <button 
                        onClick={() => { setIsLight(!isLight); setIsProfileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase rounded-lg transition-colors w-full text-left ${isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
                      >
                        {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        <span>Theme: {isLight ? t('themeDark') : t('themeLight')}</span>
                      </button>

                      <div className={`border-t my-1.5 pt-1.5 px-3 ${isLight ? 'border-gray-100' : 'border-white/10'}`}>
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                          ACCENT COLOR
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => setAccentColor('purple')}
                            title="Purple Accent"
                            className={`w-4 h-4 rounded-full bg-[#7B4DFF] border transition-all hover:scale-125 ${accentColor === 'purple' ? 'border-white ring-2 ring-indigo-500/50 scale-125' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          />
                          <button 
                            onClick={() => setAccentColor('cyan')}
                            title="Cyan Accent"
                            className={`w-4 h-4 rounded-full bg-[#06b6d4] border transition-all hover:scale-125 ${accentColor === 'cyan' ? 'border-white ring-2 ring-cyan-500/50 scale-125' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          />
                          <button 
                            onClick={() => setAccentColor('amber')}
                            title="Amber Accent"
                            className={`w-4 h-4 rounded-full bg-[#f59e0b] border transition-all hover:scale-125 ${accentColor === 'amber' ? 'border-white ring-2 ring-amber-500/50 scale-125' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <h1 className={`text-lg font-medium tracking-tight flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
                DARK MNMLL PULSE OS
              </h1>
            </motion.div>

            
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest"
            >
              <SystemSyncIndicator isLight={isLight} />

              {/* Global 'Language Switcher' Component */}

              {/* User Guide / Contextual Documentation Button */}

              <div className="flex items-center gap-1">
                <Tooltip
                  contentEn="Open the Cognitive Hotkeys Terminal containing all global keyboard binding records."
                  contentRu="Открыть когнитивный терминал со списком всех глобальных сочетаний клавиш."
                  titleEn="Keyboard Register"
                  titleRu="Реестр Клавиш"
                  position="bottom"
                >
                  <button
                    onClick={() => {
                      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
                    }}
                    className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 shadow-sm' 
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip
                  contentEn="Toggle the Azrail Diagnostic Console to monitor live memory synapse logs and run integrity sweeps."
                  contentRu="Переключить диагностическую консоль Azrail для мониторинга логов и проверки целостности."
                  titleEn="Diagnostic Console"
                  titleRu="Консоль диагностики"
                  position="bottom"
                >
                  <button
                    onClick={() => {
                      setIsSystemConsoleOpen(prev => !prev);
                    }}
                    className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
                      isSystemConsoleOpen
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                        : isLight 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 shadow-sm' 
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Terminal className="w-4 h-4" />
                    <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                    </span>
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip
                  contentEn="Speak voice commands to interpret neural matrix queries and control active application channels."
                  contentRu="Произносите голосовые команды для интерпретации нейронных запросов и управления активными каналами системы."
                  titleEn="Voice Commander"
                  titleRu="Голосовой командный пульт"
                  position="bottom"
                >
                  <VoiceInputButton 
                    value={globalVoiceInput} 
                    onChange={(val) => {
                      setGlobalVoiceInput('');
                      if (val) {
                        navigate('/swarm-chat');
                      }
                    }} 
                    isLight={isLight} 
                    size="sm" 
                  />
                </Tooltip>
              </div>

              {/* Simplicity Mode Toggle Capsule */}
              <div className="flex items-center gap-1">
                <Tooltip
                  contentEn="Toggle John Maeda's 10 Laws of Simplicity Focus Mode. Reduces visual complexity, increases response speed."
                  contentRu="Включить Режим Простоты Джона Маэды (10 Законов). Убирает лишний декор, ускоряет работу."
                  titleEn="Simplicity Mode"
                  titleRu="Режим Простоты"
                  position="bottom"
                >
                  <button
                    onClick={() => setUIPreferences({ ...uiPreferences, simplicityMode: !uiPreferences.simplicityMode })}
                    className={`px-2.5 py-1.5 rounded-xl border text-[9px] font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer h-8 ${
                      uiPreferences.simplicityMode
                        ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-400 font-bold'
                        : isLight
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${uiPreferences.simplicityMode ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_#7B4DFF]' : 'bg-zinc-600'}`} />
                    <span>
                      {language === 'ru' 
                        ? (uiPreferences.simplicityMode ? 'ПРОСТОТА: ВКЛ' : 'ПРОСТОТА: ВЫКЛ') 
                        : (uiPreferences.simplicityMode ? 'SIMPLICITY: ON' : 'SIMPLICITY: OFF')}
                    </span>
                  </button>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></span>
              </div>
              <span className="hidden md:inline opacity-60">{t('domain')}: {window.location.hostname}</span>
              <span className={`${isLight ? 'text-gray-900' : 'text-white'} opacity-100`}>{time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
            </motion.div>
          </header>

          {/* Main Content Area with Smooth Page Transitions */}
          <div className={`flex-1 min-h-0 border rounded-[2rem] overflow-y-auto relative flex flex-col p-8 z-10 transition-colors backdrop-blur-md ${isLight ? 'bg-white/70 border-gray-200/80 shadow-sm' : 'bg-black/40 border-white/5'}`}>
            <CloudflareWorkspaceBar />
            <div className="pulse-runtime-notice">Рабочее ядро Cloudflare: чат, изображения, память и файлы. Экспериментальные панели сохранены; команды терминала и показатели прототипов не подтверждают реальные операции. <a href="/studio/deploy">Состояние подключения</a></div>
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: slideDirection * 60, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -slideDirection * 60, scale: 0.98 }}
                  transition={getTransition({ duration: 0.35 })}
                  className="flex-grow flex flex-col min-h-0 origin-center relative overflow-visible"
                >
                  <LayoutEngine>
                    <Outlet context={{ isLight, onUpgrade: () => {
                      setIsPricingModalOpen(true);
                      setShowDragonPremium(true);
                      setTimeout(() => setShowDragonPremium(false), 8000);
                    } }} />
                  </LayoutEngine>
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>

          {/* Footer */}
          <footer className="mt-4 flex justify-between items-center text-[9px] uppercase tracking-[0.3em] opacity-30 shrink-0 relative z-10 px-2">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="hidden sm:inline"
            >
              {t('systemArchitecture')}: AZRAIL_SOUL_PHASE_1
            </motion.span>
            <div className="flex items-center gap-2">
              <span>{t('legal')}: CC BY 4.0 / APACHE 2.0</span>
              <Settings className={`w-4 h-4 cursor-pointer transition-colors opacity-0 sm:opacity-100 ${isLight ? 'hover:text-gray-900' : 'hover:text-white'}`} />
            </div>
          </footer>
        </div>

        {/* Dragon Premium Overlay */}
        <AnimatePresence>
          {showDragonPremium && <DragonPremiumAnimation />}
        </AnimatePresence>

        <CommandPalette 
          isOpen={isCommandPaletteOpen} 
          onClose={() => setIsCommandPaletteOpen(false)} 
          isLight={isLight} 
          setIsLight={setIsLight}
          triggerDiagnostics={triggerDiagnostics}
          triggerPulseWave={triggerPulseWave}
          exportSystemLogs={exportSystemLogs}
          onOpenPersonalization={() => setIsPersonalizationOpen(true)}
        />
        <TelegramBotsPortal 
          isOpen={isTelegramPortalOpen} 
          onClose={() => setIsTelegramPortalOpen(false)} 
          isLight={isLight} 
        />
        <PricingModal 
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          isLight={isLight}
        />
        <AdminPanel 
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          isLight={isLight}
          onAction={(action) => {
            // General actions from global admin panel
            console.log('Global Admin Action:', action);
          }}
        />

        <AzrailMemoryCorePanel 
          isOpen={isMemoryPanelOpen}
          onClose={() => setIsMemoryPanelOpen(false)}
          isLight={isLight}
        />

        <SystemConsole 
          isOpen={isSystemConsoleOpen}
          onClose={() => setIsSystemConsoleOpen(false)}
          isLight={isLight}
        />

        <PulsePersonalization
          isOpen={isPersonalizationOpen}
          onClose={() => setIsPersonalizationOpen(false)}
        />

        <UserGuideDrawer
          isOpen={isUserGuideOpen}
          onClose={() => setIsUserGuideOpen(false)}
          isLight={isLight}
        />

        <DocumentationModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          isLight={isLight}
          currentPath={location.pathname}
        />

        {/* Neural Timeline Modal Overlay */}
        <AnimatePresence>
          {isTimelineOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-8"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="relative w-full max-w-4xl h-full max-h-[85vh] flex flex-col shadow-2xl"
              >
                {/* Close Button overlay */}
                <button
                  onClick={() => setIsTimelineOpen(false)}
                  className={`absolute top-4 right-4 z-50 p-2 rounded-xl border transition-all cursor-pointer ${
                    isLight 
                      ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' 
                      : 'bg-[#090514]/80 border-white/10 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  ✕ Close
                </button>
                <div className="flex-1 overflow-hidden rounded-2xl">
                  <NeuralTimeline isLight={isLight} onClose={() => setIsTimelineOpen(false)} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global SVG Filters for Liquid Motion */}
        <svg className="hidden">
          <defs>
            <filter id="liquid-filter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="liquid" />
              <feComposite in="SourceGraphic" in2="liquid" operator="atop" />
            </filter>
          </defs>
        </svg>

        {/* Floating Minimalist Gesture Navigation Bar */}
        <GestureNavigationIndicator isLight={isLight} />
      </div>
    </AgeGate>
  );
}

export default function MainLayout() {
  return (
    <GestureNavigationProvider>
      <DeepWorkProvider>
        <MainLayoutContent />
      </DeepWorkProvider>
    </GestureNavigationProvider>
  );
}

function DragonPremiumAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200000] bg-black/90 flex items-center justify-center pointer-events-none overflow-hidden"
    >
      {/* Thunder Flashes */}
      <motion.div
        animate={{ opacity: [0, 1, 0, 1, 0] }}
        transition={{ duration: 0.5, repeat: 10, repeatType: "reverse" }}
        className="absolute inset-0 bg-white/10"
      />
      
      {/* Epic Text */}
      <div className="relative z-10 text-center space-y-4">
        <motion.h2
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-7xl font-bold text-white tracking-tighter drop-shadow-[0_0_50px_rgba(123,77,255,0.8)]"
        >
          DRAGON ASCENSION
        </motion.h2>
        <p className="text-xl font-mono text-purple-400 uppercase tracking-[1em] animate-pulse">Premium Matrix Activated</p>
      </div>

      {/* Dragon Elements (Animated SVGs) */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: i % 2 === 0 ? -1000 : 1000, y: 500, rotate: i % 2 === 0 ? 45 : -45, opacity: 0 }}
          animate={{ x: i % 2 === 0 ? 1000 : -1000, y: -500, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4, delay: i * 1.5, ease: "easeInOut", repeat: Infinity }}
          className="absolute"
        >
          <svg viewBox="0 0 100 100" className="w-96 h-96 text-purple-600/40">
            <path d="M10,50 Q25,25 40,50 T70,50 T90,50" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="90" cy="50" r="2" fill="currentColor" />
          </svg>
        </motion.div>
      ))}

      {/* Particle Rain */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -10, x: Math.random() * window.innerWidth, opacity: 0 }}
            animate={{ y: window.innerHeight + 10, opacity: [0, 1, 0] }}
            transition={{ duration: 2, delay: Math.random() * 5, repeat: Infinity }}
            className="absolute w-[1px] h-20 bg-gradient-to-b from-purple-500 to-transparent"
          />
        ))}
      </div>
    </motion.div>
  );
}

function AmbientShaderBackground({ shader, isLight }: { shader: string; isLight: boolean }) {
  // Configure the lights depending on the shader and light mode
  let lights: { color: string; size: string; x: number[]; y: number[]; duration: number; delay: number }[] = [];

  if (isLight) {
    switch (shader) {
      case 'cosmic-pulse':
        lights = [
          { color: 'bg-indigo-300/20', size: 'w-[45vw] h-[45vw]', x: [0, 60, -30, 0], y: [0, -40, 30, 0], duration: 22, delay: 0 },
          { color: 'bg-purple-300/20', size: 'w-[40vw] h-[40vw]', x: [0, -40, 40, 0], y: [0, 50, -30, 0], duration: 18, delay: 2 },
          { color: 'bg-pink-200/15', size: 'w-[35vw] h-[35vw]', x: [0, 30, -50, 0], y: [0, 40, 50, 0], duration: 26, delay: 4 },
        ];
        break;
      case 'quantum-aurora':
        lights = [
          { color: 'bg-teal-200/20', size: 'w-[50vw] h-[35vw]', x: [-30, 60, -15, -30], y: [-15, 30, -40, -15], duration: 19, delay: 0 },
          { color: 'bg-emerald-200/15', size: 'w-[40vw] h-[40vw]', x: [40, -40, 30, 40], y: [30, -50, 15, 30], duration: 24, delay: 1 },
          { color: 'bg-sky-200/20', size: 'w-[45vw] h-[45vw]', x: [-15, 40, -40, -15], y: [40, 15, -30, 40], duration: 28, delay: 3 },
        ];
        break;
      case 'cyber-pulse':
        lights = [
          { color: 'bg-amber-200/20', size: 'w-[45vw] h-[45vw]', x: [0, 40, -20, 0], y: [0, -30, 40, 0], duration: 16, delay: 0 },
          { color: 'bg-orange-200/15', size: 'w-[40vw] h-[40vw]', x: [30, -35, 20, 30], y: [20, 30, -35, 20], duration: 20, delay: 2 },
          { color: 'bg-rose-200/15', size: 'w-[35vw] h-[35vw]', x: [-20, 30, -30, -20], y: [-30, 20, 30, -20], duration: 18, delay: 4 },
        ];
        break;
      case 'monochrome':
        lights = [
          { color: 'bg-slate-300/15', size: 'w-[45vw] h-[45vw]', x: [0, 30, -30, 0], y: [0, -30, 30, 0], duration: 28, delay: 0 },
          { color: 'bg-zinc-200/20', size: 'w-[50vw] h-[50vw]', x: [0, -20, 20, 0], y: [0, 20, -20, 0], duration: 25, delay: 3 },
        ];
        break;
      case 'solar-eclipse':
        lights = [
          { color: 'bg-yellow-200/25', size: 'w-[40vw] h-[40vw]', x: [15, -20, 25, 15], y: [-20, 25, -15, -20], duration: 18, delay: 0 },
          { color: 'bg-orange-100/20', size: 'w-[45vw] h-[45vw]', x: [-25, 20, -20, -25], y: [25, -20, 20, 25], duration: 22, delay: 2 },
          { color: 'bg-amber-200/15', size: 'w-[35vw] h-[35vw]', x: [20, -25, 15, 20], y: [-15, 20, -25, -15], duration: 20, delay: 4 },
        ];
        break;
    }
  } else {
    // Dark mode colors (subtle dark glowing values)
    switch (shader) {
      case 'cosmic-pulse':
        lights = [
          { color: 'bg-indigo-600/10', size: 'w-[55vw] h-[55vw]', x: [0, 50, -30, 0], y: [0, -40, 30, 0], duration: 24, delay: 0 },
          { color: 'bg-purple-600/10', size: 'w-[50vw] h-[50vw]', x: [0, -40, 40, 0], y: [0, 50, -30, 0], duration: 20, delay: 2 },
          { color: 'bg-violet-800/8', size: 'w-[45vw] h-[45vw]', x: [0, 30, -50, 0], y: [0, 40, 50, 0], duration: 28, delay: 4 },
        ];
        break;
      case 'quantum-aurora':
        lights = [
          { color: 'bg-emerald-600/8', size: 'w-[55vw] h-[40vw]', x: [-30, 60, -15, -30], y: [-15, 30, -40, -15], duration: 21, delay: 0 },
          { color: 'bg-teal-500/10', size: 'w-[45vw] h-[45vw]', x: [40, -40, 30, 40], y: [30, -50, 15, 30], duration: 25, delay: 1 },
          { color: 'bg-cyan-600/12', size: 'w-[50vw] h-[50vw]', x: [-15, 40, -40, -15], y: [40, 15, -30, 40], duration: 29, delay: 3 },
        ];
        break;
      case 'cyber-pulse':
        lights = [
          { color: 'bg-amber-500/10', size: 'w-[50vw] h-[50vw]', x: [0, 40, -20, 0], y: [0, -30, 40, 0], duration: 18, delay: 0 },
          { color: 'bg-red-600/8', size: 'w-[45vw] h-[45vw]', x: [30, -35, 20, 30], y: [20, 30, -35, 20], duration: 22, delay: 2 },
          { color: 'bg-amber-600/8', size: 'w-[40vw] h-[40vw]', x: [-20, 30, -30, -20], y: [-30, 20, 30, -20], duration: 20, delay: 4 },
        ];
        break;
      case 'monochrome':
        lights = [
          { color: 'bg-zinc-700/8', size: 'w-[50vw] h-[50vw]', x: [0, 30, -30, 0], y: [0, -30, 30, 0], duration: 30, delay: 0 },
          { color: 'bg-[#18181b]/15', size: 'w-[55vw] h-[55vw]', x: [0, -20, 20, 0], y: [0, 20, -20, 0], duration: 26, delay: 3 },
        ];
        break;
      case 'solar-eclipse':
        lights = [
          { color: 'bg-yellow-600/10', size: 'w-[45vw] h-[45vw]', x: [15, -20, 25, 15], y: [-20, 25, -15, -20], duration: 20, delay: 0 },
          { color: 'bg-amber-700/8', size: 'w-[50vw] h-[50vw]', x: [-25, 20, -20, -25], y: [25, -20, 20, 25], duration: 24, delay: 2 },
          { color: 'bg-orange-800/6', size: 'w-[40vw] h-[40vw]', x: [20, -25, 15, 20], y: [-15, 20, -25, -15], duration: 22, delay: 4 },
        ];
        break;
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <AnimatePresence>
        {lights.map((light, index) => (
          <motion.div
            key={`${shader}-${isLight}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: light.x,
              y: light.y
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              x: {
                duration: light.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: light.delay
              },
              y: {
                duration: light.duration + 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: light.delay
              },
              opacity: { duration: 1 },
              scale: { duration: 1 }
            }}
            className={`absolute rounded-full filter blur-[100px] sm:blur-[140px] mix-blend-screen ${light.size} ${light.color}`}
            style={{
              top: `${20 + index * 15}%`,
              left: `${15 + index * 25}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
