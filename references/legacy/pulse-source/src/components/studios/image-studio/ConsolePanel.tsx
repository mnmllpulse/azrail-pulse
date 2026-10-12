import React, { useState, useRef, useEffect } from 'react';
import { useImageStudio } from './ImageStudioContext';
import { Play, Pause, ChevronRight, Terminal, RefreshCw, Send, Sparkles, Clock, List, History, CheckCircle, AlertCircle } from 'lucide-react';

export const ConsolePanel: React.FC = () => {
  const {
    timeline,
    queue,
    consoleLogs,
    activeBottomTab,
    setActiveBottomTab,
    aiMessages,
    sendAiMessage,
    setActiveImageResult,
    setPromptGenome,
    addLog
  } = useImageStudio();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, activeBottomTab]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs, activeBottomTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendAiMessage(chatInput);
    setChatInput('');
  };

  const selectTimelineFrame = (frame: any) => {
    setActiveImageResult(frame.previewUrl);
    addLog(`Restored canvas state to Timeline Frame #${frame.frame}`, 'info');
  };

  return (
    <div className="h-56 border-t border-zinc-800 bg-zinc-950 flex flex-col min-h-0 select-none">
      {/* Tab select bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-4 h-9 shrink-0">
        <div className="flex h-full text-[10px] font-mono uppercase tracking-wider">
          <TabButton 
            active={activeBottomTab === 'timeline'} 
            onClick={() => setActiveBottomTab('timeline')}
            icon={<Clock className="w-3 h-3" />}
            label="Timeline" 
          />
          <TabButton 
            active={activeBottomTab === 'queue'} 
            onClick={() => setActiveBottomTab('queue')}
            icon={<List className="w-3 h-3" />}
            label="Queue" 
          />
          <TabButton 
            active={activeBottomTab === 'versions'} 
            onClick={() => setActiveBottomTab('versions')}
            icon={<History className="w-3 h-3" />}
            label="Versions" 
          />
          <TabButton 
            active={activeBottomTab === 'console'} 
            onClick={() => setActiveBottomTab('console')}
            icon={<Terminal className="w-3 h-3" />}
            label="Console" 
          />
          <TabButton 
            active={activeBottomTab === 'ai'} 
            onClick={() => setActiveBottomTab('ai')}
            icon={<Sparkles className="w-3 h-3" />}
            label="AI Assistant" 
          />
        </div>

        {/* Diagnostic info */}
        <div className="text-[9px] font-mono text-zinc-600 flex items-center gap-3">
          <span>PIPELINE_ENGINE: v2.4</span>
          <span>● COLD_CONCURRENCY_OK</span>
        </div>
      </div>

      {/* Tab panel contents */}
      <div className="flex-1 overflow-hidden min-h-0 bg-zinc-950">
        {/* TIMELINE VIEW */}
        {activeBottomTab === 'timeline' && (
          <div className="h-full flex items-center gap-6 px-6 overflow-x-auto font-mono text-[10px] scrollbar-thin">
            {/* Timeline Controls */}
            <div className="flex flex-col gap-1.5 shrink-0 pr-6 border-r border-zinc-900">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">TIMELINE CONTROLLER</span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[9px] ${isPlaying ? 'text-pulse-primary' : 'text-zinc-400'}`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <button 
                  onClick={() => addLog('Timeline animation cached & exported successfully.', 'success')}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[9px] hover:text-white rounded cursor-pointer"
                >
                  EXPORT MP4
                </button>
              </div>
            </div>

            {/* Timeline frames strip */}
            <div className="flex items-center gap-3 py-2">
              {timeline.map((frame, index) => (
                <div key={frame.id} className="flex items-center gap-3">
                  <div 
                    onClick={() => selectTimelineFrame(frame)}
                    className="flex flex-col gap-1.5 bg-zinc-900/60 p-2 border border-zinc-900 hover:border-pulse-primary rounded-lg transition-all cursor-pointer w-24 shrink-0 group"
                  >
                    <div className="aspect-video rounded overflow-hidden bg-black border border-zinc-850">
                      <img src={frame.previewUrl} alt={`F${frame.frame}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                      <span className="group-hover:text-pulse-primary">FRAME_0{frame.frame}</span>
                      <span>{frame.duration}s</span>
                    </div>
                  </div>
                  {index < timeline.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-zinc-800 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUEUE VIEW */}
        {activeBottomTab === 'queue' && (
          <div className="h-full overflow-y-auto p-4 space-y-3 font-mono text-[10px] scrollbar-thin">
            <div className="flex items-center justify-between text-[9px] text-zinc-500 border-b border-zinc-900 pb-1.5">
              <span>ACTIVE PIPELINE QUEUE</span>
              <span>ESTIMATED FINISH: IMMEDIATE</span>
            </div>
            
            <div className="space-y-2">
              {queue.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-zinc-900/40 border border-zinc-900/60 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    <span className="text-zinc-300 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-32 bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${item.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-right font-mono text-zinc-400 font-bold">{item.progress}%</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider ${item.status === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-amber-950/40 text-amber-400 border border-amber-900/30'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VERSIONS / COMMITS VIEW */}
        {activeBottomTab === 'versions' && (
          <div className="h-full overflow-y-auto p-4 space-y-2.5 font-mono text-[10px] scrollbar-thin">
            <div className="flex items-center justify-between text-[9px] text-zinc-500 border-b border-zinc-900 pb-1.5 mb-2">
              <span>LATENT GENOME COMMITS</span>
              <span>REPOSITORY: PULSE_MUTATIONS</span>
            </div>

            <CommitRow 
              version="v1.3.4"
              desc="Calibrated Style DNA sliders (Renaissance: 45%, Brutalist: 30%)"
              time="5 mins ago"
              author="SYSTEM_AI_CO_OS"
            />
            <CommitRow 
              version="v1.3.0"
              desc="Synthesized active frame image using mapImageModelName api"
              time="10 mins ago"
              author="SYSTEM_AI_CO_OS"
            />
            <CommitRow 
              version="v1.1.2"
              desc="Adjusted composition to Golden Ratio centered close-up"
              time="1 hour ago"
              author="SYSTEM_AI_CO_OS"
            />
          </div>
        )}

        {/* CONSOLE VIEW */}
        {activeBottomTab === 'console' && (
          <div className="h-full overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 text-zinc-400 scrollbar-thin">
            {consoleLogs.map((log, i) => (
              <div key={i} className="flex gap-3 leading-relaxed">
                <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                <span className={`shrink-0 font-bold uppercase ${log.level === 'success' ? 'text-emerald-500' : log.level === 'warn' ? 'text-amber-500' : 'text-blue-400'}`}>
                  [{log.level}]
                </span>
                <span className="break-all">{log.text}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* AI ASSISTANT CHAT VIEW */}
        {activeBottomTab === 'ai' && (
          <div className="h-full flex flex-col p-3 font-mono text-[11px]">
            {/* Scrollable messages area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-2 px-1 scrollbar-thin">
              {aiMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] rounded-xl p-2.5 border leading-relaxed ${msg.sender === 'azrail' ? 'bg-zinc-900 border-zinc-800 self-start text-zinc-300 mr-auto' : 'bg-indigo-950/20 border-indigo-900/30 text-indigo-200 self-end ml-auto text-right'}`}
                >
                  <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-1 justify-between">
                    <span>{msg.sender === 'azrail' ? 'AZRAIL // DIGITAL_OVERLORD' : 'CREATOR'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <span className="text-left leading-normal">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 shrink-0 border-t border-zinc-900 pt-2 bg-zinc-950">
              <input 
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Command AZRAIL (e.g. 'enhance composition', 'apply brutalist style')..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-pulse-primary"
              />
              <button 
                type="submit"
                className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// Console footer Tab button sub-component
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`h-full px-4 border-r border-zinc-900 flex items-center gap-1.5 transition-all cursor-pointer ${active ? 'bg-zinc-900 text-white border-b-2 border-b-pulse-primary' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

// Versions Commit sub-component
const CommitRow: React.FC<{ version: string; desc: string; time: string; author: string }> = ({ version, desc, time, author }) => {
  return (
    <div className="flex items-center justify-between bg-zinc-900/20 p-2.5 rounded-lg border border-zinc-900 hover:border-zinc-850 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-pulse-primary font-bold">{version}</span>
        <span className="text-zinc-300 truncate">{desc}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-zinc-500 text-[9px]">
        <span>{author}</span>
        <span>|</span>
        <span>{time}</span>
      </div>
    </div>
  );
};
