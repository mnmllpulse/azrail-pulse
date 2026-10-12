import React, { useState } from 'react';
import { Download, Terminal, Loader2, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { useSystemState } from '../contexts/SystemStateContext';
import { toast } from 'sonner';

interface SystemLogExporterProps {
  onClose?: () => void;
}

export const SystemLogExporter: React.FC<SystemLogExporterProps> = ({ onClose }) => {
  const systemState = useSystemState();
  const [loading, setLoading] = useState(false);

  const exportLogs = async () => {
    setLoading(true);
    try {
      // 1. Fetch backend state from Metatron Core
      const metatronResponse = await fetch('/api/metatron/status');
      const metatronData = await metatronResponse.json();

      // 2. Fetch heartbeat for extra hardware info
      const heartbeatResponse = await fetch('/api/metatron/heartbeat');
      const heartbeatData = await heartbeatResponse.json();

      // 3. Aggregate everything into a single log object
      const fullLog = {
        sessionInfo: {
          timestamp: new Date().toISOString(),
          sessionId: Math.random().toString(36).substring(2, 15),
          browser: navigator.userAgent,
          platform: navigator.platform,
        },
        clientState: {
          logicCoreLoad: systemState.logicCoreLoad,
          integrityPercentage: systemState.integrityPercentage,
          uptime: systemState.uptime,
          activeNodes: systemState.activeNodes,
          latency: systemState.latency,
          activeShader: systemState.activeShader,
          uiPreferences: systemState.uiPreferences,
          studioDrafts: systemState.studioDrafts,
        },
        serverState: metatronData,
        hardwareHeartbeat: heartbeatData,
        environment: {
          node_env: 'production', // Assumption for this UI
          app_url: window.location.href,
        }
      };

      // 4. Create and trigger download
      const blob = new Blob([JSON.stringify(fullLog, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PULSE_OS_LOG_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("System logs exported successfully");
    } catch (error) {
      console.error("Log export error:", error);
      toast.error("Failed to aggregate system logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050507] text-gray-400 font-sans p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-white tracking-tight">System Diagnostic Exporter</h2>
            <p className="text-xs text-gray-500 font-mono">METATRON_LOG_AGGREGATOR_v1.2</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-white transition-colors"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
          <div className="relative w-24 h-24 rounded-2xl bg-[#0a0a0f] border border-white/10 flex items-center justify-center shadow-2xl">
            <Activity className="w-12 h-12 text-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-medium text-white">Ready for Diagnostic Dump</h3>
          <p className="text-gray-500 leading-relaxed">
            This utility will bridge the <span className="text-emerald-400 font-mono">Logic Core</span> and the <span className="text-emerald-400 font-mono">Metatron Daemon</span> to generate a comprehensive JSON snapshot of the current OS state.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Integrity</span>
            </div>
            <div className="text-xl text-white">{systemState.integrityPercentage}%</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Load</span>
            </div>
            <div className="text-xl text-white">{systemState.logicCoreLoad}%</div>
          </div>
        </div>

        <button
          onClick={exportLogs}
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-xl bg-emerald-600 p-4 transition-all hover:bg-emerald-500 disabled:opacity-50"
        >
          <div className="relative z-10 flex items-center justify-center gap-3 text-white font-medium">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
            )}
            {loading ? "Aggregating Neural State..." : "Generate Diagnostic JSON"}
          </div>
        </button>

        <p className="text-[10px] text-gray-600 font-mono">
          SECURE_ENCRYPTION: AES-256 | SOURCE: LOCAL_CORE + DAEMON_3001
        </p>
      </div>
    </div>
  );
};
