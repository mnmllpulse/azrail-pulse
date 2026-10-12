import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanetCanvas } from './PlanetCanvas';
import { ChevronRight } from 'lucide-react';
import { AzrailIntro } from './AzrailIntro';
import { Button } from './common/Button';
import Tooltip from './Tooltip';
import { useLanguage } from '../contexts/LanguageContext';

interface SystemIntroProps {
  onComplete: () => void;
  isLight: boolean;
}

export function SystemIntro({ onComplete, isLight }: SystemIntroProps) {
  const [stage, setStage] = useState<'planet' | 'azrail'>('planet');
  const { language } = useLanguage();

  React.useEffect(() => {
    if (stage === 'planet') {
      const timer = setTimeout(() => {
        setStage('azrail');
      }, 10000); // 10 seconds for the planet cinematic opening
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <div className={`relative w-full h-[calc(100vh-120px)] rounded-[48px] overflow-hidden border transition-all duration-1000 flex items-center justify-center ${isLight ? 'bg-white border-gray-200' : 'bg-depth-void border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)]'}`}>
      <AnimatePresence mode="wait">
        {stage === 'planet' && (
          <motion.div 
            key="planet-stage"
            initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(30px)' }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            <div className="absolute inset-0">
              <PlanetCanvas />
            </div>
            
            {/* Overlay Vignette Gradient */}
            <div className={`absolute inset-0 pointer-events-none ${isLight ? 'bg-gradient-to-t from-white/90 via-white/20 to-transparent' : 'bg-gradient-to-t from-black/90 via-black/30 to-transparent'}`} />

            <div className="relative z-10 flex flex-col items-center justify-end h-full pb-12 sm:pb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-center max-w-2xl px-6 backdrop-blur-xs py-4 rounded-3xl"
              >
                <h1 className={`text-4xl md:text-5xl font-bold tracking-tight mb-4 chromatic-aberration ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  DARK MNMLL PULSE OS
                </h1>
                <p className={`text-lg mb-8 font-mono uppercase tracking-[0.2em] ${isLight ? 'text-pulse-primary' : 'text-pulse-accent'}`}>
                  {language === 'ru' ? 'Единая Нейронная Экосистема' : 'Unified Neural Ecosystem'}
                </p>
                <p className={`text-sm md:text-base leading-relaxed mb-12 max-w-xl mx-auto ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
                  {language === 'ru' ? 'Инициализируйте интеллектуальную сетку. Легко интегрируйте веб-генерацию, синтез нейро-аудио и кинематографический рендеринг в единый интерфейс.' : 'Initialize the ultimate multi-agent intelligence grid. Seamlessly integrate web generation, neural audio synthesis, and cinematic visual rendering into a single, cohesive interface.'}
                </p>
                <Tooltip content={language === 'ru' ? "ИНИЦИАЛИЗАЦИЯ МУЛЬТИАГЕНТНОЙ СУЩНОСТИ" : "INITIALIZE MULTI-AGENT ENTITY"} isLight={isLight} position="bottom">
                  <Button
                    variant="primary"
                    size="lg"
                    isLight={isLight}
                    onClick={() => setStage('azrail')}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    {language === 'ru' ? 'ВХОД В ЭКО СИСТЕМУ' : 'ENTER ECOSYSTEM'}
                  </Button>
                </Tooltip>
              </motion.div>
            </div>
          </motion.div>
        )}

        {stage === 'azrail' && (
          <AzrailIntro onComplete={onComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
