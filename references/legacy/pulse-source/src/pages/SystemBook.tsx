import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, ShieldCheck, Cpu, Zap, Globe, Fingerprint, Image as ImageIcon, Sliders, 
  Code, Database, Brain, GitBranch, Settings, BarChart2, Shield, Activity, HelpCircle,
  Play, Plus, ArrowRight, ChevronRight, Layers, Sparkles, CheckCircle2, AlertTriangle, 
  Music, Network, FileText, ShoppingBag, Users, ChevronDown, Award, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function SystemBook() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'manifesto' | 'kernel' | 'studios' | 'imagex' | 'evolution'>('manifesto');
  const [selectedStudio, setSelectedStudio] = useState<string>('code');
  const [evolutionNodes, setEvolutionNodes] = useState([
    { id: 'v1', label: 'Image v1 (Base Genome)', type: 'base', detail: 'Prompt: Biomechanical obsidian angel structure. CFG: 7.5. Seed: 420912', status: 'Active' },
    { id: 'v2', parentId: 'v1', label: 'Image v2 (Anamorphic Wide-Angle)', type: 'camera', detail: 'Recalibrated lens to wide-angle, shifted focus coordinates to cinematic grid.', status: 'Active' },
    { id: 'v3', parentId: 'v1', label: 'Image v3 (Brutalist Style Blend)', type: 'style', detail: 'Recalibrated Style DNA: Brutalist Concrete 75%, Renaissance Palette 25%.', status: 'Active' },
    { id: 'v4', parentId: 'v2', label: 'Image v4 (God-Rays Lighting Shift)', type: 'lighting', detail: 'Injected Volumetric God-Rays lighting tags, CFG scale boosted to 9.0.', status: 'Active' },
    { id: 'v5', parentId: 'v3', label: 'Image v5 (4X Ultra Upscale)', type: 'upscale', detail: 'Triggered Super-Resolution 4096px print engine.', status: 'Completed' }
  ]);
  const [selectedEvolutionNode, setSelectedEvolutionNode] = useState<string>('v1');

  const addEvolutionNode = (type: 'style' | 'lighting' | 'camera' | 'upscale') => {
    const parentNode = evolutionNodes.find(n => n.id === selectedEvolutionNode) || evolutionNodes[0];
    const newId = 'v' + (evolutionNodes.length + 1);
    
    let label = '';
    let detail = '';
    if (type === 'style') {
      label = `Image ${newId} (Cyberpunk Overlay)`;
      detail = 'Mutated style spectrum: 60% neon luminance, 40% high contrast dark void.';
    } else if (type === 'lighting') {
      label = `Image ${newId} (Chiaroscuro Dark Shadow)`;
      detail = 'Reduced ambient exposure by 40%. Added sharp directional spotlights.';
    } else if (type === 'camera') {
      label = `Image ${newId} (Macro Close-Up Focus)`;
      detail = 'Adjusted camera distance to macro scale, creating deep bokeh defocus.';
    } else {
      label = `Image ${newId} (AI Style DNA Graft)`;
      detail = 'Injected H.R. Giger organic conduit genetics to canvas layers.';
    }

    setEvolutionNodes([...evolutionNodes, {
      id: newId,
      parentId: parentNode.id,
      label,
      type,
      detail,
      status: 'Active'
    }]);
    setSelectedEvolutionNode(newId);
  };

  const getChildNodes = (parentId: string) => {
    return evolutionNodes.filter(n => n.parentId === parentId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-8 px-4 font-sans text-zinc-300">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-fit text-sm font-mono uppercase tracking-wider mb-[-2rem] relative z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      {/* 1. Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pulse-primary/10 via-transparent to-pulse-primary/10 blur-3xl opacity-50 pointer-events-none" />
        <div className="inline-flex p-4 rounded-3xl bg-pulse-primary/5 text-pulse-primary border border-pulse-primary/15 shadow-inner">
          <BookOpen className="w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white">{t('architecturalBlueprintTitle')}</h1>
        <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-zinc-500">DARK MNMLL PULSE OS // GENERAL SPECIFICATION v1.5</p>
        
        <div className="max-w-xl mx-auto py-2">
          <blockquote className="text-xs font-mono border-l-2 border-pulse-primary/40 pl-4 py-1.5 text-zinc-400 italic text-left">
            "We are not building an AI generator. We are building a fully-fledged AI Operating System for Digital Creativity."
          </blockquote>
        </div>
      </motion.div>

      {/* 2. Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl scrollbar-none font-mono text-[10px] tracking-wider uppercase">
        <TabNavButton active={activeTab === 'manifesto'} onClick={() => setActiveTab('manifesto')} icon={<BookOpen className="w-4 h-4" />} label={t('tabManifesto')} />
        <TabNavButton active={activeTab === 'kernel'} onClick={() => setActiveTab('kernel')} icon={<Cpu className="w-4 h-4" />} label={t('tabKernel')} />
        <TabNavButton active={activeTab === 'studios'} onClick={() => setActiveTab('studios')} icon={<Layers className="w-4 h-4" />} label={t('tabStudiosSuite')} />
        <TabNavButton active={activeTab === 'imagex'} onClick={() => setActiveTab('imagex')} icon={<ImageIcon className="w-4 h-4" />} label={t('tabImageStudioX')} />
        <TabNavButton active={activeTab === 'evolution'} onClick={() => setActiveTab('evolution')} icon={<GitBranch className="w-4 h-4" />} label={t('tabCreativeEvolution')} />
      </div>

      {/* 3. Main Content Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="min-h-[500px]"
        >
          {/* TAB 1: MANIFESTO */}
          {activeTab === 'manifesto' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChapterCard 
                  icon={<Cpu />} 
                  title="01. THE CORE KERNEL"
                  subtitle="QUANTUM CONCURRENCY"
                  content="Virtualization of custom neural sandboxes. Multiple model orchestration threads are managed concurrently by Swarm Intelligence (AZRAIL) without blocking the primary visual interface."
                />
                <ChapterCard 
                  icon={<Zap />} 
                  title="02. COGNITIVE INTEGRATION"
                  subtitle="EVENT-DRIVEN REALITY BUS"
                  content="A unified reactive event bus guarantees that every user interaction sends a synchronization wave across the entire system. Your assets, memories, and commands update instantly."
                />
                <ChapterCard 
                  icon={<Globe />} 
                  title="03. DATA-INTENSIVE LOGIC"
                  subtitle="SCALABLE DNA SEQUENCING"
                  content="Reliability through strict architectural segregation. Utilizes high-performance vectors and embeddings for long-term project graphs, ensuring your creative style is indexable forever."
                />
                <ChapterCard 
                  icon={<ShieldCheck />} 
                  title="04. ARCHITECTURAL HONESTY"
                  subtitle="MINIMAL DESIGN PHILOSOPHY"
                  content="No decorative 'AI clutter' or simulated system data. High density visual layout with extreme visual precision. High-contrast grids, balanced typography, and clean layouts rule."
                />
              </div>

              {/* Cognitive Hierarchy Grid */}
              <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/80 space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-pulse-primary font-bold">AZRAIL // SUPREME INTEL CORE</span>
                  <h3 className="text-xl font-bold text-white mt-1">THE COGNITIVE HIERARCHY GRID</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[10px]">
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold border-b border-zinc-900 pb-2">
                      <Brain className="w-4 h-4" />
                      <span>STRATEGY LAYER</span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-400">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Sandalphon (Metatron Guard)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Raziel (Creative Secret Keeper)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Zadkiel (Process Allocator)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Anael (Aesthetic Arbiter)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-zinc-900 pb-2">
                      <Network className="w-4 h-4" />
                      <span>INTELLIGENCE LAYER</span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-400">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Uriel (Prompt Translation Core)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Raphael (Image & Video Synthesis)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Jophiel (Style DNA Analytics)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Camael (Validation & Error Shield)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-zinc-900 pb-2">
                      <Settings className="w-4 h-4" />
                      <span>SYSTEM LAYER</span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-400">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Michael (Security & Encryption)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Gabriel (Communication Broadcast)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Sariel (Memory & State Restorations)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PULSE KERNEL */}
          {activeTab === 'kernel' && (
            <div className="space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/80 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-4 gap-4">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-pulse-primary font-bold">PULSE_KERNEL // SYSTEM COGNITION FLOW</span>
                    <h2 className="text-2xl font-bold text-white mt-1">THE SYSTEM CENTRAL NERVOUS PIPELINE</h2>
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">ACTIVE CORE SYNC</span>
                </div>

                {/* ASCII Diagram & text block */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="font-mono text-[9px] bg-zinc-950 p-6 rounded-2xl border border-zinc-850 overflow-x-auto text-zinc-400 leading-relaxed shadow-inner">
{`   [AZRAIL SUPREME INTELLIGENCE CORE]
                  │
                  ▼
          [PULSE OS KERNEL]
   ┌──────────────┼──────────────┐
   │              │              │
   ▼              ▼              ▼
[MODEL ROUTER] [MEMORY]     [TASK BUS]
   │              │              │
   ├─► Gemini     ├─► User DNA   ├─► Render Q
   ├─► Flux       ├─► Vectors    ├─► GPU Sched
   └─► Ollama     └─► Graph DB   └─► Cache
                  │
                  ▼
         [STUDIO WORKSPACES]
 ┌──────────┬─────┴────┬──────────┐
 │          │          │          │
 ▼          ▼          ▼          ▼
[IMAGE]  [VIDEO]    [MUSIC]    [WEB]`}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Why Pulse OS is Fundamentally Different</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Conventional platforms operate as fragmented, isolated apps. In **DARK MNMLL PULSE OS**, every studio is a client subscribing to the central **PULSE KERNEL**.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[10px]">
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850/60">
                        <div className="font-bold text-white uppercase tracking-wider mb-1">Unified State & Memory</div>
                        <p className="text-zinc-500 leading-normal">Your preferred aesthetics, palettes, and style genetics flow from Image Studio straight into web interfaces or audio themes.</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850/60">
                        <div className="font-bold text-white uppercase tracking-wider mb-1">Unified Model Router</div>
                        <p className="text-zinc-500 leading-normal">Smart fallback chain selects Gemini Flash Lite for quick parameter mapping, triggering heavy-fidelity engines for raw rendering.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STUDIOS SUITE */}
          {activeTab === 'studios' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Sidebar list */}
              <div className="space-y-1.5 font-mono text-[11px]">
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest block mb-2 px-2">CHOOSE SYSTEM STUDIO</span>
                <StudioSelectorBtn id="code" label="CODE_STUDIO" active={selectedStudio === 'code'} onClick={() => setSelectedStudio('code')} />
                <StudioSelectorBtn id="data" label="DATA_STUDIO" active={selectedStudio === 'data'} onClick={() => setSelectedStudio('data')} />
                <StudioSelectorBtn id="model" label="MODEL_STUDIO" active={selectedStudio === 'model'} onClick={() => setSelectedStudio('model')} />
                <StudioSelectorBtn id="automation" label="AUTOMATION" active={selectedStudio === 'automation'} onClick={() => setSelectedStudio('automation')} />
                <StudioSelectorBtn id="analytics" label="ANALYTICS" active={selectedStudio === 'analytics'} onClick={() => setSelectedStudio('analytics')} />
                <StudioSelectorBtn id="deploy" label="DEPLOY_STUDIO" active={selectedStudio === 'deploy'} onClick={() => setSelectedStudio('deploy')} />
                <StudioSelectorBtn id="security" label="SECURITY_SHIELD" active={selectedStudio === 'security'} onClick={() => setSelectedStudio('security')} />
                <StudioSelectorBtn id="knowledge" label="KNOWLEDGE_HUB" active={selectedStudio === 'knowledge'} onClick={() => setSelectedStudio('knowledge')} />
                <StudioSelectorBtn id="marketplace" label="PULSE_MARKET" active={selectedStudio === 'marketplace'} onClick={() => setSelectedStudio('marketplace')} />
                <StudioSelectorBtn id="musicdaw" label="MUSIC_STUDIO_DAW" active={selectedStudio === 'musicdaw'} onClick={() => setSelectedStudio('musicdaw')} />
              </div>

              {/* Main detail display */}
              <div className="md:col-span-3 p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedStudio}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    {selectedStudio === 'code' && (
                      <StudioDetailBlock 
                        title="CODE STUDIO"
                        subtitle="THE COGNITIVE IDE ENVIRONMENT"
                        description="A professional, terminal-first development experience for software design. Integrates natural language refactoring directly into standard compiler layers."
                        features={[
                          "AI IDE: Fully functional coding console featuring VS Code mode.",
                          "Automated Git Pipeline: Code reviews, automated branch creation, and commit messaging.",
                          "Refactoring Engine: Automated architecture reviews and pattern checks.",
                          "Docker & K8s Deployments: Out-of-the-box infrastructure building with Cloudflare/Vercel support."
                        ]}
                      />
                    )}
                    {selectedStudio === 'data' && (
                      <StudioDetailBlock 
                        title="DATA STUDIO"
                        subtitle="STRUCTURED PERSISTENCE ENGINE"
                        description="Universal dashboard for monitoring and modifying multiple database architectures, caches, and storage indices concurrently."
                        features={[
                          "Relational Drivers: Manage PostgreSQL, SQLite and SQLite vectors in real-time.",
                          "NoSQL Accessors: Direct manipulation interfaces for Firestore and custom JSON nodes.",
                          "Vector Space Managers: Explore, filter, and optimize high-dimensional embeddings indices.",
                          "RAG Pipeline Builders: Transform raw PDFs/CSV sheets into vector stores."
                        ]}
                      />
                    )}
                    {selectedStudio === 'model' && (
                      <StudioDetailBlock 
                        title="MODEL STUDIO"
                        subtitle="COGNITIVE ROUTING & FAILSAFE SHIELD"
                        description="Centrally optimize cost, latency, and generation speed across major LLM networks (Gemini, Claude, DeepSeek, Local Ollama, Flux, SDXL)."
                        features={[
                          "Smart Router: Automatically assigns incoming tasks to the most cost-efficient and capable model.",
                          "Cost & Latency Optimizer: Live charts calculating real-time dollar-per-token overhead.",
                          "Dynamic Fallback Chain: Instantly fails over to fallback models on network errors.",
                          "Ollama Local Bridge: Run local open models seamlessly with zero API overhead."
                        ]}
                      />
                    )}
                    {selectedStudio === 'automation' && (
                      <StudioDetailBlock 
                        title="AUTOMATION STUDIO"
                        subtitle="FLOW ORCHESTRATOR"
                        description="Design autonomous background pipelines to automate content creation and distribution chains with visual trigger nodes."
                        features={[
                          "E.g. Pipeline: Telegram post ➔ Sentiment filter ➔ Drive storage ➔ Notion indexing ➔ Discord broadcast.",
                          "Custom Webhook Ingestion: Trigger pipelines with raw external events.",
                          "Periodic CRON triggers: Automated daily compilations and system health checkups.",
                          "AI Condition routing: Intelligently branch flows based on output content."
                        ]}
                      />
                    )}
                    {selectedStudio === 'analytics' && (
                      <StudioDetailBlock 
                        title="ANALYTICS STUDIO"
                        subtitle="REAL-TIME TELEMETRY ENGINE"
                        description="High-density visual interface reporting detailed metrics of active agents, model speeds, GPU allocation, memory footprints, and token queues."
                        features={[
                          "Model Execution Speed curves.",
                          "GPU/CPU Memory allocation grids.",
                          "Active Task Queue monitors.",
                          "Error Rates & latency trackers."
                        ]}
                      />
                    )}
                    {selectedStudio === 'deploy' && (
                      <StudioDetailBlock 
                        title="DEPLOY STUDIO"
                        subtitle="ZERO-CONFIG PIPELINE"
                        description="Build, containerize, and deploy projects to serverless edge functions or cloud servers with single-button operations."
                        features={[
                          "Native Vercel & Cloudflare bindings.",
                          "Docker container build triggers.",
                          "GitHub Action continuous delivery configurations.",
                          "Live domain allocations & SSL certification pipelines."
                        ]}
                      />
                    )}
                    {selectedStudio === 'security' && (
                      <StudioDetailBlock 
                        title="SECURITY CENTER"
                        subtitle="SOVEREIGN PRIVACY SHIELD"
                        description="Enforce security parameters, API key encryptions, access levels, and logs. Ensures your environment remains fully protected."
                        features={[
                          "Sovereign Secret Crypt: Secure containerized credential storage.",
                          "Role-Based Access Controls (RBAC) for team sync.",
                          "Neural Verification logs.",
                          "Automated dependency vulnerability sweeps."
                        ]}
                      />
                    )}
                    {selectedStudio === 'knowledge' && (
                      <StudioDetailBlock 
                        title="KNOWLEDGE HUB"
                        subtitle="THE BRAIN ENGINE"
                        description="Store documentation, articles, design guides, templates, and memories into a unified Vector space to fuel AZRAIL's cognitive queries."
                        features={[
                          "Drag & Drop PDF/Doc indexers.",
                          "Sovereign Semantic Search.",
                          "Continuous Learning memory stores.",
                          "Custom Template indices."
                        ]}
                      />
                    )}
                    {selectedStudio === 'marketplace' && (
                      <StudioDetailBlock 
                        title="PULSE MARKETPLACE"
                        subtitle="THE EXTENSION SYSTEM"
                        description="A professional, modular repository to share, publish, download, or sell custom workflow configurations, Style DNA presets, or component codes."
                        features={[
                          "Sovereign agent profiles & custom prompts.",
                          "Style DNA palettes & vector guidelines.",
                          "MIDI presets & DSP effect chain templates.",
                          "Reusable React component bundles."
                        ]}
                      />
                    )}
                    {selectedStudio === 'musicdaw' && (
                      <StudioDetailBlock 
                        title="MUSIC STUDIO (AI DAW)"
                        subtitle="NEXT-GEN AUDIO WORKSPACE"
                        description="A highly advanced Digital Audio Workstation focusing on raw structural composition, MIDI sequencing, and DSP effects chains, rather than flat playback."
                        features={[
                          "Ableton/Logic Session parsing: Understands track groupings and MIDI matrices.",
                          "Neural Sound Synthesis: Custom MIDI generation based on established artist genetics.",
                          "Smart Mixer & Master: AI balancing of frequency channels and volume peaks.",
                          "Unified Creative Memory: Reads active Image Studio palettes to inspire audio moods."
                        ]}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Visual footer */}
                <div className="border-t border-zinc-800/60 pt-4 mt-6 flex justify-between items-center text-[9px] font-mono text-zinc-600">
                  <span>SEC_BLUEPRINT: ACTIVE_STATE</span>
                  <span>TAP TO BROWSE REPOSITORY</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IMAGE STUDIO X */}
          {activeTab === 'imagex' && (
            <div className="space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/80 space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-pulse-primary font-bold">IMAGE_STUDIO_X // NEURAL CANVASE ENGINE</span>
                  <h2 className="text-2xl font-bold text-white mt-1">THE 16 NEURAL ART OPERATING SUB-SYSTEMS</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-[10px]">
                  <SubsystemCard index="01" label="Neural Canvas Engine" desc=" Endless workspace featuring Drag & Drop node canvas, advanced layer mixing, and outpainting." />
                  <SubsystemCard index="02" label="Style Intelligence" desc="Decodes and tracks custom visual DNA profiles: Renaissance, Brutalist, Luxury, Cyber, Editorial." />
                  <SubsystemCard index="03" label="Prompt Genome" desc="Decomposes chaos prompts into normalized genetics: Subject, environment, camera, lighting, composition, lens." />
                  <SubsystemCard index="04" label="Visual Memory" desc="Maintains active registry of user preferred palettes, margins, focus ratios, and symmetry metrics." />
                  <SubsystemCard index="05" label="Prompt Library" desc="Organizes favorites, templates, community presets, and automated prompt revisions." />
                  <SubsystemCard index="06" label="Neural Gallery" desc="Stores immutable render cards detailing exact seed, model, GPU cycles, cost, workflow, and resolution." />
                  <SubsystemCard index="07" label="Project Workspace" desc="Organizes separate campaigns (e.g. Logos, UI grids, campaigns) in secure logical directories." />
                  <SubsystemCard index="08" label="AI Critic Engine" desc="Evaluates pixel fidelity, color contrast, typography alignment, and visual balance with score breakdowns." />
                  <SubsystemCard index="09" label="AI Director" desc="Suggests composition shifts, lighting intensity adjustments, and lens swaps to perfect frames." />
                  <SubsystemCard index="10" label="Neural Workflows" desc="Connect operations visually: e.g. Prompt ➔ Generation ➔ 4X Upscale ➔ Relighting ➔ Background Removal." />
                  <SubsystemCard index="11" label="Image DNA Database" desc="Enables visual indexing to search files based on geometric composition, palettes, or lighting spectra." />
                  <SubsystemCard index="12" label="Inspiration Engine" desc="Recommends similar visual assets, classic art catalogs, cinematic palettes, or historical photographers." />
                  <SubsystemCard index="13" label="Neural Export Engine" desc="Renders outputs into PNG, JPG, WebP, vector SVG, PSD, PDF, and high-fidelity EXR formats." />
                  <SubsystemCard index="14" label="Studio Analytics" desc="Detailed overview tracking GPU runtime cost, total outputs, favorite model, and generation counts." />
                  <SubsystemCard index="15" label="Multi-Model Concurrency" desc="Dispatch requests to Flux, Gemini Image, Stable Diffusion simultaneously to compare outcomes." />
                  <SubsystemCard index="16" label="Core System Integration" desc="Durable synchronization with Firebase Firestore, local buffers, and Workspace storage drives." />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CREATIVE EVOLUTION */}
          {activeTab === 'evolution' && (
            <div className="space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/80 space-y-6">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-pulse-primary font-bold">EXCLUSIVE FEATURE // REVOLUTIONARY PIPELINE</span>
                  <h2 className="text-2xl font-bold text-white mt-1">THE CREATIVE EVOLUTION SYSTEM</h2>
                  <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                    Rather than generating random detached images, the **Creative Evolution** tree charts a non-destructive lineage. Creators split prompt genetics into divergent visual branches, comparing states and retroactively restoring base files without loss.
                  </p>
                </div>

                {/* Interactive Simulator Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
                  {/* Visual Node Tree Column */}
                  <div className="lg:col-span-2 bg-zinc-950 p-6 rounded-2xl border border-zinc-850 flex flex-col gap-4 relative min-h-[300px] justify-between">
                    <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 border-b border-zinc-900 pb-2.5">
                      <span>ACTIVE EVOLUTION GENEALOGY</span>
                      <span>{evolutionNodes.length} MUTATION NODES</span>
                    </div>

                    {/* Simple Connected Node Tree representation */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6 font-mono text-[10px]">
                      {/* Base Node */}
                      <EvolutionNode 
                        node={evolutionNodes.find(n => n.id === 'v1')!}
                        active={selectedEvolutionNode === 'v1'}
                        onClick={() => setSelectedEvolutionNode('v1')}
                      />
                      
                      <div className="w-px h-6 bg-zinc-800 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-pulse-primary animate-ping" />
                      </div>

                      {/* Level 1 branches */}
                      <div className="flex gap-4 md:gap-12 relative w-full justify-center">
                        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-zinc-800" />
                        
                        <div className="flex flex-col items-center">
                          <EvolutionNode 
                            node={evolutionNodes.find(n => n.id === 'v2')!}
                            active={selectedEvolutionNode === 'v2'}
                            onClick={() => setSelectedEvolutionNode('v2')}
                          />
                          <div className="w-px h-6 bg-zinc-800" />
                          <EvolutionNode 
                            node={evolutionNodes.find(n => n.id === 'v4')!}
                            active={selectedEvolutionNode === 'v4'}
                            onClick={() => setSelectedEvolutionNode('v4')}
                          />
                        </div>

                        <div className="flex flex-col items-center">
                          <EvolutionNode 
                            node={evolutionNodes.find(n => n.id === 'v3')!}
                            active={selectedEvolutionNode === 'v3'}
                            onClick={() => setSelectedEvolutionNode('v3')}
                          />
                          <div className="w-px h-6 bg-zinc-800" />
                          <EvolutionNode 
                            node={evolutionNodes.find(n => n.id === 'v5')!}
                            active={selectedEvolutionNode === 'v5'}
                            onClick={() => setSelectedEvolutionNode('v5')}
                          />
                        </div>
                      </div>

                      {/* Display dynamically spawned nodes below */}
                      {evolutionNodes.filter(n => !['v1', 'v2', 'v3', 'v4', 'v5'].includes(n.id)).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-zinc-900 w-full flex flex-col items-center gap-4">
                          <div className="text-[8px] text-zinc-600 uppercase tracking-widest">Spawned Branches</div>
                          <div className="flex flex-wrap gap-4 justify-center">
                            {evolutionNodes.filter(n => !['v1', 'v2', 'v3', 'v4', 'v5'].includes(n.id)).map(node => (
                              <EvolutionNode 
                                key={node.id}
                                node={node}
                                active={selectedEvolutionNode === node.id}
                                onClick={() => setSelectedEvolutionNode(node.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simulation trigger buttons */}
                    <div className="border-t border-zinc-900 pt-4 flex flex-col sm:flex-row gap-2 font-mono text-[9px] tracking-wider">
                      <span className="text-zinc-500 flex items-center shrink-0 uppercase">MUTATE ACTIVE:</span>
                      <div className="grid grid-cols-2 sm:flex gap-1.5 flex-1">
                        <button onClick={() => addEvolutionNode('style')} className="px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-pulse-primary text-white cursor-pointer transition-colors uppercase">
                          + Style overlay
                        </button>
                        <button onClick={() => addEvolutionNode('lighting')} className="px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-pulse-primary text-white cursor-pointer transition-colors uppercase">
                          + Lighting Shift
                        </button>
                        <button onClick={() => addEvolutionNode('camera')} className="px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-pulse-primary text-white cursor-pointer transition-colors uppercase">
                          + Camera Zoom
                        </button>
                        <button onClick={() => addEvolutionNode('upscale')} className="px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-pulse-primary text-white cursor-pointer transition-colors uppercase">
                          + DNA Graft
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Sidebar Column */}
                  <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800/80 flex flex-col justify-between font-mono text-[10px] space-y-4 shadow-lg">
                    {(() => {
                      const activeNode = evolutionNodes.find(n => n.id === selectedEvolutionNode) || evolutionNodes[0];
                      return (
                        <>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                              <span className="text-pulse-primary font-bold uppercase tracking-wider">{activeNode.id} // GENOMICS CARD</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[8px] font-bold">SECURE</span>
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-zinc-500 uppercase tracking-widest text-[8px] font-bold">NODE NAME:</span>
                              <div className="text-white font-bold text-xs">{activeNode.label}</div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-zinc-500 uppercase tracking-widest text-[8px] font-bold">GENOME MODULATION:</span>
                              <div className="text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-850 break-words font-sans text-xs">
                                {activeNode.detail}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-zinc-500 uppercase tracking-widest text-[8px] font-bold">PARENT GENOME ID:</span>
                              <div className="text-zinc-400 font-bold">{activeNode.parentId || 'NONE (ROOT)'}</div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-800 space-y-2 text-[9px] text-zinc-500">
                            <div className="flex justify-between">
                              <span>VERIFICATION_HASH:</span>
                              <span className="text-zinc-400">0x4F0B...912A</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SYNCHRONIZATION:</span>
                              <span className="text-emerald-400">100% OK</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 4. Comparison Table (The Unified Superiority) */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="p-8 md:p-12 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">The Ecosystem Superiority Matrix</h2>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">How Pulse OS fundamentally outperforms centralized big tech</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 text-[9px] text-zinc-400 uppercase tracking-widest">Functional Dimension</th>
                <th className="py-4 text-[9px] text-pulse-primary uppercase tracking-widest">DARK MNMLL PULSE OS</th>
                <th className="py-4 text-[9px] text-zinc-500 uppercase tracking-widest">Centralized Competitors</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <ComparisonRow label="Studio Integration" pulse="Unified State (One Core, Shared Memory, Shared Asset Space)" bigtech="Segmented, disconnected stand-alone tools" />
              <ComparisonRow label="Orchestration" pulse="Swarm Intelligence (AZRAIL multi-agent core planner)" bigtech="No proactive guidance, flat input prompt boxes" />
              <ComparisonRow label="Lineage Tracking" pulse="Creative Evolution non-destructive gene tree" bigtech="Flat chronological feed without contextual ancestry" />
              <ComparisonRow label="Asset Sharing" pulse="Project Asset Universe connected directly to project graph" bigtech="Standard desktop folders, manual imports/exports" />
              <ComparisonRow label="Model Flexibility" pulse="Seamless Model Studio router with custom fallback chains" bigtech="Strict binding to single vendor model ecosystems" />
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 5. Footer Fingerprint */}
      <div className="flex flex-col items-center gap-4 py-8 opacity-30">
        <Fingerprint className="w-12 h-12 text-zinc-400" />
        <span className="text-[8px] font-mono uppercase tracking-[0.5em] text-zinc-500">Immutable System Blueprint Node authenticated.</span>
      </div>
    </div>
  );
}

// Sub-component for Navigation Buttons
interface TabNavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}
function TabNavButton({ active, onClick, icon, label }: TabNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${active ? 'bg-zinc-800 text-white border border-zinc-750 font-bold shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850/30'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Sub-component for Chapter Card
interface ChapterCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  content: string;
}
function ChapterCard({ icon, title, subtitle, content }: ChapterCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-8 rounded-[2rem] bg-zinc-900/30 border border-zinc-850 hover:border-pulse-primary/30 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pulse-primary/5 to-transparent blur-xl pointer-events-none" />
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-pulse-primary border border-zinc-850 group-hover:scale-105 transition-transform [&_svg]:w-5 [&_svg]:h-5">
          {icon}
        </div>
        <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest font-bold">SYSTEM_NODE</span>
      </div>
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono text-pulse-primary uppercase tracking-[0.2em]">{title}</h4>
        <h3 className="text-base font-bold text-white tracking-tight">{subtitle}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">{content}</p>
      </div>
    </motion.div>
  );
}

// Sub-component for Studio Selector Buttons
interface StudioSelectorBtnProps {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}
function StudioSelectorBtn({ id, label, active, onClick }: StudioSelectorBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${active ? 'bg-pulse-primary/10 border-pulse-primary text-pulse-primary font-bold shadow-sm' : 'bg-transparent border-zinc-950/20 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
    >
      <span>{label}</span>
      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${active ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
    </button>
  );
}

// Sub-component for Studio details block
interface StudioDetailBlockProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
}
function StudioDetailBlock({ title, subtitle, description, features }: StudioDetailBlockProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-pulse-primary font-bold">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-[9px] font-mono uppercase tracking-[0.3em]">STUDIO_BLUEPRINT</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em]">{subtitle}</p>
      </div>

      <p className="text-sm text-zinc-400 font-sans leading-relaxed">
        {description}
      </p>

      <div className="space-y-3.5">
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider font-bold block border-b border-zinc-850 pb-1.5">Key Core Specifications</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
          {features.map((feat, i) => {
            const [boldLabel, restText] = feat.split(':');
            return (
              <div key={i} className="flex gap-2.5 items-start bg-zinc-950/40 border border-zinc-850/60 p-3 rounded-xl hover:border-zinc-800 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-pulse-primary shrink-0 mt-0.5" />
                <div className="text-zinc-300 leading-relaxed">
                  {restText ? (
                    <>
                      <strong className="text-white font-semibold">{boldLabel}:</strong> {restText}
                    </>
                  ) : (
                    feat
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Sub-component for Subsystem card
interface SubsystemCardProps {
  index: string;
  label: string;
  desc: string;
}
function SubsystemCard({ index, label, desc }: SubsystemCardProps) {
  return (
    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850/60 hover:border-zinc-800 transition-colors flex flex-col justify-between">
      <div className="space-y-1">
        <span className="text-zinc-600 text-[8px] font-bold">[{index}]</span>
        <div className="text-white font-bold tracking-tight text-[11px] leading-tight">{label}</div>
      </div>
      <p className="text-zinc-500 text-[9px] font-sans leading-normal mt-2">
        {desc}
      </p>
    </div>
  );
}

// Sub-component for Interactive Evolution Node
interface EvolutionNodeProps {
  node: { id: string; label: string; type: string; detail: string; status: string };
  active: boolean;
  onClick: () => void;
}
function EvolutionNode({ node, active, onClick }: EvolutionNodeProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 px-4 rounded-xl border text-left font-mono transition-all text-[9px] tracking-wider shrink-0 cursor-pointer ${active ? 'bg-pulse-primary/10 border-pulse-primary text-white shadow-[0_0_15px_rgba(123,77,255,0.15)] font-bold' : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'}`}
    >
      <div className="flex items-center gap-1.5 mb-1 justify-between">
        <span className="text-zinc-600">NODE_{node.id.toUpperCase()}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-pulse-primary animate-pulse' : 'bg-zinc-700'}`} />
      </div>
      <div className={`${active ? 'text-white font-bold' : 'text-zinc-400'}`}>{node.label}</div>
    </button>
  );
}

// Sub-component for Comparison Row
interface ComparisonRowProps {
  label: string;
  pulse: string;
  bigtech: string;
}
function ComparisonRow({ label, pulse, bigtech }: ComparisonRowProps) {
  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/1 transition-colors">
      <td className="py-5 font-bold text-zinc-500">{label}</td>
      <td className="py-5 text-white font-bold">{pulse}</td>
      <td className="py-5 text-zinc-600">{bigtech}</td>
    </tr>
  );
}

