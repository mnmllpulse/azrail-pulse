import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, Cpu, Activity, Zap, Play, Pause, RefreshCcw, Plus, Trash2, 
  Send, Terminal, Network, Sparkles, Shield, Database, Radio, Check, Flame,
  Share2, Download, Layout, MessageSquare, History
} from 'lucide-react';
import VoiceInputButton from '../../components/VoiceInputButton';

// Types for our Swarm Simulator
interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  role: string;
  state: 'idle' | 'communicating' | 'consensus' | 'processing';
  pulse: number;
}

interface SwarmTask {
  id: string;
  name: string;
  status: 'PENDING' | 'ROUTING' | 'CONSENSUS' | 'SUCCESS';
  progress: number;
  x: number;
  y: number;
}

export default function SwarmConfigurationPanel({ isLight }: { isLight?: boolean }) {
  // Swarm Demographics
  const [agentCount, setAgentCount] = useState<number>(12);
  const [modelMix, setModelMix] = useState<'pro' | 'flash' | 'hybrid'>('hybrid');
  
  // Flocking & Communication Parameters
  const [cohesion, setCohesion] = useState<number>(45);
  const [separation, setSeparation] = useState<number>(55);
  const [commRange, setCommRange] = useState<number>(120);
  const [latency, setLatency] = useState<number>(40); // ms
  const [temperature, setTemperature] = useState<number>(0.7);

  // Structural Protocol States
  const [consensusProtocol, setConsensusProtocol] = useState<'byzantine' | 'star' | 'delegate' | 'democratic'>('byzantine');
  const [topology, setTopology] = useState<'mesh' | 'star' | 'ring' | 'hierarchical'>('mesh');

  // Interactive Simulation variables
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeTask, setActiveTask] = useState<SwarmTask | null>(null);
  const [taskInput, setTaskInput] = useState<string>('');
  const [swarmState, setSwarmState] = useState<'IDLE' | 'COMPILING' | 'SYNCED' | 'CONVERGING' | 'RESOLVING'>('SYNCED');
  const [logs, setLogs] = useState<string[]>([
    '🧠 Autonomous swarm core synchronized successfully.',
    '📡 Multi-agent Durable Object initialized on port 3000.',
    '🔗 Peer connection nodes mapped using Byzantine parameters.'
  ]);

  // Real-time calculated telemetry for swarm intelligence states
  const [telemetry, setTelemetry] = useState({
    convergenceRate: 98.2,
    entropy: 0.34,
    activeLinks: 42,
    tokenThroughput: 14200,
    byzantineTrust: 100
  });

  // Refs for tracking slider/protocol changes in the requestAnimationFrame render loop
  const configRef = useRef({
    agentCount,
    cohesion,
    separation,
    commRange,
    consensusProtocol,
    topology,
    temperature,
    isPlaying
  });

  useEffect(() => {
    configRef.current = {
      agentCount,
      cohesion,
      separation,
      commRange,
      consensusProtocol,
      topology,
      temperature,
      isPlaying
    };
  }, [agentCount, cohesion, separation, commRange, consensusProtocol, topology, temperature, isPlaying]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boidsRef = useRef<Boid[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Initialize boids on load or count change
  useEffect(() => {
    const boids: Boid[] = [];
    const roles = ['Coder', 'Critic', 'Architect', 'Auditor', 'Researcher', 'Planner'];
    
    for (let i = 0; i < agentCount; i++) {
      boids.push({
        id: i,
        x: Math.random() * 500 + 50,
        y: Math.random() * 260 + 40,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        role: roles[i % roles.length],
        state: 'idle',
        pulse: Math.random() * Math.PI
      });
    }
    boidsRef.current = boids;
  }, [agentCount]);

  // Swarm physics simulation engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 340;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const runSimulation = () => {
      const cfg = configRef.current;
      if (!cfg.isPlaying) {
        // Redraw static state if paused
        drawSwarm();
        animationFrameId.current = requestAnimationFrame(runSimulation);
        return;
      }

      const boids = boidsRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Master Node coordinates for 'star' layout
      const centerX = width / 2;
      const centerY = height / 2;

      // Update positions
      boids.forEach((boid) => {
        let ax = 0;
        let ay = 0;

        boid.pulse += 0.05;

        // Force variables
        let count = 0;
        let meanX = 0;
        let meanY = 0;
        let meanVx = 0;
        let meanVy = 0;
        let avoidX = 0;
        let avoidY = 0;

        // Boids alignment & separation algorithms
        boids.forEach((other) => {
          if (other.id === boid.id) return;

          const dx = other.x - boid.x;
          const dy = other.y - boid.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Interaction within Communication Range
          if (dist < cfg.commRange) {
            meanX += other.x;
            meanY += other.y;
            meanVx += other.vx;
            meanVy += other.vy;
            count++;

            // Separation behavior
            if (dist < 40) {
              const force = (40 - dist) * (cfg.separation / 100);
              avoidX -= (dx / dist) * force;
              avoidY -= (dy / dist) * force;
            }
          }
        });

        // Apply flocking forces
        if (count > 0) {
          meanX /= count;
          meanY /= count;
          meanVx /= count;
          meanVy /= count;

          // Cohesion force: pull towards center of mass
          const cohX = (meanX - boid.x) * (cfg.cohesion / 10000);
          const cohY = (meanY - boid.y) * (cfg.cohesion / 10000);

          // Alignment force: match velocity vectors
          const alignX = (meanVx - boid.vx) * 0.02;
          const alignY = (meanVy - boid.vy) * 0.02;

          ax += cohX + alignX;
          ay += cohY + alignY;
        }

        ax += avoidX * 0.05;
        ay += avoidY * 0.05;

        // Topology constraints & attractions
        if (cfg.topology === 'star' || cfg.consensusProtocol === 'star') {
          // Attract towards center master node
          const dx = centerX - boid.x;
          const dy = centerY - boid.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 80) {
            ax += (dx / dist) * 0.06;
            ay += (dy / dist) * 0.06;
          }
        } else if (cfg.topology === 'ring') {
          // Attract to circular ring path
          const angle = (boid.id / boids.length) * Math.PI * 2 + (Date.now() / 8000);
          const targetX = centerX + Math.cos(angle) * 110;
          const targetY = centerY + Math.sin(angle) * 110;
          ax += (targetX - boid.x) * 0.04;
          ay += (targetY - boid.y) * 0.04;
        } else if (cfg.topology === 'hierarchical') {
          // Arrange in visual multi-tier columns
          let targetX = centerX;
          let targetY = centerY;
          if (boid.id === 0) {
            targetX = centerX;
            targetY = 60; // Top Leader
          } else if (boid.id <= 3) {
            targetX = centerX - 120 + (boid.id * 80);
            targetY = 150; // Mid tier managers
          } else {
            targetX = centerX - 200 + ((boid.id - 3) * 60);
            targetY = 240; // Workers
          }
          ax += (targetX - boid.x) * 0.05;
          ay += (targetY - boid.y) * 0.05;
        }

        // Active Task pull
        if (activeTask) {
          const dx = activeTask.x - boid.x;
          const dy = activeTask.y - boid.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 15) {
            // Strong attraction to task center
            ax += (dx / dist) * 0.15;
            ay += (dy / dist) * 0.15;
            boid.state = 'processing';
          } else {
            boid.state = 'consensus';
          }
        } else {
          boid.state = boid.pulse % Math.PI > 2.2 ? 'communicating' : 'idle';
        }

        // Apply acceleration & bound speeds
        boid.vx += ax;
        boid.vy += ay;
        const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
        const maxSpeed = activeTask ? 3.5 : 2.0;
        if (speed > maxSpeed) {
          boid.vx = (boid.vx / speed) * maxSpeed;
          boid.vy = (boid.vy / speed) * maxSpeed;
        }

        boid.x += boid.vx;
        boid.y += boid.vy;

        // Border Bounce with damping
        const padding = 20;
        if (boid.x < padding) { boid.x = padding; boid.vx *= -0.5; }
        if (boid.x > width - padding) { boid.x = width - padding; boid.vx *= -0.5; }
        if (boid.y < padding) { boid.y = padding; boid.vy *= -0.5; }
        if (boid.y > height - padding) { boid.y = height - padding; boid.vy *= -0.5; }
      });

      // Draw all boids & links
      drawSwarm();

      animationFrameId.current = requestAnimationFrame(runSimulation);
    };

    const drawSwarm = () => {
      const cfg = configRef.current;
      const boids = boidsRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle background neural nodes grid
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw active task target
      if (activeTask) {
        // Dynamic pulsing ripple
        const pulseRadius = 15 + Math.sin(Date.now() / 150) * 5;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(activeTask.x, activeTask.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(activeTask.x, activeTask.y, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Draw text above task
        ctx.fillStyle = isLight ? '#991B1B' : '#EF4444';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET GOAL PROCESSING', activeTask.x, activeTask.y - pulseRadius - 5);
      }

      // 1. Draw Synaptic Links
      ctx.lineWidth = 0.8;
      let connectedLinks = 0;

      for (let i = 0; i < boids.length; i++) {
        for (let j = i + 1; j < boids.length; j++) {
          const b1 = boids[i];
          const b2 = boids[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let shouldConnect = false;
          let linkColor = isLight ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.12)';

          if (cfg.topology === 'ring') {
            // Ring connection path sequence
            const idDiff = Math.abs(b1.id - b2.id);
            if (idDiff === 1 || idDiff === boids.length - 1) {
              shouldConnect = true;
              linkColor = isLight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)';
            }
          } else if (cfg.topology === 'star' || cfg.consensusProtocol === 'star') {
            // Star connection: connect all nodes to Node-0 (Central Master) or center coordinates
            if (b1.id === 0 || b2.id === 0) {
              shouldConnect = true;
              linkColor = isLight ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.4)';
            }
          } else if (cfg.topology === 'hierarchical') {
            // Hierarchical parent-child linkages
            const isParentChild = 
              (b1.id === 0 && b2.id <= 3 && b2.id > 0) || // Leader to managers
              (b1.id === 1 && b2.id >= 4 && b2.id <= 6) || // Manager-1 to workers
              (b1.id === 2 && b2.id >= 7 && b2.id <= 9) || // Manager-2 to workers
              (b1.id === 3 && b2.id >= 10);                // Manager-3 to workers
            if (isParentChild) {
              shouldConnect = true;
              linkColor = isLight ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.4)';
            }
          } else {
            // Mesh (Dynamic Proximity-Based Links)
            if (dist < cfg.commRange) {
              shouldConnect = true;
              const alpha = (1 - (dist / cfg.commRange)) * 0.35;
              linkColor = isLight ? `rgba(99, 102, 241, ${alpha})` : `rgba(129, 140, 248, ${alpha})`;
            }
          }

          if (shouldConnect) {
            ctx.strokeStyle = linkColor;
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.stroke();
            connectedLinks++;
          }
        }
      }

      // Update active links telemetry outside render loop periodically
      if (Math.random() > 0.95 && connectedLinks !== telemetry.activeLinks) {
        setTelemetry(prev => ({
          ...prev,
          activeLinks: connectedLinks,
          entropy: Math.min(0.99, Math.max(0.12, (cfg.temperature * 0.6) + (cfg.separation / 200) - (connectedLinks / (boids.length * 3)))),
          convergenceRate: Math.min(100, Math.max(70, 100 - (cfg.temperature * 12) + (connectedLinks / 4)))
        }));
      }

      // 2. Draw Agent Nodes
      boids.forEach((boid) => {
        const pulseScale = 1 + Math.sin(boid.pulse) * 0.15;
        const nodeSize = (boid.id === 0 && (cfg.topology === 'star' || cfg.consensusProtocol === 'star') ? 8 : 4.5) * pulseScale;

        // Choose color based on state
        let nodeColor = '#3B82F6'; // Default idle blue
        let glowColor = 'rgba(59, 130, 246, 0.4)';

        if (boid.state === 'processing') {
          nodeColor = '#F59E0B'; // Yellow processing
          glowColor = 'rgba(245, 158, 11, 0.5)';
        } else if (boid.state === 'consensus') {
          nodeColor = '#10B981'; // Green consensus
          glowColor = 'rgba(16, 185, 129, 0.6)';
        } else if (boid.state === 'communicating') {
          nodeColor = '#8B5CF6'; // Purple communicating
          glowColor = 'rgba(139, 92, 246, 0.5)';
        }

        // Star leader branding
        if (boid.id === 0 && (cfg.topology === 'star' || cfg.consensusProtocol === 'star')) {
          nodeColor = '#EC4899'; // Bright pink center master
          glowColor = 'rgba(236, 72, 153, 0.6)';
        }

        // Glow ring
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(boid.x, boid.y, nodeSize * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(boid.x, boid.y, nodeSize, 0, Math.PI * 2);
        ctx.fill();

        // Node labels for descriptive depth
        ctx.fillStyle = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        
        let labelText = `${boid.role}-${boid.id.toString().padStart(2, '0')}`;
        if (boid.id === 0 && (cfg.topology === 'star' || cfg.consensusProtocol === 'star')) {
          labelText = `👑 STAR-MASTER`;
        }
        ctx.fillText(labelText, boid.x + nodeSize + 4, boid.y + 3);
      });
    };

    animationFrameId.current = requestAnimationFrame(runSimulation);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [activeTask, isLight]);

  const [activeTab, setActiveTab] = useState<'simulator' | 'topology' | 'workspace'>('simulator');

  // Handle Injecting custom goals into the autonomous swarm
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    setActiveTask(null);
    setSwarmState('COMPILING');
    
    const newTaskName = taskInput.trim();
    setTaskInput('');

    setLogs(prev => [...prev, `🎯 Dispatched collective goal: "${newTaskName}"`]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: newTaskName,
          systemPrompt: `You are an orchestrator breaking down a goal into subtasks for an AI swarm of ${agentCount} agents. Generate a short list of 3 actionable steps.`,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      const data = await response.json();
      if (response.ok) {
        const steps = data.data.split('\n').filter((l: string) => l.trim());
        setLogs(prev => [...prev, ...steps.map((s: string) => `🤖 ${s}`)]);
      } else {
        setLogs(prev => [...prev, `❌ Orchestrator error: ${data.error}`]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `❌ Orchestrator failed to connect to mothership.`]);
    }

    const canvas = canvasRef.current;
    const targetX = canvas ? canvas.width * 0.6 + (Math.random() * 100 - 50) : 380;
    const targetY = canvas ? canvas.height * 0.5 + (Math.random() * 100 - 50) : 170;

    setActiveTask({
      id: Date.now().toString(),
      name: newTaskName,
      status: 'ROUTING',
      progress: 10,
      x: targetX,
      y: targetY
    });
    setSwarmState('CONVERGING');
    
    setLogs(prev => [...prev, '⚡ Swarm target locked! Autonomous boids initiating convergent execution...']);
  };

  // Step sequencer solver loop for the active task progress
  useEffect(() => {
    if (!activeTask) return;
    if (activeTask.status === 'SUCCESS') return;

    const interval = setInterval(() => {
      setActiveTask(prev => {
        if (!prev) return null;
        const nextProgress = prev.progress + 15;

        if (nextProgress >= 100) {
          clearInterval(interval);
          setSwarmState('SYNCED');
          
          // Complete task notification logs
          const successLogs = [
            `💬 Auditor resolved conflict checkpoints safely.`,
            `✅ Consensus Converged (Agreement Index: ${telemetry.convergenceRate.toFixed(1)}%).`,
            `🏆 Autonomous Swarm completed: "${prev.name}" in ${(latency * 8.5).toFixed(0)}ms.`
          ];
          
          successLogs.forEach((log, i) => {
            setTimeout(() => {
              setLogs(curr => [...curr, log]);
            }, (i + 1) * 200);
          });

          return { ...prev, progress: 100, status: 'SUCCESS' };
        }

        // Inject dynamic step progress updates
        if (nextProgress === 40) {
          setLogs(curr => [...curr, `🧬 Star-master aligning Byzantine consensus thresholds (Confidence: 87.2%).`]);
        } else if (nextProgress === 70) {
          setLogs(curr => [...curr, `💾 Intermediate schemas verified. Writing artifacts to Cloudflare KV.`]);
        }

        return { ...prev, progress: nextProgress };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [activeTask]);

  const clearLogsAndTask = () => {
    setActiveTask(null);
    setSwarmState('SYNCED');
    setLogs([
      '🧠 Autonomous swarm state reset completed.',
      '📡 Synchronized local state with system workspace.'
    ]);
  };

  const handleExportSwarm = () => {
    const config = {
      agentCount,
      modelMix,
      cohesion,
      separation,
      commRange,
      consensusProtocol,
      topology,
      temperature
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swarm-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSwarm = () => {
    const config = {
      agentCount,
      modelMix,
      cohesion,
      separation,
      commRange,
      consensusProtocol,
      topology,
      temperature
    };
    const base64 = btoa(JSON.stringify(config));
    const url = `${window.location.origin}${window.location.pathname}?import_swarm=${base64}`;
    navigator.clipboard.writeText(url);
    setLogs(prev => [...prev, '🔗 Swarm configuration share link copied to clipboard.']);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full h-full">
      
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('simulator')}
            className={`text-xs font-mono uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'simulator' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
          >
            Simulator
          </button>
          <button 
            onClick={() => setActiveTab('topology')}
            className={`text-xs font-mono uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'topology' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
          >
            Topology
          </button>
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`text-xs font-mono uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'workspace' ? (isLight ? 'border-indigo-600 text-indigo-600' : 'border-indigo-400 text-indigo-400') : (isLight ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-white/40 hover:text-white/70')}`}
          >
            Workspace
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareSwarm}
            title="Share Configuration"
            className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExportSwarm}
            title="Export JSON"
            className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'simulator' && (
          <motion.div 
            key="simulator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0"
          >
        
        {/* Left Parameter Panel */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
          <div className={`border rounded-2xl p-4 flex-1 flex flex-col min-h-0 overflow-y-auto ${
            isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'
          }`}>
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-white/5 shrink-0">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Agent Parameters
              </h3>
            </div>

            {/* Demographics Area */}
            <div className="space-y-4 flex-1">
              {/* Agent Count */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    Active Swarm Nodes
                  </label>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {agentCount} Agents
                  </span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="32" 
                  value={agentCount} 
                  onChange={(e) => setAgentCount(Number(e.target.value))}
                  className="w-full h-1 bg-indigo-500/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Model Mix */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                  Model Resource Mix
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['pro', 'flash', 'hybrid'] as const).map(mix => (
                    <button
                      key={mix}
                      onClick={() => {
                        setModelMix(mix);
                        setLogs(prev => [...prev, `⚙️ Resource mix adjusted to [${mix.toUpperCase()}].`]);
                      }}
                      className={`py-1 rounded text-[9px] font-mono uppercase border transition-colors ${
                        modelMix === mix 
                          ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-400 font-bold'
                          : (isLight ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10')
                      }`}
                    >
                      {mix}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`h-px w-full my-1 ${isLight ? 'bg-gray-150' : 'bg-white/5'}`}></div>

              {/* Cognitive Temperature */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    Cognitive Heat (Temp)
                  </label>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.5" 
                  step="0.1"
                  value={temperature} 
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-1 bg-indigo-500/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Communication Range */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    Proximity Range (px)
                  </label>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {commRange}px
                  </span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="250" 
                  value={commRange} 
                  onChange={(e) => setCommRange(Number(e.target.value))}
                  className="w-full h-1 bg-indigo-500/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Flocking Cohesion */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    Flocking Cohesion (Group)
                  </label>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {cohesion}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="90" 
                  value={cohesion} 
                  onChange={(e) => setCohesion(Number(e.target.value))}
                  className="w-full h-1 bg-indigo-500/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Separation Force */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    Separation Buffer (Anti-Coll)
                  </label>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {separation}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="90" 
                  value={separation} 
                  onChange={(e) => setSeparation(Number(e.target.value))}
                  className="w-full h-1 bg-indigo-500/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className={`h-px w-full my-1 ${isLight ? 'bg-gray-150' : 'bg-white/5'}`}></div>

              {/* Consensus Protocol Selector */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                  Consensus Protocol
                </label>
                <select
                  value={consensusProtocol}
                  onChange={(e) => {
                    const next = e.target.value as any;
                    setConsensusProtocol(next);
                    setLogs(prev => [...prev, `🔄 Switched consensus standard to [${next.toUpperCase()}].`]);
                  }}
                  className={`border rounded-xl p-2.5 text-xs outline-none transition-colors font-mono ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-white focus:border-indigo-500/50'
                  }`}
                >
                  <option value="byzantine">Byzantine Fault Tolerant</option>
                  <option value="star">Star Master Consensus</option>
                  <option value="delegate">Delegated Authority</option>
                  <option value="democratic">Democratic Voting</option>
                </select>
              </div>

              {/* Task Partitioning Topology Selector */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                  Orchestration Topology
                </label>
                <select
                  value={topology}
                  onChange={(e) => {
                    const next = e.target.value as any;
                    setTopology(next);
                    setLogs(prev => [...prev, `🔄 Re-mapped communication topology to [${next.toUpperCase()}].`]);
                  }}
                  className={`border rounded-xl p-2.5 text-xs outline-none transition-colors font-mono ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-white focus:border-indigo-500/50'
                  }`}
                >
                  <option value="mesh">Dynamic Mesh Graph</option>
                  <option value="star">Centralized Hub-Spoke</option>
                  <option value="ring">Token Ring Protocol</option>
                  <option value="hierarchical">Tree-Tier Hierarchy</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Simulation & Telemetry Panel */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            
            {/* Main Simulation Viewport */}
            <div className={`relative flex-1 border rounded-3xl overflow-hidden group ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5 shadow-inner'
            }`}>
              
              {/* Canvas Engine */}
              <canvas 
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
              />

              {/* Overlay HUD - Swarm Status */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className={`px-3 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 ${
                  isLight ? 'bg-white/80 border-gray-200 text-gray-900 shadow-sm' : 'bg-black/40 border-white/10 text-white shadow-xl'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                    Swarm Status: {swarmState}
                  </span>
                </div>
              </div>

              {/* Play/Pause Control Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button 
                  onClick={() => {
                    setLogs(prev => [...prev, '🔄 Swarm physical state recalculated.']);
                    // Force re-randomize boids
                    const boids = [...boidsRef.current];
                    boids.forEach(b => {
                      b.x = Math.random() * 500 + 50;
                      b.y = Math.random() * 260 + 40;
                    });
                    boidsRef.current = boids;
                  }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Top-Right Telemetry Badges */}
              <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                <div className={`px-2 py-1 rounded-md text-[9px] font-mono border backdrop-blur-sm ${
                  isLight ? 'bg-gray-50/80 border-gray-200 text-gray-600' : 'bg-black/60 border-white/10 text-white/50'
                }`}>
                  LATENCY: {latency}ms
                </div>
                <div className={`px-2 py-1 rounded-md text-[9px] font-mono border backdrop-blur-sm ${
                  isLight ? 'bg-gray-50/80 border-gray-200 text-gray-600' : 'bg-black/60 border-white/10 text-white/50'
                }`}>
                  FPS: 60.0
                </div>
              </div>
            </div>

            {/* Bottom Real-time Telemetry Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
              <TelemetryIndicator 
                icon={<Activity className="w-3 h-3 text-indigo-400" />}
                label="Convergence"
                value={`${telemetry.convergenceRate.toFixed(1)}%`}
                desc="Agreement rate"
                isLight={isLight}
              />
              <TelemetryIndicator 
                icon={<Flame className="w-3 h-3 text-rose-400" />}
                label="Entropy"
                value={telemetry.entropy.toFixed(3)}
                desc="System disorder"
                isLight={isLight}
              />
              <TelemetryIndicator 
                icon={<Network className="w-3 h-3 text-emerald-400" />}
                label="Active Links"
                value={telemetry.activeLinks.toString()}
                desc="P2P Mesh nodes"
                isLight={isLight}
              />
              <TelemetryIndicator 
                icon={<Zap className="w-3 h-3 text-amber-400" />}
                label="Throughput"
                value={`${(telemetry.tokenThroughput / 1000).toFixed(1)}k/s`}
                desc="Tokens per sec"
                isLight={isLight}
              />
              <TelemetryIndicator 
                icon={<Shield className="w-3 h-3 text-cyan-400" />}
                label="BFT Trust"
                value={`${telemetry.byzantineTrust}%`}
                desc="Consensus safety"
                isLight={isLight}
              />
            </div>

          </div>
        </motion.div>
      )}

        {activeTab === 'topology' && (
          <motion.div 
            key="topology"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex-1 border rounded-2xl p-8 flex flex-col items-center justify-center text-center ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}
          >
            <div className={`p-4 rounded-full mb-6 ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <Network className="w-12 h-12" />
            </div>
            <h3 className={`text-xl font-medium mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Swarm Topology Designer</h3>
            <p className={`max-w-md text-sm mb-8 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
              Design complex multi-agent communication structures. Map information flows and consensus boundaries.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
               <TopologyCard icon={<Network />} label="Mesh Network" desc="Fully decentralized P2P links" isLight={isLight} />
               <TopologyCard icon={<Layout />} label="Hierarchical" desc="Tree-based command structure" isLight={isLight} />
               <TopologyCard icon={<Database />} label="Shared Memory" desc="Agents sync via centralized KV" isLight={isLight} />
               <TopologyCard icon={<Radio />} label="Broadcasting" desc="One-to-many event stream" isLight={isLight} />
            </div>
          </motion.div>
        )}

        {activeTab === 'workspace' && (
          <motion.div 
            key="workspace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex-1 border rounded-2xl p-8 flex flex-col ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className={`text-xl font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Collective Workspace</h3>
                <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Live synchronization of agent artifacts and shared state.</p>
              </div>
              <div className="flex gap-2">
                 <button className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${isLight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}>
                   Create Artifact
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span className={`text-xs font-mono font-bold uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>Recent Artifacts</span>
                  </div>
                  <div className="space-y-2">
                    <ArtifactItem label="database_schema.sql" time="2m ago" />
                    <ArtifactItem label="system_audit_report.md" time="15m ago" />
                    <ArtifactItem label="ui_mockup_v2.png" time="1h ago" />
                  </div>
               </div>
               <div className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className={`text-xs font-mono font-bold uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>Sync Status</span>
                  </div>
                  <div className="space-y-3">
                    <SyncStatus agent="Architect" status="idle" />
                    <SyncStatus agent="Auditor" status="writing" />
                    <SyncStatus agent="Planner" status="idle" />
                  </div>
               </div>
               <div className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className={`text-xs font-mono font-bold uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>Security Context</span>
                  </div>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="flex justify-between uppercase"><span>TLS 1.3</span><span className="text-emerald-400">ACTIVE</span></div>
                    <div className="flex justify-between uppercase"><span>BYZANTINE</span><span className="text-emerald-400">SYNCED</span></div>
                    <div className="flex justify-between uppercase"><span>WAF</span><span className="text-emerald-400">ENABLED</span></div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Console Logging Panel & Task Dispatcher */}
      <div className={`h-52 border rounded-2xl p-4 flex flex-col shrink-0 overflow-hidden ${
        isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'
      }`}>
        
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className={`text-xs font-mono tracking-widest uppercase flex items-center gap-2 ${isLight ? 'text-gray-700' : 'text-white/60'}`}>
            <Terminal className="w-4 h-4 text-indigo-500" />
            Consensus Logs & Event Dispatcher
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={clearLogsAndTask}
              className={`px-3 py-1 text-[10px] font-mono uppercase rounded border transition-colors ${
                isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'
              }`}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Input form + log panels layout */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          
          {/* Dispatch Form */}
          <div className="w-full md:w-80 shrink-0 flex flex-col">
            <form onSubmit={handleTaskSubmit} className="flex flex-col gap-2 flex-1 justify-center">
              <label className={`text-[9px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                Dispatch Swarm Task
              </label>
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="e.g. Generate Relational Database Schema..."
                  className={`w-full border rounded-xl p-3 pr-12 text-xs outline-none transition-colors font-mono ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'
                  }`}
                />
                <div className="absolute right-2 z-10">
                  <VoiceInputButton value={taskInput} onChange={setTaskInput} isLight={isLight} size="sm" />
                </div>
              </div>
              <button
                type="submit"
                disabled={!taskInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl py-2.5 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-3 h-3" /> Dispatch Stimulus
              </button>
            </form>
          </div>

          <div className={`hidden md:block w-px h-full ${isLight ? 'bg-gray-200' : 'bg-white/5'}`}></div>

          {/* Scrolling Terminal Output logs */}
          <div className={`flex-1 rounded-xl border p-3 font-mono text-[9px] overflow-y-auto ${
            isLight ? 'bg-gray-50 border-gray-150 text-gray-600' : 'bg-black/50 border-white/5 text-[#A0A0A0]'
          }`}>
            <div className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {logs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-1.5"
                  >
                    <span className="text-indigo-400 shrink-0">›</span>
                    <span className="leading-relaxed whitespace-pre-wrap">{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

function TelemetryIndicator({ 
  icon, 
  label, 
  value, 
  desc, 
  isLight 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  desc: string; 
  isLight?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-3 flex flex-col justify-between ${
      isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'
    }`}>
      <div className="flex items-center gap-2 mb-1 shrink-0">
        {icon}
        <span className={`text-[8px] uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
          {label}
        </span>
      </div>
      <div>
        <div className={`text-sm font-bold truncate ${isLight ? 'text-gray-900' : 'text-[#f0f0f0]'}`}>
          {value}
        </div>
        <div className={`text-[8px] leading-tight truncate ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
          {desc}
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

function TopologyCard({ icon, label, desc, isLight }: any) {
  return (
    <div className={`p-4 rounded-xl border text-left flex items-start gap-3 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
       <div className="text-indigo-400 mt-1">{React.cloneElement(icon, { className: 'w-5 h-5' })}</div>
       <div>
         <div className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{label}</div>
         <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{desc}</div>
       </div>
    </div>
  );
}

function ArtifactItem({ label, time }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <span className="text-[11px] text-indigo-400 hover:underline">{label}</span>
      <span className="text-[9px] opacity-30">{time}</span>
    </div>
  );
}

function SyncStatus({ agent, status }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] opacity-70">{agent}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'writing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
        <span className="text-[9px] uppercase tracking-wider opacity-40">{status}</span>
      </div>
    </div>
  );
}
