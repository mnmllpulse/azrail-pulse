import React, { useState } from 'react';
import { Workflow, Share2, GitMerge, Database, Shield, Zap, RefreshCw, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface LogicArchitectProps {
  t: (en: string, ru?: string) => string;
  addTerminalLog: (msg: string) => void;
  playBeep: (freq: number, dur: number) => void;
}

export function LogicArchitect({ t, addTerminalLog, playBeep }: LogicArchitectProps) {
  const [nodes, setNodes] = useState([
    { id: '1', type: 'trigger', label: 'USER_LOGIN', pos: { x: 50, y: 50 } },
    { id: '2', type: 'action', label: 'AUTH_VERIFY', pos: { x: 200, y: 50 } },
    { id: '3', type: 'condition', label: 'IS_PRO_USER?', pos: { x: 350, y: 50 } },
    { id: '4', type: 'result', label: 'GRANT_ACCESS', pos: { x: 500, y: 20 } },
    { id: '5', type: 'result', label: 'SHOW_PAYWALL', pos: { x: 500, y: 80 } },
  ]);

  const addNode = () => {
    playBeep(1400, 0.05);
    addTerminalLog('Injecting new logic node into kernel execution tree.');
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Workflow className="w-4 h-4 text-emerald-400" />
          {t('Logic & State Architect', 'Архитектор Логики и Стейта')}
        </h5>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black/60 rounded-2xl border border-white/5 relative overflow-hidden group">
        {/* Simplified Node Graph Simulator */}
        <div className="absolute inset-0 p-6 flex items-center justify-center gap-8">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <path d="M 80 50 L 170 50 M 230 50 L 320 50 M 380 40 L 470 25 M 380 60 L 470 75" stroke="currentColor" strokeWidth="1" fill="none" className="text-emerald-500" />
          </svg>

          {nodes.map((node) => (
            <div 
              key={node.id} 
              className={`relative z-10 px-3 py-1.5 rounded-lg border text-[8px] font-mono font-bold uppercase transition-all cursor-move group/node ${
                node.type === 'trigger' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' :
                node.type === 'condition' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                node.type === 'result' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {node.label}
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-inherit border border-white/10 opacity-0 group-hover/node:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="flex gap-2">
            {[
              { label: 'Trigger', icon: <Zap className="w-3 h-3" /> },
              { label: 'Action', icon: <GitMerge className="w-3 h-3" /> },
              { label: 'Database', icon: <Database className="w-3 h-3" /> },
            ].map(btn => (
              <button 
                key={btn.label}
                onClick={addNode}
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-mono text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
              >
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
          <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest bg-black/40 px-2 py-1 rounded border border-white/5">
            Kernel: v4.2.0-STABLE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-zinc-500">
            <span>State Synchronicity</span>
            <span className="text-emerald-400">Perfect</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[95%]" />
          </div>
        </div>
        <button
          onClick={() => {
            playBeep(1200, 0.1);
            addTerminalLog('RE-COMPILING KERNEL LOGIC TREE... OPTIMIZING PATHS.');
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold uppercase transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t('Compile Logic', 'Скомпилировать Логику')}
        </button>
      </div>
    </div>
  );
}

import { Settings2 } from 'lucide-react';
