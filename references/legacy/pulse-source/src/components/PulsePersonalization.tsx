import React from 'react';
import { motion } from 'motion/react';
import { useSystemState } from '../contexts/SystemStateContext';
import { X, RefreshCw, Palette } from 'lucide-react';

interface PulsePersonalizationProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { name: 'Classic Pulse', primary: '#7B4DFF', accent: '#B388FF' },
  { name: 'Neon Cyber', primary: '#00F2FF', accent: '#0066FF' },
  { name: 'Solar Flare', primary: '#FFB800', accent: '#FF4D00' },
  { name: 'Emerald Wave', primary: '#00FF94', accent: '#00B368' },
  { name: 'Crimson Void', primary: '#FF004D', accent: '#99002E' },
  { name: 'Ghost Monochrome', primary: '#FFFFFF', accent: '#8E8E93' },
];

export const PulsePersonalization: React.FC<PulsePersonalizationProps> = ({ isOpen, onClose }) => {
  const { uiPreferences, setUIPreferences } = useSystemState();

  if (!isOpen) return null;

  const updatePrimary = (color: string) => {
    setUIPreferences({ ...uiPreferences, pulsePrimary: color });
  };

  const updateAccent = (color: string) => {
    setUIPreferences({ ...uiPreferences, pulseAccent: color });
  };

  const resetColors = () => {
    setUIPreferences({ 
      ...uiPreferences, 
      pulsePrimary: '#7B4DFF', 
      pulseAccent: '#B388FF' 
    });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setUIPreferences({ 
      ...uiPreferences, 
      pulsePrimary: preset.primary, 
      pulseAccent: preset.accent 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-depth-space/80 backdrop-blur-xl"
    >
      <div className="w-full max-w-md bg-depth-nebula border border-pulse-primary/20 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pulse-primary/10 rounded-lg">
              <Palette className="w-5 h-5 text-pulse-primary" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Pulse Personalization</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Live Preview Sample */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Live Preview</label>
            <div className="h-24 rounded-2xl border border-white/5 relative overflow-hidden bg-depth-void flex items-center justify-center">
               <div className="absolute inset-0 liquid-mesh-fallback opacity-20" />
               <div className="relative z-10 flex flex-col items-center gap-2">
                 <div className="px-4 py-1 rounded-full bg-pulse-primary text-[10px] font-bold text-white uppercase tracking-tighter">
                   Primary Element
                 </div>
                 <div className="text-[10px] text-pulse-accent font-mono">
                   Accent Telemetry Active
                 </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Primary Color</label>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <input 
                  type="color" 
                  value={uiPreferences.pulsePrimary} 
                  onChange={(e) => updatePrimary(e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                />
                <span className="text-sm font-mono text-white/80">{uiPreferences.pulsePrimary.toUpperCase()}</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Accent Color</label>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <input 
                  type="color" 
                  value={uiPreferences.pulseAccent} 
                  onChange={(e) => updateAccent(e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                />
                <span className="text-sm font-mono text-white/80">{uiPreferences.pulseAccent.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/80 uppercase tracking-widest">CRT Cinematic Overlay</label>
                <p className="text-[10px] text-white/40">Apply scanlines and chromatic filters</p>
              </div>
              <button 
                onClick={() => setUIPreferences({ ...uiPreferences, crtEffect: !uiPreferences.crtEffect })}
                className={`w-12 h-6 rounded-full transition-all relative ${uiPreferences.crtEffect ? 'bg-pulse-primary' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${uiPreferences.crtEffect ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">System Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="group flex items-center gap-3 p-2 bg-white/5 hover:bg-pulse-primary/10 border border-white/5 rounded-xl transition-all text-left"
                >
                  <div className="flex -space-x-2">
                    <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: preset.primary }} />
                    <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: preset.accent }} />
                  </div>
                  <span className="text-xs text-white/60 group-hover:text-pulse-primary transition-colors">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 flex items-center justify-between">
          <button 
            onClick={resetColors}
            className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/80 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reset to Factory Defaults
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-pulse-primary text-white rounded-full text-sm font-semibold hover:bg-pulse-deep transition-all shadow-lg shadow-pulse-primary/20"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
};
