import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, Layers, Zap, Database, FileCode, Play, 
  Settings, Share2, Activity, Cpu, Wand2, 
  ChevronRight, BarChart3, Disc, ListMusic, Upload,
  AlertCircle, CheckCircle
} from 'lucide-react';
import { ProjectIR, RemixPlan, ProductionPattern } from '../../types';
import { useKnowledgeHub } from '../../contexts/KnowledgeHubContext';

interface TrackGroup {
  name: string;
  count: number;
  color: string;
  elements: string[];
}

const GENRE_RULES = {
  melodic_house_techno: {
    bpm_range: [120, 128],
    key_preference: ['Am', 'Dm', 'Em', 'Cm'],
    structure: [
      { section: 'Intro', bars: 16, elements: ['kick', 'minimal_perc', 'atmosphere'] },
      { section: 'Buildup', bars: 8, elements: ['+ layers', 'riser', 'filter_sweep'] },
      { section: 'Drop', bars: 32, elements: ['full_arrangement', 'bass', 'lead'] },
      { section: 'Breakdown', bars: 16, elements: ['pads', 'melody', 'no_kick'] },
      { section: 'Drop 2', bars: 32, elements: ['variation_of_drop'] },
      { section: 'Outro', bars: 16, elements: ['strip_back', 'atmosphere'] }
    ]
  }
};

const TRACK_STRUCTURE: TrackGroup[] = [
  { name: 'Rhythm Section', count: 10, color: 'indigo', elements: ['Kick', 'Sub Kick', 'Snare/Clap', 'Hi-hats', 'Percussion', 'Drum Bus'] },
  { name: 'Bass Cluster', count: 6, color: 'blue', elements: ['Sub Bass', 'Mid Bass', 'Top Layer', 'Bass Bus'] },
  { name: 'Melodic Stack', count: 15, color: 'purple', elements: ['Lead Synth', 'Chord Pads', 'Arp', 'Counter-melody', 'Stabs'] },
  { name: 'Atmosphere', count: 10, color: 'cyan', elements: ['Textures', 'Noise', 'Reverb Returns', 'Field Rec'] },
  { name: 'Vocals', count: 6, color: 'pink', elements: ['Lead Vocal', 'Chops', 'FX Tails', 'Backing'] },
  { name: 'Infrastructure', count: 8, color: 'emerald', elements: ['Risers', 'Downlifters', 'Impacts', 'Automation'] }
];

export const MusicIntelligenceAgent: React.FC<{ isLight?: boolean }> = ({ isLight }) => {
  const { d1 } = useKnowledgeHub();
  const [activeStep, setActiveStep] = useState<'upload' | 'analyze' | 'generate'>('upload');
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(0.5);
  const [selectedGenre] = useState('melodic_house_techno');
  const [isUploading, setIsUploading] = useState(false);
  const [projectIR, setProjectIR] = useState<ProjectIR | null>(null);
  const [remixPlan, setRemixPlan] = useState<RemixPlan | null>(null);
  const [retrievedPatterns, setRetrievedPatterns] = useState<ProductionPattern[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setAnalysisLogs(["[BOOT]: Music Intelligence Agent v4.1 initialized", `📂 Uploading ${file.name}...`]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/music/analyze-als', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to parse project template');

      const data = await response.json();
      setProjectIR(data.projectIR);
      setActiveStep('analyze');
      
      const logs = [
        "🔍 Parsing XML metadata structure...",
        `🎼 Detecting Master BPM: ${data.projectIR.bpm}`,
        `🎹 Identified Key: ${data.projectIR.keyRoot} (${data.projectIR.keyScale})`,
        `🧬 Classifying ${data.projectIR.tracks.length} track nodes into functional clusters...`,
        "✅ Internal Representation (IR) constructed."
      ];

      for (const log of logs) {
        await new Promise(r => setTimeout(r, 600));
        setAnalysisLogs(prev => [...prev, log]);
      }
      
      setTimeout(() => setActiveStep('generate'), 1000);
    } catch (err: any) {
      setError(err.message);
      setAnalysisLogs(prev => [...prev, `❌ [ERROR]: ${err.message}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const generateRemixPlan = async () => {
    if (!projectIR) return;
    
    setIsUploading(true);
    setAnalysisLogs(prev => [...prev, "🧠 Querying Knowledge Hub (D1) for production patterns..."]);
    
    try {
      // Query mock D1 for patterns matching the genre and intensity
      const { results: patterns } = await d1.prepare(
        "SELECT * FROM patterns WHERE genre = ? ORDER BY intensity ASC"
      ).bind(selectedGenre, intensity).all<ProductionPattern>();
      
      setRetrievedPatterns(patterns);
      setAnalysisLogs(prev => [...prev, `📚 Retrieved ${patterns.length} patterns from Knowledge Hub.`]);

      setAnalysisLogs(prev => [...prev, "🧠 Synthesizing remix plan via Gemini-2.0-Flash..."]);
      
      const response = await fetch('/api/music/remix-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIR,
          genreRules: {
            ...GENRE_RULES.melodic_house_techno,
            injectedPatterns: patterns // Pass retrieved patterns to the model
          },
          intensity
        }),
      });

      if (!response.ok) throw new Error('Failed to generate remix plan');

      const data = await response.json();
      setRemixPlan(data.plan);
      setAnalysisLogs(prev => [...prev, "✅ Remix plan generated successfully."]);
    } catch (err: any) {
      setError(err.message);
      setAnalysisLogs(prev => [...prev, `❌ [ERROR]: ${err.message}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const getTrackGroups = () => {
    if (!projectIR) return TRACK_STRUCTURE;
    
    // Map real project tracks to the structure
    return TRACK_STRUCTURE.map(group => {
      const matchingTracks = projectIR.tracks.filter(t => t.role.toLowerCase().startsWith(group.name.toLowerCase().split(' ')[0].toLowerCase()));
      return {
        ...group,
        count: matchingTracks.length,
        elements: matchingTracks.length > 0 ? matchingTracks.map(t => t.name) : group.elements
      };
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <Cpu className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className={`text-xl font-bold tracking-tight uppercase font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Music Intelligence Agent
              </h2>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                Structural Genre Parser // Multi-Track AI Engine
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${isLight ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <Database className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase">Knowledge Base: Active</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Workflow Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Template Input */}
          <div className={`p-5 rounded-2xl border ${activeStep === 'upload' ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-3 mb-4">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest">1. DAW Template</h3>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".als,.logicx,.bwproject,.dawp"
            />

            <div className="space-y-3">
              {['Ableton (.als)', 'Logic Pro (.logicx)', 'Bitwig (.bwproject)', 'DAWProject (.dawp)'].map(ext => (
                <button 
                  key={ext}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-mono transition-all ${
                    isLight 
                      ? 'bg-white border-gray-200 hover:border-indigo-400' 
                      : 'bg-black/40 border-white/10 hover:border-indigo-500/50 text-white/60 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {ext.includes('.als') && <Upload className="w-3 h-3 opacity-50" />}
                    {ext}
                  </span>
                  <ChevronRight className="w-3 h-3 opacity-30" />
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Analyzer Logs */}
          <div className={`p-5 rounded-2xl border ${activeStep === 'analyze' ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest">2. IR Analysis</h3>
            </div>
            <div className="h-40 overflow-y-auto space-y-1 font-mono text-[9px] custom-scrollbar">
              {analysisLogs.length === 0 ? (
                <div className="opacity-20 italic">Waiting for project stream...</div>
              ) : (
                analysisLogs.map((log, i) => (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={i} className="text-indigo-300">
                    <span className="opacity-30 mr-2">{'>'}</span>
                    {log}
                  </motion.div>
                ))
              )}
              {isUploading && activeStep === 'analyze' && (
                <div className="animate-pulse text-white mt-2">Processing Project...</div>
              )}
            </div>
          </div>

          {/* Step 3: Remix Planner */}
          <div className={`p-5 rounded-2xl border ${activeStep === 'generate' ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest">3. Remix Planner</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-mono uppercase opacity-50">Intensity Level</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-400">{(intensity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={intensity}
                  onChange={(e) => setIntensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-indigo-500/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <button 
                onClick={generateRemixPlan}
                disabled={!projectIR || isUploading}
                className={`w-full text-white py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${
                  !projectIR ? 'bg-white/5 cursor-not-allowed text-white/20' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isUploading ? (
                  <Activity className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 fill-current" />
                )}
                Synthesize Remix Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Remix Plan Display */}
      {remixPlan && (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className={`text-sm font-bold tracking-tight uppercase font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Generated Remix Actions
                </h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold">Optimization Complete</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {remixPlan.actions.map((action, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} flex flex-col gap-3 transition-all hover:border-indigo-500/30`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold border border-indigo-500/20">
                      {action.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {action.target_tracks.map((t, j) => (
                      <span key={j} className="text-[8px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-60">
                    {action.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* D1 Retrieved Patterns */}
          {retrievedPatterns.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-5 h-5 text-purple-400" />
                <h3 className={`text-sm font-bold tracking-tight uppercase font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Knowledge Hub: D1 Reference Data
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {retrievedPatterns.map((pattern, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold uppercase text-purple-400">{pattern.pattern_type}</span>
                      <span className="text-[8px] font-mono opacity-30 tracking-widest">ID: {pattern.id}</span>
                    </div>
                    <p className="text-[11px] font-medium">{pattern.description}</p>
                    <div className="mt-2 p-2 bg-black/20 rounded-lg font-mono text-[8px] text-white/40 overflow-hidden whitespace-nowrap text-ellipsis">
                      PARAMS: {pattern.parameters}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Structural Scheme Visualization */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className={`text-sm font-bold tracking-tight uppercase font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Master Project Architecture
            </h3>
          </div>
          
          <div className="space-y-3">
            {getTrackGroups().map((group, i) => (
              <div key={i} className="group relative">
                <div className={`p-3 rounded-xl border transition-all hover:translate-x-1 ${
                  isLight ? 'bg-gray-50 border-gray-100 hover:bg-gray-100' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${group.color}-400`} />
                      <span className="text-[10px] font-bold uppercase font-mono">{group.name}</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-40">{group.count} Tracks Detected</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.elements.slice(0, 8).map((el, j) => (
                      <span key={j} className="text-[8px] font-mono px-1.5 py-0.5 bg-black/20 border border-white/5 rounded text-white/40">
                        {el}
                      </span>
                    ))}
                    {group.elements.length > 8 && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 opacity-30">+{group.elements.length - 8} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-gray-100 shadow-sm' : 'bg-black/40 border-white/5 backdrop-blur-xl'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Disc className="w-5 h-5 text-emerald-400" />
            <h3 className={`text-sm font-bold tracking-tight uppercase font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Genre Knowledge Base
            </h3>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-black/60 border-white/5'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Ruleset: Melodic Techno</span>
                <Settings className="w-3 h-3 opacity-30" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase opacity-40">BPM Range</span>
                  <p className="text-xs font-mono">{GENRE_RULES.melodic_house_techno.bpm_range.join(' - ')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase opacity-40">Prefered Keys</span>
                  <p className="text-xs font-mono">{GENRE_RULES.melodic_house_techno.key_preference.join(', ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono uppercase opacity-40">Phase Arrangement</span>
                <div className="flex gap-1 h-8">
                  {GENRE_RULES.melodic_house_techno.structure.map((s, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-indigo-500/20 border border-indigo-500/30 rounded-md relative group/seg"
                      title={`${s.section} (${s.bars} bars)`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/seg:opacity-100 transition-opacity">
                         <span className="text-[7px] font-mono font-bold uppercase">{s.bars}B</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[7px] font-mono opacity-30 uppercase tracking-tighter">
                  {GENRE_RULES.melodic_house_techno.structure.map((s, i) => (
                    <span key={i} className="flex-1 text-center truncate">{s.section}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                 <BarChart3 className="w-4 h-4 text-purple-400" />
                 <div>
                   <p className="text-[9px] font-mono uppercase opacity-40">Harmonic Tension</p>
                   <p className="text-[10px] font-mono">Dorian/Aeolian Modal Logic</p>
                 </div>
               </div>
               <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                 <ListMusic className="w-4 h-4 text-blue-400" />
                 <div>
                   <p className="text-[9px] font-mono uppercase opacity-40">Groove Quantize</p>
                   <p className="text-[10px] font-mono">8-12% Swing Applied</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
