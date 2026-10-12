import React from 'react';
import { Fingerprint, RefreshCw, Compass } from 'lucide-react';
import { useSystemState } from '../../contexts/SystemStateContext';
import { STYLE_PLAYLISTS } from '../../data/stylePlaylists';
import { StyleBias } from '../../core/PulseKernel';

interface StyleNavigatorProps {
  t: (en: string, ru?: string) => string;
  playBeep: (freq: number, dur: number) => void;
  addTerminalLog: (msg: string) => void;
}

export function StyleNavigator({ t, playBeep, addTerminalLog }: StyleNavigatorProps) {
  const { creativeDNAProfile, setCreativeDNAStyle, setCreativeDNAPlaylist, sequenceDNA } = useSystemState();

  const activePlaylist = STYLE_PLAYLISTS.find(p => p.id === creativeDNAProfile.activePlaylist);

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          {t('Style Navigator', 'Навигатор Стилей')}
        </h5>
        <div className="text-[8px] font-mono text-emerald-400/60 uppercase tracking-widest">
          DNA BIAS: {creativeDNAProfile.styleBias}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
        {/* Aesthetic Selection */}
        <div className="space-y-2.5">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">
            {t('Curated Aesthetics', 'Кураторские Эстетики')}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              'minimalist', 'cyberpunk', 'luxury', 'brutalist', 'neo-glass', 
              'swiss', 'experimental', 'vaporwave', 'retro-future', 'monochrome', 
              'cinematic', 'classic', 'organic', 'industrial', 'corporate'
            ].map((style) => (
              <button
                key={style}
                onClick={() => {
                  setCreativeDNAStyle(style as StyleBias);
                  playBeep(1200, 0.05);
                  addTerminalLog(`Aesthetic bias shifted to: ${style.toUpperCase()}`);
                }}
                className={`py-1.5 rounded-md text-[8px] font-mono uppercase transition-all border ${
                  creativeDNAProfile.styleBias === style 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                    : 'bg-white/3 border-white/5 text-zinc-500 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                {style.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Design Playlists */}
        <div className="space-y-2.5">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">
            {t('High-End Design Playlists', 'Премиальные Плейлисты')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STYLE_PLAYLISTS.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => {
                  setCreativeDNAPlaylist(playlist.id);
                  playBeep(1000, 0.05);
                  addTerminalLog(`Loading playlist: ${playlist.category.toUpperCase()}`);
                }}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${
                  creativeDNAProfile.activePlaylist === playlist.id
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                    : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/10'
                }`}
              >
                {creativeDNAProfile.activePlaylist === playlist.id && (
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${creativeDNAProfile.activePlaylist === playlist.id ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-zinc-700'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{playlist.category}</span>
                </div>
                <div className="text-[8px] opacity-50 font-mono flex justify-between items-center w-full">
                  <span>{playlist.items.length} UI PATTERNS</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Categorized UI Patterns */}
        {activePlaylist && (
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                {activePlaylist.category} Library
              </label>
              <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-tighter">Influencing DNA Generation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
              {activePlaylist.items.map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5 hover:border-white/10 hover:bg-white/[0.04] transition-all group cursor-default">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-200 uppercase group-hover:text-emerald-400 transition-colors">{item.name}</span>
                    <div className="flex gap-1">
                      {item.tags.slice(0, 1).map(tag => (
                        <span key={tag} className="text-[6px] bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono border border-white/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-relaxed line-clamp-2 italic">
                    "{item.description}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            playBeep(1500, 0.1);
            addTerminalLog('DNA Re-sequencing triggered. Re-calibrating neural bias based on history.');
            sequenceDNA();
          }}
          className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t('Resequence', 'Пересобрать')}
        </button>
        <button
          className="py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-xl text-[10px] font-mono font-bold uppercase transition-all border border-white/5 flex items-center justify-center gap-2"
        >
          {t('Export Profile', 'Экспорт')}
        </button>
      </div>
    </div>
  );
}
