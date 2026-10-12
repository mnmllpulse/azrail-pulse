import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Zap, 
  RefreshCw, 
  Trash2, 
  Play, 
  Pause, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  Info,
  Sliders,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { useSystemState } from '../contexts/SystemStateContext';

interface TelemetryEvent {
  id: string;
  timestamp: string;
  source: 'COPRO_A' | 'COPRO_B' | 'ORBITAL_MESH' | 'DATABASE_PIPE' | 'SECURITY_VAULT';
  message: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
}

const TEMPLATES: Omit<TelemetryEvent, 'id' | 'timestamp'>[] = [
  { source: 'ORBITAL_MESH', message: 'Azrail connection parity optimized successfully across active nodes', severity: 'SUCCESS' },
  { source: 'COPRO_A', message: 'Thread block allocations synchronized with logic cores', severity: 'INFO' },
  { source: 'DATABASE_PIPE', message: 'Write buffer synchronized: 24 transaction streams committed', severity: 'SUCCESS' },
  { source: 'SECURITY_VAULT', message: 'Entropy pool recalibration triggered: security tokens rotated', severity: 'INFO' },
  { source: 'COPRO_B', message: 'Instruction caching failure bypassed: retry completed in 4ms', severity: 'WARNING' },
  { source: 'ORBITAL_MESH', message: 'Telemetry handshake latency warning: delay exceeded 240ms', severity: 'WARNING' },
  { source: 'DATABASE_PIPE', message: 'Connection deadlock avoided via secondary index mapping', severity: 'SUCCESS' },
  { source: 'ORBITAL_MESH', message: 'CRITICAL: Edge node [N-49] disconnected unexpectedly', severity: 'CRITICAL' },
  { source: 'SECURITY_VAULT', message: 'CRITICAL: Multiple handshake attempts failed from untrusted agent', severity: 'CRITICAL' },
  { source: 'COPRO_A', message: 'Co-processor cluster thermal capacity warning: temperature at 78°C', severity: 'WARNING' },
  { source: 'ORBITAL_MESH', message: 'New orbital symmetry mesh initialized for parallel routing', severity: 'INFO' },
  { source: 'DATABASE_PIPE', message: 'Database memory pooling optimized: 850MB heap recovered', severity: 'SUCCESS' },
];

const INITIAL_LOGS: TelemetryEvent[] = [
  { id: 't1', timestamp: '11:49:10', source: 'ORBITAL_MESH', message: 'Azrail Memory Core successfully mounted on telemetry stack', severity: 'SUCCESS' },
  { id: 't2', timestamp: '11:49:15', source: 'SECURITY_VAULT', message: 'Secure communications tunnel established with client node', severity: 'SUCCESS' },
  { id: 't3', timestamp: '11:49:22', source: 'COPRO_A', message: 'Calibration run completed: 0.002% jitter detected', severity: 'INFO' },
  { id: 't4', timestamp: '11:49:30', source: 'DATABASE_PIPE', message: 'Connection established to primary database node group', severity: 'INFO' },
];

export const SystemTelemetryLog: React.FC<{ isLight: boolean }> = ({ isLight }) => {
  const { systemActivity, latency, activeNodes } = useSystemState();
  const [logs, setLogs] = useState<TelemetryEvent[]>(INITIAL_LOGS);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<TelemetryEvent['severity'] | 'ALL'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<TelemetryEvent['source'] | 'ALL'>('ALL');
  const logFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLive) return;

    // Adjust logging rate based on system activity
    const intervalTime = Math.max(1500, 5000 - systemActivity * 4000);

    const interval = setInterval(() => {
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      const randomTemplate = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      
      const newLog: TelemetryEvent = {
        id: `telemetry-${Math.random().toString(36).substring(2, 9)}`,
        timestamp,
        ...randomTemplate
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 99)]); // Keep up to 100 logs
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isLive, systemActivity]);

  // Handle manual mock event triggers
  const triggerManualEvent = (severity: TelemetryEvent['severity']) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    let message = '';
    let source: TelemetryEvent['source'] = 'COPRO_A';

    switch (severity) {
      case 'CRITICAL':
        message = 'CRITICAL: Primary memory partition overload! Manual failover recommended.';
        source = 'SECURITY_VAULT';
        break;
      case 'WARNING':
        message = 'WARNING: Unusually high logic latency detected on database pipe.';
        source = 'DATABASE_PIPE';
        break;
      case 'SUCCESS':
        message = 'SUCCESS: Orbital telemetry sync achieved with all grid processors.';
        source = 'ORBITAL_MESH';
        break;
      case 'INFO':
        message = 'INFO: Routine system audit completed. All variables within spec.';
        source = 'COPRO_B';
        break;
    }

    const newLog: TelemetryEvent = {
      id: `manual-${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      source,
      message,
      severity
    };

    setLogs((prev) => [newLog, ...prev]);
  };

  const getSeverityStyles = (severity: TelemetryEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30',
          text: 'text-rose-400',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'SUCCESS':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'INFO':
      default:
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30',
          text: 'text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
          icon: <Info className="w-3.5 h-3.5 text-indigo-400" />
        };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSeverity = filter === 'ALL' || log.severity === filter;
    const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;
    return matchesSeverity && matchesSource;
  });

  return (
    <div className={`p-8 rounded-[32px] border flex flex-col h-[480px] transition-all duration-500 ${
      isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-depth-nebula border-white/5 shadow-2xl'
    }`} id="system-telemetry-log">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pulse-primary/10 rounded-lg">
            <Terminal className="w-5 h-5 text-pulse-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-mono tracking-[0.3em] uppercase font-bold text-white">System Telemetry Log</h2>
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Azrail Memory Core activity pipeline</span>
          </div>
          <span className="relative flex h-2.5 w-2.5 ml-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-pulse-accent' : 'bg-gray-500'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-pulse-accent' : 'bg-gray-600'}`} />
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Pause / Resume */}
          <button 
            onClick={() => setIsLive(!isLive)}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-white"
          >
            {isLive ? (
              <>
                <Pause className="w-3 h-3 text-pulse-accent animate-pulse" />
                <span>Streaming</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-white/40" />
                <span>Paused</span>
              </>
            )}
          </button>

          {/* Event simulation buttons */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <span className="text-[9px] font-mono font-bold text-white/40 px-2 uppercase tracking-tight">Test Log:</span>
            <button 
              onClick={() => triggerManualEvent('SUCCESS')}
              className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/20 transition-all"
            >
              OK
            </button>
            <button 
              onClick={() => triggerManualEvent('INFO')}
              className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[9px] font-mono font-bold border border-indigo-500/20 transition-all"
            >
              INFO
            </button>
            <button 
              onClick={() => triggerManualEvent('WARNING')}
              className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-mono font-bold border border-amber-500/20 transition-all"
            >
              WARN
            </button>
            <button 
              onClick={() => triggerManualEvent('CRITICAL')}
              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-mono font-bold border border-rose-500/20 transition-all"
            >
              CRIT
            </button>
          </div>

          {/* Clear Logs */}
          <button 
            onClick={() => setLogs([])}
            className="p-1.5 rounded-lg border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all text-white/50 hover:text-rose-400"
            title="Clear all telemetry lines"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Filters:</span>
          
          <div className="flex gap-1.5 ml-2">
            {(['ALL', 'INFO', 'SUCCESS', 'WARNING', 'CRITICAL'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`px-2.5 py-1 rounded-md font-mono text-[9px] font-bold tracking-tight transition-all ${
                  filter === lvl 
                    ? 'bg-pulse-primary text-white shadow-md shadow-pulse-primary/20' 
                    : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Source:</span>
          <select 
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-depth-void border border-white/10 text-white/80 rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold outline-none cursor-pointer focus:border-pulse-primary"
          >
            <option value="ALL">ALL SOURCES</option>
            <option value="COPRO_A">CO-PROCESSOR A</option>
            <option value="COPRO_B">CO-PROCESSOR B</option>
            <option value="ORBITAL_MESH">ORBITAL MESH</option>
            <option value="DATABASE_PIPE">DATABASE PIPE</option>
            <option value="SECURITY_VAULT">SECURITY VAULT</option>
          </select>
        </div>
      </div>

      {/* Logs Feed Scroller */}
      <div 
        ref={logFeedRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 pr-2 hide-scrollbar"
      >
        <AnimatePresence initial={false}>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-white/20">
              <Activity className="w-8 h-8 animate-pulse text-white/10" />
              <span className="text-xs uppercase tracking-widest font-bold">No active telemetry matches filter</span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const styles = getSeverityStyles(log.severity);
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.18 }}
                  className={`group flex items-start gap-4 p-2.5 rounded-xl border transition-all ${styles.bg} ${
                    isLight 
                      ? 'hover:bg-white hover:shadow-sm' 
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Timestamp & Source badge */}
                  <div className="flex items-center gap-2 shrink-0 select-none">
                    <span className="text-[10px] text-white/30 font-bold">[{log.timestamp}]</span>
                    <span className="text-[9px] bg-white/5 border border-white/5 text-white/50 px-1.5 py-0.5 rounded font-bold">
                      {log.source}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="shrink-0 pt-0.5">
                    {styles.icon}
                  </div>

                  {/* Log message */}
                  <div className={`flex-1 leading-relaxed break-all ${isLight ? 'text-gray-800' : 'text-slate-200'}`}>
                    {log.message}
                  </div>

                  {/* Severity Badge */}
                  <div className={`shrink-0 text-[8px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md border ${styles.badge} select-none`}>
                    {log.severity}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Mini Stats Banner */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/30 uppercase tracking-wider">
        <div className="flex items-center gap-4">
          <span>Active Nodes: <strong className="text-pulse-accent">{activeNodes}</strong></span>
          <span>Latency Target: <strong className="text-white/60">{latency}ms</strong></span>
        </div>
        <div>
          <span>Filtered Events: <strong className="text-white/50">{filteredLogs.length}</strong></span>
        </div>
      </div>
    </div>
  );
};
