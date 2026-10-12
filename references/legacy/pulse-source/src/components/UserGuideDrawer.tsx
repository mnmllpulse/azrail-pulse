import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  X, 
  ChevronRight, 
  HelpCircle, 
  Cpu, 
  Terminal, 
  Database, 
  Music, 
  Video, 
  Globe, 
  Sparkles, 
  Activity, 
  Lock, 
  Settings, 
  FileCode, 
  FolderLock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface UserGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export default function UserGuideDrawer({ isOpen, onClose, isLight }: UserGuideDrawerProps) {
  const { language, t, getUserGuide } = useLanguage();
  const [activeTab, setActiveTab] = useState<'os' | 'studios' | 'labs' | 'tips'>('os');
  const [selectedTopic, setSelectedTopic] = useState<string>('dashboard');

  const categories = {
    os: [
      { id: 'dashboard', name: 'Command Center', icon: <Cpu className="w-4 h-4 text-purple-400" /> },
      { id: 'agent', name: 'Swarm Orchestra', icon: <Globe className="w-4 h-4 text-cyan-400" /> },
      { id: 'settings', name: 'OS Settings & Themes', icon: <Settings className="w-4 h-4 text-amber-400" /> },
    ],
    studios: [
      { id: 'web', name: 'WEB STUDIO', icon: <FileCode className="w-4 h-4 text-emerald-400" /> },
      { id: 'code', name: 'CODE STUDIO', icon: <Terminal className="w-4 h-4 text-indigo-400" /> },
      { id: 'knowledge', name: 'KNOWLEDGE HUB', icon: <Database className="w-4 h-4 text-amber-400" /> },
      { id: 'music', name: 'MUSIC STUDIO', icon: <Music className="w-4 h-4 text-rose-400" /> },
      { id: 'video', name: 'VIDEO STUDIO', icon: <Video className="w-4 h-4 text-sky-400" /> },
      { id: 'image', name: 'IMAGE STUDIO', icon: <Sparkles className="w-4 h-4 text-violet-400" /> },
    ],
    labs: [
      { id: 'lab', name: 'PULSE LAB', icon: <Activity className="w-4 h-4 text-pink-400" /> },
      { id: 'gallery', name: 'ASSET UNIVERSE', icon: <FolderLock className="w-4 h-4 text-teal-400" /> },
    ],
    tips: [
      { id: 'keyboard', name: 'Shortcuts Matrix', icon: <HelpCircle className="w-4 h-4 text-yellow-400" /> }
    ]
  };

  const guide = getUserGuide(selectedTopic);

  // Keyboard shortcut definitions for helper matrix
  const shortcuts = [
    { keys: 'Ctrl + /', descEn: 'Toggle Search Command Palette', descRu: 'Открыть панель команд' },
    { keys: 'Ctrl + B', descEn: 'Toggle Left Sidebar Workspace', descRu: 'Скрыть/показать левое меню' },
    { keys: 'Ctrl + P', descEn: 'Trigger System Pulse Diagnostics', descRu: 'Запустить диагностику импульса' },
    { keys: 'Ctrl + D', descEn: 'Force Wave Reflection Render', descRu: 'Рендеринг отражения волны' },
    { keys: 'Ctrl + T', descEn: 'Toggle Light / Dark Contrast Theme', descRu: 'Переключить контраст темы' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className={`fixed right-0 top-0 h-full w-full sm:w-[500px] md:w-[600px] shadow-2xl z-50 border-l flex flex-col p-6 md:p-8 ${
              isLight 
                ? 'bg-white border-zinc-200 text-zinc-900' 
                : 'bg-zinc-950/95 border-white/5 text-white backdrop-blur-xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-pulse-primary animate-pulse" />
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-pulse-primary">
                    {language === 'ru' ? 'РУКОВОДСТВО ПОЛЬЗОВАТЕЛЯ' : 'SYSTEM USER MANUAL'}
                  </h3>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest block">
                    DARK MNMLL PULSE OS // VER 3.0.4
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl border transition-all ${
                  isLight 
                    ? 'border-zinc-200 hover:bg-zinc-100 text-zinc-500' 
                    : 'border-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-menu Section Tabs */}
            <div className="flex gap-1.5 border-b border-white/5 pb-4 mb-6 overflow-x-auto scrollbar-hide">
              {(['os', 'studios', 'labs', 'tips'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedTopic(categories[tab][0].id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ${
                    activeTab === tab
                      ? (isLight 
                          ? 'bg-zinc-900 text-white font-bold' 
                          : 'bg-pulse-primary/20 border border-pulse-primary/30 text-pulse-accent font-bold')
                      : (isLight 
                          ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' 
                          : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10')
                  }`}
                >
                  {tab === 'os' ? (language === 'ru' ? 'Ядро ОС' : 'Core OS') :
                   tab === 'studios' ? (language === 'ru' ? 'Студии' : 'Studios') :
                   tab === 'labs' ? (language === 'ru' ? 'Лаборатории' : 'Labs & Galleries') :
                   (language === 'ru' ? 'Подсказки' : 'Tips & Keys')}
                </button>
              ))}
            </div>

            {/* Main Content Splitting */}
            <div className="flex-1 flex gap-5 min-h-0">
              {/* Left Column Topics list */}
              <div className="w-1/3 border-r border-white/5 pr-3 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                {categories[activeTab].map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-left transition-all text-[10px] font-mono uppercase ${
                      selectedTopic === topic.id
                        ? (isLight 
                            ? 'bg-zinc-200 text-zinc-900 font-bold' 
                            : 'bg-white/10 text-white font-bold border border-white/5')
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {topic.icon}
                    <span className="truncate">{topic.name}</span>
                  </button>
                ))}
              </div>

              {/* Right Column details content */}
              <div className="w-2/3 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
                {selectedTopic === 'keyboard' ? (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-pulse-accent">
                      {language === 'ru' ? 'МАТРИЦА СОРТКАТОВ' : 'KEYBOARD SHORTCUTS'}
                    </h4>
                    <p className="text-[11px] font-mono leading-relaxed text-white/60">
                      {language === 'ru' 
                        ? 'Используйте клавиши быстрого доступа для мгновенной навигации по среде.' 
                        : 'Utilize specialized quick action inputs to speed up your operations.'}
                    </p>
                    <div className="flex flex-col gap-2 mt-2">
                      {shortcuts.map((sh, idx) => (
                        <div 
                          key={idx}
                          className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'
                          }`}
                        >
                          <span className="px-2 py-0.5 bg-pulse-primary/10 border border-pulse-primary/20 text-pulse-accent text-[9px] font-mono rounded-lg w-max font-bold">
                            {sh.keys}
                          </span>
                          <span className="text-[10px] font-mono text-white/70">
                            {language === 'ru' ? sh.descRu : sh.descEn}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* Topic Header & Info */}
                    <div className="flex flex-col gap-2">
                      <span className="px-2.5 py-0.5 rounded-full border border-pulse-primary/30 bg-pulse-primary/5 text-pulse-accent text-[8px] font-mono tracking-widest uppercase w-max">
                        {language === 'ru' ? 'ДОКУМЕНТАЦИЯ' : 'DOCUMENTATION'}
                      </span>
                      <h4 className="text-sm font-sans font-semibold tracking-tight text-white">
                        {guide.title}
                      </h4>
                      <p className="text-[11px] font-sans leading-relaxed text-white/50 border-l border-pulse-primary/30 pl-3">
                        {guide.desc}
                      </p>
                    </div>

                    {/* Operational Steps */}
                    <div className="flex flex-col gap-3">
                      <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-pulse-accent">
                        {language === 'ru' ? 'ПОШАГОВАЯ ИНСТРУКЦИЯ' : 'OPERATIONAL STEPS'}
                      </h5>
                      <div className="flex flex-col gap-2.5">
                        {guide.steps.map((step, idx) => (
                          <div 
                            key={idx} 
                            className={`p-3.5 rounded-2xl border flex gap-3 items-start transition-all ${
                              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-lg bg-pulse-primary/20 border border-pulse-primary/30 flex items-center justify-center text-pulse-accent text-[9px] font-mono font-bold shrink-0">
                              0{idx + 1}
                            </span>
                            <span className="text-[11px] font-sans leading-relaxed text-white/80">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* In-Context Help Tip */}
                    <div className={`p-4 rounded-2xl border flex gap-3 ${
                      isLight ? 'bg-indigo-50/50 border-indigo-100' : 'bg-indigo-950/20 border-indigo-500/15'
                    }`}>
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                          {language === 'ru' ? 'ПОДСКАЗКА СИСТЕМЫ' : 'CORE HYPOTHESIS'}
                        </span>
                        <p className="text-[10px] font-sans leading-relaxed text-indigo-200">
                          {language === 'ru' 
                            ? 'Каждая функция синхронизируется в реальном времени с нейронным облаком через наш защищенный RAG-протокол.'
                            : 'Every action is securely synchronized to the cloud RAG node index and benefits from automated QualityEngine analysis.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status / Indicator */}
            <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-[8px] font-mono text-white/30 uppercase tracking-widest">
              <span>SECURITY: ENCRYPTED CORE</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE CONNECTION</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
