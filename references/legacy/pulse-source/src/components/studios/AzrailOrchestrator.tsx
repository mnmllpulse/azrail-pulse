import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Cpu, Zap, Shield, Terminal, Loader2 } from 'lucide-react';

interface OrchestratorProps {
  request: string;
  onComplete: (data: { analysis: string; assignedAgents: Record<string, string> }) => void;
  isLight?: boolean;
}

export const agentRoles = {
  creative: { name: "Creative", tasks: ["music", "image", "video"] },
  technical: { name: "Technical", tasks: ["code", "web", "deploy"] },
  analyst: { name: "Analyst", tasks: ["data", "swarm", "analytics"] }
};

const assignAgents = (request: string) => {
  const req = request.toLowerCase();
  if (req.includes("музыка") || req.includes("music") || req.includes("image") || req.includes("видео")) return "creative";
  if (req.includes("код") || req.includes("code") || req.includes("deploy") || req.includes("web")) return "technical";
  return "analyst";
};

export const AzrailOrchestrator: React.FC<OrchestratorProps> = ({ request, onComplete, isLight }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRequest = async () => {
    if (!request.trim()) return;
    
    setIsAnalyzing(true);
    setLogs(["[INIT]: Azrail Core v3.0 booting...", "📡 Intercepting neural signal..."]);

    const assignedRole = assignAgents(request);
    const roleDetails = agentRoles[assignedRole as keyof typeof agentRoles];

    // Simulated thinking steps
    const steps = [
      "🧠 Analyzing semantic patterns...",
      `🔍 Identified ${roleDetails.name} context...`,
      "⚡ Optimizing latency path for task distribution...",
      "🎯 Finalizing agent assignment matrix..."
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600));
      setLogs(prev => [...prev, step]);
    }

    const analysis = `Azrail Core has processed the request. Detected ${roleDetails.name} complexity requirements. Primary tasks: ${roleDetails.tasks.join(", ")}.`;
    
    const agents = {
      primary: `${roleDetails.name} Specialist Node`,
      creative: "Pulse Visual/Aural Synthesis Engine",
      technical: "Quantum Code Infrastructure",
      analyst: "Swarm Data Correlation Hub"
    };

    setTimeout(() => {
      onComplete({ analysis, assignedAgents: agents });
      setIsAnalyzing(false);
      setLogs(prev => [...prev, `✅ [SUCCESS]: Task delegated to ${roleDetails.name} cluster.`]);
    }, 500);
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-500 ${
      isLight 
        ? 'bg-white border-gray-200 shadow-sm' 
        : 'bg-black/40 border-white/5 backdrop-blur-xl'
    }`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <Cpu className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h3 className={`text-lg font-medium tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Azrail Orchestrator
          </h3>
          <p className={`text-xs font-mono opacity-50 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
            CORE_VERSION: 3.0.4 // SWARM_ACTIVE
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Terminal/Log View */}
        <div className={`h-48 rounded-xl border p-4 font-mono text-[10px] overflow-y-auto space-y-1 ${
          isLight ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-black/60 border-white/5 text-indigo-300'
        }`}>
          {logs.length === 0 ? (
            <div className="opacity-30 italic">Waiting for input signal...</div>
          ) : (
            logs.map((log, i) => (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                key={i}
                className="flex gap-2"
              >
                <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </motion.div>
            ))
          )}
          {isAnalyzing && (
            <div className="flex items-center gap-2 animate-pulse text-white">
              <span className="w-1 h-3 bg-white" />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        <button
          onClick={handleRequest}
          disabled={isAnalyzing || !request.trim()}
          className={`w-full group relative flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all duration-300 overflow-hidden ${
            isAnalyzing 
              ? 'bg-indigo-500/20 cursor-not-allowed text-indigo-300' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 fill-current" />
          )}
          <span>{isAnalyzing ? 'ORCHESTRATING...' : 'LAUNCH AZRAIL CORE'}</span>
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        {[
          { icon: Sparkles, label: 'Creative' },
          { icon: Terminal, label: 'Technical' },
          { icon: Shield, label: 'Security' }
        ].map((tag, i) => (
          <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono border ${
            isLight ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/40'
          }`}>
            <tag.icon className="w-3 h-3" />
            <span>{tag.label.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
