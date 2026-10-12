import React, { useState } from 'react';
import { useImageStudio } from './ImageStudioContext';
import { motion } from 'motion/react';
import { Sparkles, Cpu, Sliders, Play, Maximize2, Shield, AlertTriangle, CheckCircle, Download, Shuffle, RefreshCw } from 'lucide-react';

export const Workspace: React.FC = () => {
  const {
    promptGenome,
    isGenerating,
    generateActiveImage,
    activeImageResult,
    triggerAIAction,
    addLog
  } = useImageStudio();

  // Simulated zoom and coordinate offset for Infinite Canvas feel
  const [zoom, setZoom] = useState<number>(100);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleDownload = () => {
    if (!activeImageResult) return;
    addLog('Exporting high-fidelity canvas payload to system downloads...', 'success');
    // Open image in new tab as standard action
    window.open(activeImageResult, '_blank');
  };

  return (
    <div className="flex-1 bg-zinc-950 border-x border-zinc-800 flex flex-col h-full min-h-0 relative overflow-hidden select-none">
      {/* Infinite Grid Background CSS */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px), 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '16px 16px, 64px 64px, 64px 64px',
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      {/* Canvas Controls Overlay (Coordinates, Zoom) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 font-mono text-[10px] text-zinc-500 backdrop-blur-sm">
        <span className="text-zinc-400">COORD:</span>
        <span className="text-white">X: {offset.x}, Y: {offset.y}</span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400">ZOOM:</span>
        <button 
          onClick={() => setZoom(z => Math.max(50, z - 10))} 
          className="text-white hover:text-pulse-primary cursor-pointer px-1 hover:bg-zinc-800 rounded"
        >
          -
        </button>
        <span className="text-white font-bold">{zoom}%</span>
        <button 
          onClick={() => setZoom(z => Math.min(150, z + 10))} 
          className="text-white hover:text-pulse-primary cursor-pointer px-1 hover:bg-zinc-800 rounded"
        >
          +
        </button>
        <button 
          onClick={() => { setZoom(100); setOffset({ x: 0, y: 0 }); }}
          className="text-zinc-500 hover:text-white ml-2 uppercase text-[9px] hover:bg-zinc-800 px-1 rounded"
        >
          RESET
        </button>
      </div>

      {/* Nodes Canvas container */}
      <div 
        className="flex-1 flex items-center justify-center relative p-8 overflow-auto scrollbar-none"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
      >
        {/* Node Connection SVG wires */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <line x1="28%" y1="50%" x2="52%" y2="50%" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="72%" y1="50%" x2="88%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* NODE 1: PROMPT GENOME MODULE */}
        <div className="absolute left-[2%] top-[12%] w-[25%] bg-zinc-900/95 border border-zinc-800 rounded-xl p-4 font-mono shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pulse-primary" />
              <span className="text-xs font-bold text-white tracking-wider">PROMPT_GENOME_NODE</span>
            </div>
            <span className="text-[9px] text-zinc-500 bg-zinc-850 px-1.5 py-0.5 rounded">ACTIVE</span>
          </div>
          <div className="space-y-3">
            <GenomeTag label="SUBJECT" value={promptGenome.subject} />
            <GenomeTag label="STYLE" value={promptGenome.style} />
            <GenomeTag label="LIGHTING" value={promptGenome.lighting} />
            <GenomeTag label="MOOD" value={promptGenome.mood} />
            <GenomeTag label="LENS" value={promptGenome.lens} />
            <GenomeTag label="ARTISTS" value={promptGenome.artist} />
            
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[9px] text-zinc-500">
              <span>SEED: {promptGenome.seed}</span>
              <span>CFG: {promptGenome.cfg}</span>
            </div>
          </div>
        </div>

        {/* NODE 2: LATENT MATRIX GENERATOR & PREVIEW */}
        <div className="absolute left-[31%] top-[8%] w-[38%] bg-zinc-900/95 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative group">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 font-mono">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-pulse-primary" />
              <span className="text-xs font-bold text-white tracking-wide">NEURAL_RENDER_FRAME</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-zinc-500">{promptGenome.aspectRatio}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Active Canvas Display Area */}
          <div className="aspect-square bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative group/image">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10 p-6">
                <RefreshCw className="w-8 h-8 text-pulse-primary animate-spin mb-4" />
                <span className="font-mono text-xs text-white tracking-widest animate-pulse">SYNTHESIZING LATENT GENES...</span>
                <span className="font-mono text-[9px] text-zinc-500 mt-2 text-center">Interpreting prompt structure & calculating tensor maps</span>
                {/* Simulated Loading Bar */}
                <div className="w-48 h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-pulse-primary animate-progress-bar rounded-full"></div>
                </div>
              </div>
            ) : null}

            {activeImageResult ? (
              <img 
                src={activeImageResult} 
                alt="Active Synthesis Viewport" 
                className="w-full h-full object-cover select-none pointer-events-none" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center font-mono text-[10px] text-zinc-600">
                <AlertTriangle className="w-6 h-6 text-zinc-700 mb-2" />
                ACTIVE CANVAS EMPTY // DESCRIBE AND SYNTHESIZE GENOME
              </div>
            )}

            {/* Float control overlay on image hover */}
            <div className="absolute bottom-3 right-3 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1.5">
              <button 
                onClick={handleDownload}
                title="Export high-fidelity render"
                className="p-1.5 bg-black/80 hover:bg-pulse-primary border border-zinc-850 hover:border-pulse-primary/40 rounded-lg text-white transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={generateActiveImage}
                title="Re-synthesize latent genes"
                className="p-1.5 bg-black/80 hover:bg-pulse-primary border border-zinc-850 hover:border-pulse-primary/40 rounded-lg text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Trigger Pipeline Button bar */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={generateActiveImage}
              disabled={isGenerating}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-mono text-xs font-bold tracking-widest uppercase transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              SYNTHESIZE IMMUTABLE GENE
            </button>
          </div>
        </div>

        {/* NODE 3: AI CRITIC & QUALITY REVIEW */}
        <div className="absolute right-[2%] top-[10%] w-[25%] bg-zinc-900/95 border border-zinc-800 rounded-xl p-4 font-mono shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-white tracking-wider">AI_CRITIC_BOT_V2</span>
            </div>
            <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded">ACTIVE</span>
          </div>

          <div className="space-y-4">
            {/* Score Breakdown */}
            <div className="space-y-2.5">
              <CriticStat label="COMPOSITION" score={94} color="emerald" />
              <CriticStat label="COLOR_HARMONY" score={88} color="emerald" />
              <CriticStat label="PIXEL_FIDELITY" score={92} color="emerald" />
              <CriticStat label="STYLE_DNA_MATCH" score={95} color="emerald" />
            </div>

            {/* Critique recommendation checklist */}
            <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-850 text-[10px] space-y-2 text-zinc-400">
              <div className="font-bold text-zinc-300 text-[11px] mb-1">CRITIQUE FEEDBACK:</div>
              <div className="flex gap-2 items-start">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Subject is perfectly centered and sharp.</span>
              </div>
              <div className="flex gap-2 items-start text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Minor chromatic distortion on edges. Run AI Repair to restore.</span>
              </div>
            </div>

            <button 
              onClick={() => triggerAIAction('REPAIR')}
              className="w-full py-1.5 bg-zinc-850 hover:bg-zinc-800 hover:text-white border border-zinc-800 rounded text-[10px] tracking-widest text-zinc-400 transition-colors cursor-pointer"
            >
              INVOKE AI REPAIR PIPELINE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for Genome Node tags
const GenomeTag: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="p-2 rounded bg-zinc-950/60 border border-zinc-850 flex flex-col min-w-0">
      <span className="text-[9px] text-zinc-600 font-bold tracking-widest mb-0.5">{label}</span>
      <span className="text-[10px] text-zinc-300 font-medium leading-relaxed break-words">{value}</span>
    </div>
  );
};

// Sub-component for Critic Score bar
const CriticStat: React.FC<{ label: string; score: number; color: string }> = ({ label, score }) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] text-zinc-500 font-bold tracking-wider">
        <span>{label}</span>
        <span className="text-white">{score}%</span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};
