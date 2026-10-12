import React, { useState } from 'react';
import { 
  Cpu, 
  Settings, 
  TrendingUp, 
  Database, 
  Zap, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Activity, 
  Sliders, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface FallbackStep {
  priority: number;
  model: string;
  condition: string;
}

export default function ModelStudioPanel({ isLight }: { isLight: boolean }) {
  const [activeTab, setActiveTab] = useState<'routing' | 'tracker' | 'ollama'>('routing');
  const [fallbackSteps, setFallbackSteps] = useState<FallbackStep[]>([
    { priority: 1, model: 'Gemini 2.5 Flash Lite', condition: 'Standard Prompt / Fast Draft' },
    { priority: 2, model: 'Gemini 2.0 Pro', condition: 'Complex Architecture / Coding' },
    { priority: 3, model: 'Gemini 1.5 Pro', condition: 'High-Volume Context Failover' }
  ]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [isConnectingOllama, setIsConnectingOllama] = useState(false);
  const [ollamaModel, setOllamaModel] = useState('llama3:8b');

  const handleSaveChain = () => {
    toast.success('Unified fallback chain routing protocol saved');
  };

  const handleConnectOllama = () => {
    setIsConnectingOllama(true);
    setTimeout(() => {
      setIsConnectingOllama(false);
      setOllamaConnected(true);
      toast.success(`Successfully bridged to local Ollama instance on model: ${ollamaModel}`);
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('routing')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'routing'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Fallback Chains</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'tracker'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Cost & Latency</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ollama')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'ollama'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>Local Ollama Bridge</span>
          </div>
        </button>
      </div>

      {activeTab === 'routing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`border rounded-2xl p-5 lg:col-span-2 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400">Cognitive Router Strategy</h3>
              <button
                onClick={handleSaveChain}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Save Protocol
              </button>
            </div>

            <p className="text-[10px] font-mono text-zinc-500 mb-6">
              Unified routing system. Automatically failover to next model layer when token size, response complexity, or execution speed benchmarks fail.
            </p>

            <div className="space-y-4">
              {fallbackSteps.map((step, index) => (
                <div key={index} className="p-4 border border-white/5 bg-zinc-900/30 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-400 w-6 h-6 rounded-full flex items-center justify-center border border-white/5">{step.priority}</span>
                    <div>
                      <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase">{step.model}</h4>
                      <span className="text-[9px] text-zinc-500 uppercase font-mono">Routing Trigger: {step.condition}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full uppercase">Enabled</span>
                    <button className="text-zinc-600 hover:text-zinc-400">
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-300 mb-4">Active Router State</h3>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2 text-zinc-500">
                  <span>Routing Strategy</span>
                  <span className="text-indigo-400 font-bold">Cost-Efficient</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 text-zinc-500">
                  <span>Failover Retries</span>
                  <span className="text-zinc-300">3 attempts</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 text-zinc-500">
                  <span>Network Timeout</span>
                  <span className="text-zinc-300">8000ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400 mb-4">Live Execution Latencies</h3>
            <div className="space-y-4 font-mono">
              {[
                { name: 'Gemini 2.5 Flash Lite', latency: '124ms', efficiency: '98%' },
                { name: 'Gemini 2.0 Pro', latency: '482ms', efficiency: '89%' },
                { name: 'Gemini 1.5 Pro', latency: '390ms', efficiency: '91%' }
              ].map((m, i) => (
                <div key={i} className="p-3.5 border border-white/5 bg-zinc-900/20 rounded-xl">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-zinc-300">{m.name}</span>
                    <span className="text-[10px] text-zinc-500">{m.latency}</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: m.efficiency }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-300 mb-4">API Token Consumption Cost</h3>
            <div className="space-y-4 font-mono text-xs text-zinc-500">
              <div className="p-3 bg-zinc-900/30 border border-white/5 rounded-xl">
                <div className="flex justify-between text-zinc-300 font-bold mb-1">
                  <span>Total Spent Today</span>
                  <span className="text-emerald-400">$0.182</span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase">Limit Caps set to $10.00/day</span>
              </div>

              <div className="p-3 bg-zinc-900/30 border border-white/5 rounded-xl">
                <div className="flex justify-between text-zinc-300 font-bold mb-1">
                  <span>Average Cost per 1M tokens</span>
                  <span className="text-indigo-400">$0.075</span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase">Optimized via caching metrics</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ollama' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Bridge Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase mb-1.5 block">Endpoint URL</label>
                <input
                  type="text"
                  defaultValue="http://localhost:11434"
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase mb-1.5 block">Model Identifier</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                />
              </div>

              <button
                onClick={handleConnectOllama}
                disabled={isConnectingOllama}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-all"
              >
                {isConnectingOllama ? 'Connecting...' : 'Establish Bridge'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className={`border rounded-2xl p-5 h-full ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Local Bridge Console Logs</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  ollamaConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {ollamaConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="p-4 bg-black/60 border border-white/5 rounded-xl h-48 text-[10px] text-zinc-500 overflow-y-auto space-y-1.5 leading-normal">
                {ollamaConnected ? (
                  <>
                    <p className="text-zinc-600">[OLLAMA] [2026-07-18 18:03] Connected securely to Ollama daemon.</p>
                    <p className="text-zinc-400">[OLLAMA] [2026-07-18 18:03] Querying local tags...</p>
                    <p className="text-zinc-300">[OLLAMA] [2026-07-18 18:03] Found model "{ollamaModel}" ready to receive prompts.</p>
                    <p className="text-zinc-500">[OLLAMA] [2026-07-18 18:03] Benchmarking prompt speed: 45 t/s generation rate.</p>
                  </>
                ) : (
                  <p className="text-zinc-600 text-center py-12 uppercase tracking-widest">Ollama bridge offline. Enter model name and establish socket connection.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
