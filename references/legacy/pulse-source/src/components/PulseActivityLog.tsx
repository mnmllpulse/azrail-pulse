import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  ShieldCheck, 
  CreditCard, 
  RefreshCw, 
  CheckCircle, 
  Info, 
  AlertTriangle 
} from 'lucide-react';

interface LogEvent {
  id: string;
  timestamp: string;
  category: 'System' | 'Auth' | 'Payment';
  message: string;
  status: 'info' | 'success' | 'warning';
}

const INITIAL_LOGS: LogEvent[] = [
  { id: '1', timestamp: '12:44:02', category: 'System', message: 'Core neural co-processors calibrated at 99.4% stability', status: 'success' },
  { id: '2', timestamp: '12:44:15', category: 'Auth', message: 'OAuth security token signature verified and cached', status: 'info' },
  { id: '3', timestamp: '12:44:38', category: 'Payment', message: 'Stripe API initialized with secure credentials', status: 'success' },
  { id: '4', timestamp: '12:45:10', category: 'System', message: 'Dynamic PlanetCanvas rendering shader initialized on main thread', status: 'info' },
  { id: '5', timestamp: '12:45:55', category: 'Payment', message: 'Webhooks verification setup completed with Stripe signature key', status: 'info' }
];

const TEMPLATES: Omit<LogEvent, 'id' | 'timestamp'>[] = [
  { category: 'System', message: 'Heartbeat signal broadcasted to 12 active edge nodes', status: 'info' },
  { category: 'System', message: 'Memory buffer flushed, recovered 142MB heap allocations', status: 'success' },
  { category: 'Auth', message: 'User session signature validated successfully', status: 'success' },
  { category: 'Auth', message: 'CSRF token rotation completed on request pipe', status: 'info' },
  { category: 'Payment', message: 'Stripe Webhook processed: customer.subscription.updated', status: 'success' },
  { category: 'Payment', message: 'Invoice charge processed via encrypted vault routing', status: 'success' },
  { category: 'System', message: 'Latency spike detected: auto-balanced query node cluster', status: 'warning' },
  { category: 'System', message: 'Neural load threshold reached 55%, auto-routing priority tier', status: 'info' },
];

export default function PulseActivityLog({ isLight }: { isLight: boolean }) {
  const [logs, setLogs] = useState<LogEvent[]>(INITIAL_LOGS);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      const randomTemplate = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      
      const newLog: LogEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp,
        ...randomTemplate
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Keep up to 50 logs
    }, 4500);

    return () => clearInterval(interval);
  }, [isLive]);

  const getIcon = (category: 'System' | 'Auth' | 'Payment') => {
    switch (category) {
      case 'System':
        return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Auth':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Payment':
        return <CreditCard className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  const getStatusColor = (status: 'info' | 'success' | 'warning', isLight: boolean) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
      default:
        return isLight ? 'text-indigo-600' : 'text-indigo-300';
    }
  };

  return (
    <div className={`p-6 rounded-[32px] border flex flex-col h-[320px] transition-all duration-500 ${
      isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-depth-nebula border-white/5'
    }`} id="pulse-activity-log">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className={`w-4 h-4 ${isLight ? 'text-gray-900' : 'text-pulse-accent'}`} />
          <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${isLight ? 'text-gray-900' : 'text-white'}`}>
            PULSE ACTIVITY LOG
          </h3>
          <span className="relative flex h-2 w-2 ml-1">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLogs([])}
            className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded border transition-all ${
              isLight 
                ? 'border-gray-200 hover:bg-gray-100 text-gray-500' 
                : 'border-white/5 hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            Clear
          </button>
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded border transition-all flex items-center gap-1.5 ${
              isLight 
                ? 'border-gray-200 hover:bg-gray-100 text-gray-500' 
                : 'border-white/5 hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLive ? 'animate-spin' : ''}`} />
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2.5 pr-2 hide-scrollbar">
        {logs.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-2 ${isLight ? 'text-gray-400' : 'text-white/20'}`}>
            <Info className="w-6 h-6" />
            <span>ACTIVITY STREAM VOID</span>
          </div>
        ) : (
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
                }`}
              >
                <span className={`text-[10px] select-none ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                  [{log.timestamp}]
                </span>
                <span className={`flex items-center gap-1.5 font-bold shrink-0 ${
                  isLight ? 'bg-gray-200/60 text-gray-700' : 'bg-white/5 text-white/60'
                } px-1.5 py-0.5 rounded text-[9px] select-none`}>
                  {getIcon(log.category)}
                  <span>{log.category}</span>
                </span>
                <span className={`leading-relaxed flex-1 ${
                  isLight ? 'text-gray-700' : 'text-[#E0E0E0]'
                }`}>
                  {log.message}
                </span>
                <span className={`text-[9px] font-bold ${getStatusColor(log.status, isLight)} uppercase ml-2`}>
                  {log.status}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
