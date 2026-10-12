import React from 'react';
import { motion } from 'motion/react';
import { Disc, Zap, Activity, Layers, Sliders, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useMusicOS } from './OSKernel';
import { DJDeck } from '../../../types';

const Deck: React.FC<{ deck: DJDeck; isLight?: boolean }> = ({ deck, isLight }) => {
  return (
    <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-black/60 border-white/5 backdrop-blur-2xl'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${deck.isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/20'}`}>
            <Disc className={`w-5 h-5 ${deck.isActive ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider">Deck {deck.id.split('-')[1]}</h3>
            <p className="text-[10px] font-mono opacity-40">{deck.isActive ? 'LIVE ENGINE' : 'STANDBY'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold font-mono text-indigo-400">{deck.bpm.toFixed(1)}</span>
          <span className="text-[8px] font-mono opacity-30 uppercase">BPM SYNCED</span>
        </div>
      </div>

      {/* Waveform Visualization (Mock) */}
      <div className="h-24 bg-black/40 rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center gap-[2px] px-2">
         {Array.from({ length: 40 }).map((_, i) => (
           <motion.div 
             key={i}
             animate={{ height: deck.isActive ? [10, 40, 20, 60, 30][i % 5] : 4 }}
             transition={{ repeat: Infinity, duration: 0.5 + Math.random(), ease: "easeInOut" }}
             className={`w-1 rounded-full ${deck.isActive ? 'bg-indigo-500/40' : 'bg-white/10'}`}
           />
         ))}
         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent pointer-events-none" />
         <div className="absolute top-0 left-1/2 bottom-0 w-px bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] z-10" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-xl border ${isLight ? 'bg-gray-50' : 'bg-white/5 border-white/5'}`}>
          <span className="text-[8px] font-mono uppercase opacity-40 block mb-1">Track Info</span>
          <p className="text-[10px] font-bold truncate">{deck.trackName || 'Empty Slot'}</p>
          <p className="text-[8px] font-mono opacity-40 truncate">{deck.artist || 'Load Track...'}</p>
        </div>
        <div className={`p-3 rounded-xl border ${isLight ? 'bg-gray-50' : 'bg-white/5 border-white/5'} flex flex-col justify-center items-center`}>
          <span className="text-[8px] font-mono uppercase opacity-40 block mb-1">Harmonic Key</span>
          <span className="text-sm font-bold font-mono text-emerald-400">{deck.key}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          <Play className="w-3 h-3 fill-current" />
        </button>
        <button className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const DJStudio: React.FC<{ isLight?: boolean }> = ({ isLight }) => {
  const { state, updateState } = useMusicOS();

  return (
    <div className="flex flex-col gap-6">
      {/* OS Dashboard Header */}
      <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
               <Zap className="w-6 h-6 text-indigo-400" />
             </div>
             <div>
               <h2 className="text-xl font-bold font-mono uppercase tracking-tighter">Deck Engine OS v1.0</h2>
               <div className="flex items-center gap-3 mt-1">
                 <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                   <Activity className="w-3 h-3" /> MASTER SYNC: ACTIVE
                 </span>
                 <span className="text-[10px] font-mono text-white/30 px-2 py-0.5 bg-white/5 rounded border border-white/10 uppercase tracking-widest">
                   {state.bpm} BPM
                 </span>
               </div>
             </div>
           </div>

           <div className="flex items-center gap-2">
             <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
               <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">ON AIR</span>
             </div>
           </div>
        </div>
      </div>

      {/* 4 Deck Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {state.decks.map(deck => (
          <Deck key={deck.id} deck={deck} isLight={isLight} />
        ))}
      </div>

      {/* Professional Mixer & Crossfader */}
      <div className={`p-8 rounded-[40px] border ${isLight ? 'bg-white border-gray-100 shadow-xl' : 'bg-black/80 border-white/10 backdrop-blur-3xl'}`}>
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xs font-mono uppercase tracking-[0.2em] opacity-40">AI Logic Crossfader</h3>
           <div className="flex gap-4">
             {['SMOOTH', 'CUT', 'HAMSTER', 'AI MIX'].map(mode => (
               <button key={mode} className={`text-[9px] font-mono px-3 py-1 rounded-full border border-white/10 ${mode === 'AI MIX' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40'}`}>
                 {mode}
               </button>
             ))}
           </div>
        </div>

        <div className="relative h-12 bg-black/60 rounded-full border border-white/5 flex items-center px-4">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
          <motion.div 
            drag="x"
            dragConstraints={{ left: -150, right: 150 }}
            className="w-16 h-8 bg-indigo-500 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-grab active:cursor-grabbing border border-white/20 flex items-center justify-center"
          >
            <Layers className="w-4 h-4 text-white" />
          </motion.div>
          <div className="w-full flex justify-between px-8 pointer-events-none">
            <span className="text-[10px] font-mono text-white/20">DECK A</span>
            <span className="text-[10px] font-mono text-white/20">DECK B</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-8 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <div className="h-48 w-1.5 bg-black/40 rounded-full relative overflow-hidden">
                <motion.div 
                   className="absolute bottom-0 left-0 right-0 bg-indigo-500"
                   animate={{ height: `${[80, 40, 60, 90][i]}%` }}
                />
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-white/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
