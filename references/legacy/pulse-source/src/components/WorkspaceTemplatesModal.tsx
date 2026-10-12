import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  X, Save, Search, Layout, Play, Music, Cpu, Image as ImageIcon, 
  Trash2, Plus, Calendar, Sliders, Check, Layers, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  type: 'web' | 'music' | 'video' | 'agent' | 'image' | 'lab';
  createdAt: string;
  isSystem?: boolean;
  config: any;
}

const SYSTEM_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'sys-web-saas',
    name: 'SaaS Analytics Portal',
    description: 'A dark, modern analytics platform complete with interactive bento metric grids, custom navigation sidebar, and detailed data charts.',
    type: 'web',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      themeId: 'minimal-dark',
      prompt: 'A premium SaaS analytics dashboard. Include a side navigation panel, a top header with search and user profile, a grid of three metric cards showing revenue, users, and conversion rate, and a main container displaying a clean data list with status tags.',
      activeTemplate: 'saas'
    }
  },
  {
    id: 'sys-web-minimal',
    name: 'Creative Portfolio',
    description: 'A clean, high-contrast creative developer or agency portfolio template featuring a sleek dark aesthetic and structured masonry grid elements.',
    type: 'web',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      themeId: 'oceanic',
      prompt: 'A minimalist portfolio for a high-end digital designer. Include an elegant layout with a large display hero heading, a subtle masonry-style gallery showing three project mockups, a professional experiences outline section, and a minimalist newsletter contact form.',
      activeTemplate: 'portfolio'
    }
  },
  {
    id: 'sys-music-lofi',
    name: 'Lo-Fi Sunset Synthwave',
    description: 'A relaxing chillwave electronic synthesizer preset configured with a nostalgic 100 BPM speed, warm ambient pads, and dynamic percussion sequences.',
    type: 'music',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      bpm: 100,
      selectedAIStyle: 'synthwave',
      prompt: 'Chill lofi evening sunset progression, warm analog synthesizer chords, lazy detuned bass pads, and a retro cassette snare loop.',
      sequences: {
        kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        bass: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        synth: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0]
      }
    }
  },
  {
    id: 'sys-music-techno',
    name: 'Intelligent Club Techno',
    description: 'A fast-paced 130 BPM acid-infused techno sequencer preset designed with punchy kick loops, syncopated high-hats, and rhythmic synth filters.',
    type: 'music',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      bpm: 130,
      selectedAIStyle: 'techno',
      prompt: 'Underground warehouse heavy kick, continuous driving bassline, cyclic percussion grids, and metallic modulated synth stabs.',
      sequences: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
        bass: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        synth: [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0]
      }
    }
  },
  {
    id: 'sys-video-space',
    name: 'Cinematic Deep Space Voyage',
    description: 'A space flight visual preset built around the "Cosmic" rendering engine, featuring scrolling stellar dust and a starry background template.',
    type: 'video',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      activeStyle: 'cosmic',
      subtitles: 'Interstellar warp activated. Approaching Orion nebula coordinate cluster...',
      prompt: 'A wide-angle 4k digital render of traveling through a colorful gaseous deep-space planetary nebula with moving stars and lens flare.'
    }
  },
  {
    id: 'sys-video-cyber',
    name: 'Digital Cyber Rain Matrix',
    description: 'A cyberpunk style aesthetic centered on vertical code streams and grid rain vectors matching terminal telemetry panels.',
    type: 'video',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      activeStyle: 'cyber',
      subtitles: 'Accessing core system protocols... 100% network synchronization achieved.',
      prompt: 'Matrix cyber rain code falling down green digital stream vectors with a tech HUD overlay layout.'
    }
  },
  {
    id: 'sys-agent-dev',
    name: 'Master Software Engineer',
    description: 'Expert agent model configuration for code synthesis, architectural plans, API design, and strict type-safe programming instructions.',
    type: 'agent',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      name: 'Mothership-Architect',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      domain: 'Work',
      systemPrompt: 'You are a master software architect and Senior Staff Engineer. Break down programming problems into optimal architectural modules. Always write high-quality, fully type-safe, and secure TypeScript code. Verify edge cases and outline your file design rules before rendering.',
      result: {
        name: 'Mothership-Architect',
        systemPrompt: 'You are a master software architect and Senior Staff Engineer...',
        model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        domain: 'Work',
        metadata: {
          capabilities: ['TypeScript & Node.js', 'Relational Databases', 'System Architecture'],
          memoryAllocation: 'Context Window 1M Tokens',
          deploymentTarget: 'Edge / Cloud'
        }
      }
    }
  },
  {
    id: 'sys-image-retro',
    name: '80s Retro Synthwave Concept',
    description: 'Highly detailed retro-futuristic concept scene prompt with grid lines, neon wireframes, and warm purple/orange sky gradients.',
    type: 'image',
    createdAt: 'System Template',
    isSystem: true,
    config: {
      prompt: 'Classic 80s synthwave aesthetic vector illustration. Features a glowing wireframe grid terrain leading to a giant pixelated retro sun on the horizon under a dark purple starry sky with bright neon light streaks.'
    }
  }
];

export default function WorkspaceTemplatesModal({ 
  isOpen, 
  onClose, 
  isLight,
  currentStudioType 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  isLight: boolean;
  currentStudioType: string;
}) {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>(SYSTEM_TEMPLATES);
  
  // Custom saving form state
  const [isSaving, setIsSaving] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [capturedState, setCapturedState] = useState<any>(null);

  // Load custom templates from local storage
  useEffect(() => {
    const saved = localStorage.getItem('workspace_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WorkspaceTemplate[];
        setTemplates([...SYSTEM_TEMPLATES, ...parsed]);
      } catch (e) {
        console.error('Failed to parse saved templates', e);
      }
    }
  }, []);

  const triggerToast = (msg: string) => {
    toast(msg);
  };

  // Capture current state of the active studio page
  const handleCaptureCurrentState = () => {
    // Listen for response
    const handleResponse = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.type) {
        setCapturedState(customEvent.detail);
        setCustomName(`My Custom ${customEvent.detail.type.toUpperCase()} Preset`);
        setCustomDesc(`Customized configuration saved from active ${customEvent.detail.type} workspace studio.`);
        setIsSaving(true);
      }
      window.removeEventListener('response-workspace-state', handleResponse);
    };

    window.addEventListener('response-workspace-state', handleResponse);

    // Dispatch request
    window.dispatchEvent(new CustomEvent('request-workspace-state'));

    // Cleanup timeout if no panel responds (e.g., if on generic page)
    setTimeout(() => {
      window.removeEventListener('response-workspace-state', handleResponse);
    }, 400);
  };

  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !capturedState) return;

    const newTemplate: WorkspaceTemplate = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      description: customDesc.trim() || 'Custom user configuration template.',
      type: capturedState.type,
      createdAt: new Date().toLocaleDateString(),
      config: capturedState.config
    };

    const saved = localStorage.getItem('workspace_templates');
    let customList: WorkspaceTemplate[] = [];
    if (saved) {
      try {
        customList = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    const updatedCustomList = [newTemplate, ...customList];
    localStorage.setItem('workspace_templates', JSON.stringify(updatedCustomList));
    setTemplates([...SYSTEM_TEMPLATES, ...updatedCustomList]);
    
    // Reset Form
    setIsSaving(false);
    setCapturedState(null);
    setCustomName('');
    setCustomDesc('');
    
    triggerToast('Custom template saved successfully!');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const saved = localStorage.getItem('workspace_templates');
    if (!saved) return;

    try {
      const customList = JSON.parse(saved) as WorkspaceTemplate[];
      const updatedCustom = customList.filter(t => t.id !== id);
      localStorage.setItem('workspace_templates', JSON.stringify(updatedCustom));
      setTemplates([...SYSTEM_TEMPLATES, ...updatedCustom]);
      triggerToast('Custom template deleted.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyTemplate = (template: WorkspaceTemplate) => {
    // 1. Dispatch custom load event
    const applyEvent = new CustomEvent('load-workspace-preset', {
      detail: template
    });
    window.dispatchEvent(applyEvent);

    // 2. Play beautiful pulse diagnostics notification
    triggerToast(`Template "${template.name}" applied successfully!`);
    onClose();
  };

  const filteredTemplates = templates.filter(t => {
    const matchesFilter = filterType === 'all' || t.type === filterType;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStudioIcon = (type: string) => {
    switch (type) {
      case 'web': return <Layout className="w-4 h-4" />;
      case 'music': return <Music className="w-4 h-4" />;
      case 'video': return <Play className="w-4 h-4" />;
      case 'agent': return <Cpu className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <Sliders className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Background Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 ${isLight ? 'bg-white/80 backdrop-blur-md' : 'bg-black/85 backdrop-blur-md'}`}
        />

        {/* Modal Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${
            isLight ? 'bg-white border-gray-200 shadow-gray-200/50' : 'bg-[#0A0A0A] border-white/10 shadow-black/80'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
            <div className="flex items-center gap-3">
               <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                 isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'
               }`}>
                 <Layers className="w-4.5 h-4.5" />
               </div>
               <div>
                 <h2 className={`font-medium text-sm tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                   Workspace Templates
                 </h2>
                 <p className={`text-[10px] font-mono leading-none mt-0.5 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                   PRESETS ENGINE v1.2 // PERSISTENT SYSTEM TEMPLATES
                 </p>
               </div>
            </div>
            
            <button 
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'
              }`}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Search & Action Bar */}
          <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 ${
            isLight ? 'bg-gray-50/50 border-gray-100' : 'bg-white/[0.01] border-white/5'
          }`}>
            <div className="relative w-full sm:w-72">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search presets, configurations..." 
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                  isLight 
                    ? 'bg-white border-gray-200 focus:border-indigo-400 text-gray-800 focus:shadow-sm' 
                    : 'bg-black border-white/10 focus:border-indigo-500/50 text-[#E0E0E0] focus:shadow-[0_0_12px_rgba(99,102,241,0.05)]'
                }`}
              />
            </div>

            {/* Quick configuration capture button */}
            <button
              onClick={handleCaptureCurrentState}
              className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-all ${
                isLight
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-sm'
                  : 'bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/35'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Current Workspace State</span>
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar filter types */}
            <div className={`w-44 shrink-0 flex flex-col border-r overflow-y-auto ${
              isLight ? 'border-gray-100 bg-gray-50/20' : 'border-white/5 bg-black/10'
            }`}>
              <div className="p-3 space-y-1">
                <div className={`text-[9px] font-mono tracking-widest uppercase px-2.5 py-1.5 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                  Filter Studios
                </div>
                <SidebarFilterButton label="All Blueprints" active={filterType === 'all'} onClick={() => setFilterType('all')} isLight={isLight} icon={<Layers className="w-3.5 h-3.5" />} />
                <SidebarFilterButton label="Web Studio" active={filterType === 'web'} onClick={() => setFilterType('web')} isLight={isLight} icon={<Layout className="w-3.5 h-3.5" />} />
                <SidebarFilterButton label="Music Studio" active={filterType === 'music'} onClick={() => setFilterType('music')} isLight={isLight} icon={<Music className="w-3.5 h-3.5" />} />
                <SidebarFilterButton label="Video Studio" active={filterType === 'video'} onClick={() => setFilterType('video')} isLight={isLight} icon={<Play className="w-3.5 h-3.5" />} />
                <SidebarFilterButton label="Agent Forge" active={filterType === 'agent'} onClick={() => setFilterType('agent')} isLight={isLight} icon={<Cpu className="w-3.5 h-3.5" />} />
                <SidebarFilterButton label="Image Studio" active={filterType === 'image'} onClick={() => setFilterType('image')} isLight={isLight} icon={<ImageIcon className="w-3.5 h-3.5" />} />
              </div>
            </div>

            {/* Grid display / Capture custom state editor pane */}
            <div className="flex-1 flex flex-col overflow-y-auto p-6">
              {isSaving ? (
                /* Save custom configuration view */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-xl p-5 max-w-xl mx-auto w-full ${
                    isLight ? 'bg-gray-50/50 border-gray-150' : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Save className="w-4 h-4 text-indigo-400" />
                    <h3 className={`font-medium text-sm ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      Save Workspace Template Configuration
                    </h3>
                  </div>

                  <form onSubmit={handleSaveCustomTemplate} className="space-y-4">
                    <div>
                      <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                        Template Name
                      </label>
                      <input 
                        type="text" 
                        required
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        placeholder="e.g. Production Web Dashboard"
                        className={`w-full p-2.5 text-xs rounded-lg border outline-none transition-all ${
                          isLight 
                            ? 'bg-white border-gray-200 focus:border-indigo-400 text-gray-800' 
                            : 'bg-black border-white/10 focus:border-indigo-500/50 text-[#E0E0E0]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                        Description / Goal Statement
                      </label>
                      <textarea 
                        rows={3}
                        value={customDesc}
                        onChange={e => setCustomDesc(e.target.value)}
                        placeholder="Short explanation of configuration or active state goals."
                        className={`w-full p-2.5 text-xs rounded-lg border outline-none transition-all resize-none ${
                          isLight 
                            ? 'bg-white border-gray-200 focus:border-indigo-400 text-gray-800' 
                            : 'bg-black border-white/10 focus:border-indigo-500/50 text-[#E0E0E0]'
                        }`}
                      />
                    </div>

                    <div className={`p-3 rounded-lg border flex items-center justify-between text-[11px] font-mono ${
                      isLight ? 'bg-indigo-50/30 border-indigo-100 text-indigo-900' : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        {getStudioIcon(capturedState.type)}
                        <span className="uppercase tracking-wider font-semibold">
                          Captured {capturedState.type} Module State
                        </span>
                      </div>
                      <span className="opacity-60 text-[10px]">
                        {Object.keys(capturedState.config).length} params captured
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => { setIsSaving(false); setCapturedState(null); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          isLight ? 'border-gray-200 hover:bg-gray-150 text-gray-700' : 'border-white/10 hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      >
                        Save Preset
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                /* Templates Grid view */
                <>
                  {filteredTemplates.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center p-8 border border-dashed rounded-xl ${
                      isLight ? 'border-gray-200 text-gray-400' : 'border-white/10 text-white/30'
                    }`}>
                      <AlertTriangle className="w-8 h-8 text-indigo-400/40 mb-3 animate-pulse" />
                      <span className="text-xs font-mono">NO COMPATIBLE TEMPLATES FOUND</span>
                      <p className={`text-[10px] mt-1 font-mono leading-relaxed ${isLight ? 'text-gray-400' : 'text-white/25'}`}>
                        Change your filter or capture a custom preset from the active workspace.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredTemplates.map(template => (
                        <motion.div
                          key={template.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => handleApplyTemplate(template)}
                          className={`group border rounded-xl p-4 flex flex-col text-left transition-all cursor-pointer relative ${
                            template.type === currentStudioType
                              ? (isLight 
                                  ? 'border-indigo-200 bg-indigo-50/20 hover:border-indigo-400 hover:shadow-sm' 
                                  : 'border-indigo-500/20 bg-indigo-500/[0.02] hover:border-indigo-500/40 hover:shadow-[0_0_12px_rgba(99,102,241,0.05)]')
                              : (isLight 
                                  ? 'border-gray-150 bg-white hover:border-gray-300 hover:shadow-sm' 
                                  : 'border-white/5 bg-[#080808] hover:border-white/10 hover:bg-white/[0.01]')
                          }`}
                        >
                          {/* Top row */}
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-widest uppercase font-bold border ${
                              template.type === 'web' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              template.type === 'music' ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400' :
                              template.type === 'video' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                              template.type === 'agent' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                              {template.type} Studio
                            </span>

                            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              {template.isSystem ? (
                                <span className="text-[8px] font-mono tracking-wider uppercase text-indigo-400/80 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                  System
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => handleDeleteTemplate(template.id, e)}
                                  className={`p-1 rounded transition-colors text-red-400 hover:bg-red-500/10`}
                                  title="Delete Preset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className={`font-semibold text-xs tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {template.name}
                          </h4>

                          {/* Description */}
                          <p className={`text-[10px] leading-relaxed mt-1 flex-1 ${isLight ? 'text-gray-500' : 'text-[#E0E0E0]/60'}`}>
                            {template.description}
                          </p>

                          {/* Date/Creation Row */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed border-white/5 text-[9px] font-mono opacity-50">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{template.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-bold tracking-wider">
                              <span>LOAD PRESET</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SidebarFilterButton({ 
  label, 
  active, 
  onClick, 
  isLight,
  icon 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  isLight: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 transition-all ${
        active 
          ? (isLight 
              ? 'bg-indigo-50 text-indigo-600 font-bold' 
              : 'bg-indigo-500/10 text-indigo-300 font-bold border-l-2 border-indigo-500 rounded-l-none pl-2') 
          : (isLight 
              ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-50' 
              : 'text-[#E0E0E0]/50 hover:text-white hover:bg-white/5')
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
