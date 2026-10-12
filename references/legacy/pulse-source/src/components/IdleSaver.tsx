import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSystemState } from '../contexts/SystemStateContext';
import { Waves, Activity } from 'lucide-react';

export const IdleSaver: React.FC = () => {
  const [isIdle, setIsIdle] = useState(false);
  const [time, setTime] = useState<Date>(new Date());
  const { systemActivity, logicCoreLoad } = useSystemState();

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      // Set to 2 minutes (120,000ms)
      idleTimer = setTimeout(() => {
        setIsIdle(true);
      }, 120000);
    };

    // Event listeners to detect activity
    const events = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetIdle, { passive: true }));

    // Initial timer setup
    idleTimer = setTimeout(() => {
      setIsIdle(true);
    }, 120000);

    return () => {
      clearTimeout(idleTimer);
      events.forEach((evt) => window.removeEventListener(evt, resetIdle));
    };
  }, []);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence>
      {isIdle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center cursor-none select-none overflow-hidden"
        >
          {/* Subtle Breathing Ambient Radial Gradient */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(56, 189, 248, 0.2) 45%, rgba(0,0,0,0) 75%)',
            }}
          />

          {/* Minimalist Clock & System Heartbeat */}
          <div className="relative z-10 flex flex-col items-center gap-6 text-center font-mono">
            <div className="p-4 rounded-full bg-purple-950/40 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse">
              <Activity className="w-8 h-8 text-purple-400" />
            </div>

            <div className="space-y-1">
              <p className="text-xs tracking-[0.4em] text-purple-400 uppercase">PULSE OS • AMBIENT SAVER</p>
              <h1 className="text-6xl md:text-8xl font-extralight tracking-tight text-white font-sans">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h1>
            </div>

            <div className="flex items-center gap-6 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 backdrop-blur-md">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>CORE: {logicCoreLoad || 28}%</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span>ACTIVITY: {systemActivity || 42}%</span>
              <span className="text-zinc-600">•</span>
              <span className="text-cyan-400">RESTING FREQUENCY 40Hz</span>
            </div>

            <p className="text-[10px] text-zinc-600 tracking-widest uppercase pt-8">
              MOVE CURSOR OR PRESS ANY KEY TO RETURN
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IdleSaver;
