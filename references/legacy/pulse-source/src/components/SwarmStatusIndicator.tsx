import React from 'react';
import { motion } from 'motion/react';
import { Network, Activity } from 'lucide-react';
import { useSystemState } from '../contexts/SystemStateContext';

interface AgentNode {
  id: number;
  role: string;
  status: 'idle' | 'processing' | 'consensus' | 'routing';
  color: string;
}

export default function SwarmStatusIndicator({ 
  isLight, 
  agentCount = 12 
}: { 
  isLight?: boolean; 
  agentCount?: number;
}) {
  const { logicCoreLoad, integrityPercentage } = useSystemState();
  const roles = ['Coder', 'Critic', 'Architect', 'Auditor', 'Researcher', 'Planner'];
  const statuses: ('idle' | 'processing' | 'consensus' | 'routing')[] = [
    'processing', 'consensus', 'idle', 'consensus', 'routing', 'idle'
  ];
  
  // Color mapping based on state
  const statusColors = {
    idle: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      dot: 'bg-indigo-500',
      glow: 'shadow-[0_0_8px_rgba(99,102,241,0.5)]',
      label: 'Idle Sync'
    },
    processing: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      label: 'Computing'
    },
    consensus: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-500',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.7)]',
      label: 'Consensus'
    },
    routing: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      dot: 'bg-purple-500',
      glow: 'shadow-[0_0_8px_rgba(139,92,246,0.6)]',
      label: 'Routing'
    }
  };

  // Generate deterministic agent nodes
  const agents: AgentNode[] = Array.from({ length: agentCount }).map((_, idx) => {
    const role = roles[idx % roles.length];
    const status = statuses[(idx + idx * 3) % statuses.length];
    return {
      id: idx + 1,
      role,
      status,
      color: idx === 0 ? 'pink' : 'indigo'
    };
  });

  return (
    <div className={`border rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden ${
      isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'
    }`}>
      {/* Indicator Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isLight ? 'text-gray-700' : 'text-white/60'}`}>
            Synapse Cluster Pulse
          </span>
        </div>
        <span className={`text-[8px] font-mono uppercase font-semibold px-2 py-0.5 rounded-full ${
          isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
        }`}>
          {agentCount} Nodes Online
        </span>
      </div>

      {/* Grid of Pulsing Nodes */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
        {agents.map((agent) => {
          const cfg = statusColors[agent.status];
          const animationDuration = 1.2 + (agent.id % 4) * 0.3; // Staggered speeds
          const delay = (agent.id % 3) * 0.2; // Staggered delays

          return (
            <div 
              key={agent.id}
              className={`border rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative ${
                isLight ? 'bg-gray-50 border-gray-150' : 'bg-[#0a0a0a] border-white/5'
              }`}
              title={`${agent.role} Node - Status: ${cfg.label}`}
            >
              {/* Pulsing Node Anchor */}
              <div className="relative flex items-center justify-center w-5 h-5">
                {/* Outer Ring ripple oscillation */}
                <motion.div 
                  animate={{ 
                    scale: [0.8, 1.8, 0.8], 
                    opacity: [0.15, 0.5, 0.15] 
                  }}
                  transition={{ 
                    duration: animationDuration, 
                    repeat: Infinity, 
                    delay: delay,
                    ease: "easeInOut" 
                  }}
                  className={`absolute inset-0 rounded-full ${cfg.bg} border ${cfg.border}`}
                />

                {/* Inner Glowing Core Pulse */}
                <motion.div 
                  animate={{ 
                    scale: [0.9, 1.15, 0.9], 
                    opacity: [0.6, 1, 0.6] 
                  }}
                  transition={{ 
                    duration: animationDuration, 
                    repeat: Infinity, 
                    delay: delay,
                    ease: "easeInOut" 
                  }}
                  className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${cfg.glow} relative z-10`}
                />
              </div>

              {/* Node Label Info */}
              <div className="text-center w-full truncate">
                <span className={`block text-[7px] font-mono leading-none font-bold truncate ${
                  isLight ? 'text-gray-700' : 'text-white/60'
                }`}>
                  {agent.role}
                </span>
                <span className={`block text-[6px] font-mono font-medium leading-none mt-0.5 truncate uppercase ${
                  agent.status === 'consensus' 
                    ? 'text-emerald-500' 
                    : agent.status === 'processing' 
                    ? 'text-amber-500' 
                    : agent.status === 'routing'
                    ? 'text-purple-500'
                    : 'text-indigo-400'
                }`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global OS Metrics Consistent Telemetry */}
      <div className={`grid grid-cols-2 gap-4 pt-3.5 border-t font-mono text-[9px] uppercase tracking-wider ${
        isLight ? 'border-gray-100' : 'border-white/5'
      }`}>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className={isLight ? 'text-gray-500' : 'text-white/45'}>Logic Core Load</span>
            <span className={`font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{logicCoreLoad}%</span>
          </div>
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
            <motion.div 
              className="h-full bg-indigo-500 rounded-full" 
              animate={{ width: `${logicCoreLoad}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className={isLight ? 'text-gray-500' : 'text-white/45'}>Integrity Percentage</span>
            <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{integrityPercentage}%</span>
          </div>
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
            <motion.div 
              className="h-full bg-emerald-500 rounded-full" 
              animate={{ width: `${integrityPercentage}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Compact Legend / Sub-Indicator */}
      <div className={`flex items-center justify-center gap-4 pt-2.5 border-t text-[7px] font-mono uppercase tracking-wider ${
        isLight ? 'border-gray-100 text-gray-400' : 'border-white/5 text-white/30'
      }`}>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Consensus</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Processing</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>Routing</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>Idle</span>
        </div>
      </div>
    </div>
  );
}
