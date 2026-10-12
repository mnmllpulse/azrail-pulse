import React from 'react';
import { Palette, Type, Box, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DesignSystemExplorerProps {
  t: (en: string, ru?: string) => string;
}

export function DesignSystemExplorer({ t }: DesignSystemExplorerProps) {
  const colors = [
    { name: 'Primary Emerald', value: '#10b981', tailwind: 'emerald-500' },
    { name: 'Core Indigo', value: '#6366f1', tailwind: 'indigo-500' },
    { name: 'Amber Glow', value: '#f59e0b', tailwind: 'amber-500' },
    { name: 'Dark Void', value: '#000000', tailwind: 'black' },
    { name: 'Zinc Deep', value: '#18181b', tailwind: 'zinc-900' },
    { name: 'Slate Calm', value: '#334155', tailwind: 'slate-700' },
  ];

  const typography = [
    { name: 'Display Lg', size: '36px', weight: '700', tracking: '-0.025em' },
    { name: 'Title Md', size: '20px', weight: '600', tracking: '-0.01em' },
    { name: 'Body Regular', size: '14px', weight: '400', tracking: '0' },
    { name: 'Caption Mono', size: '10px', weight: '500', tracking: '0.05em', mono: true },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied to clipboard');
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          {t('Design System Explorer', 'Проводник Дизайн-Системы')}
        </h5>
      </div>

      <div className="space-y-6 pb-4">
        {/* Color Palette */}
        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Core Color Palette</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colors.map((color) => (
              <div key={color.name} className="group relative">
                <div 
                  className="w-full h-16 rounded-xl border border-white/10 mb-2 transition-transform group-hover:scale-[1.02]"
                  style={{ backgroundColor: color.value }}
                />
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-zinc-200">{color.name}</div>
                  <div className="text-[8px] font-mono text-zinc-500 uppercase flex items-center justify-between">
                    <span>{color.value}</span>
                    <button 
                      onClick={() => copyToClipboard(color.tailwind)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-emerald-400"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">Typography Scales</label>
          <div className="space-y-3">
            {typography.map((type) => (
              <div key={type.name} className="p-3 rounded-xl bg-white/3 border border-white/5 group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">{type.name}</div>
                  <button 
                    onClick={() => copyToClipboard(`font-bold text-[${type.size}] tracking-tight`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-emerald-400 text-zinc-500"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className={`text-white transition-all ${type.mono ? 'font-mono' : 'font-sans'}`} style={{ fontSize: type.size, fontWeight: type.weight, letterSpacing: type.tracking }}>
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Component Variants */}
        <div className="space-y-3">
          <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest block">UI Component Presets</label>
          <div className="grid grid-cols-1 gap-2">
            {['Glass Card', 'Neon Button', 'Neural Input', 'Elite Badge'].map(variant => (
              <div key={variant} className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Box className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase">{variant}</span>
                </div>
                <button className="text-[8px] font-mono text-zinc-600 hover:text-emerald-400 uppercase tracking-widest">Copy JSX</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
