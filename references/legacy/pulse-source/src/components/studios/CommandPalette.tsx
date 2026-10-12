import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, X, Globe, Layout, Palette, Settings, Zap, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: 'nav_dashboard', label: 'Navigate to Dashboard', icon: <Layout className="w-4 h-4" />, category: 'Navigation' },
    { id: 'nav_studio', label: 'Open Web Studio', icon: <Globe className="w-4 h-4" />, category: 'Navigation' },
    { id: 'style_minimalist', label: 'Set Aesthetic: Minimalist', icon: <Palette className="w-4 h-4" />, category: 'Aesthetics' },
    { id: 'style_cyberpunk', label: 'Set Aesthetic: Cyberpunk', icon: <Zap className="w-4 h-4" />, category: 'Aesthetics' },
    { id: 'resequence_dna', label: 'Resequence Creative DNA', icon: <Zap className="w-4 h-4" />, category: 'Actions' },
    { id: 'open_settings', label: 'Global Settings', icon: <Settings className="w-4 h-4" />, category: 'System' },
    { id: 'view_history', label: 'View Generation History', icon: <History className="w-4 h-4" />, category: 'System' },
  ];

  const filteredCommands = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center gap-3 p-4 border-b border-white/5">
            <Search className="w-5 h-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search actions or navigate..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-zinc-600"
            />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-400">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md transition-colors">
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
            {filteredCommands.length > 0 ? (
              <div className="space-y-4 py-2">
                {Array.from(new Set(filteredCommands.map(c => c.category))).map(category => (
                  <div key={category} className="space-y-1">
                    <h3 className="px-3 text-[10px] font-mono uppercase text-zinc-500 tracking-widest">{category}</h3>
                    {filteredCommands.filter(c => c.category === category).map(command => (
                      <button
                        key={command.id}
                        onClick={() => {
                          onAction(command.id);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group transition-all text-left"
                      >
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                          {command.icon}
                        </div>
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{command.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-zinc-500 text-sm italic">No commands found for "{query}"</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/5 bg-black/20 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
            <div className="flex gap-4">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
            </div>
            <span>Esc to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
