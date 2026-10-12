import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageToggle({ isLight }: { isLight?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-[10px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-600 hover:bg-gray-200' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{language === 'en' ? 'EN' : 'RU'}</span>
    </button>
  );
}
