import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Video, Film, Scissors, Layers, Type, Wand2, Volume2, Download, 
  Settings, Play, Pause, SkipBack, SkipForward, Maximize, Upload, 
  Loader2, Sparkles, Sliders, PlayCircle, Activity
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import VoiceInputButton from '../../components/VoiceInputButton';
import { useStudioState } from '../../hooks/useStudioState';
import { QuantumVideoOrchestrator } from '../../components/studios/QuantumVideoOrchestrator';
import { AzrailOrchestrator } from '../../components/studios/AzrailOrchestrator';
import { CheckCircle } from 'lucide-react';

import { useUser } from '../../contexts/UserContext';
import { useHistory } from '../../contexts/HistoryContext';

export default function VideoStudioPanel({ isLight }: { isLight?: boolean }) {
  const { t } = useLanguage();
  const { refreshStatus } = useUser();
  const { addToHistory } = useHistory();
  const [orchestratorResult, setOrchestratorResult] = useState<{ analysis: string; assignedAgents: Record<string, string> } | null>(null);
  const [orchestratorPrompt, setOrchestratorPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'effects' | 'ai' | 'quantum_copilot'>('quantum_copilot');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [suiteFunctions, setSuiteFunctions] = useState<Record<string, boolean>>({
    v81: false, v82: false, v83: false, v84: false, v85: false,
    v86: false, v87: false, v88: false, v89: false, v90: false,
    v91: false, v92: false, v93: false, v94: false, v95: false,
    v96: false, v97: false, v98: false, v99: false, v100: false
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
    setRenderLogs(prev => [...prev, msg]);
  };
  
	// Interactive AI & player state
	const [prompt, setPrompt] = useState('');
	const [rendering, setRendering] = useState(false);
	const [renderLogs, setRenderLogs] = useState<string[]>([]);
	const [activeStyle, setActiveStyle] = useState<'cosmic' | 'cyber' | 'lava' | 'neural' | 'empty'>('cosmic');
	const [subtitles, setSubtitles] = useState('Awaiting planetary sequence input...');
	const [engine, setEngine] = useState<'procedural' | 'veo'>('procedural');
	const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
	const [veoOperationId, setVeoOperationId] = useState<string | null>(null);
  useEffect(() => () => { if (veoVideoUrl?.startsWith('blob:')) URL.revokeObjectURL(veoVideoUrl); }, [veoVideoUrl]);

  useStudioState('video', { prompt, activeStyle, subtitles }, (config) => {
    if (config.prompt !== undefined) setPrompt(config.prompt);
    if (config.activeStyle !== undefined) setActiveStyle(config.activeStyle);
    if (config.subtitles !== undefined) setSubtitles(config.subtitles);
  });
  
  // Real-time ticking player clock
  const [currentTime, setCurrentTime] = useState(0); // in tenths of seconds (0 to 160 = 16 seconds total)
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let particles: any[] = [];
    
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedX: Math.random() * 2 - 1,
          speedY: Math.random() * 2 - 1,
          hue: Math.random() * 60
        });
      }
    };
    
    initParticles();
    
    const draw = () => {
      if (!isPlaying) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      
      ctx.fillStyle = activeStyle === 'cyber' ? 'rgba(0, 10, 5, 0.2)' :
                      activeStyle === 'lava' ? 'rgba(20, 0, 0, 0.2)' :
                      activeStyle === 'neural' ? 'rgba(5, 5, 15, 0.2)' :
                      'rgba(5, 0, 20, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        if (activeStyle === 'cyber') {
          p.y += (p.speedY + 2);
          if (p.y > canvas.height) p.y = 0;
          ctx.fillStyle = '#00ffcc';
          ctx.fillRect(p.x, p.y, 2, 10);
        } else if (activeStyle === 'lava') {
          p.x += p.speedX;
          p.y -= Math.abs(p.speedY) + 0.5;
          if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`;
          ctx.fill();
        } else if (activeStyle === 'neural') {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
          if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = '#8b5cf6';
          ctx.fill();
          
          // Connect nearby
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 80) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(139, 92, 246, ${1 - dist/80})`;
              ctx.stroke();
            }
          }
        } else {
          // cosmic
          p.x += Math.cos(currentTime / 20) * p.speedX;
          p.y += Math.sin(currentTime / 20) * p.speedY;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 200, 255, ${Math.random()})`;
          ctx.fill();
        }
      });
      
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, activeStyle, currentTime]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 160) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleRecord = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!canvasRef.current) return;
      const stream = canvasRef.current.captureStream(30);
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm' };
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `video-export-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const handleStopReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatClock = (tenths: number) => {
    const totalSeconds = tenths / 10;
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const ms = (tenths % 10).toString().padEnd(2, '0');
    return `00:${m}:${s}.${ms}`;
  };

  // Update subtitles based on current playhead time
  useEffect(() => {
    if (activeStyle === 'cosmic') {
      if (currentTime < 40) setSubtitles("[Ambient stardust particles coalescing in deep void...]");
      else if (currentTime < 90) setSubtitles("[Camera panning slowly through the nebula cloud...]");
      else if (currentTime < 130) setSubtitles("[Solar flare emitting deep purple gamma rays...]");
      else setSubtitles("[Nebular core stabilization complete.]");
    } else if (activeStyle === 'cyber') {
      if (currentTime < 40) setSubtitles("[Decoding neon digital matrices on the glass facade...]");
      else if (currentTime < 90) setSubtitles("[Cybernetic rain streaming down, reflecting cyan starlight...]");
      else if (currentTime < 130) setSubtitles("[Holographic terminal flashing, initiating quantum handshake...]");
      else setSubtitles("[Network link established with the Swarm.]");
    } else if (activeStyle === 'lava') {
      if (currentTime < 40) setSubtitles("[Molten magma rising slowly, radiating deep crimson waves...]");
      else if (currentTime < 90) setSubtitles("[Thermodynamic currents morphing fluid structures...]");
      else if (currentTime < 130) setSubtitles("[Intense volcanic glow flashing, refracting off basalt...]");
      else setSubtitles("[Heat shield telemetry holding within safety thresholds.]");
    } else if (activeStyle === 'neural') {
      if (currentTime < 40) setSubtitles("[Initiating Neural Synapse mapping protocols...]");
      else if (currentTime < 90) setSubtitles("[Swarm connections routing through local vector nodes...]");
      else if (currentTime < 130) setSubtitles("[Sparkles of electric cognitive pulses shifting frequencies...]");
      else setSubtitles("[Distributed cognition fully synchronized.]");
    } else {
      setSubtitles("Press play to start cinematic simulation.");
    }
  }, [currentTime, activeStyle]);

	const handleRender = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!prompt) return;

		setRendering(true);
		setVeoVideoUrl(null);
		
		if (engine === 'veo') {
			setRenderLogs(["[VEO ENGINE]: Initializing Google Veo deep generative sequence...", "Establishing canvas frames and aspect ratio 16:9..."]);
			try {
				const response = await fetch('/api/generate-video-veo', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prompt, aspectRatio: "16:9", durationSeconds: 5 })
				});
				const data = await response.json();
				
				if (response.status === 429) {
					toast.error("Дневной лимит запросов исчерпан. Лимиты задаёт владелец в Cloudflare.");
					setRenderLogs(prev => [...prev, "❌ [LIMIT]: Daily generation limit reached.", "Лимит можно проверить в настройках Worker."]);
					setRendering(false);
					return;
				}

				if (!response.ok) throw new Error(data.error || "Failed to start Veo video generation");
				
				addToHistory({
					type: 'video',
					title: `Generated Video: ${prompt.substring(0, 20)}...`,
					description: prompt,
					metadata: { prompt, model: "veo-2" }
				});
				refreshStatus();
				
				const opId = data.operationName;
				setVeoOperationId(opId);
				setRenderLogs(prev => [...prev, `[VEO ENGINE]: Generation initiated successfully. Operation ID: ${opId.substring(0, 10)}...`]);
				
				// Inline polling loop
				let completed = false;
				let attempts = 0;
				const maxAttempts = 30; // 30 * 4 seconds = 120 seconds max
				
				while (!completed && attempts < maxAttempts) {
					attempts++;
					setRenderLogs(prev => [...prev, `[VEO ENGINE]: Synthesizing high-res latent frames (Attempt ${attempts}/${maxAttempts})...`]);
					
					// Wait 4 seconds
					await new Promise(resolve => setTimeout(resolve, 4000));
					
					const statusRes = await fetch('/api/video-status-veo', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ operationName: opId })
					});
					const statusData = await statusRes.json();
					
					if (!statusRes.ok) {
						throw new Error(statusData.error || "Status check failed");
					}
					
					if (statusData.done === true) {
						completed = true;
						setRenderLogs(prev => [...prev, "✨ [VEO ENGINE]: Video synthesis complete! Stream channel opened.", "Initializing playhead buffer..."]);
						const download = await fetch('/api/video-download-veo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationName: opId }) });
            if (!download.ok) throw new Error('Не удалось получить видео');
            const finalUrl = URL.createObjectURL(await download.blob());
						setVeoVideoUrl(finalUrl);
						setSubtitles("[Cinematic Google Veo sequence rendered successfully]");
					} else if (statusData.status === 'failed') {
						throw new Error(statusData.error || "Veo model execution failed");
					}
				}
				
				if (!completed) {
					throw new Error("Видео ещё не готово. Автоматическая подмена симуляцией отключена.");
				}
			} catch (err: any) {
				console.error(err);
				setRenderLogs(prev => [...prev, `❌ [VEO ENGINE ERROR]: ${err.message}`, "Рендер не выполнен. Проверьте подключение провайдера."]);
				// Fallback to procedural

			} finally {
				setRendering(false);
			}
		} else {
			await runProceduralRender();
		}
	};

	const runProceduralRender = async () => {
		setRenderLogs(["Analyzing cinematographic keywords with Gemini..."]);
		try {
			const systemPrompt = `You are a video style analyzer. Based on the user's prompt, choose ONE of these four video styles: 'cyber', 'lava', 'neural', 'cosmic'.
Respond with only the style name in lowercase, nothing else.`;
			
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					systemPrompt,
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' // Fast model for style detection
				})
			});

			const data = await response.json();

			if (response.status === 429) {
				toast.error("Дневной лимит запросов исчерпан. Лимиты задаёт владелец в Cloudflare.");
				setRenderLogs(prev => [...prev, "❌ [LIMIT]: Daily generation limit reached.", "Лимит можно проверить в настройках Worker."]);
				return;
			}

			if (!response.ok) throw new Error(data.error);
			
			let style = data.data.trim().toLowerCase();
			if (!['cyber', 'lava', 'neural', 'cosmic'].includes(style)) {
				style = 'cosmic'; // fallback
			}
			
			setRenderLogs(prev => [...prev, `Determined style: ${style}. Rendering...`]);
			
			setActiveStyle(style as any);
			setIsPlaying(true);
			setCurrentTime(0);
		} catch (err: any) {
			console.error(err);
			setRenderLogs(prev => [...prev, `Error: ${err.message}`]);
		} finally {
			setRendering(false);
		}
	};

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full h-full">
      {/* Top Main Workspace */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
         {/* Tools Sidebar */}
         <div className="flex w-full xl:w-72 shrink-0 flex-col gap-4">
            <div className={`border rounded-2xl p-4 flex-1 flex flex-col min-h-0 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
               <div className={`flex gap-2 border-b pb-4 mb-4 shrink-0 overflow-x-auto ${isLight ? 'border-gray-200' : 'border-white/5'} no-scrollbar`}>
                  <button 
                    onClick={() => setActiveTab('quantum_copilot')}
                    className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'quantum_copilot' ? 'border-emerald-500 text-emerald-400 font-bold' : (isLight ? 'border-transparent text-gray-500 hover:text-emerald-400' : 'border-transparent text-white/40 hover:text-white/75')}`}
                  >
                    ★ Quantum Co-Pilot
                  </button>
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'ai' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
                  >
                    AI Generator
                  </button>
                  <button 
                    onClick={() => setActiveTab('editor')}
                    className={`flex-1 text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'editor' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setActiveTab('effects')}
                    className={`flex-1 text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'effects' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
                  >
                    VFX
                  </button>
               </div>
               
               <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                  {activeTab === 'ai' ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
													{/* Engine Selector */}
													<div className="flex flex-col gap-1.5 mb-4 border-b border-white/5 pb-4">
														<span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Video Engine</span>
														<div className="grid grid-cols-2 gap-2 mt-1">
															<button
																type="button"
																onClick={() => setEngine('procedural')}
																className={`py-1.5 px-2 rounded-lg border text-[10px] font-mono uppercase tracking-wider text-center transition-all ${engine === 'procedural' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold' : (isLight ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-[#0b0b0b] border-white/10 text-white/50 hover:bg-[#0f0f0f]')}`}
															>
																⚡ Shader Synth
															</button>
															<button
																type="button"
																onClick={() => setEngine('veo')}
																className={`py-1.5 px-2 rounded-lg border text-[10px] font-mono uppercase tracking-wider text-center transition-all ${engine === 'veo' ? 'bg-purple-600/20 border-purple-500 text-purple-400 font-bold' : (isLight ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-[#0b0b0b] border-white/10 text-white/50 hover:bg-[#0f0f0f]')}`}
															>
																🎥 Google Veo AI
															</button>
														</div>
													</div>
													Describe Visual Scene
												</label>
                        <form onSubmit={handleRender} className="flex flex-col gap-3">
                          <div className="relative flex flex-col">
                            <textarea 
                              value={prompt}
                              onChange={e => setPrompt(e.target.value)}
                              placeholder="e.g. Cinematic cosmic stardust void, slow panning, deep indigo color grading..."
                              className={`w-full h-24 border rounded-xl p-3 pr-12 text-xs outline-none transition-colors resize-none font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                            />
                            <div className="absolute right-2 bottom-2 z-10">
                              <VoiceInputButton value={prompt} onChange={setPrompt} isLight={isLight} size="sm" />
                            </div>
                          </div>
                          
                          <button 
                            type="submit"
                            disabled={rendering || !prompt}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                              rendering 
                                ? 'bg-indigo-600/50 text-white cursor-not-allowed' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700'
                            }`}
                          >
                            {rendering ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" /> Render Scene
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {rendering || renderLogs.length > 0 ? (
                        <div className={`p-3 rounded-xl border font-mono text-[9px] ${isLight ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-white/5 border-white/10 text-white/70'}`}>
                          <div className="flex items-center gap-1.5 mb-2 font-bold uppercase tracking-wider text-[10px] text-indigo-400">
                            <ActivityIcon className="w-3 h-3 animate-pulse" /> Cinematic Engine Log
                          </div>
                          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                            {renderLogs.map((log, i) => (
                              <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-start gap-1"
                              >
                                <span className="text-indigo-500">›</span>
                                <span>{log}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Dynamic Templates</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => {
                              setPrompt("Slow cosmic pan in deep stardust nebula void, slow motions.");
                              setActiveStyle('cosmic');
                            }}
                            className={`p-2 rounded-xl border text-[9px] font-mono uppercase text-left transition-colors ${
                              activeStyle === 'cosmic' 
                                ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-400' 
                                : (isLight ? 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10')
                            }`}
                          >
                            🌌 Cosmic Void
                          </button>
                          <button 
                            onClick={() => {
                              setPrompt("Vertical matrix style cyber neon raindrops sliding down screen.");
                              setActiveStyle('cyber');
                            }}
                            className={`p-2 rounded-xl border text-[9px] font-mono uppercase text-left transition-colors ${
                              activeStyle === 'cyber' 
                                ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-400' 
                                : (isLight ? 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10')
                            }`}
                          >
                            📟 Cyber Neon
                          </button>
                          <button 
                            onClick={() => {
                              setPrompt("Vibrant thermodynamic magma lava flow, deep red and amber currents.");
                              setActiveStyle('lava');
                            }}
                            className={`p-2 rounded-xl border text-[9px] font-mono uppercase text-left transition-colors ${
                              activeStyle === 'lava' 
                                ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-400' 
                                : (isLight ? 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10')
                            }`}
                          >
                            🌋 Crimson Lava
                          </button>
                          <button 
                            onClick={() => {
                              setPrompt("Rotating neural swarm network grids with glowing connection synapses.");
                              setActiveStyle('neural');
                            }}
                            className={`p-2 rounded-xl border text-[9px] font-mono uppercase text-left transition-colors ${
                              activeStyle === 'neural' 
                                ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-400' 
                                : (isLight ? 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10')
                            }`}
                          >
                            🧠 Neural Nodes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'editor' ? (
                    <>
                      <ToolButton icon={<Upload />} label="Import Media" desc="MP4, MOV, URL" isLight={isLight} active />
                      <ToolButton icon={<Scissors />} label="Split / Trim" desc="Cut video segments" isLight={isLight} />
                      <ToolButton icon={<Video />} label="Multi-cam Sync" desc="Sync multiple angles" isLight={isLight} />
                      <ToolButton icon={<Volume2 />} label="Audio Sync" desc="Adjust & sync audio" isLight={isLight} />
                      <ToolButton icon={<Settings />} label="Color Grading" desc="LUTs & curves" isLight={isLight} />
                      <ToolButton icon={<Type />} label="Chapter Markers" desc="YouTube chapters" isLight={isLight} />
                    </>
                  ) : (
                    <>
                      <ToolButton icon={<Layers />} label="Motion Graphics" desc="Transitions & VFX" isLight={isLight} active />
                      <ToolButton icon={<Type />} label="3D Text & Titles" desc="Animated 3D text" isLight={isLight} />
                      <ToolButton icon={<Maximize />} label="Green Screen" desc="Chroma key replace" isLight={isLight} />
                      <ToolButton icon={<Settings />} label="Speed Ramping" desc="Smooth slow-mo" isLight={isLight} />
                      <ToolButton icon={<Settings />} label="Stabilizer" desc="Fix shaky footage" isLight={isLight} />
                    </>
                  )}
               </div>
            </div>
         </div>

         {/* Video Player */}
         <div className="flex-1 flex flex-col gap-4">
            {activeTab === 'quantum_copilot' ? (
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'}`}>
                  <div className="flex items-center gap-3 mb-4 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                    <h4 className="text-xs font-mono uppercase tracking-widest font-bold">Video Directives</h4>
                  </div>
                  <textarea
                    value={orchestratorPrompt}
                    onChange={(e) => setOrchestratorPrompt(e.target.value)}
                    placeholder="Enter your master video directive (e.g. 'Create a cinematic trailer for a sci-fi film with cyberpunk aesthetics')..."
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
                  <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Quantum Video Suite</span>
                  <div className="h-px flex-1 bg-white" />
                </div>
                <QuantumVideoOrchestrator 
                  t={t}
                  playBeep={playBeep}
                  addTerminalLog={addTerminalLog}
                  suiteFunctions={suiteFunctions}
                  setSuiteFunctions={setSuiteFunctions}
                />
              </div>
            </div>
            ) : (
              <div className={`flex-1 border rounded-2xl p-4 flex flex-col relative overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                 
                 {/* Fluid Video Canvas */}
                 <div className={`flex-1 rounded-xl relative flex items-center justify-center border overflow-hidden mb-4 ${isLight ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-black border-white/10 text-gray-600'}`}>
  
                    {veoVideoUrl ? (
											<video
												src={veoVideoUrl}
												controls
												autoPlay
												className="w-full h-full object-contain z-10"
											/>
										) : (
											<canvas
												ref={canvasRef}
												width={800}
												height={450}
												className="w-full h-full object-cover"
											/>
										)}
                    {!isPlaying && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 pointer-events-none">
                        <PlayCircle className="w-12 h-12 opacity-50 text-white" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Render a video stream or template above</span>
                      </div>
                    )}
  
                    <div className="absolute bottom-4 left-6 right-6 text-center pointer-events-none z-20">
                      <span className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/5 backdrop-blur-md text-[10px] font-mono tracking-wide text-white/90 shadow-lg inline-block">
                        {subtitles}
                      </span>
                    </div>
                 </div>
  
                 <div className="flex items-center justify-between px-2 shrink-0">
                                      <div className="flex items-center gap-3">
                       <button onClick={handleRecord} className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${isRecording ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : (isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10')}`} title="Record & Export">
                         <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                         <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline">{isRecording ? 'Recording' : 'Record'}</span>
                       </button>
                       <button onClick={handleStopReset} className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`} title="Reset"><SkipBack className="w-4 h-4" /></button>
                       <button 
                         onClick={() => setIsPlaying(!isPlaying)}
                         className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg active:scale-95"
                       >
                         {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                       </button>
                       <button className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}><SkipForward className="w-4 h-4" /></button>
                    </div>
                    
                    <div className={`font-mono text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                       {formatClock(currentTime)} / 00:00:16.00
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}><Volume2 className="w-4 h-4" /></button>
                       <button className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}><Maximize className="w-4 h-4" /></button>
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Bottom Timeline */}
      <div className={`h-48 border rounded-2xl p-4 flex flex-col shrink-0 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
         <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-mono tracking-widest uppercase flex items-center gap-2 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
              <Film className="w-4 h-4" /> Timeline Editor
            </h3>
            <div className="flex gap-2">
               <button className={`px-3 py-1 text-[10px] font-mono uppercase rounded border transition-colors ${isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}>Export Presets</button>
               <button className={`px-3 py-1 text-[10px] font-mono uppercase rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors`}>Render</button>
            </div>
         </div>
         
         <div className={`flex-1 rounded-xl border relative overflow-hidden ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#0D0D0D] border-white/10'}`}>
            {/* Real Playhead Tracker */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-red-500 z-10 transition-all duration-100 ease-linear"
              style={{ left: `${(currentTime / 160) * 100}%` }}
            >
               <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div>
            </div>
            
            {/* Tracks */}
            <div className="absolute inset-0 p-2 flex flex-col gap-2 mt-4">
               {/* Video Track */}
               <div className={`h-10 rounded border flex items-center justify-between px-3 text-[9px] font-mono ${isLight ? 'bg-blue-100/50 border-blue-200 text-blue-800' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                 <span>[ VIDEO STEM: {activeStyle.toUpperCase()} ]</span>
                 <span>16.0s</span>
               </div>
               
               {/* Audio Track */}
               <div className={`h-10 rounded border flex items-center justify-between px-3 text-[9px] font-mono ${isLight ? 'bg-green-100/50 border-green-200 text-green-800' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                 <span>[ AMBIENT NARRATION AUDIO ]</span>
                 <span>16.0s</span>
               </div>
               
               {/* Subtitle Track */}
               <div className={`h-6 rounded border flex items-center px-3 text-[8px] font-mono overflow-hidden ${isLight ? 'bg-purple-100/50 border-purple-200 text-purple-800' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                 <span className="truncate">SUBTITLES: {subtitles}</span>
               </div>
            </div>
         </div>
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

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
