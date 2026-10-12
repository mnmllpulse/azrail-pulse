import React, { useState, useMemo } from 'react';
import { Search, Filter, Check, Database, Eye, AlignLeft, Image as ImageIcon, Mic, Volume2, Globe, X, Video, BarChart3, Activity } from 'lucide-react';
import { AI_MODELS, MODEL_CATEGORIES, MODEL_PROVIDERS, AIModel } from '../data/models';
import { motion, AnimatePresence } from 'motion/react';
import { ModelIconRegistry } from '../utils/ModelIconRegistry';
import { useModels } from '../contexts/ModelsContext';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  isLight?: boolean;
  className?: string;
  category?: string;
}

export function getProviderIcon(provider: string, className = "w-4 h-4") {
  return ModelIconRegistry.getIcon(provider, className);
}

export function getCategoryIcon(category: string, className = "w-4 h-4") {
  switch (category) {
    case 'Text Generation': return <AlignLeft className={className} />;
    case 'Text-to-Image': return <ImageIcon className={className} />;
    case 'Speech-to-Text': return <Mic className={className} />;
    case 'Text-to-Speech': return <Volume2 className={className} />;
    case 'Embeddings': return <Database className={className} />;
    case 'Vision': return <Eye className={className} />;
    case 'Translation': return <Globe className={className} />;
    case 'Text-to-Video': return <Video className={className} />;
    case 'Image-to-Video': return <Video className={className} />;
    case 'Classification': return <BarChart3 className={className} />;
    case 'Music Generation': return <Activity className={className} />;
    case 'Voice Detection': return <Mic className={className} />;
    default: return <BoxIcon className={className} />;
  }
}

function BoxIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
}

export default function ModelSelector({ value, onChange, isLight, className = "", category = 'Text Generation' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedModel = AI_MODELS.find(m => m.id === value) || AI_MODELS[0];

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-between w-full border rounded-xl p-3 text-sm outline-none transition-colors font-mono ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800 hover:border-indigo-400' : 'bg-white/5 border-white/10 text-[#E0E0E0] hover:border-indigo-500/50'} ${className}`}
      >
        <div className="flex items-center gap-3">
          {getProviderIcon(selectedModel.provider)}
          <div className="flex flex-col items-start">
            <span className="font-medium">{selectedModel.name}</span>
            <span className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{selectedModel.provider}</span>
          </div>
        </div>
        <Filter className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
      </button>

      <ModelExplorerModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        isLight={isLight} 
        onSelect={(id) => {
          onChange(id);
          setIsOpen(false);
        }}
        currentModelId={value}
        allowedCategory={category}
      />
    </>
  );
}

export function ModelExplorerModal({ isOpen, onClose, isLight, onSelect, currentModelId, allowedCategory }: { isOpen: boolean, onClose: () => void, isLight?: boolean, onSelect?: (id: string) => void, currentModelId?: string, allowedCategory?: string }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [showDeprecated, setShowDeprecated] = useState(false);
  const { connectModel, disconnectModel, isModelConnected } = useModels();

  const filteredModels = useMemo(() => {
    return AI_MODELS.filter(model => {
      if (allowedCategory && model.category !== allowedCategory) return false;
      if (!showDeprecated && model.deprecated) return false;
      if (selectedCategory !== 'All' && model.category !== selectedCategory) return false;
      if (selectedProvider !== 'All' && model.provider !== selectedProvider) return false;
      if (search) {
        const s = search.toLowerCase();
        return model.name.toLowerCase().includes(s) || 
               model.provider.toLowerCase().includes(s) || 
               model.id.toLowerCase().includes(s) ||
               model.capabilities.some(c => c.toLowerCase().includes(s));
      }
      return true;
    });
  }, [search, selectedCategory, selectedProvider, showDeprecated, allowedCategory]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 ${isLight ? 'bg-white/80 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-sm'}`}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${isLight ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-3">
               <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
                 <Database className="w-4 h-4" />
               </div>
               <div>
                 <h2 className={`font-medium leading-none mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>Model Explorer</h2>
                 <p className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>180+ Available AI Models</p>
               </div>
            </div>
            
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Filters Sidebar */}
            <div className={`w-64 shrink-0 flex flex-col border-r overflow-y-auto ${isLight ? 'border-gray-200 bg-gray-50/50' : 'border-white/10 bg-[#050505]'}`}>
               <div className="p-4 space-y-6">
                 
                 <div>
                   <div className="relative">
                     <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
                     <input 
                       type="text" 
                       placeholder="Search models..." 
                       value={search}
                       onChange={e => setSearch(e.target.value)}
                       className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors font-mono ${isLight ? 'bg-white border-gray-200 focus:border-indigo-400 text-gray-800' : 'bg-black border-white/10 focus:border-indigo-500/50 text-[#E0E0E0]'}`}
                     />
                   </div>
                 </div>

                 <div>
                   <h3 className={`text-[10px] font-mono uppercase tracking-widest mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Categories</h3>
                   <div className="flex flex-col gap-1">
                     <FilterItem label="All" active={selectedCategory === 'All'} onClick={() => setSelectedCategory('All')} isLight={isLight} />
                     {MODEL_CATEGORIES.map(cat => (
                       <FilterItem key={cat} label={cat} icon={getCategoryIcon(cat, "w-3 h-3")} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} isLight={isLight} />
                     ))}
                   </div>
                 </div>

                 <div>
                   <h3 className={`text-[10px] font-mono uppercase tracking-widest mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Providers</h3>
                   <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                     <FilterItem label="All" active={selectedProvider === 'All'} onClick={() => setSelectedProvider('All')} isLight={isLight} />
                     {MODEL_PROVIDERS.sort().map(prov => (
                       <FilterItem key={prov} label={prov} icon={getProviderIcon(prov, "w-3 h-3")} active={selectedProvider === prov} onClick={() => setSelectedProvider(prov)} isLight={isLight} />
                     ))}
                   </div>
                 </div>
                 
                 <div>
                   <label className={`flex items-center gap-2 text-xs cursor-pointer ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                     <input type="checkbox" checked={showDeprecated} onChange={e => setShowDeprecated(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                     Show Deprecated Models
                   </label>
                 </div>

               </div>
            </div>

            {/* Models Grid */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isLight ? 'bg-white' : 'bg-[#0A0A0A]'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredModels.map(model => (
                  <div 
                    key={model.id}
                    onClick={() => onSelect?.(model.id)}
                    className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${onSelect ? 'cursor-pointer hover:scale-[1.02]' : ''} ${currentModelId === model.id ? (isLight ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/10') : (isLight ? 'bg-white border-gray-200 hover:border-gray-300 shadow-sm' : 'bg-[#050505] border-white/10 hover:border-white/20')}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                          {getProviderIcon(model.provider, "w-4 h-4")}
                        </div>
                        <div>
                          <div className={`text-sm font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{model.name}</div>
                          <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{model.provider}</div>
                        </div>
                      </div>
                      {currentModelId === model.id && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isLight ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-auto">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-white/60'}`}>
                        {model.category}
                      </span>
                      {model.capabilities.map(cap => (
                        <span key={cap} className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/20 text-indigo-300'}`}>
                          {cap}
                        </span>
                      ))}
                      {model.deprecated && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${isLight ? 'bg-red-50 text-red-600' : 'bg-red-500/20 text-red-300'}`}>
                          Deprecated
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isModelConnected(model.id)) {
                            disconnectModel(model.id);
                          } else {
                            connectModel(model.id);
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isModelConnected(model.id) ? (isLight ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30') : (isLight ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50' : 'bg-transparent text-gray-300 border-white/10 hover:bg-white/5')}`}
                      >
                        {isModelConnected(model.id) ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredModels.length === 0 && (
                <div className={`flex flex-col items-center justify-center h-full py-20 text-center ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                  <Database className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-mono">No models found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FilterItem({ label, icon, active, onClick, isLight }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${active ? (isLight ? 'bg-indigo-50 text-indigo-600 font-medium' : 'bg-indigo-500/20 text-indigo-400 font-medium') : (isLight ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-[#E0E0E0]/60 hover:bg-white/5 hover:text-white')}`}
    >
      {icon && <span className={active ? '' : 'opacity-60'}>{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
}
