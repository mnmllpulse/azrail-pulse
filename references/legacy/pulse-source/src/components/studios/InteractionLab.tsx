import React from 'react';
import { MousePointer2, ArrowUpRight, Layers, Box, Cpu, Activity, Sliders } from 'lucide-react';

interface InteractionLabProps {
  t: (en: string, ru?: string) => string;
}

export function InteractionLab({ t }: InteractionLabProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-emerald-400" />
          {t('Motion & Interaction Lab', 'Лаборатория Анимаций')}
        </h5>
        <div className="text-[8px] font-mono text-emerald-400 uppercase">ENGINE: PULSE-FLOW v4.0</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'scroll_reveal', name: 'Scroll Reveal', desc: 'Staggered entrance on viewport hit', icon: <ArrowUpRight className="w-3 h-3" /> },
            { id: 'parallax_depth', name: 'Parallax Layers', desc: 'Multi-layer depth with mouse tracking', icon: <Layers className="w-3 h-3" /> },
            { id: 'hover_warp', name: 'Magnetic Hover', desc: 'Elements follow cursor with elasticity', icon: <MousePointer2 className="w-3 h-3" /> },
            { id: 'liquid_tab', name: 'Liquid Tabs', desc: 'Elastic active state background flow', icon: <Activity className="w-3 h-3" /> },
            { id: 'text_glitch', name: 'Neural Glitch', desc: 'Subtle high-tech text distortion', icon: <Cpu className="w-3 h-3" /> },
            { id: 'bento_expand', name: 'Bento Expand', desc: 'Animated grid cell expansion', icon: <Box className="w-3 h-3" /> }
          ].map((effect) => (
            <div key={effect.id} className="bg-white/3 border border-white/5 rounded-xl p-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer group">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                  {effect.icon}
                </div>
                <span className="text-[10px] font-bold text-zinc-300 uppercase">{effect.name}</span>
              </div>
              <p className="text-[8px] text-zinc-500 leading-tight">{effect.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-black/60 border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">{t('Physics Controller', 'Контроллер Физики')}</span>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Spring Stiffness', val: 80 },
              { label: 'Damping Factor', val: 40 },
              { label: 'Mass Gravity', val: 20 },
            ].map((slider, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                  <span>{slider.label}</span>
                  <span>{slider.val}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full relative">
                  <div className="absolute top-0 left-0 h-full bg-emerald-500/40 rounded-full" style={{ width: `${slider.val}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ left: `${slider.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
        <Sliders className="w-3.5 h-3.5" /> {t('Sync Animation Stack', 'Синхронизировать Стек')}
      </button>
    </div>
  );
}
