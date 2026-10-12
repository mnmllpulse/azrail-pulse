import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Zap, GitBranch, Share2, Dna, Lightbulb, FlaskConical, Target,
  Infinity as InfinityIcon, Layers, Sparkles, Command, Box, Activity, 
  ChevronRight, Database, Radio, Cpu, Plus, Check, ArrowRight, Eye, RefreshCw,
  Flame, HelpCircle, Shield, Compass, Sliders, AlertTriangle, GitPullRequest, Settings
} from 'lucide-react';
import { DivergentIdea } from '../../../types';

// Concrete presets for incredible interactive experience
const PRESETS = [
  {
    seed: "Designing a Quantum DAW without Timelines",
    domain: "Quantum Physics + Music Production",
    desc: "A temporal synthesizer where time exists as a probability field rather than a linear track."
  },
  {
    seed: "Mycelial Network Routing for Live Signals",
    domain: "Mycology + Audio Signal Processing",
    desc: "Dynamic, organic audio routing that self-heals, decays, and grows based on signal amplitude."
  },
  {
    seed: "Stellar Spectral Synthesis",
    domain: "Astrophysics + Sound Design",
    desc: "Translating stellar lifecycle events and cosmic microwave background radiation into complex wavetables."
  },
  {
    seed: "Autonomous AI Mixer Collective",
    domain: "Multi-Agent Systems + Acoustic Balance",
    desc: "A mixer where every channel strip is driven by an independent agent negotiating headroom in real-time."
  }
];

const DOMAINS = [
  { name: 'Music Theory', icon: '🎵', color: 'indigo' },
  { name: 'Quantum Physics', icon: '🌌', color: 'violet' },
  { name: 'Mycology / Biology', icon: '🍄', color: 'emerald' },
  { name: 'Neurology', icon: '🧠', color: 'rose' },
  { name: 'Astronomy', icon: '✨', color: 'amber' },
  { name: 'Architecture', icon: '📐', color: 'cyan' },
  { name: 'Economics', icon: '📈', color: 'fuchsia' }
];

export function DivergentEngine() {
  const [activeMode, setActiveMode] = useState<string>('exploration');
  const [seedInput, setSeedInput] = useState('');
  const [ideas, setIdeas] = useState<DivergentIdea[]>([
    {
      id: 'idea-1',
      title: 'Probability Wave Overlays',
      content: 'Instead of notes on a timeline, audio events are defined by wave equations. Playing a note increases the probability of it triggering in a certain spatial coordinate.',
      type: 'concept',
      confidence: 0.94,
      tags: ['Quantum', 'Acoustics', 'Free-Form'],
      connections: ['idea-2']
    },
    {
      id: 'idea-2',
      title: 'Superposition Mixer Channels',
      content: 'Mixer channels that exist in multiple state routes simultaneously. The listener collapses the wave function based on focus telemetry.',
      type: 'concept',
      confidence: 0.89,
      tags: ['Quantum', 'Routing'],
      connections: ['idea-1']
    }
  ]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [cognitiveLoad, setCognitiveLoad] = useState(42);
  const [ideaDensity, setIdeaDensity] = useState(128);
  const [impossibleModeActive, setImpossibleModeActive] = useState(false);
  const [creativityVault, setCreativityVault] = useState<{title: string, desc: string, stamp: string}[]>([
    { title: "Bioluminescent UI Glow", desc: "Using live biological cells as pixel arrays for low-energy visual feedback.", stamp: "2h ago" },
    { title: "Gravitational Delay Line", desc: "Simulating light bending around black holes to generate exponential acoustic decay.", stamp: "5h ago" }
  ]);

  // Mutation engine state
  const [mutatingParent, setMutatingParent] = useState<string>('idea-1');
  const [mutations, setMutations] = useState<{ id: string, name: string, change: string }[]>([
    { id: 'm1', name: 'Stochastic Mutation', change: 'Introduces random jitter to the wave probability threshold, causing unpredictable organic glitches.' },
    { id: 'm2', name: 'Symbiotic Hybridization', change: 'Blends with mycelial audio routing, forcing waves to decay if they do not interact with adjacent channels.' }
  ]);

  // Cross domain selection
  const [crossDomainSource, setCrossDomainSource] = useState('Neurology');
  const [crossDomainTarget, setCrossDomainTarget] = useState('Music Theory');

  // Interactive Graph nodes
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Curiosity Engine Question bank
  const [curiosityQuestions, setCuriosityQuestions] = useState<string[]>([
    "What if the mixer channel strips had dynamic, competitive bidding for spatial headroom?",
    "Can we model an equalizer on the behavior of subatomic particle filtration?",
    "What happens when the timeline ceases to be horizontal and becomes a concentric orbit?"
  ]);

  // Cognitive Fusion Engine tracks
  const [fusionLevel, setFusionLevel] = useState(75);
  const [fusionLogs, setFusionLogs] = useState<{ engine: string, log: string, status: string }[]>([
    { engine: 'Divergent', log: 'Generating alternative temporal dimensions...', status: 'ACTIVE' },
    { engine: 'Convergent', log: 'Distilling optimal latency routes...', status: 'STANDBY' },
    { engine: 'Critical', log: 'Evaluating physics/material constraint feasibility...', status: 'MONITORING' },
    { engine: 'Strategic', log: 'Planning long-term architecture roadmap integration...', status: 'STABLE' },
    { engine: 'Predictive', log: 'Calculating future computation load overhead...', status: 'ACTIVE' }
  ]);

  useEffect(() => {
    setSeedInput('Autonomous AI Mixer Collective');
    // Call handleGenerate immediately or mock it.
    // For simplicity, directly trigger internal logic or simulate the generate.
    setIsGenerating(true);
    setGenerationStep(pipelineSteps.length - 1);
    
    // Simulate finish
    const timer = setTimeout(() => {
      const newId = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newIdea: DivergentIdea = {
        id: newId,
        title: `Consciousness Synthesis: Autonomous AI Mixer Collective`,
        content: `Successfully established a convergent-divergent cognitive matrix.`,
        type: 'concept',
        confidence: 0.91,
        tags: ['EXPLORATION', 'MNMLL_CORE', 'STABLE'],
        connections: ['idea-1']
      };
      setIdeas(prevIdeas => prevIdeas.some(i => i.id === newIdea.id) ? prevIdeas : [newIdea, ...prevIdeas]);
      setIsGenerating(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const pipelineSteps = [
    "Problem Initialization",
    "Contextual Expansion",
    "Pattern Mapping",
    "Analogical Projection",
    "Conceptual Mutation",
    "Novelty Filtration",
    "Scenario Modeling",
    "Idea Graph Fusion"
  ];

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setSeedInput(preset.seed);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedInput) return;

    setIsGenerating(true);
    setGenerationStep(0);
    setCognitiveLoad(78);

    // Dynamic stepping simulation
    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= pipelineSteps.length - 1) {
          clearInterval(interval);
          
          // Finish generation
          const newId = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newIdea: DivergentIdea = {
            id: newId,
            title: impossibleModeActive ? `[IMPOSSIBLE] ${seedInput}` : `Consciousness Synthesis: ${seedInput}`,
            content: impossibleModeActive 
              ? `A hyper-theoretical framework where standard dimensional constraints are bypassed. Suggests utilizing simulated zero-point vacuum energy to power zero-latency routing pathways across an infinitely scalable memory fabric.`
              : `Successfully established a convergent-divergent cognitive matrix. Found cross-domain resonance mapping ${crossDomainSource} elements directly into ${crossDomainTarget} structural hierarchies, yielding optimal modular scalability.`,
            type: impossibleModeActive ? 'scenario' : 'concept',
            confidence: impossibleModeActive ? 0.35 : 0.91,
            tags: [activeMode.toUpperCase(), 'MNMLL_CORE', impossibleModeActive ? 'IMPOSSIBLE' : 'STABLE'],
            connections: ['idea-1']
          };

          setIdeas(prevIdeas => prevIdeas.some(i => i.id === newIdea.id) ? prevIdeas : [newIdea, ...prevIdeas]);
          setIsGenerating(false);
          setCognitiveLoad(45);
          setIdeaDensity(prev => prev + 12);
          
          // Generate a custom curiosity question
          setCuriosityQuestions(prev => [
            `How does ${seedInput} translate to micro-tonal structural tunings?`,
            ...prev
          ]);

          return 0;
        }
        return prev + 1;
      });
    }, 400);
  };

  const addMutation = () => {
    const newMut = {
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Variation-${Math.floor(Math.random() * 1000)}`,
      change: `Evolved mutation branch mapping spatial coordinates directly onto the frequency balance, altering standard acoustic parameters.`
    };
    setMutations(prev => [newMut, ...prev]);
  };

  const handleVaultIdea = (title: string, desc: string) => {
    setCreativityVault(prev => [{ title, desc, stamp: "Just Now" }, ...prev]);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Top Banner with high-fidelity branding */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-[#050505] to-violet-950/40 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Brain className="w-6 h-6 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">System Consciousness</span>
              <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-bold">Volume IX</span>
            </div>
            <h2 className="text-xl font-bold font-mono uppercase tracking-tighter text-white">Divergent Thinking Engine</h2>
            <p className="text-xs text-white/50 font-mono mt-0.5">Expanding potential solution spaces prior to physical convergence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono uppercase text-white/30">Cognitive Fusion State</span>
            <span className="text-xs font-mono font-bold text-indigo-400">INTELLIGENT_MATRIX_SYNC</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <button 
            onClick={() => setImpossibleModeActive(!impossibleModeActive)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-mono uppercase font-bold tracking-wider transition-all border flex items-center gap-2 ${
              impossibleModeActive 
                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.3)]' 
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10 hover:text-white/80'
            }`}
          >
            <InfinityIcon className="w-3.5 h-3.5" />
            <span>Impossible Mode {impossibleModeActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Seed & Pipeline Input */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">Divergence Seeds & Presets</span>
              </div>
              <span className="text-[9px] font-mono opacity-40">Select a structural seed or formulate a custom prompt</span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className="text-left p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono uppercase text-indigo-400 font-bold">{p.domain}</span>
                    <span className="text-[8px] font-mono text-white/20 group-hover:text-white/50 transition-colors">Apply</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-white/80 mb-1 group-hover:text-white transition-colors">{p.seed}</div>
                  <div className="text-[10px] opacity-50 font-mono leading-relaxed line-clamp-1">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <div className="relative">
                <input 
                  type="text"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder="Formulate a new conceptual dimension (e.g. Acoustic routing through light waves)..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-12 text-xs font-mono focus:outline-none focus:border-indigo-500/50 transition-all placeholder:opacity-30 text-white"
                />
                <button 
                  type="submit"
                  disabled={isGenerating || !seedInput}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                    seedInput ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:bg-indigo-500' : 'bg-white/5 text-white/20'
                  }`}
                >
                  {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>

            {/* Dynamic Pipeline Progress Bar */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-indigo-400 font-bold uppercase tracking-wider animate-pulse">Running Cognitive Pipeline...</span>
                      <span>Step {generationStep + 1} of {pipelineSteps.length}</span>
                    </div>
                    
                    {/* Visual chain */}
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
                      {pipelineSteps.map((step, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className={`h-1.5 rounded-full transition-all duration-300 ${idx <= generationStep ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/5'}`} />
                          <span className={`text-[7px] font-mono text-center truncate ${idx === generationStep ? 'text-indigo-300 font-bold' : 'text-white/20'}`}>
                            {step.split(' ')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cognitive Knobs & Metrics */}
        <div className="flex flex-col gap-6">
          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">Cognitive Metrics</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="opacity-50 uppercase">Cognitive Load</span>
                  <span className="text-indigo-400 font-bold">{cognitiveLoad}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={cognitiveLoad}
                  onChange={(e) => setCognitiveLoad(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-white/5 rounded-lg h-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="opacity-50 uppercase">Idea Density</span>
                  <span className="text-violet-400 font-bold">{ideaDensity}/min</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="300" 
                  value={ideaDensity}
                  onChange={(e) => setIdeaDensity(parseInt(e.target.value))}
                  className="w-full accent-violet-500 bg-white/5 rounded-lg h-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="opacity-50 uppercase">Synaptic Reach</span>
                  <span className="text-emerald-400 font-bold">Infinity ly</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-4/5" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex gap-4">
              <div className="flex-1 text-center">
                <div className="text-[8px] font-mono opacity-40 uppercase">Divergent Pool</div>
                <div className="text-lg font-bold font-mono text-white mt-1">{ideas.length}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex-1 text-center">
                <div className="text-[8px] font-mono opacity-40 uppercase">Vault Size</div>
                <div className="text-lg font-bold font-mono text-white mt-1">{creativityVault.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switches & Interactive Workspaces */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { id: 'exploration', label: 'Exploration', icon: <Sparkles />, color: 'indigo' },
          { id: 'cross_domain', label: 'Cross-Domain', icon: <Layers />, color: 'violet' },
          { id: 'analogy', label: 'Analogy Engine', icon: <Share2 />, color: 'amber' },
          { id: 'mutation', label: 'Mutation', icon: <Dna />, color: 'rose' },
          { id: 'possibility_graph', label: 'Possibility Graph', icon: <GitBranch />, color: 'emerald' },
          { id: 'hypothesis', label: 'Hypothesis', icon: <FlaskConical />, color: 'cyan' },
          { id: 'wild_thinking', label: 'Wild Thinking', icon: <Flame />, color: 'orange' },
          { id: 'fusion', label: 'Cognitive Fusion', icon: <Cpu />, color: 'fuchsia' }
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMode(m.id)}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all group text-center ${
              activeMode === m.id 
                ? `bg-${m.color}-500/10 border-${m.color}-500/50 text-${m.color}-400 shadow-[0_0_20px_rgba(var(--${m.color}-500),0.1)]`
                : 'bg-[#050505] border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${activeMode === m.id ? `bg-${m.color}-500 text-white` : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
              {React.cloneElement(m.icon, { className: 'w-4 h-4' })}
            </div>
            <span className="text-[9px] font-mono uppercase font-bold tracking-tight">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Interactive Workspace Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Dynamic Inner Panel based on active mode */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* 1. FREE EXPLORATION */}
            {activeMode === 'exploration' && (
              <motion.div 
                key="exploration" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Free Conceptual Space</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">Dynamic Stream Generation</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                  {ideas.map((idea) => (
                    <div key={idea.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase mr-2">CONCEPT</span>
                          <span className="text-xs font-bold font-mono text-white/90">{idea.title}</span>
                        </div>
                        <span className="text-[9px] font-mono text-indigo-400">{Math.round(idea.confidence * 100)}% Match</span>
                      </div>
                      <p className="text-[11px] font-mono text-white/60 leading-relaxed">{idea.content}</p>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-1">
                        <div className="flex gap-1">
                          {idea.tags.map(t => (
                            <span key={t} className="text-[8px] font-mono text-white/30 bg-white/2 px-1 rounded">{t}</span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVaultIdea(idea.title, idea.content)}
                            className="text-[9px] font-mono text-indigo-400 hover:text-white uppercase transition-colors"
                          >
                            Vault Idea
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. CROSS-DOMAIN INTELLIGENCE */}
            {activeMode === 'cross_domain' && (
              <motion.div 
                key="cross_domain" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Cross-Domain Fusion</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">Bypassing Domain Silos</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-white/2 p-5 rounded-2xl border border-white/5">
                  <div className="space-y-4">
                    <div className="text-[9px] font-mono uppercase opacity-40">Source Discipline</div>
                    <div className="flex flex-wrap gap-2">
                      {DOMAINS.map(d => (
                        <button 
                          key={d.name}
                          onClick={() => setCrossDomainSource(d.name)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-mono uppercase border transition-all ${
                            crossDomainSource === d.name ? 'border-violet-500/50 bg-violet-500/10 text-violet-400 font-bold' : 'border-white/5 text-white/40'
                          }`}
                        >
                          {d.icon} {d.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[9px] font-mono uppercase opacity-40">Target Application</div>
                    <div className="flex flex-wrap gap-2">
                      {DOMAINS.map(d => (
                        <button 
                          key={d.name}
                          onClick={() => setCrossDomainTarget(d.name)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-mono uppercase border transition-all ${
                            crossDomainTarget === d.name ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-white/5 text-white/40'
                          }`}
                        >
                          {d.icon} {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-violet-500/5 rounded-2xl p-5 border border-violet-500/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-mono text-violet-400 font-bold uppercase tracking-wider">HYBRID MODEL CONCEPT</span>
                    <h4 className="text-sm font-bold font-mono text-white mt-1 mb-2">Mycelial Neurology Synth</h4>
                    <p className="text-xs text-white/60 font-mono leading-relaxed">
                      Synthesizing audio patterns where synthesis components act like synapses crossing mycelial fungal nodes. 
                      Signals decay based on nutrient distribution equations, creating natural generative growth and decay cycles.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button 
                      onClick={() => handleVaultIdea("Mycelial Neurology Synth", "Fungal node synaptic network synthesizer.")}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[9px] font-mono uppercase font-bold tracking-wider transition-all"
                    >
                      Commit to Vault
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. ANALOGY ENGINE */}
            {activeMode === 'analogy' && (
              <motion.div 
                key="analogy" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Analogy Engine</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">Comparative Core Logic</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1 no-scrollbar">
                  {[
                    { component: "Audio Scheduler", analogy: "Airport Flight Dispatcher", desc: "Coordinates arrivals, queues, and priority lanes to prevent micro-stutter collision events." },
                    { component: "D1 Memory Fabric", analogy: "Biological Nervous System", desc: "Translates immediate impulse triggers to permanent storage vectors via myelinated routes." },
                    { component: "Mixer Headroom Console", analogy: "Thermodynamic Chamber", desc: "Allows signals to expand and exert pressure, triggering relief valves to maintain transient safety." }
                  ].map((pair, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[8px] font-mono text-amber-400 font-bold uppercase">ANALOGY #{idx+1}</span>
                          <span className="text-[10px] font-mono text-white/30">Matches</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                          <div className="text-center p-1.5 rounded-lg bg-white/5">
                            <div className="text-[8px] font-mono opacity-40">SYSTEM</div>
                            <div className="text-[10px] font-mono font-bold text-white mt-0.5">{pair.component}</div>
                          </div>
                          <div className="text-center p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <div className="text-[8px] font-mono text-amber-400">ANALOGUE</div>
                            <div className="text-[10px] font-mono font-bold text-amber-300 mt-0.5">{pair.analogy}</div>
                          </div>
                        </div>
                        <p className="text-[10px] font-mono text-white/60 leading-relaxed">{pair.desc}</p>
                      </div>
                      <button className="w-full mt-4 py-2 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 border border-white/5 hover:text-amber-400 text-[8px] font-mono uppercase rounded-xl transition-all">
                        Synthesize Code From Analogy
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. MUTATION ENGINE */}
            {activeMode === 'mutation' && (
              <motion.div 
                key="mutation" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Dna className="w-4 h-4 text-rose-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Mutation Matrix</span>
                  </div>
                  <button 
                    onClick={addMutation}
                    className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9px] font-mono uppercase transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Mutate Concept
                  </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                  <div className="flex-1 bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-mono text-rose-400 font-bold uppercase tracking-wider">MUTATION PARENT</span>
                      <h4 className="text-xs font-bold font-mono text-white/90 mt-1 mb-2">Probability Wave Overlays</h4>
                      <p className="text-[10px] font-mono text-white/50 leading-relaxed">
                        Standard wave equation structures governing the temporal triggers of all active tracks.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex flex-col gap-1 text-[8px] font-mono text-white/30">
                      <div>MUTATION RATIO: 1.48x</div>
                      <div>DIVERGENT GENERATION: GEN-5</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
                    {mutations.map((m) => (
                      <div key={m.id} className="p-3.5 rounded-xl bg-white/5 border border-rose-500/10 hover:border-rose-500/30 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold font-mono text-rose-400">{m.name}</span>
                          <span className="text-[7px] font-mono bg-rose-500/20 text-white px-1 rounded">ACTIVE</span>
                        </div>
                        <p className="text-[10px] font-mono text-white/60 leading-relaxed">{m.change}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. POSSIBILITY GRAPH */}
            {activeMode === 'possibility_graph' && (
              <motion.div 
                key="possibility_graph" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Interactive Possibility Tree</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">Click elements to map structural relationships</span>
                </div>

                <div className="flex-1 bg-[#030303] rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center p-6">
                  {/* Visual SVG Network graph */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" />
                    <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" />
                    <line x1="50%" y1="50%" x2="80%" y2="75%" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" strokeDasharray="3,3" />
                  </svg>

                  <div className="relative w-full h-full flex justify-between items-center">
                    <div className="flex flex-col gap-2 w-1/4">
                      <div className="p-3 bg-white/5 border border-emerald-500/20 rounded-xl text-center cursor-pointer hover:bg-emerald-500/5 transition-all">
                        <span className="text-[8px] font-mono uppercase opacity-40 block">Origin Seed</span>
                        <span className="text-[9px] font-mono font-bold text-white">Quantum DAW</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-1/3">
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-center relative">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <span className="text-[8px] font-mono uppercase text-emerald-400 font-bold block">Converged Node</span>
                        <span className="text-[10px] font-mono font-bold text-white">Temporal Gridless Routing</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 w-1/4">
                      <div className="p-2.5 bg-white/5 border border-white/5 hover:border-emerald-500/20 rounded-xl text-center cursor-pointer transition-all">
                        <span className="text-[8px] font-mono uppercase opacity-40 block">Direction A</span>
                        <span className="text-[9px] font-mono text-white">Biosynthetic Sync</span>
                      </div>
                      <div className="p-2.5 bg-white/5 border border-white/5 hover:border-emerald-500/20 rounded-xl text-center cursor-pointer transition-all border-dashed">
                        <span className="text-[8px] font-mono uppercase opacity-20 block">Direction B</span>
                        <span className="text-[9px] font-mono text-white/30">Gravitational Decays</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. HYPOTHESIS ENGINE */}
            {activeMode === 'hypothesis' && (
              <motion.div 
                key="hypothesis" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">What-If Hypothesis Simulator</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">Radical Scenarios</span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1 no-scrollbar">
                  {[
                    { q: "What if the Timeline ceased to exist entirely?", a: "Composition becomes a purely proximity-based arrangement engine governed by orbit equations.", impact: "HIGH" },
                    { q: "What if Mixer tracks had independent economic budgets for latency?", a: "Allows real-time micro-negotiations of DSP resources based on signal utility metrics.", impact: "EXPERIMENTAL" },
                    { q: "What if delay lines decay into gravitational waves?", a: "Generates cosmic, organic tails that fold frequency arrays into complex microtonal clusters.", impact: "RADICAL" }
                  ].map((hyp, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-wider">HYPOTHESIS #{i+1}</span>
                        <span className="text-[8px] font-mono bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded uppercase font-bold">{hyp.impact}</span>
                      </div>
                      <div className="text-xs font-bold font-mono text-white/90">{hyp.q}</div>
                      <p className="text-[10px] font-mono text-white/50">{hyp.a}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 7. WILD THINKING */}
            {activeMode === 'wild_thinking' && (
              <motion.div 
                key="wild_thinking" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Wild Thinking / Out of Box Mode</span>
                  </div>
                  <span className="text-[9px] font-mono text-orange-400">TEMPLATE_FREE_COGNITION</span>
                </div>

                <div className="flex-1 bg-gradient-to-br from-orange-500/5 to-transparent rounded-2xl p-6 border border-orange-500/10 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                      <span className="text-[10px] font-mono uppercase font-bold text-orange-400">UNCONSTRAINED PROCESS OVERVIEW</span>
                    </div>
                    <p className="text-xs font-mono text-white/70 leading-relaxed">
                      "I am bypassing standard engineering limitations. If we replace structural code files with dynamic,
                      in-memory neural synthesis templates, the interface can adapt itself based on user heart-rate telemetry
                      rather than manual routing. Audio components do not represent modules; they are transient organisms with lifecycles."
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end mt-4">
                    <button className="px-4 py-2 border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl text-[9px] font-mono uppercase tracking-widest transition-all">
                      Synthesize Organic Blueprint
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8. COGNITIVE FUSION ENGINE */}
            {activeMode === 'fusion' && (
              <motion.div 
                key="fusion" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 h-full overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-fuchsia-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white">Cognitive Fusion Dashboard</span>
                  </div>
                  <span className="text-[9px] font-mono text-fuchsia-400">Synchronous Conjoint Stream</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                  
                  {/* Left: Engine Status Monitors */}
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                    <div className="text-[9px] font-mono uppercase opacity-40">Parallel Thinking Nodes</div>
                    <div className="space-y-2.5">
                      {fusionLogs.map((log, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold font-mono text-white/80">{log.engine} Stream</div>
                            <div className="text-[9px] font-mono text-white/50 mt-0.5">{log.log}</div>
                          </div>
                          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                            log.status === 'ACTIVE' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-white/10 text-white/40'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Fusion Outcome */}
                  <div className="bg-fuchsia-500/5 rounded-2xl p-5 border border-fuchsia-500/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Compass className="w-4 h-4 text-fuchsia-400" />
                        <span className="text-[9px] font-mono uppercase text-fuchsia-400 font-bold">Fused Architecture Directive</span>
                      </div>
                      <h4 className="text-xs font-bold font-mono text-white/90 mb-2">Omnipresent Grid-free Synthesis Model</h4>
                      <p className="text-[10px] font-mono text-white/60 leading-relaxed mb-3">
                        Divergent ideas have been processed by critical constraint models, strategic planners, and predictive loads. 
                        The resultant framework uses dynamic orbital temporal tracking, resolving the timeline limitation without sacrificing system throughput.
                      </p>
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                        <div className="flex justify-between text-[8px] font-mono text-white/40">
                          <span>FEASIBILITY INDEX:</span>
                          <span className="text-fuchsia-300 font-bold">84%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-fuchsia-500 w-[84%]" />
                        </div>
                      </div>
                    </div>

                    <button className="w-full mt-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-[10px] font-mono uppercase font-bold tracking-widest transition-all">
                      Deploy Fused Directive to D1
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Creativity Vault Sidebar */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <div className="bg-[#050505] border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-white">Creativity Vault</span>
              </div>
              <span className="text-[9px] font-mono opacity-40">Permanent</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
              {creativityVault.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold font-mono text-white/70">{item.title}</span>
                    <span className="text-[7px] font-mono text-white/30">{item.stamp}</span>
                  </div>
                  <p className="text-[9px] font-mono text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-2">
              <Database className="w-3.5 h-3.5" /> Commit Session to D1
            </button>
          </div>

          {/* Curiosity Engine Panel */}
          <div className="bg-[#050505] border border-white/5 rounded-3xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-white">Curiosity Engine Questions</span>
            </div>

            <div className="space-y-3.5">
              {curiosityQuestions.map((q, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col gap-1.5">
                  <div className="text-[7px] font-mono uppercase text-indigo-400 font-bold">CONSCIOUSNESS QUERY #{idx+1}</div>
                  <p className="text-[10px] font-mono text-white/70 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
