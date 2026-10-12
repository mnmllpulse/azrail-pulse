import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Activity, GitMerge, Brain, Shield, Target, Radio, Layers, 
  Settings, Zap, CheckCircle2, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { FusionEngineNode, FusionResult } from '../../../types';

export function CognitiveFusionEngine() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [nodes, setNodes] = useState<FusionEngineNode[]>([
    { id: 'n1', name: 'Divergent', type: 'divergent', confidence: 0.82, weight: 0.45, status: 'active' },
    { id: 'n2', name: 'Critical', type: 'critical', confidence: 0.96, weight: 0.10, status: 'active' },
    { id: 'n3', name: 'Strategic', type: 'strategic', confidence: 0.91, weight: 0.20, status: 'active' },
    { id: 'n4', name: 'Predictive', type: 'predictive', confidence: 0.76, weight: 0.10, status: 'active' },
    { id: 'n5', name: 'Systems', type: 'systems', confidence: 0.88, weight: 0.15, status: 'active' },
  ]);

  const [consensus, setConsensus] = useState<FusionResult[]>([]);

  useEffect(() => {
    runFusion();
  }, []);

  const runFusion = () => {
    setIsProcessing(true);
    // Simulate parallel cognition
    setTimeout(() => {
      const newResults: FusionResult[] = nodes.map(node => ({
        engineId: node.id,
        decision: `Optimized pathway via ${node.name} logic`,
        confidence: Math.random() * 0.3 + 0.6
      }));
      setConsensus(newResults);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full gap-6 p-6 bg-black/40 border border-white/5 rounded-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Cognitive Fusion Engine</h2>
          <p className="text-xs text-white/50 font-mono">Real-time parallel consensus synchronization</p>
        </div>
        <button 
          onClick={runFusion}
          disabled={isProcessing}
          className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-[10px] font-mono uppercase font-bold tracking-widest transition-all flex items-center gap-2"
        >
          {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
          Execute Fusion
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {nodes.map(node => (
          <div key={node.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-white/80">{node.name}</span>
              <Activity className={`w-3 h-3 ${node.status === 'active' ? 'text-fuchsia-400 animate-pulse' : 'text-white/20'}`} />
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-fuchsia-500" style={{ width: `${node.weight * 100}%` }} />
            </div>
            <span className="text-[9px] font-mono text-white/40">{Math.round(node.confidence * 100)}% Conf.</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <h3 className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Parallel Cognition Stream</h3>
        <AnimatePresence>
          {consensus.map((res, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4"
            >
              <div className="p-2 rounded-xl bg-fuchsia-500/10">
                <Brain className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div>
                <div className="text-[10px] font-mono font-bold text-white">Engine {res.engineId} Input</div>
                <div className="text-[11px] font-mono text-white/60">{res.decision}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
