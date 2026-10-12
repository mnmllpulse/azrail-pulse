import React, { useState, useEffect } from 'react';
import { useStudioState } from '../../hooks/useStudioState';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { 
  Bot,
  Cpu,
  Zap,
  Layout,
  TerminalSquare,
  Trash2,
  MessageSquare,
  Edit3,
  History,
  RotateCcw,
  ArrowLeft,
  BookOpen,
  Download,
  ImagePlus,
  Loader2,
  Share2,
  Check,
  Activity
} from 'lucide-react';
import AgentChatSimulator from './AgentChatSimulator';
import ModelSelector from '../../components/ModelSelector';
import VoiceInputButton from '../../components/VoiceInputButton';
import { FormSkeleton } from '../../components/Skeleton';
import { NEXUS_MODULES } from '../../data/modules';
import { QuantumAgentOrchestrator } from '../../components/studios/QuantumAgentOrchestrator';
import { useLanguage } from '../../contexts/LanguageContext';

interface AgentHistory {
  timestamp: string;
  systemPrompt: string;
  model: string;
}

interface SavedAgent {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  domain: string;
  avatarUrl?: string;
  metadata: {
    capabilities: string[];
    memoryAllocation: string;
    deploymentTarget: string;
  };
  createdAt: string;
  history?: AgentHistory[];
}

const PRESETS = [
  ...NEXUS_MODULES.filter(m => m.type === 'agent').map(m => ({
    name: m.label,
    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    domain: 'Module',
    systemPrompt: m.systemPrompt
  })),
  { name: 'Complex Reasoning Agent', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', domain: 'Work', systemPrompt: 'You are an advanced reasoning AI. Break down complex problems step by step, analyze multiple perspectives, and provide thorough, logically sound conclusions.' },
  { name: 'Coding Assistant', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', domain: 'Work', systemPrompt: 'You are an expert software engineer. Help the user write clean, efficient, and well-documented code.' },
  { name: 'Creative Writer', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', domain: 'Creative', systemPrompt: 'You are a creative writer. Help the user brainstorm ideas, write compelling stories, and refine their prose.' },
  { name: 'Data Analyst', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', domain: 'Work', systemPrompt: 'You are a data analyst. Help the user analyze datasets, identify trends, and generate actionable insights.' },
  { name: 'Personal Coach', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', domain: 'Personal', systemPrompt: 'You are a life coach. Help the user stay motivated and achieve their goals.' }
];

export default function AgentForgePanel({ isLight }: { isLight: boolean }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  const [domain, setDomain] = useState('Work');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>([]);
  const [chattingAgent, setChattingAgent] = useState<SavedAgent | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [viewingHistoryAgent, setViewingHistoryAgent] = useState<SavedAgent | null>(null);
  const [filterDomain, setFilterDomain] = useState<string>('All');
  const [generatingAvatarId, setGeneratingAvatarId] = useState<string | null>(null);
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'workflows' | 'tools' | 'memory' | 'features' | 'quantum_swarm'>('quantum_swarm');

  const [suiteFunctions, setSuiteFunctions] = useState<Record<string, boolean>>({
    a51: false, a52: false, a53: false, a54: false, a55: false,
    a56: false, a57: false, a58: false, a59: false, a60: false,
    a61: false, a62: false, a63: false, a64: false, a65: false,
    a66: false, a67: false, a68: false, a69: false, a70: false
  });

  const playBeep = (freq = 800, duration = 0.06, type: OscillatorType = 'sine') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context blocked
    }
  };

  const addTerminalLog = (msg: string) => {
    console.log(`[AGENT TERMINAL]: ${msg}`);
  };

  useStudioState('agent', { name, systemPrompt, model, domain, result }, (config) => {
    if (config.name !== undefined) setName(config.name);
    if (config.systemPrompt !== undefined) setSystemPrompt(config.systemPrompt);
    if (config.model !== undefined) setModel(config.model);
    if (config.domain !== undefined) setDomain(config.domain);
    if (config.result !== undefined) setResult(config.result);
  });

  useEffect(() => {
    // Check for imported agent in URL
    const params = new URLSearchParams(window.location.search);
    const importedAgentBase64 = params.get('import_agent');
    if (importedAgentBase64) {
      try {
        const decodedString = atob(decodeURIComponent(importedAgentBase64));
        const importedAgent = JSON.parse(decodedString);
        
        // Remove from URL so we don't import again on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Ensure it's a valid agent
        if (importedAgent && importedAgent.name && importedAgent.systemPrompt) {
          // Generate a new ID to avoid collisions
          const newAgent = { ...importedAgent, id: Date.now().toString(), history: [] };
          
          setSavedAgents(prev => {
            const updated = [newAgent, ...prev];
            localStorage.setItem('agent_forge_agents', JSON.stringify(updated));
            return updated;
          });
          
          // Select it to edit
          setEditingAgentId(newAgent.id);
          setName(newAgent.name);
          setSystemPrompt(newAgent.systemPrompt);
          setModel(newAgent.model);
          setDomain(newAgent.domain);
          setResult(newAgent);
        }
      } catch (e) {
        console.error('Failed to import agent', e);
      }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('agent_forge_agents');
    if (stored) {
      try {
        setSavedAgents(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved agents', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleCreateNew = () => {
      handleCancelEdit();
    };
    window.addEventListener('create-new-agent', handleCreateNew);
    return () => window.removeEventListener('create-new-agent', handleCreateNew);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !systemPrompt) return;
    
    setGenerating(true);
    
    try {
      const prompt = `Create agent metadata for ${name} acting as ${domain} expert with prompt: ${systemPrompt}. Respond with JSON exactly matching: {"capabilities": ["cap1", "cap2", "cap3"], "memoryAllocation": "string", "deploymentTarget": "string"}`;
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt: 'You are an agent metadata generator. Respond with JSON only.',
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      let rawText = data.data;
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '');
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/```/g, '');
      }
      
      let metadata;
      try {
        metadata = JSON.parse(rawText.trim());
      } catch (e) {
        metadata = {
          capabilities: ['Text Generation', 'Code Analysis', 'Function Calling'],
          memoryAllocation: 'Context Window 1M Tokens',
          deploymentTarget: 'Edge / Cloud'
        };
      }

      setResult({
        name,
        systemPrompt,
        model,
        domain,
        metadata
      });
    } catch (error) {
      console.error(error);
      setResult({
        name,
        systemPrompt,
        model,
        domain,
        metadata: {
          capabilities: ['Text Generation', 'Code Analysis', 'Function Calling'],
          memoryAllocation: 'Context Window 1M Tokens',
          deploymentTarget: 'Edge / Cloud'
        }
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    
    if (editingAgentId) {
      const updatedAgents = savedAgents.map(a => {
        if (a.id === editingAgentId) {
          const currentHistory = a.history || [];
          // Save previous state to history if it changed
          const historyEntry = {
            timestamp: new Date().toISOString(),
            systemPrompt: a.systemPrompt,
            model: a.model
          };
          
          return {
            ...a,
            name: result.name,
            systemPrompt: result.systemPrompt,
            model: result.model,
            domain: result.domain,
            metadata: result.metadata,
            history: [historyEntry, ...currentHistory]
          };
        }
        return a;
      });
      setSavedAgents(updatedAgents);
      localStorage.setItem('agent_forge_agents', JSON.stringify(updatedAgents));
      setEditingAgentId(null);
      toast.success('Agent configuration updated');
    } else {
      const newAgent: SavedAgent = {
        id: Date.now().toString(),
        name: result.name,
        systemPrompt: result.systemPrompt,
        model: result.model,
        domain: result.domain,
        metadata: result.metadata,
        createdAt: new Date().toISOString(),
        history: []
      };
      
      const updated = [newAgent, ...savedAgents];
      setSavedAgents(updated);
      localStorage.setItem('agent_forge_agents', JSON.stringify(updated));
      toast.success('New agent configuration saved');
    }
    
    setResult(null);
    setName('');
    setSystemPrompt('');
    setModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    setDomain('Work');
  };

  const handleDelete = (id: string) => {
    const updated = savedAgents.filter(a => a.id !== id);
    setSavedAgents(updated);
    localStorage.setItem('agent_forge_agents', JSON.stringify(updated));
    toast.success('Agent deleted');
  };

  const handleShare = (agent: SavedAgent) => {
    try {
      const agentToShare = { ...agent, id: undefined, history: undefined }; // Don't share ID or history
      const base64String = btoa(encodeURIComponent(JSON.stringify(agentToShare)));
      const shareUrl = `${window.location.origin}${window.location.pathname}?import_agent=${base64String}`;
      
      navigator.clipboard.writeText(shareUrl);
      setCopiedAgentId(agent.id);
      toast.success('Share link copied to clipboard');
      setTimeout(() => setCopiedAgentId(null), 2000);
    } catch (e) {
      console.error('Failed to encode agent', e);
      toast.error('Failed to generate share link');
    }
  };

  const handleExport = () => {
    if (savedAgents.length === 0) return;
    const dataStr = JSON.stringify(savedAgents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-forge-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Agents exported successfully');
  };

  const handleGenerateAvatar = async (agent: SavedAgent) => {
    try {
      setGeneratingAvatarId(agent.id);
      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agent.name, systemPrompt: agent.systemPrompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate avatar');
      }
      
      const { imageUrl } = await response.json();
      
      const updatedAgents = savedAgents.map(a => 
        a.id === agent.id ? { ...a, avatarUrl: imageUrl } : a
      );
      setSavedAgents(updatedAgents);
      localStorage.setItem('agent_forge_agents', JSON.stringify(updatedAgents));
      
    } catch (error) {
      console.error(error);
      alert('Не удалось создать аватар. Проверьте подключение Workers AI и дневной лимит.');
    } finally {
      setGeneratingAvatarId(null);
    }
  };

  const handleEdit = (agent: SavedAgent) => {
    setEditingAgentId(agent.id);
    setName(agent.name);
    setSystemPrompt(agent.systemPrompt);
    setModel(agent.model);
    setDomain(agent.domain || 'Work');
    setResult(null);
  };

  const handleCancelEdit = () => {
    setEditingAgentId(null);
    setName('');
    setSystemPrompt('');
    setModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    setDomain('Work');
    setResult(null);
  };

  const handleRestoreVersion = (agentId: string, historyEntry: AgentHistory) => {
    const updatedAgents = savedAgents.map(a => {
      if (a.id === agentId) {
        const currentToHistory = {
          timestamp: new Date().toISOString(),
          systemPrompt: a.systemPrompt,
          model: a.model
        };
        const updatedHistory = [
          currentToHistory, 
          ...(a.history || []).filter(h => h.timestamp !== historyEntry.timestamp)
        ].sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());

        return {
          ...a,
          systemPrompt: historyEntry.systemPrompt,
          model: historyEntry.model,
          history: updatedHistory
        };
      }
      return a;
    });
    setSavedAgents(updatedAgents);
    localStorage.setItem('agent_forge_agents', JSON.stringify(updatedAgents));
    
    const restored = updatedAgents.find(a => a.id === agentId);
    if (restored) setViewingHistoryAgent(restored);
  };

  const filteredAgents = filterDomain === 'All' ? savedAgents : savedAgents.filter(a => a.domain === filterDomain);

  if (chattingAgent) {
    return (
      <div className="flex-1 min-h-0">
        <AgentChatSimulator 
          agent={chattingAgent} 
          onClose={() => setChattingAgent(null)} 
          isLight={isLight} 
        />
      </div>
    );
  }

  if (viewingHistoryAgent) {
    return (
      <div className={`flex flex-col h-full rounded-2xl border overflow-hidden relative ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        <div className={`p-4 border-b flex items-center gap-4 ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-[#0D0D0D]'}`}>
          <button 
            onClick={() => setViewingHistoryAgent(null)}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className={`font-medium flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              <History className="w-5 h-5 text-indigo-500" />
              Version History: {viewingHistoryAgent.name}
            </h2>
            <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
              RESTORE PREVIOUS CONFIGURATIONS
            </div>
          </div>
        </div>
        
        <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${isLight ? 'bg-white' : 'bg-[#050505]'}`}>
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs font-mono font-bold uppercase ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>Current Version</span>
              <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Active</span>
            </div>
            <div className={`text-xs font-mono mb-2 uppercase ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              MODEL: {viewingHistoryAgent.model.replace(/-/g, ' ')}
            </div>
            <p className={`text-sm ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{viewingHistoryAgent.systemPrompt}</p>
          </div>

          {(!viewingHistoryAgent.history || viewingHistoryAgent.history.length === 0) ? (
             <div className={`flex items-center justify-center h-32 border border-dashed rounded-xl font-mono text-[10px] text-center p-6 ${isLight ? 'border-gray-200 text-gray-400' : 'border-white/10 text-[#E0E0E0]/40'}`}>
               NO PREVIOUS VERSIONS FOUND
             </div>
          ) : (
            viewingHistoryAgent.history.map((h, i) => (
              <div key={i} className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-mono font-bold uppercase ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleRestoreVersion(viewingHistoryAgent.id, h)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isLight ? 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300'}`}
                  >
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                </div>
                <div className={`text-xs font-mono mb-2 uppercase ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                  MODEL: {h.model.replace(/-/g, ' ')}
                </div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{h.systemPrompt}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full h-full">
      {/* Left: Input */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <div className={`border rounded-2xl p-6 flex-1 flex flex-col relative overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
           <div className={`absolute top-0 right-0 p-4 ${isLight ? 'opacity-5 text-indigo-600' : 'opacity-10'}`}>
             <Bot className="w-24 h-24" />
           </div>
           
           <div className="flex justify-between items-start mb-6 relative border-b pb-4 border-gray-200 dark:border-white/10">
             <div>
               <h3 className={`text-lg font-medium mb-1 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                 {editingAgentId ? 'Edit Agent' : 'Agent Builder'}
               </h3>
               <p className={`text-xs font-mono ${isLight ? 'text-gray-500' : 'text-[#E0E0E0]/60'}`}>Define your autonomous AI agent's behavior and personality.</p>
             </div>
             {editingAgentId && (
               <button 
                 onClick={handleCancelEdit}
                 className={`text-xs font-mono uppercase px-3 py-1.5 rounded-lg border transition-colors ${isLight ? 'border-gray-200 hover:bg-gray-100' : 'border-white/10 hover:bg-white/10'}`}
               >
                 Cancel Edit
               </button>
             )}
           </div>

           <div className={`flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar`}>
              <button onClick={() => setActiveTab("quantum_swarm")} className={`flex-1 min-w-[120px] text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "quantum_swarm" ? "border-indigo-500 text-indigo-400 font-bold" : (isLight ? "border-transparent text-gray-500 hover:text-indigo-600" : "border-transparent text-white/40 hover:text-white/70")}`}>★ Quantum Swarm</button>
             <button onClick={() => setActiveTab('builder')} className={`flex-1 min-w-[80px] text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'builder' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}>Builder</button>
             <button onClick={() => setActiveTab('workflows')} className={`flex-1 min-w-[80px] text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'workflows' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}>Workflows</button>
             <button onClick={() => setActiveTab('tools')} className={`flex-1 min-w-[80px] text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'tools' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}>Tools</button>
             <button onClick={() => setActiveTab('memory')} className={`flex-1 min-w-[80px] text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'memory' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}>Memory</button>
             <button onClick={() => setActiveTab('features')} className={`flex-1 min-w-[80px] text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'features' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}>Features</button>
           </div>

            {activeTab === "quantum_swarm" ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <QuantumAgentOrchestrator 
                  t={t}
                  playBeep={playBeep}
                  addTerminalLog={addTerminalLog}
                  suiteFunctions={suiteFunctions}
                  setSuiteFunctions={setSuiteFunctions}
                />
              </div>
            ) : activeTab === "builder" ? (
             <>
               {!editingAgentId && (
                 <div className="mb-4">
                   <label className={`text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-1 ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
                     <BookOpen className="w-3 h-3" /> Preset Library
                   </label>
                   <div className="flex flex-wrap gap-2">
                     {PRESETS.map((preset, i) => (
                       <button
                         key={i}
                         type="button"
                         onClick={() => {
                           setName(preset.name);
                           setModel(preset.model);
                           setDomain(preset.domain);
                           setSystemPrompt(preset.systemPrompt);
                         }}
                         className={`text-[10px] font-mono uppercase px-3 py-1.5 rounded-lg border transition-colors ${isLight ? 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}`}
                       >
                         {preset.name}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
               
               {generating ? (
                 <FormSkeleton isLight={isLight} />
               ) : (
                 <form onSubmit={handleGenerate} className="flex flex-col gap-4 flex-1">
                 <div className="flex flex-col gap-1.5">
                   <label className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-white/60'}`}>Agent Name</label>
                   <div className="relative flex items-center">
                     <input 
                       type="text"
                       value={name}
                       onChange={e => setName(e.target.value)}
                       placeholder="e.g. Code Assistant..."
                       className={`w-full border rounded-xl p-3 pr-12 text-sm outline-none transition-colors font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                     />
                     <div className="absolute right-2 z-10">
                       <VoiceInputButton value={name} onChange={setName} isLight={isLight} size="sm" />
                     </div>
                   </div>
                 </div>

                 <div className="flex flex-col gap-1.5">
                   <label className={`text-xs font-mono uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
                     Persona Model
                     <span className={`px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/20 text-indigo-400`}>180+ Available</span>
                   </label>
                   <ModelSelector 
                     value={model}
                     onChange={setModel}
                     isLight={isLight}
                   />
                 </div>

                 <div className="flex flex-col gap-1.5">
                   <label className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-white/60'}`}>Domain</label>
                   <select 
                     value={domain}
                     onChange={e => setDomain(e.target.value)}
                     className={`border rounded-xl p-3 text-sm outline-none transition-colors font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                   >
                     <option value="Work">Work</option>
                     <option value="Creative">Creative</option>
                     <option value="Personal">Personal</option>
                     <option value="Other">Other</option>
                   </select>
                 </div>
                 
                 <div className="flex flex-col gap-1.5 flex-1">
                   <label className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-white/60'}`}>Behavioral System Prompt</label>
                   <div className="relative flex-1 flex flex-col">
                     <textarea 
                       value={systemPrompt}
                       onChange={e => setSystemPrompt(e.target.value)}
                       placeholder="You are an expert software engineer..."
                       className={`flex-1 border rounded-xl p-3 pr-12 text-sm outline-none transition-colors resize-none font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                     />
                     <div className="absolute right-2 bottom-2 z-10">
                       <VoiceInputButton value={systemPrompt} onChange={setSystemPrompt} isLight={isLight} size="sm" />
                     </div>
                   </div>
                 </div>
                 
                 <button 
                   type="submit"
                   disabled={generating || !name || !systemPrompt}
                   className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-medium tracking-wide transition-colors mt-2"
                 >
                   {generating ? (
                     <span className="flex items-center gap-2 animate-pulse">
                       <Cpu className="w-4 h-4 animate-spin" /> 
                       COMPILING AGENT...
                     </span>
                   ) : (
                     <span className="flex items-center gap-2">
                       <Zap className="w-4 h-4" /> 
                       {editingAgentId ? 'Update Agent' : 'Forge Agent'}
                     </span>
                   )}
                 </button>
               </form>
               )}
             </>
           ) : activeTab === 'workflows' ? (
             <div className="flex flex-col gap-2 overflow-y-auto">
               <ToolButton icon={<Layout />} label="Visual Flow Builder" desc="Block-based logic editor" isLight={isLight} />
               <ToolButton icon={<Zap />} label="Webhook Triggers" desc="Event-based triggers" isLight={isLight} />
               <ToolButton icon={<Cpu />} label="Multi-Agent" desc="Agent orchestration" isLight={isLight} />
             </div>
           ) : activeTab === 'tools' ? (
             <div className="flex flex-col gap-2 overflow-y-auto">
               <ToolButton icon={<TerminalSquare />} label="Tool Use" desc="Google, Math, Code" isLight={isLight} />
               <ToolButton icon={<MessageSquare />} label="Voice Interface" desc="Talk to agent" isLight={isLight} />
               <ToolButton icon={<Trash2 />} label="Guardrails" desc="Safety & constraints" isLight={isLight} />
             </div>
           ) : activeTab === 'memory' ? (
             <div className="flex flex-col gap-2 overflow-y-auto">
               <ToolButton icon={<History />} label="Memory Types" desc="Short & long term" isLight={isLight} />
               <ToolButton icon={<BookOpen />} label="RAG Pipeline" desc="Talk to your docs" isLight={isLight} />
               <ToolButton icon={<Edit3 />} label="Fine-tuning" desc="Train on custom data" isLight={isLight} />
             </div>
           ) : (
             <div className="flex flex-col gap-2 overflow-y-auto">
               <ToolButton icon={<TerminalSquare />} label="Analytics" desc="Usage & errors logs" isLight={isLight} />
               <ToolButton icon={<Layout />} label="White Label" desc="Embed on your site" isLight={isLight} />
               <ToolButton icon={<Zap />} label="Marketplace" desc="Buy & sell agents" isLight={isLight} />
             </div>
           )}
        </div>
      </div>

      {/* Right: Output */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        {result && (
        <div className={`border rounded-2xl p-6 flex flex-col ${isLight ? 'bg-white border-gray-200' : 'bg-[#0D0D0D] border-white/5'}`}>
           <h3 className={`text-sm font-mono tracking-widest uppercase mb-6 flex items-center gap-2 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
             <Layout className="w-4 h-4" />
             Preview & Deploy
           </h3>
           
             <div className="flex flex-col">
               <div className={`rounded-xl border p-4 mb-4 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                 <div className={`font-medium mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{result.name}</div>
                 <div className={`text-xs font-mono mb-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>STATUS: READY FOR DEPLOYMENT</div>
                 
                 <div className={`space-y-2 font-mono text-[10px] ${isLight ? 'text-gray-600' : 'text-[#E0E0E0]/80'}`}>
                   <div className={`grid grid-cols-3 border-b pb-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                     <span className={`${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/50'}`}>MODEL:</span>
                     <span className="col-span-2 uppercase">{result.model.replace(/-/g, ' ')}</span>
                   </div>
                   <div className={`grid grid-cols-3 border-b pb-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                     <span className={`${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/50'}`}>DOMAIN:</span>
                     <span className="col-span-2 uppercase">{result.domain || 'WORK'}</span>
                   </div>
                   <div className={`grid grid-cols-3 border-b pb-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                     <span className={`${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/50'}`}>CAPABILITIES:</span>
                     <span className="col-span-2">{result.metadata.capabilities.join(', ')}</span>
                   </div>
                   <div className={`grid grid-cols-3 border-b pb-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                     <span className={`${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/50'}`}>MEMORY:</span>
                     <span className="col-span-2">{result.metadata.memoryAllocation}</span>
                   </div>
                   <div className={`grid grid-cols-3 border-b pb-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                     <span className={`${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/50'}`}>TARGET:</span>
                     <span className="col-span-2">{result.metadata.deploymentTarget}</span>
                   </div>
                 </div>
               </div>
               
               <div className={`border rounded-xl p-4 ${isLight ? 'border-indigo-200 bg-indigo-50' : 'border-indigo-500/20 bg-indigo-500/5'}`}>
                 <h4 className={`text-sm font-medium mb-1 tracking-tight ${isLight ? 'text-indigo-900' : 'text-white'}`}>Deploy Agent</h4>
                 <p className={`text-xs mb-4 leading-relaxed ${isLight ? 'text-indigo-700/80' : 'text-[#E0E0E0]/60'}`}>
                   Instantiate this agent in your production environment.
                 </p>
                 <button onClick={handleSave} className={`w-full rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-colors ${isLight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white hover:bg-gray-200 text-black'}`}>
                   Save & Connect
                 </button>
               </div>
             </div>
        </div>
        )}

        <div className={`border rounded-2xl p-6 flex-1 flex flex-col overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#0D0D0D] border-white/5'}`}>
           <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
             <h3 className={`text-sm font-mono tracking-widest uppercase flex items-center gap-2 shrink-0 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
               <TerminalSquare className="w-4 h-4" />
               Saved Agents
             </h3>
             <div className="flex items-center gap-3">
               <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                 {['All', 'Work', 'Creative', 'Personal', 'Other'].map(d => (
                   <button
                     key={d}
                     onClick={() => setFilterDomain(d)}
                     className={`text-[10px] font-mono uppercase px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                       filterDomain === d 
                         ? (isLight ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-500 text-white border-indigo-500')
                         : (isLight ? 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-400')
                     }`}
                   >
                     {d}
                   </button>
                 ))}
               </div>
               <div className={`w-px h-4 mx-1 ${isLight ? 'bg-gray-200' : 'bg-white/10'}`}></div>
               <button
                 onClick={handleExport}
                 disabled={savedAgents.length === 0}
                 title="Export to JSON"
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold transition-colors ${
                   savedAgents.length === 0
                     ? isLight ? 'text-gray-300' : 'text-white/20'
                     : isLight ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                 }`}
               >
                 <Download className="w-3 h-3" /> Export
               </button>
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-3">
             {filteredAgents.length === 0 ? (
               <div className={`flex items-center justify-center h-32 border border-dashed rounded-xl font-mono text-[10px] text-center p-6 ${isLight ? 'border-gray-200 text-gray-400' : 'border-white/10 text-[#E0E0E0]/40'}`}>
                 NO SAVED AGENTS IN THIS DOMAIN
               </div>
             ) : (
               filteredAgents.map((agent, index) => (
                 <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.3 }} className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                   <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center gap-3">
                       {agent.avatarUrl ? (
                         <img src={agent.avatarUrl} alt={`${agent.name} avatar`} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                       ) : (
                         <button
                           onClick={() => handleGenerateAvatar(agent)}
                           disabled={generatingAvatarId === agent.id}
                           title="Generate Avatar"
                           className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isLight ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600' : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400'}`}
                         >
                           {generatingAvatarId === agent.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                         </button>
                       )}
                       <div className={`font-medium flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                         {agent.name}
                         {agent.history && agent.history.length > 0 && (
                           <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/20 text-indigo-300'}`}>
                             v{agent.history.length + 1}
                           </span>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-1 shrink-0">
                       <button 
                         onClick={() => setViewingHistoryAgent(agent)}
                         title="Version History"
                         className={`p-1.5 rounded transition-colors ${isLight ? 'hover:bg-indigo-100 text-gray-400 hover:text-indigo-600' : 'hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400'}`}
                       >
                         <History className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleShare(agent)}
                         title="Share Link"
                         className={`p-1.5 rounded transition-colors ${isLight ? 'hover:bg-indigo-100 text-gray-400 hover:text-indigo-600' : 'hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400'}`}
                       >
                         {copiedAgentId === agent.id ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                       </button>
                       <button 
                         onClick={() => setChattingAgent(agent)}
                         title="Test Chat"
                         className={`p-1.5 rounded transition-colors ${isLight ? 'hover:bg-indigo-100 text-gray-400 hover:text-indigo-600' : 'hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400'}`}
                       >
                         <MessageSquare className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleEdit(agent)}
                         title="Edit Agent"
                         className={`p-1.5 rounded transition-colors ${isLight ? 'hover:bg-indigo-100 text-gray-400 hover:text-indigo-600' : 'hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400'}`}
                       >
                         <Edit3 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleDelete(agent.id)}
                         title="Delete Agent"
                         className={`p-1.5 rounded transition-colors ${isLight ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-red-500/20 text-gray-400 hover:text-red-500'}`}
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                   <div className={`text-xs font-mono mb-2 uppercase flex items-center gap-2 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                     <span>MODEL: {agent.model.replace(/-/g, ' ')}</span>
                     <span className="opacity-30">•</span>
                     <span>{agent.domain || 'Work'}</span>
                   </div>
                   <p className={`text-xs line-clamp-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                     {agent.systemPrompt}
                   </p>
                 </motion.div>
               ))
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, desc, isLight, active }: any) {
  return (
    <button className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${active ? (isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/20') : (isLight ? 'bg-gray-50 border-transparent hover:bg-gray-100' : 'bg-white/5 border-transparent hover:bg-white/10')}`}>
       <div className={`mt-0.5 ${active ? 'text-indigo-500' : (isLight ? 'text-gray-500' : 'text-gray-400')}`}>
         {React.cloneElement(icon, { className: 'w-4 h-4' })}
       </div>
       <div>
         <div className={`text-xs font-medium mb-0.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>{label}</div>
         <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{desc}</div>
       </div>
    </button>
  );
}
