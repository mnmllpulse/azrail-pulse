import React from 'react';
import { motion } from 'motion/react';
import { Sliders, Volume2, Mic2, Activity, Zap, Layers, Settings, AudioWaveform as Waveform, Disc, ArrowUpRight } from 'lucide-react';

const MixerChannel: React.FC<{ index: number; isLight?: boolean }> = ({ index, isLight }) => {
  return (
    <div className={`w-28 flex flex-col items-center py-6 border-r ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
      <div className="flex flex-col gap-2 mb-8">
        {[1, 2, 3].map(knob => (
          <div key={knob} className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center relative group">
            <motion.div 
              animate={{ rotate: [0, 45, -20, 10][index % 4] }}
              className="w-px h-3 bg-indigo-500 absolute top-1 left-1/2 -translate-x-1/2 origin-bottom shadow-[0_0_5px_rgba(99,102,241,0.5)]" 
            />
            <span className="text-[6px] font-mono absolute -bottom-3 opacity-20 uppercase tracking-tighter">EQ-{knob}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 w-full flex justify-center py-8">
         <div className="h-64 w-2 bg-black/60 rounded-full relative overflow-hidden group">
            <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex flex-col justify-between py-2">
               {Array.from({ length: 12 }).map((_, i) => (
                 <div key={i} className="h-px w-full bg-white/10" />
               ))}
            </div>
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0, bottom: 256 }}
              className="absolute left-1/2 -translate-x-1/2 w-8 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded cursor-ns-resize shadow-2xl z-10 flex flex-col items-center justify-center gap-1"
              style={{ bottom: `${[80, 40, 60, 90, 30][index % 5]}%` }}
            >
               <div className="w-4 h-px bg-white/40" />
               <div className="w-4 h-px bg-white/40" />
            </motion.div>
            <motion.div 
              className="absolute bottom-0 inset-x-0 bg-indigo-500/20"
              animate={{ height: `${[80, 40, 60, 90, 30][index % 5]}%` }}
            />
         </div>
      </div>

      <div className="flex flex-col gap-2 mt-8">
        <button className="w-6 h-6 rounded bg-rose-500/20 border border-rose-500/30 text-[8px] font-mono text-rose-500 font-bold flex items-center justify-center">M</button>
        <button className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/30 text-[8px] font-mono text-amber-500 font-bold flex items-center justify-center">S</button>
      </div>

      <div className="mt-8 text-center">
         <span className="text-[9px] font-mono opacity-20 block mb-1">CH-0{index + 1}</span>
         <span className="text-[10px] font-bold font-mono tracking-tighter truncate w-24 block px-2 uppercase opacity-60">
            {['KICK', 'BASS', 'LEAD', 'ATMOS', 'VOX'][index % 5]}
         </span>
      </div>
    </div>
  );
};

export const MixerConsole: React.FC<{ isLight?: boolean }> = ({ isLight }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Mixer Header */}
      <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                  <Sliders className="w-6 h-6 text-emerald-400" />
               </div>
               <div>
                  <h2 className="text-xl font-bold font-mono uppercase tracking-tighter">Mixer Console OS v4.0</h2>
                  <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.2em]">High Fidelity Neural Routing</p>
               </div>
            </div>
            
            <div className="flex gap-3">
               {['ROUTING', 'FX ENGINE', 'METERING'].map(tab => (
                 <button key={tab} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-mono uppercase hover:bg-white/10 transition-all">
                    {tab}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Mixer Surface */}
      <div className={`p-0 rounded-[40px] border ${isLight ? 'bg-white border-gray-100 overflow-hidden' : 'bg-black/60 border-white/5 backdrop-blur-3xl overflow-hidden'} flex overflow-x-auto custom-scrollbar`}>
         {Array.from({ length: 12 }).map((_, i) => (
           <MixerChannel key={i} index={i} isLight={isLight} />
         ))}

         {/* Master Channel */}
         <div className={`w-40 flex flex-col items-center py-6 bg-white/5 backdrop-blur-3xl border-l border-white/10 sticky right-0`}>
            <div className="flex flex-col gap-3 mb-8">
               <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                  <Zap className="w-6 h-6 text-indigo-400" />
               </div>
            </div>

            <div className="flex-1 w-full flex justify-center py-8">
               <div className="h-64 w-4 bg-black/60 rounded-full relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex flex-col justify-between py-2">
                     {Array.from({ length: 24 }).map((_, i) => (
                       <div key={i} className="h-px w-full bg-white/5" />
                     ))}
                  </div>
                  <motion.div 
                    className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-indigo-500 via-purple-500 to-rose-500"
                    animate={{ height: '78%' }}
                  />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-[78%] w-8 h-12 bg-white rounded cursor-ns-resize z-10 shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
               </div>
            </div>

            <div className="mt-8 text-center">
               <span className="text-[10px] font-bold font-mono tracking-widest block uppercase text-indigo-400">MASTER</span>
               <span className="text-[9px] font-mono opacity-20 block mt-1">MAIN OUTPUT</span>
            </div>
         </div>
      </div>

      {/* Metering & Analytics Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white' : 'bg-black/40 border-white/5'}`}>
            <div className="flex items-center gap-3 mb-4">
               <Activity className="w-4 h-4 text-emerald-400" />
               <span className="text-[10px] font-mono uppercase opacity-40">Phase Correlation</span>
            </div>
            <div className="h-24 bg-black/40 rounded-2xl flex items-center justify-center">
               <motion.div 
                 animate={{ scaleX: [0.8, 1.2, 0.9, 1.1] }} 
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="w-1/2 h-px bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
               />
            </div>
         </div>
         <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white' : 'bg-black/40 border-white/5'}`}>
            <div className="flex items-center gap-3 mb-4">
               <Waveform className="w-4 h-4 text-indigo-400" />
               <span className="text-[10px] font-mono uppercase opacity-40">Spectral Analysis</span>
            </div>
            <div className="h-24 bg-black/40 rounded-2xl flex items-end gap-1 px-4 py-2">
               {Array.from({ length: 20 }).map((_, i) => (
                 <motion.div 
                   key={i}
                   animate={{ height: `${[20, 60, 40, 80, 50][i % 5]}%` }}
                   transition={{ repeat: Infinity, duration: 0.5 + Math.random() }}
                   className="flex-1 bg-indigo-500/40 rounded-t-sm" 
                 />
               ))}
            </div>
         </div>
         <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white' : 'bg-black/40 border-white/5'}`}>
            <div className="flex items-center gap-3 mb-4">
               <Settings className="w-4 h-4 text-amber-400" />
               <span className="text-[10px] font-mono uppercase opacity-40">Dynamic Range</span>
            </div>
            <div className="flex items-center justify-between h-24">
               <div className="text-center">
                  <p className="text-xl font-bold font-mono">14.2</p>
                  <p className="text-[8px] font-mono opacity-40">LUFS</p>
               </div>
               <div className="text-center">
                  <p className="text-xl font-bold font-mono">-0.1</p>
                  <p className="text-[8px] font-mono opacity-40">PEAK</p>
               </div>
               <div className="text-center">
                  <p className="text-xl font-bold font-mono">9.4</p>
                  <p className="text-[8px] font-mono opacity-40">RMS</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
