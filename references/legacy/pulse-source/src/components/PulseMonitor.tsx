import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useSystemState } from '../contexts/SystemStateContext';
import { Activity, Zap, Cpu, Server } from 'lucide-react';

export const PulseMonitor: React.FC = () => {
  const { systemActivity, logicCoreLoad } = useSystemState();
  const [pulseWavePoints, setPulseWavePoints] = useState<string>('');

  const activeLoad = Math.max(systemActivity || 30, logicCoreLoad || 25);

  // Generate dynamic SVG path for real-time adaptive pulse wave
  useEffect(() => {
    const generatePath = () => {
      const width = 300;
      const height = 60;
      const points: [number, number][] = [];
      const steps = 30;

      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * width;
        // Frequency and amplitude shift based on system load
        const freq = 0.05 + (activeLoad / 100) * 0.1;
        const amp = 8 + (activeLoad / 100) * 18;
        const timeFactor = Date.now() * 0.003;
        const y = height / 2 + Math.sin(i * freq + timeFactor) * amp;
        points.push([x, y]);
      }

      const pathStr = points.reduce((acc, [px, py], idx) => {
        return idx === 0 ? `M ${px},${py}` : `${acc} L ${px},${py}`;
      }, '');

      setPulseWavePoints(pathStr);
    };

    const interval = setInterval(generatePath, 80);
    return () => clearInterval(interval);
  }, [activeLoad]);

  return (
    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.1)] space-y-4 font-mono select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">SYSTEM PULSE MONITOR</h3>
            <p className="text-[10px] text-zinc-400">Real-time Neural Frequency & Compute Waves</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{activeLoad}% LOAD</span>
        </div>
      </div>

      {/* SVG Adaptive Wave Monitor */}
      <div className="relative w-full h-[60px] bg-black/60 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />

        <svg className="w-full h-full relative z-10" viewBox="0 0 300 60" preserveAspectRatio="none">
          {/* Glowing Shadow Wave */}
          <path
            d={pulseWavePoints}
            fill="none"
            stroke="#c084fc"
            strokeWidth="3"
            className="blur-xs opacity-75"
          />

          {/* Crisp Cyan Vector Wave */}
          <motion.path
            d={pulseWavePoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Dynamic Center Pulse Line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-purple-500/20 pointer-events-none" />
      </div>

      {/* Telemetry Footer Grid */}
      <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-white/5 text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-purple-400" />
          <span>FREQ: 40Hz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Server className="w-3 h-3 text-cyan-400" />
          <span>NODE: ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>LATENCY: 18ms</span>
        </div>
      </div>
    </div>
  );
};

export default PulseMonitor;
