import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, Undo2, Languages } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';

interface SmartTranslatorProps {
  text: string;
  className?: string;
  buttonPosition?: 'top-right' | 'bottom-right' | 'inline';
}

export const SmartTranslator: React.FC<SmartTranslatorProps> = ({
  text,
  className = '',
  buttonPosition = 'top-right',
}) => {
  const { language } = useLanguage();
  const [currentText, setCurrentText] = useState(text);
  const [originalText, setOriginalText] = useState(text);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // If the source text prop changes, reset original and current text
  useEffect(() => {
    setOriginalText(text);
    setCurrentText(text);
    setIsTranslated(false);
  }, [text]);

  const handleTranslate = async () => {
    if (isTranslating) return;

    setIsTranslating(true);
    const targetLang = language; // translates to currently selected language
    
    const toastId = toast.loading(
      language === 'ru' 
        ? 'ИИ анализирует текст и выполняет перевод...' 
        : 'AI is analyzing text and translating...'
    );

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: originalText,
          targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const result = await response.json();
      if (result.status === 'ok' && result.data) {
        setCurrentText(result.data.trim());
        setIsTranslated(true);
        toast.dismiss(toastId);
        toast.success(
          language === 'ru' 
            ? 'Перевод выполнен успешно!' 
            : 'Translation completed successfully!'
        );
      } else {
        throw new Error(result.error || 'Invalid API response');
      }
    } catch (error) {
      console.error('[SMART TRANSLATOR ERROR]', error);
      toast.dismiss(toastId);
      toast.error(
        language === 'ru' 
          ? 'Ошибка нейросети при переводе.' 
          : 'Neural error occurred during translation.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRevert = () => {
    setCurrentText(originalText);
    setIsTranslated(false);
    toast.success(
      language === 'ru' 
        ? 'Текст возвращен к оригиналу' 
        : 'Reverted to original source'
    );
  };

  const buttonStyle = 
    buttonPosition === 'top-right' 
      ? 'absolute top-2 right-2 z-10' 
      : buttonPosition === 'bottom-right' 
        ? 'absolute bottom-2 right-2 z-10' 
        : 'inline-flex ml-2';

  return (
    <div 
      className={`relative group/translator ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Control Button */}
      <AnimatePresence>
        {(isHovered || isTranslating || isTranslated) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={buttonStyle}
          >
            {isTranslated ? (
              <button
                onClick={handleRevert}
                disabled={isTranslating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-950/90 text-emerald-400 text-[9px] font-mono font-bold tracking-wider hover:bg-emerald-900/90 transition-all uppercase shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                title={language === 'ru' ? 'Вернуть оригинал' : 'Revert to Original'}
              >
                <Undo2 className="w-3 h-3" />
                <span>{language === 'ru' ? 'Оригинал' : 'Original'}</span>
              </button>
            ) : (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-500/30 bg-zinc-950/90 text-purple-300 text-[9px] font-mono font-bold tracking-wider hover:border-purple-400 hover:text-white transition-all uppercase shadow-[0_0_12px_rgba(123,77,255,0.2)]"
                title={language === 'ru' ? 'Перевести с помощью ИИ' : 'AI Smart Translate'}
              >
                {isTranslating ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                ) : (
                  <Sparkles className="w-3 h-3 text-purple-400" />
                )}
                <span>
                  {isTranslating 
                    ? (language === 'ru' ? 'Перевод...' : 'Translating...') 
                    : (language === 'ru' ? 'ИИ Перевод' : 'AI Translate')}
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render Text Block */}
      <motion.div
        key={currentText}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full"
      >
        {currentText}
      </motion.div>
    </div>
  );
};
export default SmartTranslator;
