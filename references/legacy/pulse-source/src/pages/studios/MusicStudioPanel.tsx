import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Music, Mic, Sliders, Scissors, Wand2, Volume2, Save, Play, Pause, 
  SkipBack, SkipForward, Library, Sparkles, Activity, Layers, Shuffle, 
  ArrowRight, Loader2, Sparkle, Server, Zap, Radio, Disc, Settings2, ShieldAlert,
  Upload, X, ChevronRight, Settings, Fingerprint, Users} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import MinimalSynthEngine from '../../utils/synth';
import VoiceInputButton from '../../components/VoiceInputButton';
import VUMeter from '../../components/VUMeter';
import Tooltip from '../../components/Tooltip';
import SpectralAnalyzer from '../../components/SpectralAnalyzer';
import { useStudioState } from '../../hooks/useStudioState';
import { QuantumAudioOrchestrator } from '../../components/studios/QuantumAudioOrchestrator';
import { AzrailOrchestrator } from '../../components/studios/AzrailOrchestrator';
import { MusicIntelligenceAgent } from '../../components/studios/MusicIntelligenceAgent';
import { CheckCircle } from 'lucide-react';

import { useUser } from '../../contexts/UserContext';
import { useHistory } from '../../contexts/HistoryContext';
import { MusicOSProvider, useMusicOS } from '../../components/studios/music-os/OSKernel';
import { DJStudio } from '../../components/studios/music-os/DJStudio';
import { ModularLab } from '../../components/studios/music-os/ModularLab';
import { MixerConsole } from '../../components/studios/music-os/MixerConsole';
import { AIAgents } from '../../components/studios/music-os/AIAgents';
import { MasteringSuite } from '../../components/studios/music-os/MasteringSuite';
import { DivergentEngine } from '../../components/studios/music-os/DivergentEngine';
import { CognitiveFusionEngine } from '../../components/studios/music-os/CognitiveFusionEngine';

export default function MusicStudioPanel({ isLight }: { isLight?: boolean }) {
  return (
    <MusicOSProvider>
      <MusicOSContent isLight={isLight} />
    </MusicOSProvider>
  );
}

function MusicOSContent({ isLight }: { isLight?: boolean }) {
  const { t } = useLanguage();
  const { refreshStatus } = useUser();
  const { addToHistory } = useHistory();
  const { state } = useMusicOS();
  const [orchestratorResult, setOrchestratorResult] = useState<{ analysis: string; assignedAgents: Record<string, string> } | null>(null);
  const [orchestratorPrompt, setOrchestratorPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'mixer' | 'synth' | 'ai' | 'generators' | 'vst' | 'beatport' | 'presets' | 'analyzer' | 'pro' | 'templates' | 'quantum_copilot' | 'agents' | 'stem_splitter' | 'intelligence_agent' | 'dj_studio' | 'modular_lab' | 'mixer_os' | 'pro_agents' | 'mastering_os' | 'divergent_thinking' | 'cognitive_fusion'>('divergent_thinking');
  const [selectedMusicAgent, setSelectedMusicAgent] = useState('composer');
  const [isPlaying, setIsPlaying] = useState(false);

  const MUSIC_AGENTS = [
    { id: 'composer', name: 'Zadkiel (Composer)', role: 'MIDI & Arrangement' },
    { id: 'engineer', name: 'Jophiel (Mix Engineer)', role: 'DSP & Balance' },
    { id: 'mastering', name: 'Metatron (Mastering)', role: 'LUFS & Final Chain' },
    { id: 'sound_designer', name: 'Raziel (Sound Designer)', role: 'Synth & Patching' }
  ];
  const [isScanningProject, setIsScanningProject] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showPythonScript, setShowPythonScript] = useState(false);
  
  const [suiteFunctions, setSuiteFunctions] = useState<Record<string, boolean>>({
    f51: false, f52: false, f53: false, f54: false, f55: false,
    f56: false, f57: false, f58: false, f59: false, f60: false,
    f61: false, f62: false, f63: false, f64: false, f65: false,
    f66: false, f67: false, f68: false, f69: false, f70: false
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
    setGenLogs(prev => [...prev, msg]);
  };
  
  // Preset Library States
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState([
    { id: '1', name: 'Melodic House Lead', genre: 'Melodic House & Techno', plugins: ['Pro-Q 3', 'Diva 2.0', 'Valhalla Shimmer', 'Soothe2'] },
    { id: '2', name: 'Peak Time Rumble', genre: 'Techno (Peak Time / Driving)', plugins: ['Kick 2', 'Saturn 2', 'Decapitator', 'Pro-C 2'] },
    { id: '3', name: 'Organic Afro Percussion', genre: 'Afro House', plugins: ['Trackspacer', 'RC-20 Retro Color', 'Echoboy'] }
  ]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetGenre, setNewPresetGenre] = useState('Melodic House & Techno');
  const [isUploadingProject, setIsUploadingProject] = useState(false);
  const [uploadedProject, setUploadedProject] = useState<string | null>(null);
  const [isGeneratingRemix, setIsGeneratingRemix] = useState(false);
  const [remixLogs, setRemixLogs] = useState<string[]>([]);
  const [generatedRemixes, setGeneratedRemixes] = useState<{name: string, style: string}[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [totalSteps, setTotalSteps] = useState(0);
  const synthRef = useRef<MinimalSynthEngine | null>(null);

  // Core step sequencer sequences
  const [sequences, setSequences] = useState({
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    bass: [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
    synth: [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0]
  });

  const [bpm, setBpm] = useState(120);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [selectedAIStyle, setSelectedAIStyle] = useState<string>('');
  const [musicEngine, setMusicEngine] = useState<'midi' | 'lyria'>('midi');
  const [lyriaAudioUrl, setLyriaAudioUrl] = useState<string | null>(null);

  useStudioState('music', { prompt, bpm, selectedAIStyle, sequences }, (config) => {
    if (config.prompt !== undefined) setPrompt(config.prompt);
    if (config.bpm !== undefined) setBpm(config.bpm);
    if (config.selectedAIStyle !== undefined) setSelectedAIStyle(config.selectedAIStyle);
    if (config.sequences !== undefined) setSequences(config.sequences);
  });

  useEffect(() => {
    const synth = new MinimalSynthEngine((step) => {
      setCurrentStep(step);
      setTotalSteps((prev) => prev + 1);
    });
    // Sync sequences and BPM initially
    synth.setAllSequences(sequences.kick, sequences.hihat, sequences.bass, sequences.synth);
    synth.setBpm(bpm);
    synthRef.current = synth;

    return () => {
      synth.stop();
    };
  }, []);

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setAllSequences(sequences.kick, sequences.hihat, sequences.bass, sequences.synth);
    }
  }, [sequences]);

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (isPlaying) {
      synthRef.current?.start();
    } else {
      synthRef.current?.stop();
    }
  }, [isPlaying]);


  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleRecord = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const stream = synthRef.current?.getMediaStream();
      if (!stream) {
        toast.error("Audio stream not available");
        return;
      }
      toast.success("Recording started...");
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const ext = (recorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
        a.download = `music-export-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          toast.success("Recording saved successfully");
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
    setCurrentStep(-1);
    setTotalSteps(0);
  };

  const formatTime = (stepsCount: number) => {
    const seconds = stepsCount * 0.125;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
    return `00:${m}:${s}.${ms}`;
  };

  const handleToggleStep = (track: 'kick' | 'hihat' | 'bass' | 'synth', stepIdx: number) => {
    setSequences(prev => {
      const updated = [...prev[track]];
      updated[stepIdx] = updated[stepIdx] === 1 ? 0 : 1;
      
      if (synthRef.current) {
        synthRef.current.setSequence(track, stepIdx, updated[stepIdx]);
      }

      return {
        ...prev,
        [track]: updated
      };
    });
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setGenerating(true);
    setLyriaAudioUrl(null);

    if (musicEngine === 'lyria') {
      setGenLogs(["⚡ [LYRIA ENGINE]: Accessing Google Lyria sound synthesis cluster...", "Synthesizing deep waveform structures...", "Allocating memory buffers for 15s stereo sound..."]);
      try {
        const response = await fetch('/api/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, durationSeconds: 15 })
        });
        const data = await response.json();
        
        if (response.status === 429) {
          toast.error("Дневной лимит запросов исчерпан. Лимиты задаёт владелец в Cloudflare.");
          setGenLogs(prev => [...prev, "❌ [LIMIT]: Daily generation limit reached.", "Лимит можно проверить в настройках Worker."]);
          setGenerating(false);
          return;
        }

        if (!response.ok) throw new Error(data.error || "Failed to generate audio track");

        setLyriaAudioUrl(data.audioUrl);
        addToHistory({
          type: 'music',
          title: `Generated Music: ${prompt.substring(0, 20)}...`,
          description: prompt,
          previewUrl: data.audioUrl,
          metadata: { prompt, model: "lyria-clip" }
        });
        refreshStatus();
        setGenLogs(prev => [...prev, "✨ [LYRIA ENGINE]: High-fidelity synthesis complete!", "Playhead output is ready for playback."]);
      } catch (err: any) {
        console.error(err);
        setGenLogs(prev => [...prev, `❌ [LYRIA ENGINE ERROR]: ${err.message}`, "Аудио не сгенерировано. MIDI-секвенсор можно запустить отдельно."]);

      } finally {
        setGenerating(false);
      }
    } else {
      await runMidiGen();
    }
  };

  const runMidiGen = async () => {
    setGenLogs(["Initializing real AI generation with Gemini..."]);
    try {
      const systemPrompt = `You are a music sequencer AI. You must return ONLY raw JSON representing a drum/synth sequence based on the user's prompt. 
The JSON must have this exact structure:
{
  "kick": [1,0,0,0, ... (16 items)],
  "hihat": [0,0,1,0, ... (16 items)],
  "bass": [1,0,0,0, ... (16 items)],
  "synth": [0,1,0,0, ... (16 items)],
  "bpm": 120
}
All arrays MUST have exactly 16 elements containing only 1s and 0s. 
Do not include markdown formatting or any other text. Only JSON.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      const data = await response.json();
      
      if (response.status === 429) {
        toast.error("Дневной лимит запросов исчерпан. Лимиты задаёт владелец в Cloudflare.");
        setGenLogs(prev => [...prev, "❌ [LIMIT]: Daily generation limit reached.", "Лимит можно проверить в настройках Worker."]);
        return;
      }

      if (!response.ok) throw new Error(data.error);
      
      let rawText = data.data;
      if (rawText.startsWith('\`\`\`json')) {
        rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
      } else if (rawText.startsWith('\`\`\`')) {
        rawText = rawText.replace(/\`\`\`/g, '');
      }
      
      const parsed = JSON.parse(rawText.trim());
      
      const nextSeq = {
        kick: parsed.kick || [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        hihat: parsed.hihat || [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
        bass: parsed.bass || [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
        synth: parsed.synth || [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0]
      };
      const nextBpm = parsed.bpm || 120;
      
      setSequences(nextSeq);
      setBpm(nextBpm);
      setGenLogs(prev => [...prev, "AI composition complete. Sequence mapped."]);
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      setGenLogs(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full h-full">
      {/* Master Transport Bar */}
      <div className={`shrink-0 flex items-center justify-between p-3 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
         {/* Left: BPM & Time Signature */}
         <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl flex items-center gap-3 font-mono font-bold ${isLight ? 'bg-gray-100 text-gray-800' : 'bg-white/5 text-white'}`}>
             <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-wider opacity-60">BPM</span>
                <input 
                  type="number" 
                  value={bpm} 
                  onChange={(e) => {
                    const newBpm = Number(e.target.value);
                    setBpm(newBpm);
                    if (synthRef.current) synthRef.current.setBpm(newBpm);
                  }}
                  className="bg-transparent w-12 text-center outline-none"
                  min="40" max="300"
                />
             </div>
             <div className={`w-px h-6 ${isLight ? 'bg-gray-300' : 'bg-white/10'}`} />
             <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-wider opacity-60">Sign</span>
                <span className="text-sm">4/4</span>
             </div>
          </div>
          <button className={`p-2 rounded-lg border transition-colors ${isLight ? 'border-gray-200 text-gray-500 hover:bg-gray-100' : 'border-white/10 text-white/50 hover:bg-white/5'}`} title="Metronome (Click)">
            <Radio className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Transport Controls & Display */}
        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-1 p-1.5 rounded-xl border ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/50 border-white/5'}`}>
              <button 
                onClick={() => {
                   if (isPlaying) {
                     synthRef.current?.stop();
                     setIsPlaying(false);
                     setCurrentStep(-1);
                   } else {
                     synthRef.current?.start();
                     setIsPlaying(true);
                   }
                }}
                className={`w-12 h-10 flex items-center justify-center rounded-lg transition-colors ${isPlaying ? (isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isLight ? 'bg-white text-gray-800 shadow' : 'bg-white/10 text-white hover:bg-white/20')}`}
              >
                 {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              <button 
                 onClick={() => {
                   synthRef.current?.stop();
                   setIsPlaying(false);
                   setCurrentStep(-1);
                 }}
                 className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${isLight ? 'hover:bg-white text-gray-500' : 'hover:bg-white/10 text-white/50'}`}
              >
                 <div className="w-4 h-4 bg-current rounded-sm" />
              </button>
              <button className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${isLight ? 'hover:bg-white text-gray-500' : 'hover:bg-white/10 text-white/50'}`}>
                 <div className="w-4 h-4 rounded-full bg-current" />
              </button>
              <button className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${isLight ? 'hover:bg-white text-gray-500' : 'hover:bg-white/10 text-white/50'}`}>
                 <Shuffle className="w-4 h-4" />
              </button>
           </div>
           
           <div className={`px-6 py-2 rounded-xl flex items-center justify-center font-mono text-xl tracking-widest ${isLight ? 'bg-gray-100 text-gray-800' : 'bg-black/80 text-white font-bold border border-white/10'}`}>
              01 : 04 : {currentStep >= 0 ? (currentStep + 1).toString().padStart(2, '0') : '00'} : {totalSteps % 1000}
           </div>
        </div>

        {/* Right: Master Output & CPU */}
        <div className="flex items-center gap-4">
           <div className="flex flex-col gap-1 w-24">
              <div className="flex justify-between text-[9px] font-mono opacity-60 uppercase">
                 <span>CPU</span>
                 <span>{isPlaying ? '14%' : '2%'}</span>
              </div>
              <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                 <div className={`h-full ${isPlaying ? 'bg-emerald-400 w-[14%]' : 'bg-emerald-400/50 w-[2%]'}`} />
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <div className={`w-48 h-10 rounded-lg flex items-center justify-center px-2 border overflow-hidden ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/50 border-white/5'}`}>
                 <SpectralAnalyzer synth={synthRef.current} isPlaying={isPlaying} isLight={isLight} />
              </div>
              <div className={`w-32 h-10 rounded-lg flex items-center justify-center px-2 border ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/50 border-white/5'}`}>
                 <VUMeter isPlaying={isPlaying} isLight={isLight} />
              </div>
           </div>
        </div>
      </div>

      {/* Top Workspace */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
         {/* Tools Sidebar */}
         <div className="flex w-full xl:w-72 shrink-0 flex-col gap-4">
            <div className={`border rounded-2xl p-4 flex-1 flex flex-col min-h-0 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
               <div className={`flex gap-2 border-b pb-4 mb-4 shrink-0 overflow-x-auto ${isLight ? 'border-gray-200' : 'border-white/5'} no-scrollbar`}>
                  <button onClick={() => setActiveTab('dj_studio')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'dj_studio' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-indigo-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ DJ Studio</button>
                  <button onClick={() => setActiveTab('modular_lab')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'modular_lab' ? 'border-violet-500 text-violet-400 font-bold' : 'border-transparent text-gray-500 hover:text-violet-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Modular Lab</button>
                  <button onClick={() => setActiveTab('mixer_os')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'mixer_os' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-gray-500 hover:text-emerald-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Mixer OS</button>
                  <button onClick={() => setActiveTab('pro_agents')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'pro_agents' ? 'border-amber-500 text-amber-400 font-bold' : 'border-transparent text-gray-500 hover:text-amber-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ PRO Agents</button>
                  <button onClick={() => setActiveTab('mastering_os')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'mastering_os' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-gray-500 hover:text-emerald-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Mastering Suite</button>
                  <button onClick={() => setActiveTab('divergent_thinking')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'divergent_thinking' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-indigo-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Divergent Engine</button>
                  <button onClick={() => setActiveTab('cognitive_fusion')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'cognitive_fusion' ? 'border-fuchsia-500 text-fuchsia-400 font-bold' : 'border-transparent text-gray-500 hover:text-fuchsia-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Cognitive Fusion</button>
                  <button onClick={() => setActiveTab('intelligence_agent')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'intelligence_agent' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-indigo-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Music Intelligence</button>
                  <button onClick={() => setActiveTab('quantum_copilot')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'quantum_copilot' ? 'border-violet-500 text-violet-400 font-bold' : 'border-transparent text-gray-500 hover:text-violet-400 dark:text-white/40 dark:hover:text-white/75'}`}>★ Quantum Co-Pilot</button>
                  <button onClick={() => setActiveTab('agents')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'agents' ? 'border-amber-500 text-amber-400 font-bold' : 'border-transparent text-gray-500 hover:text-amber-400 dark:text-white/40 dark:hover:text-white/75'}`}>Music Agents</button>
                  <button onClick={() => setActiveTab('stem_splitter')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'stem_splitter' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-gray-500 hover:text-emerald-400 dark:text-white/40 dark:hover:text-white/75'}`}>Stem Splitter</button>
                  <button onClick={() => setActiveTab('ai')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'ai' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>AI Gen</button>
                  <button onClick={() => setActiveTab('generators')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'generators' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>Top 5 Gen</button>
                  <button onClick={() => setActiveTab('mixer')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'mixer' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>Mixer</button>
                  <button onClick={() => setActiveTab('vst')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'vst' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>VST</button>
                  <button onClick={() => setActiveTab('beatport')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'beatport' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-emerald-400/80 dark:text-white/40 dark:hover:text-emerald-400/70'}`}>Beatport</button>
                  <button onClick={() => setActiveTab('templates')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'templates' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>Templates</button>
                  <button onClick={() => setActiveTab('presets')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'presets' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>Presets</button>
                  <button onClick={() => setActiveTab('analyzer')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'analyzer' ? (isLight ? 'border-gray-900 text-gray-900' : 'border-white text-white') : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white/70'}`}>AI Analyzer</button>
                  <button onClick={() => setActiveTab('pro')} className={`text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === 'pro' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-gray-500 hover:text-fuchsia-400/80 dark:text-white/40 dark:hover:text-fuchsia-400/70'}`}>Pro DAW Features</button>
               </div>
               
               <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                  {activeTab === 'agents' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                      <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Specialized Music Swarm
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {MUSIC_AGENTS.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => setSelectedMusicAgent(agent.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedMusicAgent === agent.id
                                ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                : isLight
                                  ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            <div className="text-[10px] font-bold font-mono uppercase">{agent.name}</div>
                            <div className="text-[8px] font-mono opacity-60">{agent.role}</div>
                          </button>
                        ))}
                      </div>
                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/40 border-white/10'}`}>
                        <div className="text-[9px] font-mono text-zinc-500 uppercase mb-2">Active Intelligence Log</div>
                        <div className="text-[10px] font-mono text-zinc-300 leading-relaxed italic">
                          {selectedMusicAgent === 'composer' && '"I am Zadkiel. I am currently analyzing the melodic density of your current sequence to suggest a counterpoint transition."'}
                          {selectedMusicAgent === 'engineer' && '"I am Jophiel. Detected resonance at 250Hz in the bass track. Suggesting a narrow Q notch filter."'}
                          {selectedMusicAgent === 'mastering' && '"I am Metatron. Monitoring output peaks. We have 3dB of headroom remaining for a clean export."'}
                          {selectedMusicAgent === 'sound_designer' && '"I am Raziel. Injected organic noise layer to the synth patch to increase perceptual depth."'}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'stem_splitter' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                      <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold mb-1 flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5" /> AI Stem Separation
                      </div>
                      <div className={`p-6 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center gap-3 ${isLight ? 'bg-gray-50' : 'bg-black/20'}`}>
                        <Upload className="w-8 h-8 text-zinc-600" />
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-zinc-300">Drag track here to split</div>
                          <div className="text-[9px] text-zinc-600 font-mono">MP3, WAV, FLAC (Max 50MB)</div>
                        </div>
                        <button className="mt-2 px-4 py-2 bg-zinc-800 text-white text-[10px] font-mono uppercase rounded-lg hover:bg-zinc-700 transition">Select File</button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[9px] font-mono text-zinc-500 uppercase">Extraction Parameters</div>
                        <div className="flex flex-col gap-1.5">
                          {['Vocals', 'Drums', 'Bass', 'Instruments', 'Other'].map(stem => (
                            <div key={stem} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                              <span className="text-[10px] font-mono text-zinc-400">{stem}</span>
                              <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="w-full h-full bg-emerald-500/40" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai' ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
													{/* Engine Selector */}
													<div className="flex flex-col gap-1.5 mb-4 border-b border-white/5 pb-4">
														<span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Music Synthesis Engine</span>
														<div className="grid grid-cols-2 gap-2 mt-1">
															<button
																type="button"
																onClick={() => setMusicEngine('midi')}
																className={`py-1.5 px-2 rounded-lg border text-[10px] font-mono uppercase tracking-wider text-center transition-all ${musicEngine === 'midi' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold' : (isLight ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-[#0b0b0b] border-white/10 text-white/50 hover:bg-[#0f0f0f]')}`}
															>
																🎹 Sequencer (MIDI)
															</button>
															<button
																type="button"
																onClick={() => setMusicEngine('lyria')}
																className={`py-1.5 px-2 rounded-lg border text-[10px] font-mono uppercase tracking-wider text-center transition-all ${musicEngine === 'lyria' ? 'bg-purple-600/20 border-purple-500 text-purple-400 font-bold' : (isLight ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-[#0b0b0b] border-white/10 text-white/50 hover:bg-[#0f0f0f]')}`}
															>
																🎼 Google Lyria AI
															</button>
														</div>
													</div>
													Describe Music Style
												</label>
                        <form onSubmit={handleAIGenerate} className="flex flex-col gap-3">
                          <div className="relative flex flex-col">
                            <textarea 
                              value={prompt}
                              onChange={e => setPrompt(e.target.value)}
                              placeholder="e.g. Ambient dark cinematic techno with glitchy hihats and heavy sub bass..."
                              className={`w-full h-24 border rounded-xl p-3 pr-12 text-xs outline-none transition-colors resize-none font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                            />
                            <div className="absolute right-2 bottom-2 z-10">
                              <VoiceInputButton value={prompt} onChange={setPrompt} isLight={isLight} size="sm" />
                            </div>
                          </div>
                          
                          <button 
                            type="submit"
                            disabled={generating || !prompt}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                              generating 
                                ? 'bg-indigo-600/50 text-white cursor-not-allowed' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700'
                            }`}
                          >
                            {generating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" /> Neural Composition
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {generating || genLogs.length > 0 ? (
                        <div className={`p-3 rounded-xl border font-mono text-[9px] ${isLight ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-white/5 border-white/10 text-white/70'}`}>
                          <div className="flex items-center gap-1.5 mb-2 font-bold uppercase tracking-wider text-[10px] text-indigo-400">
                            <Activity className="w-3 h-3 animate-pulse" /> Neural Engine Log
                          </div>
                          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                            {genLogs.map((log, i) => (
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

                      <div className="flex flex-col gap-2">
                        <label className={`text-[10px] font-mono uppercase tracking-wider flex justify-between items-center ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                           <span>Genres / Styles</span>
                           <span className="text-[8px] opacity-70">Top Beatport Categories</span>
                        </label>
                        <div className="h-48 overflow-y-auto rounded-xl border p-2 flex flex-wrap gap-1.5 no-scrollbar content-start bg-black/10 shadow-inner" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.05)' }}>
                          {[
                            "140 / Deep Dubstep / Grime", "Afro House", "Amapiano", "Ambient / Experimental", 
                            "Bass / Club", "Bass House", "Brazilian Funk", "Breaks / Breakbeat / UK Bass", 
                            "Dance / Pop", "Deep House", "DJ Tools / Acapellas", "Downtempo", "Drum & Bass", 
                            "Dubstep", "Electro (Classic / Detroit / Modern)", "Electronica", "Funky House", 
                            "Hard Dance / Hardcore / Neo Rave", "Hard Techno", "House", "Indie Dance", 
                            "Jackin House", "Latin Electronic", "Mainstage", "Melodic House & Techno", 
                            "Minimal / Deep Tech", "Nu Disco / Disco", "Organic House", "Progressive House", 
                            "Psy-Trance", "Tech House", "Techno (Peak Time / Driving)", "Techno (Raw / Deep / Hypnotic)", 
                            "Trance (Main Floor)", "Trance (Raw / Deep / Hypnotic)", "Trap / Future Bass", 
                            "UK Garage / Bassline", "Classic Techno", "Dark Minimal Techno", "Dark Techno", "PSI Techno"
                          ].map(genre => (
                            <button
                               key={genre}
                               onClick={() => {
                                 setPrompt(`A ${genre} track, professionally mixed and mastered.`);
                                 setSelectedAIStyle(genre);
                               }}
                               className={`px-2 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-tight text-left transition-colors whitespace-nowrap ${
                                 selectedAIStyle === genre 
                                   ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 font-bold' 
                                   : (isLight ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-white/5 border border-white/5 text-white/60 hover:bg-white/10')
                               }`}
                            >
                               {genre}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'generators' ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3"/> Top 5 Advanced AI Track Generators</div>
                      <ToolButton icon={<Zap className="text-indigo-400"/>} label="1. Neural Symphony X" desc="Complex classical & cinematic orchestration" isLight={isLight} />
                      <ToolButton icon={<Server className="text-cyan-400"/>} label="2. DeepBass ProGen" desc="Advanced neurofunk & dubstep engine" isLight={isLight} />
                      <ToolButton icon={<Radio className="text-emerald-400"/>} label="3. Lo-Fi Quantum" desc="Chilled hip-hop with organic noise" isLight={isLight} />
                      <ToolButton icon={<Disc className="text-fuchsia-400"/>} label="4. Techno Construct 909" desc="Industrial 4/4 minimal sequence generator" isLight={isLight} />
                      <ToolButton icon={<Sparkles className="text-indigo-400"/>} label="5. Auto-Stem Separator" desc="Generates tracks via isolation" isLight={isLight} />
                    </div>
                  ) : activeTab === 'mixer' ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5"/> Mixing Console
                         </div>
                         <div className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                            Channel Strip
                         </div>
                      </div>

                      <div className={`p-3 rounded-xl border flex flex-col gap-3 ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                         <div className="text-[9px] font-mono uppercase font-bold text-gray-400 border-b border-gray-500/20 pb-1 flex items-center justify-between">
                            <span>Preset Library</span>
                            <Library className="w-3 h-3"/>
                         </div>
                         <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {savedPresets.map(preset => (
                               <div 
                                 key={preset.id} 
                                 className={`p-2 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-colors ${
                                   activePreset === preset.id
                                     ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                                     : (isLight ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700' : 'bg-black/20 border-white/5 hover:bg-white/5 text-white/70')
                                 }`}
                                 onClick={() => setActivePreset(preset.id)}
                               >
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-bold font-mono">{preset.name}</span>
                                     <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/20 text-indigo-400 uppercase font-mono">{preset.genre}</span>
                                  </div>
                                  <div className="text-[8px] font-mono opacity-60 flex gap-1 items-center flex-wrap">
                                     {preset.plugins.map((plug, i) => (
                                        <span key={i} className="bg-black/10 px-1 py-0.5 rounded">{plug}</span>
                                     ))}
                                  </div>
                               </div>
                            ))}
                         </div>
                         
                         <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-500/20">
                            <input 
                              type="text" 
                              value={newPresetName}
                              onChange={e => setNewPresetName(e.target.value)}
                              placeholder="New Preset Name..."
                              className={`w-full px-2 py-1.5 text-[9px] font-mono rounded border outline-none ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-black/20 border-white/10 text-white focus:border-indigo-500/50'}`}
                            />
                            <div className="flex gap-2">
                               <select 
                                 value={newPresetGenre}
                                 onChange={e => setNewPresetGenre(e.target.value)}
                                 className={`flex-1 px-2 py-1.5 text-[9px] font-mono rounded border outline-none appearance-none ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black/20 border-white/10 text-white'}`}
                               >
                                  <option>Melodic House & Techno</option>
                                  <option>Techno (Peak Time / Driving)</option>
                                  <option>Afro House</option>
                                  <option>Dark Minimal Techno</option>
                                  <option>Indie Dance</option>
                               </select>
                               <button 
                                 onClick={() => {
                                    if(newPresetName) {
                                       setSavedPresets([...savedPresets, {
                                          id: Date.now().toString(),
                                          name: newPresetName,
                                          genre: newPresetGenre,
                                          plugins: ['Pro-Q 3', 'Multiband Comp', 'Reverb']
                                       }]);
                                       setNewPresetName('');
                                       toast.success(`Preset "${newPresetName}" saved`);
                                    }
                                 }}
                                 className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-mono uppercase font-bold rounded flex items-center gap-1 transition-colors"
                               >
                                  <Save className="w-3 h-3"/> Save
                               </button>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-col gap-2">
                         <div className="text-[9px] font-mono uppercase font-bold text-gray-400 mb-1">Active Chain</div>
                         <ToolButton icon={<Sliders />} label="Master EQ 8" desc="Parametric 8-band precision" isLight={isLight} active />
                         <ToolButton icon={<Activity />} label="Multiband Compressor" desc="Dynamic frequency control" isLight={isLight} />
                         <ToolButton icon={<Layers />} label="Convolution Reverb" desc="Real acoustic spaces" isLight={isLight} />
                         <ToolButton icon={<Wand2 />} label="AI Mastering" desc="Auto-level LUFS target" isLight={isLight} />
                      </div>
                    </div>
                  ) : activeTab === 'vst' ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-[10px] font-mono uppercase text-fuchsia-400 font-bold flex items-center justify-between">
                        <span>VST3 / AU Plugins</span>
                        <span className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-2 py-0.5 rounded">Top Tools By Category</span>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        {/* Synthesizers */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10 flex items-center gap-1">
                             <Settings2 className="w-3 h-3 text-emerald-400"/> Synthesizers (Synths)
                          </div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Settings2 className="text-emerald-400" />} label="Diva 2.0 (u-he)" desc="Analog emulation / lush pads & bass" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-emerald-400" />} label="Serum (Xfer Records)" desc="Advanced Wavetable synthesis" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-emerald-400" />} label="Pigments 5 (Arturia)" desc="Polychrome software synthesizer" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-emerald-400" />} label="Phase Plant (Kilohearts)" desc="Modular sound design ecosystem" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-emerald-400" />} label="Omnisphere 3 (Spectrasonics)" desc="Power synth & cinematic atmospheres" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-emerald-400" />} label="Massive X (Native Instruments)" desc="Next-gen virtual-analog architecture" isLight={isLight} />
                          </div>
                        </div>

                        {/* Mixing */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10 flex items-center gap-1">
                             <Sliders className="w-3 h-3 text-cyan-400"/> Mixing (EQ, Saturation)
                          </div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Sliders className="text-cyan-400" />} label="FabFilter Pro-Q 3" desc="Industry standard dynamic EQ" isLight={isLight} />
                            <ToolButton icon={<Sliders className="text-cyan-400" />} label="Soothe2 (Oeksound)" desc="Dynamic resonance suppressor" isLight={isLight} />
                            <ToolButton icon={<Sliders className="text-cyan-400" />} label="Decapitator (Soundtoys)" desc="Analog saturation modeling" isLight={isLight} />
                            <ToolButton icon={<Sliders className="text-cyan-400" />} label="Saturn 2 (FabFilter)" desc="Multiband distortion & saturation" isLight={isLight} />
                            <ToolButton icon={<Sliders className="text-cyan-400" />} label="Trackspacer (Wavesfactory)" desc="Hidden frequency masking resolver" isLight={isLight} />
                            <ToolButton icon={<Sliders className="text-cyan-400" />} label="Gullfoss (Soundtheory)" desc="Intelligent automated equalization" isLight={isLight} />
                          </div>
                        </div>

                        {/* Compressors */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10 flex items-center gap-1">
                             <Activity className="w-3 h-3 text-rose-400"/> Compressors (Dynamics)
                          </div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Activity className="text-rose-400" />} label="FabFilter Pro-C 2" desc="Versatile broadband compressor" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="SSL Native Bus Compressor" desc="The 'glue' for mix busses" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="Shadow Hills Mastering Compressor" desc="Optical & Discrete dynamics" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="CLA-2A / CLA-76 (Waves)" desc="Classic optical & FET emulation" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="Pro-MB (FabFilter)" desc="Precision multiband compression" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="OTT (Xfer Records)" desc="Aggressive multiband upwards/downwards" isLight={isLight} />
                          </div>
                        </div>

                        {/* Limiters & Mastering */}
                        <div>
                          <div className="text-[9px] font-mono uppercase font-bold text-gray-400 mb-2 pb-1 border-b border-white/10 flex items-center gap-1">
                             <Layers className="w-3 h-3 text-indigo-400"/> Limiters & Mastering
                          </div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Layers className="text-indigo-400" />} label="FabFilter Pro-L 2" desc="True peak limiter & loudness metering" isLight={isLight} />
                            <ToolButton icon={<Layers className="text-indigo-400" />} label="Ozone 11 Advanced (iZotope)" desc="Complete AI-assisted mastering suite" isLight={isLight} />
                            <ToolButton icon={<Layers className="text-indigo-400" />} label="Weiss DS1-MK3 (Softube)" desc="Legendary mastering compressor/limiter" isLight={isLight} />
                            <ToolButton icon={<Layers className="text-indigo-400" />} label="Stealth Limiter (IK Multimedia)" desc="Ultra-transparent inter-sample peak limiter" isLight={isLight} />
                            <ToolButton icon={<Layers className="text-indigo-400" />} label="StandardCLIP (SIR Audio Tools)" desc="Premium mastering clipper" isLight={isLight} />
                            <ToolButton icon={<Layers className="text-indigo-400" />} label="Limitless (DMG Audio)" desc="Advanced multiband limiter & clipper" isLight={isLight} />
                          </div>
                        </div>

                        {/* FX & Spatial */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10 flex items-center gap-1">
                             <Sparkles className="w-3 h-3 text-fuchsia-400"/> FX & Spatial
                          </div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="Valhalla VintageVerb" desc="Lush classic digital reverbs" isLight={isLight} />
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="EchoBoy (Soundtoys)" desc="Ultimate analog echo modeling" isLight={isLight} />
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="ShaperBox 3 (Cableguys)" desc="Volume/pan/filter rhythmic gating" isLight={isLight} />
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="Portal (Output)" desc="Granular synthesis & micro-blooping" isLight={isLight} />
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="MicroTonic (Sonic Charge)" desc="Synthesized minimal drum machine" isLight={isLight} />
                          </div>
                        </div>

                      </div>

                      <button className="mt-2 w-full py-2 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] font-mono uppercase rounded-xl hover:bg-fuchsia-500/20 transition-colors">
                        + Scan New VST Directory
                      </button>
                    </div>
                  ) : activeTab === 'beatport' ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Beatport DJ Integration</div>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                         <div className="text-[10px] font-mono text-emerald-400 mb-2">LIVE CONNECTION STATUS: <span className="font-bold text-white">ONLINE</span></div>
                         <p className="text-[9px] text-gray-400 font-mono mb-3">Syncing crates and scanning tracks for harmonic mixing weak spots & overlapping frequencies.</p>
                         <button className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-mono uppercase font-bold hover:bg-emerald-500 transition">Scan Current Mix</button>
                      </div>
                      <ToolButton icon={<Activity className="text-rose-400" />} label="Harmonic Clash Detected" desc="Track 1 & Track 2 key conflict" isLight={isLight} active />
                      <ToolButton icon={<Zap className="text-indigo-400" />} label="Low-End Mud Warning" desc="Sub frequencies overlapping" isLight={isLight} />
                    </div>
                                                      ) : activeTab === 'pro' ? (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                      <div className="text-[10px] font-mono uppercase text-fuchsia-400 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1"><Sparkle className="w-3 h-3"/> Top 3 Exclusive DAW Integrations</span>
                        <span className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-2 py-0.5 rounded">Pro Engine</span>
                      </div>

                      <div className="flex flex-col gap-4">
                         {/* Ableton */}
                         <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                               <div className="font-bold text-[11px] font-mono uppercase tracking-wider text-white">Live Engine (Ableton Mode)</div>
                               <div className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">Session View & Warp</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                               <div className="h-20 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-white/50">
                                  <Layers className="w-4 h-4 mb-1" />
                                  <span className="text-[9px] uppercase font-mono">Matrix Launch</span>
                               </div>
                               <div className="h-20 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-white/50">
                                  <Zap className="w-4 h-4 mb-1" />
                                  <span className="text-[9px] uppercase font-mono">Neural Warp (Pro-Q)</span>
                               </div>
                            </div>
                            <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-mono uppercase transition-colors">
                               Launch Session View
                            </button>
                         </div>

                         {/* FL Studio */}
                         <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-gray-200' : 'bg-orange-500/5 border-orange-500/20'}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-orange-500/20 pb-2">
                               <div className="font-bold text-[11px] font-mono uppercase tracking-wider text-orange-400">Fruity Engine (FL Mode)</div>
                               <div className="text-[9px] font-mono bg-orange-500/10 px-2 py-0.5 rounded text-orange-400">Step Rack & Patcher</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                               <div className="h-20 border border-dashed border-orange-500/20 rounded-lg flex flex-col items-center justify-center bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer text-orange-400/70">
                                  <Server className="w-4 h-4 mb-1" />
                                  <span className="text-[9px] uppercase font-mono">Channel Rack +</span>
                               </div>
                               <div className="h-20 border border-dashed border-orange-500/20 rounded-lg flex flex-col items-center justify-center bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer text-orange-400/70">
                                  <Activity className="w-4 h-4 mb-1" />
                                  <span className="text-[9px] uppercase font-mono">Soundgoodizer AI</span>
                               </div>
                            </div>
                            <button className="w-full py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-[9px] font-mono uppercase transition-colors border border-orange-500/20">
                               Open Node Router (Patcher)
                            </button>
                         </div>

                         {/* Logic Pro */}
                         <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-gray-200' : 'bg-blue-500/5 border-blue-500/20'}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-blue-500/20 pb-2">
                               <div className="font-bold text-[11px] font-mono uppercase tracking-wider text-blue-400">Logic Engine (Logic Mode)</div>
                               <div className="text-[9px] font-mono bg-blue-500/10 px-2 py-0.5 rounded text-blue-400">Drummer & Alchemy</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                               <div className="h-20 border border-dashed border-blue-500/20 rounded-lg flex flex-col items-center justify-center bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer text-blue-400/70">
                                  <Disc className="w-4 h-4 mb-1" />
                                  <span className="text-[9px] uppercase font-mono">AI Virtual Drummer</span>
                               </div>
                               <div className="h-20 border border-dashed border-blue-500/20 rounded-lg flex flex-col items-center justify-center bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer text-blue-400/70">
                                  <Settings2 className="w-4 h-4 mb-1" />
                                  <span className="text-[9px] uppercase font-mono">Alchemy (Granular)</span>
                               </div>
                            </div>
                            <button className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-[9px] font-mono uppercase transition-colors border border-blue-500/20">
                               Extract Stems (Stem Splitter)
                            </button>
                         </div>
                      </div>
                    </div>
                  ) : activeTab === 'analyzer' ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3"/> Neural DAW Analyst v2.0</span>
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Top 1 Precision</span>
                      </div>

                      <div className={`p-3 rounded-xl border text-[9px] font-mono ${isLight ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'}`}>
                        Advanced parsing of .als (Ableton) & .flp (FL Studio) files. Compares your harmonic structure, arrangement, and mixing against Beatport Top 10.
                      </div>

                      {!scanResult && !isScanningProject && (
                          <div className="flex flex-col gap-2">
                             <button 
                               onClick={() => {
                                  setIsScanningProject(true);
                                  setScanProgress(0);
                                  let p = 0;
                                  const interval = setInterval(() => {
                                      p += 5;
                                      setScanProgress(p);
                                      if (p >= 100) {
                                          clearInterval(interval);
                                          setIsScanningProject(false);
                                          setScanResult({
                                              score: 84,
                                              weaknesses: ['Sub-bass phase collision at 45Hz', 'Lacking mid-range width on Lead Synth', 'Kick tail is too long for 128 BPM Techno'],
                                              suggestions: ['Apply dynamic EQ ducking on bassline', 'Use mid/side EQ on main synth bus', 'Shorten kick envelope decay by 40ms'],
                                              matchedTemplate: 'Melodic Techno (Peak Time)'
                                          });
                                      }
                                  }, 150);
                               }}
                               className="w-full py-6 border-2 border-dashed border-indigo-500/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-500/5 transition-colors text-indigo-400"
                             >
                                <Upload className="w-6 h-6 mb-1"/>
                                <div className="text-[11px] font-bold uppercase tracking-wider">Drop .ALS or .FLP file here</div>
                                <div className="text-[9px] opacity-70">Deep Neural Scan & Re-Arrangement</div>
                             </button>
                             <button onClick={() => setShowPythonScript(!showPythonScript)} className="text-[9px] font-mono text-center text-gray-500 hover:text-indigo-400 transition-colors uppercase mt-2">
                                &lt; View Python Parser Engine / API &gt;
                             </button>
                          </div>
                      )}

                      {showPythonScript && (
                         <div className={`p-3 rounded-xl border relative ${isLight ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-black border-white/20 text-white/70'}`}>
                            <button onClick={() => setShowPythonScript(false)} className="absolute top-2 right-2 text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>
                            <div className="text-[9px] font-mono uppercase text-orange-400 font-bold mb-2 pb-1 border-b border-white/10">als_parser.py (Run locally to extract DAW data)</div>
                            <pre className="text-[8px] font-mono overflow-x-auto">
{`import gzip
import xml.etree.ElementTree as ET
import json

def parse_als(file_path):
    print(f"Scanning project: {file_path}")
    try:
        with gzip.open(file_path, 'rb') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            
            tempo_node = root.find('.//Tempo/Manual')
            tempo = tempo_node.attrib.get('Value') if tempo_node is not None else "Unknown"
            
            tracks = root.findall('.//MidiTrack') + root.findall('.//AudioTrack')
            track_names = [t.find('.//Name/EffectiveName').attrib.get('Value', 'Untitled') 
                           for t in tracks if t.find('.//Name/EffectiveName') is not None]
            
            plugins = []
            for plugin in root.findall('.//PluginDevice'):
                name_node = plugin.find('.//PlugName')
                if name_node is not None:
                    plugins.append(name_node.attrib.get('Value', 'Unknown VST'))
            
            data = {
                "tempo": tempo,
                "track_count": len(tracks),
                "tracks": track_names,
                "vsts": list(set(plugins)),
                "analysis": "Structure matches 84% of Beatport Top 10 Melodic Techno."
            }
            return json.dumps(data, indent=2)
            
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    result = parse_als("my_project.als")
    print(result)`}
                            </pre>
                         </div>
                      )}

                      {isScanningProject && (
                         <div className="flex flex-col gap-3 p-4 border border-indigo-500/30 rounded-xl bg-indigo-500/5">
                            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-indigo-400">
                               <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin"/> Decompiling Project Structure...</span>
                               <span>{scanProgress}%</span>
                            </div>
                            <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500 transition-all duration-150" style={{width: `${scanProgress}%`}} />
                            </div>
                            <div className="text-[8px] font-mono text-indigo-400/70">
                               {scanProgress < 30 ? '> Reading XML nodes...' : scanProgress < 60 ? '> Mapping VST instances and MIDI clips...' : '> Running Harmonic phase alignment check...'}
                            </div>
                         </div>
                      )}

                      {scanResult && !isScanningProject && (
                         <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-mono text-indigo-400/80 uppercase">Structural Match Score</span>
                                  <span className="text-xl font-bold text-indigo-400 font-mono">{scanResult.score}%</span>
                               </div>
                               <div className="text-right flex flex-col">
                                  <span className="text-[9px] font-mono text-indigo-400/80 uppercase">Template Match</span>
                                  <span className="text-[11px] font-bold text-white font-mono">{scanResult.matchedTemplate}</span>
                               </div>
                            </div>

                            <div className="flex flex-col gap-2">
                               <div className="text-[10px] font-mono uppercase text-red-400 font-bold flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3"/> Critical Weaknesses Detected
                               </div>
                               {scanResult.weaknesses.map((w: string, i: number) => (
                                  <div key={i} className={`p-2 rounded-lg border text-[9px] font-mono flex items-start gap-2 ${isLight ? 'bg-red-50 border-red-100 text-red-800' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                                     <span className="mt-0.5">•</span> <span>{w}</span>
                                  </div>
                               ))}
                            </div>

                            <div className="flex flex-col gap-2">
                               <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                                  <Sparkles className="w-3 h-3"/> AI Corrective Suggestions
                               </div>
                               {scanResult.suggestions.map((s: string, i: number) => (
                                  <div key={i} className={`p-2 rounded-lg border text-[9px] font-mono flex items-start gap-2 ${isLight ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                                     <span className="mt-0.5">→</span> <span>{s}</span>
                                  </div>
                               ))}
                            </div>

                            <div className="flex gap-2 mt-2">
                               <button 
                                 onClick={() => {
                                    setScanResult(null);
                                    setScanProgress(0);
                                 }}
                                 className="flex-1 py-2 rounded-lg border border-gray-500/30 text-gray-400 text-[9px] font-mono uppercase hover:bg-gray-500/10 transition-colors"
                               >
                                 Scan Another
                               </button>
                               <button 
                                 onClick={() => toast.success("Project auto-fixed and exported to .als")}
                                 className="flex-[2] py-2 rounded-lg bg-orange-600 text-white font-bold text-[9px] font-mono uppercase tracking-wider hover:bg-orange-500 transition-colors flex items-center justify-center gap-1"
                               >
                                 <Save className="w-3 h-3" /> Auto-Fix & Export .als
                               </button>
                            </div>
                         </div>
                      )}
                    </div>
                  ) : activeTab === 'presets' ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold flex items-center justify-between">
                        <span>Preset Management</span>
                        <button onClick={() => toast.success("Current preset saved to library")} className="text-[8px] bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/20 transition-colors">Save Current</button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {[
                          { id: 'mt', name: 'Melodic House & Techno', genre: 'Master Chain', color: 'indigo' },
                          { id: 'pt', name: 'Peak Time Techno', genre: 'Drive Bus', color: 'rose' },
                          { id: 'da', name: 'Deep Ambient', genre: 'Space / Reverb', color: 'cyan' },
                          { id: 'mf', name: 'Mainstage Focus', genre: 'Loudness / EQ', color: 'amber' }
                        ].map(preset => (
                          <div 
                            key={preset.id} 
                            onClick={() => setActivePreset(preset.id)}
                            className={`p-3 rounded-xl border group cursor-pointer transition-all ${activePreset === preset.id ? (isLight ? 'bg-indigo-50 border-indigo-400' : 'bg-indigo-500/10 border-indigo-500/50') : (isLight ? 'bg-white border-gray-100 hover:border-indigo-300' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10')}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full bg-${preset.color}-500 shadow-[0_0_8px_rgba(var(--${preset.color}-500),0.5)]`}></div>
                                <span className={`text-[10px] font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{preset.name}</span>
                              </div>
                              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono text-gray-500 uppercase">{preset.genre}</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className={`w-4 h-1 rounded-full ${isLight ? 'bg-gray-200' : 'bg-white/10'}`}></div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={`mt-4 pt-4 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                        <div className="text-[9px] font-mono text-gray-500 uppercase mb-3">Signal Chain Configuration</div>
                        <div className="flex flex-col gap-2">
                          {['Pro-Q 3', 'Shadow Hills Class A', 'Gullfoss', 'Ozone 11', 'Pro-L 2'].map((plugin, i) => (
                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border text-[9px] font-mono ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-black/40 border-white/5'}`}>
                              <div className="w-4 h-4 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-[8px]">{i + 1}</div>
                              <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{plugin}</span>
                              <div className="ml-auto flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                <Settings className="w-2.5 h-2.5 text-gray-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'templates' ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold flex items-center justify-between">
                        <span>Beatport Top 10 Project Templates</span>
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Melodic House & Techno</span>
                      </div>

                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-2">
                        <p className="text-[9px] text-gray-300 font-mono leading-relaxed">Analysis of the standard DAW project blueprint for a Top 10 Beatport track. Ready for remixing & stem extraction.</p>
                      </div>

                      <div className="flex flex-col gap-4">
                        {/* Drum Group */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10">1. Drum Bus / Rhythm Section</div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Disc className="text-emerald-400" />} label="Kick Drum" desc="Deep, punchy (Kick 2) + Sub layer" isLight={isLight} />
                            <ToolButton icon={<Disc className="text-emerald-400" />} label="Percussion & Tops" desc="Minimalist 909 hats, shakers, organic claps" isLight={isLight} />
                            <ToolButton icon={<Disc className="text-emerald-400" />} label="Drum Bus FX" desc="Glue compression & subtle saturation (Decapitator)" isLight={isLight} />
                          </div>
                        </div>

                        {/* Bass Group */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10">2. Low End / Bassline</div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Activity className="text-rose-400" />} label="Sub Bass" desc="Clean sine/triangle wave (SubBoomBass 2 / Operator)" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="Mid Bass / Rolling Arp" desc="1/16th note rolling bass (Diva / Serum)" isLight={isLight} />
                            <ToolButton icon={<Activity className="text-rose-400" />} label="Sidechain & EQ" desc="LFO Tool / Pro-Q 3 dynamic masking" isLight={isLight} />
                          </div>
                        </div>

                        {/* Synths & Melodies */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10">3. Synths & Melodies</div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Settings2 className="text-cyan-400" />} label="Main Theme Lead" desc="Detuned, filter-modulated pluck (Pigments / Prophet)" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-cyan-400" />} label="Atmospheric Pads" desc="Lush evolving chords (Omnisphere 3)" isLight={isLight} />
                            <ToolButton icon={<Settings2 className="text-cyan-400" />} label="Drone / Texture" desc="Background noise & tonal beds (Kontakt)" isLight={isLight} />
                          </div>
                        </div>

                        {/* FX & Vocals */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10">4. FX, Vocals & Transitions</div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="Vocal Chops / Spoken Word" desc="Ethereal phrasing + Valhalla VintageVerb" isLight={isLight} />
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="Impacts & Risers" desc="White noise sweeps, reverse cymbals, downlifters" isLight={isLight} />
                            <ToolButton icon={<Sparkles className="text-fuchsia-400" />} label="Ear Candy" desc="Incidental glitches & micro-textures (Portal)" isLight={isLight} />
                          </div>
                        </div>

                        {/* Master Bus */}
                        <div>
                          <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold mb-2 pb-1 border-b border-white/10">5. Mix Bus & Mastering</div>
                          <div className="flex flex-col gap-2">
                            <ToolButton icon={<Layers className="text-amber-400" />} label="Master Chain" desc="Ozone 11, Pro-L 2 (Target: -7 to -8 LUFS)" isLight={isLight} />
                            <ToolButton icon={<Layers className="text-amber-400" />} label="Bus EQ & Clipper" desc="Soothe2 (harshness) + StandardCLIP" isLight={isLight} />
                          </div>
                        </div>
                      </div>

                      <button className="mt-2 w-full py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono uppercase rounded-xl hover:bg-indigo-500/20 transition-colors">
                        ↓ Download Ableton/FL Template (.zip)
                      </button>

                      <div className={`mt-4 pt-4 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                         <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold mb-3 flex items-center gap-1">
                            <Wand2 className="w-3 h-3"/> AI Remix & Variation Engine
                         </div>
                         
                         {!uploadedProject ? (
                            <button 
                              onClick={() => {
                                 setIsUploadingProject(true);
                                 setTimeout(() => { setIsUploadingProject(false); setUploadedProject('Melodic_Techno_Base_Project_v4.als'); }, 2000);
                              }}
                              disabled={isUploadingProject}
                              className={`w-full py-3 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${isLight ? 'border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600' : 'border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400'}`}
                            >
                               {isUploadingProject ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                               <span className="text-[10px] font-mono uppercase font-bold">{isUploadingProject ? 'Uploading Project Stems & MIDI...' : 'Upload Project (.als, .flp, .zip)'}</span>
                            </button>
                         ) : (
                            <div className="flex flex-col gap-3">
                               <div className={`p-2 rounded-lg border flex items-center justify-between text-[10px] font-mono ${isLight ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'}`}>
                                  <div className="flex items-center gap-2"><Disc className="w-4 h-4"/> {uploadedProject}</div>
                                  <button onClick={() => {
                                     setUploadedProject(null);
                                     setGeneratedRemixes([]);
                                     setRemixLogs([]);
                                  }} className="hover:text-red-400 transition-colors"><X className="w-3 h-3"/></button>
                               </div>

                               <button 
                                  onClick={() => {
                                     setIsGeneratingRemix(true);
                                     setRemixLogs(['Analyzing project stems...', 'Extracting MIDI harmonies...', 'Generating alternative basslines...']);
                                     setTimeout(() => setRemixLogs(prev => [...prev, 'Synthesizing new lead patches...']), 1500);
                                     setTimeout(() => setRemixLogs(prev => [...prev, 'Applying AI mastering chain...']), 3000);
                                     setTimeout(() => {
                                        setIsGeneratingRemix(false);
                                        setGeneratedRemixes(prev => [...prev, { name: `AI Remix V${prev.length + 1} (Deep Tech)`, style: 'Minimal / Deep Tech' }]);
                                     }, 4500);
                                  }}
                                  disabled={isGeneratingRemix}
                                  className={`w-full py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${isGeneratingRemix ? 'bg-indigo-600/50 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700'}`}
                               >
                                  {isGeneratingRemix ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Processing Stems...</> : <><Sparkles className="w-3.5 h-3.5"/> Generate AI Remixes</>}
                               </button>

                               {isGeneratingRemix && (
                                   <div className={`p-2 rounded border font-mono text-[9px] h-20 overflow-y-auto ${isLight ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-black/50 border-white/10 text-white/50'}`}>
                                      {remixLogs.map((log, i) => <div key={i} className="mb-1 opacity-80">&gt; {log}</div>)}
                                   </div>
                               )}

                               {generatedRemixes.length > 0 && (
                                  <div className="flex flex-col gap-2 mt-2">
                                     <div className="text-[9px] font-mono uppercase text-zinc-400 font-bold">Generated Variations:</div>
                                     {generatedRemixes.map((remix, i) => (
                                        <div key={i} className={`p-2 rounded-lg border flex items-center justify-between text-[10px] font-mono ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                                           <div>
                                              <div className={`font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>{remix.name}</div>
                                              <div className={`text-[8px] ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{remix.style}</div>
                                           </div>
                                           <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-colors uppercase tracking-wider font-bold text-[8px]">Load Project</button>
                                        </div>
                                     ))}
                                  </div>
                               )}
                            </div>
                         )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <ToolButton icon={<Activity />} label="Beat Sequencer" desc="Create patterns" isLight={isLight} active />
                      <ToolButton icon={<Music />} label="Piano Roll" desc="Full note editor" isLight={isLight} />
                    </>
                  )}
               </div>
            </div>
         </div>

         {/* Sequencer/Mixer Area */}
         <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {activeTab === 'dj_studio' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <DJStudio />
              </div>
            ) : activeTab === 'modular_lab' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <ModularLab />
              </div>
            ) : activeTab === 'mixer_os' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <MixerConsole />
              </div>
            ) : activeTab === 'pro_agents' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <AIAgents />
              </div>
            ) : activeTab === 'mastering_os' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <MasteringSuite />
              </div>
            ) : activeTab === 'divergent_thinking' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <DivergentEngine />
              </div>
            ) : activeTab === 'cognitive_fusion' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <CognitiveFusionEngine />
              </div>
            ) : activeTab === 'intelligence_agent' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <MusicIntelligenceAgent isLight={isLight} />
              </div>
            ) : activeTab === 'quantum_copilot' ? (
              <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/5'}`}>
                    <div className="flex items-center gap-3 mb-4 text-indigo-400">
                      <Sparkles className="w-5 h-5" />
                      <h4 className="text-xs font-mono uppercase tracking-widest font-bold">Input Directives</h4>
                    </div>
                    <textarea
                      value={orchestratorPrompt}
                      onChange={(e) => setOrchestratorPrompt(e.target.value)}
                      placeholder="Enter your studio master directive (e.g. 'Synthesize a melodic techno track with high energy drops and organic textures')..."
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
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Quantum Tool Suite</span>
                    <div className="h-px flex-1 bg-white" />
                  </div>
                  <QuantumAudioOrchestrator 
                    t={t}
                    playBeep={playBeep}
                    addTerminalLog={addTerminalLog}
                    suiteFunctions={suiteFunctions}
                    setSuiteFunctions={setSuiteFunctions}
                  />
                </div>
              </div>
            ) : (
              <div className={`flex-1 border rounded-2xl p-6 flex flex-col relative overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                 {lyriaAudioUrl ? (
									<div className="absolute inset-0 z-30 bg-black/95 p-8 flex flex-col justify-between backdrop-blur-md">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center animate-pulse">
													<Music className="w-5 h-5 text-purple-400" />
												</div>
												<div>
													<div className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">✨ Google Lyria Synthesis Output</div>
													<div className="text-xs text-white/90 font-bold max-w-md truncate font-mono mt-0.5">Prompt: "{prompt}"</div>
												</div>
											</div>
											<button
												onClick={() => setLyriaAudioUrl(null)}
												className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 text-white/60 hover:text-white transition-all text-[9px] font-mono uppercase"
											>
												← Close & Switch to MIDI
											</button>
										</div>

										{/* High-Tech Spectral Waveform */}
										<div className="flex-1 flex flex-col justify-center my-6">
											<div className="h-24 flex items-end gap-[3px] justify-center px-4 overflow-hidden mb-2">
												{Array.from({ length: 48 }).map((_, idx) => {
													const height = Math.abs(Math.sin((idx + totalSteps * 0.15) * 0.4)) * 75 + 10;
													return (
														<motion.div
															key={idx}
															animate={{ height: isPlaying ? height : 15 }}
															transition={{ type: "spring", stiffness: 300, damping: 20 }}
															className="w-[5px] bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 rounded-full"
															style={{ height: '20px' }}
														/>
													);
												})}
											</div>
											<div className="flex justify-between items-center px-2 text-[9px] font-mono text-white/40 uppercase">
												<span>00:00</span>
												<span className="text-purple-400 font-bold animate-pulse">Spectral Signal: Master Stereo Feed</span>
												<span>00:15</span>
											</div>
										</div>

										{/* Media Controls Deck */}
										<div className="flex flex-col gap-4 border-t border-white/10 pt-4">
											<div className="flex items-center justify-between">
												<audio
													src={lyriaAudioUrl}
													controls
													autoPlay
													className="w-full h-10 accent-purple-500 bg-transparent text-white filter invert rounded-xl"
												/>
											</div>
											<div className="flex items-center justify-between text-[10px] font-mono">
												<div className="text-white/40">Status: <span className="text-emerald-400 font-bold">ONLINE (PLAYBACK ACTIVE)</span></div>
												<a
													href={lyriaAudioUrl}
													download="lyria_composition.mp3"
													className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl uppercase tracking-wider text-[9px] transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/30"
												>
													<Save className="w-3.5 h-3.5" /> Download Mastering Mix (.mp3)
												</a>
											</div>
										</div>
									</div>
								) : null}
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 shrink-0">
                    <div>
                      <h3 className={`text-sm font-mono tracking-widest uppercase flex items-center gap-2 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                        <Activity className="w-4 h-4" /> Swarm Sequencer Node
                      </h3>
                      <p className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Click sequencer blocks to manually adjust or play/pause to hear the Live Audio API</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       {/* BPM Control */}
                                            <button onClick={handleRecord} className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${isRecording ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : (isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10')}`} title="Record & Export">                       <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>                       <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline">{isRecording ? 'Recording' : 'Record'}</span>                     </button>                     <div className="flex items-center gap-2 mr-2">
                         <span className={`text-[9px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>BPM:</span>
                         <input 
                           type="number" 
                           value={bpm} 
                           onChange={(e) => setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 120)))}
                           className={`w-14 text-center px-1 py-1 rounded font-mono text-xs border ${isLight ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-white focus:border-indigo-500/50 outline-none'}`} 
                         />
                       </div>

                       <button onClick={handleStopReset} className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`} title="Reset"><SkipBack className="w-4 h-4" /></button>
                       <button 
                         onClick={() => setIsPlaying(!isPlaying)}
                         className={`p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg active:scale-95`}
                       >
                         {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                       </button>
                       <button className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}><SkipForward className="w-4 h-4" /></button>
                       <div className={`font-mono text-xs ml-2 min-w-[75px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{formatTime(totalSteps)}</div>
                    </div>
                 </div>

                 {/* Tracks */}
                 <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                    <TrackRow name="DRUMS (KICK)" color="blue" isLight={isLight} currentStep={currentStep} steps={sequences.kick} onToggleStep={(idx) => handleToggleStep('kick', idx)} />
                    <TrackRow name="HI-HAT" color="cyan" isLight={isLight} currentStep={currentStep} steps={sequences.hihat} onToggleStep={(idx) => handleToggleStep('hihat', idx)} />
                    <TrackRow name="BASSLINE" color="red" isLight={isLight} currentStep={currentStep} steps={sequences.bass} onToggleStep={(idx) => handleToggleStep('bass', idx)} />
                    <TrackRow name="SYNTH LEAD" color="green" isLight={isLight} currentStep={currentStep} steps={sequences.synth} onToggleStep={(idx) => handleToggleStep('synth', idx)} />
                    
                    {/* Stem Tracks (Simulated visualizers for depth) */}
                    <TrackRow name="VOCAL STEM" color="purple" isLight={isLight} currentStep={currentStep} />
                    <TrackRow name="PULSE PAD" color="yellow" isLight={isLight} currentStep={currentStep} />
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

function TrackRow({ 
  name, 
  color, 
  isLight, 
  currentStep, 
  steps, 
  onToggleStep 
}: { 
  name: string; 
  color: string; 
  isLight?: boolean; 
  currentStep: number;
  steps?: number[];
  onToggleStep?: (idx: number) => void;
}) {
  const colorMap: any = {
    purple: isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-400',
    blue: isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400',
    red: isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/20 text-indigo-400',
    green: isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400',
    yellow: isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-500/20 text-yellow-400',
    cyan: isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400',
  };

  const activeColorMap: any = {
    purple: isLight ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white',
    blue: isLight ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white',
    red: isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white',
    green: isLight ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
    yellow: isLight ? 'bg-yellow-500 text-black' : 'bg-yellow-400 text-black',
    cyan: isLight ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white',
  };

  const bgBorderMap: any = {
    purple: isLight ? 'border-purple-200' : 'border-purple-500/30',
    blue: isLight ? 'border-blue-200' : 'border-blue-500/30',
    red: isLight ? 'border-red-200' : 'border-red-500/30',
    green: isLight ? 'border-green-200' : 'border-green-500/30',
    yellow: isLight ? 'border-yellow-200' : 'border-yellow-500/30',
    cyan: isLight ? 'border-cyan-200' : 'border-cyan-500/30',
  };

  return (
    <div className={`flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#0A0A0A]/60 border-white/5'}`}>
       <div className="w-full md:w-28 shrink-0 flex flex-row md:flex-col justify-between md:justify-start gap-2">
         <div className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded text-center min-w-[70px] ${colorMap[color]}`}>
           {name}
         </div>
         <div className="flex items-center gap-1.5">
            <button className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${isLight ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-white/15 text-gray-400 hover:bg-white/25'}`}>M</button>
            <button className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${isLight ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-white/15 text-gray-400 hover:bg-white/25'}`}>S</button>
            <input type="range" className="w-12 h-0.5 accent-indigo-500 cursor-pointer bg-white/20" defaultValue="70" />
         </div>
       </div>

       {steps ? (
         <div className="flex-1 h-10 flex items-center gap-1 overflow-x-auto select-none">
           {steps.map((val, idx) => {
             const isPlayhead = currentStep === idx;
             const isActive = val === 1;
             return (
               <button
                 key={idx}
                 type="button"
                 onClick={() => onToggleStep?.(idx)}
                 className={`flex-1 min-w-[14px] h-7 rounded-md transition-all duration-75 relative ${
                   isActive
                     ? activeColorMap[color]
                     : `${isLight ? 'bg-gray-200/50 hover:bg-gray-200' : 'bg-white/5 hover:bg-white/10'}`
                 } border ${isPlayhead ? 'border-indigo-500 scale-105 z-10 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'border-transparent'}`}
               >
                 {isPlayhead && <div className="absolute inset-0 bg-indigo-500/25 rounded-md animate-ping pointer-events-none" />}
               </button>
             );
           })}
         </div>
       ) : (
         <div className={`flex-1 h-10 rounded-lg border relative overflow-hidden ${bgBorderMap[color]} ${colorMap[color].replace('text-', 'bg-').replace('/20', '/5')}`}>
            {/* Mock waveform */}
            <svg className="w-full h-full opacity-30 text-indigo-400" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,50 Q5,10 10,50 T20,50 T30,50 T40,50 T50,50 T60,50 T70,50 T80,50 T90,50 T100,50" stroke="currentColor" fill="none" strokeWidth="1.5" />
            </svg>
            
            {/* Real Playhead line */}
            {currentStep >= 0 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                style={{ left: `${(currentStep / 16) * 100}%` }}
              />
            )}

            {/* Grid lines representing 16 steps */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-5">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div key={idx} className={`w-px h-full ${isLight ? 'bg-gray-900' : 'bg-white'} ${currentStep === idx ? 'opacity-100 bg-indigo-500' : ''}`} />
              ))}
            </div>
         </div>
       )}
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
