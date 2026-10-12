import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { kernel, DNAProfile, StyleBias } from '../core/PulseKernel';
import { ConfigService } from '../services/ConfigService';
import { useSession } from './SessionContext';

export type BgShaderId = 'cosmic-pulse' | 'quantum-aurora' | 'cyber-pulse' | 'monochrome' | 'solar-eclipse';

interface UIPreferences {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  pulsePrimary: string;
  pulseAccent: string;
  crtEffect: boolean;
  simplicityMode: boolean;
  ttsEnabled: boolean;
  focusMode: boolean;
}

interface StudioDrafts {
  [key: string]: any;
}

interface SystemConfig {
  azrailCoreSensitivity: number;
  cloudLocalRatio: number;
  swarmPriority: number;
  securityAlertLevel: number;
  p2pSyncStatus: number;
  globalNodesOnline: number;
}

interface SystemState {
  logicCoreLoad: number;
  integrityPercentage: number;
  uptime: string;
  activeNodes: number;
  latency: number;
  systemActivity: number;
  pulseFrequency: number;
  isDiagnosticActive: boolean;
  isPulseActive: boolean;
  activeShader: BgShaderId;
  uiPreferences: UIPreferences;
  studioDrafts: StudioDrafts;
  isDashboardEditMode: boolean;
  creativeDNAProfile: DNAProfile;
  activeAIModelId: string | null;
  isAdmin: boolean;
  systemConfig: SystemConfig;
}

interface SystemStateContextProps extends SystemState {
  setLogicCoreLoad: (load: number) => void;
  setIntegrityPercentage: (integrity: number) => void;
  setActiveNodes: (nodes: number) => void;
  setLatency: (lat: number) => void;
  triggerDiagnostics: () => void;
  triggerPulseWave: () => void;
  setActiveShader: (shader: BgShaderId) => void;
  setUIPreferences: (prefs: UIPreferences) => void;
  setStudioDraft: (key: string, draft: any) => void;
  exportSystemLogs: () => Promise<void>;
  setIsDashboardEditMode: (mode: boolean) => void;
  setActiveAIModelId: (id: string | null) => void;
  sequenceDNA: () => void;
  setCreativeDNAStyle: (style: StyleBias) => void;
  setCreativeDNAPlaylist: (playlistId: string) => void;
  setSystemConfig: (config: SystemConfig) => void;
  preloadedStudios: Set<string>;
  preloadStudio: (studioId: string) => void;
  hoverPreload: (studioId: string) => void;
}

const SystemStateContext = createContext<SystemStateContextProps | undefined>(undefined);

export const SystemStateProvider = ({ children }: { children: ReactNode }) => {
  // Base states
  const [logicCoreLoad, setLogicCoreLoadState] = useState<number>(42);
  const [integrityPercentage, setIntegrityPercentageState] = useState<number>(98.4);
  const [activeNodes, setActiveNodes] = useState<number>(12);
  const [latency, setLatency] = useState<number>(12);
  const [uptime, setUptime] = useState<string>('00:00:00');
  const [creativeDNAProfile, setCreativeDNAProfile] = useState<DNAProfile>(kernel.creativeDNA.getProfile());
  const [systemConfig, setSystemConfigState] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem('system_config');
      return saved ? JSON.parse(saved) : {
        azrailCoreSensitivity: 20,
        cloudLocalRatio: 10,
        swarmPriority: 10,
        securityAlertLevel: 2,
        p2pSyncStatus: 98,
        globalNodesOnline: 56
      };
    } catch (e) {
      return {
        azrailCoreSensitivity: 20,
        cloudLocalRatio: 10,
        swarmPriority: 10,
        securityAlertLevel: 2,
        p2pSyncStatus: 98,
        globalNodesOnline: 56
      };
    }
  });

  const setSystemConfig = (config: SystemConfig) => {
    setSystemConfigState(config);
    localStorage.setItem('system_config', JSON.stringify(config));
  };
  
  const [activeShader, setActiveShaderState] = useState<BgShaderId>(() => {
    const saved = localStorage.getItem('system_bg_shader');
    return (saved as BgShaderId) || 'cosmic-pulse';
  });

  const [uiPreferences, setUIPreferencesState] = useState<UIPreferences>(() => {
    try {
      const saved = localStorage.getItem('ui_preferences');
      const prefs = saved ? JSON.parse(saved) : { 
        theme: 'dark', 
        sidebarCollapsed: false,
        pulsePrimary: '#7B4DFF',
        pulseAccent: '#B388FF',
        crtEffect: false,
        simplicityMode: false,
        ttsEnabled: false,
        focusMode: false
      };
      
      // Ensure defaults if missing
      if (!prefs.pulsePrimary) prefs.pulsePrimary = '#7B4DFF';
      if (!prefs.pulseAccent) prefs.pulseAccent = '#B388FF';
      if (prefs.crtEffect === undefined) prefs.crtEffect = false;
      if (prefs.simplicityMode === undefined) prefs.simplicityMode = false;
      if (prefs.ttsEnabled === undefined) prefs.ttsEnabled = false;
      if (prefs.focusMode === undefined) prefs.focusMode = false;

      // Ensure dark theme is restored by default
      if (prefs.theme === 'light') {
        prefs.theme = 'dark';
      }
      return prefs as UIPreferences;
    } catch (e) {
      console.error('Failed to parse UI preferences', e);
      return { 
        theme: 'dark', 
        sidebarCollapsed: false, 
        pulsePrimary: '#7B4DFF', 
        pulseAccent: '#B388FF', 
        crtEffect: false,
        simplicityMode: false,
        ttsEnabled: false,
        focusMode: false
      } as UIPreferences;
    }
  });

  const [studioDrafts, setStudioDraftsState] = useState<StudioDrafts>(() => {
    try {
      const saved = localStorage.getItem('studio_drafts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to parse studio drafts', e);
      return {};
    }
  });

  const [isDashboardEditMode, setIsDashboardEditMode] = useState(false);
  const [activeAIModelId, setActiveAIModelIdState] = useState<string | null>(() => {
    return localStorage.getItem('active_ai_model_id');
  });

  const setActiveAIModelId = (id: string | null) => {
    setActiveAIModelIdState(id);
    if (id) {
      localStorage.setItem('active_ai_model_id', id);
    } else {
      localStorage.removeItem('active_ai_model_id');
    }
  };

  const { user } = useSession();
  const isAdmin = user?.role === 'owner';

  const setActiveShader = (shader: BgShaderId) => {
    setActiveShaderState(shader);
    localStorage.setItem('system_bg_shader', shader);
  };

  const setUIPreferences = (prefs: UIPreferences) => {
    setUIPreferencesState(prefs);
    localStorage.setItem('ui_preferences', JSON.stringify(prefs));
  };

  const setStudioDraft = (key: string, draft: any) => {
    setStudioDraftsState(prev => {
      const next = { ...prev, [key]: draft };
      localStorage.setItem('studio_drafts', JSON.stringify(next));
      return next;
    });
  };

  const sequenceDNA = () => {
    const newProfile = kernel.creativeDNA.sequence();
    setCreativeDNAProfile({ ...newProfile });
  };

  const setCreativeDNAStyle = (style: StyleBias) => {
    const newProfile = kernel.creativeDNA.setStyle(style);
    setCreativeDNAProfile({ ...newProfile });
  };

  const setCreativeDNAPlaylist = (playlistId: string) => {
    const newProfile = kernel.creativeDNA.setPlaylist(playlistId);
    setCreativeDNAProfile({ ...newProfile });
  };
  
  // Animation/Trigger status
  const [isDiagnosticActive, setIsDiagnosticActive] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const [systemActivity, setSystemActivity] = useState(0.4);
  const [pulseFrequency, setPulseFrequency] = useState(1.0);

  // Sync activity with core load
  useEffect(() => {
    const activity = (logicCoreLoad / 100 + activeNodes / 50) / 2;
    setSystemActivity(Math.min(1, Math.max(0, activity)));
    setPulseFrequency(0.5 + activity * 1.5);
  }, [logicCoreLoad, activeNodes]);

  // Apply custom pulse colors to document root
  useEffect(() => {
    document.documentElement.style.setProperty('--pulse-primary', uiPreferences.pulsePrimary);
    document.documentElement.style.setProperty('--pulse-accent', uiPreferences.pulseAccent);
    
    // Derived deeper color for gradients
    const deepColor = `${uiPreferences.pulsePrimary}CC`; // 80% opacity for simulated depth
    document.documentElement.style.setProperty('--pulse-deep', deepColor);
  }, [uiPreferences.pulsePrimary, uiPreferences.pulseAccent]);

  // Uptime calculator
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const diffMs = Date.now() - startTime;
      const hours = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
      setUptime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Natural live background telemetry oscillation
  useEffect(() => {
    // If an action is overriding, don't run basic drift
    if (isDiagnosticActive || isPulseActive) return;

    const interval = setInterval(() => {
      setLogicCoreLoadState((prev) => {
        // Drift around 35-50%
        const change = (Math.random() - 0.5) * 4; // +/- 2%
        let next = prev + change;
        if (next < 32) next = 32 + Math.random() * 2;
        if (next > 55) next = 55 - Math.random() * 2;
        return parseFloat(next.toFixed(1));
      });

      setIntegrityPercentageState((prev) => {
        // High stability drift
        const change = (Math.random() - 0.5) * 0.15; // +/- 0.07%
        let next = prev + change;
        if (next < 97.5) next = 97.5 + Math.random() * 0.2;
        if (next > 99.5) next = 99.5 - Math.random() * 0.1;
        return parseFloat(next.toFixed(2));
      });

      setLatency((prev) => {
        // Minor latency jumps
        const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        let next = prev + change;
        if (next < 8) next = 8;
        if (next > 16) next = 16;
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isDiagnosticActive, isPulseActive]);

  // Setters wrapped to prevent conflict during animations
  const setLogicCoreLoad = (load: number) => {
    if (!isDiagnosticActive && !isPulseActive) {
      setLogicCoreLoadState(Math.min(100, Math.max(0, load)));
    }
  };

  const setIntegrityPercentage = (integrity: number) => {
    if (!isDiagnosticActive && !isPulseActive) {
      setIntegrityPercentageState(Math.min(100, Math.max(0, integrity)));
    }
  };

  // High-Energy Pulse Wave sequence
  const triggerPulseWave = () => {
    if (isPulseActive || isDiagnosticActive) return;
    setIsPulseActive(true);

    // Timeline for the pulse wave:
    // 0ms: Spikes core load immediately to 96%, drops integrity slightly due to power surge, spikes latency.
    setLogicCoreLoadState(96.4);
    setIntegrityPercentageState((prev) => parseFloat(Math.max(92, prev - 3).toFixed(2)));
    setLatency(48);

    // 800ms: Starts cooling down, integrity begins self-healing
    setTimeout(() => {
      setLogicCoreLoadState(72.1);
      setIntegrityPercentageState((prev) => parseFloat(Math.min(99, prev + 1.5).toFixed(2)));
      setLatency(24);
    }, 800);

    // 1600ms: Resolving, latency goes back, core load drops
    setTimeout(() => {
      setLogicCoreLoadState(51.3);
      setIntegrityPercentageState((prev) => parseFloat(Math.min(98.8, prev + 1).toFixed(2)));
      setLatency(14);
    }, 1600);

    // 2500ms: Fully settled back to normal
    setTimeout(() => {
      setIsPulseActive(false);
    }, 2500);
  };

  // Diagnostic sequence triggers a systematic system self-repair
  const triggerDiagnostics = () => {
    if (isDiagnosticActive || isPulseActive) return;
    setIsDiagnosticActive(true);

    // Step 1: Initializing scan, load rises
    setLogicCoreLoadState(58.0);
    setLatency(19);

    // Step 2: High capacity profiling (800ms)
    setTimeout(() => {
      setLogicCoreLoadState(84.7);
      setLatency(31);
    }, 800);

    // Step 3: Resolving registry checks and self-repairing integrity (1800ms)
    setTimeout(() => {
      setLogicCoreLoadState(45.2);
      setIntegrityPercentageState(99.9); // Rebuild to perfection!
      setLatency(9);
    }, 1800);

    // Step 4: Fully restored and settled (2800ms)
    setTimeout(() => {
      setLogicCoreLoadState(35.5);
      setIsDiagnosticActive(false);
    }, 2800);
  };

  // Export System Logs implementation
  const exportSystemLogs = async () => {
    try {
      // 1. Collect Frontend State
      const frontendState = {
        timestamp: new Date().toISOString(),
        ui: {
          activeShader,
          uiPreferences,
          logicCoreLoad,
          integrityPercentage,
          uptime,
          activeNodes,
          latency,
        },
        drafts: studioDrafts,
        session: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screen: `${window.innerWidth}x${window.innerHeight}`,
        }
      };

      // 2. Attempt to Collect Backend State (Metatron)
      let metatronState = { status: 'OFFLINE', error: null };
      try {
        const response = await fetch('/api/metatron/status');
        if (response.ok) {
          metatronState = await response.json();
        } else {
          metatronState = { status: 'ERROR', error: response.statusText } as any;
        }
      } catch (e: any) {
        metatronState = { status: 'UNREACHABLE', error: e.message } as any;
      }

      // 3. Aggregate Logs
      const fullLogs = {
        metadata: {
          appName: "DARK MNMLL PULSE OS",
          logId: `sys-log-${Date.now()}`,
          exportTime: new Date().toISOString()
        },
        frontend: frontendState,
        backend: metatronState,
      };

      // 4. Trigger Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullLogs, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", `mnmll_pulse_logs_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to export logs:", error);
      return Promise.reject(error);
    }
  };

  // Predictive Preload Engine
  const [preloadedStudios, setPreloadedStudios] = useState<Set<string>>(new Set(['code', 'web']));

  const preloadStudio = (studioId: string) => {
    if (!studioId) return;
    const cleanId = studioId.toLowerCase().replace('/studio/', '').trim();
    if (preloadedStudios.has(cleanId)) return;

    setPreloadedStudios(prev => new Set([...prev, cleanId]));

    // Perform background data pre-fetching/hydration simulate
    try {
      if (cleanId === 'code') {
        import('../pages/studios/CodeStudioPanel');
      } else if (cleanId === 'web') {
        import('../pages/studios/WebStudioPanel');
      } else if (cleanId === 'data') {
        import('../pages/studios/DataStudioPanel');
      } else if (cleanId === 'audio' || cleanId === 'music') {
        import('../pages/studios/MusicStudioPanel');
      }
    } catch (e) {
      // Ignore background preload errors
    }
  };

  const hoverPreload = (studioId: string) => {
    preloadStudio(studioId);
  };

  return (
    <SystemStateContext.Provider
      value={{
        logicCoreLoad,
        integrityPercentage,
        uptime,
        activeNodes,
        latency,
        systemActivity,
        pulseFrequency,
        isDiagnosticActive,
        isPulseActive,
        activeShader,
        uiPreferences,
        studioDrafts,
        isDashboardEditMode,
        creativeDNAProfile,
        activeAIModelId,
        isAdmin,
        systemConfig,
        setLogicCoreLoad,
        setIntegrityPercentage,
        setActiveNodes,
        setLatency,
        triggerDiagnostics,
        triggerPulseWave,
        setActiveShader,
        setUIPreferences,
        setStudioDraft,
        exportSystemLogs,
        setIsDashboardEditMode,
        setActiveAIModelId,
        sequenceDNA,
        setCreativeDNAStyle,
        setCreativeDNAPlaylist,
        setSystemConfig,
        preloadedStudios,
        preloadStudio,
        hoverPreload,
      }}
    >
      {children}
    </SystemStateContext.Provider>
  );
};

export const useSystemState = () => {
  const context = useContext(SystemStateContext);
  if (!context) {
    throw new Error('useSystemState must be used within a SystemStateProvider');
  }
  return context;
};
