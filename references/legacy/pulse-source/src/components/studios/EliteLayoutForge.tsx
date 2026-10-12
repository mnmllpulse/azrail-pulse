import React, { useState } from 'react';
import { LayoutTemplate, Star, Rocket, Sparkles, Layers, MousePointer2, RefreshCw, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface EliteLayoutForgeProps {
  t: (en: string, ru?: string) => string;
  addTerminalLog: (msg: string) => void;
  playBeep: (freq: number, dur: number) => void;
}

export function EliteLayoutForge({ t, addTerminalLog, playBeep }: EliteLayoutForgeProps) {
  const [activeLayout, setActiveLayout] = useState('bento_2');

  const premiumLayouts = [
    { 
      id: 'bento_2', 
      name: 'Bento Grid 2.0', 
      desc: 'Modular, adaptive layout for high-end dashboards and portfolios.', 
      price: '$12,000',
      difficulty: 'Elite',
      icon: <Layers className="w-4 h-4 text-emerald-400" />
    },
    { 
      id: 'scroll_story', 
      name: 'Immersive Scroll-telling', 
      desc: 'Scroll-linked animations with high-depth storytelling layers.', 
      price: '$15,000',
      difficulty: 'Extreme',
      icon: <MousePointer2 className="w-4 h-4 text-rose-400" />
    },
    { 
      id: 'neural_saas', 
      name: 'Neural SaaS Dashboard', 
      desc: 'Data-dense, AI-integrated interface with predictive UX.', 
      price: '$18,000',
      difficulty: 'Pro',
      icon: <Zap className="w-4 h-4 text-amber-400" />
    },
    { 
      id: 'infinite_canvas', 
      name: 'Infinite Canvas Pro', 
      desc: 'Panning/Zooming workspace for complex toolsets and editors.', 
      price: '$25,000',
      difficulty: 'Master',
      icon: <LayoutTemplate className="w-4 h-4 text-blue-400" />
    },
    { 
      id: 'apple_minimal', 
      name: 'Apple-Grade Minimal', 
      desc: 'Extreme focus on typography, negative space, and rhythm.', 
      price: '$10,000',
      difficulty: 'Elite',
      icon: <Star className="w-4 h-4 text-zinc-400" />
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-emerald-400" />
          {t('Elite Layout Forge ($10k+)', 'Кузница Элитных Макетoв')}
        </h5>
        <div className="flex items-center gap-2 text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
          STATUS: <span className="text-emerald-400">OPTIMAL</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="space-y-2">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Premium Pattern Playlist</label>
          <div className="grid grid-cols-1 gap-2">
            {premiumLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => {
                  setActiveLayout(layout.id);
                  playBeep(1100, 0.05);
                  addTerminalLog(`Loading Elite Blueprint: ${layout.name.toUpperCase()}`);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                  activeLayout === layout.id 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeLayout === layout.id ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                    {layout.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-zinc-200 uppercase">{layout.name}</div>
                    <div className="text-[8px] text-zinc-500 leading-tight line-clamp-1">{layout.desc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold text-emerald-400 font-mono">{layout.price}</div>
                  <div className="text-[7px] text-zinc-600 font-mono uppercase">{layout.difficulty}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="space-y-3 relative z-10">
            <div className="text-[10px] font-bold text-white uppercase tracking-tight">Active Generation Context</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                <span>AST Complexity</span>
                <span className="text-emerald-400">High-End</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/40 w-[88%]" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[7px] font-mono text-zinc-400 uppercase">React 18</span>
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[7px] font-mono text-zinc-400 uppercase">Framer Motion</span>
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[7px] font-mono text-zinc-400 uppercase">Tailwind v4</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          playBeep(1400, 0.1);
          addTerminalLog(`GENERATING ELITE ${activeLayout.toUpperCase()} CODEBASE...`);
        }}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
      >
        <Rocket className="w-4 h-4" /> {t('Initialize Layout Synthesis', 'Синтезировать Элитный Макет')}
      </button>
    </div>
  );
}
