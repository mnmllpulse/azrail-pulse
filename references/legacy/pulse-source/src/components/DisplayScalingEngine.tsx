import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Smartphone, Tablet, Scale, Cpu, Zap, Activity, Layers, Sliders, BookOpen, Check, Minimize2, Maximize2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ScreenPreset {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  standard: string;
  density: string;
}

const GOST_PRESETS: ScreenPreset[] = [
  // Computer / Desktop standards
  { id: 'pc-standard', name: 'PC Standard HD', type: 'desktop', width: 1440, height: 900, standard: 'GOST 2026.1 / ISO 9241', density: '1x MDPI' },
  { id: 'pc-fhd', name: 'PC Full HD Broadcast', type: 'desktop', width: 1920, height: 1080, standard: 'GOST 2026.1 / ISO 9241', density: '1x - 1.25x' },
  { id: 'pc-uhd', name: 'PC Ultra HD 4K Matrix', type: 'desktop', width: 3840, height: 2160, standard: 'GOST 2026.1 / Ultra-Dense', density: '2x HIDPI' },
  
  // Android Tablet standards
  { id: 'android-tablet', name: 'Android Tablet Vertical', type: 'tablet', width: 768, height: 1024, standard: 'GOST 2026.2 / ISO 18021', density: '1.5x HDPI' },
  { id: 'android-pad', name: 'Android Pad Landscape', type: 'tablet', width: 1280, height: 800, standard: 'GOST 2026.2 / Mid-Range', density: '2x XHDPI' },
  
  // Android Mobile Phone standards
  { id: 'android-phone', name: 'Android Flagship Phone', type: 'mobile', width: 393, height: 852, standard: 'GOST 2026.3 / ISO 2028', density: '3x XXHDPI' },
  { id: 'android-fold', name: 'Android Foldable Closed', type: 'mobile', width: 375, height: 812, standard: 'GOST 2026.3 / Compact', density: '3x XXHDPI' },
  { id: 'android-large', name: 'Android Max Smartphone', type: 'mobile', width: 412, height: 915, standard: 'GOST 2026.3 / Ultra-Tall', density: '3.5x XXXHDPI' },
];

const SIMPLICITY_LAWS = [
  { num: 1, name: 'REDUCE', desc: 'The simplest way to achieve simplicity is through thoughtful reduction.' },
  { num: 2, name: 'ORGANIZE', desc: 'Organization makes a system of many appear fewer.' },
  { num: 3, name: 'TIME', desc: 'Savings in time feel like simplicity.' },
  { num: 4, name: 'LEARN', desc: 'Knowledge makes everything simpler.' },
  { num: 5, name: 'DIFFERENCES', desc: 'Simplicity and complexity need each other.' },
  { num: 6, name: 'CONTEXT', desc: 'What lies in the periphery of simplicity is definitely not peripheral.' },
  { num: 7, name: 'EMOTION', desc: 'More emotions are better than less.' },
  { num: 8, name: 'TRUST', desc: 'In simplicity we trust.' },
  { num: 9, name: 'FAILURE', desc: 'Some things can never be made simple.' },
  { num: 10, name: 'THE ONE', desc: 'Simplicity is about subtracting the obvious and adding the meaningful.' },
];

export default function DisplayScalingEngine({ isLight }: { isLight: boolean }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [activeTab, setActiveTab] = useState<'scaling' | 'presets' | 'laws'>('scaling');
  
  // Interactive testing state
  const [simulatedPreset, setSimulatedPreset] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine current active hardware profile based on real window width
  const getActiveProfile = () => {
    if (viewportWidth < 768) {
      return {
        label: language === 'ru' ? 'МОБИЛЬНЫЙ АНДРОИД' : 'ANDROID MOBILE',
        icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
        coef: '0.75x',
        breakpoint: 'Mobile (< 768px)'
      };
    } else if (viewportWidth < 1440) {
      return {
        label: language === 'ru' ? 'АНДРОИД ПЛАНШЕТ' : 'ANDROID TABLET',
        icon: <Tablet className="w-5 h-5 text-purple-400" />,
        coef: '0.90x',
        breakpoint: 'Tablet (768px - 1439px)'
      };
    } else {
      return {
        label: language === 'ru' ? 'КОМПЬЮТЕРНЫЙ ПК' : 'PC DESKTOP',
        icon: <Monitor className="w-5 h-5 text-emerald-400" />,
        coef: '1.00x',
        breakpoint: 'Desktop (>= 1440px)'
      };
    }
  };

  const profile = getActiveProfile();

  const handleApplyPreset = (preset: ScreenPreset) => {
    setSimulatedPreset(preset.id);
    // Custom simulated sandboxing
    const customWidth = preset.width;
    const customHeight = preset.height;
    
    // Dispatch system events so layout can adjust if subscribed
    window.dispatchEvent(new CustomEvent('sandbox-viewport-change', {
      detail: { width: customWidth, height: customHeight, presetId: preset.id }
    }));
  };

  return (
    <>
      {/* Floating Display Engine Trigger Badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full border shadow-2xl transition-all font-mono text-xs ${
            isLight 
              ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50' 
              : 'bg-[#0D0618] border-indigo-500/30 text-indigo-200 hover:border-indigo-400/50 hover:shadow-[0_0_20px_rgba(123,77,255,0.3)]'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          id="gost-scaling-badge"
        >
          <Scale className="w-4 h-4 animate-spin-slow" />
          <span>
            {language === 'ru' ? 'МАСШТАБИРОВАНИЕ ГОСТ' : 'GOST SCALING'} ({viewportWidth}x{viewportHeight})
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed bottom-24 right-6 w-96 rounded-3xl border shadow-2xl z-50 overflow-hidden font-mono text-xs ${
              isLight 
                ? 'bg-white border-gray-200 text-gray-800' 
                : 'bg-[#090312]/95 backdrop-blur-xl border-white/10 text-white'
            }`}
            id="gost-scaling-panel"
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/5'}`}>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[11px]">
                    {language === 'ru' ? 'ДИСПЛЕЙНЫЙ ДВИЖОК ГОСТ' : 'GOST DISPLAY ENGINE'}
                  </h4>
                  <p className="text-[9px] opacity-60">VER. 2026.2.1-MATRIX</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-full hover:bg-white/10 transition-colors ${isLight ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats panel */}
            <div className={`p-3 mx-4 my-3 rounded-2xl flex items-center justify-between border ${
              isLight ? 'bg-indigo-50/50 border-indigo-100' : 'bg-[#0D0618] border-indigo-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {profile.icon}
                <div>
                  <div className="text-[10px] font-bold uppercase">{profile.label}</div>
                  <div className="text-[9px] opacity-60">{profile.breakpoint}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-indigo-400">{profile.coef}</div>
                <div className="text-[8px] opacity-50 uppercase">{language === 'ru' ? 'КОЭФФИЦИЕНТ' : 'COEFFICIENT'}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 border-b border-white/5">
              <button
                onClick={() => setActiveTab('scaling')}
                className={`flex-1 py-2 text-center text-[10px] uppercase font-bold border-b-2 transition-all ${
                  activeTab === 'scaling' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {language === 'ru' ? 'СТАТУС' : 'STATUS'}
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-2 text-center text-[10px] uppercase font-bold border-b-2 transition-all ${
                  activeTab === 'presets' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {language === 'ru' ? 'ЭКРАНЫ ГОСТ' : 'GOST SCREENS'}
              </button>
              <button
                onClick={() => setActiveTab('laws')}
                className={`flex-1 py-2 text-center text-[10px] uppercase font-bold border-b-2 transition-all ${
                  activeTab === 'laws' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {language === 'ru' ? '10 ЗАКОНОВ' : '10 LAWS'}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 max-h-80 overflow-y-auto scrollbar-thin">
              {activeTab === 'scaling' && (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-bold mb-1 uppercase text-indigo-400 text-[10px]">
                      {language === 'ru' ? 'Автоматическое Масштабирование' : 'Automated Auto-Scaling'}
                    </h5>
                    <p className="opacity-70 text-[10px] leading-relaxed">
                      {language === 'ru' 
                        ? 'Система Pulse автоматически определяет разрешения и масштабирует интерфейс с помощью медиа-запросов и пропорциональных отступов. Стандарты ГОСТ 2026/2027 полностью интегрированы в дизайн-систему.'
                        : 'Pulse detects resolutions and automatically scales the interface utilizing modular media queries and flex grids. GOST 2026/2027 screen rules are fully applied.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] opacity-70">
                      <span>{language === 'ru' ? 'Физическая Ширина:' : 'Viewport Width:'}</span>
                      <span className="font-bold text-white">{viewportWidth}px</span>
                    </div>
                    <div className="flex justify-between text-[9px] opacity-70">
                      <span>{language === 'ru' ? 'Физическая Высота:' : 'Viewport Height:'}</span>
                      <span className="font-bold text-white">{viewportHeight}px</span>
                    </div>
                    <div className="flex justify-between text-[9px] opacity-70">
                      <span>{language === 'ru' ? 'Масштабирование:' : 'Dynamic Scale:'}</span>
                      <span className="font-bold text-emerald-400">ACTIVE</span>
                    </div>
                  </div>

                  {simulatedPreset && (
                    <button
                      onClick={() => {
                        setSimulatedPreset(null);
                        window.dispatchEvent(new CustomEvent('sandbox-viewport-change', {
                          detail: { width: window.innerWidth, height: window.innerHeight, presetId: null }
                        }));
                      }}
                      className="w-full py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl hover:bg-rose-500/30 transition-all font-bold uppercase text-[9px]"
                    >
                      {language === 'ru' ? 'СБРОСИТЬ СИМУЛЯЦИЮ' : 'RESET SIMULATION'}
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <p className="opacity-60 text-[9px] mb-2 leading-relaxed">
                    {language === 'ru' 
                      ? 'Выберите пресет для проверки автоматической адаптации по ГОСТу 2026-2027:'
                      : 'Select a preset screen resolution compliant with GOST 2026-2027:'}
                  </p>
                  <div className="space-y-2">
                    {GOST_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          simulatedPreset === preset.id
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg'
                            : isLight ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' : 'bg-white/[0.02] border-white/5 text-[#E0E0E0]/80 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {preset.type === 'desktop' && <Monitor className="w-4 h-4 text-emerald-400" />}
                          {preset.type === 'tablet' && <Tablet className="w-4 h-4 text-purple-400" />}
                          {preset.type === 'mobile' && <Smartphone className="w-4 h-4 text-indigo-400" />}
                          <div>
                            <div className="font-bold text-[10px]">{preset.name}</div>
                            <div className="text-[8px] opacity-50">{preset.standard}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[10px] text-indigo-400">{preset.width}x{preset.height}</div>
                          <div className="text-[8px] opacity-40">{preset.density}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'laws' && (
                <div className="space-y-3">
                  <p className="opacity-60 text-[9px] leading-relaxed mb-2">
                    {language === 'ru' 
                      ? '10 законов простоты Джона Маэда, интегрированных во все студии и лабораторию:'
                      : 'John Maeda\'s 10 Laws of Simplicity integrated across all Forge Studios & Labs:'}
                  </p>
                  <div className="space-y-2">
                    {SIMPLICITY_LAWS.map((law) => (
                      <div 
                        key={law.num} 
                        className={`p-2.5 rounded-2xl border ${
                          isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.01] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-400">
                          <span className="px-1.5 py-0.5 rounded-lg bg-indigo-500/10 text-[9px]">{law.num}</span>
                          <span>{law.name}</span>
                        </div>
                        <p className="opacity-75 text-[9px] leading-relaxed">{law.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with branding */}
            <div className={`p-3 border-t text-[8px] text-center opacity-40 uppercase tracking-widest ${
              isLight ? 'border-gray-200' : 'border-white/5'
            }`}>
              {language === 'ru' ? 'PULSE ЭКОСИСТЕМА • ГОСТ 2026' : 'PULSE ECOSYSTEM • GOST 2026'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
