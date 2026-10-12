import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSystemState } from '../../contexts/SystemStateContext';
import { Command, LayoutGrid, Terminal, Globe, Music, Video, Bot, Sparkles, Beaker, Database, Keyboard } from 'lucide-react';

export default function ShortcutOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const { language } = useLanguage();
  const { uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';

  useEffect(() => {
    let holdTimer: any;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Control' || e.key === 'Meta') && !isVisible) {
        // Only show if held for 400ms to avoid flashing on quick shortcuts
        holdTimer = setTimeout(() => {
          setIsVisible(true);
        }, 400);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        clearTimeout(holdTimer);
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimeout(holdTimer);
    };
  }, [isVisible]);

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: `${modKey} + K`, desc: language === 'ru' ? 'Поиск' : 'Search / Command' },
    { key: `${modKey} + B`, desc: language === 'ru' ? 'Боковая панель' : 'Toggle Sidebar' },
    { key: `${modKey} + /`, desc: language === 'ru' ? 'Чат с ИИ' : 'Focus AI Chat' },
    { key: `${modKey} + 1`, desc: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { key: `${modKey} + 2`, desc: 'Web Studio', icon: <Globe className="w-4 h-4" /> },
    { key: `${modKey} + 3`, desc: 'Code Studio', icon: <Terminal className="w-4 h-4" /> },
    { key: `${modKey} + 4`, desc: 'Music Studio', icon: <Music className="w-4 h-4" /> },
    { key: `${modKey} + 5`, desc: 'Video Studio', icon: <Video className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Floating Action Button for Mobile / Android */}
      <div className="fixed bottom-6 left-6 z-50 md:hidden">
        <button
          onClick={() => setIsVisible(true)}
          className={`p-3 rounded-full shadow-2xl transition-all border ${
            isLight 
              ? 'bg-white border-zinc-200 text-zinc-600' 
              : 'bg-zinc-900 border-white/10 text-zinc-400'
          }`}
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md ${
              isLight ? 'bg-white/60' : 'bg-black/60'
            }`}
            onClick={() => setIsVisible(false)}
          >
            <div 
              className={`w-full max-w-lg p-8 rounded-3xl border shadow-2xl ${
                isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-white/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${isLight ? 'bg-indigo-500/10' : 'bg-indigo-500/20'}`}>
                  <Command className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-mono uppercase tracking-wider">
                    {language === 'ru' ? 'Системные ярлыки' : 'System Shortcuts'}
                  </h2>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                    {language === 'ru' ? 'Отпустите клавишу-модификатор для закрытия' : 'Release modifier key to close'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shortcuts.map((s, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2">
                      {s.icon && <span className="text-zinc-500">{s.icon}</span>}
                      <span className="text-sm font-medium text-zinc-400">{s.desc}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-md border ${
                      isLight ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-black/50 border-white/10 text-zinc-300'
                    }`}>
                      {s.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
