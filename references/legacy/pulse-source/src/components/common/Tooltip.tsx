import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';

interface TooltipProps {
  children: React.ReactNode;
  contentEn: string;
  contentRu: string;
  titleEn?: string;
  titleRu?: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  contentEn,
  contentRu,
  titleEn,
  titleRu,
  shortcut,
  position = 'top',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

      // Temporary positions; actual adjustments are done after tooltip is rendered or using static calculations
      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 10;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 10;
          break;
        case 'left':
          x = rect.left - 10;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
          break;
      }
      setCoords({ x, y });
    }
  }, [isVisible, position]);

  // Adjust positioning on actual render to prevent overflow
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      let x = coords.x;
      let y = coords.y;

      if (position === 'top') {
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - 8;
      } else if (position === 'bottom') {
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + 8;
      } else if (position === 'left') {
        x = triggerRect.left - tooltipRect.width - 8;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      } else if (position === 'right') {
        x = triggerRect.right + 8;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      }

      // Viewport safety margins
      const margin = 12;
      if (x < margin) x = margin;
      if (x + tooltipRect.width > window.innerWidth - margin) {
        x = window.innerWidth - tooltipRect.width - margin;
      }
      if (y < margin) y = margin;
      if (y + tooltipRect.height > window.innerHeight - margin) {
        y = window.innerHeight - tooltipRect.height - margin;
      }

      setCoords({ x, y });
    }
  }, [isVisible, position, coords.x, coords.y]);

  // Animation values based on placement direction
  const getInitialAnimation = () => {
    switch (position) {
      case 'top': return { opacity: 0, y: 4, scale: 0.95 };
      case 'bottom': return { opacity: 0, y: -4, scale: 0.95 };
      case 'left': return { opacity: 0, x: 4, scale: 0.95 };
      case 'right': return { opacity: 0, x: -4, scale: 0.95 };
    }
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={getInitialAnimation()}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              pointerEvents: 'none',
              zIndex: 999999,
            }}
            className="flex flex-col max-w-xs p-3 rounded-xl shadow-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-md text-white select-none text-left"
          >
            {/* Title / Header */}
            {(titleEn || titleRu) && (
              <div className="flex items-center justify-between gap-4 mb-1.5 border-b border-white/5 pb-1">
                <span className="text-[10px] font-mono font-bold tracking-wider text-purple-400 uppercase">
                  {language === 'ru' ? (titleRu || titleEn) : (titleEn || titleRu)}
                </span>
                {shortcut && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[8px] font-mono text-zinc-300 font-bold tracking-widest">
                    {shortcut}
                  </span>
                )}
              </div>
            )}

            {/* Content Body - Bilingual Split Grid / Row */}
            <div className="space-y-1.5 text-[9px] font-sans leading-relaxed">
              <div className="text-zinc-200">
                <span className="text-indigo-400 font-semibold font-mono text-[8px] mr-1">EN //</span>
                {contentEn}
              </div>
              <div className="border-t border-dashed border-white/5 my-1" />
              <div className="text-zinc-400">
                <span className="text-emerald-400 font-semibold font-mono text-[8px] mr-1">RU //</span>
                {contentRu}
              </div>
            </div>

            {/* If no titles are provided, but shortcut is */}
            {!titleEn && !titleRu && shortcut && (
              <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Shortcut</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[8px] font-mono text-zinc-300 font-bold tracking-widest">
                  {shortcut}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
