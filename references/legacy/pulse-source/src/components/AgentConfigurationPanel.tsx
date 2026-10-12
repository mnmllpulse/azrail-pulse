import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, Shield, AlertCircle, Network, Cpu, SlidersHorizontal, Check, HelpCircle,
  Zap, Leaf, Scale, UserCheck, Sparkles
} from 'lucide-react';
import SwarmStatusIndicator from './SwarmStatusIndicator';

interface AgentConfig {
  autonomyLevel: 'low' | 'medium' | 'high' | 'full';
  taskPriority: 'low' | 'medium' | 'high' | 'critical';
  swarmId: string;
}

export default function AgentConfigurationPanel({ 
  isLight, 
  onSaveConfig 
}: { 
  isLight?: boolean;
  onSaveConfig?: (config: AgentConfig) => void;
}) {
  const [autonomyLevel, setAutonomyLevel] = useState<'low' | 'medium' | 'high' | 'full'>('high');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [swarmId, setSwarmId] = useState<string>('SWARM-B-42');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('balanced');

  const presets = [
    {
      id: 'high-perf',
      name: 'High-Performance',
      icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
      autonomyLevel: 'full' as const,
      taskPriority: 'critical' as const,
      desc: 'Maximum throughput and speed'
    },
    {
      id: 'balanced',
      name: 'Balanced Dynamic',
      icon: <Scale className="w-3.5 h-3.5 text-indigo-500" />,
      autonomyLevel: 'high' as const,
      taskPriority: 'high' as const,
      desc: 'Optimal autonomy and speed balance'
    },
    {
      id: 'energy-efficient',
      name: 'Energy-Efficient',
      icon: <Leaf className="w-3.5 h-3.5 text-emerald-500" />,
      autonomyLevel: 'medium' as const,
      taskPriority: 'low' as const,
      desc: 'Throttled node activity and usage'
    },
    {
      id: 'human-oversight',
      name: 'Human-in-the-Loop',
      icon: <UserCheck className="w-3.5 h-3.5 text-blue-500" />,
      autonomyLevel: 'low' as const,
      taskPriority: 'medium' as const,
      desc: 'Strict validations and human checks'
    }
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setAutonomyLevel(preset.autonomyLevel);
    setTaskPriority(preset.taskPriority);
    setActivePreset(preset.id);
  };

  const handleSelectAutonomy = (level: 'low' | 'medium' | 'high' | 'full') => {
    setAutonomyLevel(level);
    const matched = presets.find(p => p.autonomyLevel === level && p.taskPriority === taskPriority);
    setActivePreset(matched ? matched.id : null);
  };

  const handleSelectPriority = (priority: 'low' | 'medium' | 'high' | 'critical') => {
    setTaskPriority(priority);
    const matched = presets.find(p => p.autonomyLevel === autonomyLevel && p.taskPriority === priority);
    setActivePreset(matched ? matched.id : null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveConfig) {
      onSaveConfig({ autonomyLevel, taskPriority, swarmId });
    }
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 3000);
  };

  const autonomyOptions = [
    { value: 'low', label: 'Low', desc: 'Strict human oversight & verification' },
    { value: 'medium', label: 'Medium', desc: 'Proactive with confirmation prompts' },
    { value: 'high', label: 'High', desc: 'Autonomous within pre-allocated budget' },
    { value: 'full', label: 'Full', desc: 'Self-coordinating swarm intelligence state' }
  ] as const;

  const priorityColors = {
    low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  };

  return (
    <div className={`border rounded-2xl p-5 flex flex-col relative overflow-hidden ${
      isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'
    }`}>
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Agent Customizer Configuration
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/5 border border-indigo-500/10">
          <Cpu className="w-3 h-3 text-indigo-400" />
          <span className="text-[8px] font-mono uppercase text-indigo-400 font-semibold">Orchestrator Node</span>
        </div>
      </div>

      <div className="mb-4">
        <SwarmStatusIndicator isLight={isLight} />
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Target Swarm ID Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 ${
              isLight ? 'text-gray-500' : 'text-white/40'
            }`}>
              <Network className="w-3.5 h-3.5 text-indigo-500" />
              Target Swarm Channel ID
            </label>
            <span className="text-[9px] font-mono text-gray-400">Byzantine Mapping Room</span>
          </div>
          <div className="relative">
            <input 
              type="text"
              value={swarmId}
              onChange={(e) => setSwarmId(e.target.value.toUpperCase())}
              placeholder="e.g. SWARM-B-42"
              className={`w-full border rounded-xl p-3 text-xs outline-none transition-colors font-mono tracking-wider ${
                isLight ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] focus:border-indigo-500/50'
              }`}
              required
            />
          </div>
        </div>

        {/* Swarm Behavior Preset Selector */}
        <div className="flex flex-col gap-2">
          <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 ${
            isLight ? 'text-gray-500' : 'text-white/40'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            Swarm Behavior Preset
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`border rounded-xl p-3 text-left transition-all duration-300 flex items-start gap-2.5 relative overflow-hidden ${
                    isActive 
                      ? (isLight 
                          ? 'bg-indigo-50 border-indigo-500 shadow-sm shadow-indigo-100' 
                          : 'bg-indigo-500/10 border-indigo-500/40 text-white') 
                      : (isLight ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-[#0a0a0a]/60 border-white/5 text-white/50 hover:bg-white/5')
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400' : (isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-white/40')
                  }`}>
                    {preset.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                        isActive ? 'text-indigo-500 dark:text-indigo-400' : (isLight ? 'text-gray-900' : 'text-white/75')
                      }`}>
                        {preset.name}
                      </span>
                      {isActive && (
                        <span className="text-[7px] font-mono uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-1 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className={`text-[8px] leading-tight mt-0.5 ${isLight ? 'text-gray-500' : 'text-white/30'}`}>
                      {preset.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Autonomy Level Custom Buttons Selection */}
        <div className="flex flex-col gap-1.5">
          <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 ${
            isLight ? 'text-gray-500' : 'text-white/40'
          }`}>
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            Agent Autonomy Level
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {autonomyOptions.map((opt) => {
              const active = autonomyLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectAutonomy(opt.value)}
                  className={`border rounded-xl p-3 text-left transition-all duration-300 flex flex-col gap-1 relative overflow-hidden group ${
                    active 
                      ? (isLight 
                          ? 'bg-indigo-50 border-indigo-500/50 shadow-sm shadow-indigo-100' 
                          : 'bg-indigo-500/10 border-indigo-500/40 text-white') 
                      : (isLight ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-[#0a0a0a]/60 border-white/5 text-white/50 hover:bg-white/5')
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                      active ? 'text-indigo-500 dark:text-indigo-400' : (isLight ? 'text-gray-900' : 'text-white/75')
                    }`}>
                      {opt.label} Autonomy
                    </span>
                    {active && (
                      <motion.div layoutId="activeAutonomyBadge" className="bg-indigo-500 text-white rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </motion.div>
                    )}
                  </div>
                  <span className={`text-[8px] leading-snug ${isLight ? 'text-gray-500' : 'text-white/30'}`}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Priority Slider/Selection */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 ${
              isLight ? 'text-gray-500' : 'text-white/40'
            }`}>
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              Swarm Execution Priority
            </label>
            <span className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[taskPriority]}`}>
              {taskPriority} PRIORITY
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['low', 'medium', 'high', 'critical'] as const).map((pri) => {
              const active = taskPriority === pri;
              return (
                <button
                  key={pri}
                  type="button"
                  onClick={() => handleSelectPriority(pri)}
                  className={`py-1.5 rounded-lg text-[9px] font-mono uppercase border transition-all duration-200 ${
                    active 
                      ? 'bg-indigo-600 text-white border-transparent shadow-sm' 
                      : (isLight ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                  }`}
                >
                  {pri}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dispatch Controls */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-start gap-2 max-w-[65%]">
            <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isLight ? 'text-gray-400' : 'text-white/30'}`} />
            <p className={`text-[8px] leading-normal font-mono ${isLight ? 'text-gray-500' : 'text-white/30'}`}>
              Changes are immediately synchronized to the Active Swarm session using Cloudflare Durable Objects.
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all duration-200"
          >
            Apply Config
          </button>
        </div>
      </form>

      {/* Floating Save Alert */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-4 left-4 right-4 bg-emerald-500 text-white px-3 py-2 rounded-xl text-[10px] font-mono flex items-center justify-between shadow-lg z-30"
          >
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>Durable parameters updated for {swarmId}!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
