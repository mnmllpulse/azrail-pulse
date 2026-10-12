import React from 'react';
import { CloudLightning, GitBranch, Terminal, RefreshCw, Server, Activity } from 'lucide-react';

interface CloudPipelineProps {
  t: (en: string, ru?: string) => string;
}

export function CloudPipeline({ t }: CloudPipelineProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <CloudLightning className="w-4 h-4 text-amber-400" />
          {t('Cloud Deploy CI/CD', 'Облачный Конвейер')}
        </h5>
        <div className="text-[8px] font-mono text-amber-400 uppercase">PIPELINE: ACTIVE</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-zinc-300 uppercase">Production Branch</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-500">v2.4.1-stable</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            {[
              { id: 'build', label: 'Optimize & Build', status: 'Complete', icon: <Terminal className="w-3 h-3" />, color: 'text-emerald-400' },
              { id: 'test', label: 'E2E Testing', status: 'Complete', icon: <Activity className="w-3 h-3" />, color: 'text-emerald-400' },
              { id: 'deploy', label: 'Edge Deployment', status: 'In Progress', icon: <Server className="w-3 h-3" />, color: 'text-amber-400' },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center z-10 ${step.status === 'In Progress' ? 'ring-2 ring-amber-500/20' : ''}`}>
                  {step.status === 'Complete' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{step.icon}</span>
                      <span className="text-[10px] font-bold text-zinc-300 uppercase">{step.label}</span>
                    </div>
                    <span className={`text-[8px] font-mono font-bold uppercase ${step.color}`}>{step.status}</span>
                  </div>
                  <div className="text-[8px] font-mono text-zinc-600 truncate">LOG: {Math.random().toString(36).substring(7).toUpperCase()}... COMPILING ASSETS</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20">
        <RefreshCw className="w-3.5 h-3.5" /> {t('Trigger Manual Deploy', 'Запустить Деплой')}
      </button>
    </div>
  );
}
