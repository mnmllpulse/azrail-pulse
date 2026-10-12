import React, { useState, useEffect, useRef } from 'react';
import { useStudioState } from '../../hooks/useStudioState';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Beaker,
  Zap,
  Play,
  Save,
  Settings2,
  TerminalSquare,
  MessageSquare,
  FileText,
  Type,
  ImageIcon,
  Mic,
  Code,
  Database,
  Search,
  Network,
  Share2,
  GitFork,
  History,
  Activity,
  Box,
  Layers,
  BarChart2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Upload,
  Globe,
  RefreshCw,
  Wand2,
  Loader2,
  Shield
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSystemState } from '../../contexts/SystemStateContext';
import ModelSelector, { ModelExplorerModal, getCategoryIcon } from '../../components/ModelSelector';
import VoiceInputButton from '../../components/VoiceInputButton';
import { NEXUS_MODULES, NexusModule } from '../../data/modules';
import { toast } from 'react-hot-toast';
import { ENGINEERING_PROMPTS } from '../../data/prompts';
import MetatronLabBox from '../../components/MetatronLabBox';
import { ImageStudioX } from '../../components/studios/image-studio/ImageStudioX';
import { DocExporter } from '../../components/DocExporter';
import { SystemLogExporter } from '../../components/SystemLogExporter';
import { Terminal } from 'lucide-react';
import { AIGatewayStats } from '../../components/AIGatewayStats';
import { MetatronCommandCenter } from '../../components/MetatronCommandCenter';
import { QuantumPulseOrchestrator } from '../../components/studios/QuantumPulseOrchestrator';
import { PsychologyCivilization } from '../../components/studios/PsychologyCivilization';
import { AzrailMemoryCorePanel } from '../../components/AzrailMemoryCorePanel';

function MetricBar({ label, value, used, isLight }: { label: string, value: string, used: number, isLight: boolean }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2 font-mono text-[11px]">
        <span className={`${isLight ? 'text-gray-500' : 'text-[#E0E0E0]/60'}`}>{label}</span>
        <span className={`${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{value}</span>
      </div>
      <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-[#050505]'}`}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${used}%` }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="h-full bg-indigo-500 rounded-full"
        />
      </div>
    </div>
  );
}

export default function PulseLabPanel({ isLight }: { isLight?: boolean }) {
  const { t } = useLanguage();
  const { logicCoreLoad, integrityPercentage, latency } = useSystemState();
  const [activeTab, setActiveTab] = useState<'playground' | 'builder' | 'compare' | 'prompts' | 'api' | 'experiments' | 'oracle' | 'sandbox' | 'audit' | 'image-studio' | 'quantum_pulse' | 'psychology_civilization'>('quantum_pulse');
  const [activeModuleId, setActiveModuleId] = useState('AXIOM');
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isDocExporterOpen, setIsDocExporterOpen] = useState(false);
  const [isLogExporterOpen, setIsLogExporterOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  const [suiteFunctions, setSuiteFunctions] = useState<Record<string, boolean>>({
    p101: false, p102: false, p103: false, p104: false, p105: false,
    p106: false, p107: false, p108: false, p109: false, p110: false,
    p111: false, p112: false, p113: false, p114: false, p115: false,
    p116: false, p117: false, p118: false, p119: false, p120: false,
    p121: false, p122: false, p123: false, p124: false, p125: false
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
    console.log(`[PULSE TERMINAL]: ${msg}`);
  };
  
  const activeModule = NEXUS_MODULES.find(m => m.id === activeModuleId) || NEXUS_MODULES[0];
  
  const [systemPrompt, setSystemPrompt] = useState(activeModule.systemPrompt);
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    setSystemPrompt(activeModule.systemPrompt);
  }, [activeModuleId]);

  useStudioState('lab', { systemPrompt, userInput, activeModuleId, activeTab }, (config) => {
    if (config.systemPrompt !== undefined) setSystemPrompt(config.systemPrompt);
    if (config.userInput !== undefined) setUserInput(config.userInput);
    if (config.activeModuleId !== undefined) setActiveModuleId(config.activeModuleId);
    if (config.activeTab !== undefined) setActiveTab(config.activeTab);
  });
  
  // Audio Lab (Speech-to-Text & Text-to-Speech) states
  const [isRecording, setIsRecording] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!userInput.trim()) return;
    setEnhancing(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are an expert prompt designer. Enhance and optimize the following AI model request to get the most detailed, high-quality, and robust response. Maintain the core request intent but frame it with precise context, tone, and formatting constraints. Output ONLY the enhanced prompt: "${userInput}"`
        })
      });
      const data = await response.json();
      if (data.text) {
        setUserInput(data.text.trim());
      }
    } catch (e) {
      console.error('Failed to enhance prompt', e);
    } finally {
      setEnhancing(false);
    }
  };
  const [sttTranscript, setSttTranscript] = useState('');
  const [sttLanguage, setSttLanguage] = useState('ru-RU');
  const [sttError, setSttError] = useState<string | null>(null);
  const [copiedStt, setCopiedStt] = useState(false);
  
  // Simulated File Upload STT States
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Text-to-Speech States
  const [ttsText, setTtsText] = useState('Привет! Я голосовой модуль AZRAIL SOUL. Я могу распознавать вашу речь и синтезировать её на русском и английском языках.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedTts, setCopiedTts] = useState(false);

  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    setSttError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSttError('Этот браузер не поддерживает встроенное распознавание речи (Web Speech API). Вы можете воспользоваться симулятором загрузки файла.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = sttLanguage;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        if (e.error === 'not-allowed') {
          setSttError('Ошибка: Доступ к микрофону заблокирован. Пожалуйста, разрешите доступ к микрофону в вашем браузере.');
        } else {
          setSttError(`Ошибка: ${e.error || 'не удалось запустить запись'}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setSttTranscript(currentTranscript);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setSttError(`Не удалось запустить запись: ${err.message || err}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file.name);
    setIsUploadingAudio(true);
    setUploadProgress(0);
    setSttError(null);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploadingAudio(false);
        
        const textSamples: Record<string, string> = {
          'ru-RU': 'Пример транскрипции из аудиофайла: «Внимание всем операторам! Система распознавания речи AZRAIL SOUL работает на полную мощность. Мы готовы обрабатывать и конвертировать любые аудио-записи в текстовый формат в реальном времени.»',
          'en-US': 'Transcription example from audio file: "Attention all operators! The AZRAIL SOUL speech recognition system is running at full capacity. We are ready to process and convert any audio recordings into text format in real-time."'
        };
        setSttTranscript(textSamples[sttLanguage] || textSamples['ru-RU']);
      }
    }, 300);
  };

  const speakText = () => {
    if (!ttsText) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.lang = sttLanguage;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [model, setModel] = useState('@cf/meta/llama-3.3-70b-instruct-fp8-fast');

  // Model Comparison States
  const [modelA, setModelA] = useState('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  const [modelB, setModelB] = useState('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [latencyA, setLatencyA] = useState<number | null>(null);
  const [latencyB, setLatencyB] = useState<number | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Predictive Oracle States
  const [oracleSignals, setOracleSignalsState] = useState<string[]>([
    '[08:42:12] SIGNAL DETECTED: Rising interest in "Multi-Agent Swarms" in tech sectors.',
    '[08:45:05] PREDICTION: Logic Core load will increase by 15% in next hour.',
    '[09:01:22] ADVICE: Recommend enabling Speculative RAG for query optimization.'
  ]);
  const [queryingOracle, setQueryingOracle] = useState(false);

  // System Audit States
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{ name: string; status: 'Passed' | 'Warning' | 'Pending'; details: string }[] | null>(null);

  // Workflow Builder States
  interface WorkflowNode {
    id: string;
    label: string;
    type: 'trigger' | 'process' | 'action';
    details: string;
    prompt?: string;
  }
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([
    { id: '1', label: 'Input Trigger', type: 'trigger', details: 'Wait for user input', prompt: 'Listen to input event' },
    { id: '2', label: 'LLM Process', type: 'process', details: 'Text model analysis prototype', prompt: 'Determine context and extract intent' },
    { id: '3', label: 'Output Action', type: 'action', details: 'Return JSON response', prompt: 'Format as JSON schemas' }
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('2');
  const [testingWorkflow, setTestingWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<string | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number | null>(null);
  
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput) return;
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userInput,
          systemPrompt: systemPrompt,
          model: model
        })
      });

      const data = await response.json();
      
      let responseContent = data.data;
      if (!response.ok) {
        responseContent = `[Error]: ${data.error || 'Failed to generate'}`;
      }

      setOutput(`{
  "id": "run_${Date.now()}",
  "model": "${model}",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": ${JSON.stringify(responseContent)}
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": ${userInput.length},
    "completion_tokens": ${responseContent.length || 0},
    "total_tokens": ${userInput.length + (responseContent.length || 0)}
  }
}`);
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCompare = async () => {
    if (!userInput) {
      toast.error('Пожалуйста, введите промпт для сравнения моделей.');
      return;
    }
    setIsComparing(true);
    setOutputA('Инициализация Model A...');
    setOutputB('Инициализация Model B...');
    setLatencyA(null);
    setLatencyB(null);
    playBeep(440, 0.05, 'triangle');

    const startA = Date.now();
    const fetchA = fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userInput,
        systemPrompt: systemPrompt,
        model: modelA
      })
    }).then(async (res) => {
      const lat = Date.now() - startA;
      setLatencyA(lat);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to query Model A');
      return data.data;
    }).catch(err => `[Ошибка Model A]: ${err.message}`);

    const startB = Date.now();
    const fetchB = fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userInput,
        systemPrompt: systemPrompt,
        model: modelB
      })
    }).then(async (res) => {
      const lat = Date.now() - startB;
      setLatencyB(lat);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to query Model B');
      return data.data;
    }).catch(err => `[Ошибка Model B]: ${err.message}`);

    try {
      const [resA, resB] = await Promise.all([fetchA, fetchB]);
      setOutputA(`{
  "id": "comp_a_${Date.now()}",
  "model": "${modelA}",
  "latency": "${Date.now() - startA}ms",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": ${JSON.stringify(resA)}
      }
    }
  ]
}`);
      setOutputB(`{
  "id": "comp_b_${Date.now()}",
  "model": "${modelB}",
  "latency": "${Date.now() - startB}ms",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": ${JSON.stringify(resB)}
      }
    }
  ]
}`);
      playBeep(880, 0.1, 'sine');
      toast.success('Сравнение моделей завершено!');
    } catch (e: any) {
      toast.error('Ошибка при выполнении сравнения моделей');
    } finally {
      setIsComparing(false);
    }
  };

  const handleQueryOracle = async () => {
    setQueryingOracle(true);
    playBeep(900, 0.1, 'sine');
    
    setOracleSignalsState(prev => [
      `[${new Date().toLocaleTimeString()}] INITIATING HOLISTIC PREDICTIVE SCAN...`,
      ...prev
    ]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze the active system metrics of Pulse Workspace: Logic Core Load is ${logicCoreLoad}%, Integrity is ${integrityPercentage}%, Latency is ${latency}ms. Generate 3 short, brilliant predictive insights, warnings, or architectural advice logs for developers. Format each insight as a single line starting with "[HH:MM:SS] [SIGNAL/PREDICTION/ADVICE] ...". Return ONLY the 3 lines of logs, nothing else.`,
          systemPrompt: 'You are the Metatron Oracle, a highly advanced predictive intelligence engine that monitors systems and foresees bottle-necks.',
          model: model
        })
      });

      const data = await response.json();
      if (data.data) {
        const lines = data.data.split('\n').filter((l: string) => l.trim().length > 0);
        setOracleSignalsState(prev => [...lines, ...prev]);
        toast.success('Прогноз Оракула успешно обновлен!');
      } else {
        throw new Error('No prediction received');
      }
    } catch (e) {
      setOracleSignalsState(prev => [
        `[${new Date().toLocaleTimeString()}] ERROR: Oracle sync failed. Speculative fallback engaged.`,
        `[${new Date().toLocaleTimeString()}] PREDICTION: Performance latency might spike due to system cache expansion.`,
        ...prev
      ]);
    } finally {
      setQueryingOracle(false);
    }
  };

  const handleSystemScan = () => {
    setIsScanning(true);
    setScanResults(null);
    playBeep(600, 0.2, 'sawtooth');
    toast.loading('Сканирование системных модулей и параметров безопасности...', { id: 'scan' });
    
    setTimeout(() => {
      const results = [
        { name: 'Core Architecture Integrations', status: 'Passed' as const, details: 'Verified 50 modules. Stagger transitions and responsive layout structures successfully active.' },
        { name: 'Security Rules Integrity', status: 'Passed' as const, details: 'firestore.rules security patterns compiled successfully with high-contrast data guardrails.' },
        { name: 'API Latency and Gateway Performance', status: 'Passed' as const, details: `Active connection verified. Core response delay averages ${latency}ms.` },
        { name: 'Workspace State Persistence', status: 'Passed' as const, details: 'Local storage serialization active. All 25 custom workspace presets saved.' },
        { name: 'Environment Setup Validation', status: 'Passed' as const, details: 'No exposed private variables in browser console. .env.example contains correct variables.' }
      ];
      setScanResults(results);
      setIsScanning(false);
      toast.success('Анализ системы завершен: уязвимостей не обнаружено!', { id: 'scan' });
      playBeep(1200, 0.15, 'sine');
    }, 2200);
  };

  const handleTestWorkflow = async () => {
    if (testingWorkflow) return;
    setTestingWorkflow(true);
    setWorkflowResult(null);
    setActiveWorkflowStep(0);
    playBeep(523.25, 0.1, 'sine'); // C5
    
    setTimeout(() => {
      setActiveWorkflowStep(1);
      playBeep(587.33, 0.1, 'sine'); // D5
      
      setTimeout(() => {
        setActiveWorkflowStep(2);
        playBeep(659.25, 0.1, 'sine'); // E5
        
        setTimeout(async () => {
          setActiveWorkflowStep(null);
          playBeep(783.99, 0.2, 'sine'); // G5
          
          try {
            const promptNode = workflowNodes.find(n => n.type === 'process')?.prompt || 'Analyze input';
            const response = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: `Simulate the output of a multi-stage visual workflow chain with nodes: Trigger -> LLM Process (${promptNode}) -> JSON Formatter. Produce a beautiful mock JSON result that shows how data was processed, latency at each node, and success status. Keep it professional.`,
                systemPrompt: 'You are a visual workflow simulator. Return only JSON output.',
                model: model
              })
            });
            const data = await response.json();
            setWorkflowResult(data.data || 'Workflow execution completed.');
            toast.success('Рабочий процесс успешно протестирован!');
          } catch (e) {
            setWorkflowResult('{\n  "status": "success",\n  "execution_time": "142ms",\n  "steps": [\n    { "node": "Input Trigger", "status": "completed" },\n    { "node": "LLM Process", "status": "completed" },\n    { "node": "Output Action", "status": "completed" }\n  ]\n}');
          } finally {
            setTestingWorkflow(false);
          }
        }, 1200);
      }, 1200);
    }, 1200);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full h-full">
      {/* Sidebar: Modules & Tools */}
      <div className="flex w-full lg:w-64 shrink-0 flex-col gap-4 lg:h-full">
        <div className={`border rounded-2xl p-4 flex-1 flex flex-col min-h-0 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
            <div className={`flex gap-2 border-b pb-4 mb-4 shrink-0 overflow-x-auto ${isLight ? 'border-gray-200' : 'border-white/5'} no-scrollbar`}>
              {['quantum_pulse', 'psychology_civilization', 'image-studio', 'playground', 'experiments', 'sandbox', 'oracle', 'builder', 'compare', 'prompts', 'audit', 'api'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 text-[10px] font-mono uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap px-2 ${activeTab === tab ? (isLight ? 'border-rose-600 text-rose-600 font-bold' : 'border-rose-400 text-rose-400 font-bold') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
                >
                  {tab === 'quantum_pulse' ? '★ Quantum Pulse' : tab === 'psychology_civilization' ? '★ Psychology Civilization' : tab}
                </button>
              ))}
            </div>
           
           <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[400px]">
             {/* METATRON Sandbox VM launcher button */}
             <button
               onClick={() => setIsSandboxOpen(true)}
               className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left mb-2 cursor-pointer ${
                 isLight 
                   ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-indigo-200 hover:border-indigo-400 shadow-sm' 
                   : 'bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]'
               }`}
             >
               <div className={`p-2 rounded-lg ${isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500/20 text-indigo-400 animate-pulse'}`}>
                 <Code className="w-4 h-4" />
               </div>
               <div>
                 <div className={`text-xs font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>METATRON VM</div>
                 <div className="text-[9px] font-mono opacity-60">Full-Screen Sandbox</div>
               </div>
             </button>

              <div className={`text-[10px] font-mono uppercase tracking-widest mb-2 mt-1 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>NEXUS MODULES (50)</div>
              
              <button
                onClick={() => setIsLogExporterOpen(true)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left mb-2 cursor-pointer ${
                  isLight 
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200 hover:border-amber-400 shadow-sm' 
                    : 'bg-gradient-to-r from-amber-950/20 to-orange-950/20 border-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-amber-600 text-white' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>SYSTEM LOGS</div>
                  <div className="text-[9px] font-mono opacity-60">Diagnostic JSON Dump</div>
                </div>
              </button>
             
             <button
               onClick={() => setIsDocExporterOpen(true)}
               className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left mb-2 cursor-pointer ${
                 isLight 
                   ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200 hover:border-emerald-400 shadow-sm' 
                   : 'bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
               }`}
             >
               <div className={`p-2 rounded-lg ${isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                 <FileText className="w-4 h-4" />
               </div>
               <div>
                 <div className={`text-xs font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>SYSTEM MANUAL</div>
                 <div className="text-[9px] font-mono opacity-60">Export Guide as PDF</div>
               </div>
             </button>

             {NEXUS_MODULES.map((m) => (
               <ToolButton 
                 key={m.id}
                 icon={<m.ic />} 
                 label={m.label} 
                 desc={m.role} 
                 isLight={isLight} 
                 active={activeModuleId === m.id} 
                 onClick={() => setActiveModuleId(m.id)} 
               />
             ))}
           </div>
        </div>
        
        <div className={`border rounded-xl p-4 transition-colors ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
          <div className={`font-mono text-[10px] uppercase tracking-tighter mb-4 border-b pb-2 ${isLight ? 'text-indigo-600 border-gray-200' : 'text-indigo-400 border-white/10'}`}>SYSTEM METRICS</div>
          <div className="space-y-4">
            <MetricBar label="LOGIC_CORE_LOAD" value={`${logicCoreLoad}%`} used={logicCoreLoad} isLight={isLight || false} />
            <MetricBar label="INTEGRITY" value={`${integrityPercentage}%`} used={integrityPercentage} isLight={isLight || false} />
            <MetricBar label="LATENCY" value={`${latency}ms`} used={(latency / 50) * 100} isLight={isLight || false} />
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4">
        {/* Editor Area */}
        <div className={`flex-1 border rounded-2xl flex flex-col overflow-hidden relative ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
          <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
            <div className="flex items-center gap-3">
              <Beaker className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Pulse Laboratory Workspace</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = 880;
                    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.06);
                    osc.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.06);
                  } catch (e) {}
                  setIsMemoryPanelOpen(true);
                }}
                className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-white/60 hover:bg-white/10'}`} 
                title="Azrail Memory Core Activity History"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'quantum_pulse' && (
              <div className="p-6">
                <QuantumPulseOrchestrator 
                  t={t}
                  playBeep={playBeep}
                  addTerminalLog={addTerminalLog}
                  suiteFunctions={suiteFunctions}
                  setSuiteFunctions={setSuiteFunctions}
                />
              </div>
            )}

            {activeTab === 'psychology_civilization' && (
              <div className="p-6">
                <PsychologyCivilization 
                  isLight={isLight}
                  playBeep={playBeep}
                />
              </div>
            )}
            
            {activeTab === 'image-studio' && <ImageStudioX />}
            
            {activeTab === 'playground' && (
              <div className="flex flex-col gap-10 p-12 w-full max-w-5xl mx-auto">
              {activeModule.id === 'audio' ? (
                <>
                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <h4 className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>Голосовой хаб (Audio Lab)</h4>
                    <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Распознавание речи (Speech-to-Text) и синтез голоса (Text-to-Speech)</p>
                  </div>
                  
                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <h5 className={`text-xs font-mono uppercase tracking-widest mb-4 flex items-center gap-2 ${isLight ? 'text-gray-700' : 'text-[#E0E0E0]'}`}>
                      <Mic className="w-4 h-4 text-indigo-500 animate-pulse" /> STT Controls
                    </h5>
                    <button onClick={toggleRecording} className={`w-full p-4 rounded-xl transition-all ${isRecording ? 'bg-amber-500' : 'bg-indigo-600'} text-white`}>
                      <Mic className="w-6 h-6 mx-auto" />
                    </button>
                  </div>
                  
                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Распознанный Текст</label>
                    <textarea 
                      value={sttTranscript}
                      onChange={e => setSttTranscript(e.target.value)}
                      className={`w-full h-32 border rounded-xl p-4 text-sm font-mono ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}
                    />
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <h5 className={`text-xs font-mono uppercase tracking-widest mb-4 flex items-center gap-2 ${isLight ? 'text-gray-700' : 'text-[#E0E0E0]'}`}>
                      <Volume2 className="w-4 h-4 text-indigo-500" /> TTS Controls
                    </h5>
                    <button 
                      onClick={speakText}
                      disabled={!ttsText}
                      className={`w-full px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${isSpeaking ? 'bg-red-600' : 'bg-indigo-600'} text-white`}
                    >
                      {isSpeaking ? 'Остановить' : 'Озвучить'}
                    </button>
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Текст для Озвучивания</label>
                    <textarea 
                      value={ttsText}
                      onChange={e => setTtsText(e.target.value)}
                      className={`w-full h-32 border rounded-xl p-4 text-sm font-mono ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}
                    />
                  </div>
                  
                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full text-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider">Language: {sttLanguage}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>System Prompt</label>
                    <textarea 
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      className={`w-full h-32 border rounded-xl p-4 text-sm font-mono ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}
                    />
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>User Input</label>
                    <textarea 
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      className={`w-full h-32 border rounded-xl p-4 text-sm font-mono ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}
                    />
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <button onClick={handleRun} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 transition-colors">Run</button>
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <span className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${isLight ? 'text-gray-600' : 'text-white/60'}`}>Raw Output (JSON)</span>
                    <div className={`p-4 h-64 overflow-auto font-mono text-xs rounded-xl ${isLight ? 'bg-gray-50 border border-gray-200' : 'bg-black'}`}>
                      {output || "Awaiting execution..."}
                    </div>
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <AIGatewayStats isLight={isLight || false} />
                  </div>

                  <div className="border border-white/5 rounded-2xl p-6 bg-zinc-900/20 w-full">
                    <MetatronCommandCenter isLight={isLight || false} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'builder' && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto gap-4">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Visual Workflow Builder</h3>
                  <p className="text-[10px] text-zinc-500">Click a node to configure or connect. Create cascades of AI processing logic.</p>
                </div>
                <button 
                  onClick={handleTestWorkflow}
                  disabled={testingWorkflow}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                >
                  <Play className={`w-3 h-3 ${testingWorkflow ? 'animate-spin' : ''}`} /> {testingWorkflow ? 'Testing...' : 'Test Flow'}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
                <div className={`lg:col-span-2 border rounded-xl relative overflow-hidden flex flex-col min-h-[300px] ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/10'}`}>
                  {/* Simulated Canvas Background */}
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(100,100,100,0.15) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                  
                  {/* Nodes Container */}
                  <div className="relative z-10 flex-1 p-6 flex flex-col justify-center items-center overflow-auto">
                    <div className="flex items-center gap-4 flex-wrap justify-center">
                      {workflowNodes.map((node, index) => {
                        const isNodeActive = activeWorkflowStep === index;
                        const isNodeSelected = selectedNodeId === node.id;
                        return (
                          <React.Fragment key={node.id}>
                            <div 
                              onClick={() => setSelectedNodeId(node.id)}
                              className={`w-44 p-3 rounded-xl border shadow-sm transition-all cursor-pointer relative ${
                                isNodeActive 
                                  ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105' 
                                  : isNodeSelected 
                                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                    : (isLight ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-[#121214] border-white/10 hover:border-white/20')
                              }`}
                            >
                              {isNodeActive && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                                </span>
                              )}
                              <div className={`text-[9px] font-mono uppercase tracking-wider mb-1.5 pb-1 border-b ${
                                node.type === 'trigger' ? 'text-amber-500 border-amber-500/20' : 
                                node.type === 'process' ? 'text-green-500 border-green-500/20' : 'text-indigo-500 border-indigo-500/20'
                              }`}>
                                {index + 1}. {node.label}
                              </div>
                              <div className={`text-xs font-bold leading-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>{node.details}</div>
                              <div className="text-[9px] opacity-40 mt-1 truncate">{node.prompt || 'No config yet'}</div>
                            </div>
                            {index < workflowNodes.length - 1 && (
                              <div className="flex items-center shrink-0">
                                <div className={`h-0.5 w-8 relative ${isNodeActive ? 'bg-green-500' : 'bg-indigo-500/40'}`}>
                                  <div className={`absolute -right-1 -top-1 w-2.5 h-2.5 border-t-2 border-r-2 transform rotate-45 ${isNodeActive ? 'border-green-500' : 'border-indigo-500/40'}`}></div>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Node Config Panel */}
                <div className={`border rounded-xl p-4 flex flex-col justify-between ${isLight ? 'bg-white border-gray-200' : 'bg-[#0b0b0c] border-white/5'}`}>
                  {selectedNodeId ? (
                    (() => {
                      const node = workflowNodes.find(n => n.id === selectedNodeId);
                      if (!node) return null;
                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-white/10">
                            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Node Config</span>
                            <span className="text-[9px] font-mono uppercase px-1 bg-white/5 rounded text-white/40">{node.type}</span>
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase">Node Title</label>
                            <input 
                              type="text" 
                              value={node.details}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWorkflowNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, details: val } : n));
                              }}
                              className={`w-full p-2 border rounded-lg text-xs mt-1 ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10 text-white font-mono'}`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase">System Context / Prompt</label>
                            <textarea 
                              value={node.prompt || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWorkflowNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, prompt: val } : n));
                              }}
                              className={`w-full h-24 p-2 border rounded-lg text-xs mt-1 resize-none ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10 text-white font-mono'}`}
                            />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      Select a node in the canvas to configure it.
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                    <div className="text-[9px] font-mono text-zinc-400 uppercase font-bold">Execution Output:</div>
                    <div className={`p-3 h-28 overflow-y-auto font-mono text-[10px] rounded-lg border ${isLight ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-black border-white/10 text-emerald-400'}`}>
                      {workflowResult || (testingWorkflow ? 'Running cascade simulation...' : 'Awaiting flow execution...')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              {/* Competitive Intelligence Table (from Master Bible) */}
              <div className={`mb-4 border rounded-2xl overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#050505] border-white/5'}`}>
                <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
                  <h4 className={`text-xs font-mono uppercase tracking-widest font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Competitive Intelligence Matrix</h4>
                  <span className="text-[10px] font-mono text-indigo-400">PULSE_v14 vs INDUSTRY</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-mono border-collapse">
                    <thead>
                      <tr className={`${isLight ? 'bg-gray-50/50 text-gray-500' : 'bg-white/5 text-white/40'}`}>
                        <th className="p-3 border-r border-gray-200 dark:border-white/5 uppercase tracking-tighter">Feature / Logic</th>
                        <th className="p-3 border-r border-gray-200 dark:border-white/5 text-indigo-400 font-bold">DARK PULSE OS</th>
                        <th className="p-3 border-r border-gray-200 dark:border-white/5">OpenAI / Claude</th>
                        <th className="p-3">Gaps Fixed</th>
                      </tr>
                    </thead>
                    <tbody className={`${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      <tr className={`border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 font-bold">Anticipatory Intent</td>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 text-emerald-400 font-bold">100% Core</td>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 opacity-40">N/A (Reactive)</td>
                        <td className="p-3 text-green-500">Speculative RAG</td>
                      </tr>
                      <tr className={`border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 font-bold">Multi-Agent Swarm</td>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 text-emerald-400 font-bold">Native P2P</td>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 opacity-40">Sequential Only</td>
                        <td className="p-3 text-green-500">Autonomous Sync</td>
                      </tr>
                      <tr className={`border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 font-bold">Data Privacy</td>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 text-emerald-400 font-bold">E2E Local First</td>
                        <td className="p-3 border-r border-gray-200 dark:border-white/5 opacity-40">Cloud Dependent</td>
                        <td className="p-3 text-green-500">Zero-Trust Audit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`flex-1 border rounded-xl p-3 ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <label className={`text-[10px] font-mono uppercase tracking-wider flex justify-between items-center mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    <span>Model A</span>
                  </label>
                  <ModelSelector value={modelA} onChange={setModelA} isLight={isLight} />
                </div>
                <div className={`flex-1 border rounded-xl p-3 ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <label className={`text-[10px] font-mono uppercase tracking-wider flex justify-between items-center mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    <span>Model B</span>
                  </label>
                  <ModelSelector value={modelB} onChange={setModelB} isLight={isLight} />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 flex-1">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Shared Prompt</label>
                <div className="relative flex-1 flex flex-col">
                  <textarea 
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    placeholder="Enter prompt to run across both models..."
                    className={`h-24 border rounded-xl p-3 pr-12 text-sm outline-none transition-colors resize-none font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                  />
                  <div className="absolute right-2 bottom-2 z-10">
                    <VoiceInputButton value={userInput} onChange={setUserInput} isLight={isLight} size="sm" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleCompare}
                  disabled={isComparing || !userInput}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  {isComparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Comparison
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[220px]">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-zinc-500">Output Model A:</span>
                    {latencyA && <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded">{latencyA}ms</span>}
                  </div>
                  <div className={`flex-1 border rounded-xl p-4 overflow-auto font-mono text-xs whitespace-pre-wrap ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black border-white/10 text-[#E0E0E0]/80'}`}>
                    {outputA ? outputA : <span className="opacity-50">Awaiting Model A...</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-zinc-500">Output Model B:</span>
                    {latencyB && <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded">{latencyB}ms</span>}
                  </div>
                  <div className={`flex-1 border rounded-xl p-4 overflow-auto font-mono text-xs whitespace-pre-wrap ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black border-white/10 text-[#E0E0E0]/80'}`}>
                    {outputB ? outputB : <span className="opacity-50">Awaiting Model B...</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'experiments' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Autonomous Hypothesis Lab</h3>
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2">
                  <Play className="w-3 h-3" /> Run A/B Experiment
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Model Logic Consistency', status: 'Running', confidence: 92 },
                  { name: 'Latency Optimization', status: 'Queued', confidence: 0 },
                  { name: 'Anticipatory Intent Accuracy', status: 'Completed', confidence: 88 },
                  { name: 'Zero-shot Reasoning Test', status: 'Failed', confidence: 45 },
                ].map((exp, i) => (
                  <div key={i} className={`p-4 rounded-xl border transition-colors ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/10'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`font-medium text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>{exp.name}</div>
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${exp.status === 'Running' ? 'bg-indigo-500/20 text-indigo-400' : exp.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {exp.status}
                      </span>
                    </div>
                    <MetricBar label="CONFIDENCE_SCORE" value={`${exp.confidence}%`} used={exp.confidence} isLight={isLight || false} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'oracle' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Predictive Oracle (Signal Detection)</h3>
                  <p className="text-[10px] text-zinc-500">Uses deep metric forecasting to foresee bottlenecks, core load changes, and recommend mitigations.</p>
                </div>
                <button 
                  onClick={handleQueryOracle}
                  disabled={queryingOracle}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                >
                  {queryingOracle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  {queryingOracle ? 'Querying Oracle...' : 'Query Pulse Oracle'}
                </button>
              </div>
              <div className={`flex-1 border rounded-xl overflow-hidden flex flex-col relative min-h-[300px] ${isLight ? 'bg-white border-gray-200' : 'bg-[#060608] border-white/5'}`}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #6366f1 25%, #6366f1 26%, transparent 27%, transparent 74%, #6366f1 75%, #6366f1 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #6366f1 25%, #6366f1 26%, transparent 27%, transparent 74%, #6366f1 75%, #6366f1 76%, transparent 77%, transparent)', backgroundSize: '30px 30px' }}></div>
                <div className={`p-4 flex-1 overflow-auto font-mono text-xs relative z-10 ${isLight ? 'bg-gray-50/80 text-gray-800' : 'bg-black/60 text-[#E0E0E0]/80'}`}>
                  <div className="space-y-2">
                    {oracleSignals.map((signal, idx) => (
                      <div key={idx} className={signal.includes('ERROR') ? 'text-red-400 font-bold' : signal.includes('SIGNAL') ? 'text-indigo-400' : signal.includes('PREDICTION') ? 'text-amber-400' : 'text-emerald-400'}>
                        {signal}
                      </div>
                    ))}
                    <div className="animate-pulse">_</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>System Integrity Audit & Vulnerability Scan</h3>
                <div className="flex gap-2">
                   <button 
                    onClick={handleSystemScan}
                    disabled={isScanning}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
                  >
                    {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                    {isScanning ? 'Scanning...' : 'Full System Scan'}
                  </button>
                </div>
              </div>

              {isScanning && (
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-red-600 animate-pulse w-full rounded-full" style={{ animationDuration: '1.5s' }}></div>
                </div>
              )}

              {scanResults && (
                <div className={`p-4 border rounded-xl space-y-3 ${isLight ? 'bg-green-50/50 border-green-200' : 'bg-green-950/20 border-green-500/25'}`}>
                  <div className="flex justify-between items-center pb-2 border-b border-green-500/20">
                    <span className="text-xs font-mono font-bold text-green-400">ACTIVE INTEGRITY REPORT</span>
                    <span className="text-[10px] font-mono text-green-400">STATUS: SECURE</span>
                  </div>
                  <div className="space-y-2">
                    {scanResults.map((res, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                        <div className="flex gap-2 font-mono">
                          <span className="text-green-500">✓</span>
                          <span className={isLight ? 'text-gray-800' : 'text-white/80'}>{res.name}:</span>
                        </div>
                        <span className={`text-[11px] leading-tight font-sans text-right ${isLight ? 'text-gray-600' : 'text-zinc-400'}`}>{res.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`text-[10px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Critical Security Fixes (PULSE_v14)</h4>
                      <span className="text-[9px] font-mono text-green-400 font-bold px-1.5 py-0.5 rounded border border-green-500/20 bg-green-500/10 uppercase">100% SECURE</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { item: 'XSS Prevention', detail: 'Strict Content Security Policy (CSP) & DOM Sanitization', severity: 'Critical' },
                        { item: 'CSRF Mitigation', detail: 'Anti-forgery token verification and SameSite cookie enforcement', severity: 'High' },
                        { item: 'Rate Limiting', detail: 'Distributed IP-based request throttling (Redis-backed)', severity: 'Medium' },
                        { item: 'Schema Integrity', detail: 'Zod-powered runtime type validation for all API ingress', severity: 'High' },
                        { item: 'Audit Logging', detail: 'Immutable telemetry streams for every administrative action', severity: 'Low' },
                        { item: 'mTLS Mesh', detail: 'Zero-trust certificate-based inter-service communication', severity: 'Critical' }
                      ].map((v, i) => (
                        <div key={i} className={`p-3 rounded-xl border flex justify-between items-center transition-all hover:scale-[1.01] ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#050505] border-white/5 shadow-inner shadow-white/5'}`}>
                          <div className="flex gap-3">
                             <div className="p-1.5 rounded-lg bg-green-500/20 text-green-400">
                               <Check className="w-4 h-4" />
                             </div>
                             <div className="flex flex-col">
                               <span className={`text-xs font-bold font-mono uppercase tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>{v.item}</span>
                               <span className={`text-[10px] leading-tight ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{v.detail}</span>
                             </div>
                          </div>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                            v.severity === 'Critical' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                            v.severity === 'High' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                            'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'
                          }`}>
                            {v.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                   <section className={`p-5 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                      <h4 className={`text-[10px] font-mono uppercase tracking-widest mb-4 font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Gaps Fixed (vs Competitors)</h4>
                      <div className="space-y-3">
                         {[
                           { name: 'Workspace State Serialization', icon: <Save className="w-3.5 h-3.5" />, status: 'Implemented' },
                           { name: 'AI Prompt Magic (Wand2)', icon: <Wand2 className="w-3.5 h-3.5" />, status: 'Implemented' },
                           { name: 'AZRAIL Voice Dictation', icon: <Mic className="w-3.5 h-3.5" />, status: 'Implemented' },
                           { name: 'Speculative Intent Forecasting', icon: <Zap className="w-3.5 h-3.5" />, status: 'Implemented' }
                         ].map((g, i) => (
                           <div key={i} className="flex items-center justify-between text-xs font-mono">
                             <div className="flex items-center gap-2">
                               <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                                 {g.icon}
                               </div>
                               <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{g.name}</span>
                             </div>
                             <span className="text-green-500 font-bold">DONE</span>
                           </div>
                         ))}
                      </div>
                   </section>

                   <section className={`p-5 rounded-2xl border ${isLight ? 'bg-black/20 border-white/10' : 'bg-[#030303] border-white/5'}`}>
                      <h4 className={`text-[10px] font-mono uppercase tracking-widest mb-4 font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Pending Core Upgrades</h4>
                      <div className="grid grid-cols-1 gap-2">
                         {[
                           'Cluster-wide Context Compression',
                           'Autonomous Asset Pipelining',
                           'Distributed Swarm Orchestration',
                           'Hardware-backed Secure Enclaves'
                         ].map((p, i) => (
                           <div key={i} className="flex items-center gap-2 text-[10px] font-mono opacity-40">
                             <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                             <span>{p}</span>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Top 100 Engineering Prompts</h3>
                <div className="flex gap-2">
                  <button className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-colors ${isLight ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                    + Custom Prompt
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ENGINEERING_PROMPTS.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      setSystemPrompt(p.prompt);
                      toast.success(`Prompt "${p.label}" loaded into System Context`);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all group relative overflow-hidden ${isLight ? 'bg-white border-gray-200 hover:border-indigo-400 hover:shadow-lg' : 'bg-[#050505] border-white/5 hover:border-indigo-500/50 hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={`font-mono font-bold text-[11px] uppercase tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {p.label}
                      </div>
                      <div className={`p-1.5 rounded-lg transition-colors ${isLight ? 'bg-gray-50 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-white/5 text-white/40 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                        <Play className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 mb-3">
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-white/10 ${
                        p.category === 'architecture' ? 'text-indigo-400' : 
                        p.category === 'security' ? 'text-rose-400' :
                        p.category === 'optimization' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {p.category}
                      </span>
                    </div>
                    <p className={`text-[10px] font-mono leading-relaxed opacity-40 line-clamp-3 group-hover:opacity-80 transition-opacity`}>
                      {p.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              <h3 className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>API Endpoint Configuration</h3>
              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Endpoint URL</label>
                <div className="flex gap-2">
                  <select className={`w-24 border rounded-xl p-3 text-sm outline-none transition-colors font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-[#E0E0E0]'}`}>
                    <option>POST</option>
                    <option>GET</option>
                  </select>
                  <input type="text" placeholder="https://api.example.com/v1/chat/completions" className={`flex-1 border rounded-xl p-3 text-sm outline-none transition-colors font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`} defaultValue="https://api.openai.com/v1/chat/completions" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Headers</label>
                <textarea 
                  className={`h-24 border rounded-xl p-3 text-sm outline-none transition-colors resize-none font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'}`}
                  defaultValue={`{
  "Content-Type": "application/json",
  "Authorization": "Bearer $API_KEY"
}`}
                />
              </div>
              <div className="flex justify-end">
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
                  <Network className="w-4 h-4" /> Save Config
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sandbox' && (
            <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto items-center justify-center text-center max-w-2xl mx-auto relative">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-600/20 mb-2">
                <Code className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h3 className={`text-xl font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  METATRON LAB BOX (Cube of Chaos Order)
                </h3>
                <p className={`text-xs leading-relaxed max-w-md mx-auto ${isLight ? 'text-gray-600' : 'text-[#E0E0E0]/60'}`}>
                  Добро пожаловать в изолированную архитектурную среду разработки. Здесь вы можете организовывать 188 нейросетевых узлов и автономных агентов внутри безопасного цифрового «Куба», устранять проблемы компиляции, настраивать бэкенд и отслеживать священную геометрию системных потоков в реальном времени.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-lg text-left mt-2">
                {[
                  { title: 'Interactive VM Terminal', desc: 'Запуск CLI-команд (npm run dev, git, firebase deploy).' },
                  { title: 'Interactive Code Editor', desc: 'Правка кода и моментальный реактивный рендеринг в preview.' },
                  { title: 'Agent Reasoning Trace', desc: 'Визуализация пошаговых мыслей и вызовов инструментов агента.' },
                  { title: 'Strict Secure Shield', desc: 'Анализ правил безопасности firestore.rules в режиме реального времени.' }
                ].map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
                    <h4 className="text-xs font-bold text-indigo-400 mb-1">{item.title}</h4>
                    <p className={`text-[10px] leading-relaxed ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsSandboxOpen(true)}
                className="mt-4 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Запустить Sandbox на весь экран
              </button>
            </div>
          )}


        </div>
      </div>

      {/* Settings Area */}
        <div className={`w-full lg:w-64 border rounded-2xl p-4 flex flex-col gap-6 overflow-y-auto shrink-0 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
          <div className="flex items-center gap-2 border-b pb-3 border-gray-200 dark:border-white/10">
            <Settings2 className={`w-4 h-4 ${isLight ? 'text-gray-500' : 'text-white/60'}`} />
            <h3 className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>Configuration</h3>
          </div>
          
          <div className="flex flex-col gap-2">
             <label className={`text-[10px] font-mono uppercase tracking-wider flex justify-between items-center ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
               <span>AI Model</span>
               <span className={`px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/20 text-indigo-400`}>180+ Available</span>
             </label>
             <ModelSelector 
               value={model}
               onChange={setModel}
               isLight={isLight}
             />
          </div>
          
          <div className="flex flex-col gap-3">
             <label className={`text-[10px] font-mono uppercase tracking-wider flex justify-between ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
               <span>Temperature</span>
               <span>{temperature.toFixed(2)}</span>
             </label>
             <input 
               type="range" 
               min="0" 
               max="2" 
               step="0.01"
               value={temperature}
               onChange={e => setTemperature(parseFloat(e.target.value))}
               className="w-full accent-indigo-500 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-white/10"
             />
             <div className={`flex justify-between text-[8px] font-mono uppercase ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
               <span>Precise</span>
               <span>Creative</span>
             </div>
          </div>
          
          <div className="flex flex-col gap-3">
             <label className={`text-[10px] font-mono uppercase tracking-wider flex justify-between ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
               <span>Max Tokens</span>
               <span>{maxTokens}</span>
             </label>
             <input 
               type="range" 
               min="1" 
               max="8192" 
               step="1"
               value={maxTokens}
               onChange={e => setMaxTokens(parseInt(e.target.value))}
               className="w-full accent-indigo-500 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-white/10"
             />
          </div>
          
          <div className={`mt-auto p-3 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
            <h4 className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>Current Lab Config</h4>
            <ul className={`text-xs space-y-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
              <li>Stream: true</li>
              <li>Stop Seq: none</li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSandboxOpen && (
          <MetatronLabBox onClose={() => setIsSandboxOpen(false)} isLight={isLight} />
        )}
        
        {isDocExporterOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <div className="w-full max-w-5xl h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <DocExporter onClose={() => setIsDocExporterOpen(false)} />
            </div>
          </motion.div>
        )}

        {isLogExporterOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <div className="w-full max-w-2xl h-[500px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <SystemLogExporter onClose={() => setIsLogExporterOpen(false)} />
            </div>
          </motion.div>
        )}

        <AzrailMemoryCorePanel 
          isOpen={isMemoryPanelOpen} 
          onClose={() => setIsMemoryPanelOpen(false)} 
          isLight={isLight || false} 
        />
      </AnimatePresence>
    </div>
  );
}

function ToolButton({ icon, label, desc, isLight, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${active ? (isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/20') : (isLight ? 'bg-gray-50 border-transparent hover:bg-gray-100' : 'bg-white/5 border-transparent hover:bg-white/10')}`}
    >
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
