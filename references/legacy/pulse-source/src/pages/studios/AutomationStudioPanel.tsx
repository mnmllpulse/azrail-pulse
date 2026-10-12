import React, { useState } from 'react';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  Zap, 
  Send, 
  MessageSquare, 
  Folder, 
  Play, 
  RefreshCw,
  Cpu,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowNode {
  id: string;
  source: string;
  action: string;
  destination: string;
}

export default function AutomationStudioPanel({ isLight }: { isLight: boolean }) {
  const [activeTab, setActiveTab] = useState<'workflows' | 'logs'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowNode[]>([
    { id: '1', source: 'Telegram Hook', action: 'Sentiment Filter', destination: 'Discord Feed' },
    { id: '2', source: 'API Endpoint', action: 'RAG Summarizer', destination: 'Cloud Database' }
  ]);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleAddNode = () => {
    const id = Date.now().toString();
    setWorkflows([
      ...workflows,
      { id, source: 'Custom Webhook', action: 'Classification Model', destination: 'Storage Bucket' }
    ]);
    toast.success('New workflow automation node appended');
  };

  const handleDeleteNode = (id: string) => {
    setWorkflows(workflows.filter(w => w.id !== id));
    toast.success('Automation node discarded');
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      toast.success('Cognitive automation pipelines deployed live');
    }, 1000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'workflows'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Workflow Nodes</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'logs'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>Telemetry Logs</span>
          </div>
        </button>
      </div>

      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Cognitive Orchestration Flow</span>
              <div className="flex gap-2">
                <button
                  onClick={handleAddNode}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors border border-white/5 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Append Node</span>
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
                >
                  {isDeploying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Deploy Flow</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 relative">
              {workflows.map((node, index) => (
                <div key={node.id} className="relative">
                  <div className={`p-5 border rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between ${
                    isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'
                  }`}>
                    <div className="flex flex-col md:flex-row gap-6 items-center flex-1 w-full justify-between">
                      {/* Trigger block */}
                      <div className="flex flex-col gap-1 w-full md:w-1/3">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">TRIGGER</span>
                        <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs text-zinc-300 font-bold uppercase">{node.source}</span>
                        </div>
                      </div>

                      {/* Connection arrow */}
                      <div className="text-zinc-600 hidden md:block">➔</div>

                      {/* Action block */}
                      <div className="flex flex-col gap-1 w-full md:w-1/3">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">COGNITIVE ACTION</span>
                        <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs text-indigo-400 font-bold uppercase">{node.action}</span>
                        </div>
                      </div>

                      {/* Connection arrow */}
                      <div className="text-zinc-600 hidden md:block">➔</div>

                      {/* Destination block */}
                      <div className="flex flex-col gap-1 w-full md:w-1/3">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">OUTBOUND RECIPIENT</span>
                        <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex items-center gap-2">
                          <Send className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-zinc-300 font-bold uppercase">{node.destination}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteNode(node.id)}
                      className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all self-end md:self-center mt-4 md:mt-0 ml-0 md:ml-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4">Orchestrator Stats</h3>
              <div className="space-y-4 text-xs font-mono text-zinc-500">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Trigger Executions</span>
                  <span className="text-indigo-400">1,824 runs</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Success Rate</span>
                  <span className="text-emerald-400">99.82%</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Average Cost / Pipeline</span>
                  <span>$0.0004</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex flex-col gap-4 font-mono">
          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Active Telemetry Logs</h3>
            <div className="space-y-2 text-[10px] text-zinc-500 overflow-y-auto max-h-96 leading-normal p-4 bg-black/60 border border-white/5 rounded-xl">
              <p className="text-zinc-600">[TELEMETRY] [18:03:01] Webhook triggered on mnmllpulse.com/webhook/post</p>
              <p className="text-indigo-400">[TELEMETRY] [18:03:01] Route: Tokenized payload size: 402 bytes. Initializing Sentiment filter...</p>
              <p className="text-zinc-300">[TELEMETRY] [18:03:02] Model decision: POSITIVE (0.912 confidence score).</p>
              <p className="text-emerald-400">[TELEMETRY] [18:03:02] Outbound broadcast: Dispatched alert to Discord webhook feed.</p>
              <p className="text-zinc-600">[TELEMETRY] [18:03:15] Heartbeat checkpoint: Ingress ports 3000 mapping perfectly active.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
