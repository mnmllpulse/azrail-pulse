import React from 'react';
import { Box, Layers, Grid, RefreshCw, Sliders, Layout } from 'lucide-react';

interface BentoForgeProps {
  t: (en: string, ru?: string) => string;
}

export function BentoForge({ t }: BentoForgeProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          {t('Bento Component Forge', 'Кузница Компонентов')}
        </h5>
        <div className="text-[8px] font-mono text-cyan-400 uppercase">MODULAR: ENABLED</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className={`rounded-lg bg-white/3 border border-white/5 flex items-center justify-center p-2 hover:border-cyan-500/30 transition-all cursor-pointer ${i % 3 === 0 ? 'col-span-2' : ''}`}>
              <div className="w-full h-full border-2 border-dashed border-white/5 rounded flex items-center justify-center text-[8px] text-zinc-600 font-mono">
                {i % 3 === 0 ? '2x1' : '1x1'}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Grid Orchestration</span>
            <span className="text-cyan-400">12 Column</span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Gutter Spacing', val: 16 },
              { label: 'Border Radius', val: 24 },
            ].map((slider, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                  <span>{slider.label}</span>
                  <span>{slider.val}px</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full relative">
                  <div className="absolute top-0 left-0 h-full bg-cyan-500/40 w-1/2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20">
        <Layout className="w-3.5 h-3.5" /> {t('Assemble Bento Pack', 'Собрать Bento Пакет')}
      </button>
    </div>
  );
}
