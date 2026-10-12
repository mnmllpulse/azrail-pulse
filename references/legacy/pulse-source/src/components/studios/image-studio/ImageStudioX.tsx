import React from 'react';
import { ImageStudioProvider, useImageStudio } from './ImageStudioContext';
import { ProjectsSidebar } from './ProjectsSidebar';
import { Workspace } from './Workspace';
import { PropertiesPanel } from './PropertiesPanel';
import { ConsolePanel } from './ConsolePanel';
import { Cpu, Search as SearchIcon, User, ChevronDown, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    setActiveProjectId, 
    activeModel, 
    setActiveModel 
  } = useImageStudio();

  const activeProj = projects.find(p => p.id === activeProjectId);

  return (
    <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 text-white select-none">
      {/* 1. PROJECT SECTION */}
      <div className="flex items-center gap-3 border-r border-zinc-800 pr-6 h-full">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">ACTIVE PROJECT:</span>
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider hover:text-pulse-primary transition-colors">
            {activeProj ? activeProj.name : 'NONE'}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50 hidden group-hover:block hover:block">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors hover:bg-zinc-800 hover:text-white ${p.id === activeProjectId ? 'text-pulse-primary bg-zinc-800/45' : 'text-zinc-400'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. NEURAL SEARCH */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
          <input 
            type="text"
            placeholder="NEURAL SEARCH // Query Style DNA, prompt history, assets..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-4 text-[10px] font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pulse-primary focus:ring-1 focus:ring-pulse-primary transition-all"
          />
        </div>
      </div>

      {/* 3. AI OPERATING CORE */}
      <div className="flex items-center gap-2 border-x border-zinc-800 px-6 h-full">
        <Sparkles className="w-4 h-4 text-pulse-primary" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          AZRAIL_CORE: <span className="text-emerald-400 font-bold">ONLINE</span>
        </span>
      </div>

      {/* 4. MODEL ROUTER */}
      <div className="flex items-center gap-3 border-r border-zinc-800 pr-6 h-full pl-6">
        <Cpu className="w-4 h-4 text-zinc-500" />
        <span className="text-[10px] font-mono text-zinc-500 uppercase">ENGINE:</span>
        <select 
          value={activeModel}
          onChange={(e) => setActiveModel(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-pulse-primary cursor-pointer"
        >
          <option value="gemini-3.1-flash-lite-image">Gemini 3.1 Flash Lite Image</option>
          <option value="gemini-3.1-flash-image">Gemini 3.1 Flash Image [HD]</option>
          <option value="gemini-3-pro-image">Gemini 3 Pro Image [Max-Fidelity]</option>
        </select>
      </div>

      {/* 5. ACCOUNT / CREDITS */}
      <div className="flex items-center gap-3 pl-6">
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">CREATIVE MEMORY LEVEL</span>
          <span className="text-xs font-mono font-bold text-white">4,820 Credits</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};

const ImageStudioXContent: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 overflow-hidden font-sans">
      {/* Visual Header Grid layout */}
      <Header />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ProjectsSidebar />
        <Workspace />
        <PropertiesPanel />
      </div>

      {/* Bottom Console/Timeline */}
      <ConsolePanel />
    </div>
  );
};

export const ImageStudioX: React.FC = () => {
  return (
    <ImageStudioProvider>
      <ImageStudioXContent />
    </ImageStudioProvider>
  );
};
