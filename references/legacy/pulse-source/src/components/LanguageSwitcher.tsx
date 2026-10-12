import React from 'react';
import { motion } from 'motion/react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

interface LanguageSwitcherProps {
  isLight?: boolean;
}

export default function LanguageSwitcher({ isLight }: LanguageSwitcherProps) {
  const { language, setLanguage, smartTranslate, isTranslating } = useLanguage();

  const handleToggle = async (targetLang: 'en' | 'ru') => {
    if (language === targetLang || isTranslating) return;
    
    try {
      // Trigger the smart translation with neural animation
      await smartTranslate(targetLang);
    } catch (error) {
      setLanguage(targetLang);
      toast.success(`Language changed to ${targetLang === 'ru' ? 'Русский' : 'English'}`);
    }
  };

  return (
    <div 
      className={`p-1 rounded-2xl border flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider relative transition-all duration-300 ${
        isLight 
          ? 'bg-zinc-100 border-zinc-200 text-zinc-800' 
          : 'bg-white/5 border-white/5 text-white/80'
      }`}
    >
      {/* Sliding Highlight Indicator */}
      <div className="absolute inset-y-1 left-1 right-1 pointer-events-none flex">
        <motion.div
          layoutId="activeLangIndicator"
          className={`h-full rounded-xl shadow-sm ${
            isLight 
              ? 'bg-white border border-zinc-200' 
              : 'bg-white/10 border border-white/10'
          }`}
          initial={false}
          animate={{
            width: '46%',
            x: language === 'en' ? '0%' : '116%',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </div>

      {/* English option button */}
      <button
        onClick={() => handleToggle('en')}
        disabled={isTranslating}
        className={`relative z-10 px-2.5 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 outline-none ${
          language === 'en' 
            ? 'text-pulse-accent' 
            : 'opacity-50 hover:opacity-100'
        }`}
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>

      {/* Separator */}
      <span className="opacity-25 pointer-events-none text-xs">/</span>

      {/* Russian option button */}
      <button
        onClick={() => handleToggle('ru')}
        disabled={isTranslating}
        className={`relative z-10 px-2.5 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 outline-none ${
          language === 'ru' 
            ? 'text-pulse-accent' 
            : 'opacity-50 hover:opacity-100'
        }`}
      >
        <span>🇷🇺</span>
        <span>RU</span>
      </button>

      {/* Minimalistic Pulse LED for active translating status */}
      {isTranslating && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-pulse-accent animate-ping" />
      )}
    </div>
  );
}
