import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface TooltipProps {
  content?: string;
  children: React.ReactNode;
  isLight?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  key?: React.Key;

  // Bilingual upgrades
  contentEn?: string;
  contentRu?: string;
  titleEn?: string;
  titleRu?: string;
  shortcut?: string;
}

export default function Tooltip({
  content,
  children,
  isLight = false,
  position = 'top',
  delay = 300,
  className = '',
  contentEn,
  contentRu,
  titleEn,
  titleRu,
  shortcut,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const { language, t } = useLanguage();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

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
  }, [show, position]);

  useEffect(() => {
    if (show && tooltipRef.current && triggerRef.current) {
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

      // Safeguard boundaries
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
  }, [show, position, coords.x, coords.y]);

  const finalContentEn = contentEn || content || "No English description provided.";
  const finalContentRu = contentRu || content || "Описание на русском языке отсутствует.";

  // Determine standard title values if they are omitted but content is parsed
  const finalTitleEn = titleEn || (shortcut ? "Quick Action" : undefined);
  const finalTitleRu = titleRu || (shortcut ? "Быстрое действие" : undefined);

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
      className={`inline-flex items-center justify-center ${className}`}
    >
      {children}

      <AnimatePresence>
        {show && (
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
            className={`flex flex-col max-w-xs p-3 rounded-xl shadow-2xl border ${
              isLight 
                ? 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-300/50' 
                : 'bg-zinc-950/95 border-white/10 text-white shadow-black/80'
            } backdrop-blur-md select-none text-left`}
          >
            {/* Header / Title bar */}
            {(finalTitleEn || finalTitleRu || shortcut) && (
              <div className="flex items-center justify-between gap-4 mb-1.5 border-b border-white/5 pb-1">
                <span className="text-[9px] font-mono font-bold tracking-wider text-purple-400 uppercase">
                  {language === 'ru' ? (finalTitleRu || finalTitleEn) : (finalTitleEn || finalTitleRu)}
                </span>
                {shortcut && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[8px] font-mono text-zinc-300 font-bold tracking-widest">
                    {shortcut}
                  </span>
                )}
              </div>
            )}

            {/* Bilingual descriptions split dynamically */}
            <div className="space-y-1.5 text-[9px] font-sans leading-relaxed">
              <div className={isLight ? 'text-zinc-800' : 'text-zinc-200'}>
                <span className="text-indigo-400 font-semibold font-mono text-[8px] mr-1">EN //</span>
                {finalContentEn}
              </div>
              <div className="border-t border-dashed border-white/5 my-1" />
              <div className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>
                <span className="text-emerald-400 font-semibold font-mono text-[8px] mr-1">RU //</span>
                {finalContentRu}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
