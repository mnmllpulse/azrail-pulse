import React, { useState } from 'react';
import { Rocket, Shield, Globe, ShoppingBag, LayoutDashboard, Database, Smartphone, SearchCode, Settings2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface UniversalHubProps {
  t: (en: string, ru?: string) => string;
  addTerminalLog: (msg: string) => void;
  playBeep: (freq: number, dur: number) => void;
}

export function UniversalHub({ t, addTerminalLog, playBeep }: UniversalHubProps) {
  const [activeType, setActiveType] = useState('saas');
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = [
    { id: 'saas', label: 'B2B SaaS', icon: <Database className="w-4 h-4" />, color: 'text-blue-400' },
    { id: 'ecommerce', label: 'E-commerce', icon: <ShoppingBag className="w-4 h-4" />, color: 'text-amber-400' },
    { id: 'platform', label: 'Social Platform', icon: <Globe className="w-4 h-4" />, color: 'text-purple-400' },
    { id: 'dashboard', label: 'Admin Panel', icon: <LayoutDashboard className="w-4 h-4" />, color: 'text-emerald-400' },
    { id: 'mobile', label: 'Mobile App', icon: <Smartphone className="w-4 h-4" />, color: 'text-rose-400' },
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    playBeep(1200, 0.1);
    addTerminalLog(`INITIATING UNIVERSAL GENERATION: ${activeType.toUpperCase()} ARCHITECTURE...`);
    
    setTimeout(() => {
      setIsGenerating(false);
      addTerminalLog(`GENERATION COMPLETE. CLOUD REPOSITORY SYNCED.`);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Rocket className="w-4 h-4 text-rose-500" />
          {t('Universal Generation Hub', 'Центр Универсальной Генерации')}
        </h5>
        <span className="text-[8px] font-mono text-rose-500/60 uppercase">Complexity: Unlimited</span>
      </div>

      <div className="grid grid-cols-5 gap-2 shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveType(cat.id);
              playBeep(1000, 0.05);
            }}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
              activeType === cat.id 
                ? 'bg-white/10 border-white/20 ring-1 ring-white/10 shadow-lg' 
                : 'bg-black/20 border-white/5 text-zinc-500 hover:border-white/10'
            }`}
          >
            <div className={`${activeType === cat.id ? cat.color : 'text-zinc-600'}`}>{cat.icon}</div>
            <span className="text-[8px] font-mono uppercase font-bold text-center leading-none">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-4 flex flex-col gap-4 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/20 transition-all" />
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Structural Prompt</label>
            <div className="relative">
              <textarea 
                className="w-full bg-white/3 border border-white/10 rounded-xl p-3 text-[10px] text-zinc-300 outline-none focus:border-rose-500/30 min-h-[80px] resize-none"
                placeholder="Describe any complexity... e.g. 'A full-stack banking platform with real-time trading charts, biometric auth, and global ledger sync.'"
              />
              <div className="absolute bottom-2 right-2">
                <Sparkles className="w-3 h-3 text-rose-500/40" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Cloud DB', icon: <Database className="w-3 h-3" />, active: true },
              { label: 'Auth System', icon: <Shield className="w-3 h-3" />, active: true },
              { label: 'SEO Config', icon: <SearchCode className="w-3 h-3" />, active: true },
              { label: 'API Gateway', icon: <Settings2 className="w-3 h-3" />, active: true },
            ].map((feature, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{feature.icon}</span>
                  <span className="text-[9px] font-bold text-zinc-300 uppercase">{feature.label}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${feature.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`mt-auto py-3 rounded-xl font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 overflow-hidden relative ${
            isGenerating 
              ? 'bg-rose-500/20 text-rose-400 cursor-wait' 
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 active:scale-[0.98]'
          }`}
        >
          {isGenerating ? (
            <>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Rocket className="w-4 h-4" />
              </motion.div>
              <span>{t('Synthesizing Architecture...', 'Синтез Архитектуры...')}</span>
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              <span>{t('Launch Universal Generation', 'Запустить Универсальную Генерацию')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
