import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Database, Network, Cpu, Sparkles, ArrowRight } from 'lucide-react';

interface StreamNode {
  id: number;
  label: string;
  status: 'active' | 'syncing' | 'idle';
  latency: number;
  tokensPerSec: number;
}

export const RealityDataStreamVisualizer: React.FC = () => {
  const [nodes, setNodes] = useState<StreamNode[]>([
    { id: 1, label: 'GEMINI 2.5 PRO STREAM', status: 'active', latency: 14, tokensPerSec: 142 },
    { id: 2, label: 'QUANTUM EMBEDDING CORE', status: 'active', latency: 8, tokensPerSec: 320 },
    { id: 3, label: 'NEURAL AUDIO BINAURAL', status: 'syncing', latency: 22, tokensPerSec: 88 },
    { id: 4, label: 'SURFACE SHIFT RENDERER', status: 'active', latency: 11, tokensPerSec: 210 },
  ]);

  // Simulate incoming data stream pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          latency: Math.floor(6 + Math.random() * 18),
          tokensPerSec: Math.floor(80 + Math.random() * 250),
        }))
      );
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 rounded-2xl bg-zinc-950/90 border border-purple-500/30 backdrop-blur-xl shadow-[0_0_25px_rgba(168,85,247,0.15)] space-y-3 font-mono text-xs select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-purple-400">
          <Network className="w-4 h-4 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-white text-[11px]">
            AI DATA STREAM FLOW
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>4 PIPELINES LIVE</span>
        </div>
      </div>

      {/* Nodes visual flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {nodes.map((node, i) => (
          <div
            key={node.id}
            className="p-3 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between relative overflow-hidden group hover:border-purple-500/40 transition-all"
          >
            {/* Animated Stream Beam */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none"
            />

            <div className="flex items-center gap-2.5 z-10">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-cyan-400">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-200 tracking-wide">{node.label}</p>
                <div className="flex items-center gap-2 text-[9px] text-zinc-400">
                  <span>{node.tokensPerSec} tok/s</span>
                  <span>•</span>
                  <span className="text-cyan-400">{node.latency}ms</span>
                </div>
              </div>
            </div>

            <div className="z-10 text-right">
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-purple-950/80 border border-purple-500/40 text-purple-300">
                {node.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealityDataStreamVisualizer;
