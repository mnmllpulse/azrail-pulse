import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Brain, Cpu, Zap, Activity, Layers, 
  Settings, Save, Play, MessageSquare, ChevronRight,
  ShieldCheck, Terminal, Disc, Music
} from 'lucide-react';
import { useMusicOS } from './OSKernel';

export function AIAgents() {
  const { state, updateState } = useMusicOS();
  const [activeAgent, setActiveAgent] = useState<'composer' | 'producer' | 'master' | 'sound_designer'>('composer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    // Auto-initialize composer agent
    setActiveAgent('composer');
    setLogs(['> [SYSTEM]: Zadkiel Agent Initialized. Ready for arrangement directives.']);
  }, []);

  const AGENTS = {
    composer: {
      name: 'Zadkiel',
      role: 'MIDI & Arrangement Orchestrator',
      desc: 'Expert in harmonic progression, rhythmic syncopation, and structural tension.',
      icon: <Brain className="w-5 h-5" />,
      color: 'indigo'
    },
    producer: {
      name: 'Raziel',
      role: 'Sound Design & Textural Engineer',
      desc: 'Master of FM synthesis, wavetable modulation, and organic glitch layering.',
      icon: <Cpu className="w-5 h-5" />,
      color: 'violet'
    },
    master: {
      name: 'Metatron',
      role: 'Mastering & LUFS Finalizer',
      desc: 'Final chain optimization, dynamic range preservation, and spectral balance.',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'emerald'
    },
    sound_designer: {
      name: 'Jophiel',
      role: 'DSP & Spatial Environment',
      desc: 'Reverb modeling, delay networks, and immersive 3D spatialization.',
      icon: <Layers className="w-5 h-5" />,
      color: 'amber'
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput) return;

    setIsProcessing(true);
    setLogs(prev => [`> [${AGENTS[activeAgent].name}]: Analyzing request: "${chatInput}"`, ...prev]);
    
    setTimeout(() => {
      setLogs(prev => [`> [SYSTEM]: Applying ${activeAgent} directives to Kernel...`, ...prev]);
      setIsProcessing(false);
      setChatInput('');
      
      if (chatInput.toLowerCase().includes('bpm')) {
        const match = chatInput.match(/\d+/);
        if (match) updateState({ bpm: parseInt(match[0]) });
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Agent Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(AGENTS) as [keyof typeof AGENTS, typeof AGENTS['composer']][]).map(([id, agent]) => (
          <button
            key={id}
            onClick={() => setActiveAgent(id)}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              activeAgent === id 
                ? `bg-${agent.color}-500/10 border-${agent.color}-500/50 shadow-[0_0_20px_rgba(var(--${agent.color}-500),0.1)]` 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className={`mb-3 p-2 rounded-xl w-fit ${activeAgent === id ? `bg-${agent.color}-500 text-white` : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
              {agent.icon}
            </div>
            <div className="text-xs font-bold font-mono uppercase tracking-widest mb-1">{agent.name}</div>
            <div className="text-[10px] opacity-60 font-mono leading-tight">{agent.role}</div>
            
            {activeAgent === id && (
              <motion.div 
                layoutId="agent-glow"
                className={`absolute inset-0 bg-gradient-to-br from-${agent.color}-500/20 to-transparent pointer-events-none`}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Interaction Panel */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg bg-${AGENTS[activeAgent].color}-500/20 text-${AGENTS[activeAgent].color}-400`}>
                  {AGENTS[activeAgent].icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono uppercase tracking-tighter">{AGENTS[activeAgent].name} Interaction</h3>
                  <p className="text-[10px] opacity-60 italic">{AGENTS[activeAgent].desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Chat Log */}
              <div className="flex-1 bg-black/20 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto space-y-2 border border-white/5 no-scrollbar">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 gap-3">
                    <MessageSquare className="w-8 h-8" />
                    <p className="uppercase tracking-[0.2em]">Awaiting directives...</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`p-2 rounded-lg ${log.startsWith('>') ? 'bg-white/5 text-white/80' : 'bg-indigo-500/10 text-indigo-400'}`}>
                      {log}
                    </div>
                  ))
                )}
              </div>

              {/* Command Input */}
              <form onSubmit={handleCommand} className="relative">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={`Directive for ${AGENTS[activeAgent].name}...`}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-12 text-sm font-mono focus:outline-none focus:border-white/20 transition-all placeholder:opacity-30"
                />
                <button 
                  type="submit"
                  disabled={isProcessing || !chatInput}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                    chatInput ? 'bg-white text-black hover:scale-110' : 'bg-white/5 text-white/20'
                  }`}
                >
                  {isProcessing ? <Zap className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Intelligence Context Sidebar */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-white/40" />
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 font-bold">OS Intelligence Stats</h4>
            </div>

            <div className="space-y-4">
               <StatItem label="Composer Certainty" value="94%" color="indigo" />
               <StatItem label="Producer Cohesion" value="88%" color="violet" />
               <StatItem label="Master Headroom" value="-6.2 dB" color="emerald" />
               <StatItem label="Spatial Depth" value="0.74" color="amber" />
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
               <div className="text-[9px] font-mono uppercase text-white/30 tracking-wider">Active Memory Nodes</div>
               <div className="flex flex-wrap gap-2">
                  {['Genre: Techno', 'Key: Am', 'BPM: 128', 'D1: Production_Patterns'].map(tag => (
                    <div key={tag} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-white/60">
                      {tag}
                    </div>
                  ))}
               </div>
            </div>

            <button className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-mono uppercase font-bold tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] flex items-center justify-center gap-2">
               <Save className="w-3.5 h-3.5" /> Commit Session to D1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="opacity-50 uppercase">{label}</span>
        <span className={`text-${color}-400 font-bold`}>{value}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: value.includes('%') ? value : '70%' }}
          className={`h-full bg-${color}-500 shadow-[0_0_10px_rgba(var(--${color}-500),0.5)]`}
        />
      </div>
    </div>
  );
}
