import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Fingerprint, ChevronRight } from 'lucide-react';
import { ConfigService } from '../../services/ConfigService';

export const AgeGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPassed, setIsPassed] = useState(() => {
    return ConfigService.get('age_gate_passed', false);
  });

  const handlePass = () => {
    setIsPassed(true);
    ConfigService.set('age_gate_passed', true);
  };

  if (isPassed) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100000] bg-depth-space flex items-center justify-center p-6 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md text-center space-y-12"
      >
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-6 rounded-[2rem] bg-white/5 border border-white/10 shadow-2xl relative group">
            <div className="absolute inset-0 rounded-[2rem] bg-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Fingerprint className="w-12 h-12 text-white relative z-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">Access Protocol</h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-500">Neural Verification Required</p>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl space-y-8">
          <div className="flex items-start gap-4 text-left">
            <ShieldAlert className="w-5 h-5 text-purple-500 shrink-0 mt-1" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              This system contains high-density neural outputs, unfiltered generative content, and experimental AI modules. Access is restricted to authorized operators (18+).
            </p>
          </div>

          <button
            onClick={handlePass}
            className="w-full py-5 rounded-2xl bg-white text-zinc-950 font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:bg-purple-500 hover:text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 group"
          >
            I am an Authorized Operator
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
          MNMLL PULSE OS // BIO-VERIFICATION v1.0.4
        </p>
      </motion.div>
    </div>
  );
};
