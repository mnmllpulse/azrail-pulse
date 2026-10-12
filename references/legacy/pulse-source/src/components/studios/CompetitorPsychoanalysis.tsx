import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  Zap, 
  ShieldAlert, 
  Activity, 
  Brain, 
  Crosshair, 
  ZapOff,
  Flame,
  Globe
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const COMPETITOR_DATA = [
  { subject: 'Brand Authority', A: 120, B: 110, fullMark: 150 },
  { subject: 'Visual Noise', A: 98, B: 130, fullMark: 150 },
  { subject: 'Complexity', A: 86, B: 130, fullMark: 150 },
  { subject: 'Trust Vector', A: 99, B: 100, fullMark: 150 },
  { subject: 'Market Pressure', A: 85, B: 90, fullMark: 150 },
  { subject: 'Digital Ego', A: 65, B: 145, fullMark: 150 },
];

const MARKET_PREDICTION_DATA = [
  { time: 'T-10', impact: 40, resonance: 24 },
  { time: 'T-8', impact: 30, resonance: 13 },
  { time: 'T-6', impact: 20, resonance: 98 },
  { time: 'T-4', impact: 27, resonance: 39 },
  { time: 'T-2', impact: 18, resonance: 48 },
  { time: 'Launch', impact: 95, resonance: 100 },
];

export function CompetitorPsychoanalysis({ isLight }: { isLight?: boolean }) {
  const [activeCompetitor, setActiveCompetitor] = useState('Standard Market Leader');

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'} backdrop-blur-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pulse-primary/10 blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pulse-primary/20 rounded-2xl border border-pulse-primary/30">
              <Brain className="w-6 h-6 text-pulse-primary animate-pulse" />
            </div>
            <div>
              <h2 className={`text-lg font-bold font-mono uppercase tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Пульс Лаб: Психоанализ Конкурентов
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                Cognitive Pressure Mapping & Market Resonance Prediction
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {['Standard Market Leader', 'Aggressive Disrupter', 'Legacy Giant'].map(comp => (
              <button
                key={comp}
                onClick={() => setActiveCompetitor(comp)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-mono border transition-all ${
                  activeCompetitor === comp
                    ? 'bg-pulse-primary text-white border-pulse-primary shadow-lg shadow-pulse-primary/20'
                    : isLight ? 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Radar: Psychological Profile */}
        <div className={`xl:col-span-5 p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'}`}>
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-4 h-4 text-pulse-primary" />
            <h3 className={`text-xs font-mono uppercase font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Psychological Pressure Vector
            </h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={COMPETITOR_DATA}>
                <PolarGrid stroke={isLight ? '#e5e7eb' : '#27272a'} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: isLight ? '#4b5563' : '#71717a', fontSize: 10, fontFamily: 'Fira Code' }} 
                />
                <Radar
                  name="Pulse OS"
                  dataKey="A"
                  stroke="#7840FF"
                  fill="#7840FF"
                  fillOpacity={0.5}
                />
                <Radar
                  name={activeCompetitor}
                  dataKey="B"
                  stroke="#3BCCFF"
                  fill="#3BCCFF"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pulse-primary"></div>
                <span className="text-[10px] font-mono text-zinc-400">PULSE OS (MNMLL)</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-data-blue"></div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">{activeCompetitor}</span>
             </div>
          </div>
        </div>

        {/* Impact Prediction: Energy Fields */}
        <div className={`xl:col-span-7 p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'} flex flex-col`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className={`text-xs font-mono uppercase font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Market Resonance Forecast (Energy Fields)
              </h3>
            </div>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            </div>
          </div>

          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={MARKET_PREDICTION_DATA}>
                 <defs>
                   <linearGradient id="colorImpact" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#7840FF" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#7840FF" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3BCCFF" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3BCCFF" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#f3f4f6' : '#18181b'} vertical={false} />
                 <XAxis 
                   dataKey="time" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'Fira Code' }}
                 />
                 <Tooltip 
                   contentStyle={{ 
                     backgroundColor: isLight ? '#ffffff' : '#09090b', 
                     border: '1px solid rgba(120, 64, 255, 0.2)',
                     borderRadius: '12px',
                     fontSize: '10px',
                     fontFamily: 'Fira Code'
                   }}
                 />
                 <Area type="monotone" dataKey="impact" stroke="#7840FF" strokeWidth={2} fillOpacity={1} fill="url(#colorImpact)" />
                 <Area type="monotone" dataKey="resonance" stroke="#3BCCFF" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="mt-6 bg-black/20 rounded-2xl p-4 border border-white/5">
             <div className="flex items-center gap-2 mb-2">
               <Zap className="w-3 h-3 text-amber-400" />
               <span className="text-[10px] font-mono text-zinc-300 uppercase font-bold">Predictive insight</span>
             </div>
             <p className="text-[11px] text-zinc-500 leading-relaxed italic">
               "Maximum resonance detected at T-Launch. The competitor's high 'Visual Noise' and 'Complexity' create a perfect void for our 'Deep Space' aesthetic to dominate cognitive attention."
             </p>
          </div>
        </div>
      </div>

      {/* Weak Point Analysis Table */}
      <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'}`}>
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className={`text-xs font-mono uppercase font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Vulnerability Matrix: Competitive Weak Points
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <ZapOff className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Weakness Alpha</span>
                <span className="text-xs font-bold text-zinc-200">Decision Fatigue</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              Competitor forces users through too many nested menus. Our **Single-Tap Logic Architect** eliminates this cognitive load entirely.
            </p>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-rose-500"></motion.div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Weakness Beta</span>
                <span className="text-xs font-bold text-zinc-200">Aesthetic Saturation</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              Overuse of default gradients and stock assets leads to brand blindness. Our **Monolithic Pulse** creates a distinctive visual anchor.
            </p>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: '62%' }} className="h-full bg-amber-500"></motion.div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Weakness Gamma</span>
                <span className="text-xs font-bold text-zinc-200">Trust Transparency</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              Vague data handling policies. Our **Shield-Status Transparency Map** builds immediate authority through technical honesty.
            </p>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} className="h-full bg-blue-500"></motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
