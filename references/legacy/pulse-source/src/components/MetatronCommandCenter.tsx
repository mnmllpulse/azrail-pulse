import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  RefreshCw, 
  Database
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

interface MetatronCommandCenterProps {
  isLight: boolean;
}

export function MetatronCommandCenter({ isLight }: MetatronCommandCenterProps) {
  const { playHover, playActivation } = useAudio();
  const [activeSwarmMode, setActiveSwarmMode] = useState<'PTAH' | 'URIEL' | 'RAZIEL'>('PTAH');
  const [consensusLevel, setConsensusLevel] = useState(98);

  const SWARM_MODES = [
    { id: 'PTAH', label: 'Construct', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { id: 'URIEL', label: 'Audit', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'RAZIEL', label: 'Synthesize', color: 'text-amber-400', bg: 'bg-amber-500/10' }
  ] as const;

  // Azrail Memory Core State (Terminal Only View)
  const [azrailEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('azrail_memory_core_indexing');
    return saved === null ? true : saved === 'true';
  });

  const handleHover = () => {
    playHover();
  };

  // Metatron Terminal Log States
  const [logs, setLogs] = useState<string[]>([
    "METATRON VM [v4.89] INITIALIZED SECURE ENCLAVE",
    "PULSE OS CORE STATUS: [ONLINE]",
    "SYSTEM SECURITY ARCHITECTURE: Zero-Trust Strict Enforced",
    "AZRAIL CORE LAYER: Syncing active multi-agent memory pools...",
    "Ready for creative workflow dispatches. Type 'help' or click commands below."
  ]);

  const [terminalInput, setTerminalInput] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isBooting, setIsBooting] = useState(false);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addTerminalLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    
    playActivation();
    const cmd = terminalInput.trim().toLowerCase();
    addTerminalLog(`> ${terminalInput}`);
    setTerminalInput('');

    setTimeout(() => {
      if (cmd === 'help') {
        addTerminalLog("Available commands: 'clear', 'status', 'pulse', 'sync', 'boot'");
      } else if (cmd === 'clear') {
        setLogs([]);
      } else if (cmd === 'status') {
        addTerminalLog(`SYSTEM REPORT:\n- OS: Pulse OS v4\n- VM: METATRON VM Enclave\n- Azrail Indexing: ${azrailEnabled ? 'ACTIVE (Zero-Trust)' : 'DISABLED'}\n- Node Latency: 1.24ms`);
      } else if (cmd === 'pulse') {
        addTerminalLog("Pulse diagnostic complete. Inter-module telemetry is 100% synchronized.");
      } else if (cmd === 'sync') {
        addTerminalLog("Re-aligning Swarm neural weights. Shading cores are matching...");
      } else if (cmd === 'boot') {
        triggerBootSequence();
      } else {
        addTerminalLog(`Command not found: '${cmd}'. Type 'help' for diagnostics.`);
      }
    }, 150);
  };

  const triggerBootSequence = () => {
    if (isBooting) return;
    playActivation();
    setIsBooting(true);
    setLogs([]);
    
    const bootSteps = [
      "SYSTEM: Initializing primary METATRON VM sequence...",
      "SYSTEM: Checking memory alignment & Azrail context hooks...",
      "SYSTEM: Loading core shader registry [Cosmic Pulse, Cyber Pulse]...",
      "SYSTEM: Setting up Web Audio tactile synthesizer pipelines...",
      "SYSTEM: Enforcing MAXIMUM_ZeroTrust shields across ports...",
      "SYSTEM: Multi-agent pipeline is active. Welcome back to Pulse OS."
    ];

    bootSteps.forEach((step, index) => {
      setTimeout(() => {
        addTerminalLog(step);
        playHover();
        if (index === bootSteps.length - 1) {
          setIsBooting(false);
        }
      }, (index + 1) * 600);
    });
  };

  return (
    <div className={`flex flex-col gap-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      
      {/* SWARM STATUS BAR */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${isLight ? '' : 'text-zinc-400'}`}>
        {SWARM_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => {
              setActiveSwarmMode(mode.id);
              playActivation();
              addTerminalLog(`SWITCHING TO ${mode.id} PROTOCOL: ${mode.label} active.`);
            }}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-between group ${
              activeSwarmMode === mode.id
                ? `${mode.bg} border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]`
                : isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-100'
            }`}
          >
            <div className="flex flex-col text-left">
              <span className={`text-[9px] font-mono uppercase tracking-widest ${activeSwarmMode === mode.id ? mode.color : ''}`}>{mode.id} MODE</span>
              <span className="text-xs font-bold">{mode.label}</span>
            </div>
            {activeSwarmMode === mode.id && (
              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-mono font-bold text-emerald-400">{consensusLevel}% CNS</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* METATRON TERMINAL */}
      <div className={`w-full p-6 rounded-3xl border flex flex-col gap-4 relative overflow-hidden transition-all duration-500 ${
        isLight 
          ? 'bg-zinc-900 border-zinc-800 text-[#E0E0E0]' 
          : 'bg-[#05010a]/90 border-purple-950/40 backdrop-blur-md'
      }`}>
        
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <TerminalIcon className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase font-bold text-white">METATRON TERMINAL</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerBootSequence}
              onMouseEnter={handleHover}
              disabled={isBooting}
              className={`p-2 rounded-xl border transition-all duration-300 ${
                isBooting
                  ? (isLight ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-black/20 border-white/5 text-white/30')
                  : (isLight ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-500' : 'bg-black/20 border-white/10 hover:border-white/20 text-white/50')
              }`}
              title="Trigger System Boot Sequence"
            >
              <RefreshCw className={`w-4 h-4 ${isBooting ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Console Box */}
        <div className="flex-1 min-h-[240px] max-h-[300px] bg-black/40 rounded-2xl p-6 overflow-y-auto font-mono text-xs leading-relaxed flex flex-col gap-2 custom-scrollbar border border-white/5">
          {logs.map((log, index) => {
            let color = 'text-zinc-500';
            if (log.includes('> ')) {
              color = 'text-indigo-400 font-bold';
            } else if (log.includes('WARN:')) {
              color = 'text-amber-500';
            } else if (log.includes('SYSTEM:')) {
              color = 'text-indigo-300 font-bold';
            } else if (log.includes('[ONLINE]') || log.includes('SUCCESSFULLY')) {
              color = 'text-indigo-400';
            }

            return (
              <div key={index} className={`${color} break-all`}>
                {log}
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleTerminalSubmit} className="flex gap-2">
          <input
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            onFocus={handleHover}
            disabled={isBooting}
            placeholder="Type 'help' or commands..."
            className="flex-1 bg-black/20 border border-white/5 rounded-xl px-3 py-1.5 font-mono text-[11px] text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isBooting}
            onMouseEnter={handleHover}
            className={`px-4 py-2 border rounded-xl transition-all duration-300 text-[10px] font-mono font-bold uppercase tracking-wider ${
              isBooting
                ? 'bg-gray-50 border-gray-200 text-gray-400'
                : (isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20')
            }`}
          >
            EXEC
          </button>
        </form>

        <div className="flex gap-4 text-[9px] font-mono opacity-40 justify-between items-center px-1">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            AZRAIL: {azrailEnabled ? 'INDEXED' : 'STANDBY'}
          </span>
          <span>LATENCY: 1.24MS</span>
        </div>

      </div>

    </div>
  );
}
