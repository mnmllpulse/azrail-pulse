import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Search, Trash2, X, RefreshCw, FileText, Database, 
  Calendar, ArrowRight, Sparkles, Filter, ShieldAlert, AlertTriangle,
  History, Download
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { toast } from 'react-hot-toast';
import { NEXUS_MODULES } from '../data/modules';

interface MemoryLog {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AzrailMemoryCorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

const AVAILABLE_AGENTS = NEXUS_MODULES.filter(m => m.type === 'agent' || m.type === 'visual').map(m => ({
  id: m.id.toLowerCase().replace(/\s+/g, '-'),
  name: m.label,
  role: m.role
}));

export function AzrailMemoryCorePanel({ isOpen, onClose, isLight = false }: AzrailMemoryCorePanelProps) {
  const { playHover, playActivation } = useAudio();
  const [selectedAgentId, setSelectedAgentId] = useState(AVAILABLE_AGENTS[0]?.id || 'axiom');
  const [logs, setLogs] = useState<MemoryLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  const [activeLayer, setActiveLayer] = useState<'L1' | 'L2' | 'L3' | 'L4' | 'L5'>('L2');
  const [memoryStatus, setMemoryStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/memory/status');
      const data = await res.json();
      if (data.status === 'ok') setMemoryStatus(data.memory);
    } catch (e) {
      console.error('Failed to fetch memory status', e);
    }
  };

  const fetchLogs = async (agentId: string) => {
    setIsLoading(true);
    await fetchStatus();
    try {
      // Map activeLayer to appropriate endpoint if needed, for now use current episodic API for L2
      const endpoint = activeLayer === 'L2' ? `/api/memory/get?agentId=${agentId}` : `/api/memory/get?agentId=${agentId}&layer=${activeLayer}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch neural logs');
      }
      const data = await response.json();
      if (data.status === 'ok') {
        setLogs(data.history || []);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Error reloading memory banks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs(selectedAgentId);
    }
  }, [isOpen, selectedAgentId, activeLayer]);

  const handleDeleteLog = async (timestamp: string) => {
    playActivation();
    try {
      const response = await fetch('/api/memory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, timestamp })
      });
      if (!response.ok) {
        throw new Error('Deletion failed');
      }
      const data = await response.json();
      if (data.status === 'ok') {
        toast.success('Episode successfully deleted from Azrail Memory');
        // Refresh logs locally
        setLogs(prev => prev.filter(log => log.timestamp !== timestamp));
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Could not excise memory segment');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you absolutely sure you want to completely clear the Memory Core for this agent? This action is irreversible.')) {
      return;
    }
    playActivation();
    try {
      const response = await fetch('/api/memory/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId })
      });
      if (!response.ok) {
        throw new Error('Clear operation failed');
      }
      const data = await response.json();
      if (data.status === 'ok') {
        toast.success('All episodic memories cleared');
        setLogs([]);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Could not clear neural memory bank');
    }
  };

  // Filter logs based on search and role filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || log.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleHover = () => {
    playHover();
  };

  const handleExportJSON = () => {
    if (logs.length === 0) {
      toast.error('No memory records to export');
      return;
    }
    playActivation();
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azrail-memory-${selectedAgentId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('JSON export successful');
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('No memory records to export');
      return;
    }
    playActivation();
    const headers = ['role', 'content', 'timestamp'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.role,
        `"${log.content.replace(/"/g, '""')}"`,
        log.timestamp
      ].join(','))
    ].join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azrail-memory-${selectedAgentId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV export successful');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Right side drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg border-l flex flex-col overflow-hidden shadow-2xl ${
              isLight 
                ? 'bg-white border-gray-200 text-gray-900' 
                : 'bg-[#0a0512]/95 border-purple-950/40 backdrop-blur-lg text-white'
            }`}
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-black/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isLight ? 'bg-indigo-600 text-white' : 'bg-purple-500/20 text-purple-400 animate-pulse'}`}>
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Azrail Memory Core</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">Neural Episode logs & interaction history</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(selectedAgentId)}
                  onMouseEnter={handleHover}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isLight 
                      ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-600' 
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                  }`}
                  title="Reload Memory Banks"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  onMouseEnter={handleHover}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isLight 
                      ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-600' 
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar gap-5">
              
              {/* Memory Layers (L1-L5) */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Neural Layers (L1-L5)</label>
                <div className="grid grid-cols-5 gap-1.5 font-mono text-[9px]">
                  {(['L1', 'L2', 'L3', 'L4', 'L5'] as const).map((layer) => (
                    <button
                      key={layer}
                      onClick={() => {
                        playActivation();
                        setActiveLayer(layer);
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        activeLayer === layer
                          ? 'bg-pulse-primary/10 border-pulse-primary text-pulse-primary shadow-[0_0_15px_rgba(123,77,255,0.1)]'
                          : isLight
                            ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold">{layer}</span>
                      <span className="text-[8px] opacity-60">
                        {memoryStatus ? (memoryStatus[layer] ?? 0) : '...'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={`p-2 rounded-lg text-[9px] font-mono italic text-center ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-white/5 text-zinc-500'}`}>
                  {activeLayer === 'L1' && "Short-term session context (Volatile)"}
                  {activeLayer === 'L2' && "Persistent conversation history (Episodic)"}
                  {activeLayer === 'L3' && "Project-specific semantic context"}
                  {activeLayer === 'L4' && "Global knowledge graph & linked documents"}
                  {activeLayer === 'L5' && "System-wide experience & best practices"}
                </div>
              </div>

              {/* Agent Selector */}
              <div>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Select Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => {
                    playActivation();
                    setSelectedAgentId(e.target.value);
                  }}
                  className={`w-full p-2.5 border rounded-xl text-xs font-mono focus:outline-none ${
                    isLight 
                      ? 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500' 
                      : 'bg-black/30 border-white/10 text-white focus:border-indigo-500'
                  }`}
                >
                  {AVAILABLE_AGENTS.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Search & Filters</label>
                
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search query or synthesis..."
                    className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none ${
                      isLight 
                        ? 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500' 
                        : 'bg-black/20 border-white/10 text-white focus:border-indigo-500'
                    }`}
                  />
                </div>

                {/* Role tags */}
                <div className="flex gap-2">
                  {(['all', 'user', 'assistant'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        playActivation();
                        setRoleFilter(role);
                      }}
                      onMouseEnter={handleHover}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
                        roleFilter === role
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : isLight
                            ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                            : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {role.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory List */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Neural episodes ({filteredLogs.length})</span>
                  {logs.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      onMouseEnter={handleHover}
                      className="text-[9px] font-mono text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Core
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-xs font-mono">Syncing neural indexes...</span>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-zinc-500 border border-dashed rounded-2xl p-6 border-zinc-800">
                    <Database className="w-8 h-8 opacity-20 mb-2" />
                    <span className="text-xs font-mono font-medium block">No Records Found</span>
                    <span className="text-[10px] opacity-60">The memory banks are either empty or filtered out.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLogs.map((log, index) => {
                      const isExpanded = expandedLogIdx === index;
                      const isUser = log.role === 'user';
                      
                      return (
                        <div 
                          key={index}
                          className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                            isExpanded 
                              ? 'border-indigo-500/50 bg-indigo-500/5'
                              : isLight
                                ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                : 'bg-black/20 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {/* Item Header */}
                          <div 
                            className="p-3.5 flex justify-between items-start gap-3 cursor-pointer"
                            onClick={() => {
                              playActivation();
                              setExpandedLogIdx(isExpanded ? null : index);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${
                                  isUser 
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' 
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {log.role}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-500">
                                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Unknown'}
                                </span>
                              </div>
                              <p className={`text-xs truncate font-mono ${isLight ? 'text-gray-800' : 'text-zinc-200'}`}>
                                {log.content}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteLog(log.timestamp)}
                                onMouseEnter={handleHover}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
                                title="Exterminate Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content View */}
                          {isExpanded && (
                            <div className={`p-4 border-t border-zinc-800/40 font-mono text-xs leading-relaxed space-y-2 ${
                              isLight ? 'bg-white text-gray-800' : 'bg-black/40 text-zinc-300'
                            }`}>
                              <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-zinc-800/20 pb-1">
                                <span>EPISODIC CONTENT DETAILED VIEW</span>
                                <span className="flex items-center gap-1 text-emerald-500"><Sparkles className="w-2.5 h-2.5" /> DEEP MEMORY</span>
                              </div>
                              <p className="whitespace-pre-wrap select-text">{log.content}</p>
                              {log.timestamp && (
                                <div className="text-[9px] text-zinc-600 text-right pt-2 border-t border-zinc-800/20">
                                  UUID TIMESTAMP: {log.timestamp}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className={`p-6 border-t flex flex-col gap-4 font-mono text-[9px] text-zinc-500 ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/5'
            }`}>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1"><Database className="w-3 h-3" /> RETENTION POLICY: ACTIVE</span>
                <span>ZERO-TRUST SECURE SYNC</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleExportJSON}
                  onMouseEnter={handleHover}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg transition-all ${
                    isLight 
                      ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <Download className="w-3 h-3" /> EXPORT JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  onMouseEnter={handleHover}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg transition-all ${
                    isLight 
                      ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <Download className="w-3 h-3" /> EXPORT CSV
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
