import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Image as ImageIcon, Crop, Sliders, Palette, Layers, Wand2, Download, Search, Maximize, PaintBucket, Folder, Activity, CheckCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import VoiceInputButton from '../../components/VoiceInputButton';
import { FormSkeleton } from '../../components/Skeleton';
import { QuantumImageOrchestrator } from '../../components/studios/QuantumImageOrchestrator';
import { AzrailOrchestrator } from '../../components/studios/AzrailOrchestrator';

import { useStudioState } from '../../hooks/useStudioState';

import { useUser } from '../../contexts/UserContext';
import { useHistory } from '../../contexts/HistoryContext';
import { toast } from 'sonner';

export default function ImageStudioPanel({ isLight }: { isLight?: boolean }) {
  const { t } = useLanguage();
  const { refreshStatus } = useUser();
  const { addToHistory } = useHistory();
  const [orchestratorResult, setOrchestratorResult] = useState<{ analysis: string; assignedAgents: Record<string, string> } | null>(null);
  const [orchestratorPrompt, setOrchestratorPrompt] = useState('');
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'tools' | 'quantum_copilot'>('generate');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [model, setModel] = useState('@cf/black-forest-labs/flux-1-schnell');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '3:4' | '4:3'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  const [suiteFunctions, setSuiteFunctions] = useState<Record<string, boolean>>({
    i101: false, i102: false, i103: false, i104: false, i105: false,
    i106: false, i107: false, i108: false, i109: false, i110: false,
    i111: false, i112: false, i113: false, i114: false, i115: false,
    i116: false, i117: false, i118: false, i119: false, i120: false
  });

  const playBeep = (freq = 800, duration = 0.06, type: OscillatorType = 'sine') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context blocked
    }
  };

  const addTerminalLog = (msg: string) => {
    console.log(`[IMAGE TERMINAL]: ${msg}`);
  };

  useStudioState('image', { prompt, result }, (config) => {
    if (config.prompt !== undefined) setPrompt(config.prompt);
    if (config.result !== undefined) setResult(config.result);
  });
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, aspectRatio, imageSize })
      });
      
      const data = await response.json();
      
      if (response.status === 429) {
        toast.error("Дневной лимит запросов исчерпан. Лимиты задаёт владелец в Cloudflare.");
        setGenerating(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      
      addToHistory({
        type: 'image',
        title: `Generated Image: ${prompt.substring(0, 20)}...`,
        description: prompt,
        previewUrl: data.imageUrl,
        metadata: { prompt, model }
      });
      refreshStatus();
      
      setResult({
        title: "Generated Concept",
        imageUrl: data.imageUrl,
        metadata: {
          resolution: data.metadata?.resolution || imageSize,
          model: data.metadata?.model || model,
          steps: "4"
        }
      });
    } catch (err: any) {
      alert(`Error generating image: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full h-full">
      {/* Sidebar Tools */}
      <div className="flex w-full lg:w-64 shrink-0 flex-col gap-4 lg:h-full">
        <div className={`border rounded-2xl p-4 flex-1 flex flex-col min-h-0 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
           <div className={`flex gap-2 border-b pb-4 mb-4 shrink-0 overflow-x-auto ${isLight ? 'border-gray-200' : 'border-white/5'} no-scrollbar`}>
             <button 
               onClick={() => setActiveTab('quantum_copilot')}
               className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'quantum_copilot' ? 'border-purple-500 text-purple-400 font-bold' : (isLight ? 'border-transparent text-gray-500 hover:text-purple-400' : 'border-transparent text-white/40 hover:text-white/75')}`}
             >
               ★ Quantum Co-Pilot
             </button>
             <button 
               onClick={() => setActiveTab('generate')}
               className={`flex-1 text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'generate' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
             >
               Generate
             </button>
             <button 
               onClick={() => setActiveTab('edit')}
               className={`flex-1 text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'edit' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
             >
               Edit
             </button>
             <button 
               onClick={() => setActiveTab('tools')}
               className={`flex-1 text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'tools' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
             >
               Tools
             </button>
           </div>
           
           <div className="flex flex-col gap-2 overflow-y-auto pr-2">
             {activeTab === 'quantum_copilot' ? (
               <>
                 <div className="p-3 rounded-xl border border-dashed border-purple-500/20 bg-purple-500/5">
                   <span className="text-[10px] font-mono text-purple-400 block mb-1 uppercase font-bold">Quantum Mode Active</span>
                   <p className="text-[9px] text-zinc-500 font-mono">Neural orchestrator engaged for 2026 image synthesis.</p>
                 </div>
                 <ToolButton icon={<Cpu />} label="Kernel Control" desc="Access 2026 functions" isLight={isLight} active />
                 <ToolButton icon={<Activity />} label="Swarm Status" desc="Monitor agents" isLight={isLight} />
               </>
             ) : activeTab === 'generate' ? (
               <>
                 <ToolButton icon={<Wand2 />} label="Text-to-Image" desc="Prompt to image" isLight={isLight} active />
                 <ToolButton icon={<ImageIcon />} label="Image-to-Image" desc="Change style" isLight={isLight} />
                 <ToolButton icon={<Palette />} label="Style Presets" desc="Anime, Realism..." isLight={isLight} />
                 <ToolButton icon={<Layers />} label="Batch Generate" desc="10-50 variations" isLight={isLight} />
                 <ToolButton icon={<Sliders />} label="ControlNet" desc="Pose/Depth map" isLight={isLight} />
               </>
             ) : activeTab === 'edit' ? (
               <>
                 <ToolButton icon={<Crop />} label="Inpainting" desc="Edit/replace part" isLight={isLight} />
                 <ToolButton icon={<Maximize />} label="Outpainting" desc="Expand borders" isLight={isLight} />
                 <ToolButton icon={<PaintBucket />} label="Background Remover" desc="Cut out subject" isLight={isLight} />
                 <ToolButton icon={<Search />} label="Face Swap" desc="Swap faces" isLight={isLight} />
               </>
             ) : (
               <>
                 <ToolButton icon={<Sliders />} label="Upscaler 4x" desc="Enhance quality" isLight={isLight} />
                 <ToolButton icon={<Folder />} label="Brand Kit" desc="Brand identity" isLight={isLight} />
                 <ToolButton icon={<Download />} label="Vector Export" desc="Export to SVG" isLight={isLight} />
                 <ToolButton icon={<Search />} label="Asset Organizer" desc="Manage files" isLight={isLight} />
               </>
             )}
           </div>
        </div>
      </div>

       {/* Main Area */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
         {activeTab === 'quantum_copilot' ? (
           <div className="flex-1 overflow-y-auto pr-1 space-y-6">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'}`}>
                 <div className="flex items-center gap-3 mb-4 text-indigo-400">
                   <Sparkles className="w-5 h-5" />
                   <h4 className="text-xs font-mono uppercase tracking-widest font-bold">Image Directives</h4>
                 </div>
                 <textarea
                   value={orchestratorPrompt}
                   onChange={(e) => setOrchestratorPrompt(e.target.value)}
                   placeholder="Enter your master image directive (e.g. 'Generate a surreal landscape with floating islands and neon waterfalls')..."
                   className={`w-full h-32 p-4 rounded-xl border font-mono text-xs focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all ${
                     isLight ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-black/60 border-white/5 text-white/90'
                   }`}
                 />
               </div>
               
               <AzrailOrchestrator 
                 request={orchestratorPrompt} 
                 onComplete={(res) => setOrchestratorResult(res)}
                 isLight={isLight}
               />
             </div>

             <AnimatePresence>
               {orchestratorResult && (
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`p-6 rounded-2xl border ${isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/5 border-emerald-500/10'}`}
                 >
                   <div className="flex items-center gap-3 mb-3 text-emerald-400">
                     <CheckCircle className="w-5 h-5" />
                     <h4 className="text-xs font-mono uppercase tracking-widest font-bold">Orchestration Complete</h4>
                   </div>
                   <p className={`text-sm mb-4 ${isLight ? 'text-gray-700' : 'text-white/80'}`}>{orchestratorResult.analysis}</p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     {Object.entries(orchestratorResult.assignedAgents).map(([role, agent]) => (
                       <div key={role} className={`p-3 rounded-lg border flex flex-col gap-1 ${isLight ? 'bg-white border-emerald-100' : 'bg-black/40 border-emerald-500/20'}`}>
                         <span className="text-[9px] font-mono uppercase opacity-50">{role} Agent</span>
                         <span className="text-xs font-bold text-emerald-400">{agent}</span>
                       </div>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <div className="pt-6 border-t border-white/5">
               <div className="flex items-center gap-3 mb-6 opacity-40">
                 <div className="h-px flex-1 bg-white" />
                 <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Quantum Image Suite</span>
                 <div className="h-px flex-1 bg-white" />
               </div>
               <QuantumImageOrchestrator 
                 t={t}
                 playBeep={playBeep}
                 addTerminalLog={addTerminalLog}
                 suiteFunctions={suiteFunctions}
                 setSuiteFunctions={setSuiteFunctions}
               />
             </div>
           </div>
         ) : (
           <>
             <div className="w-full xl:w-1/2 flex flex-col gap-4">
               <div className={`border rounded-2xl p-6 flex-1 flex flex-col relative overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                 <h3 className={`text-lg font-medium mb-2 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>Image Concept</h3>
                 <p className={`text-xs font-mono mb-6 ${isLight ? 'text-gray-500' : 'text-[#E0E0E0]/60'}`}>Describe the image you want to generate.</p>
                 
                 <form onSubmit={handleGenerate} className="flex flex-col gap-4 flex-1">
										{/* Model, Aspect Ratio, and Sizing Settings */}
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
											<div className="flex flex-col gap-1.5">
												<label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Model</label>
												<select 
													value={model} 
													onChange={(e: any) => setModel(e.target.value)}
													className={`text-xs font-mono p-2 rounded-lg border outline-none transition-colors ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-[#0a0a0a] border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
												>
													<option value="@cf/black-forest-labs/flux-1-schnell">FLUX.1 Schnell · Cloudflare</option>
												</select>
											</div>

											<div className="flex flex-col gap-1.5">
												<label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Aspect Ratio</label>
												<select 
													disabled title="Размер задаётся моделью FLUX" value={aspectRatio} 
													onChange={(e: any) => setAspectRatio(e.target.value)}
													className={`text-xs font-mono p-2 rounded-lg border outline-none transition-colors ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-[#0a0a0a] border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
												>
													<option value="1:1">1:1 Square</option>
													<option value="16:9">16:9 Landscape</option>
													<option value="9:16">9:16 Portrait</option>
													<option value="4:3">4:3 Standard</option>
													<option value="3:4">3:4 Vertical</option>
												</select>
											</div>

											<div className="flex flex-col gap-1.5">
												<label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Resolution</label>
												<select 
													value={imageSize} 
													onChange={(e: any) => setImageSize(e.target.value)}
													disabled
													className={`text-xs font-mono p-2 rounded-lg border outline-none transition-colors ${true ? 'opacity-40 cursor-not-allowed' : ''} ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-[#0a0a0a] border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
												>
													<option value="1K">Размер модели</option>
													<option value="2K">2K Ultra</option>
													<option value="4K">4K Cinematic</option>
												</select>
											</div>
										</div>
                   <div className="relative flex-1 flex flex-col">
                     <textarea 
                       value={prompt}
                       onChange={e => setPrompt(e.target.value)}
                       placeholder="e.g. A cyberpunk city street at night, neon lights, 4k, photorealistic..."
                       className={`flex-1 border rounded-xl p-4 pr-12 text-sm outline-none transition-colors resize-none font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                     />
                     <div className="absolute right-3 bottom-3 z-10">
                       <VoiceInputButton value={prompt} onChange={setPrompt} isLight={isLight} size="sm" />
                     </div>
                   </div>
                   <button 
                     type="submit"
                     disabled={generating || !prompt}
                     className={`bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl py-3 flex items-center justify-center gap-2 font-medium tracking-wide transition-colors`}
                   >
                     {generating ? (
                       <span className="flex items-center gap-2 animate-pulse">
                         <Wand2 className="w-4 h-4" /> GENERATING...
                       </span>
                     ) : (
                       <span className="flex items-center gap-2">
                         <Wand2 className="w-4 h-4" /> Generate
                       </span>
                     )}
                   </button>
                 </form>
               </div>
             </div>

             <div className="w-full xl:w-1/2 flex flex-col gap-4">
               <div className={`border rounded-2xl p-6 flex-1 flex flex-col ${isLight ? 'bg-white border-gray-200' : 'bg-[#0D0D0D] border-white/5'}`}>
                  <h3 className={`text-sm font-mono tracking-widest uppercase mb-4 flex items-center gap-2 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    <ImageIcon className="w-4 h-4" />
                    Preview
                  </h3>
                  
                  {!result ? (
                    <div className={`flex-1 flex items-center justify-center border border-dashed rounded-xl font-mono text-xs text-center p-6 ${isLight ? 'border-gray-200 text-gray-400' : 'border-white/10 text-[#E0E0E0]/40'}`}>
                      WAITING FOR INPUT...
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                      <div className="flex-1 rounded-xl overflow-hidden bg-black/50 border border-white/10 relative">
                         <img src={result.imageUrl} alt="Result" className="w-full h-full object-cover" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono">
                         <div className={`p-2 rounded border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                           <span className={`block mb-1 opacity-50`}>RES</span>
                           {result.metadata.resolution}
                         </div>
                         <div className={`p-2 rounded border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                           <span className={`block mb-1 opacity-50`}>MODEL</span>
                           {result.metadata.model}
                         </div>
                         <div className={`p-2 rounded border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                           <span className={`block mb-1 opacity-50`}>STEPS</span>
                           {result.metadata.steps}
                         </div>
                      </div>
                    </motion.div>
                  )}
               </div>
             </div>
           </>
         )}
      </div>
    </div>
  );
}

function ToolButton({ icon, label, desc, isLight, active }: any) {
  return (
    <button className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${active ? (isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/20') : (isLight ? 'bg-gray-50 border-transparent hover:bg-gray-100' : 'bg-white/5 border-transparent hover:bg-white/10')}`}>
       <div className={`mt-0.5 ${active ? 'text-indigo-500' : (isLight ? 'text-gray-500' : 'text-gray-400')}`}>
         {React.cloneElement(icon, { className: 'w-4 h-4' })}
       </div>
       <div>
         <div className={`text-xs font-medium mb-0.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>{label}</div>
         <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{desc}</div>
       </div>
    </button>
  );
}
