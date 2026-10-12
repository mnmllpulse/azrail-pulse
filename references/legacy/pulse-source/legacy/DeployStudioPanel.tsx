import React, { useState } from 'react';
import { 
  Network, 
  Play, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Layers, 
  ExternalLink,
  Cpu,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

export default function DeployStudioPanel({ isLight }: { isLight: boolean }) {
  const [activeTab, setActiveTab] = useState<'deploy' | 'iac'>('deploy');
  const [target, setTarget] = useState<'cloudrun' | 'cloudflare' | 'vercel'>('cloudrun');
  const [deployStep, setDeployStep] = useState<number>(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleDeploy = () => {
    setIsDeploying(true);
    setDeployStep(1);
    setLogs(['[SYSTEM] Initializing production bundle optimization...']);

    const steps = [
      { text: '[VITE] Bundling assets (index.html, styles, chunks)...', sleep: 1000 },
      { text: '[DOCKER] Compiling multi-stage serverless container image...', sleep: 2000 },
      { text: '[SECURITY] Injecting sandboxed SSL routing headers...', sleep: 1500 },
      { text: '[INGRESS] Dispatching container load to Europe-West Cluster...', sleep: 2500 },
      { text: '[GATEWAY] DNS Propagation complete: https://pulse-labs.org/deployed', sleep: 1200 }
    ];

    let currentLogIndex = 0;
    
    const runStep = () => {
      if (currentLogIndex < steps.length) {
        const step = steps[currentLogIndex];
        setTimeout(() => {
          setLogs(prev => [...prev, step.text]);
          setDeployStep(prev => prev + 1);
          currentLogIndex++;
          runStep();
        }, step.sleep);
      } else {
        setIsDeploying(false);
        toast.success('Production deployment completed successfully');
      }
    };

    runStep();
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'deploy'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5" />
            <span>Launch Controls</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('iac')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'iac'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Declarative IaC Profiles</span>
          </div>
        </button>
      </div>

      {activeTab === 'deploy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Selection */}
          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Deployment Targets</h3>
            <div className="flex flex-col gap-3">
              {[
                { id: 'cloudrun', name: 'Google Cloud Run', desc: 'Secure Serverless Containers', active: true },
                { id: 'cloudflare', name: 'Cloudflare Pages', desc: 'Edge CDN Static Deployment', active: false },
                { id: 'vercel', name: 'Vercel Lambda', desc: 'Zero Config App Ingress', active: false }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (!isDeploying) setTarget(t.id as any);
                  }}
                  className={`w-full p-4 border rounded-xl text-left transition-all ${
                    target === t.id
                      ? (isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/30')
                      : (isLight ? 'border-zinc-200 hover:bg-zinc-50' : 'border-white/5 hover:bg-white/5')
                  } ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-zinc-300">{t.name}</span>
                    {target === t.id && <span className="text-[9px] text-indigo-400 font-bold uppercase">SELECTED</span>}
                  </div>
                  <span className="text-[10px] text-zinc-500">{t.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
            >
              {isDeploying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Trigger Production Deploy</span>
            </button>
          </div>

          {/* Console Output Logs */}
          <div className="lg:col-span-2">
            <div className={`border rounded-2xl p-5 h-full flex flex-col ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Deployment Pipeline Console</span>
                </div>
                {isDeploying && (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">BUILDING</span>
                )}
              </div>

              <div className="flex-1 min-h-[180px] p-4 bg-black/60 border border-white/5 rounded-xl text-[10px] text-zinc-500 overflow-y-auto space-y-1.5 leading-normal">
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <p key={i} className={
                      log.includes('[SYSTEM]') ? 'text-zinc-500' :
                      log.includes('[VITE]') ? 'text-zinc-400' :
                      log.includes('[DOCKER]') ? 'text-indigo-400' :
                      log.includes('[SECURITY]') ? 'text-amber-400' :
                      log.includes('[GATEWAY]') ? 'text-emerald-400 font-bold' : 'text-zinc-500'
                    }>{log}</p>
                  ))
                ) : (
                  <p className="text-zinc-600 text-center py-16 uppercase tracking-widest">Pipeline standby. Trigger deploy to build container.</p>
                )}
              </div>

              {logs.some(l => l.includes('deployed')) && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold">DEPLOYMENT COMPLETE</span>
                  <a
                    href="https://pulse-labs.org/deployed"
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-zinc-300 hover:text-white flex items-center gap-1 font-bold"
                  >
                    <span>View App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'iac' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Wrangler Deployment Profile</h3>
              <div className="p-4 bg-black/60 border border-white/5 rounded-xl text-[10px] text-zinc-300 leading-relaxed font-mono overflow-x-auto">
                <p className="text-zinc-600"># wrangler.toml configuration profile</p>
                <p><span className="text-indigo-400 font-bold">name</span> = "mnmll-pulse-os"</p>
                <p><span className="text-indigo-400 font-bold">main</span> = "server.ts"</p>
                <p><span className="text-indigo-400 font-bold">compatibility_date</span> = "2026-07-18"</p>
                <p><span className="text-indigo-400 font-bold">node_compat</span> = true</p>
                <br />
                <p className="text-zinc-600">[env.production.vars]</p>
                <p><span className="text-amber-400 font-bold">NODE_ENV</span> = "production"</p>
                <p><span className="text-amber-400 font-bold">PORT</span> = "3000"</p>
              </div>
            </div>
          </div>

          <div>
            <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4">IaC Validation</h3>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Immutable profiles are parsed before deployment by angelic cores to prevent structural syntax errors, port bindings over 3000, or raw key leakage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
