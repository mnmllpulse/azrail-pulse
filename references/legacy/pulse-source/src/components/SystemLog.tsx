import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, RefreshCw, XCircle } from 'lucide-react';
import { useSystemState } from '../contexts/SystemStateContext';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export function SystemLog() {
  const { uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), message: 'System initialized. Loading core modules...', type: 'info' },
    { id: '2', timestamp: new Date().toLocaleTimeString(), message: 'Network connection established securely.', type: 'success' },
  ]);
  const [isLive, setIsLive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulate real-time events
  useEffect(() => {
    if (!isLive) return;

    const templates = [
      { message: 'Allocating additional memory for neural rendering pipeline.', type: 'info' as const },
      { message: 'Connection timeout on edge node 04. Retrying...', type: 'warning' as const },
      { message: 'Garbage collection cycle completed successfully.', type: 'success' as const },
      { message: 'Synchronizing database shard replicas.', type: 'info' as const },
      { message: 'Detected high latency in the routing mesh. Auto-balancing load.', type: 'warning' as const },
      { message: 'User session signature validated and cached.', type: 'success' as const }
    ];

    const intervalId = setInterval(() => {
      const template = templates[Math.floor(Math.random() * templates.length)];
      setLogs(prev => [...prev.slice(-49), {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        message: template.message,
        type: template.type
      }]);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isLive]);

  const getColor = (type: string) => {
    switch (type) {
      case 'info': return isLight ? 'text-blue-600' : 'text-blue-400';
      case 'warning': return isLight ? 'text-amber-600' : 'text-amber-400';
      case 'error': return isLight ? 'text-red-600' : 'text-red-400';
      case 'success': return isLight ? 'text-emerald-600' : 'text-emerald-400';
      default: return isLight ? 'text-zinc-600' : 'text-zinc-400';
    }
  };

  return (
    <div className={`p-6 rounded-[32px] border flex flex-col h-[320px] transition-all duration-500 ${
      isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-depth-nebula border-white/5'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
        <div className="flex items-center gap-2">
          <Terminal className={`w-4 h-4 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`} />
          <h3 className={`text-xs font-mono font-bold tracking-widest uppercase ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>System Log</h3>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-zinc-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`p-1.5 rounded-lg border transition-all ${isLight ? 'border-zinc-200 text-zinc-600 hover:bg-zinc-100' : 'border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
            title={isLive ? "Pause Feed" : "Resume Feed"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLive ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setLogs([])}
            className={`p-1.5 rounded-lg border transition-all ${isLight ? 'border-zinc-200 text-zinc-600 hover:bg-zinc-100' : 'border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
            title="Clear Logs"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 p-2 rounded-xl transition-all border ${
                isLight 
                  ? 'bg-gray-50/50 border-gray-100 hover:border-gray-200 hover:bg-gray-50' 
                  : 'bg-white/[0.01] border-white/[0.02] hover:border-white/5 hover:bg-white/[0.02]'
              } font-mono text-[11px] leading-relaxed`}
            >
              <span className={`shrink-0 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                [{log.timestamp}]
              </span>
              <span className={`shrink-0 w-16 uppercase font-bold tracking-wider ${getColor(log.type)}`}>
                {log.type}
              </span>
              <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {logs.length === 0 && (
          <div className={`h-full flex items-center justify-center text-[10px] font-mono uppercase tracking-widest ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Buffer empty
          </div>
        )}
      </div>
    </div>
  );
}
