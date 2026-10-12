import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Zap, Star, LayoutGrid, List,
  ArrowRight, Sparkles, Filter, Settings
} from 'lucide-react';
import { NEXUS_MODULES, NexusModule } from '../data/modules';

interface ThorQuickAccessProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  onSelect: (module: NexusModule) => void;
}

export default function ThorQuickAccess({ isOpen, onClose, isLight, onSelect }: ThorQuickAccessProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'agent' | 'visual' | 'status' | 'store'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredModules = NEXUS_MODULES.filter(m => {
    const matchesSearch = m.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || m.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed inset-4 sm:inset-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-4xl sm:max-h-[80vh] z-[101] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isLight ? 'bg-white border-gray-200' : 'bg-zinc-950 border-white/10'
            }`}
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between shrink-0 ${isLight ? 'border-gray-100 bg-gray-50/50' : 'border-white/5 bg-white/5'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isLight ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'}`}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold font-mono uppercase tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    THOR_QUICK_ACCESS
                  </h2>
                  <p className={`text-xs font-mono uppercase tracking-widest opacity-40 ${isLight ? 'text-gray-500' : 'text-white'}`}>
                    NEXUS_MODULE_ORCHESTRATOR v2.4
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Toolbar */}
            <div className={`px-6 py-4 border-b flex flex-col sm:flex-row items-center gap-4 shrink-0 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search modules (AXIOM, HERMES, etc)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono transition-all outline-none border ${
                    isLight 
                      ? 'bg-gray-50 border-gray-200 focus:border-indigo-500 focus:bg-white' 
                      : 'bg-white/5 border-white/10 focus:border-indigo-500/50 focus:bg-white/10 text-white'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(['all', 'agent', 'visual', 'status', 'store'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border ${
                      activeFilter === f
                        ? (isLight ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-500 text-white border-indigo-500')
                        : (isLight ? 'bg-white border-gray-200 text-gray-500 hover:border-gray-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20')
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <div className={`w-px h-6 mx-1 ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className={`p-2 rounded-lg border transition-all ${
                    isLight ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-white/10 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Grid/List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {filteredModules.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                  <Search className="w-12 h-12 mb-4" />
                  <p className="text-sm font-mono uppercase">No modules matching your search</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredModules.map((m) => (
                    <motion.button
                      key={m.id}
                      layout
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelect(m);
                        onClose();
                      }}
                      className={`p-4 rounded-2xl border text-left flex gap-4 transition-all group relative overflow-hidden ${
                        isLight 
                          ? 'bg-white border-gray-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10' 
                          : 'bg-zinc-900/50 border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900 shadow-2xl'
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 transition-colors ${
                        isLight ? 'bg-gray-50 text-gray-900 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-white/5 text-white group-hover:bg-indigo-500'
                      }`}>
                        <m.ic className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-mono font-bold uppercase tracking-tight truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {m.label}
                          </h3>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${
                            m.type === 'agent' ? 'border-indigo-500/30 text-indigo-400' :
                            m.type === 'visual' ? 'border-emerald-500/30 text-emerald-400' :
                            'border-amber-500/30 text-amber-400'
                          }`}>
                            {m.type}
                          </span>
                        </div>
                        <p className={`text-[10px] font-medium leading-tight mb-2 truncate ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                          {m.role}
                        </p>
                        <p className={`text-[11px] leading-relaxed opacity-60 line-clamp-2 ${isLight ? 'text-gray-600' : 'text-[#E0E0E0]'}`}>
                          {m.description}
                        </p>
                      </div>
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                   {filteredModules.map((m) => (
                    <motion.button
                      key={m.id}
                      layout
                      onClick={() => {
                        onSelect(m);
                        onClose();
                      }}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all group ${
                        isLight ? 'bg-white border-gray-100 hover:bg-gray-50' : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${isLight ? 'bg-gray-100 text-gray-900' : 'bg-white/10 text-white'}`}>
                           <m.ic className="w-4 h-4" />
                         </div>
                         <span className={`text-sm font-mono font-bold uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>{m.label}</span>
                         <span className={`text-[10px] opacity-40 font-mono`}>/ {m.role}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/10 opacity-40`}>{m.type}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                   ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className={`px-6 py-4 border-t flex items-center justify-between shrink-0 text-[10px] font-mono uppercase tracking-widest ${isLight ? 'border-gray-100 text-gray-400' : 'border-white/5 text-white/30'}`}>
              <div className="flex items-center gap-4">
                <span>Total Modules: {NEXUS_MODULES.length}</span>
                <span>Active Core: ALPHA_v2</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>Quantum Sync Active</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
