import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Cpu, 
  Layers, 
  Sparkles, 
  Activity, 
  Share2, 
  Terminal, 
  MessageSquare, 
  Wand2, 
  Check, 
  Copy, 
  FileDown,
  ArrowLeft
} from 'lucide-react';
import { useSystemState } from '../contexts/SystemStateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { SmartTranslator } from '../components/common/SmartTranslator';
import { useNavigate } from 'react-router-dom';

interface SynthesisOutput {
  gemini: string;
  claude: string;
  gpt: string;
  unified: string;
}

export default function QuantumMind() {
  const navigate = useNavigate();
  const { uiPreferences } = useSystemState();
  const { t } = useLanguage();
  const isLight = uiPreferences.theme === 'light';
  
  const [query, setQuery] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<'unified' | 'gemini' | 'claude' | 'gpt'>('unified');
  const [synthesisResult, setSynthesisResult] = useState<SynthesisOutput | null>(null);
  
  const [copied, setCopied] = useState(false);

  const models = [
    { id: 'gemini', name: 'Gemini 3.5 (Logical)', status: 'ready', load: 18 },
    { id: 'claude', name: 'Claude 3.5 (Creative)', status: 'ready', load: 35 },
    { id: 'gpt', name: 'GPT-4o (Structural)', status: 'ready', load: 24 },
    { id: 'llama', name: 'Llama 3 (Backup)', status: 'standby', load: 0 },
    { id: 'mistral', name: 'Mistral Large', status: 'ready', load: 52 },
    { id: 'deepseek', name: 'DeepSeek R1', status: 'ready', load: 15 },
  ];

  const handleSynthesize = async () => {
    if (!query.trim()) return;
    setIsSynthesizing(true);
    setActiveModels(['gemini', 'claude', 'gpt']);
    toast.info("Initializing multi-model synthesis stream...");
    
    try {
      const systemPrompt = `You are the Quantum Mind neural synthesizer. You must analyze the user's query and provide 4 distinct, expert responses formatted in strict sections.
      The output MUST be formatted exactly as follows:
      
      [SECTION: GEMINI]
      (Provide a logical, highly analytical, scientific, and factual response matching Gemini's style)
      
      [SECTION: CLAUDE]
      (Provide an elegant, creative, deeply intellectual, and human-like response matching Claude's style)
      
      [SECTION: GPT]
      (Provide a highly structured, architectural, step-by-step, and organized response matching GPT's style)
      
      [SECTION: UNIFIED]
      (Provide a masterfully converged, unified resolution that blends all three styles into an actionable synthesis)
      
      Be extremely thorough, technical, and detailed. Do not include extra comments or other markdown elements outside these sections.`;

      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'quantum-mind-user',
          message: `Process and synthesize this query: "${query}"`,
          systemPrompt,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      const data = await response.json();
      if (data.status === 'ok' && data.data) {
        const rawText = data.data;
        
        // Parse the segments based on sections
        const geminiMatch = rawText.match(/\[SECTION:\s*GEMINI\]([\s\S]*?)(?=\[SECTION:|$)/i);
        const claudeMatch = rawText.match(/\[SECTION:\s*CLAUDE\]([\s\S]*?)(?=\[SECTION:|$)/i);
        const gptMatch = rawText.match(/\[SECTION:\s*GPT\]([\s\S]*?)(?=\[SECTION:|$)/i);
        const unifiedMatch = rawText.match(/\[SECTION:\s*UNIFIED\]([\s\S]*?)(?=\[SECTION:|$)/i);

        const result: SynthesisOutput = {
          gemini: geminiMatch ? geminiMatch[1].trim() : "Analysis offline.",
          claude: claudeMatch ? claudeMatch[1].trim() : "Creative pathway congested.",
          gpt: gptMatch ? gptMatch[1].trim() : "Structural pipeline timed out.",
          unified: unifiedMatch ? unifiedMatch[1].trim() : rawText.trim()
        };

        setSynthesisResult(result);
        setActiveResultTab('unified');
        toast.success("Synthesis complete. 3 cognitive perspectives converged!");
      } else {
        throw new Error(data.error || "Synthesis node failed to respond");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Neural synthesis crashed: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRefinePath = async () => {
    if (!synthesisResult || !query.trim()) return;
    setIsSynthesizing(true);
    toast.info("Refining synthesis alignment...");
    
    try {
      const systemPrompt = `You are refining an existing Quantum Mind multi-model synthesis. Incorporate the user's focus coordinates. Output the sections [SECTION: GEMINI], [SECTION: CLAUDE], [SECTION: GPT], and [SECTION: UNIFIED] with updated refined content.`;
      
      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'quantum-mind-user',
          message: `Original query: ${query}\n\nExisting synthesis: ${JSON.stringify(synthesisResult)}\n\nPlease refine this synthesis with deeper creative alignment.`,
          systemPrompt,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      const data = await response.json();
      if (data.status === 'ok' && data.data) {
        const rawText = data.data;
        const geminiMatch = rawText.match(/\[SECTION:\s*GEMINI\]([\s\S]*?)(?=\[SECTION:|$)/i);
        const claudeMatch = rawText.match(/\[SECTION:\s*CLAUDE\]([\s\S]*?)(?=\[SECTION:|$)/i);
        const gptMatch = rawText.match(/\[SECTION:\s*GPT\]([\s\S]*?)(?=\[SECTION:|$)/i);
        const unifiedMatch = rawText.match(/\[SECTION:\s*UNIFIED\]([\s\S]*?)(?=\[SECTION:|$)/i);

        setSynthesisResult({
          gemini: geminiMatch ? geminiMatch[1].trim() : "Analysis offline.",
          claude: claudeMatch ? claudeMatch[1].trim() : "Creative pathway congested.",
          gpt: gptMatch ? gptMatch[1].trim() : "Structural pipeline timed out.",
          unified: unifiedMatch ? unifiedMatch[1].trim() : rawText.trim()
        });
        toast.success("Synthesis refined successfully!");
      }
    } catch (e: any) {
      toast.error(`Refinement failed: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleExportLogic = () => {
    if (!synthesisResult) return;
    const content = `
# QUANTUM MIND COGNITIVE SYNTHESIS
*Input Query: ${query}*

## GEMINI (LOGICAL perspective)
${synthesisResult.gemini}

## CLAUDE (CREATIVE perspective)
${synthesisResult.claude}

## GPT (STRUCTURAL perspective)
${synthesisResult.gpt}

---

## CONVERGED UNIFIED RESOLUTION
${synthesisResult.unified}
    `.trim();

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(content);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "quantum_synthesis.md");
    dlAnchorElem.click();
    toast.success("Markdown synthesis successfully exported!");
  };

  const handleCopy = () => {
    if (!synthesisResult) return;
    const activeText = synthesisResult[activeResultTab];
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    toast.success("Copied active tab text to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`min-h-screen flex flex-col pt-24 px-6 pb-12 transition-colors duration-500 ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left Column: Input & Model Matrix */}
        <div className="lg:col-span-5 space-y-6">
          <button 
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 transition-colors w-fit text-sm font-mono uppercase tracking-wider mb-[-1rem] relative z-10 ${isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-500 border border-blue-500/20">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{t('quantumMindTitle')}</h1>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 font-bold">{t('multiModelNeuralSynthesizer')}</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/50 border-white/5'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">{t('globalQueryInput')}</span>
              <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Inject query into the neural matrix (e.g. 'Synthesize a high-performance system architecture for state tracking')..."
              className={`w-full h-40 bg-transparent border-none outline-none resize-none text-sm font-mono leading-relaxed focus:ring-0 ${
                isLight ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            />
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !query.trim()}
              className="w-full py-4 mt-4 rounded-2xl bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-blue-500 disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  {t('synthesizingNeuralPaths')}
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                  {t('activateSynthesis')}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {models.map((model) => (
              <div
                key={model.id}
                className={`p-4 rounded-2xl border transition-all ${
                  activeModels.includes(model.id)
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/5'
                    : isLight
                    ? 'bg-white border-zinc-200/60'
                    : 'bg-zinc-900/30 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{model.name}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${model.status === 'ready' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Load</div>
                  <div className={`text-[10px] font-mono ${isLight ? 'text-zinc-800' : 'text-white'}`}>{model.load}%</div>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-blue-500/50" style={{ width: `${model.load}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Output Workspace */}
        <div className="lg:col-span-7 flex flex-col">
          <div className={`flex-1 rounded-[2.5rem] border overflow-hidden flex flex-col ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/50 border-white/5'}`}>
            <div className="px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">{t('synthesisOutput')}</h2>
              </div>
              
              {/* Perspective Tab Controls */}
              {synthesisResult && (
                <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 font-mono text-[9px] uppercase tracking-wider">
                  {(['unified', 'gemini', 'claude', 'gpt'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveResultTab(tab)}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                        activeResultTab === tab 
                          ? 'bg-blue-600 text-white' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {synthesisResult && (
                  <button 
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors border border-white/5 bg-black/10 cursor-pointer"
                    title="Copy active perspective"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-8 font-mono text-sm leading-relaxed text-zinc-300 overflow-y-auto max-h-[500px]">
              {isSynthesizing ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${75 + Math.random() * 25}%` }} />
                  ))}
                </div>
              ) : synthesisResult ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-400 uppercase tracking-widest font-bold flex justify-between items-center">
                    <span>Synthesis Resolution: Converged Matrix Output</span>
                    <span className="font-mono text-zinc-500 text-[8px]">latency: ~2.4s</span>
                  </div>
                  
                  <div className={`whitespace-pre-wrap font-sans leading-relaxed text-sm ${isLight ? 'text-zinc-750' : 'text-zinc-200'}`}>
                    <SmartTranslator text={synthesisResult[activeResultTab]} />
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 py-20">
                  <MessageSquare className="w-10 h-10 opacity-20 animate-pulse" />
                  <p className="text-[10px] uppercase tracking-widest">{t('awaitingNeuralInjection')}</p>
                  <p className="text-[9px] text-zinc-500 max-w-xs text-center leading-normal">{t('awaitingNeuralInjectionDesc')}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex gap-4">
                <button 
                  onClick={handleRefinePath}
                  disabled={!synthesisResult || isSynthesizing}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {t('refinePath')}
                </button>
                <button 
                  onClick={handleExportLogic}
                  disabled={!synthesisResult || isSynthesizing}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {t('exportLogic')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
