import React, { useState } from 'react';
import { useImageStudio } from './ImageStudioContext';
import { Sliders, HelpCircle, ChevronDown, Wand2, Sparkles, Image as ImageIcon, Layers, RefreshCw, ZoomIn, ShieldCheck } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const {
    promptGenome,
    setPromptGenome,
    triggerAIAction,
    isGenerating,
    addLog
  } = useImageStudio();

  // Collapsible sections state
  const [openSection, setOpenSection] = useState<'genome' | 'style-dna' | 'ai-tools'>('genome');

  const updateGenome = (key: keyof typeof promptGenome, value: any) => {
    setPromptGenome(prev => ({
      ...prev,
      [key]: value
    }));
    addLog(`Recalibrated prompt genome gene: ${String(key).toUpperCase()} ➔ "${value}"`, 'info');
  };

  return (
    <div className="w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full min-h-0 select-none">
      {/* Header title */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-pulse-primary" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">GENOMICS WORKBENCH</span>
        </div>
        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded">AUTO_SYNC</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-900 scrollbar-thin">
        {/* SECTION 1: PROMPT GENOME MODULE */}
        <div>
          <button 
            onClick={() => setOpenSection(openSection === 'genome' ? 'style-dna' : 'genome')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-900/30 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-pulse-primary" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">01 // PROMPT GENOME STUDIO</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${openSection === 'genome' ? 'rotate-180' : ''}`} />
          </button>

          {openSection === 'genome' && (
            <div className="p-4 space-y-4 font-mono text-[10px]">
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">SUBJECT GENE</label>
                <textarea 
                  value={promptGenome.subject}
                  onChange={(e) => updateGenome('subject', e.target.value)}
                  placeholder="e.g. Cybernetic hybrid angel"
                  className="w-full h-16 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[11px] text-zinc-300 placeholder-zinc-700 outline-none focus:border-pulse-primary focus:ring-1 focus:ring-pulse-primary resize-none"
                />
              </div>

              {/* Style preset Selection */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">VISUAL STYLE</label>
                <select 
                  value={promptGenome.style}
                  onChange={(e) => updateGenome('style', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 outline-none cursor-pointer focus:border-pulse-primary"
                >
                  <option value="Surrealist Oil Painting">Surrealist Oil Painting</option>
                  <option value="Ukiyo-e Woodblock Print">Ukiyo-e Woodblock Print</option>
                  <option value="3D Ray-Traced Render">3D Ray-Traced Render [Blender]</option>
                  <option value="Brutalist Matte Painting">Brutalist Matte Painting</option>
                  <option value="Anime Cyberpunk Illustration">Anime Cyberpunk Illustration</option>
                  <option value="Macro Photorealistic">Macro Photorealistic [Fidelity]</option>
                </select>
              </div>

              {/* Grid selectors for Lighting, Mood, Artist, Lens */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold uppercase tracking-wider">LIGHTING</label>
                  <input 
                    type="text" 
                    value={promptGenome.lighting}
                    onChange={(e) => updateGenome('lighting', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold uppercase tracking-wider">MOOD</label>
                  <input 
                    type="text" 
                    value={promptGenome.mood}
                    onChange={(e) => updateGenome('mood', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold uppercase tracking-wider">LENS EFFECT</label>
                  <input 
                    type="text" 
                    value={promptGenome.lens}
                    onChange={(e) => updateGenome('lens', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold uppercase tracking-wider">INFLUENCE ARTIST</label>
                  <input 
                    type="text" 
                    value={promptGenome.artist}
                    onChange={(e) => updateGenome('artist', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300"
                  />
                </div>
              </div>

              {/* Seed & CFG Sliders */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span className="font-bold uppercase tracking-wider">CFG SCALE (GUIDANCE)</span>
                    <span className="text-pulse-primary font-bold">{promptGenome.cfg}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    step="0.5"
                    value={promptGenome.cfg} 
                    onChange={(e) => updateGenome('cfg', parseFloat(e.target.value))}
                    className="w-full accent-pulse-primary bg-zinc-850 h-1 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span className="font-bold uppercase tracking-wider">SEED REGULATION</span>
                    <button 
                      onClick={() => updateGenome('seed', Math.floor(Math.random() * 999999))}
                      className="text-pulse-primary hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> RANDOMIZE
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={promptGenome.seed} 
                    onChange={(e) => updateGenome('seed', parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-300 font-mono"
                  />
                </div>
              </div>

              {/* Aspect Ratio selectors */}
              <div className="space-y-1.5 pt-1">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">ASPECT RATIO SPEC</label>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] font-mono">
                  {['1:1', '16:9', '9:16', '4:3', '3:4'].map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => updateGenome('aspectRatio', ratio)}
                      className={`py-1.5 rounded border transition-all cursor-pointer ${promptGenome.aspectRatio === ratio ? 'bg-pulse-primary/10 border-pulse-primary text-pulse-primary font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">NEGATIVE TOKENS (AVOID)</label>
                <input 
                  type="text" 
                  value={promptGenome.negativePrompt}
                  onChange={(e) => updateGenome('negativePrompt', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-500 text-[9px] focus:text-zinc-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: STYLE DNA DATABASE */}
        <div>
          <button 
            onClick={() => setOpenSection(openSection === 'style-dna' ? 'ai-tools' : 'style-dna')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-900/30 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">02 // STYLE DNA BLENDER</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${openSection === 'style-dna' ? 'rotate-180' : ''}`} />
          </button>

          {openSection === 'style-dna' && (
            <div className="p-4 space-y-4 font-mono text-[10px]">
              <div className="text-zinc-500 text-[9px] leading-normal pb-1 bg-zinc-900/20 p-2 border border-dashed border-zinc-850 rounded">
                Style DNA mixes multiple artistic archetypes concurrently. Recalibrate blender sliders to adjust the final visual outcome.
              </div>

              <StyleDNASlider label="Renaissance Oil Paint Texture" defaultValue={45} />
              <StyleDNASlider label="Structural Brutalist Geometry" defaultValue={30} />
              <StyleDNASlider label="Neon Cyberpunk Exposure" defaultValue={25} />
              <StyleDNASlider label="Biomechanical Organics" defaultValue={10} />
            </div>
          )}
        </div>

        {/* SECTION 3: AI COGNITIVE TOOLS */}
        <div>
          <button 
            onClick={() => setOpenSection(openSection === 'ai-tools' ? 'genome' : 'ai-tools')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-900/30 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">03 // AI TOOLS PORTAL</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${openSection === 'ai-tools' ? 'rotate-180' : ''}`} />
          </button>

          {openSection === 'ai-tools' && (
            <div className="p-4 space-y-3 font-mono text-[10px]">
              {/* 4X Upscaler */}
              <button
                onClick={() => triggerAIAction('UPSCALER')}
                className="w-full p-3 rounded-lg border border-zinc-800 hover:border-amber-500/30 bg-zinc-900 hover:bg-zinc-900/60 transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="p-2 rounded bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                  <ZoomIn className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-zinc-300 text-[11px] group-hover:text-amber-400 transition-colors">AI 4X SUPER-RESOLUTION</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">Upscale frames to extreme 4096px print quality</div>
                </div>
              </button>

              {/* AI Critic */}
              <button
                onClick={() => triggerAIAction('CRITIQUE')}
                className="w-full p-3 rounded-lg border border-zinc-800 hover:border-emerald-500/30 bg-zinc-900 hover:bg-zinc-900/60 transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-zinc-300 text-[11px] group-hover:text-emerald-400 transition-colors">AI CRITIC EVALUATOR</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">Verify composition balance, harmony, and contrast</div>
                </div>
              </button>

              {/* Image Genome Repair */}
              <button
                onClick={() => triggerAIAction('REPAIR')}
                className="w-full p-3 rounded-lg border border-zinc-800 hover:border-purple-500/30 bg-zinc-900 hover:bg-zinc-900/60 transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="p-2 rounded bg-purple-500/10 text-purple-500 group-hover:scale-105 transition-transform shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-zinc-300 text-[11px] group-hover:text-purple-400 transition-colors">IMAGE GENOME REPAIR</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">Filter compression artifacts and correct colors</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// DNA blend sliders
const StyleDNASlider: React.FC<{ label: string; defaultValue: number }> = ({ label, defaultValue }) => {
  const [val, setVal] = useState<number>(defaultValue);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-zinc-500 text-[9px]">
        <span className="font-bold uppercase tracking-wider">{label}</span>
        <span className="text-emerald-400 font-bold">{val}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={val} 
        onChange={(e) => setVal(parseInt(e.target.value))}
        className="w-full accent-emerald-500 bg-zinc-850 h-1 rounded-lg cursor-pointer"
      />
    </div>
  );
};
