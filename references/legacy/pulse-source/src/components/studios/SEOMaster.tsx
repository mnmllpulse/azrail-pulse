import React from 'react';
import { SearchCode, Globe, BarChart3, Wand2, RefreshCw, CheckCircle } from 'lucide-react';

interface SEOMasterProps {
  t: (en: string, ru?: string) => string;
}

export function SEOMaster({ t }: SEOMasterProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <SearchCode className="w-4 h-4 text-amber-400" />
          {t('SEO AI Master', 'SEO ИИ Мастер')}
        </h5>
        <div className="text-[8px] font-mono text-amber-400 uppercase">INDEXING: OPTIMIZED</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Score', val: 98, sub: 'Out of 100' },
            { label: 'Visibility', val: 'High', sub: 'Top 1% Global' },
          ].map((stat, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5">
              <div className="text-[8px] font-mono uppercase text-zinc-500 mb-1">{stat.label}</div>
              <div className="text-lg font-bold text-white">{stat.val}</div>
              <div className="text-[8px] font-mono text-zinc-600">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Optimization Checklist</label>
          {[
            { label: 'Dynamic Meta Tags', active: true },
            { label: 'JSON-LD Structured Data', active: true },
            { label: 'Sitemap.xml Auto-Gen', active: true },
            { label: 'Canonical URL Logic', active: true },
            { label: 'Alt-Text for All Images', active: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-300 font-bold uppercase">{item.label}</span>
              {item.active ? (
                <CheckCircle className="w-3 h-3 text-emerald-500" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-white/10" />
              )}
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Wand2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">AI Suggestions</span>
          </div>
          <p className="text-[9px] text-zinc-400 leading-relaxed italic">
            "Your H1 tags are slightly redundant. I suggest simplifying to 'Universal Web Studio' for better organic ranking."
          </p>
        </div>
      </div>

      <button className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20">
        <RefreshCw className="w-3.5 h-3.5" /> {t('Audit & Re-Optimize', 'Аудит и Оптимизация')}
      </button>
    </div>
  );
}
