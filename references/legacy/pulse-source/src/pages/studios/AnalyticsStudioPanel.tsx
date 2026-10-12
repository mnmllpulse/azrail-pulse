import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  TrendingUp, 
  Clock, 
  Gauge, 
  RefreshCw, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsStudioPanel({ isLight }: { isLight: boolean }) {
  const [metrics, setMetrics] = useState({
    latency: 184,
    throughput: 42.5,
    gpuMemory: 18.2,
    apiCosts: 0.18,
    renderQueue: 1
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        latency: Math.floor(prev.latency + (Math.random() * 20 - 10)),
        throughput: parseFloat((prev.throughput + (Math.random() * 4 - 2)).toFixed(1)),
        gpuMemory: parseFloat(Math.min(24.0, Math.max(12.0, prev.gpuMemory + (Math.random() * 0.4 - 0.2))).toFixed(1)),
        apiCosts: parseFloat((prev.apiCosts + 0.0001).toFixed(4)),
        renderQueue: Math.max(0, Math.min(5, prev.renderQueue + (Math.random() > 0.7 ? 1 : Math.random() > 0.7 ? -1 : 0)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleForceClearQueue = () => {
    setMetrics(prev => ({ ...prev, renderQueue: 0 }));
    toast.success('GPU render scheduling queue flushed clean');
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono">
      {/* Metrics bento grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'COGNITIVE LATENCY', value: `${metrics.latency}ms`, icon: <Clock className="text-indigo-400 w-4 h-4" />, desc: 'End-to-end model loop delay' },
          { label: 'THROUGHPUT SPEED', value: `${metrics.throughput} t/s`, icon: <Gauge className="text-emerald-400 w-4 h-4" />, desc: 'Dynamic token generation rate' },
          { label: 'GPU MEMORY LOAD', value: `${metrics.gpuMemory} GB / 24 GB`, icon: <HardDrive className="text-purple-400 w-4 h-4" />, desc: 'Assigned system VRAM load' },
          { label: 'ESTIMATED EXPENDITURE', value: `$${metrics.apiCosts.toFixed(3)}`, icon: <TrendingUp className="text-amber-400 w-4 h-4" />, desc: 'Rolling daily usage expenses' }
        ].map((item, i) => (
          <div key={i} className={`p-5 border rounded-2xl flex flex-col gap-3 relative overflow-hidden ${
            isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{item.label}</span>
              {item.icon}
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-200">{item.value}</span>
            <span className="text-[9px] text-zinc-500">{item.desc}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`border rounded-2xl p-5 lg:col-span-2 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Live GPU Scheduling Queue</h3>
          <div className="space-y-3">
            <div className="p-4 border border-white/5 bg-zinc-900/30 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-300 uppercase">PENDING GRAPH SYNTHESIS</h4>
                <p className="text-[10px] text-zinc-500 mt-1">Executing background RAG vector synchronization</p>
              </div>
              <span className="text-xs font-bold text-amber-400 animate-pulse">{metrics.renderQueue} Tasks Active</span>
            </div>

            <button
              onClick={handleForceClearQueue}
              className="w-full py-2 border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/50 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-colors uppercase font-bold text-center"
            >
              Flush GPU Scheduling Scheduler
            </button>
          </div>
        </div>

        <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4 font-mono">Performance Telemetry</h3>
          <div className="space-y-4 text-xs text-zinc-500">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Cache Hit Ratio</span>
              <span className="text-indigo-400">92.4%</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Ingress Port Ping</span>
              <span className="text-emerald-400">12ms</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>System Server Ingress</span>
              <span>Port 3000 Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
