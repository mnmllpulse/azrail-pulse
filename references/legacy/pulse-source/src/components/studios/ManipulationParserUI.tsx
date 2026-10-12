import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Search, AlertTriangle, ShieldAlert, Sparkles, Brain, Cpu, Crosshair } from 'lucide-react';
import { globalScalpel, ScalpelResult } from '../../core/ScalpelOfIntentions';
import { PsychologicalRadar } from './PsychologicalRadar';

export function ManipulationParserUI({ isLight }: { isLight?: boolean }) {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScalpelResult | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setResult(null);
    
    // Simulate slight delay for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const analysisResult = await globalScalpel.parse(inputText);
    setResult(analysisResult);
    setIsAnalyzing(false);
  };

  const getScoreColor = (score: number) => {
    if (score < 0.3) return 'text-emerald-400';
    if (score < 0.7) return 'text-amber-400';
    return 'text-rose-500';
  };

  const getBgColor = (score: number) => {
    if (score < 0.3) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score < 0.7) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className={`flex flex-col gap-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Crosshair className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-tight">Scalpel of Intentions</h3>
              <p className="text-[10px] text-zinc-500 font-mono">Semantic & Cognitive Threat Parsing</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste text for semantic analysis (e.g. ad copy, negotiation transcripts, messages)..."
              className={`w-full h-32 p-4 rounded-xl text-xs font-mono resize-none focus:outline-none transition-colors ${
                isLight 
                  ? 'bg-gray-50 border border-gray-200 focus:border-indigo-500' 
                  : 'bg-black/50 border border-white/10 focus:border-indigo-500/50 text-zinc-300'
              }`}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl border border-indigo-500/20">
                <div className="flex flex-col items-center gap-2">
                  <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest animate-pulse">Running Parsing Pipeline...</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className={`w-full py-3 px-4 rounded-xl font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all ${
              isAnalyzing || !inputText.trim()
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isAnalyzing ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Parse Intent'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`grid grid-cols-1 md:grid-cols-2 gap-4`}
          >
            {/* Score Card */}
            <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2 font-mono">Vulnerability / Manipulation Score</h4>
              <div className={`text-5xl font-black font-mono mb-2 tracking-tighter ${getScoreColor(result.vulnerabilityScore)}`}>
                {Math.round(result.vulnerabilityScore * 100)}<span className="text-2xl text-zinc-600">%</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono max-w-[200px]">
                {result.vulnerabilityScore < 0.3 ? 'Low threat. Intent appears straightforward.' 
                 : result.vulnerabilityScore < 0.7 ? 'Moderate manipulation tactics detected.' 
                 : 'High threat. Highly manipulative construct.'}
              </div>
            </div>

            {/* Triggers Card */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-4 font-mono flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" /> Detected Triggers
              </h4>
              {result.detectedTriggers.length > 0 ? (
                <div className="space-y-2">
                  {result.detectedTriggers.map((trigger, i) => (
                    <div key={i} className={`px-3 py-2 rounded-lg border text-[10px] font-mono uppercase flex items-center gap-2 ${getBgColor(result.vulnerabilityScore)}`}>
                      <AlertTriangle className={`w-3 h-3 ${getScoreColor(result.vulnerabilityScore)}`} />
                      {trigger}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> No distinct manipulative triggers detected
                </div>
              )}

              {result.hiddenMotives && result.hiddenMotives.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-3 font-mono flex items-center gap-2">
                    <Brain className="w-3 h-3" /> Hidden Motives Synthesis
                  </h4>
                  <ul className="space-y-1">
                    {result.hiddenMotives.map((motive, i) => (
                      <li key={i} className="text-[10px] text-zinc-400 font-mono flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">›</span> {motive}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result.ocean && (
              <div className="md:col-span-2 mt-2">
                <PsychologicalRadar scores={result.ocean} isLight={isLight} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
