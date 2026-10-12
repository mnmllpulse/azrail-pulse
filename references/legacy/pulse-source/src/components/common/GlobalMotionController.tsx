import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalMotion, MotionPreset } from '../../contexts/GlobalMotionContext';
import { 
  Sliders, 
  Settings, 
  Sparkles, 
  Zap, 
  RotateCcw, 
  Eye, 
  Check, 
  HelpCircle,
  Play,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface GlobalMotionControllerProps {
  isLight?: boolean;
}

export default function GlobalMotionController({ isLight = false }: GlobalMotionControllerProps) {
  const { config, updateConfig, resetConfig, getTransition } = useGlobalMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [playTrigger, setPlayTrigger] = useState(0);

  const presets: { id: MotionPreset; name: string; icon: string; desc: string }[] = [
    { 
      id: 'fluid-sleek', 
      name: 'Fluid Sleek', 
      icon: '🌊', 
      desc: 'Balanced, organic physical movement. The Dark Mnmll standard.' 
    },
    { 
      id: 'snappy-spring', 
      name: 'Snappy Spring', 
      icon: '⚡', 
      desc: 'High tension, energetic response. Ultra-reactive tactile feel.' 
    },
    { 
      id: 'ultra-inertia', 
      name: 'Ultra Inertia', 
      icon: '🪐', 
      desc: 'Heavy, high mass, deeply dampened cinematic glide.' 
    },
    { 
      id: 'minimal-ease', 
      name: 'Minimal Ease', 
      icon: '📐', 
      desc: 'Traditional cubic-bezier ease out. Flat, clean, non-physics.' 
    },
    { 
      id: 'hyper-bounce', 
      name: 'Hyper Bounce', 
      icon: '🎈', 
      desc: 'Over-reactive high frequency spring with multiple elastic rebounds.' 
    },
    { 
      id: 'liquid-elastic', 
      name: 'Liquid Elastic', 
      icon: '🧬', 
      desc: 'Underdamped slinky behavior with heavy stretch factor.' 
    },
    { 
      id: 'magnetic-inertia', 
      name: 'Magnetic Snap', 
      icon: '🧲', 
      desc: 'Ultra-fast snap with zero rebounds, mimicking heavy magnetic force.' 
    },
    { 
      id: 'anti-gravity-glide', 
      name: 'Anti-Gravity', 
      icon: '🛸', 
      desc: 'Low friction weightless drifting feel with slow inertia.' 
    }
  ];

  return (
    <div className="relative z-50">
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 p-3 rounded-full shadow-2xl border flex items-center gap-2 z-50 transition-colors ${
          isOpen
            ? 'bg-rose-500 border-rose-400 text-white'
            : isLight
              ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
              : 'bg-zinc-900/90 border-white/10 text-white hover:bg-zinc-800'
        }`}
        id="global-motion-controller-toggle"
      >
        <Sliders className={`w-4 h-4 ${isOpen ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
        <span className="text-[10px] font-mono tracking-wider font-bold uppercase hidden md:inline">
          {isOpen ? 'CLOSE KINETICS' : 'KINETIC CONTROLLER'}
        </span>
      </motion.button>

      {/* Controller Drawer / Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={getTransition({ type: 'spring', stiffness: 120, damping: 15 })}
            className={`fixed bottom-20 right-6 w-full max-w-[440px] rounded-2xl border p-5 shadow-2xl z-50 max-h-[75vh] overflow-y-auto ${
              isLight
                ? 'bg-white/95 border-gray-200 text-gray-900 backdrop-blur-xl'
                : 'bg-zinc-950/95 border-white/10 text-white backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.8)]'
            }`}
            id="global-motion-controller-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pulse-primary" />
                <h3 className="text-xs font-mono uppercase font-bold tracking-wider">
                  Global Motion Controller
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetConfig}
                  title="Reset to default"
                  className={`p-1 rounded transition-colors ${
                    isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/5 text-zinc-400'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Включить анимации (Enabled)
              </span>
              <button
                onClick={() => updateConfig({ isAnimationsEnabled: !config.isAnimationsEnabled })}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  config.isAnimationsEnabled ? 'bg-pulse-primary' : 'bg-zinc-800'
                }`}
              >
                <motion.div
                  animate={{ x: config.isAnimationsEnabled ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="w-4 h-4 bg-white rounded-full absolute top-0.5"
                />
              </button>
            </div>

            {config.isAnimationsEnabled && (
              <div className="space-y-4">
                {/* Preset Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                    Предустановленные профили (Presets)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => updateConfig({ preset: preset.id })}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                          config.preset === preset.id
                            ? isLight
                              ? 'bg-pulse-primary/10 border-pulse-primary text-gray-900 font-bold'
                              : 'bg-pulse-primary/10 border-pulse-primary text-white font-bold'
                            : isLight
                              ? 'bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-600'
                              : 'bg-white/5 border-white/5 hover:border-white/10 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{preset.icon}</span>
                          <span className="text-[10px] font-mono tracking-tight">{preset.name}</span>
                        </div>
                        <span className="text-[8px] leading-tight text-zinc-500 font-normal">
                          {preset.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fine-Tuning Sliders (Show when not minimal-ease) */}
                {config.preset !== 'minimal-ease' ? (
                  <div className="space-y-3 p-3 rounded-xl border border-white/5 bg-black/20">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5 pb-1 mb-2">
                      Framer Spring Physics Tuner
                    </div>

                    {/* Stiffness */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Stiffness (Жесткость):</span>
                        <span className="text-pulse-accent font-bold">{config.stiffness}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="400"
                        value={config.stiffness}
                        onChange={(e) => updateConfig({ stiffness: Number(e.target.value) })}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                      />
                    </div>

                    {/* Damping */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Damping (Амортизация):</span>
                        <span className="text-pulse-accent font-bold">{config.damping}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="60"
                        value={config.damping}
                        onChange={(e) => updateConfig({ damping: Number(e.target.value) })}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                      />
                    </div>

                    {/* Mass */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Mass (Масса):</span>
                        <span className="text-pulse-accent font-bold">{config.mass.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="4.0"
                        step="0.1"
                        value={config.mass}
                        onChange={(e) => updateConfig({ mass: Number(e.target.value) })}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 rounded-xl border border-white/5 bg-black/20">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5 pb-1 mb-2">
                      Time-Based Duration Tuner
                    </div>

                    {/* Duration */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Duration (Секунды):</span>
                        <span className="text-pulse-accent font-bold">{config.duration.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.5"
                        step="0.05"
                        value={config.duration}
                        onChange={(e) => updateConfig({ duration: Number(e.target.value) })}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Universal Animation Tuning parameters */}
                <div className="space-y-3 p-3 rounded-xl border border-white/5 bg-black/10">
                  {/* Hover Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Hover Scale Multiplier:</span>
                      <span className="text-pulse-accent font-bold">{config.hoverScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.00"
                      max="1.12"
                      step="0.01"
                      value={config.hoverScale}
                      onChange={(e) => updateConfig({ hoverScale: Number(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                    />
                  </div>

                  {/* Entrance Slide Offset */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Entrance Offset (Y):</span>
                      <span className="text-pulse-accent font-bold">{config.entranceY}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.entranceY}
                      onChange={(e) => updateConfig({ entranceY: Number(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                    />
                  </div>

                  {/* Stagger Delay Offset */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Stagger Delay Offset:</span>
                      <span className="text-pulse-accent font-bold">{(config.staggerDelay || 0.05).toFixed(3)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0.010"
                      max="0.300"
                      step="0.005"
                      value={config.staggerDelay || 0.05}
                      onChange={(e) => updateConfig({ staggerDelay: Number(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pulse-primary"
                    />
                  </div>
                </div>

                {/* Real-time Kinetic Test Area */}
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-black/40 border-white/5'}`}>
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                      Interactive Kinetic Sandbox
                    </span>
                    <button
                      onClick={() => setPlayTrigger(prev => prev + 1)}
                      className="text-pulse-primary flex items-center gap-1 hover:text-pulse-accent transition-colors text-[9px] font-mono font-bold"
                    >
                      <Play className="w-3 h-3" />
                      TRIGGER RE-ENTRY
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-3 h-14 overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={`demo-box-${playTrigger}-${config.preset}-${config.stiffness}-${config.damping}-${config.mass}`}
                        initial={{ opacity: 0, scale: 0.2, y: config.entranceY }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.2 }}
                        whileHover={{ scale: config.hoverScale, rotate: 3 }}
                        whileTap={{ scale: 0.95 }}
                        transition={getTransition()}
                        className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pulse-primary to-purple-500 flex items-center justify-center cursor-pointer shadow-lg relative group"
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </motion.div>
                    </AnimatePresence>

                    <motion.div
                      key={`demo-card-${playTrigger}-${config.preset}`}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ y: -4, scale: config.hoverScale }}
                      transition={getTransition()}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-mono select-none"
                    >
                      CARD HOVER TEST
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
