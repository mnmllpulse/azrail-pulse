import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Layers, Palette, Grid, Activity, Sliders, Globe, Zap, Cpu, Circle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';

export default function ArchitectureReport() {
  const { t, language } = useLanguage();
  const { uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';

  const parts = [
    {
      id: 'brand',
      title: '1. Brand Architecture & Design System',
      icon: <Palette className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0B010A] border border-white/10 flex flex-col items-center justify-center h-24">
              <span className="text-white font-mono text-xs mt-2">Deep Space Black</span>
              <span className="text-white/50 font-mono text-[10px]">#0B010A</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0B0412] border border-white/10 flex flex-col items-center justify-center h-24">
              <span className="text-white font-mono text-xs mt-2">Mid-Tone Purple-Gray</span>
              <span className="text-white/50 font-mono text-[10px]">#0B0412</span>
            </div>
            <div className="p-4 rounded-xl bg-[#7B4DFF] border border-white/10 flex flex-col items-center justify-center h-24 shadow-[0_0_15px_#7B4DFF40]">
              <span className="text-white font-mono text-xs mt-2">Pulsar Purple</span>
              <span className="text-white/50 font-mono text-[10px]">#7B4DFF</span>
            </div>
            <div className="p-4 rounded-xl bg-[#3BCCFF] border border-white/10 flex flex-col items-center justify-center h-24 shadow-[0_0_15px_#3BCCFF40]">
              <span className="text-white font-mono text-xs mt-2">Data Blue</span>
              <span className="text-white/50 font-mono text-[10px]">#3BCCFF</span>
            </div>
          </div>
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 flex flex-col gap-2">
            <h4 className="text-sm font-mono text-zinc-400 uppercase">Typography</h4>
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-3xl font-bold font-sans">Space Grotesk</span>
                <span className="text-xs text-zinc-500 font-mono">H1 / 64px / Primary Headings</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-lg font-mono">Fira Code</span>
                <span className="text-xs text-zinc-500 font-mono">Monospace / 14px / Data & Logs</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-base">Cyrillic Sora</span>
                <span className="text-xs text-zinc-500 font-mono">Body / 16px / Descriptions</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'assets',
      title: '2. Core Visual Assets',
      icon: <Layers className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-6 bg-zinc-900/50 rounded-2xl border border-white/5">
            <div className="flex-1 flex flex-col items-center gap-2">
              <Circle className="w-8 h-8 text-zinc-600" />
              <span className="text-xs font-mono uppercase text-zinc-500">Idle State</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <Circle className="w-8 h-8 text-[#7B4DFF] animate-pulse" />
              <span className="text-xs font-mono uppercase text-[#7B4DFF]">Active State</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <Circle className="w-8 h-8 text-[#FF3B3B] animate-bounce" />
              <span className="text-xs font-mono uppercase text-[#FF3B3B]">Alert State</span>
            </div>
          </div>
          <p className="text-sm text-zinc-400">Geometric icon rules: 1.5px stroke width, standardized to 24x24px viewbox. Dynamic color shifting based on system core status.</p>
        </div>
      )
    },
    {
      id: 'layout',
      title: '3. Layout Standards & Component Library',
      icon: <Grid className="w-5 h-5" />,
      content: (
        <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-sm font-mono text-zinc-400 uppercase">16x16 Modular Grid System</h4>
          <p className="text-sm text-zinc-300">Enforced dynamic dark highlights and negative spaces (4px padding rules). Restructured utilizing a modular bento-grid format with 3:1 sizing ratios.</p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">1x1</div>
            <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">1x1</div>
            <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">1x1</div>
            <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500 col-span-2">2x1 Wide</div>
            <div className="h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-500">1x1</div>
          </div>
        </div>
      )
    },
    {
      id: 'animation',
      title: '4. Animation & Interactivity Spec',
      icon: <Activity className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5">
            <h4 className="text-sm font-mono text-zinc-400 uppercase mb-4">"Globe Respiration" Pulse Curve</h4>
            <div className="h-24 flex items-end gap-1 overflow-hidden">
              {[...Array(30)].map((_, i) => {
                const height = 10 + Math.sin(i * 0.4) * 40 + Math.random() * 10;
                return (
                  <motion.div 
                    key={i} 
                    className="flex-1 bg-[#7B4DFF]/50 rounded-t-sm"
                    animate={{ height: [`${height}%`, `${height * 1.5}%`, `${height}%`] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.05 }}
                  />
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-4">Telemetry Stream Flow Animation Rules: Staggered entrance, 300ms duration, spring physics (damping: 20, stiffness: 100).</p>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: '5. System Settings & Configuration Mapping',
      icon: <Sliders className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">AZRAIL Core Sensitivity</span>
            <div className="mt-2 h-2 bg-black rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-[#7B4DFF]"></div>
            </div>
          </div>
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Cloud/Local Processing Ratio</span>
            <div className="mt-2 h-2 bg-black rounded-full overflow-hidden">
              <div className="w-[40%] h-full bg-[#3BCCFF]"></div>
            </div>
          </div>
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Swarm Intelligence Priority</span>
            <div className="mt-2 h-2 bg-black rounded-full overflow-hidden">
              <div className="w-[92%] h-full bg-[#7B4DFF]"></div>
            </div>
          </div>
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Security Threat Alert Level</span>
            <div className="mt-2 h-2 bg-black rounded-full overflow-hidden">
              <div className="w-[15%] h-full bg-[#FF3B3B]"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'telemetry',
      title: '6. Telemetry & Status Visualization Maps',
      icon: <Globe className="w-5 h-5" />,
      content: (
        <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-mono text-zinc-400 uppercase">Global Nodes Validation</h4>
            <span className="text-xs font-mono text-emerald-400">56/56 ONLINE</span>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {[...Array(56)].map((_, i) => (
              <div key={i} className="h-4 bg-emerald-500/20 border border-emerald-500/50 rounded-sm"></div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
            <h4 className="text-sm font-mono text-zinc-400 uppercase">P2P Storage Sync (CRDT)</h4>
            <span className="text-xs font-mono text-[#3BCCFF]">98%</span>
          </div>
        </div>
      )
    },
    {
      id: 'feedback',
      title: '7. Dynamic Feedback Specification',
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Background Color Orchestration (Fluid Gradients & Blur Filters):</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0B0412] to-[#1a1a2e] border border-white/10 flex flex-col gap-1">
              <span className="text-white font-bold text-sm">mnml (Static)</span>
              <span className="text-white/50 font-mono text-[9px] uppercase">Mode: Idle / Standby</span>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-900 to-emerald-900 border border-emerald-500/30 flex flex-col gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="text-white font-bold text-sm">Fluid Sleek</span>
              <span className="text-white/50 font-mono text-[9px] uppercase">Mode: Active Green / Fast Input</span>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-900 to-orange-900 border border-amber-500/30 flex flex-col gap-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <span className="text-white font-bold text-sm">Solar Eclipse</span>
              <span className="text-white/50 font-mono text-[9px] uppercase">Mode: Processing / Refined</span>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#4c1d95] to-[#312e81] border border-indigo-500/30 flex flex-col gap-1 shadow-[0_0_15px_rgba(76,29,149,0.2)]">
              <span className="text-white font-bold text-sm">Cosmic Pulse</span>
              <span className="text-white/50 font-mono text-[9px] uppercase">Mode: Generation / Neural</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`space-y-6 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <div className="p-3 bg-pulse-primary/20 rounded-2xl">
          <Cpu className="w-6 h-6 text-pulse-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider">Architecture Specification</h2>
          <p className="text-xs text-zinc-500 uppercase">MNMLL Pulse OS Dynamic Framework / VER. 4.1</p>
        </div>
      </div>
      
      <div className="space-y-8">
        {parts.map((part, index) => (
          <motion.div 
            key={part.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-black/40 border-white/5'}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-white/5 text-pulse-primary'}`}>
                {part.icon}
              </div>
              <h3 className="text-lg font-bold tracking-wider uppercase">{part.title}</h3>
            </div>
            {part.content}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
