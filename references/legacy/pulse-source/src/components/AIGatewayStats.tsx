import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, Server, Database, BarChart3, Settings, Brain, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAudio } from '../contexts/AudioContext';
import PulseTooltip from './Tooltip';

const mockData = [
  { time: '00:00', requests: 120 },
  { time: '04:00', requests: 180 },
  { time: '08:00', requests: 450 },
  { time: '12:00', requests: 800 },
  { time: '16:00', requests: 600 },
  { time: '20:00', requests: 350 },
  { time: '24:00', requests: 200 },
];

export function AIGatewayStats({ isLight }: { isLight: boolean }) {
  const [showSettings, setShowSettings] = useState(false);
  const { playHover, playActivation } = useAudio();

  // Azrail Memory Core State
  const [azrailEnabled, setAzrailEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('azrail_memory_core_indexing');
    return saved === null ? true : saved === 'true';
  });

  const handleAzrailToggle = () => {
    playActivation();
    const newValue = !azrailEnabled;
    setAzrailEnabled(newValue);
    localStorage.setItem('azrail_memory_core_indexing', String(newValue));
    toast.info(newValue ? "Azrail Memory Core indexing enabled" : "Azrail Memory Core indexing disabled");
  };

  // Network Pulse Visualizer node hovers
  const [activeNode, setActiveNode] = useState<number | null>(null);

  const handleHover = () => {
    playHover();
  };

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-gray-900' : 'text-white/90'}`}>
            Network & System Analytics
          </h2>
          <p className={`text-xs font-mono mt-1 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
            REAL-TIME THROUGHPUT • LATENCY • CACHE EFFICIENCY
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase">OS PULSE OK</span>
          </div>
          <div className="relative z-10">
            <PulseTooltip 
              contentEn="OS and Network gateway configuration" 
              contentRu="Настройка ОС и сетевого шлюза"
              position="left"
              isLight={isLight}
            >
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl border transition-all duration-300 ${
                  showSettings 
                    ? (isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300')
                    : (isLight ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-500' : 'bg-black/20 border-white/10 hover:border-white/20 text-white/50')
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </PulseTooltip>
            {showSettings && (
              <div className={`absolute top-full mt-2 right-0 w-40 rounded-2xl border p-1 shadow-2xl backdrop-blur-md ${isLight ? 'bg-white/90 border-gray-200' : 'bg-black/90 border-white/10'}`}>
                <button onClick={() => { toast.success('Worker settings opened'); setShowSettings(false); }} className={`w-full text-left px-3 py-2 text-[10px] rounded-xl transition-colors font-mono uppercase ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/5 text-white/60'}`}>
                  Manage Workers
                </button>
                <button onClick={() => { toast.success('Access logs downloaded'); setShowSettings(false); }} className={`w-full text-left px-3 py-2 text-[10px] rounded-xl transition-colors font-mono uppercase ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/5 text-white/60'}`}>
                  View Logs
                </button>
                <button onClick={() => { toast.success('Gateway restarting...'); setShowSettings(false); }} className={`w-full text-left px-3 py-2 text-[10px] rounded-xl transition-colors font-mono uppercase text-indigo-400 hover:bg-indigo-500/10`}>
                  Restart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Requests', value: '1.2M', change: '+12%', icon: <Activity className="w-5 h-5" /> },
          { label: 'Avg Latency', value: '24ms', change: '-5%', icon: <Zap className="w-5 h-5" /> },
          { label: 'Cache Hit Rate', value: '94%', change: '+2%', icon: <Database className="w-5 h-5" /> },
          { label: 'System Nodes', value: '8', change: '0%', icon: <Server className="w-5 h-5" /> }
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-zinc-900/40 border-white/5'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-2 rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {stat.icon}
              </div>
              <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                {stat.label}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl font-bold tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {stat.value}
              </span>
              <span className={`text-xs font-mono font-bold ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Column */}
        <div className={`lg:col-span-7 p-8 rounded-3xl border h-[400px] flex flex-col ${isLight ? 'bg-white border-gray-200' : 'bg-zinc-900/20 border-white/5'}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <div className={`text-xs font-mono font-bold uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                Requests Volume (24h)
              </div>
              <div className={`text-xs opacity-60 mt-1 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                Peak system load and traffic patterns over a rolling 24-hour window
              </div>
            </div>
            <BarChart3 className={`w-5 h-5 ${isLight ? 'text-gray-400' : 'text-white/20'}`} />
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isLight ? '#9ca3af' : '#4b5563' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isLight ? '#9ca3af' : '#4b5563' }} width={30} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isLight ? '#ffffff' : '#111111', 
                    borderColor: isLight ? '#e5e7eb' : '#333333',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorReq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Pulse HUD Column */}
        <div className={`lg:col-span-5 flex flex-col gap-6`}>
          <div className={`p-6 rounded-3xl border flex flex-col gap-5 relative overflow-hidden flex-1 ${
            isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-[#111] border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-white/5 text-pulse-accent'}`}>
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-bold">Network Pulse HUD</h2>
                <p className="text-[10px] opacity-60 font-mono">Telemetry of Node Interconnects</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border aspect-[16/8] flex flex-col justify-between relative overflow-hidden ${
              isLight ? 'bg-gray-50 border-gray-100' : 'bg-black/20 border-white/5'
            }`}>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(123,77,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(123,77,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 120" preserveAspectRatio="none">
                <motion.path
                  d="M 0 60 Q 40 20 80 80 T 160 50 T 240 90 T 320 30 T 400 60"
                  fill="none"
                  stroke={isLight ? 'rgba(123,77,255,0.3)' : 'rgba(123,77,255,0.4)'}
                  strokeWidth="2.5"
                  animate={{
                    d: [
                      "M 0 60 Q 40 20 80 80 T 160 50 T 240 90 T 320 30 T 400 60",
                      "M 0 60 Q 40 80 80 40 T 160 80 T 240 30 T 320 80 T 400 60",
                      "M 0 60 Q 40 20 80 80 T 160 50 T 240 90 T 320 30 T 400 60"
                    ]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </svg>

              <div className="flex justify-between items-center w-full z-10 px-4 h-full">
                {[
                  { id: 1, label: 'WEB_CORE', x: '10%', y: '40%', latency: '0.8ms' },
                  { id: 2, label: 'AZRAIL_MEMORY', x: '35%', y: '65%', latency: '1.5ms' },
                  { id: 3, label: 'AUDIO_SYNTH', x: '60%', y: '25%', latency: '2.1ms' },
                  { id: 4, label: 'SWARM_FIREWALL', x: '85%', y: '55%', latency: '1.1ms' }
                ].map((node) => {
                  const isHovered = activeNode === node.id;
                  return (
                    <PulseTooltip
                      key={node.id}
                      contentEn={`Node Latency: ${node.latency}`}
                      contentRu={`Задержка узла: ${node.latency}`}
                      titleEn={node.label}
                      titleRu={node.label}
                      position="top"
                      isLight={isLight}
                    >
                      <div
                        className="flex flex-col items-center justify-center relative cursor-crosshair group"
                        onMouseEnter={() => {
                          setActiveNode(node.id);
                          handleHover();
                        }}
                        onMouseLeave={() => setActiveNode(null)}
                      >
                        <motion.div 
                          animate={isHovered ? { scale: 1.3 } : { scale: 1 }}
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            isHovered 
                              ? 'bg-pulse-accent border-pulse-primary shadow-[0_0_15px_rgba(123,77,255,1)]' 
                              : isLight 
                              ? 'bg-white border-indigo-400' 
                              : 'bg-zinc-950 border-pulse-primary/60'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isHovered ? 'bg-white animate-ping' : 'bg-pulse-primary'}`} />
                        </motion.div>
                        <span className="text-[8px] font-mono font-bold mt-2 opacity-80 tracking-wider">{node.label}</span>
                      </div>
                    </PulseTooltip>
                  );
                })}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
              isLight ? 'bg-gray-50/50 border-gray-100' : 'bg-black/40 border-white/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-wide">Azrail Memory Core Indexing</span>
                    <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      azrailEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {azrailEnabled ? 'Syncing Context' : 'Standby'}
                    </span>
                  </div>
                  <p className="text-[9px] opacity-60 mt-0.5 leading-relaxed">
                    Replicates core context and diagnostic buffers across high-security enclaves.
                  </p>
                </div>
              </div>
              <PulseTooltip
                contentEn={azrailEnabled ? "Deactivate neural indexing" : "Activate neural indexing"}
                contentRu={azrailEnabled ? "Деактивировать нейронную индексацию" : "Активировать нейронную индексацию"}
                position="left"
                isLight={isLight}
              >
                <button
                  onClick={handleAzrailToggle}
                  onMouseEnter={handleHover}
                  className={`p-2 rounded-xl border transition-all ${
                    azrailEnabled
                    ? (isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300')
                    : (isLight ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-black/20 border-white/5 text-white/30')
                  }`}
                >
                  {azrailEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </PulseTooltip>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
