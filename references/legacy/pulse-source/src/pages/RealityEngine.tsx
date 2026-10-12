import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Wand2, 
  Zap, 
  Play, 
  Pause, 
  RefreshCw, 
  Sliders, 
  Settings, 
  Cpu, 
  SlidersHorizontal,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { toast } from 'sonner';
import Tooltip from '../components/Tooltip';
import { useNavigate } from 'react-router-dom';
import RealityDataStreamVisualizer from '../components/RealityDataStreamVisualizer';

export default function RealityEngine() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';
  
  const [isListening, setIsListening] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputType, setOutputType] = useState<'video' | 'image'>('video');
  const [currentMedia, setCurrentMedia] = useState<string | null>(null);
  
  // Aesthetic Calibration States
  const [density, setDensity] = useState(75);
  const [noise, setNoise] = useState(30);
  const [exposure, setExposure] = useState(45);
  const [complexity, setComplexity] = useState(60);

  const recognitionRef = useRef<any>(null);

  // High-fidelity open-source visual sources mapped by keyword
  const videoDatabase = {
    cosmic: 'https://assets.mixkit.co/videos/preview/mixkit-nebula-in-outer-space-40345-large.mp4',
    tokyo: 'https://assets.mixkit.co/videos/preview/mixkit-rotating-technological-glowing-neon-sphere-40618-large.mp4',
    rain: 'https://assets.mixkit.co/videos/preview/mixkit-raindrops-on-a-window-at-night-14022-large.mp4',
    laser: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32120-large.mp4',
    waves: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-waves-31518-large.mp4',
    default: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  };

  const imageDatabase = {
    tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=1200&q=80',
    cosmic: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1200&q=80',
    rain: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1200&q=80',
    laser: 'https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?auto=format&fit=crop&w=1200&q=80',
    waves: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
  };

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcriptText = event.results[i][0].transcript;
            setPrompt(transcriptText);
            handleCommand(transcriptText);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setPrompt('');
      recognitionRef.current?.start();
      setIsListening(true);
      toast.info("Voice stream active. Describe your visual destination...");
    }
  };

  const handleCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('generate') || lowerText.includes('show') || lowerText.includes('create') || lowerText.includes('manifest')) {
      generateReality();
    }
  };

  const generateReality = async () => {
    const textPrompt = prompt.trim();
    if (!textPrompt) return;
    setIsGenerating(true);
    setCurrentMedia(null);
    
    // Deconstruct prompt keywords to fetch highly specific visual aesthetics
    const queryLower = textPrompt.toLowerCase();
    let matchedKey: 'tokyo' | 'cosmic' | 'rain' | 'laser' | 'waves' | 'default' = 'default';
    
    if (queryLower.includes('tokyo') || queryLower.includes('neon') || queryLower.includes('cyber')) {
      matchedKey = 'tokyo';
    } else if (queryLower.includes('cosmic') || queryLower.includes('star') || queryLower.includes('nebula')) {
      matchedKey = 'cosmic';
    } else if (queryLower.includes('rain') || queryLower.includes('night') || queryLower.includes('water')) {
      matchedKey = 'rain';
    } else if (queryLower.includes('laser') || queryLower.includes('glow') || queryLower.includes('light')) {
      matchedKey = 'laser';
    } else if (queryLower.includes('wave') || queryLower.includes('abstract') || queryLower.includes('digital')) {
      matchedKey = 'waves';
    }

    toast.info(`Synaptic alignment: matching visual genome for [${matchedKey.toUpperCase()}]...`);
    
    try {
      // Simulate real-time neural mapping delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (outputType === 'video') {
        setCurrentMedia(videoDatabase[matchedKey]);
      } else {
        setCurrentMedia(imageDatabase[matchedKey]);
      }
      
      toast.success("Reality vector synthesized successfully!");
    } catch (error) {
      toast.error("Reality synthesis pipeline congested.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col pt-24 px-6 pb-12 transition-colors duration-500 ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-8 flex flex-col justify-between">
          <div className="space-y-6">
            <button 
              onClick={() => navigate(-1)}
              className={`flex items-center gap-2 transition-colors w-fit text-sm font-mono uppercase tracking-wider mb-2 relative z-10 ${isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-500 border border-purple-500/20">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className={`text-3xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>Reality Engine</h1>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-purple-400 font-bold">Voice-Controlled Generation</p>
                </div>
              </div>
              <p className={`text-sm leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Direct the neural swarm via vocal commands. Describe the desired outcome, and watch as the OS distorts reality in real-time.
              </p>
            </div>

            {/* Prompt input with integrated mic button */}
            <div className={`p-6 rounded-3xl border transition-all ${isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/50 border-white/5'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Neural Input</span>
                <div className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase font-mono tracking-wider ${isListening ? 'bg-red-500/15 text-red-500 animate-pulse border border-red-500/25' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/15'}`}>
                  {isListening ? 'Live Feedback' : 'Standby'}
                </div>
              </div>

              <div className="relative flex flex-col gap-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Tell the reality engine what to manifest (e.g., 'Cosmic dust nebula stream' or 'Cyberpunk neon Tokyo streets')..."
                  className={`w-full h-32 bg-transparent border-none outline-none resize-none text-sm font-mono leading-relaxed focus:ring-0 ${
                    isLight ? 'text-zinc-800 placeholder-zinc-400' : 'text-zinc-200 placeholder-zinc-600'
                  }`}
                />
                
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Tip: speak 'create' or 'manifest'</span>
                  <Tooltip
                    contentEn="Stream voice audio to parse visual manifestation requests and commands directly."
                    contentRu="Передавайте голосовой аудиопоток для прямого разбора запросов и команд визуального проявления."
                    titleEn="Vocal Decoder"
                    titleRu="Голосовой декодер"
                    isLight={isLight}
                  >
                    <button
                      onClick={toggleListening}
                      className={`p-3.5 rounded-2xl transition-all shadow-xl cursor-pointer ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse shadow-red-500/20' 
                          : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/10'
                      }`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Slider/Aesthetic Genome Calibration Panel */}
            <div className={`p-6 rounded-3xl border transition-all ${isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/50 border-white/5'} space-y-4`}>
              <div className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('aestheticGenomeCalibrations')}</span>
              </div>
              
              <div className="space-y-3 font-mono text-[9px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('particleDensity')}</span>
                    <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{density}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" value={density} onChange={(e) => setDensity(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('chromaticNoise')}</span>
                    <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{noise}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="80" value={noise} onChange={(e) => setNoise(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('ambientExposure')}</span>
                    <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{exposure}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" value={exposure} onChange={(e) => setExposure(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('structuralComplexity')}</span>
                    <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{complexity}%</span>
                  </div>
                  <input 
                    type="range" min="20" max="100" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Tooltip
                contentEn="Generate spacetime coordinates as a flowing, real-time dynamic timeline video."
                contentRu="Генерировать пространственно-временные координаты в виде текущего динамического видео в реальном времени."
                titleEn="Render Video"
                titleRu="Рендерить видео"
                isLight={isLight}
                className="flex-1"
              >
                <button
                  onClick={() => setOutputType('video')}
                  className={`w-full p-4 rounded-2xl border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    outputType === 'video' 
                      ? 'bg-purple-500/10 border-purple-500 text-purple-400 font-extrabold shadow-sm' 
                      : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                  }`}
                >
                  {t('videoSequence')}
                </button>
              </Tooltip>

              <Tooltip
                contentEn="Generate spacetime coordinates as a ultra high-resolution snapshot asset."
                contentRu="Генерировать пространственно-временные координаты в виде статического снимка сверхвысокого разрешения."
                titleEn="Render Still"
                titleRu="Рендерить кадр"
                isLight={isLight}
                className="flex-1"
              >
                <button
                  onClick={() => setOutputType('image')}
                  className={`w-full p-4 rounded-2xl border text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    outputType === 'image' 
                      ? 'bg-purple-500/10 border-purple-500 text-purple-400 font-extrabold shadow-sm' 
                      : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                  }`}
                >
                  {t('stillAsset')}
                </button>
              </Tooltip>
            </div>

            <Tooltip
              contentEn="Synthesize calibrated parameters and input parameters to generate spacetime reality projection."
              contentRu="Синтезировать откалиброванные параметры и исходный текст для генерации проекции реальности."
              titleEn="Launch Pipeline"
              titleRu="Запустить конвейер"
              isLight={isLight}
              className="w-full"
            >
              <button
                onClick={generateReality}
                disabled={isGenerating || !prompt.trim()}
                className={`w-full py-5 rounded-3xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-2xl cursor-pointer ${
                  isLight ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-zinc-950 hover:bg-zinc-200'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('synthesizingQuantumMatrix')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    {t('manifestReality')}
                  </>
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Right Column: Visual Output */}
        <div className="lg:col-span-8 relative flex flex-col justify-between">
          <div className={`w-full aspect-video rounded-[2.5rem] overflow-hidden border relative shadow-2xl ${
            isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-white/10'
          }`}>
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-black/40 backdrop-blur-sm"
                >
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-purple-500 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-purple-400">{t('neuralSynthesisInProgress')}</div>
                    <div className="text-sm text-zinc-400">{t('renderingSpacetimeCoordinates')}</div>
                  </div>
                </motion.div>
              ) : currentMedia ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 group"
                >
                  {outputType === 'video' ? (
                    <video
                      src={currentMedia}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      style={{
                        filter: `contrast(${100 + (complexity - 60)}%) brightness(${100 + (exposure - 50)}%)`
                      }}
                    />
                  ) : (
                    <img
                      src={currentMedia}
                      alt="Neural output"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      style={{
                        filter: `contrast(${100 + (complexity - 60)}%) brightness(${100 + (exposure - 50)}%)`
                      }}
                    />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  
                  <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-[9px] font-mono uppercase tracking-widest font-bold">
                      Manifested Spacetime Field // ACTIVE
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentMedia || '');
                          toast.success("Media URI copied to clipboard");
                        }}
                        className="p-3 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors shadow-xl cursor-pointer"
                        title="Copy asset address"
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                  <div className="p-6 rounded-full bg-zinc-850 border border-white/5">
                    <Wand2 className="w-8 h-8 text-zinc-600 animate-pulse" />
                  </div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-600">{t('awaitingManifestationCommand')}</div>
                </div>
              )}
            </AnimatePresence>
            
            {/* HUD Overlay Details */}
            <div className="absolute top-8 left-8 space-y-1 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/70">{t('neuralFieldCalibration')}</div>
              </div>
              <div className="text-[8px] font-mono text-zinc-500 pl-3">
                COORD_X: {((density * 1.5) + 12).toFixed(3)} | CHROMATIC: {noise}%
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['Night Tokyo', 'Cosmic Nebula', 'Cyberpunk Rain', 'Laser Aura', 'Abstract Waves'].map((tag) => (
              <button
                key={tag}
                onClick={() => setPrompt(tag)}
                className={`px-4.5 py-2.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  isLight 
                    ? 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50' 
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white hover:bg-zinc-850/50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* AI Data Stream Flow Visualizer */}
          <div className="mt-8 max-w-2xl mx-auto">
            <RealityDataStreamVisualizer />
          </div>
        </div>
      </div>
    </div>
  );
}
