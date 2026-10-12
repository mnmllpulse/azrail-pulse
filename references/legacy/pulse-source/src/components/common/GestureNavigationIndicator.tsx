import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGestureNavigation } from '../../contexts/GestureNavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Hand, Sparkles, Layers, Zap, Compass } from 'lucide-react';

interface GestureNavigationIndicatorProps {
  isLight?: boolean;
}

export const GestureNavigationIndicator: React.FC<GestureNavigationIndicatorProps> = ({ isLight }) => {
  const {
    navItems,
    currentIndex,
    currentNav,
    prevNav,
    nextNav,
    gestureFeedback,
    isSwiping,
    dragOffset,
    navigateNext,
    navigatePrev,
    navigateToIndex,
  } = useGestureNavigation();

  const { language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const isRu = language === 'ru';

  return (
    <>
      {/* Edge Glow Ripple during swipe */}
      <AnimatePresence>
        {gestureFeedback.active && gestureFeedback.direction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: gestureFeedback.progress }}
            exit={{ opacity: 0 }}
            className={`fixed inset-y-0 z-[90] pointer-events-none flex items-center ${
              gestureFeedback.direction === 'right' ? 'right-0 pr-6 justify-end' : 'left-0 pl-6 justify-start'
            }`}
          >
            <div
              className={`absolute inset-y-0 w-32 blur-2xl transition-all ${
                gestureFeedback.direction === 'right'
                  ? 'right-0 bg-gradient-to-l from-purple-600/30 to-transparent'
                  : 'left-0 bg-gradient-to-r from-cyan-600/30 to-transparent'
              }`}
            />
            <div className={`relative z-10 flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl ${
              isLight ? 'bg-white/90 border-gray-200/80 text-gray-900' : 'bg-black/80 border-white/15 text-white'
            }`}>
              {gestureFeedback.direction === 'left' && <ChevronLeft className="w-5 h-5 text-cyan-400 animate-pulse" />}
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-widest text-pulse-primary">
                  {isRu ? 'ПЕРЕХОД' : 'TRANSITION'}
                </span>
                <span className="text-xs font-bold font-mono">
                  {gestureFeedback.targetName}
                </span>
              </div>
              {gestureFeedback.direction === 'right' && <ChevronRight className="w-5 h-5 text-purple-400 animate-pulse" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Gesture Touch Bar */}
      <div 
        className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`mb-2 px-3 py-2 rounded-2xl border shadow-2xl backdrop-blur-2xl flex items-center gap-3 ${
                isLight ? 'bg-white/95 border-gray-200/90 text-gray-800' : 'bg-zinc-950/90 border-white/10 text-white'
              }`}
            >
              {/* Previous studio trigger */}
              <button
                onClick={navigatePrev}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-mono transition-all ${
                  isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-gray-300'
                }`}
                title={isRu ? 'Предыдущая студия' : 'Previous studio'}
              >
                <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {isRu ? prevNav?.labelRu : prevNav?.labelEn}
                </span>
              </button>

              <div className="h-3 w-px bg-white/10" />

              {/* Current Active Studio Badge */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
                <span className="text-[11px] font-mono font-bold text-purple-300">
                  {isRu ? currentNav?.labelRu : currentNav?.labelEn}
                </span>
                <span className="text-[9px] font-mono opacity-50">
                  ({currentIndex + 1}/{navItems.length})
                </span>
              </div>

              <div className="h-3 w-px bg-white/10" />

              {/* Next studio trigger */}
              <button
                onClick={navigateNext}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-mono transition-all ${
                  isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-gray-300'
                }`}
                title={isRu ? 'Следующая студия' : 'Next studio'}
              >
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {isRu ? nextNav?.labelRu : nextNav?.labelEn}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Gesture Strip (iOS Home Indicator style) */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className={`h-1.5 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
            isHovered ? 'w-48 bg-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'w-28 bg-white/20 hover:bg-white/40'
          }`}
          onClick={() => setIsHovered(!isHovered)}
        >
          {/* Subtle dots representing module progress */}
          {isHovered && (
            <div className="flex items-center gap-1.5 px-2">
              {navItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-4 bg-white shadow-sm'
                      : 'w-1.5 bg-white/30 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Subtle helper text for touch/swipe users */}
        <span className={`text-[8px] font-mono tracking-widest uppercase mt-1 transition-opacity ${
          isHovered ? 'opacity-70' : 'opacity-20 hover:opacity-60'
        } ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          {isRu ? 'СВАЙП ДЛЯ НАВИГАЦИИ (ALT + ◄ / ►)' : 'SWIPE TO NAVIGATE (ALT + ◄ / ►)'}
        </span>
      </div>
    </>
  );
};
