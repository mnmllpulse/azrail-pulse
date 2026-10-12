import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Wand2, Share2, Plus, ArrowRight, Settings, Sliders, Zap, Activity, Database } from 'lucide-react';
import { useMusicOS } from './OSKernel';

export const ModularLab: React.FC<{ isLight?: boolean }> = ({ isLight }) => {
  const { state, addSynthNode } = useMusicOS();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePatch = () => {
    if (!prompt) return;
    setIsGenerating(true);
    // Mock generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setPrompt('');
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* AI Patch Generator Header */}
      <div className={`p-8 rounded-[40px] border ${isLight ? 'bg-white border-gray-100' : 'bg-black/40 border-white/5 backdrop-blur-3xl'}`}>
         <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-purple-500/20 rounded-3xl border border-purple-500/30">
               <Cpu className="w-8 h-8 text-purple-400" />
            </div>
            <div>
               <h2 className="text-2xl font-bold font-mono tracking-tighter uppercase">Modular Synth Lab</h2>
               <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.3em]">AI Patch Synthesis Engine v4.2</p>
            </div>
         </div>

         <div className="relative group">
            <input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your sound: 'Deep atmospheric lead with melodic techno character'..."
              className={`w-full p-6 pr-40 rounded-2xl border text-sm font-mono transition-all outline-none ${
                isLight 
                  ? 'bg-gray-50 border-gray-200 focus:border-purple-400' 
                  : 'bg-black/60 border-white/10 focus:border-purple-500/50 text-white'
              }`}
            />
            <div className="absolute right-3 top-3 bottom-3 flex items-center gap-2">
               <button 
                 onClick={handleGeneratePatch}
                 disabled={isGenerating || !prompt}
                 className="h-full px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-3 transition-all disabled:opacity-50"
               >
                 {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                 <span className="text-xs font-bold font-mono uppercase">Generate Patch</span>
               </button>
            </div>
         </div>
      </div>

      {/* Modular Routing Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
         {/* Left Rail: Library */}
         <div className="lg:col-span-3 space-y-4">
            <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white' : 'bg-black/40 border-white/5'} h-full`}>
               <h3 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-6 flex items-center justify-between">
                  Components <Plus className="w-3 h-3" />
               </h3>
               
               {['Generators', 'Modulators', 'Filters', 'Effects', 'Logic'].map(cat => (
                 <div key={cat} className="mb-6">
                    <span className="text-[8px] font-mono text-purple-400 uppercase font-bold mb-3 block">{cat}</span>
                    <div className="space-y-2">
                       {Array.from({ length: 3 }).map((_, i) => (
                         <div key={i} className={`p-3 rounded-xl border border-white/5 bg-white/5 text-[10px] font-mono flex items-center justify-between group hover:bg-white/10 transition-all cursor-grab`}>
                            <span className="opacity-60">Module Type {i+1}</span>
                            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Middle: Canvas */}
         <div className="lg:col-span-6 relative overflow-hidden p-8 rounded-[40px] bg-black/60 border border-white/5">
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                 style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} 
            />
            
            <div className="flex flex-wrap gap-8 justify-center items-center h-full">
               {state.synthPatch.map((node, i) => (
                 <React.Fragment key={node.id}>
                    <motion.div 
                      layoutId={node.id}
                      className={`w-40 p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'} shadow-2xl relative group`}
                    >
                       <div className="flex items-center justify-between mb-3">
                          <span className="text-[8px] font-mono uppercase text-purple-400 font-bold">{node.type}</span>
                          <Settings className="w-3 h-3 opacity-20 group-hover:opacity-100" />
                       </div>
                       <h4 className="text-xs font-bold font-mono mb-4">{node.name}</h4>
                       
                       <div className="space-y-2">
                          {Object.entries(node.params).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center text-[8px] font-mono opacity-40">
                               <span>{key}</span>
                               <span className="text-white/60">{val}</span>
                            </div>
                          ))}
                       </div>

                       {/* Jack Points */}
                       <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-purple-500/50 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                       </div>
                       <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-purple-500/50 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                       </div>
                    </motion.div>
                    {i < state.synthPatch.length - 1 && (
                      <div className="flex items-center">
                        <ArrowRight className="w-6 h-6 text-purple-500/20" />
                      </div>
                    )}
                 </React.Fragment>
               ))}
            </div>
         </div>

         {/* Right Rail: Inspector */}
         <div className="lg:col-span-3 space-y-4">
            <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white' : 'bg-black/40 border-white/5'} h-full`}>
               <div className="flex items-center gap-3 mb-8">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <h3 className="text-[10px] font-mono uppercase tracking-widest opacity-40">Parameter Lock</h3>
               </div>

               <div className="space-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[8px] font-mono uppercase opacity-40">Macro Level {i+1}</span>
                          <span className="text-[10px] font-mono text-purple-400">72%</span>
                       </div>
                       <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div animate={{ width: '72%' }} className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-auto pt-12 space-y-3">
                  <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-mono uppercase font-bold tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                     <Share2 className="w-3 h-3" /> Export Patch
                  </button>
                  <button className="w-full py-4 rounded-2xl bg-indigo-500 text-white text-[10px] font-mono uppercase font-bold tracking-widest hover:bg-indigo-400 transition-all flex items-center justify-center gap-3">
                     <Zap className="w-3 h-3 fill-current" /> Save to Memory
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
