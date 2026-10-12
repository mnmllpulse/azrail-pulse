import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Cpu, Zap, Globe } from 'lucide-react';

interface PerformanceAnalyticsProps {
  t: (en: string, ru?: string) => string;
}

export function PerformanceAnalytics({ t }: PerformanceAnalyticsProps) {
  const interactionData = [
    { time: '10:00', interactions: 45, throughput: 120 },
    { time: '11:00', interactions: 52, throughput: 135 },
    { time: '12:00', interactions: 85, throughput: 210 },
    { time: '13:00', interactions: 62, throughput: 180 },
    { time: '14:00', interactions: 78, throughput: 195 },
    { time: '15:00', interactions: 110, throughput: 250 },
    { time: '16:00', interactions: 95, throughput: 230 },
  ];

  const aestheticUsage = [
    { name: 'Minimalist', value: 35 },
    { name: 'Cyberpunk', value: 25 },
    { name: 'Luxury', value: 15 },
    { name: 'Brutalist', value: 10 },
    { name: 'Swiss', value: 15 },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          {t('Performance & Analytics', 'Производительность и Аналитика')}
        </h5>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Uptime', value: '99.99%', icon: <Globe className="w-3 h-3 text-emerald-400" /> },
          { label: 'AI Latency', value: '14ms', icon: <Zap className="w-3 h-3 text-amber-400" /> },
          { label: 'CPU Load', value: '24%', icon: <Cpu className="w-3 h-3 text-blue-400" /> },
          { label: 'Session Time', value: '42m', icon: <Activity className="w-3 h-3 text-indigo-400" /> },
        ].map(stat => (
          <div key={stat.label} className="p-3 rounded-xl bg-white/3 border border-white/5 flex flex-col gap-1">
            <div className="flex items-center gap-2 opacity-50">
              {stat.icon}
              <span className="text-[8px] font-mono uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-lg font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Interaction Throughput */}
        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Generation Throughput (Tokens/sec)</label>
          <div className="h-[180px] w-full bg-black/20 rounded-2xl border border-white/5 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interactionData}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="time" stroke="#ffffff20" fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="throughput" stroke="#10b981" fillOpacity={1} fill="url(#colorThroughput)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aesthetic Distribution */}
        <div className="space-y-3 pb-4">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Aesthetic Preference Distribution</label>
          <div className="h-[180px] w-full bg-black/20 rounded-2xl border border-white/5 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aestheticUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis dataKey="name" stroke="#ffffff20" fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
