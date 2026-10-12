import React from 'react';
import { usePulse } from '../lib/PulseKernel';

const SystemConsciousness = () => {
  const { systemState } = usePulse();

  const metrics = [
    { label: 'System Status', value: systemState.status },
    { label: 'Active Agents', value: systemState.activeAgents },
    { label: 'Workflows', value: systemState.runningWorkflows },
    { label: 'Confidence', value: `${systemState.confidence}%` },
    { label: 'Risk Level', value: systemState.riskLevel },
    { label: 'Arch Health', value: `${systemState.architectureHealth}%` },
  ];

  return (
    <div className="p-8 border border-white/10 rounded-3xl bg-black/60">
      <h2 className="text-2xl font-bold mb-6">System Consciousness</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {metrics.map(m => (
          <div key={m.label} className="p-4 bg-black/40 border border-white/5 rounded-2xl">
            <div className="text-xs text-zinc-400">{m.label}</div>
            <div className="text-lg font-bold mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl">
        <div className="text-sm text-indigo-300 font-medium">I AM CURRENTLY:</div>
        <div className="text-xl font-bold mb-4">{systemState.currentTask}</div>
        
        <div className="text-sm text-zinc-400">REASONING:</div>
        <div className="text-md">{systemState.reasoning}</div>
      </div>
    </div>
  );
};

export default SystemConsciousness;
