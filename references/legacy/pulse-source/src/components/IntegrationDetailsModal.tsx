import React from 'react';
import { X, Key, Code, Globe, Zap, Settings, BookOpen } from 'lucide-react';
import { AIModel } from '../data/models';
import { motion, AnimatePresence } from 'motion/react';
import { getProviderIcon } from './ModelSelector';

export function IntegrationDetailsModal({ model, isOpen, onClose, isLight }: { model: AIModel | null, isOpen: boolean, onClose: () => void, isLight?: boolean }) {
  if (!isOpen || !model) return null;

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
          className={`relative w-full max-w-2xl flex flex-col rounded-2xl border shadow-2xl ${isLight ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-inner ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                {getProviderIcon(model.provider, "w-6 h-6")}
              </div>
              <div>
                <h2 className={`text-xl font-bold tracking-tight mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>{model.name}</h2>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{model.provider}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/20 text-indigo-300'}`}>{model.category}</span>
                </div>
              </div>
            </div>
            
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="flex flex-col gap-6">
              
              {/* API Configuration */}
              <div>
                <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <Settings className="w-4 h-4" /> Endpoint Configuration
                </h3>
                <div className={`p-4 rounded-xl border flex flex-col gap-3 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                  <div>
                    <label className={`text-[10px] font-mono uppercase tracking-wider mb-1 block ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Base URL</label>
                    <code className={`text-xs font-mono px-2 py-1 rounded ${isLight ? 'bg-white border border-gray-200 text-gray-800' : 'bg-white/5 text-[#E0E0E0]'}`}>https://api.{model.provider.toLowerCase().replace(/\s+/g, '')}.com/v1</code>
                  </div>
                  <div>
                    <label className={`text-[10px] font-mono uppercase tracking-wider mb-1 block ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Model Identifier</label>
                    <code className={`text-xs font-mono px-2 py-1 rounded ${isLight ? 'bg-white border border-gray-200 text-gray-800' : 'bg-white/5 text-[#E0E0E0]'}`}>{model.id}</code>
                  </div>
                </div>
              </div>

              {/* Authentication */}
              <div>
                <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <Key className="w-4 h-4" /> Authentication
                </h3>
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                  <div className="flex-1">
                    <label className={`text-[10px] font-mono uppercase tracking-wider mb-1 block ${isLight ? 'text-gray-500' : 'text-white/40'}`}>API Key</label>
                    <input 
                      type="password" 
                      defaultValue="••••••••••••••••••••••••••••••••"
                      readOnly
                      className={`w-full bg-transparent border-none outline-none font-mono text-sm ${isLight ? 'text-gray-800' : 'text-[#E0E0E0]'}`}
                    />
                  </div>
                  <button className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${isLight ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'}`}>
                    Update
                  </button>
                </div>
              </div>

              {/* Quick Start Snippet */}
              <div>
                <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <Code className="w-4 h-4" /> Quick Start
                </h3>
                <div className={`p-4 rounded-xl border font-mono text-xs overflow-x-auto whitespace-pre ${isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-[#050505] border-white/10 text-gray-300'}`}>
{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.${model.provider.toUpperCase().replace(/\s+/g, '_')}_API_KEY,
  baseURL: "https://api.${model.provider.toLowerCase().replace(/\s+/g, '')}.com/v1"
});

const response = await client.chat.completions.create({
  model: "${model.id}",
  messages: [{ role: "user", content: "Hello world" }]
});`}
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
