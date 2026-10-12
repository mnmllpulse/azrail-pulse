import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { 
  ArrowLeft,
  Sparkles,
  Zap,
  Layout,
  Save,
  Cpu,
  MoreVertical,
  Play,
  Music,
  Sliders,
  Network,
  Layers,
  Box,
  Image as ImageIcon,
  Folder
} from 'lucide-react';
const CodeStudioPanel = lazy(() => import('./studios/CodeStudioPanel'));
const KnowledgeHubPanel = lazy(() => import('./studios/KnowledgeHubPanel'));
const WebStudioPanel = lazy(() => import('./studios/WebStudioPanel'));
const AgentForgePanel = lazy(() => import('./studios/AgentForgePanel'));
const SwarmConfigurationPanel = lazy(() => import('./studios/SwarmConfigurationPanel'));
const AgentConfigurationPanel = lazy(() => import('../components/AgentConfigurationPanel'));
const ImageStudioPanel = lazy(() => import('./studios/ImageStudioPanel'));
const VideoStudioPanel = lazy(() => import('./studios/VideoStudioPanel'));
const MusicStudioPanel = lazy(() => import('./studios/MusicStudioPanel'));
const PulseLabPanel = lazy(() => import('./studios/PulseLabPanel'));
const BotManagerPanel = lazy(() => import('./studios/BotManagerPanel'));
const BillingStudioPanel = lazy(() => import('./studios/BillingStudioPanel'));
const DataStudioPanel = lazy(() => import('./studios/DataStudioPanel'));
const ModelStudioPanel = lazy(() => import('./studios/ModelStudioPanel'));
const AutomationStudioPanel = lazy(() => import('./studios/AutomationStudioPanel'));
const AnalyticsStudioPanel = lazy(() => import('./studios/AnalyticsStudioPanel'));
const DeployStudioPanel = lazy(() => import('./studios/DeployStudioPanel'));
const SecurityStudioPanel = lazy(() => import('./studios/SecurityStudioPanel'));
const MarketplaceStudioPanel = lazy(() => import('./studios/MarketplaceStudioPanel'));
const SandboxStudioPanel = lazy(() => import('./studios/SandboxStudioPanel'));
import StudioTerminal from '../components/studios/StudioTerminal';
import { StudioAIChat } from '../components/studios/StudioAIChat';
import GalleryModal from '../components/GalleryModal';
import WorkspaceTemplatesModal from '../components/WorkspaceTemplatesModal';
import ThorQuickAccess from '../components/ThorQuickAccess';
import { DragonStorm, DragonStormRef } from '../components/DragonStorm';
import { IntegrationDetailsModal } from '../components/IntegrationDetailsModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useModels } from '../contexts/ModelsContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { useGlobalMotion } from '../contexts/GlobalMotionContext';
import Tooltip from '../components/Tooltip';
import { StudioSkeleton } from '../components/Skeleton';
import { AIModel } from '../data/models';
import DisplayScalingEngine from '../components/DisplayScalingEngine';
import StudioHeader from '../components/common/StudioHeader';

interface AutosaveData {
  type: string;
  config: any;
  savedAt: string;
  isCloud?: boolean;
}

function GenericStudioPanel({ type, isLight }: { type: string, isLight: boolean }) {
  return (
    <div className={`w-full h-full flex items-center justify-center font-mono text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
      Studio Module not found: {type}
    </div>
  );
}

export default function Studio() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { isLight } = useOutletContext<{ isLight: boolean }>();
  const { t } = useLanguage();
  const { getVariants } = useGlobalMotion();
  const { triggerDiagnostics, triggerPulseWave } = useSystemState();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isThorOpen, setIsThorOpen] = useState(false);
  const stormRef = useRef<DragonStormRef>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Trigger loading skeleton on studio type change or initial mount
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [type]);

  const [activeIntegrationModel, setActiveIntegrationModel] = useState<AIModel | null>(null);
  const { connectedModels } = useModels();
  
  // Context-aware states
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [agentView, setAgentView] = useState<'forge' | 'swarm' | 'config'>('swarm');

  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [autosaveData, setAutosaveData] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveLocation, setSaveLocation] = useState<'local' | 'cloud' | null>(null);
  const [isSavingInProgress, setIsSavingInProgress] = useState(false);

  // Autosave interval trigger
  useEffect(() => {
    if (!type) return;

    // Trigger request-workspace-state every 15 seconds
    const interval = setInterval(() => {
      window.dispatchEvent(new CustomEvent('request-workspace-state'));
    }, 15000);

    return () => clearInterval(interval);
  }, [type]);

  // Listener for state response to save to LocalStorage and Firestore
  useEffect(() => {
    const handleAutosaveResponse = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || !customEvent.detail.type || customEvent.detail.type !== type) return;

      const { type: stateType, config } = customEvent.detail;

      // Filter out empty configurations
      const isEmpty = !config || (
        !config.prompt && 
        !config.bpm && 
        !config.sequences && 
        !config.result
      );
      if (isEmpty) return;

      setIsSavingInProgress(true);
      const timestamp = new Date();

      try {
        // 1. Save locally
        const localData = {
          type: stateType,
          config,
          savedAt: timestamp.toISOString()
        };
        localStorage.setItem(`studio_autosave_${stateType}`, JSON.stringify(localData));
        setSaveLocation('local');
        setLastSaved(timestamp);
      } catch (err) {
        console.warn('Autosave failed:', err);
      } finally {
        setIsSavingInProgress(false);
      }
    };

    window.addEventListener('response-workspace-state', handleAutosaveResponse);
    return () => window.removeEventListener('response-workspace-state', handleAutosaveResponse);
  }, [type]);

  // Check for existing autosave on page load
  useEffect(() => {
    if (!type) {
      setShowRestoreBanner(false);
      setAutosaveData(null);
      return;
    }

    const checkAutosaves = async () => {
      let latestAutosave: any = null;

      // 1. Check local storage
      const localSaved = localStorage.getItem(`studio_autosave_${type}`);
      if (localSaved) {
        try {
          latestAutosave = JSON.parse(localSaved);
        } catch (e) {
          console.error('Failed to parse local autosave', e);
        }
      }

      // Determine if the autosave has any content
      if (latestAutosave && latestAutosave.config && (
        latestAutosave.config.prompt || 
        latestAutosave.config.bpm || 
        latestAutosave.config.result ||
        latestAutosave.config.sequences
      )) {
        setAutosaveData(latestAutosave);
        setShowRestoreBanner(true);
      } else {
        setShowRestoreBanner(false);
      }
    };

    const timer = setTimeout(() => {
      checkAutosaves();
    }, 600);

    return () => clearTimeout(timer);
  }, [type]);

  useEffect(() => {
    const handleTriggerStorm = () => stormRef.current?.trigger();
    window.addEventListener('trigger-storm', handleTriggerStorm);
    return () => window.removeEventListener('trigger-storm', handleTriggerStorm);
  }, []);

  const handleRestore = () => {
    if (!autosaveData) return;
    
    window.dispatchEvent(new CustomEvent('trigger-storm'));
    const applyEvent = new CustomEvent('load-workspace-preset', {
      detail: {
        type: type,
        config: autosaveData.config
      }
    });
    window.dispatchEvent(applyEvent);
    toast("Unsaved draft restored successfully!");
    setShowRestoreBanner(false);
  };

  const handleDismiss = () => {
    setShowRestoreBanner(false);
  };

  const titleMap: Record<string, string> = {
    web: t('webStudio'),
    music: t('musicStudio'),
    video: t('videoStudio'),
    agent: t('agentStudio'),
    image: t('imageStudio'),
    lab: t('pulseLab'),
    code: t('codeStudio'),
    knowledge: t('knowledgeHub'),
    bots: 'Bot Manager',
    billing: 'Billing & Subscriptions',
    data: 'Data Studio',
    model: 'Model Studio',
    automation: 'Automation Studio',
    analytics: 'Analytics Studio',
    deploy: 'Deploy Studio',
    security: 'Security Center',
    marketplace: 'Marketplace'
  };

  // Listen to input focus changes globally inside the studio
  useEffect(() => {
    const handleFocus = () => {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.getAttribute('contenteditable') === 'true'
      )) {
        setIsInputFocused(true);
      } else {
        setIsInputFocused(false);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
    };
  }, []);

  if (isLoading) {
    return (
      <StudioSkeleton isLight={isLight} />
    );
  }

  return (
    <div className="flex flex-col h-auto gap-4 md:gap-6 px-4 md:px-6 lg:px-8 pb-20 md:pb-28 relative max-w-[1920px] mx-auto w-full">
      <DragonStorm ref={stormRef} />
      {/* Autosave Restore Banner */}
      <AnimatePresence>
        {showRestoreBanner && autosaveData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
              isLight 
                ? 'bg-indigo-50/80 border-indigo-100 text-indigo-950' 
                : 'bg-indigo-950/20 border-indigo-500/15 text-indigo-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider">Unsaved Progress Detected</h4>
                <p className="text-xs mt-1 opacity-80">
                  We found an autosaved draft from <strong>{new Date(autosaveData.savedAt).toLocaleString()}</strong> ({autosaveData.isCloud ? 'Cloud' : 'Local Storage'}) for this {type} workspace.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRestore}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-500/10"
              >
                Restore Draft
              </button>
              <button
                onClick={handleDismiss}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase transition-colors border ${
                  isLight 
                    ? 'border-gray-200 hover:bg-gray-150 text-gray-700 bg-white' 
                    : 'border-white/10 hover:bg-white/5 text-gray-300 bg-white/5'
                }`}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reusable Studio Header following the NAME STUDIO standard and subtitle descriptions */}
      <StudioHeader 
        isLight={isLight}
        type={type || 'web'}
        title={titleMap[type || 'web'] || 'STUDIO'}
        isSavingInProgress={isSavingInProgress}
        lastSaved={lastSaved}
        saveLocation={saveLocation}
        onBackToBoard={() => navigate('/dashboard')}
      />

      {/* Actual workspace panels with side-by-side Studio AI Chat */}
      <Suspense fallback={<div role="status" className="p-6 text-zinc-400">Загружаем студию…</div>}>
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full min-h-0">
        <motion.div 
          key={type}
          variants={getVariants('stagger-container')}
          initial="hidden"
          animate="visible"
          className="flex-1 min-h-0 w-full"
        >
          {type === 'web' ? (
            <WebStudioPanel />
          ) : type === 'bots' ? (
            <BotManagerPanel />
          ) : type === 'agent' ? (
            <div className="flex flex-col gap-5 h-full min-h-0">
              {/* Swarm / Forge Mode Switcher Tab Bar */}
              <div className={`flex border-b pb-2 shrink-0 ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setAgentView('swarm')}
                    className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      agentView === 'swarm' 
                        ? (isLight 
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' 
                            : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold') 
                        : (isLight 
                            ? 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100' 
                            : 'bg-transparent text-[#E0E0E0]/60 hover:text-white hover:bg-white/5')
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Swarm Orchestra</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">ACTIVE STATE</span>
                  </button>
                  <button 
                    onClick={() => setAgentView('forge')}
                    className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      agentView === 'forge' 
                        ? (isLight 
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' 
                            : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold') 
                        : (isLight 
                            ? 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100' 
                            : 'bg-transparent text-[#E0E0E0]/60 hover:text-white hover:bg-white/5')
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Agent Forge</span>
                  </button>
                  <button 
                    onClick={() => setAgentView('config')}
                    className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      agentView === 'config' 
                        ? (isLight 
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' 
                            : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold') 
                        : (isLight 
                            ? 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100' 
                            : 'bg-transparent text-[#E0E0E0]/60 hover:text-white hover:bg-white/5')
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Agent Config</span>
                  </button>
                </div>
              </div>
              
              {/* Condition Panel Rendering */}
              <div className="flex-1 min-h-0">
                {agentView === 'swarm' ? (
                  <SwarmConfigurationPanel isLight={isLight} />
                ) : agentView === 'config' ? (
                  <AgentConfigurationPanel isLight={isLight} />
                ) : (
                  <AgentForgePanel isLight={isLight} />
                )}
              </div>
            </div>
          ) : type === 'image' ? (
            <ImageStudioPanel isLight={isLight} />
          ) : type === 'video' ? (
            <VideoStudioPanel isLight={isLight} />
          ) : type === 'music' ? (
            <MusicStudioPanel isLight={isLight} />
          ) : type === 'lab' ? (
            <PulseLabPanel isLight={isLight} />
          ) : type === 'code' ? (
            <CodeStudioPanel isLight={isLight} />
          ) : type === 'knowledge' ? (
            <KnowledgeHubPanel isLight={isLight} />
          ) : type === 'billing' ? (
            <BillingStudioPanel isLight={isLight} />
          ) : type === 'data' ? (
            <DataStudioPanel isLight={isLight} />
          ) : type === 'model' ? (
            <ModelStudioPanel isLight={isLight} />
          ) : type === 'automation' ? (
            <AutomationStudioPanel isLight={isLight} />
          ) : type === 'analytics' ? (
            <AnalyticsStudioPanel isLight={isLight} />
          ) : type === 'deploy' ? (
            <DeployStudioPanel isLight={isLight} />
          ) : type === 'security' ? (
            <SecurityStudioPanel isLight={isLight} />
          ) : type === 'marketplace' ? (
            <MarketplaceStudioPanel isLight={isLight} />
          ) : type === 'sandbox' ? (
            <SandboxStudioPanel isLight={isLight} />
          ) : (
            <GenericStudioPanel type={type || 'unknown'} isLight={isLight} />
          )}
        </motion.div>

        {/* Dynamic Studio AI Chat */}
        {type && ['web', 'code', 'music', 'video', 'agent', 'image', 'lab', 'knowledge', 'sandbox'].includes(type) && (
          <StudioAIChat studioType={type} isLight={isLight} />
        )}
      </div>

      <GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} isLight={isLight} />
      <WorkspaceTemplatesModal 
        isOpen={isTemplatesOpen} 
        onClose={() => setIsTemplatesOpen(false)} 
        isLight={isLight}
        currentStudioType={type || 'web'}
      />
      <ThorQuickAccess 
        isOpen={isThorOpen}
        onClose={() => setIsThorOpen(false)}
        isLight={isLight}
        onSelect={(m) => {
          stormRef.current?.trigger();
          toast.success(`Module ${m.label} initiated in current workspace`);
        }}
      />

      {activeIntegrationModel && <IntegrationDetailsModal model={activeIntegrationModel} isOpen={!!activeIntegrationModel} onClose={() => setActiveIntegrationModel(null)} isLight={isLight} />}
      <DisplayScalingEngine isLight={isLight} />
      
      <StudioTerminal studioType={type || 'web'} isLight={isLight} />
      
      {/* Hidden Editor component for syntax highlighting and AST/preloading compliance */}
      <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
        <Editor height="0px" width="0px" value="" />
      </div>
      </Suspense>
    </div>
  );
}
