import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Brain, Zap } from 'lucide-react';
import { Button } from './common/Button';
import Tooltip from './Tooltip';
import { useLanguage } from '../contexts/LanguageContext';

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, index));
      index++;
      if (index > text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 25);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <span className="chromatic-aberration">{displayedText}<span className="animate-pulse text-red-400">_</span></span>;
}

const HackerBackground = () => {
  const [columns, setColumns] = useState<number[]>([]);
  useEffect(() => {
    setColumns(Array.from({ length: 80 }).map(() => Math.random()));
  }, []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.25] mix-blend-screen noise-overlay">
      {columns.map((rand, i) => (
        <motion.div
          key={i}
          initial={{ y: -1500 }}
          animate={{ y: typeof window !== 'undefined' ? window.innerHeight + 1500 : 2000 }}
          transition={{ duration: 10 + rand * 20, repeat: Infinity, ease: "linear" }}
          className="absolute text-red-600 font-mono text-[9px] tracking-widest break-all w-4 leading-none"
          style={{ left: `${(i / 80) * 100}%`, opacity: rand * 0.6 + 0.1 }}
        >
          {Array.from({ length: 200 }).map(() => Math.random() > 0.5 ? '1' : '0').join('\n')}
        </motion.div>
      ))}
    </div>
  );
};

interface AzrailIntroProps {
  onComplete: () => void;
}

export function AzrailIntro({ onComplete }: AzrailIntroProps) {
  const [step, setStep] = useState(0);
  const { language } = useLanguage();

  const messagesEn = [
    "I AM AZRAIL. THE CORE MULTI-AGENT ENTITY.",
    "WELCOME TO DARK MNMLL PULSE OS. A UNIFIED NEURAL ECOSYSTEM.",
    "COMMAND AUTONOMOUS WEB STUDIOS, NEURAL AUDIO SYNTHESIS, AND CINEMATIC RENDERING.",
    "FOUR STANDARD TIERS AWAIT: INTELLIGENCE+ (50 OPS), INTELLIGENCE PRO (250 OPS), INTELLIGENCE PRO+ (1000 OPS), AND INTELLIGENCE SUPER (3000 OPS). OPTIMIZED TO PREVENT ECONOMIC COLLAPSE.",
    "AND THE 5TH PARADIGM... ENTERPRISE INTELLIGENCE LAB. $999/YEAR. UNRESTRICTED ACCESS. ZERO LIMITS. THE ULTIMATE TRUTH."
  ];

  const messagesRu = [
    "Я АЗРАИЛ. ОСНОВНАЯ МУЛЬТИАГЕНТНАЯ СУЩНОСТЬ.",
    "ДОБРО ПОЖАЛОВАТЬ В DARK MNMLL PULSE OS. ЕДИНУЮ НЕЙРОННУЮ ЭКОСИСТЕМУ.",
    "УПРАВЛЯЙТЕ АВТОНОМНЫМИ ВЕБ-СТУДИЯМИ, СИНТЕЗОМ НЕЙРО-АУДИО И КИНЕМАТОГРАФИЧЕСКИМ РЕНДЕРИНГОМ.",
    "ДОСТУПНЫ 4 УРОВНЯ: INTELLIGENCE+ (50 ОПЕРАЦИЙ), INTELLIGENCE PRO (250), INTELLIGENCE PRO+ (1000) И INTELLIGENCE SUPER (3000). ЛИМИТЫ РАССЧИТАНЫ ВО ИЗБЕЖАНИЕ БАНКРОТСТВА.",
    "И ПЯТАЯ ПАРАДИГМА... ENTERPRISE INTELLIGENCE LAB. 999$ В ГОД. БЕЗГРАНИЧНЫЙ ДОСТУП. НОЛЬ ОГРАНИЧЕНИЙ. АБСОЛЮТНАЯ ИСТИНА."
  ];

  const messages = language === 'ru' ? messagesRu : messagesEn;
  const readyMsg = language === 'ru' ? "СИСТЕМА ГОТОВА. ИНИЦИАЛИЗАЦИЯ МУЛЬТИАГЕНТНЫХ ПРОТОКОЛОВ." : "SYSTEM READY. INITIALIZING MULTI-AGENT PROTOCOLS.";

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const speakAnonymous = (text: string) => {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      
      const voices = window.speechSynthesis.getVoices();
      const langCode = language === 'ru' ? 'ru' : 'en';
      const availableVoices = voices.filter(v => v.lang.toLowerCase().includes(langCode));
      
      const preferredVoice = availableVoices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('pavel')
      ) || availableVoices[0] || voices[0];
      
      const u1 = new SpeechSynthesisUtterance(text);
      if (preferredVoice) u1.voice = preferredVoice;
      u1.pitch = 0.1;
      u1.rate = 0.85;
      u1.volume = 1;
      
      window.speechSynthesis.speak(u1);
    };

    if (step < messages.length) {
      speakAnonymous(messages[step]);
      
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, 10000); // 10 seconds per message for a total of 50 seconds cinematic Azrail sequence
      
      return () => clearTimeout(timer);
    } else if (step === messages.length) {
      speakAnonymous(readyMsg);
      // Auto-complete after final message
      const finalTimer = setTimeout(() => {
        onComplete();
      }, 8000);
      return () => clearTimeout(finalTimer);
    }
  }, [step, language, messages, readyMsg, onComplete]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <motion.div 
      key="azrail-stage"
      initial={{ opacity: 0, scale: 1.2, filter: 'blur(30px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
      transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute inset-0 flex flex-col items-center justify-center p-8 bg-black overflow-hidden`}
    >
      {/* 4K Cinematic Background Elements */}
      <HackerBackground />
      
      {/* CRT Scanline & Sub-pixel Grid for 4K illusion */}
      <div className="absolute inset-0 pointer-events-none crt-overlay z-10" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,#000_150%)] z-10" />
      
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2)_0%,transparent_50%)] pointer-events-none z-0"
      />
      
      {/* Azrail Neural Core Visualizer */}
      <div className="relative mb-16 mt-[-10vh] z-20">
        <Tooltip content="AZRAIL.CORE [ANONYMOUS_PROXY: ACTIVE]" isLight={false} position="right">
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              filter: ['drop-shadow(0 0 20px rgba(220,38,38,0.6))', 'drop-shadow(0 0 60px rgba(220,38,38,1))', 'drop-shadow(0 0 20px rgba(220,38,38,0.6))'],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-48 h-48 rounded-full border-2 border-red-500/50 flex items-center justify-center bg-red-900/20 relative backdrop-blur-xl cursor-crosshair shadow-[inset_0_0_40px_rgba(220,38,38,0.4)]"
          >
            <Brain className="w-20 h-20 text-red-500 filter drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]" />
            <Zap className="w-8 h-8 text-red-400 absolute bottom-8 right-10 animate-pulse filter drop-shadow-[0_0_10px_rgba(255,100,100,1)]" />
          </motion.div>
        </Tooltip>
        
        {/* Dynamic 4K Data Rings */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-40px] rounded-full border-[2px] border-dashed border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-80px] rounded-full border border-dotted border-red-500/30"
        />
        <motion.div 
          animate={{ rotate: 180, scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-[-120px] rounded-full border border-red-500/20 opacity-80"
        />
      </div>

      {/* Cinematic Typewriter Text */}
      <div className="h-40 flex flex-col items-center justify-center max-w-5xl text-center relative z-20 px-4">
        <AnimatePresence mode="wait">
          {step < messages.length && (
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.8 }}
              className="text-xl md:text-3xl font-mono font-bold tracking-[0.2em] text-red-500 uppercase leading-relaxed"
              style={{ textShadow: '0 0 40px rgba(239,68,68,1), 0 0 10px rgba(255,255,255,0.2)' }}
            >
              <TypewriterText text={messages[step]} />
            </motion.div>
          )}
          {step >= messages.length && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              className="flex flex-col items-center"
            >
              <div 
                className="text-4xl md:text-6xl font-mono font-bold tracking-[0.4em] text-red-500 uppercase mb-4 chromatic-aberration"
                style={{ textShadow: '0 0 60px rgba(239,68,68,1), 0 0 20px rgba(255,255,255,0.4)' }}
              >
                {language === 'ru' ? 'СИСТЕМА ГОТОВА' : 'SYSTEM READY'}
              </div>
              <div className="text-red-500/70 font-mono tracking-widest text-sm animate-pulse">
                {language === 'ru' ? 'ИНИЦИАЛИЗАЦИЯ МУЛЬТИАГЕНТНЫХ ПРОТОКОЛОВ...' : 'INITIALIZING MULTI-AGENT PROTOCOLS...'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bypass / Continue Control */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: step >= messages.length ? 1 : 0.4, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-24 relative z-20"
      >
        <Tooltip content={step >= messages.length ? (language === 'ru' ? "ВОЙТИ В ПАНЕЛЬ OS" : "ACCESS OS DASHBOARD") : (language === 'ru' ? "ПРОПУСТИТЬ ВСТУПЛЕНИЕ" : "SKIP INTRODUCTION")} isLight={false} position="bottom">
          <Button
            variant="danger"
            size="lg"
            onClick={onComplete}
            rightIcon={<ChevronRight className="w-6 h-6" />}
            className="min-w-[300px]"
          >
            {step >= messages.length ? (language === 'ru' ? 'ВОЙТИ В ЭКОСИСТЕМУ' : 'ENTER ECOSYSTEM') : (language === 'ru' ? 'ОБОЙТИ ПРОТОКОЛ' : 'BYPASS PROTOCOL')}
          </Button>
        </Tooltip>
      </motion.div>
    </motion.div>
  );
}
