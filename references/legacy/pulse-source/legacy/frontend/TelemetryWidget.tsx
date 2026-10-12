import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Cpu, 
  Clock, 
  Shield, 
  Layers, 
  TrendingUp, 
  Lock
} from 'lucide-react';

interface TelemetryStat {
  model: string;
  count: number;
  load: number;
  errors: number;
}

interface ModelStatus {
  model: string;
  status: 'active' | 'suspended';
}

export default function TelemetryWidget() {
  const [telemetry, setTelemetry] = useState<TelemetryStat[]>([]);
  const [modelStates, setModelStates] = useState<ModelStatus[]>([]);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [activeBreakers, setActiveBreakers] = useState<number>(0);
  
  // METATRON One-Click Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisIntent, setSynthesisIntent] = useState("");
  const [synthesisStatus, setSynthesisStatus] = useState<string | null>(null);
  const [budgetSpent, setBudgetSpent] = useState<number>(0);
  const [logsCount, setLogsCount] = useState<number>(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll telemetry every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [telemetryRes, statesRes, metatronRes] = await Promise.all([
        fetch('/api/telemetry'),
        fetch('/api/circuit-breaker'),
        fetch('/api/metatron/status').catch(() => null)
      ]);

      const telemetryData = await telemetryRes.json();
      const statesData = await statesRes.json();
      const metatronData = metatronRes ? await metatronRes.json().catch(() => null) : null;

      if (telemetryData.status === 'ok') {
        const stats: TelemetryStat[] = telemetryData.stats;
        setTelemetry(stats);

        const reqs = stats.reduce((acc, curr) => acc + curr.count, 0);
        const tokens = stats.reduce((acc, curr) => acc + curr.load, 0);
        setTotalRequests(reqs);
        setTotalTokens(tokens);
      }

      if (statesData.status === 'ok') {
        const states: ModelStatus[] = statesData.states;
        setModelStates(states);
        
        const suspendedCount = states.filter(s => s.status === 'suspended').length;
        setActiveBreakers(suspendedCount);
      }

      if (metatronData && metatronData.status === 'ok') {
        setBudgetSpent(metatronData.budgetSpent || 0);
        setLogsCount(metatronData.logsCount || 0);
      }
    } catch (err) {
      console.error("Telemetry widget polling failed:", err);
    }
  };

  const handleSynthesis = async () => {
    if (isSynthesizing || !synthesisIntent) return;
    
    setIsSynthesizing(true);
    setSynthesisStatus("Synthesizing...");
    
    try {
      const res = await fetch('/api/metatron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'synthesize', 
          payload: { intent: synthesisIntent } 
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setSynthesisStatus("Synthesis Successful");
        setSynthesisIntent("");
        setTimeout(() => setSynthesisStatus(null), 3000);
      } else {
        setSynthesisStatus(`Failed: ${data.message}`);
      }
    } catch (err: any) {
      setSynthesisStatus(`Error: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const maxLoad = telemetry.length > 0 ? Math.max(...telemetry.map(s => s.load)) : 1;

  return (
    <div className="bg-[#040406] border border-zinc-900 rounded-2xl p-5 font-mono text-zinc-100 select-none shadow-2xl relative overflow-hidden flex flex-col gap-4">
      
      {/* Visual background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">SWARM TELEMETRY</h4>
            <p className="text-[8px] text-zinc-500">REAL-TIME WORKERS AI STATS</p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[8px] font-bold text-zinc-400 border border-zinc-900 bg-[#08080c] px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
          POLLING FEED
        </span>
      </div>

      {/* Grid summarizing overall metrics */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory gap-3 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 sm:px-0 sm:mx-0 scrollbar-thin">
        <div className="bg-[#08080c] border border-zinc-900/60 p-3 rounded-xl flex flex-col gap-1 min-w-[40vw] sm:min-w-0 snap-center shrink-0">
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">Total Queries</span>
          <span className="text-sm font-extrabold text-zinc-200">{totalRequests}</span>
        </div>

        <div className="bg-[#08080c] border border-zinc-900/60 p-3 rounded-xl flex flex-col gap-1 min-w-[40vw] sm:min-w-0 snap-center shrink-0">
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">Accumulated Load</span>
          <span className="text-sm font-extrabold text-zinc-200">{totalTokens.toLocaleString()} ch</span>
        </div>

        <div className="bg-[#08080c] border border-zinc-900/60 p-3 rounded-xl flex flex-col gap-1 min-w-[40vw] sm:min-w-0 snap-center shrink-0">
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">Circuit Breakers</span>
          <span className={`text-sm font-extrabold ${activeBreakers > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {activeBreakers} <span className="text-[8px] font-normal uppercase">susp</span>
          </span>
        </div>

        <div className="bg-[#08080c] border border-zinc-900/60 p-3 rounded-xl flex flex-col gap-1 relative overflow-hidden group min-w-[40vw] sm:min-w-0 snap-center shrink-0">
          <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold relative z-10 flex items-center gap-1">
            Budget Spent <TrendingUp className="w-2.5 h-2.5 text-emerald-500/70" />
          </span>
          <span className="text-sm font-extrabold text-emerald-400 relative z-10">
            ${budgetSpent.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Visualization of Node-by-Node load */}
      <div className="space-y-3">
        <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold flex justify-between">
          <span>Swarm Consortium Load Balancing</span>
          <span className="text-indigo-400">Limit: 500k ch / day</span>
        </div>

        <div className="space-y-2.5">
          {telemetry.map((stat) => {
            const isSuspended = modelStates.find(s => s.model === stat.model)?.status === 'suspended';
            const loadPercent = Math.min(100, Math.round((stat.load / 500000) * 100));
            
            return (
              <div key={stat.model} className="space-y-1">
                <div className="flex justify-between items-center text-[9px]">
                  <div className="flex items-center gap-1.5">
                    {isSuspended && <Lock className="w-2.5 h-2.5 text-red-500" />}
                    <span className={`font-bold ${isSuspended ? 'text-red-500/70 line-through' : 'text-zinc-300'}`}>
                      {stat.model.split('/').pop()}
                    </span>
                  </div>
                  <span className="text-zinc-500 text-[8px]">{stat.load.toLocaleString()} characters ({loadPercent}%)</span>
                </div>

                <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/80">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSuspended 
                        ? 'bg-red-500/50' 
                        : stat.load > 350000 
                          ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                          : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                    }`}
                    style={{ width: `${Math.max(2, loadPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {telemetry.length === 0 && (
            <div className="text-center py-6 text-zinc-600 text-[9px] uppercase border border-dashed border-zinc-900 rounded-xl">
              <Cpu className="w-5 h-5 mx-auto mb-1 opacity-40" />
              Initializing dynamic telemetry telemetry feed...
            </div>
          )}
        </div>
      </div>

      {/* METATRON One-Click Synthesis */}
      <div className="mt-2 pt-4 border-t border-zinc-900">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Metatron Synthesis Workflow
        </h4>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Describe the intention to synthesize..."
            value={synthesisIntent}
            onChange={(e) => setSynthesisIntent(e.target.value)}
            disabled={isSynthesizing}
            className="w-full bg-[#08080c] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSynthesis}
              disabled={isSynthesizing || !synthesisIntent}
              className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSynthesizing ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin"></div>
                  Synthesizing...
                </>
              ) : (
                "One-Click Synthesis"
              )}
            </button>
            {synthesisStatus && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded bg-[#08080c] border border-zinc-800 ${
                synthesisStatus.includes('Error') || synthesisStatus.includes('Failed') 
                  ? 'text-red-400' 
                  : synthesisStatus.includes('Synthesizing')
                    ? 'text-amber-400 animate-pulse'
                    : 'text-emerald-400'
              }`}>
                {synthesisStatus}
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
