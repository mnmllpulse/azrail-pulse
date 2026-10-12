import React from 'react';
import { useImageStudio } from './ImageStudioContext';
import { Folder, Image as ImageIcon, History, Layers, Layout, ChevronRight, Play } from 'lucide-react';

export const ProjectsSidebar: React.FC = () => {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    setPromptGenome,
    setActiveImageResult,
    addLog
  } = useImageStudio();

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleSelectHistory = (h: any) => {
    setActiveImageResult(h.imageUrl);
    addLog(`Restored canvas image to frame state: "${h.prompt.substring(0, 30)}..."`, 'info');
    
    // Parse / speculate genome from prompt (or just adjust subject)
    setPromptGenome(prev => ({
      ...prev,
      subject: h.prompt
    }));
  };

  return (
    <div className="w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full min-h-0 select-none">
      {/* 1. PROJECTS SECTION */}
      <div className="p-4 border-b border-zinc-900">
        <div className="flex items-center gap-2 mb-3">
          <Layout className="w-3.5 h-3.5 text-pulse-primary" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 font-bold">PROJECTS REGISTRY</span>
        </div>
        <div className="space-y-1">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProjectId(p.id);
                addLog(`Switched active workspace to project: ${p.name}`, 'info');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all text-left ${p.id === activeProjectId ? 'bg-zinc-900 border border-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${p.id === activeProjectId ? 'bg-pulse-primary' : 'bg-zinc-700'}`}></span>
                <span>{p.name}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${p.id === activeProjectId ? 'text-pulse-primary rotate-90' : 'text-zinc-700'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable lower content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-6 p-4 scrollbar-thin">
        {/* 2. FOLDERS */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 font-bold">WORKSPACE FOLDERS</span>
          </div>
          <div className="space-y-1">
            {activeProject.folders.map((folder, index) => (
              <div 
                key={index}
                className="flex items-center justify-between px-3 py-1.5 rounded text-xs font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                onClick={() => addLog(`Accessing folder: ${folder}`, 'info')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600">/</span>
                  <span>{folder}</span>
                </div>
                <span className="text-[9px] text-zinc-700 bg-zinc-900/60 px-1 rounded">2 files</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. ASSET LIBRARY */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 font-bold">PROJECT ASSETS</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">({activeProject.assets.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {activeProject.assets.map((asset, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setActiveImageResult(asset);
                  addLog(`Imported asset into visual focus node.`, 'info');
                }}
                className="aspect-square rounded border border-zinc-800 overflow-hidden bg-zinc-900 cursor-pointer group hover:border-pulse-primary/50 transition-all relative"
              >
                <img src={asset} alt="Asset" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. HISTORY & RENDERS */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 font-bold">MUTATION HISTORY</span>
          </div>
          <div className="space-y-2.5">
            {activeProject.history.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelectHistory(item)}
                className="flex gap-2.5 p-2 rounded-lg bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded border border-zinc-800 overflow-hidden shrink-0 bg-black">
                  <img src={item.imageUrl} alt="Thumb" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="text-[10px] font-mono text-zinc-400 leading-normal truncate group-hover:text-pulse-primary transition-colors">
                    {item.prompt}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600">
                    <span>STATE: SECURE</span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
