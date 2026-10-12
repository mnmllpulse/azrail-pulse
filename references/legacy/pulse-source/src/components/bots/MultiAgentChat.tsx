import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  Music, 
  Terminal, 
  Cpu, 
  Layers, 
  CheckCircle, 
  Code, 
  Eye, 
  Copy, 
  Activity, 
  Sliders, 
  Play, 
  RefreshCw,
  Monitor,
  Smartphone,
  Flame,
  Zap,
  Check,
  Share2,
  Settings2,
  Database,
  Github,
  Box,
  ChevronRight,
  Shield,
  Gauge,
  Workflow,
  Network,
  Binary,
  Brain,
  Search,
  Lock,
  Globe,
  Loader2,
  Disc
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  glow: string;
  icon: React.ComponentType<any>;
  status: 'IDLE' | 'WORKING' | 'SUCCESS';
  efficiency: number;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  agentName: string;
  agentColor: string;
  agentIcon: React.ComponentType<any>;
  text: string;
  codeSnippet?: string;
  layoutStructure?: string[];
  designTokens?: Record<string, string>;
  timestamp: string;
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'web-arch', name: 'Web Architect', role: 'Full-stack React & DOM layout compiling', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.25)]', icon: Code, status: 'IDLE', efficiency: 98.8 },
  { id: 'ui-design', name: 'UI Designer', role: 'Bento configurations & aesthetic tokens styling', color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10', glow: 'shadow-[0_0_20px_rgba(244,114,182,0.25)]', icon: Sliders, status: 'IDLE', efficiency: 97.4 },
  { id: 'img-art', name: 'Image Artisan', role: 'Synthesizing vector SVGs & visual assets', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.25)]', icon: ImageIcon, status: 'IDLE', efficiency: 95.1 },
  { id: 'sound-weaver', name: 'Sound Weaver', role: 'Ambient audio & BPM layout synchronization', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]', icon: Music, status: 'IDLE', efficiency: 92.4 },
  { id: 'prompt-sage', name: 'Prompt Sage', role: 'Context expansion & token load optimization', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]', icon: Sparkles, status: 'IDLE', efficiency: 99.1 },
  { id: 'video-master', name: 'Video Master', role: 'Cinematic hover reels & active video loops', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.25)]', icon: Video, status: 'IDLE', efficiency: 94.2 },
  { id: 'qa-engineer', name: 'QA Validator', role: 'Security audits, WCAG checks & bundle metrics', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10', glow: 'shadow-[0_0_20px_rgba(45,212,191,0.25)]', icon: CheckCircle, status: 'IDLE', efficiency: 96.5 },
];

const PRESET_IDEAS = [
  { label: 'Minimal SaaS Dashboard', prompt: 'Create a dark minimal bento-style SaaS Dashboard with metric sparklines, status indicators, and collapsible filters.' },
  { label: 'Cyberpunk Portfolio', prompt: 'Design a high-contrast futuristic developer portfolio with neon glow borders, interactive active-node stats, and copyable social key links.' },
  { label: 'Ambient Audio Player', prompt: 'Generate an elegant music synth interface featuring animated wave layouts, BPM controllers, audio visualizer canvas, and playlist catalog.' },
];

export default function MultiAgentChat({ isLight }: { isLight?: boolean }) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      sender: 'agent', 
      agentName: 'Swarm Coordinator', 
      agentColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', 
      agentIcon: Cpu, 
      text: 'Swarm system initialized. Welcome to the elite Multi-Agent full-screen Sandbox. Enter layout requirements or click on a pre-configured template below to launch concurrent layout compilation.',
      timestamp: new Date().toLocaleTimeString() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isSwarmWorking, setIsSwarmWorking] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'tokens' | 'neural' | 'manager'>('preview');
  const [showConfig, setShowConfig] = useState(false);
  const [swarmParams, setSwarmParams] = useState({
    logicDepth: 85,
    creativeVariance: 42,
    recursionLimit: 60,
    neuralTemp: 0.72
  });
  const [telemetry, setTelemetry] = useState({
    tokensPerSec: 0,
    computeLoad: 0,
    activeNodes: 0,
    successRate: 99.8
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Compiled output preview state
  const [compiledResult, setCompiledResult] = useState<{
    title: string;
    codeSnippet: string;
    structure: string[];
    tokens: Record<string, string>;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopyCode = () => {
    if (!compiledResult) return;
    navigator.clipboard.writeText(compiledResult.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addLog = (text: string) => {
    setTerminalLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${text}`]);
  };

  const simulateSwarmResponse = async (userPrompt: string) => {
    setIsSwarmWorking(true);
    addLog("Initializing swarm sequence...");
    setTelemetry(prev => ({ ...prev, activeNodes: 1, computeLoad: 12 }));

    // Step 1: Prompt Sage refines the tokens
    setAgents(prev => prev.map(a => a.id === 'prompt-sage' ? { ...a, status: 'WORKING' } : a));
    addLog("Agent 'Prompt Sage' analyzing semantic vector space...");
    setTelemetry(prev => ({ ...prev, tokensPerSec: 1450, computeLoad: 28, activeNodes: 2 }));
    await new Promise(r => setTimeout(r, 1200));
    const msg1: Message = {
      id: 'step-1',
      sender: 'agent',
      agentName: 'Prompt Sage',
      agentColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      agentIcon: Sparkles,
      text: `Prompt analysis complete. Expanded parameters for "${userPrompt}" to 4,096 high-fidelity styling tokens. Forwarding specifications to UI Designer...`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, msg1]);
    setAgents(prev => prev.map(a => a.id === 'prompt-sage' ? { ...a, status: 'SUCCESS' } : a));
    addLog("Prompt Sage sync successful. Tokens propagated.");

    // Step 2: UI Designer crafts bento box wireframe
    setAgents(prev => prev.map(a => a.id === 'ui-design' ? { ...a, status: 'WORKING' } : a));
    addLog("Agent 'UI Designer' generating layout wireframes...");
    setTelemetry(prev => ({ ...prev, tokensPerSec: 2100, computeLoad: 45, activeNodes: 3 }));
    await new Promise(r => setTimeout(r, 1500));
    const msg2: Message = {
      id: 'step-2',
      sender: 'agent',
      agentName: 'UI Designer',
      agentColor: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
      agentIcon: Sliders,
      text: `Drafted structural layouts. Applying 'studio-module' glassmorphism classes, custom border glow variables, and high-contrast color values. Transmitting blueprints to Web Architect and Image Artisan...`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, msg2]);
    setAgents(prev => prev.map(a => a.id === 'ui-design' ? { ...a, status: 'SUCCESS' } : a));
    addLog("UI Designer layout compilation finished.");

    // Step 3: Image Artisan synthesizes SVGs
    setAgents(prev => prev.map(a => a.id === 'img-art' ? { ...a, status: 'WORKING' } : a));
    addLog("Agent 'Image Artisan' synthesizing vector assets...");
    setTelemetry(prev => ({ ...prev, tokensPerSec: 850, computeLoad: 62, activeNodes: 4 }));
    await new Promise(r => setTimeout(r, 1300));
    const msg3: Message = {
      id: 'step-3',
      sender: 'agent',
      agentName: 'Image Artisan',
      agentColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      agentIcon: ImageIcon,
      text: `Injected custom responsive SVG vector graphics, micro-interaction buttons, and subtle backdrop noise grids. Synced with active design systems.`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, msg3]);
    setAgents(prev => prev.map(a => a.id === 'img-art' ? { ...a, status: 'SUCCESS' } : a));
    addLog("Image Artisan assets rendered.");

    // Step 4: Web Architect compiles TypeScript source code
    setAgents(prev => prev.map(a => a.id === 'web-arch' ? { ...a, status: 'WORKING' } : a));
    addLog("Agent 'Web Architect' compiling React DOM tree...");
    setTelemetry(prev => ({ ...prev, tokensPerSec: 3200, computeLoad: 88, activeNodes: 5 }));
    await new Promise(r => setTimeout(r, 2000));

    // Generate custom layout based on input keywords
    const lower = userPrompt.toLowerCase();
    let generatedTitle = 'Interactive Bento Module';
    let layoutBlocks = ['Header Navigation Bar', 'Bento Analytics Grid', 'Dynamic Metric Sparkline', 'Operational Logs Feed', 'System Control Footer'];
    let themeColor = '#6366f1';
    let codeSnippet = '';

    if (lower.includes('dashboard') || lower.includes('saas')) {
      generatedTitle = 'Cinematic Operations Dashboard';
      themeColor = '#10b981';
      layoutBlocks = ['Telemetry Header Node', 'Metrics Tri-Grid', 'Live Flow Chart', 'System Integrations Map', 'Console Feed'];
      codeSnippet = `import React, { useState } from 'react';
import { Shield, Cpu, Activity, Database, AlertCircle } from 'lucide-react';

export default function SaaSMetricsApp() {
  const [nodes, setNodes] = useState([
    { name: 'Core Server Alpha', load: '14.2%', status: 'ONLINE', ping: '12ms' },
    { name: 'GPU Cluster Edge-B', load: '68.5%', status: 'ACTIVE', ping: '24ms' },
    { name: 'Firestore API Gateway', load: '32.1%', status: 'ONLINE', ping: '8ms' }
  ]);

  return (
    <div className="bg-[#050507] text-white p-6 font-sans min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h1 className="text-sm font-mono tracking-widest uppercase">SWARM.NODE_TELEMETRY</h1>
        </div>
        <div className="text-[10px] font-mono text-zinc-500">REFRESH_RATE: 1.2S</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {nodes.map(node => (
          <div key={node.name} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-emerald-500/20 transition-all duration-300">
            <h3 className="text-xs font-mono text-zinc-400 mb-1">{node.name}</h3>
            <div className="text-2xl font-semibold text-emerald-400 font-mono">{node.load}</div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/[0.03] text-[9px] font-mono text-zinc-500">
              <span>PING: {node.ping}</span>
              <span className="text-emerald-500 font-bold">{node.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`;
    } else if (lower.includes('music') || lower.includes('audio') || lower.includes('player')) {
      generatedTitle = 'Minimal Audio Synths Node';
      themeColor = '#ec4899';
      layoutBlocks = ['Waveform Canvas Slider', 'BPM Audio Synthesizer', 'Frequency Sparklines', 'Active Tracks Playlist'];
      codeSnippet = `import React, { useState } from 'react';
import { Play, Pause, SkipForward, Volume2, Disc } from 'lucide-react';

export default function MinimalAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(128);

  return (
    <div className="p-6 bg-[#09090b] text-white rounded-2xl border border-white/5 max-w-sm mx-auto">
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-4 overflow-hidden">
          <Disc className={\`w-12 h-12 text-indigo-400 \${isPlaying ? 'animate-spin' : ''}\`} />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">Digital Nebula</h3>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">AMBIENT SOUNDS</p>
      </div>

      <div className="flex justify-center items-center gap-6 mb-6">
        <button className="text-zinc-500 hover:text-white transition-colors text-xs">⏮</button>
        <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button className="text-zinc-500 hover:text-white transition-colors text-xs"><SkipForward className="w-4 h-4" /></button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[8px] font-mono text-zinc-500">
          <span>BPM: {bpm}</span>
          <span>STATION STATUS: SECURE</span>
        </div>
        <input 
          type="range" 
          min="80" 
          max="180" 
          value={bpm} 
          onChange={e => setBpm(Number(e.target.value))}
          className="w-full accent-indigo-500" 
        />
      </div>
    </div>
  );
}`;
    } else {
      generatedTitle = 'Ambient SpaceTech Landing Page';
      themeColor = '#6366f1';
      layoutBlocks = ['Futuristic Glass Header', 'Split Hero display', 'Bento Product Box Grid', 'Feature Metrics Log', 'Copyright Footer'];
      codeSnippet = `import React from 'react';
import { ArrowRight, Space, Compass, Shield } from 'lucide-react';

export default function SpatialTechLanding() {
  return (
    <div className="bg-[#020204] text-[#E0E0E0] font-sans min-h-screen">
      <nav className="p-5 flex justify-between items-center border-b border-white/5">
        <span className="text-xs font-mono tracking-widest text-white">SPATIAL.CO</span>
        <button className="text-[10px] font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-white hover:bg-white/10 transition-all">
          CONNECT NODE
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <span className="text-[9px] font-mono tracking-[0.2em] text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          NEURAL WORKSPACE V2
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mt-6 mb-4 max-w-lg mx-auto">
          Immersive Interfaces Built On Light.
        </h1>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed mb-8">
          Accelerate your interface compilation. Connect nodes, configure responsive layouts, and run heavy shaders in real-time.
        </p>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          Launch Sandbox <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </main>
    </div>
  );
}`;
    }

    const designTokens = {
      '--accent-color': themeColor,
      '--blur-level': '16px',
      '--border-opacity': '0.08',
      '--glow-radius': '20px',
      '--corner-radius': '16px',
      '--font-family': 'JetBrains Mono, Inter, monospace',
    };

    const finalResult = {
      title: generatedTitle,
      codeSnippet,
      structure: layoutBlocks,
      tokens: designTokens
    };

    const msg4: Message = {
      id: 'step-4',
      sender: 'agent',
      agentName: 'Web Architect',
      agentColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
      agentIcon: Code,
      text: `Layout code generation complete. Generated a fully semantic React module with responsive styling, custom SVG hooks, and optimized state controls. Check the Output Preview to verify compile results.`,
      timestamp: new Date().toLocaleTimeString(),
      codeSnippet,
      layoutStructure: layoutBlocks,
      designTokens
    };
    setMessages(prev => [...prev, msg4]);
    setAgents(prev => prev.map(a => a.id === 'web-arch' ? { ...a, status: 'SUCCESS' } : a));

    // Step 5: QA validation check
    setAgents(prev => prev.map(a => a.id === 'qa-engineer' ? { ...a, status: 'WORKING' } : a));
    addLog("Agent 'QA Validator' performing deep bundle audit...");
    setTelemetry(prev => ({ ...prev, computeLoad: 95, activeNodes: 6 }));
    await new Promise(r => setTimeout(r, 1000));
    const msg5: Message = {
      id: 'step-5',
      sender: 'agent',
      agentName: 'QA Validator',
      agentColor: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
      agentIcon: CheckCircle,
      text: `Validation passed successfully! WCAG compliance: 100%, Responsive viewport safety: 100%, CSS optimization metric: 0ms bundle overhead. Interface ready for production export.`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, msg5]);
    setAgents(prev => prev.map(a => a.id === 'qa-engineer' ? { ...a, status: 'SUCCESS' } : a));
    addLog("Final validation clear. Swarm standing down.");

    // Step 6: Neural Optimization (New elite step)
    addLog("Applying Neural Optimization to output binaries...");
    await new Promise(r => setTimeout(r, 800));
    setTelemetry(prev => ({ ...prev, computeLoad: 0, tokensPerSec: 0, activeNodes: 0 }));

    // Finish compiling
    setCompiledResult(finalResult);
    setIsSwarmWorking(false);
    
    // Clear all agent statuses back to IDLE
    setTimeout(() => {
      setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE' })));
    }, 2000);
  };

  const handleSend = () => {
    if (!input.trim() || isSwarmWorking) return;
    const currentInput = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      agentName: 'You',
      agentColor: 'text-white border-white/20 bg-white/5',
      agentIcon: User,
      text: currentInput,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    simulateSwarmResponse(currentInput);
  };

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 h-[calc(100vh-140px)] gap-4 overflow-hidden ${isLight ? 'text-gray-900' : 'text-[#E0E0E0]'}`}>
      
      {/* LEFT COLUMN: AGENT SWARM TELEMETRY & CONTROLLER (3 cols) */}
      <div className={`xl:col-span-3 border rounded-2xl flex flex-col gap-3.5 overflow-hidden ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-[#050508] border-white/5'}`}>
        
        {/* Header with Settings Toggle */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest">Agent Swarm OS</h3>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border transition-all ${showConfig ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-4">
          {showConfig ? (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-widest border-b border-white/5 pb-2">
                Swarm Optimization
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Logic Depth', key: 'logicDepth', icon: Brain },
                  { label: 'Creative Variance', key: 'creativeVariance', icon: Sparkles },
                  { label: 'Recursion Limit', key: 'recursionLimit', icon: RefreshCw },
                  { label: 'Neural Temp', key: 'neuralTemp', icon: Flame, isTemp: true }
                ].map(param => (
                  <div key={param.key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <param.icon className="w-3 h-3" />
                        <span>{param.label}</span>
                      </div>
                      <span className="text-white">
                        {param.isTemp 
                          ? (swarmParams as any)[param.key].toFixed(2)
                          : `${(swarmParams as any)[param.key]}%`}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min={param.isTemp ? 0 : 1}
                      max={param.isTemp ? 1 : 100}
                      step={param.isTemp ? 0.01 : 1}
                      value={(swarmParams as any)[param.key]}
                      onChange={(e) => setSwarmParams(prev => ({ ...prev, [param.key]: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                ))}
              </div>

              {/* Status Nodes */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                  <div className="text-[8px] text-zinc-500 font-mono uppercase mb-1">Compute</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{telemetry.computeLoad}%</div>
                </div>
                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                  <div className="text-[8px] text-zinc-500 font-mono uppercase mb-1">Throughput</div>
                  <div className="text-xs font-mono font-bold text-amber-400">{telemetry.tokensPerSec} t/s</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <p className="text-[10px] font-mono opacity-50 uppercase leading-relaxed">
                SPECIALIZED COOPERATIVE AGENTS ENGAGED IN REAL-TIME WEB CODING AND INTERFACE SYNTHESIS.
              </p>

              {/* Swarm Agents List */}
              <div className="space-y-2">
                {agents.map(agent => {
                  const AgentIcon = agent.icon;
                  const isWorking = agent.status === 'WORKING';
                  const isSuccess = agent.status === 'SUCCESS';

                  return (
                    <motion.div 
                      key={agent.id}
                      initial={false}
                      animate={{ 
                        scale: isWorking ? 1.02 : 1,
                        borderColor: isWorking ? 'rgba(99, 102, 241, 0.4)' : isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'
                      }}
                      className={`p-3 rounded-xl border transition-all relative overflow-hidden ${
                        isLight 
                          ? isWorking ? 'bg-indigo-50' : 'bg-gray-50'
                          : isWorking 
                            ? 'bg-indigo-500/[0.03] shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                            : isSuccess 
                              ? 'bg-emerald-500/[0.02]'
                              : 'bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${agent.color} ${agent.glow}`}>
                          <AgentIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-semibold tracking-tight">{agent.name}</span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                              isWorking 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' 
                                : isSuccess 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                  : 'bg-white/5 text-zinc-500'
                            }`}>
                              {agent.status}
                            </span>
                          </div>
                          <p className="text-[9px] opacity-60 leading-normal mb-1">{agent.role}</p>
                        </div>
                      </div>
                      {isWorking && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/20 overflow-hidden">
                          <motion.div 
                            className="h-full bg-indigo-500"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            style={{ width: '40%' }}
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Real-time Terminal Log */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-1.5 text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                  <Terminal className="w-3 h-3" /> System Logs
                </div>
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 h-[120px] overflow-y-auto font-mono text-[9px] space-y-1 custom-scrollbar">
                  {terminalLogs.length === 0 ? (
                    <div className="text-zinc-600 italic">Waiting for swarm initiation...</div>
                  ) : (
                    terminalLogs.map((log, i) => (
                      <div key={i} className="text-zinc-400 break-all">
                        <span className="text-indigo-400 opacity-50 mr-1">&gt;</span>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: ACTIVE INTERACTIVE CHAT SANDBOX (5 cols) */}
      <div className={`xl:col-span-5 border rounded-2xl flex flex-col overflow-hidden relative ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-[#050508] border-white/5'}`}>
        
        {/* Chat Feed Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/10">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold tracking-tight">Active Swarm Design Workspace</span>
          </div>
          {isSwarmWorking && (
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-amber-400">
              <RefreshCw className="w-3 h-3 animate-spin" /> SWARM SYNTHESIZING...
            </span>
          )}
        </div>

        {/* Message scroll list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => {
            const MsgIcon = msg.agentIcon;
            const isUser = msg.sender === 'user';

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className={`p-2 rounded-xl shrink-0 self-start border ${msg.agentColor}`}>
                    <MsgIcon className="w-4 h-4" />
                  </div>
                )}

                <div className={`flex flex-col gap-1 max-w-[85%]`}>
                  <div className="flex items-center gap-2 px-1 text-[9px] font-mono text-zinc-500">
                    <span className="font-bold text-zinc-400">{msg.agentName}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : isLight 
                        ? 'bg-gray-100 text-gray-800 rounded-tl-sm border border-gray-200' 
                        : 'bg-white/[0.02] border border-white/5 text-zinc-300 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>

                {isUser && (
                  <div className="p-2 rounded-xl shrink-0 self-start border border-white/10 bg-white/5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick idea triggers */}
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-white/5 bg-black/5">
          {PRESET_IDEAS.map((idea, idx) => (
            <button
              key={idx}
              disabled={isSwarmWorking}
              onClick={() => {
                setInput(idea.prompt);
              }}
              className="text-[9px] font-mono border border-white/5 bg-white/5 rounded-lg px-2 py-1 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
            >
              + {idea.label}
            </button>
          ))}
        </div>

        {/* Interactive Chat Input bar */}
        <div className="p-3 border-t border-white/5 bg-black/10">
          <div className="flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isSwarmWorking}
              placeholder={isSwarmWorking ? "Swarm compilation in progress..." : "Type layout specifications (e.g. brutalist pricing page)..."}
              className={`flex-1 p-3 rounded-xl border text-xs outline-none transition-colors font-mono ${
                isLight 
                  ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' 
                  : 'bg-white/5 border-white/10 text-white focus:border-indigo-500/50 focus:bg-white/10'
              }`}
            />
            <button 
              onClick={handleSend}
              disabled={isSwarmWorking || !input.trim()}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: COOPERATIVE OUTPUT PREVIEW & SOURCE CODE SANDBOX (4 cols) */}
      <div className={`xl:col-span-4 border rounded-2xl p-4 flex flex-col gap-3.5 overflow-hidden relative ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-[#050508] border-white/5'}`}>
        
        {/* Output Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest">Active Output Sandbox</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 border border-white/5 bg-black/20 p-1 rounded-xl">
              {[
                { icon: Share2, label: 'Share' },
                { icon: Github, label: 'Sync' },
                { icon: Zap, label: 'Edge' }
              ].map(action => (
                <button 
                  key={action.label}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-indigo-400 transition-all group relative"
                  title={action.label}
                >
                  <action.icon className="w-3.5 h-3.5" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black border border-white/10 text-[7px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 text-white/30 text-[9px] font-mono">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-2 py-1 rounded uppercase ${activeTab === 'preview' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
            >
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('neural')}
              className={`px-2 py-1 rounded uppercase ${activeTab === 'neural' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
            >
              Neural
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-2 py-1 rounded uppercase ${activeTab === 'code' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
            >
              Code
            </button>
            <button 
              onClick={() => setActiveTab('tokens')}
              className={`px-2 py-1 rounded uppercase ${activeTab === 'tokens' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
            >
              Tokens
            </button>
            <button 
              onClick={() => setActiveTab('manager')}
              className={`px-2 py-1 rounded uppercase flex items-center gap-1 ${activeTab === 'manager' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'hover:text-white'}`}
            >
              <Settings2 className="w-2.5 h-2.5" /> Bot Manager
            </button>
          </div>
          </div>
        </div>

        {/* Tab Viewport Contents */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {compiledResult ? (
            <AnimatePresence mode="wait">
              {activeTab === 'preview' && (
                <motion.div 
                  key="preview-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col gap-3.5 h-full min-h-0"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>{compiledResult.title}</span>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE MODULE
                    </div>
                  </div>

                  {/* Simulated Frame */}
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center min-h-[220px] relative overflow-hidden">
                    {/* Embedded interactive visual modules */}
                    <div className="w-full h-full flex flex-col justify-center items-center">
                      {compiledResult.title.includes('SaaS') ? (
                        <div className="w-full max-w-sm p-4 rounded-xl border border-emerald-500/20 bg-[#050508] relative">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[8px] font-mono text-white tracking-widest">SWARM_NODE</span>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-500">PING: 8ms</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded border border-white/5">
                              <span className="text-[10px] text-zinc-400">Core Alpha Server</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">14.2% Load</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded border border-white/5">
                              <span className="text-[10px] text-zinc-400">GPU Cluster Edge-B</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">68.5% Active</span>
                            </div>
                          </div>
                        </div>
                      ) : compiledResult.title.includes('Audio') ? (
                        <div className="w-full max-w-xs p-5 bg-black/60 border border-pink-500/20 rounded-2xl flex flex-col items-center">
                          <Disc className="w-10 h-10 text-pink-400 mb-3 animate-[spin_6s_linear_infinite]" />
                          <h4 className="text-xs font-bold text-white tracking-wide">Digital Nebula Synth</h4>
                          <p className="text-[8px] text-zinc-500 font-mono mt-0.5">AMBIENT TRACKS</p>
                          <div className="flex gap-4 mt-4">
                            <button className="text-[10px] bg-white/5 p-1 px-3 rounded text-zinc-400 hover:text-white border border-white/10">Play</button>
                            <button className="text-[10px] bg-white/5 p-1 px-3 rounded text-zinc-400 hover:text-white border border-white/10">Next</button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-sm p-5 border border-indigo-500/20 bg-black/40 rounded-xl text-center">
                          <span className="text-[8px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">NEURAL CORE</span>
                          <h4 className="text-sm font-bold text-white mt-3 mb-2">Immersive Interfaces Built On Light</h4>
                          <p className="text-[10px] text-zinc-400 leading-relaxed mb-4">Accelerate design systems and compile responsive React blueprints instantly.</p>
                          <button className="text-[9px] font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 transition-all">Launch Sandbox</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Structural layout outline */}
                  <div className="border border-white/5 rounded-xl p-3 bg-black/20 text-[10px] font-mono">
                    <div className="text-zinc-500 uppercase tracking-widest text-[8px] mb-2 font-bold">Compiled DOM Nodes Hierarchy</div>
                    <div className="space-y-1.5">
                      {compiledResult.structure.map((block, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-indigo-400 font-bold select-none">&lt;</span>
                          <span className="text-[#e0e0e0] font-semibold">{block}</span>
                          <span className="text-indigo-400 font-bold select-none">/&gt;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'neural' && (
                <motion.div 
                  key="neural-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col gap-4 h-full min-h-0"
                >
                  <div className="flex-1 relative bg-black/60 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center p-8">
                    {/* Neural Network SVG visualization */}
                    <svg className="w-full h-full max-w-xs opacity-40" viewBox="0 0 200 200">
                      <defs>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <circle cx="100" cy="100" r="10" fill="#6366f1" className="animate-pulse" />
                      <circle cx="40" cy="40" r="6" fill="#f472b6" />
                      <circle cx="160" cy="40" r="6" fill="#22d3ee" />
                      <circle cx="40" cy="160" r="6" fill="#fbbf24" />
                      <circle cx="160" cy="160" r="6" fill="#10b981" />
                      
                      {/* Dynamic connections */}
                      <motion.line 
                        x1="100" y1="100" x2="40" y2="40" 
                        stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 2"
                        animate={{ strokeDashoffset: [0, -10] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.line 
                        x1="100" y1="100" x2="160" y2="40" 
                        stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 2"
                        animate={{ strokeDashoffset: [0, -10] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.line 
                        x1="100" y1="100" x2="40" y2="160" 
                        stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 2"
                        animate={{ strokeDashoffset: [0, -10] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.line 
                        x1="100" y1="100" x2="160" y2="160" 
                        stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 2"
                        animate={{ strokeDashoffset: [0, -10] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </svg>

                    {/* Floating Data Nodes */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      <Network className="w-3 h-3 text-indigo-400" />
                      <span className="text-[8px] font-mono text-zinc-400 uppercase">Latency: 12ms</span>
                    </div>
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      <Brain className="w-3 h-3 text-fuchsia-400" />
                      <span className="text-[8px] font-mono text-zinc-400 uppercase">Logic Depth: 85</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="text-[8px] font-mono text-zinc-500 uppercase mb-2">Agent Sync Efficiency</div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: '92%' }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] font-mono text-indigo-400">
                        <span>COOPERATIVE</span>
                        <span>92%</span>
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="text-[8px] font-mono text-zinc-500 uppercase mb-2">Token Entropy</div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-fuchsia-500" initial={{ width: 0 }} animate={{ width: '45%' }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] font-mono text-fuchsia-400">
                        <span>STABLE</span>
                        <span>0.42</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'code' && (
                <motion.div 
                  key="code-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col gap-2 min-h-0"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <span>SaaSTelemetryApp.tsx</span>
                    <button 
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-all font-bold"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'COPIED' : 'COPY BUFFER'}
                    </button>
                  </div>

                  <textarea
                    readOnly
                    value={compiledResult.codeSnippet}
                    className="flex-1 w-full bg-black/80 text-emerald-400 font-mono text-[10px] p-4 border border-white/5 rounded-xl outline-none resize-none leading-relaxed"
                  />
                </motion.div>
              )}

              {activeTab === 'tokens' && (
                <motion.div 
                  key="tokens-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 space-y-2 font-mono text-[10px]"
                >
                  <div className="text-zinc-500 uppercase tracking-widest text-[8px] mb-2 font-bold">Dynamic Design Tokens Variables</div>
                  <div className="border border-white/5 rounded-xl p-4 bg-black/20 space-y-2.5">
                    {Object.entries(compiledResult.tokens).map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-white/[0.03] pb-1.5">
                        <span className="text-zinc-500">{key}:</span>
                        <span className="text-[#e0e0e0] font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            
              {activeTab === 'manager' && (
                <motion.div 
                  key="manager-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 custom-scrollbar"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> Elite Bot Manager Dashboard
                    </h3>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                      TOP 1 FEATURES
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Feature 1: Orchestrator Pipeline */}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-white">
                          <Workflow className="w-4 h-4 text-fuchsia-400" />
                          <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider">1. Swarm Orchestrator Pipeline</h4>
                        </div>
                        <span className="text-[8px] font-mono text-fuchsia-400 bg-fuchsia-400/10 px-1.5 py-0.5 rounded border border-fuchsia-400/20">VISUAL ROUTER</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-lg text-[9px] font-mono">
                          <span className="text-zinc-400">User Input Node</span>
                          <ChevronRight className="w-3 h-3 text-zinc-600" />
                          <span className="text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">Lead Designer</span>
                          <ChevronRight className="w-3 h-3 text-zinc-600" />
                          <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">React Engineer</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-relaxed">Drag-and-drop neural routing table. Define exact conversational sequences, parallel execution paths, and agent communication graphs.</p>
                      </div>
                    </div>

                    {/* Feature 2: Memory & Knowledge RAG */}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-white">
                          <Database className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider">2. Live Knowledge Injector (RAG)</h4>
                        </div>
                        <span className="text-[8px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">MEMORY CORE</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 flex items-center justify-center shrink-0">
                          <Brain className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1 space-y-1.5 text-[9px] font-mono">
                          <div className="flex justify-between items-center text-zinc-400">
                            <span>Vector Store DB:</span>
                            <span className="text-white">Active (2.4M Embeddings)</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-400">
                            <span>Context Window:</span>
                            <span className="text-emerald-400">128k Tokens Ready</span>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                            <div className="bg-cyan-400 w-[68%] h-full rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature 3: Agent Logic Deep Search */}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-white">
                          <Sliders className="w-4 h-4 text-amber-400" />
                          <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider">3. Deep Agent Personality Tuning</h4>
                        </div>
                        <span className="text-[8px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">PROMPT LAB</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-mono text-zinc-400"><span>Tone Strictness</span><span>High</span></div>
                          <div className="w-full h-1 bg-white/5 rounded"><div className="w-4/5 h-full bg-amber-400 rounded" /></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-mono text-zinc-400"><span>Creativity Range</span><span>Optimal</span></div>
                          <div className="w-full h-1 bg-white/5 rounded"><div className="w-1/2 h-full bg-indigo-400 rounded" /></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Feature 4: Token Economics */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-white mb-2">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider">4. Cost & Token Forecaster</h4>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 space-y-1.5">
                          <div className="flex justify-between"><span>Session Budget:</span><span className="text-white">$14.50</span></div>
                          <div className="flex justify-between"><span>Smart Routing:</span><span className="text-indigo-400">GPT-4 + Gemini</span></div>
                        </div>
                      </div>

                      {/* Feature 5: Security & Guardrails */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-white mb-2">
                          <Shield className="w-4 h-4 text-rose-400" />
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider">5. Autonomy Guardrails</h4>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-white"><CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> Web Scraping Allowed</div>
                          <div className="flex items-center gap-1.5 text-white"><CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> Auto-Deploy Disabled</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl p-8 text-center text-zinc-500 font-mono text-[10px]">
              <Loader2 className="w-6 h-6 mb-3 animate-spin text-indigo-500 opacity-40" />
              WAITING FOR SWARM COMPILER CHANNELS TO RENDER DOM BLUEPRINTS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
