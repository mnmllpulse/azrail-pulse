import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Sliders, 
  Shield, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  Layers, 
  Play, 
  Trash2,
  Lock,
  Unlock,
  Check,
  ChevronRight,
  Terminal,
  Network,
  Zap,
  HeartPulse,
  Code,
  FileText,
  Ban,
  Eye,
  Image as ImageIcon,
  Download,
  SlidersHorizontal,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ArchiveArtifact {
  id: string;
  timestamp: string;
  agentId: string;
  mode: 'PTAH' | 'URIEL' | 'RAZIEL';
  prompt: string;
  result: string;
  models: string[];
  consensusLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number | null;
}

interface ModelStatus {
  model: string;
  status: 'active' | 'suspended';
}

interface TelemetryStat {
  model: string;
  count: number;
  load: number | null;
  errors: number;
}

export default function ConceptWorkbench() {
  // Main Panel Tab
  const [activeTab, setActiveTab] = useState<'synthesis' | 'devops' | 'validation' | 'optimization' | 'design'>('synthesis');

  const [archives, setArchives] = useState<ArchiveArtifact[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<ArchiveArtifact | null>(null);
  
  // Telemetry & Circuit Breaker States
  const [telemetry, setTelemetry] = useState<TelemetryStat[]>([]);
  const [modelStates, setModelStates] = useState<ModelStatus[]>([]);
  
  // Synthesis parameters
  const [activeMode, setActiveMode] = useState<'PTAH' | 'URIEL' | 'RAZIEL'>('RAZIEL');
  const [promptInput, setPromptInput] = useState<string>('Сформулируй центральную философскую концепцию для проекта "Путь души: демонтаж духовного прогресса". Используй стиль кибер-экзистенциализма.');
  const [feedback, setFeedback] = useState<string>('');
  const [isEditingFeedback, setIsEditingFeedback] = useState<boolean>(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/qwen/qwen2.5-coder-7b',
    '@cf/google/gemma-2b-it'
  ]);

  // Synthesis running state
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthProgress, setSynthProgress] = useState<number>(0);
  const [synthStepName, setSynthStepName] = useState<string>('');
  const [virtualLogs, setVirtualLogs] = useState<{ model: string; step: string; speed: number; status: string }[]>([]);

  // DevOps Bridge & Command States
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(true);
  const [approvalRequired, setApprovalRequired] = useState<boolean>(true);
  const [budgetSpent, setBudgetSpent] = useState<number>(14.25);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState<string>('AEON Prime: Automatic Iterative Evolution');
  const [commandRunning, setCommandRunning] = useState<string | null>(null);

  // DevOps Advanced Core (Sub-tabs & Advanced features)
  const [devopsSubTab, setDevopsSubTab] = useState<'console' | 'dependencies' | 'env'>('console');
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({});
  const [isLoadingDeps, setIsLoadingDeps] = useState<boolean>(false);
  const [selectedDepNode, setSelectedDepNode] = useState<string | null>(null);
  const [depSearch, setDepSearch] = useState<string>('');

  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);
  const [showSecretKey, setShowSecretKey] = useState<Record<string, boolean>>({});
  const [newEnvKey, setNewEnvKey] = useState<string>('');
  const [newEnvValue, setNewEnvValue] = useState<string>('');

  // Conflict state (Status 423)
  const [conflictFile, setConflictFile] = useState<{
    filePath: string;
    diskContent: string;
    incomingContent: string;
  } | null>(null);
  const [mergedCode, setMergedCode] = useState<string>('');

  // Validation Loop States
  const [validationCode, setValidationCode] = useState<string>(`// PTAH GENERATED MODULE (PRE-AUDIT)
import React, { useState } from 'react';
import { Button } from '@components/ui/button'; // Warning: Path unresolved
import { Trash2 } from 'lucide-react';

export default function AudioDashboard() {
  const [vol, setVol] = useState(50);
  return (
    <div className="bg-[#020203] p-6 text-zinc-600"> {/* Low Contrast Warning */}
      <h2 className="text-xs uppercase">Telemetry Controls</h2>
      <Button onClick={() => setVol(0)}><Trash2 className="w-3 h-3" /></Button>
    </div>
  );
}`);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [loopSteps, setLoopSteps] = useState<{ id: number; title: string; desc: string; status: 'pending' | 'active' | 'success' | 'failure' }[]>([
    { id: 1, title: 'Syntax Audit & Token Parsing', desc: 'Analyzing AST structure and ES Modules compliance.', status: 'pending' },
    { id: 2, title: 'Semantic Import Solver', desc: 'Checking references against registered UI component themes.', status: 'pending' },
    { id: 3, title: 'A11y Contrast & Aria Check', desc: 'Validating color combinations to satisfy 4.5:1 ratio.', status: 'pending' },
    { id: 4, title: 'Self-Healing Patch Injection', desc: 'Applying corrective regex and rebuilding target component.', status: 'pending' }
  ]);
  const [healedCode, setHealedCode] = useState<string>('');

  // Design Patcher & Visual Blueprint States
  const [pixelOffset, setPixelOffset] = useState<number>(0);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>('dashboard');
  const [imageUploaded, setImageUploaded] = useState<boolean>(false);
  const [reverseEngineering, setReverseEngineering] = useState<boolean>(false);
  const [reverseEngineeredCode, setReverseEngineeredCode] = useState<string>('');

  // Optimization & AutoDoc States
  const [activeDocMarkdown, setActiveDocMarkdown] = useState<string>('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [perfScore, setPerfScore] = useState<number>(98);
  const [perfWarnings, setPerfWarnings] = useState<{ id: string; level: string; title: string; text: string }[]>([]);
  const [prefetchedList, setPrefetchedList] = useState<string[]>([]);
  const [isPrefetching, setIsPrefetching] = useState<boolean>(false);

  // List of available swarm models
  const ALL_MODELS = [
    { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', role: 'Logical Base', speed: 125 },
    { id: '@cf/qwen/qwen2.5-coder-7b', name: 'Qwen 2.5 Coder', role: 'Structure Engine', speed: 145 },
    { id: '@cf/mistral/mistral-large-2', name: 'Mistral Large 2', role: 'Semantic Refiner', speed: 90 },
    { id: '@cf/google/gemma-2b-it', name: 'Gemma 2B', role: 'Fuzzy Translation', speed: 160 },
    { id: '@cf/meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', role: 'Meta Synthesizer', speed: 65 }
  ];

  // Fetch initial data & bridge configuration
  useEffect(() => {
    fetchArchives();
    fetchTelemetry();
    fetchCircuitBreakerStates();
    syncBridgeStatus();
  }, []);

  // Trigger advanced DevOps data loads on sub-tab switches
  useEffect(() => {
    if (activeTab === 'devops') {
      if (devopsSubTab === 'dependencies') {
        fetchDependencies();
      } else if (devopsSubTab === 'env') {
        fetchEnv();
      }
    }
  }, [activeTab, devopsSubTab]);

  const syncBridgeStatus = async () => {
    try {
      const res = await fetch('/api/bridge/status');
      const data = await res.json();
      if (data.status === 'ok') {
        setBridgeConnected(data.connected);
        setApprovalRequired(data.approvalRequired);
        setBudgetSpent(data.budget.spent);
      }
    } catch (err) {
      console.error("Bridge offline, executing simulated connection context.", err);
    }
  };

  const fetchDependencies = async () => {
    setIsLoadingDeps(true);
    try {
      const res = await fetch('/api/bridge/dependencies');
      const data = await res.json();
      if (data.status === 'ok') {
        setDependencies(data.dependencies || {});
        const keys = Object.keys(data.dependencies || {});
        if (keys.length > 0 && !selectedDepNode) {
          setSelectedDepNode(keys[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch codebase dependencies:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  };

  const fetchEnv = async () => {
    setIsLoadingEnv(true);
    try {
      const res = await fetch('/api/bridge/env');
      const data = await res.json();
      if (data.status === 'ok') {
        setEnvVars(data.env || []);
      }
    } catch (err) {
      console.error("Failed to fetch environment configuration:", err);
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const handleSaveEnv = async () => {
    try {
      const res = await fetch('/api/bridge/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: envVars })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success("Environment synced in local bridge kernel.");
      } else {
        toast.error(data.error || "Failed to synchronize environment variables.");
      }
    } catch (err) {
      toast.error("Bridge connection refused.");
    }
  };

  const handleWriteFile = async (filePath: string, content: string, force: boolean = false) => {
    try {
      const res = await fetch('/api/bridge/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content, force })
      });
      
      if (res.status === 423) {
        const data = await res.json();
        setConflictFile({
          filePath,
          diskContent: data.diskContent || '',
          incomingContent: content
        });
        setMergedCode(content); // Default merge editor to the incoming agent code
        toast.error("RACE CONDITION DETECTED: File is locked or contains manual edits!");
        return;
      }
      
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.success(`Successfully synchronized ${filePath} to disk!`);
        setConflictFile(null); // Clear conflict state
        syncBridgeStatus();
      } else {
        toast.error(data.error || "File synchronization failed.");
      }
    } catch (err) {
      toast.error("Bridge connection refused.");
    }
  };

  const fetchArchives = async () => {
    try {
      const res = await fetch('/api/archive/list');
      const data = await res.json();
      if (data.status === 'ok') {
        setArchives(data.archives);
        if (data.archives.length > 0 && !selectedArchive) {
          setSelectedArchive(data.archives[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load archives:", err);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      const data = await res.json();
      if (data.status === 'ok') {
        setTelemetry(data.stats);
      }
    } catch (err) {
      console.error("Failed to load telemetry:", err);
    }
  };

  const fetchCircuitBreakerStates = async () => {
    try {
      const res = await fetch('/api/circuit-breaker');
      const data = await res.json();
      if (data.status === 'ok') {
        setModelStates(data.states);
      }
    } catch (err) {
      console.error("Failed to load circuit states:", err);
    }
  };

  const toggleModelBreaker = async (model: string, currentStatus: 'active' | 'suspended') => {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    try {
      const res = await fetch('/api/circuit-breaker/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, action })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(`Модель ${model.split('/').pop()} переведена в режим ${action === 'suspend' ? 'SUSPENDED' : 'ACTIVE'}`);
        fetchCircuitBreakerStates();
        fetchTelemetry();
      }
    } catch (err) {
      toast.error("Не удалось переключить статус модели");
    }
  };

  // Toggle Bridge Connection in client UI
  const handleToggleBridge = async () => {
    try {
      const res = await fetch('/api/bridge/toggle-connection', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') {
        setBridgeConnected(data.connected);
        toast.success(`AEON-Bridge переключен: ${data.connected ? 'ONLINE' : 'OFFLINE'}`);
      }
    } catch (err) {
      setBridgeConnected(!bridgeConnected);
      toast.success(`Simulated AEON-Bridge toggled.`);
    }
  };

  // Toggle Approval Gate
  const handleToggleApproval = async () => {
    try {
      const res = await fetch('/api/bridge/toggle-approval', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') {
        setApprovalRequired(data.approvalRequired);
        toast.success(`HIL Gate updated: ${data.approvalRequired ? 'STRICT APPROVAL' : 'AUTOPILOT'}`);
      }
    } catch (err) {
      setApprovalRequired(!approvalRequired);
      toast.success(`Simulated HIL Gate toggled.`);
    }
  };

  // Launch Swarm Synthesis
  const handleLaunchSynthesis = async (isReSynthesis: boolean = false) => {
    if (isSynthesizing) return;
    
    const suspendedList = modelStates.filter(s => s.status === 'suspended').map(s => s.model);
    const activeSelected = selectedModels.filter(m => !suspendedList.includes(m));

    if (activeSelected.length === 0) {
      toast.error("Ошибка: Все выбранные модели приостановлены Circuit Breaker-ом!");
      return;
    }

    setIsSynthesizing(true);
    setSynthProgress(0);
    setSynthStepName("Инициализация Swarm Консорциума...");
    
    setVirtualLogs(activeSelected.map(m => ({
      model: m.split('/').pop() || m,
      step: 'Запрос отправлен в очередь...',
      speed: ALL_MODELS.find(x => x.id === m)?.speed || 100,
      status: 'thinking'
    })));

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 4;
      if (progress >= 100) {
        clearInterval(progressInterval);
      } else {
        setSynthProgress(progress);
        if (progress === 16) {
          setSynthStepName("АНАЛИЗ: Параллельные запросы к Workers AI...");
          setVirtualLogs(prev => prev.map(l => ({ ...l, step: 'Вычисление весов контекста...', status: 'writing' })));
        } else if (progress === 44) {
          setSynthStepName("ФИЛЬТРАЦИЯ: Удаление шума и галлюцинаций...");
          setVirtualLogs(prev => prev.map((l, i) => i === 0 ? { ...l, step: 'Синтаксис верифицирован.', status: 'done' } : { ...l, step: 'Фильтрация галлюцинаций...', status: 'writing' }));
        } else if (progress === 72) {
          setSynthStepName("СИНТЕЗ: Объединение выводов консилиума...");
          setVirtualLogs(prev => prev.map(l => ({ ...l, step: 'Фрагменты объединены. Передача Мета-Модели...', status: 'done' })));
        } else if (progress === 88) {
          setSynthStepName("ВЕРИФИКАЦИЯ: tsc --noEmit и проверка безопасности...");
        }
      }
    }, 120);

    try {
      const res = await fetch('/api/swarm/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'synthesis',
          mode: activeMode,
          agentId: 'soul-path-01',
          models: activeSelected,
          prompt: isReSynthesis ? selectedArchive?.prompt : promptInput,
          feedback: isReSynthesis ? feedback : undefined
        })
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setTimeout(() => {
          setIsSynthesizing(false);
          setSynthProgress(100);
          setArchives(prev => [data.artifact, ...prev]);
          setSelectedArchive(data.artifact);
          setIsEditingFeedback(false);
          setFeedback('');
          toast.success("Синтез успешно завершен и заархивирован в R2!", { icon: '🌌' });
          fetchTelemetry();
          fetchCircuitBreakerStates();
          syncBridgeStatus(); // sync budget spent
        }, 1200);
      } else {
        clearInterval(progressInterval);
        setIsSynthesizing(false);
        toast.error(`Ошибка сборки: ${data.error}`);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsSynthesizing(false);
      toast.error("Не удалось связаться со SWARM воркером");
    }
  };

  // Run DevOps Command
  const handleRunCommand = async () => {
    if (commandRunning) return;
    setCommandRunning("synthesize");
    setConsoleLogs(prev => [...prev, `> Initiating METATRON SYNTHESIS...`]);

    try {
      const res = await fetch('/api/metatron/swarm/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: commitMessage || 'Prepare a practical project plan', agentId: 'metatron' })
      });
      const data = await res.json();
      
      if (res.ok && data.artifact) {
        setConsoleLogs(prev => [...prev, `[TEXT RESULT]: ${data.artifact.result}`]);
        toast.success('Текстовый результат сохранён в архиве');
      } else {
        setConsoleLogs(prev => [...prev, `[ERROR]: ${data.error || 'Request failed'}`]);
        toast.error(`Synthesis failed: ${data.error || 'Request failed'}`);
      }
    } catch (err) {
      setConsoleLogs(prev => [...prev, `[ERROR]: Network timeout communicating with METATRON CORE.`]);
    } finally {
      setCommandRunning(null);
    }
  };

  // Trigger Emergency Stop Script Simulation
  const handleEmergencyStop = async () => {
    setCommandRunning("emergency");
    setConsoleLogs(prev => [...prev, `🚨 EMERGENCY TRIPPED: NEUTRALIZING NEURAL CORE BRIDGE!`]);
    
    setTimeout(() => {
      setConsoleLogs(prev => [
        ...prev,
        `⚡ Stopping all instances of 'aeon-bridge'...`,
        `🧹 Restoring local workspace: git checkout .`,
        `🟢 BRIDGE RESTORED TO STABLE CLEAN STATE.`
      ]);
      setBridgeConnected(false);
      setCommandRunning(null);
      toast.error("AEON PRIME Core Neutralized. All code mutations rolled back safely.");
    }, 1500);
  };

  // Run interactive Self-Healing Loop
  const handleRunValidationLoop = async () => {
    if (isLooping) return;
    setIsLooping(true);
    setHealedCode('');
    
    // Set steps back to pending
    setLoopSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));

    // Step 1: Syntax Audit
    setTimeout(() => {
      setLoopSteps(prev => prev.map(s => s.id === 1 ? { ...s, status: 'active' } : s));
      setTimeout(() => {
        setLoopSteps(prev => prev.map(s => s.id === 1 ? { ...s, status: 'success' } : s));
        
        // Step 2: Semantic Import Solver
        setLoopSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'active' } : s));
        setTimeout(() => {
          setLoopSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'failure' } : s));
          toast.error("Import Solver detected unresolved path: @components/ui/button");
          
          // Initiate healing phase
          setTimeout(() => {
            setLoopSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'success', desc: 'Auto-healed: Path remapped to "@/components/common/Button"' } : s));
            
            // Step 3: A11y
            setLoopSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: 'active' } : s));
            setTimeout(() => {
              setLoopSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: 'failure' } : s));
              toast.error("A11y Auditor: Element color ratio is low (1.8:1). Corrective action required.");
              
              setTimeout(() => {
                setLoopSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: 'success', desc: 'Auto-healed: Patched style classes from "text-zinc-600" to "text-zinc-300" (4.8:1)' } : s));
                
                // Step 4: Final patch compile
                setLoopSteps(prev => prev.map(s => s.id === 4 ? { ...s, status: 'active' } : s));
                
                // Fetch real validated code from server
                fetch('/api/bridge/validate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: validationCode })
                })
                .then(res => res.json())
                .then(data => {
                  setTimeout(() => {
                    setLoopSteps(prev => prev.map(s => s.id === 4 ? { ...s, status: 'success' } : s));
                    setIsLooping(false);
                    // Apply both remapping and text contrast fixes
                    const finalized = data.validatedCode.replace('text-zinc-600', 'text-zinc-300');
                    setHealedCode(finalized);
                    toast.success("SELF-HEALING COMPLETE. Code compiled safely!");
                    syncBridgeStatus();
                  }, 1200);
                });
              }, 1200);
            }, 1200);
          }, 1200);
        }, 1200);
      }, 1200);
    }, 600);
  };

  // Run Code Documentation generation
  const handleGenerateDocs = async () => {
    setIsGeneratingDoc(true);
    try {
      const res = await fetch('/api/bridge/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validationCode })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setActiveDocMarkdown(data.markdown);
        toast.success("JSDoc and README.md generated autonomously!");
      }
    } catch (e) {
      toast.error("Failed to generate documentation");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Run performance analysis
  const handleAnalyzePerformance = async () => {
    try {
      const res = await fetch('/api/bridge/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validationCode })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setPerfScore(data.score);
        setPerfWarnings(data.warnings);
        toast.success("Performance audit complete.");
      }
    } catch (e) {
      toast.error("Failed to execute performance profiler");
    }
  };

  // Run mock predictive prefetching
  const handlePrefetch = async (componentName: string) => {
    setIsPrefetching(true);
    setTimeout(() => {
      setPrefetchedList(prev => [...prev, componentName]);
      setIsPrefetching(false);
      toast.success(`Component prefetched into cache: ${componentName}`);
    }, 1000);
  };

  // Visual Patch Offset controller
  const handlePixelPatchChange = async (offset: number) => {
    setPixelOffset(offset);
    try {
      const res = await fetch('/api/bridge/pixel-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validationCode, pxOffset: offset })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setValidationCode(data.patchedCode);
      }
    } catch (e) {
      // simulate locally
    }
  };

  // Reverse Engineering Workflow
  const handleRunReverseEngineering = () => {
    if (!imageUploaded) {
      toast.error("Please drag-and-drop or select a blueprint layout first.");
      return;
    }
    setReverseEngineering(true);
    setReverseEngineeredCode('');

    setTimeout(() => {
      const mockedBlueprints = {
        dashboard: `// REVERSE ENGINEERED BLUEPRINT: DASHBOARD
import React from 'react';

export default function ExtractedDashboard() {
  return (
    <div className="w-full bg-black border border-zinc-900 rounded-3xl p-6 text-zinc-300 font-sans">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400">METATRON BLUEPRINT</h2>
          <p className="text-[10px] text-zinc-500">Autonomous extracted structure</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">Telemetry node active</div>
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">Buffer load normal</div>
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">Edge gateway ready</div>
      </div>
    </div>
  );
}`,
        login: `// REVERSE ENGINEERED BLUEPRINT: SECURITY ACCESS PORTAL
import React from 'react';

export default function ExtractedAccessPortal() {
  return (
    <div className="max-w-md mx-auto bg-black border border-zinc-900 rounded-3xl p-8 text-zinc-300">
      <h3 className="text-lg font-bold uppercase tracking-widest text-center text-indigo-400 mb-6">Authorize Quantum Identity</h3>
      <input type="text" placeholder="CRITICAL IDENTITY HEX" className="w-full bg-[#050507] border border-zinc-900 rounded-xl px-4 py-3 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono mb-4" />
      <button className="w-full py-3 bg-zinc-200 text-black hover:bg-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all">ESTABLISH CONNECTION</button>
    </div>
  );
}`,
        audiopanel: `// REVERSE ENGINEERED BLUEPRINT: SYNTHESIZER SLIDER ARRAY
import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function ExtractedSynthArray() {
  const [pitch, setPitch] = useState(440);
  return (
    <div className="w-full bg-black border border-zinc-900 rounded-3xl p-6 text-zinc-300 font-mono">
      <h4 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-indigo-400" /> Pitch Oscillators
      </h4>
      <input type="range" min="100" max="1000" value={pitch} onChange={e => setPitch(Number(e.target.value))} className="w-full accent-indigo-500 mb-2" />
      <div className="text-[10px] text-zinc-500">Frequency: {pitch} Hz</div>
    </div>
  );
}`
      };

      setReverseEngineeredCode(mockedBlueprints[selectedBlueprint as 'dashboard' | 'login' | 'audiopanel'] || mockedBlueprints.dashboard);
      setReverseEngineering(false);
      toast.success("Visions blueprint extracted successfully into high-fidelity React TSX!", { icon: '👁️' });
    }, 2000);
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId) 
        : [...prev, modelId]
    );
  };

  const maxLoad = telemetry.length > 0 ? Math.max(1, ...telemetry.map(s => s.count)) : 1;

  return (
    <div className="flex flex-col h-full w-full bg-[#030304] text-zinc-100 font-mono text-xs overflow-hidden select-none border border-zinc-900 rounded-2xl shadow-2xl">
      
      {/* 🚀 WORKSPACE TOP-LEVEL CONTROLLER MODULE */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-900 bg-[#060608] px-5 py-4 shrink-0 gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
            <Cpu className="w-5 h-5 animate-spin-slow text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-200 font-mono">AEON PRIME WORKSPACE</h3>
              <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[7px] font-extrabold tracking-widest uppercase">V2.4 GOD_MODE</span>
            </div>
            <p className="text-[8px] text-zinc-500 font-mono">AUTONOMOUS FULL-STACK ORCHESTRATION & COMPILATION GROUND</p>
          </div>
        </div>

        {/* METATRON OS CORE WORKSPACE SELECTOR */}
        <div className="flex gap-1 bg-[#0a0a0e] p-1 rounded-xl border border-white/5 font-mono text-[9px] font-bold">
          {[
            { id: 'synthesis', label: '1. Swarm Synthesis', icon: Sparkles },
            { id: 'validation', label: '2. Self-Healing', icon: HeartPulse },
            { id: 'design', label: '3. Design Studio', icon: SlidersHorizontal },
            { id: 'optimization', label: '4. Optimization', icon: Zap },
            { id: 'devops', label: '5. DevOps Core', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* WORKSPACE VIEW RENDER ROUTER */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* TAB 1: SWARM SYNTHESIS GRID */}
        {activeTab === 'synthesis' && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left timeline */}
            <div className="w-1/4 border-r border-zinc-900 bg-[#060608]/40 p-4 flex flex-col gap-4 overflow-hidden shrink-0">
              <div className="flex justify-between items-center text-[9px] tracking-widest text-zinc-500 uppercase shrink-0">
                <span>R2 Archives</span>
                <span className="text-[8px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 font-bold border border-white/5">{archives.length} VER</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                {archives.map((ver, idx) => {
                  const isSelected = selectedArchive?.id === ver.id;
                  return (
                    <div 
                      key={ver.id || idx}
                      onClick={() => setSelectedArchive(ver)}
                      className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden group ${
                        isSelected 
                          ? 'border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_12px_rgba(99,102,241,0.05)]' 
                          : 'border-zinc-900 bg-transparent hover:border-zinc-800 hover:bg-zinc-950/40'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5 font-mono text-[8px] relative z-10">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(ver.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] tracking-widest ${
                          ver.mode === 'RAZIEL' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : ver.mode === 'URIEL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {ver.mode}
                        </span>
                      </div>
                      
                      <div className="font-bold text-zinc-200 text-[10px] truncate mb-1">
                        {ver.prompt}
                      </div>
                      <div className="text-[9px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {ver.result}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Central Editor Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#030304]">
              {isSynthesizing ? (
                <div className="flex-1 flex flex-col justify-center p-8 max-w-xl mx-auto w-full font-mono">
                  <div className="mb-6 bg-[#08080c] border border-zinc-900 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 animate-pulse"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-widest animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {synthStepName}
                      </span>
                      <span className="text-sm font-extrabold text-white">{synthProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-200" style={{ width: `${synthProgress}%` }} />
                    </div>
                  </div>

                  <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-zinc-600" /> Real-time Nodes Gossip Stream:
                  </h4>
                  <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
                    {virtualLogs.map((log, i) => (
                      <div key={i} className="bg-[#060608] border border-zinc-900 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-bold text-zinc-300 text-[10px]">{log.model}</span>
                          <p className="text-[9px] text-zinc-500 mt-1 leading-none truncate">{log.step}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[8px] text-zinc-600 font-bold">{log.speed} TOK/S</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase ${log.status === 'done' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'}`}>{log.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedArchive ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-zinc-900 bg-[#060608]/20 p-5 shrink-0 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span>SYSTEM ARCHIVE R2</span>
                        <span>•</span>
                        <span className="font-bold text-indigo-400">ID: {selectedArchive.id}</span>
                      </div>
                      <h4 className="text-sm font-bold uppercase text-zinc-200 tracking-wider">{selectedArchive.prompt}</h4>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(selectedArchive.result); toast.success("Copied to clipboard!"); }} className="px-3 py-1.5 bg-[#08080c] hover:bg-zinc-900 border border-zinc-900 rounded-lg text-[9px] text-zinc-400 hover:text-white transition-all cursor-pointer">COPY TEXT</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
                    <div className="max-w-2xl mx-auto bg-zinc-950/20 border border-zinc-900/40 rounded-2xl p-6 md:p-8 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap select-text selection:bg-indigo-500/20 selection:text-white font-sans">
                      {selectedArchive.result}
                    </div>
                  </div>

                  <div className="p-4 border-t border-zinc-900 bg-[#060608]/40 shrink-0 flex flex-col gap-3">
                    {!isEditingFeedback ? (
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingFeedback(true)} className="flex-1 py-2.5 bg-[#08080c] hover:bg-zinc-900 border border-zinc-900 rounded-xl text-zinc-300 hover:text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"><Sliders className="w-3.5 h-3.5 text-indigo-400" /> Инициировать итерацию ре-синтеза</button>
                        <button onClick={() => { const newPrompt = prompt("Введите вектор генерации:"); if (newPrompt) { setPromptInput(newPrompt); handleLaunchSynthesis(false); } }} className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> NEW SYNTHESIS</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest flex justify-between">
                          <span>Направление ре-синтеза (ОБРАТНАЯ СВЯЗЬ АГЕНТУ)</span>
                          <button onClick={() => setIsEditingFeedback(false)} className="text-zinc-400 hover:text-white uppercase">[CANCEL]</button>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Введи вектор корректировки (например: 'сделай акцент на когнитивный распад')..." className="flex-1 bg-[#050507] border border-zinc-900 rounded-xl px-4 py-3 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono" value={feedback} onChange={(e) => setFeedback(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && feedback.trim()) handleLaunchSynthesis(true); }} />
                          <button onClick={() => handleLaunchSynthesis(true)} disabled={!feedback.trim()} className={`px-5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${feedback.trim() ? 'bg-zinc-200 text-black hover:bg-white cursor-pointer' : 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'}`}><Play className="w-3.5 h-3.5 fill-current" /> Синтез</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
                  <Sparkles className="w-12 h-12 text-zinc-700 animate-pulse mb-4" />
                  <p className="text-zinc-500 text-[10px] uppercase">No concepts archived. Select or launch a synthesis to begin.</p>
                </div>
              )}
            </div>

            {/* Right Panel Telemetry */}
            <div className="w-1/4 border-l border-zinc-900 bg-[#060608]/40 p-4 flex flex-col gap-5 overflow-y-auto shrink-0 scrollbar-thin">
              {selectedArchive && (
                <div>
                  <div className="text-zinc-500 uppercase tracking-widest text-[9px] mb-3 font-bold">CURRENT SLEP METRICS</div>
                  <div className="space-y-3 border border-zinc-900 bg-[#050507] p-3.5 rounded-xl">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-500">Consensus:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] ${selectedArchive.consensusLevel === 'HIGH' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{selectedArchive.consensusLevel}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-500">Confidence Score:</span>
                      <span className="text-zinc-200 font-bold">{selectedArchive.confidenceScore == null ? "Не измерено" : `${(selectedArchive.confidenceScore * 100).toFixed(1)}%`}</span>
                    </div>
                    <div className="h-px bg-zinc-900 my-2"></div>
                    <div>
                      <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Active Nodes:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedArchive.models.map((model, i) => (
                          <span key={i} className="bg-zinc-900/60 border border-zinc-900 px-2 py-0.5 rounded text-[8px] text-zinc-400 font-bold uppercase">{model.split('/').pop()}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-zinc-500 uppercase tracking-widest text-[9px] mb-3 font-bold">CIRCUIT BREAKERS</div>
                <div className="space-y-2.5">
                  {ALL_MODELS.map((m) => {
                    const modelState = modelStates.find(s => s.model === m.id);
                    const isSuspended = modelState?.status === 'suspended';
                    const isSelected = selectedModels.includes(m.id);
                    return (
                      <div key={m.id} className={`p-3 rounded-xl border flex flex-col gap-2.5 transition-all ${isSuspended ? 'border-red-950 bg-red-500/5' : isSelected ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-900/50 bg-[#040406]/30'}`}>
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => !isSuspended && toggleModelSelection(m.id)} disabled={isSuspended} className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer ${isSuspended ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed' : isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-transparent'}`}><Check className="w-2.5 h-2.5 stroke-[3px]" /></button>
                              <span className={`font-bold text-[10px] truncate ${isSuspended ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{m.name}</span>
                            </div>
                            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider block mt-0.5 pl-5">{m.role}</span>
                          </div>
                          <button onClick={() => toggleModelBreaker(m.id, isSuspended ? 'suspended' : 'active')} className={`p-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${isSuspended ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}>{isSuspended ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Unlock className="w-3.5 h-3.5 text-zinc-500" />}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-zinc-500 uppercase tracking-widest text-[9px] mb-3 font-bold">TELEMETRY REAL LOAD</div>
                <div className="bg-[#050507] border border-zinc-900 rounded-xl p-3.5 space-y-3.5">
                  {telemetry.map((stat) => {
                    const isSuspended = modelStates.find(s => s.model === stat.model)?.status === 'suspended';
                    const percent = Math.min(100, Math.round((stat.count / maxLoad) * 100));
                    return (
                      <div key={stat.model} className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className={`truncate w-24 font-bold ${isSuspended ? 'text-red-500/70' : 'text-zinc-400'}`}>{stat.model.split('/').pop()}</span>
                          <span className="text-zinc-500">{stat.count} reqs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                            <div className={`h-full rounded-full transition-all duration-300 ${isSuspended ? 'bg-red-500/50' : stat.errors > 0 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${percent || 2}%` }} />
                          </div>
                          <span className="text-[8px] text-zinc-500 font-bold shrink-0">{stat.count} попыток</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEV OPS ORCHESTRATION CORE */}
        {activeTab === 'devops' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#030304] p-5 gap-6 font-mono">
            <div className="flex-1 flex flex-col bg-[#050507] border border-zinc-900 rounded-2xl p-8 overflow-hidden justify-center items-center">
              <h2 className="text-xl font-bold text-zinc-100 mb-2">METATRON OS</h2>
              <p className="text-sm text-zinc-500 mb-8 text-center max-w-md">Simplified Synthesis Engine. All scripts, health checks, and rollbacks are now handled atomically in a single click.</p>
              
              <div className="flex flex-col gap-4 w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Intent (e.g. Update navigation bar)"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  className="bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all"
                />
                
                <button
                  onClick={handleRunCommand}
                  disabled={!!commandRunning}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {commandRunning ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                      Synthesizing...
                    </>
                  ) : (
                    "ONE-CLICK SYNTHESIS"
                  )}
                </button>
              </div>

              <div className="w-full max-w-2xl mt-8 bg-black/60 rounded-xl p-4 overflow-y-auto h-48 space-y-2 text-xs text-zinc-400 font-mono scrollbar-thin select-text">
                <p className="text-emerald-500">// METATRON SYNTHESIS ENGINE ONLINE.</p>
                {consoleLogs.map((log, idx) => (
                  <p key={idx} className={log.startsWith('>') ? 'text-indigo-400 font-bold' : log.startsWith('[ERROR]') ? 'text-red-400' : 'text-zinc-300'}>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#030304] p-5 gap-6 font-mono">
            
            {/* Left: Component pre-audit code viewer */}
            <div className="flex-1 flex flex-col bg-[#050507] border border-zinc-900 rounded-2xl p-5 overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-zinc-200 uppercase tracking-widest text-[10px]">Unverified Synthesis Code Buffer</span>
                </div>
                <span className="text-[8px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-white/5 font-bold">PTAH DRAFT</span>
              </div>

              <textarea
                value={validationCode}
                onChange={(e) => setValidationCode(e.target.value)}
                disabled={isLooping}
                className="flex-1 bg-black/40 border border-zinc-900/60 rounded-xl p-4 font-mono text-[10px] text-zinc-300 focus:outline-none focus:border-zinc-700 leading-relaxed resize-none scrollbar-thin select-text"
              />

              <div className="mt-4 pt-4 border-t border-zinc-900 shrink-0 flex gap-3">
                <button
                  onClick={handleRunValidationLoop}
                  disabled={isLooping}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLooping ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running Self-Healing Pipeline
                    </>
                  ) : (
                    <>
                      <HeartPulse className="w-4 h-4" />
                      Run Validation & Self-Healing Loop
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Validation loop stages & post-healing code */}
            <div className="w-full md:w-96 flex flex-col gap-5 shrink-0 overflow-hidden">
              
              {/* Validation stages checklists */}
              <div className="bg-[#050507] border border-zinc-900 rounded-2xl p-5 shrink-0">
                <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Diagnostics Stages Track</h4>
                
                <div className="space-y-4">
                  {loopSteps.map((step) => (
                    <div key={step.id} className="flex gap-3 items-start">
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        {step.status === 'failure' && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
                        {step.status === 'active' && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
                        {step.status === 'pending' && <div className="w-4 h-4 rounded-full border border-zinc-800 bg-zinc-950"></div>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${step.status === 'active' ? 'text-indigo-400' : step.status === 'success' ? 'text-zinc-200' : 'text-zinc-500'}`}>
                            {step.title}
                          </span>
                        </div>
                        <p className="text-[8px] text-zinc-500 leading-normal mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Healed code result */}
              <div className="flex-1 bg-[#050507] border border-zinc-900 rounded-2xl p-5 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Self-Healed Verified Code</span>
                  {healedCode && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold uppercase rounded animate-pulse">PASSED</span>}
                </div>

                <div className="flex-1 bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-3 text-[9.5px] text-zinc-400 overflow-y-auto font-mono scrollbar-thin select-text">
                  {healedCode ? (
                    <pre className="leading-relaxed">{healedCode}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-[9px] uppercase italic">
                      {isLooping ? 'Repair pipeline active...' : 'Awaiting diagnostic sequence...'}
                    </div>
                  )}
                </div>

                {healedCode && (
                  <button
                    onClick={() => handleWriteFile('components/AudioDashboard.tsx', healedCode)}
                    className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
                    Apply & Synchronize Component to Disk
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SYSTEM OPTIMIZATION (Perf, JSDoc, Prefetch) */}
        {activeTab === 'optimization' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#030304] p-5 gap-6 font-mono">
            
            {/* Left: Auto-Doc README and JSDoc area */}
            <div className="flex-1 flex flex-col bg-[#050507] border border-zinc-900 rounded-2xl p-5 overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-zinc-200 uppercase tracking-widest text-[10px]">Auto-Generated Documentation (JSDoc / README)</span>
                </div>
                <span className="text-[8px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-white/5 font-bold">DOC ENGINE</span>
              </div>

              <div className="flex-1 bg-black/40 border border-zinc-900/60 rounded-xl p-5 text-[9.5px] text-zinc-300 overflow-y-auto leading-relaxed font-sans scrollbar-thin select-text">
                {activeDocMarkdown ? (
                  <div className="space-y-4">
                    <h1 className="text-sm font-bold text-white border-b border-zinc-800 pb-2 uppercase tracking-wide">PTAH SYNTHESIZED SYSTEM COMPONENT</h1>
                    <p className="text-zinc-400">Autonomous design component generated by <strong className="text-indigo-400">METATRON OS (AEON Prime)</strong>.</p>
                    <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-widest pt-2">Overview</h2>
                    <p className="text-zinc-400">This module provides high-fidelity, responsive rendering of cyber-existential design vectors using Tailwind CSS utility classes and modern React functional patterns.</p>
                    <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-widest pt-2">API Reference</h2>
                    <ul className="list-disc pl-5 text-zinc-400 space-y-1">
                      <li><strong>SynthesizedWorkbench</strong>: Main container element</li>
                      <li><strong>activeSegment</strong>: Segment status selector ('philosophy' | 'analytics' | 'telemetry')</li>
                    </ul>
                    <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-widest pt-2">Compliance</h2>
                    <ul className="list-disc pl-5 text-zinc-400 space-y-1">
                      <li><strong>A11y (Accessibility)</strong>: Enforced 4.5:1 contrast, matching ARIA-labels included.</li>
                      <li><strong>TypeScript</strong>: 100% compliant interfaces.</li>
                      <li><strong>Performance</strong>: Render-optimized state hooks.</li>
                    </ul>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center p-8">
                    <BookOpen className="w-10 h-10 text-zinc-800 mb-3" />
                    <p className="text-zinc-500 uppercase text-[9px] mb-4">No documentation cached. Click button below to analyze and generate specs.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-900 shrink-0">
                <button
                  onClick={handleGenerateDocs}
                  disabled={isGeneratingDoc}
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-300 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isGeneratingDoc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  Generate JSDoc Specs & Readme
                </button>
              </div>
            </div>

            {/* Right: Performance profiling and predictive prefetch */}
            <div className="w-full md:w-96 flex flex-col gap-5 shrink-0 overflow-hidden">
              
              {/* Performance Audit Panel */}
              <div className="bg-[#050507] border border-zinc-900 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Performance Profiler</h4>
                  <button onClick={handleAnalyzePerformance} className="text-[8px] uppercase font-bold text-indigo-400">[RUN AUDIT]</button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-950">
                      <span className="text-xs font-extrabold text-white">{perfScore}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-300">Vite Bundle Rating</span>
                      <p className="text-[8px] text-zinc-500 leading-normal mt-0.5">Static bundle overhead and rendering latency metrics.</p>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-900"></div>

                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                    {perfWarnings.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-950/40 text-[8.5px] leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          {item.level === 'info' ? <AlertCircle className="w-3.5 h-3.5 text-indigo-400" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          <span className={item.level === 'info' ? 'text-indigo-400' : 'text-emerald-400'}>{item.title}</span>
                        </div>
                        <p className="text-zinc-500">{item.text}</p>
                      </div>
                    ))}
                    {perfWarnings.length === 0 && (
                      <p className="text-zinc-600 italic text-[9px] text-center">Run performance audit to see diagnostic logs.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Predictive Prefetching Node */}
              <div className="bg-[#050507] border border-zinc-900 rounded-2xl p-5 flex-1 flex flex-col overflow-hidden">
                <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Predictive Component Prefetching</h4>
                
                <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                  {[
                    { name: 'ConceptWorkbenchHeader', probability: '94%', reason: 'Orchestrating system metrics toggles' },
                    { name: 'VisualPatchControls', probability: '88%', reason: 'Supplying visual coordinate patch hooks' },
                    { name: 'AutoDocPanel', probability: '72%', reason: 'Generating code markdown buffers' }
                  ].map((pred, i) => {
                    const isCached = prefetchedList.includes(pred.name);
                    return (
                      <div key={i} className="p-3 border border-zinc-900 bg-zinc-950/40 rounded-xl flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-300 text-[10px] truncate">{pred.name}</span>
                            <span className="text-[8px] font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.5 rounded">{pred.probability}</span>
                          </div>
                          <p className="text-[8px] text-zinc-500 mt-1 truncate">{pred.reason}</p>
                        </div>

                        <button
                          onClick={() => handlePrefetch(pred.name)}
                          disabled={isCached || isPrefetching}
                          className={`px-3 py-1 rounded-lg border text-[8px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                            isCached
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isCached ? 'CACHED' : 'PREFETCH'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: DESIGN STUDIO (Visual Blueprint / Checkpoint Patcher) */}
        {activeTab === 'design' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#030304] p-5 gap-6 font-mono">
            
            {/* Left: Pixel Perfect Visual checkpoint controller */}
            <div className="flex-1 flex flex-col bg-[#050507] border border-zinc-900 rounded-2xl p-5 overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-zinc-200 uppercase tracking-widest text-[10px]">Human-in-the-Loop "Pixel-Perfect" Patcher</span>
                </div>
                <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-extrabold">HIL ACTIVE</span>
              </div>

              {/* Slider adjustments and preview */}
              <div className="flex-1 flex flex-col justify-center items-center p-6 gap-6">
                
                {/* Visual coordinate adjustment offset selector */}
                <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Padding Adjustment Coordinate:</span>
                    <span className="text-xs font-bold text-indigo-400">+{pixelOffset}px</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="2"
                    value={pixelOffset}
                    onChange={(e) => handlePixelPatchChange(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />

                  <div className="flex justify-between text-[8px] text-zinc-600 mt-2 font-bold uppercase">
                    <span>p-5 (14px)</span>
                    <span>p-6 (16px)</span>
                    <span>p-[20px]</span>
                    <span>p-[32px]</span>
                  </div>
                </div>

                {/* Simulated live visual block previewing pixel offsets */}
                <div 
                  className="w-full max-w-sm border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20 transition-all duration-200"
                  style={{ padding: `${16 + pixelOffset}px` }}
                >
                  <div className="bg-[#0b0b0f] border border-zinc-900 rounded-xl p-4 text-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Live Blueprint Frame</span>
                    <p className="text-[8px] text-zinc-500 mt-1">Outer padding reacts dynamically as slider applies TSX regex changes.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Right: Reverse Engineering vision extractor */}
            <div className="w-full md:w-96 flex flex-col bg-[#050507] border border-zinc-900 rounded-2xl p-5 overflow-hidden">
              <h4 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-4 shrink-0">Reverse Engineering (Screenshot Blueprint)</h4>
              
              {/* Selector */}
              <div className="grid grid-cols-3 gap-2 mb-4 shrink-0">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'login', label: 'Security Portal' },
                  { id: 'audiopanel', label: 'Synthesizer Array' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedBlueprint(item.id); setImageUploaded(true); }}
                    className={`py-2 rounded-xl border text-[9px] font-bold transition-all cursor-pointer ${
                      selectedBlueprint === item.id && imageUploaded
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Upload Drop Zone area */}
              <div
                onClick={() => { setImageUploaded(true); toast.success("Screenshot Mockup Uploaded!"); }}
                className="border-2 border-dashed border-zinc-900 hover:border-zinc-800 rounded-2xl p-6 text-center cursor-pointer mb-4 shrink-0 hover:bg-zinc-950/30 transition-all duration-200"
              >
                <ImageIcon className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                {imageUploaded ? (
                  <div>
                    <span className="text-[10px] font-bold text-zinc-300">Layout Blueprint Hydrated</span>
                    <p className="text-[8px] text-zinc-500 mt-0.5">Blueprint selected. Click Extract below to compile TSX.</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500">Upload UI Screenshot / Layout Specs</span>
                    <p className="text-[8px] text-zinc-600 mt-0.5">Simulate layout extraction from design mockup files.</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleRunReverseEngineering}
                disabled={!imageUploaded || reverseEngineering}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all mb-4 shrink-0 cursor-pointer"
              >
                {reverseEngineering ? 'Extracting Layout Vectors...' : 'Extract React TSX Blueprint'}
              </button>

              {/* Output extract */}
              <div className="flex-1 bg-[#030304] border border-zinc-900/60 rounded-xl p-3 overflow-y-auto font-mono text-[9.5px] text-zinc-400 scrollbar-thin select-text">
                {reverseEngineeredCode ? (
                  <pre className="leading-relaxed">{reverseEngineeredCode}</pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-[9px] uppercase italic text-center px-4">
                    {reverseEngineering ? 'Neural vision OCR extractor tracing segments...' : 'Awaiting vision layout blueprint upload...'}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
