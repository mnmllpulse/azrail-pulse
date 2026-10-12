import React from 'react';
import { Image, PenTool, Radio, Scale, Sparkles, RefreshCw, Download } from 'lucide-react';

interface VectorLabProps {
  t: (en: string, ru?: string) => string;
}

export function VectorLab({ t }: VectorLabProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <PenTool className="w-4 h-4 text-rose-400" />
          {t('Vector Asset Lab', 'Лаборатория Векторов')}
        </h5>
        <div className="text-[8px] font-mono text-rose-400 uppercase">ENGINE: SVG-GEN v2.0</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/3 border border-white/5 flex items-center justify-center hover:bg-rose-500/5 hover:border-rose-500/20 transition-all cursor-pointer group">
              <div className="w-12 h-12 text-rose-400/20 group-hover:text-rose-400/40 transition-colors">
                <Image className="w-full h-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Style Orchestrator</span>
            <span className="text-rose-400">Custom</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Minimalist', 'Duo-tone', 'Isometric', 'Abstract', 'High-Detail'].map(tag => (
              <span key={tag} className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[7px] font-mono text-rose-400 uppercase cursor-pointer hover:bg-rose-500/20">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-[9px] text-zinc-400 leading-tight">
            Generating unique branding assets consistent with your current design system colors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2">
          <Download className="w-3.5 h-3.5" /> {t('Batch Export', 'Экспорт')}
        </button>
        <button className="py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20">
          <RefreshCw className="w-3.5 h-3.5" /> {t('Regenerate All', 'Обновить всё')}
        </button>
      </div>
    </div>
  );
}
