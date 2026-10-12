import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Terminal, 
  LayoutGrid, 
  Sparkles, 
  Image as ImageIcon, 
  MessageSquare, 
  CreditCard, 
  Cpu, 
  RefreshCw, 
  Sun, 
  Moon,
  Download,
  Palette
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  shortcut: string;
  category: 'Navigation' | 'System';
  action: () => void;
  icon: React.ReactNode;
}

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  isLight, 
  setIsLight,
  triggerDiagnostics,
  triggerPulseWave,
  exportSystemLogs,
  onOpenPersonalization
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  isLight: boolean;
  setIsLight: (light: boolean) => void;
  triggerDiagnostics: () => void;
  triggerPulseWave: () => void;
  exportSystemLogs: () => Promise<void>;
  onOpenPersonalization: () => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'dash',
      title: 'Go to Dashboard',
      shortcut: '⌥ D',
      category: 'Navigation',
      action: () => { navigate('/dashboard'); onClose(); },
      icon: <LayoutGrid className="w-4 h-4 text-indigo-400" />
    },
    {
      id: 'studio-web',
      title: 'Open Web Studio',
      shortcut: '⌥ S',
      category: 'Navigation',
      action: () => { navigate('/studio/web'); onClose(); },
      icon: <Sparkles className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'gallery',
      title: 'Open Gallery',
      shortcut: '⌥ G',
      category: 'Navigation',
      action: () => { navigate('/gallery'); onClose(); },
      icon: <ImageIcon className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'swarm',
      title: 'Open Swarm Chat',
      shortcut: '⌥ C',
      category: 'Navigation',
      action: () => { navigate('/swarm-chat'); onClose(); },
      icon: <MessageSquare className="w-4 h-4 text-purple-400" />
    },
    {
      id: 'billing',
      title: 'Billing & Subscriptions',
      shortcut: '⌥ B',
      category: 'Navigation',
      action: () => { navigate('/studio/billing'); onClose(); },
      icon: <CreditCard className="w-4 h-4 text-orange-400" />
    },
    {
      id: 'diag',
      title: 'Trigger Core Diagnostics',
      shortcut: '⌥ X',
      category: 'System',
      action: () => { triggerDiagnostics(); onClose(); },
      icon: <Cpu className="w-4 h-4 text-red-400" />
    },
    {
      id: 'pulse',
      title: 'Trigger Quantum Pulse Wave',
      shortcut: '⌥ P',
      category: 'System',
      action: () => { triggerPulseWave(); onClose(); },
      icon: <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
    },
    {
      id: 'theme',
      title: `Toggle Theme (${isLight ? 'Dark' : 'Light'})`,
      shortcut: '⌥ T',
      category: 'System',
      action: () => { setIsLight(!isLight); onClose(); },
      icon: isLight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-400" />
    },
    {
      id: 'export-logs',
      title: 'Export System Logs',
      shortcut: '⌥ L',
      category: 'System',
      action: () => { exportSystemLogs(); onClose(); },
      icon: <Download className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'toggle-sidebar',
      title: 'Toggle Sidebar',
      shortcut: '⌘ B',
      category: 'System',
      action: () => { /* Handled by global manager */ onClose(); },
      icon: <LayoutGrid className="w-4 h-4 text-slate-400" />
    },
    {
      id: 'pulse-themes',
      title: 'Pulse Themes',
      shortcut: '⌥ ⇧ P',
      category: 'System',
      action: () => { onOpenPersonalization(); onClose(); },
      icon: <Palette className="w-4 h-4 text-purple-400" />
    }
  ];

  // Filter commands by search string
  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) || 
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keep index in range
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Autofocus input when command palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSearch('');
    }
  }, [isOpen]);

  // Keyboard navigation inside the palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 select-none">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-xl rounded-2xl border shadow-[0_0_50px_rgba(123,77,255,0.15)] overflow-hidden flex flex-col ${
              isLight ? 'bg-white border-gray-200' : 'bg-[#0F0F13] border-pulse-primary/30'
            }`}
          >
            {/* Search Input bar */}
            <div className={`flex items-center px-4 py-3 border-b ${
              isLight ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-white/[0.01]'
            }`}>
              <Search className={`w-4 h-4 mr-3 shrink-0 ${isLight ? 'text-gray-400' : 'text-white/30'}`} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or route to navigate..."
                className={`w-full bg-transparent text-sm font-mono border-none outline-none ${
                  isLight ? 'text-gray-800 placeholder-gray-400' : 'text-white placeholder-white/30'
                }`}
              />
              <span className={`text-[9px] font-mono font-bold uppercase tracking-widest border rounded px-1.5 py-0.5 shrink-0 ${
                isLight ? 'bg-white text-gray-500 border-gray-200' : 'bg-white/5 text-white/40 border-white/10'
              }`}>
                ESC TO CLOSE
              </span>
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto p-2 space-y-0.5 hide-scrollbar">
              {filtered.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 gap-2 text-xs font-mono uppercase tracking-widest ${
                  isLight ? 'text-gray-400' : 'text-white/30'
                }`}>
                  <Terminal className="w-5 h-5 opacity-40 animate-pulse" />
                  <span>No Neural Paths Found</span>
                </div>
              ) : (
                Object.entries(
                  filtered.reduce((groups, item) => {
                    if (!groups[item.category]) groups[item.category] = [];
                    groups[item.category].push(item);
                    return groups;
                  }, {} as Record<string, CommandItem[]>)
                ).map(([category, items]) => (
                  <div key={category}>
                    {/* Category label */}
                    <div className={`text-[8px] font-mono font-bold tracking-[0.3em] uppercase px-3 py-2 ${
                      isLight ? 'text-gray-400' : 'text-white/20'
                    }`}>
                      {category}
                    </div>

                    {/* Category items */}
                    {items.map((cmd) => {
                      const absoluteIndex = filtered.indexOf(cmd);
                      const isSelected = absoluteIndex === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left ${
                            isSelected
                              ? (isLight 
                                  ? 'bg-indigo-50/70 border border-indigo-500/20 shadow-inner' 
                                  : 'bg-pulse-primary/15 border border-pulse-primary/30 text-white shadow-[inset_0_0_15px_rgba(123,77,255,0.1)]')
                              : 'border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border transition-colors ${
                              isSelected
                                ? (isLight ? 'bg-white border-indigo-200 text-indigo-600' : 'bg-pulse-primary/20 border-pulse-primary/40 text-pulse-accent')
                                : (isLight ? 'bg-gray-50 border-gray-100 text-gray-500' : 'bg-white/5 border-white/5 text-white/40')
                            }`}>
                              {cmd.icon}
                            </div>
                            <span className={`text-xs font-mono ${
                              isSelected
                                ? (isLight ? 'text-indigo-900 font-bold' : 'text-white font-bold')
                                : (isLight ? 'text-gray-600' : 'text-[#CCCCCC]')
                            }`}>
                              {cmd.title}
                            </span>
                          </div>
                          
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isSelected
                              ? (isLight ? 'bg-indigo-600 text-white border-transparent' : 'bg-pulse-primary text-white border-transparent')
                              : (isLight ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white/5 text-white/40 border-white/10')
                          }`}>
                            {cmd.shortcut}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-4 py-2 text-[9px] font-mono border-t uppercase ${
              isLight ? 'border-gray-100 bg-gray-50 text-gray-500' : 'border-white/5 bg-black/40 text-white/30'
            }`}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="border px-1 rounded">↑↓</span> Move
                </span>
                <span className="flex items-center gap-1">
                  <span className="border px-1 rounded">Enter</span> Select
                </span>
              </div>
              <div>
                <span>PULSE COGNITIVE CONTROL</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
