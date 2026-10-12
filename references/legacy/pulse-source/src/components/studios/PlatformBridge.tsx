import React from 'react';
import { Share2, Globe, Laptop, Smartphone, Download, CheckCircle, RefreshCw } from 'lucide-react';

interface PlatformBridgeProps {
  t: (en: string, ru?: string) => string;
}

export function PlatformBridge({ t }: PlatformBridgeProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-400" />
          {t('Multi-Platform Bridge', 'Кросс-платформенный Мост')}
        </h5>
        <div className="text-[8px] font-mono text-purple-400 uppercase">ADAPTIVE EXPORT ENGINE</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'react', label: 'React / Vite', icon: <RefreshCw className="w-4 h-4 text-blue-400" />, ready: true },
            { id: 'next', label: 'Next.js App', icon: <Globe className="w-4 h-4 text-white" />, ready: true },
            { id: 'vue', label: 'Vue.js 3', icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, ready: true },
            { id: 'native', label: 'React Native', icon: <Smartphone className="w-4 h-4 text-blue-500" />, ready: true },
          ].map(platform => (
            <div key={platform.id} className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group text-center flex flex-col items-center gap-2">
              <div className="p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                {platform.icon}
              </div>
              <span className="text-[10px] font-bold text-zinc-300 uppercase">{platform.label}</span>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-purple-500 w-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>AST Translation Status</span>
            <span className="text-purple-400">Verified</span>
          </div>
          <div className="text-[8px] text-zinc-500 leading-relaxed italic">
            "Your architecture is 100% compatible with all target frameworks. Structural integrity maintained through AST deep-analysis."
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2">
          <Download className="w-3.5 h-3.5" /> {t('Download ZIP', 'Скачать ZIP')}
        </button>
        <button className="py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20">
          <Share2 className="w-3.5 h-3.5" /> {t('Cloud Push', 'Пуш в Облако')}
        </button>
      </div>
    </div>
  );
}
