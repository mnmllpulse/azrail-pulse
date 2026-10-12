import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { SystemIntro } from '../components/SystemIntro';
import { BootSequence } from '../components/BootSequence';
import { DashboardSkeleton } from '../components/Skeleton';
import { 
  Globe, 
  Music, 
  Video, 
  Cpu,
  ChevronRight,
  FolderKanban,
  Plus,
  Circle,
  Clock,
  CheckCircle2,
  Trash2,
  Search,
  Calendar,
  AlertCircle,
  Download,
  Bot,
  Beaker,
  Palette,
  Star,
  LayoutGrid,
  Zap,
  Settings2,
  GripVertical,
  TerminalSquare,
  Database
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { useAudio } from '../contexts/AudioContext';
import VoiceInputButton from '../components/VoiceInputButton';
import Tooltip from '../components/Tooltip';
import { PulseArchitectureMap } from '../components/Dashboard/PulseArchitectureMap';
import PulseActivityLog from '../components/PulseActivityLog';
import NeonIcon from '../components/NeonIcon';
import { SortableModule } from '../components/Dashboard/SortableModule';

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import { StudioCard } from '../components/StudioCard';
import { NodeMap } from '../components/NodeMap';
import { SystemTelemetry } from '../components/SystemTelemetry';
import { SystemTelemetryLog } from '../components/SystemTelemetryLog';
import { SystemStatusMonitor } from '../components/SystemStatusMonitor';
import { PulseMonitor } from '../components/PulseMonitor';
import { NeuralPatternWidget } from '../components/NeuralPatternWidget';
import { SystemLog } from '../components/SystemLog';
import { useBackgroundSync } from '../contexts/GlobalMotionContext';

interface Project {
  id: string;
  name: string;
  category: 'Web' | 'Music' | 'Video' | 'Agent';
  status: 'planning' | 'in-progress' | 'completed';
  dueDate?: string;
  image?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLight } = useOutletContext<{ isLight: boolean }>();
  const { t } = useLanguage();
  const { 
    logicCoreLoad, 
    integrityPercentage, 
    latency, 
    activeShader, 
    setActiveShader,
    isDashboardEditMode,
    uiPreferences
  } = useSystemState();
  const { playHover, playActivation } = useAudio();
  const syncProps = useBackgroundSync();

  const simplicityMode = uiPreferences?.simplicityMode;

  const [isLoading, setIsLoading] = useState(true);

  const [moduleOrder, setModuleOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_module_order');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (parsed.includes('node-map') || parsed.includes('neural-pattern')) {
          parsed = parsed.filter((id: string) => id !== 'node-map' && id !== 'neural-pattern');
          if (!parsed.includes('telemetry-zone')) {
            parsed.unshift('telemetry-zone');
          }
        }
        return parsed;
      } catch (e) {
        // Fallback on parse error
      }
    }
    return [
      'telemetry-zone',
      'telemetry-log',
      'pulse-architecture',
      'studio-ecosystem',
      'workspace-shaders',
      'projects-workspace',
      'system-log',
      'activity-log'
    ];
  });

  useEffect(() => {
    localStorage.setItem('dashboard_module_order', JSON.stringify(moduleOrder));
  }, [moduleOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModuleOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
      playActivation();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, simplicityMode ? 100 : 1100);
    return () => clearTimeout(timer);
  }, [simplicityMode]);

  const [showBootSequence, setShowBootSequence] = useState(() => {
    if (simplicityMode) return false;
    const savedPrefs = localStorage.getItem('ui_preferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.simplicityMode) return false;
      } catch (e) {}
    }
    return !sessionStorage.getItem('system_booted');
  });

  const handleBootComplete = () => {
    sessionStorage.setItem('system_booted', 'true');
    setShowBootSequence(false);
  };

  const [showIntro, setShowIntro] = useState(() => {
    if (simplicityMode) return false;
    const savedPrefs = localStorage.getItem('ui_preferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.simplicityMode) return false;
      } catch (e) {}
    }
    return !sessionStorage.getItem('system_intro_seen');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('system_intro_seen', 'true');
    setShowIntro(false);
  };

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('dashboard_projects');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: '1', name: 'Portfolio Revamp', category: 'Web', status: 'in-progress', dueDate: new Date(Date.now() + 86400000).toISOString(), image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop' },
      { id: '2', name: 'Synthwave EP', category: 'Music', status: 'planning', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('dashboard_projects', JSON.stringify(projects));
  }, [projects]);

  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const approachingDeadlines = projects.filter(p => p.dueDate && p.status !== 'completed' && new Date(p.dueDate) < new Date(Date.now() + 86400000 * 2));

  const toggleProjectStatus = (id: string) => {
    setProjects(projects.map(p => {
      if (p.id === id) {
        const nextStatus = 
          p.status === 'planning' ? 'in-progress' : 
          p.status === 'in-progress' ? 'completed' : 'planning';
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('projectId', id);
  };

  const handleDrop = (e: React.DragEvent, status: Project['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('projectId');
    if (id) {
      setProjects(projects.map(p => p.id === id ? { ...p, status } : p));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const exportDataToJson = () => {
    const dataToExport = {
      projects
    };
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLight && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.studio-module', {
          y: 20,
          opacity: 0,
          duration: 0.8,
          stagger: 0.05,
          ease: 'power3.out',
          clearProps: 'all'
        });
      }, containerRef.current);
      return () => ctx.revert();
    }
  }, [isLight]);

  if (showBootSequence) {
    return (
      <AnimatePresence mode="wait">
        <BootSequence onComplete={handleBootComplete} />
      </AnimatePresence>
    );
  }

  if (showIntro) {
    return (
      <SystemIntro onComplete={handleIntroComplete} isLight={isLight} />
    );
  }

  if (isLoading) {
    return (
      <DashboardSkeleton isLight={isLight} />
    );
  }

  const visibleModules = moduleOrder.filter(id => {
    if (simplicityMode) {
      return ['studio-ecosystem', 'projects-workspace', 'activity-log'].includes(id);
    }
    return true;
  });

  return (
    <div ref={containerRef} className="flex flex-col min-h-full gap-6 md:gap-8 relative px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto w-full">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={visibleModules}
          strategy={verticalListSortingStrategy}
        >
          {visibleModules.map((moduleId) => (
            <SortableModule 
              key={moduleId} 
              id={moduleId} 
              isDraggingEnabled={isDashboardEditMode}
              isLight={isLight}
            >
              {moduleId === 'telemetry-zone' && (
                <div className="layout-engine-container w-full" id="telemetry-zone-container">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-stretch">
                    {/* Node Map Panel */}
                    <div className="xl:col-span-5 flex flex-col h-full">
                      <div className={`p-8 rounded-[32px] border h-full flex flex-col ${isLight ? 'bg-white border-gray-100' : 'bg-depth-nebula border-white/5 shadow-2xl'}`}>
                        <div className="flex items-center justify-between mb-8">
                          <motion.div {...syncProps} className="flex items-center gap-3">
                            <div className="p-2 bg-pulse-primary/10 rounded-lg">
                              <Database className="w-5 h-5 text-pulse-primary" />
                            </div>
                            <div className="flex flex-col">
                              <h2 className="text-sm font-mono tracking-[0.3em] uppercase font-bold">{t('azrailMemoryCoreTitle')}</h2>
                              <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">{t('neuralMeshActive')}</span>
                            </div>
                          </motion.div>
                        </div>
                        <div className="flex-1 min-h-[400px] w-full relative">
                          <NodeMap />
                          <div className="absolute top-4 right-4 flex flex-col gap-2">
                            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-pulse-accent animate-pulse" />
                              <span className="text-[10px] font-mono text-white/60">{t('nodeSymmetryStable')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Neural Pattern Panel */}
                    <div className="xl:col-span-7 flex flex-col h-full">
                      <NeuralPatternWidget isLight={isLight} />
                    </div>
                  </div>
                </div>
              )}
              {moduleId === 'telemetry-log' && <SystemTelemetryLog isLight={isLight} />}
              {moduleId === 'pulse-architecture' && <PulseArchitectureMap isLight={isLight} />}
              {moduleId === 'studio-ecosystem' && (
                <section aria-label="Studio Ecosystem">
                  <div className={`flex items-center gap-2 mb-6 ${isLight ? 'text-indigo-600' : 'text-pulse-accent'}`}>
                    <LayoutGrid className="w-5 h-5" aria-hidden="true" />
                    <h2 className="text-sm font-mono tracking-[0.3em] uppercase font-bold">Studio Ecosystem</h2>
                  </div>

                    <div className="flex overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:pb-0 md:px-0 md:mx-0 scrollbar-thin">
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('webStudio')} 
                        description={t('webStudioDesc')}
                        icon={<NeonIcon icon={<Globe />} color="cyan" size="lg" />}
                        onClick={() => navigate('/studio/web')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('codeStudio')} 
                        description={t('codeStudioDesc')}
                        icon={<NeonIcon icon={<TerminalSquare />} color="blue" size="lg" />}
                        onClick={() => navigate('/studio/code')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('musicStudio')} 
                        description={t('musicStudioDesc')}
                        icon={<NeonIcon icon={<Music />} color="amber" size="lg" />}
                        onClick={() => navigate('/studio/music')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('videoStudio')} 
                        description={t('videoStudioDesc')}
                        icon={<NeonIcon icon={<Video />} color="pink" size="lg" />}
                        onClick={() => navigate('/studio/video')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('agentStudio')} 
                        description={t('agentStudioDesc')}
                        icon={<NeonIcon icon={<Bot />} color="amber" size="lg" />}
                        onClick={() => navigate('/studio/agent')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('imageStudio')} 
                        description={t('imageStudioDesc')}
                        icon={<NeonIcon icon={<Cpu />} color="green" size="lg" />}
                        onClick={() => navigate('/studio/image')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('pulseLab')} 
                        description={t('pulseLabDesc')}
                        icon={<NeonIcon icon={<Beaker />} color="pink" size="lg" />}
                        onClick={() => navigate('/studio/lab')}
                        isLight={isLight}
                      />
                    </div>
                    <div className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0">
                      <StudioCard 
                        title={t('knowledgeHub')} 
                        description={t('knowledgeHubDesc')}
                        icon={<NeonIcon icon={<Database />} color="violet" size="lg" />}
                        onClick={() => navigate('/studio/knowledge')}
                        isLight={isLight}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <StudioCard 
                      title={t('assetUniverse')} 
                      description={t('assetUniverseDesc')}
                      icon={<NeonIcon icon={<FolderKanban />} color="violet" size="xl" />}
                      onClick={() => navigate('/gallery')}
                      isLight={isLight}
                      isPremium
                    />
                  </div>
                </section>
              )}

              {moduleId === 'workspace-shaders' && (
                <div className={`studio-module flex flex-col gap-6 ${isLight ? 'bg-white' : 'bg-depth-nebula'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className={`flex items-center gap-3 ${isLight ? 'text-pulse-primary' : 'text-pulse-accent'}`}>
                      <Palette className="w-5 h-5" />
                      <h2 className="text-sm font-mono tracking-[0.3em] uppercase font-bold">{t('workspaceShadersTitle')}</h2>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-[0.2em] ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                      {t('selectNeuralEnvironmentMood')}
                    </span>
                  </div>

                  <div className="flex overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory gap-4 mt-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:overflow-visible sm:pb-0 sm:px-0 sm:mx-0 scrollbar-thin">
                    {[
                      {
                        id: 'cosmic-pulse',
                        name: 'Cosmic Pulse',
                        desc: 'Deep cosmic nebula with swirling dark violet and neon teal glows.',
                        colors: isLight ? ['bg-indigo-300', 'bg-purple-300', 'bg-pink-200'] : ['bg-pulse-primary', 'bg-purple-600', 'bg-violet-800'],
                        tag: 'CALM'
                      },
                      {
                        id: 'quantum-aurora',
                        name: 'Quantum Aurora',
                        desc: 'Ethereal northern lights featuring vibrant emerald and teal wisps.',
                        colors: isLight ? ['bg-teal-200', 'bg-emerald-200', 'bg-sky-200'] : ['bg-emerald-600', 'bg-teal-500', 'bg-cyan-600'],
                        tag: 'ACTIVE'
                      },
                      {
                        id: 'cyber-pulse',
                        name: 'Cyber Pulse',
                        desc: 'A glowing cybernetic core of soft volcanic amber and warm orange lights.',
                        colors: isLight ? ['bg-indigo-200', 'bg-purple-200', 'bg-pink-200'] : ['bg-pulse-primary', 'bg-violet-600', 'bg-indigo-600'],
                        tag: 'CYBER'
                      },
                      {
                        id: 'monochrome',
                        name: 'Monochrome Horizon',
                        desc: 'Architectural shadows and clean grayscale highlights for pure focus.',
                        colors: isLight ? ['bg-slate-300', 'bg-zinc-200', 'bg-neutral-100'] : ['bg-zinc-700', 'bg-neutral-800', 'bg-zinc-900'],
                        tag: 'FOCUS'
                      },
                      {
                        id: 'solar-eclipse',
                        name: 'Solar Eclipse',
                        desc: 'Rich bronze and golden corona rings with luxurious warmth.',
                        colors: isLight ? ['bg-violet-200', 'bg-purple-100', 'bg-indigo-200'] : ['bg-violet-600', 'bg-purple-700', 'bg-indigo-800'],
                        tag: 'LUXURY'
                      }
                    ].map((preset) => {
                      const isActive = activeShader === preset.id;
                      return (
                        <div key={preset.id} className="min-w-[85vw] sm:min-w-[45vw] lg:min-w-0 snap-center shrink-0">
                          <Tooltip
                            contentEn={preset.desc}
                            contentRu={preset.desc}
                            titleEn={preset.name}
                            titleRu={preset.name}
                            position="top"
                            isLight={isLight}
                            className="w-full h-full"
                          >
                            <motion.div
                              whileHover={{ y: -2 }}
                              onMouseEnter={playHover}
                              onClick={() => {
                                playActivation();
                                setActiveShader(preset.id as any);
                              }}
                              className={`rounded-2xl p-5 flex flex-col cursor-pointer transition-all h-full relative overflow-hidden group border-2 ${
                                isActive
                                  ? isLight
                                    ? 'bg-indigo-50/50 border-pulse-primary shadow-sm'
                                    : 'bg-pulse-primary/5 border-pulse-primary/50 shadow-[0_0_30px_rgba(123,77,255,0.1)]'
                                  : isLight
                                  ? 'bg-white border-gray-100 hover:border-gray-200'
                                  : 'bg-depth-void border-white/5 hover:border-white/10'
                              }`}
                            >
                          <div className="flex items-start justify-between mb-4">
                            {/* Color Bubbles */}
                            <div className="flex -space-x-2">
                              {preset.colors.map((bgClass, idx) => (
                                <span
                                  key={idx}
                                  className={`w-4 h-4 rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${bgClass} ${
                                    isLight ? 'border-white' : 'border-depth-void'
                                  }`}
                                  style={{ transitionDelay: `${idx * 75}ms` }}
                                />
                              ))}
                            </div>

                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest font-bold ${
                              isActive
                                ? isLight
                                  ? 'bg-pulse-primary text-white'
                                  : 'bg-pulse-primary text-white shadow-[0_0_10px_rgba(123,77,255,0.5)]'
                                : isLight
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-white/5 text-white/20'
                            }`}>
                              {preset.tag}
                            </span>
                          </div>

                          <h3 className={`text-xs font-bold mb-1 tracking-tight transition-colors ${
                            isActive
                              ? isLight
                                ? 'text-gray-900'
                                : 'text-white'
                              : isLight
                              ? 'text-gray-600'
                              : 'text-white/40'
                          }`}>
                            {preset.name}
                          </h3>
                          
                          <p className={`text-[10px] leading-relaxed flex-1 ${
                            isLight ? 'text-gray-400' : 'text-[#8a8a8a]'
                          }`}>
                            {preset.desc}
                          </p>

                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                              <span className="text-[8px] font-mono uppercase tracking-widest text-indigo-500 font-bold">ACTIVE</span>
                            </div>
                          )}
                          </motion.div>
                        </Tooltip>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              {moduleId === 'projects-workspace' && (
                <section aria-label="Active Projects Workspace" className={`studio-module flex flex-col gap-6 ${isLight ? 'bg-white' : 'bg-depth-nebula'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className={`flex items-center gap-3 ${isLight ? 'text-pulse-primary' : 'text-pulse-accent'}`}>
                      <Zap className="w-5 h-5" aria-hidden="true" />
                      <h2 className="text-sm font-mono tracking-[0.3em] uppercase font-bold">Active Projects</h2>
                      {approachingDeadlines.length > 0 && (
                        <div className={`ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${isLight ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-pulse-primary/10 text-pulse-accent border border-pulse-primary/20'}`}>
                          <AlertCircle className="w-3 h-3" />
                          {approachingDeadlines.length} Alerts
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative hidden sm:flex items-center">
                        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-white/20'}`} />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          aria-label="Search projects"
                          value={projectSearchQuery}
                          onChange={(e) => setProjectSearchQuery(e.target.value)}
                          className={`w-48 pl-8 pr-8 py-1.5 text-xs rounded-lg border outline-none transition-all ${isLight ? 'bg-white border-gray-200 text-gray-800 focus:border-pulse-primary focus:bg-white' : 'bg-depth-void border-white/10 text-[#e0e0e0] focus:border-pulse-primary/50 focus:bg-[#1a1a1a]'}`}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <VoiceInputButton value={projectSearchQuery} onChange={setProjectSearchQuery} isLight={isLight} size="sm" />
                        </div>
                      </div>
                      <Tooltip content="Export data to JSON" isLight={isLight}>
                        <button
                          onClick={exportDataToJson}
                          aria-label="Export project data"
                          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors border ${isLight ? 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50' : 'bg-depth-space text-white/40 border-white/5 hover:bg-white/5'}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="sm:hidden relative flex items-center mb-4">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-white/20'}`} />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      aria-label="Search projects mobile"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border outline-none transition-all ${isLight ? 'bg-white border-gray-200 text-gray-800 focus:border-pulse-primary focus:bg-white' : 'bg-depth-void border-white/10 text-[#E0E0E0] focus:border-pulse-primary/50 focus:bg-[#1a1a1a]'}`}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <VoiceInputButton value={projectSearchQuery} onChange={setProjectSearchQuery} isLight={isLight} size="sm" />
                    </div>
                  </div>

                  <div className="flex overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory gap-6 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:px-0 md:mx-0 scrollbar-thin">
                    {(['planning', 'in-progress', 'completed'] as Project['status'][]).map(status => (
                      <div 
                        key={status}
                        onDrop={(e) => handleDrop(e, status)}
                        onDragOver={handleDragOver}
                        className={`flex flex-col gap-3 p-4 rounded-[32px] border min-h-[200px] transition-all duration-500 min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center shrink-0 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-depth-nebula border-white/5'}`}
                      >
                        <div className={`text-[9px] font-mono font-bold uppercase tracking-[0.3em] mb-3 flex items-center gap-2 ${isLight ? 'text-gray-500' : 'text-white/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'in-progress' ? 'bg-pulse-primary heartbeat-active' : 'bg-white/10'}`} />
                          {status.replace('-', ' ')}
                        </div>
                        {filteredProjects.filter(p => p.status === status).map(project => {
                          const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();
                          const isDueSoon = project.dueDate && new Date(project.dueDate) < new Date(Date.now() + 86400000 * 2);

                          return (
                            <div 
                              key={project.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, project.id)}
                              className={`flex flex-col rounded-[24px] overflow-hidden cursor-grab active:cursor-grabbing border transition-all duration-500 group ${isLight ? 'bg-white border-gray-200 hover:border-pulse-primary shadow-sm' : 'bg-depth-space border-white/5 hover:border-pulse-primary/30'}`}
                            >
                              <div className="aspect-[4/3] w-full relative overflow-hidden bg-black">
                                {project.image ? (
                                  <img src={project.image} alt={project.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center opacity-30 text-white">
                                    <FolderKanban className="w-8 h-8" />
                                  </div>
                                )}
                                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-mono font-bold uppercase tracking-widest text-white/90 border border-white/10">
                                  {project.category}
                                </div>
                                <Tooltip content="Delete Project" isLight={isLight} className="absolute top-3 right-3">
                                  <button onClick={() => deleteProject(project.id)} className={`p-1.5 bg-black/60 backdrop-blur-md rounded-lg transition-all text-white/40 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </Tooltip>
                              </div>
                              
                              <div className="p-4 flex flex-col gap-1.5">
                                <span className={`text-sm font-bold tracking-tight ${project.status === 'completed' ? 'line-through opacity-30' : ''} ${isLight ? 'text-gray-900' : 'text-white/90'}`}>
                                  {project.name}
                                </span>
                                {project.dueDate && (
                                  <div className={`text-[9px] font-mono font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 ${project.status !== 'completed' ? (isOverdue ? 'text-rose-500' : isDueSoon ? 'text-pulse-accent' : (isLight ? 'text-gray-500' : 'text-white/40')) : 'text-white/20'}`}>
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {moduleId === 'system-log' && <SystemLog />}
              {moduleId === 'activity-log' && <PulseActivityLog isLight={isLight} />}
            </SortableModule>
          ))}
        </SortableContext>
      </DndContext>
      
      {/* Real-time Pulse OS Status & Waves */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <SystemStatusMonitor />
        <PulseMonitor />
      </div>

      {/* System Telemetry Footer */}
      <div className="mt-8 mb-4">
        <SystemTelemetry />
      </div>
    </div>
  );
}
