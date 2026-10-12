import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart
} from 'recharts';
import { useSystemState } from '../contexts/SystemStateContext';
import { Brain, Activity, Zap, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useBackgroundSync } from '../contexts/GlobalMotionContext';

interface PatternDataPoint {
  time: string;
  intensity: number;
  frequency: number;
  integrity: number;
  quantumFluctuation: number;
}

export const NeuralPatternWidget: React.FC<{ isLight: boolean }> = ({ isLight }) => {
  const { systemActivity, pulseFrequency, integrityPercentage, activeNodes } = useSystemState();
  const [data, setData] = useState<PatternDataPoint[]>([]);
  const syncProps = useBackgroundSync();

  // Populate initial realistic wave pattern data
  useEffect(() => {
    const points: PatternDataPoint[] = [];
    const now = Date.now();
    for (let i = 19; i >= 0; i--) {
      const timeStr = new Date(now - i * 2000).toTimeString().split(' ')[0].slice(3, 8);
      const randomSeed = Math.sin(i * 0.5) * 0.4 + 0.6;
      points.push({
        time: timeStr,
        intensity: Math.round((0.3 + randomSeed * 0.5) * 100),
        frequency: Math.round((0.4 + Math.cos(i * 0.8) * 0.3) * 100),
        integrity: Math.round(integrityPercentage - (Math.random() * 2)),
        quantumFluctuation: Math.round(Math.abs(Math.sin(i) * Math.cos(i * 1.5)) * 100)
      });
    }
    setData(points);
  }, [integrityPercentage]);

  // Append new data points dynamically matching system pulse activity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0].slice(3, 8);
      
      setData((prev) => {
        // Calculate dynamic reactive metrics based on real state
        const baseIntensity = systemActivity * 70 + 20; // range 20-90
        const jitter = Math.sin(Date.now() / 1000) * 10;
        const newIntensity = Math.min(100, Math.max(10, Math.round(baseIntensity + jitter)));
        
        const baseFreq = pulseFrequency * 40 + 20;
        const newFreq = Math.min(100, Math.max(10, Math.round(baseFreq + Math.cos(Date.now() / 500) * 8)));

        const newPoint: PatternDataPoint = {
          time: timeStr,
          intensity: newIntensity,
          frequency: newFreq,
          integrity: Math.round(integrityPercentage),
          quantumFluctuation: Math.round(Math.abs(Math.sin(Date.now() / 2000) * Math.cos(Date.now() / 1200)) * 100)
        };

        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [systemActivity, pulseFrequency, integrityPercentage]);

  // Prepare simple Radar data matching present metrics
  const radarData = [
    { subject: 'Activity', value: Math.round(systemActivity * 100), fullMark: 100 },
    { subject: 'Symmetry', value: Math.round(100 - Math.abs(50 - activeNodes * 2)), fullMark: 100 },
    { subject: 'Resonance', value: Math.round(pulseFrequency * 40), fullMark: 100 },
    { subject: 'Integrity', value: Math.round(integrityPercentage), fullMark: 100 },
    { subject: 'Fluctuation', value: data[data.length - 1]?.quantumFluctuation || 45, fullMark: 100 },
  ];

  return (
    <div className={`p-8 rounded-[32px] border transition-all duration-500 flex flex-col lg:flex-row gap-6 h-full ${
      isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-depth-nebula border-white/5 shadow-2xl'
    }`} id="neural-pattern-widget">
      
      {/* Metrics & Metadata Side panel */}
      <div className="flex-1 max-w-sm flex flex-col justify-between space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <motion.div {...syncProps} className="p-2 bg-pulse-primary/10 rounded-lg">
              <Brain className="w-5 h-5 text-pulse-primary" />
            </motion.div>
            <div className="flex flex-col">
              <h2 className="text-sm font-mono tracking-[0.3em] uppercase font-bold text-white">Neural Pattern</h2>
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Quantum Interaction Resonance Mapping</span>
            </div>
          </div>
          
          <p className="text-xs text-white/60 leading-relaxed font-mono">
            Capturing non-linear state trajectories of the Azrail Memory Core. Monitors fluctuation harmonics, quantum-entangled node states, and real-time core stress parameters.
          </p>
        </div>

        {/* Live Vector Radar */}
        <div className="h-48 w-full flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-2xl p-2 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Sparkles className="w-24 h-24 text-pulse-accent animate-spin" style={{ animationDuration: '40s' }} />
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={8} tick={{ fontFamily: 'monospace' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" />
              <Radar 
                name="Symmetry" 
                dataKey="value" 
                stroke="#00F2FF" 
                fill="#7B4DFF" 
                fillOpacity={0.25} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Diagnostic Key Indicator metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="block text-[9px] font-mono text-white/30 uppercase tracking-wider">Quantum Fluctuation</span>
            <span className="text-xs font-mono font-bold text-pulse-accent">
              {data[data.length - 1]?.quantumFluctuation || 0}%
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="block text-[9px] font-mono text-white/30 uppercase tracking-wider">Node Convergence</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {(activeNodes * 1.618).toFixed(2)} φ
            </span>
          </div>
        </div>
      </div>

      {/* Primary Waveforms AreaChart Panel */}
      <div className="flex-1 min-h-[300px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-pulse-primary" />
            Core Amplitude Waveforms (Real-Time)
          </span>
          <div className="flex items-center gap-4 text-[9px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pulse-primary" />
              <span className="text-white/60">INTELLIGENCE INTENSITY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pulse-accent" />
              <span className="text-white/60">RESONANCE FREQUENCY</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B4DFF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#7B4DFF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFrequency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F2FF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00F2FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.15)" 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace' }}
                dy={10}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.15)" 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(10, 8, 20, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#fff'
                }}
              />
              <ReferenceLine y={85} stroke="rgba(239, 68, 68, 0.25)" strokeDasharray="3 3" />
              <Area 
                type="monotone" 
                dataKey="intensity" 
                stroke="#7B4DFF" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorIntensity)" 
              />
              <Area 
                type="monotone" 
                dataKey="frequency" 
                stroke="#00F2FF" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#colorFrequency)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-between text-[9px] font-mono text-white/30 bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Harmonic State Variance: <strong className="text-white/60">0.038 Hz</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-emerald-400" />
            <span>Telemetry Jitter Shielding: <strong className="text-white/60">ENABLED</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
};
