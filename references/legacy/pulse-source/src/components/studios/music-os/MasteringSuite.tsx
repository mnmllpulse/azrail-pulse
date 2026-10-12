import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Activity, Zap, Layers, 
  Settings, Save, Download, Volume2,
  Maximize2, BarChart3, Waves
} from 'lucide-react';
import { useMusicOS } from './OSKernel';

export function MasteringSuite() {
  const { state } = useMusicOS();
  const [isMastering, setIsMastering] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleMaster = () => {
    setIsMastering(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsMastering(false);
          return 100;
        }
        return p + 2;
      });
    }, 100);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loudness & Dynamics */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono uppercase tracking-tighter">AI Mastering Chain</h3>
                    <p className="text-[10px] opacity-60 font-mono">Metatron v4.2 Professional Release Engine</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] opacity-40 font-mono uppercase tracking-wider">Target LUFS</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">-8.0</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-right">
                    <div className="text-[10px] opacity-40 font-mono uppercase tracking-wider">True Peak</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">-1.0dB</div>
                  </div>
                </div>
              </div>

              {/* Mastering Visualizer */}
              <div className="h-48 bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden flex items-end px-2 gap-1">
                 {Array.from({ length: 64 }).map((_, i) => (
                   <motion.div 
                     key={i}
                     initial={{ height: 20 }}
                     animate={{ 
                       height: isMastering ? [20, Math.random() * 80 + 20, 20] : 20,
                       backgroundColor: isMastering ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                     }}
                     transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.01 }}
                     className="flex-1 rounded-t-sm"
                   />
                 ))}
                 <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20 text-[8px] font-mono">
                    <div className="border-t border-emerald-500 w-full" />
                    <div className="border-t border-emerald-500/50 w-full" />
                    <div className="border-t border-emerald-500/20 w-full" />
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <MasteringModule label="Spectral EQ" status="Optimized" active />
                 <MasteringModule label="Dynamic Comp" status="Preserved" active />
                 <MasteringModule label="Stereo Width" status="0.84" active />
                 <MasteringModule label="Limiter" status="Pro-L 2" active />
              </div>
           </div>
        </div>

        {/* Master Control Sidebar */}
        <div className="flex flex-col gap-6">
           <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 font-bold">Release Output</h4>
              
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[9px] font-mono uppercase text-white/40 mb-2">Export Format</div>
                    <select className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs font-mono outline-none">
                       <option>WAV 24-bit / 44.1kHz</option>
                       <option>MP3 320kbps</option>
                       <option>FLAC Lossless</option>
                    </select>
                 </div>

                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[9px] font-mono uppercase text-white/40 mb-2">Dither</div>
                    <div className="flex gap-2">
                       {['None', 'Type 1', 'Type 2'].map(t => (
                         <button key={t} className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase border ${t === 'Type 1' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/5 text-white/40'}`}>
                           {t}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleMaster}
                disabled={isMastering}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-mono uppercase font-bold tracking-widest transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col items-center gap-1"
              >
                {isMastering ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin mb-1" />
                    <span>Mastering: {progress}%</span>
                    <div className="w-32 h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-white" style={{ width: `${progress}%` }} />
                    </div>
                  </>
                ) : (
                  <>
                    <Waves className="w-4 h-4 mb-1" />
                    <span>Initiate Master Render</span>
                  </>
                )}
              </button>

              <button className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 rounded-2xl text-[10px] font-mono uppercase font-bold tracking-widest transition-all flex items-center justify-center gap-2">
                 <Download className="w-3.5 h-3.5" /> Direct to Beatport
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function MasteringModule({ label, status, active }: { label: string, status: string, active?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${active ? 'bg-white/5 border-emerald-500/20' : 'bg-white/2 border-white/5 opacity-40'}`}>
      <div className="text-[9px] font-mono text-white/40 uppercase tracking-tighter">{label}</div>
      <div className={`text-[10px] font-bold font-mono ${active ? 'text-emerald-400' : 'text-white/20'}`}>{status}</div>
    </div>
  );
}
