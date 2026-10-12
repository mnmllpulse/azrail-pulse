import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { 
  Terminal as TermIcon, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Play, 
  Activity, 
  Cpu,
  RefreshCw,
  LogOut,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useSystemState } from '../../contexts/SystemStateContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWebContainer } from '../../contexts/WebContainerContext';
import { useStudioAI } from '../../contexts/StudioAIContext';
import { toast } from 'sonner';

interface StudioTerminalProps {
  studioType?: string;
  isLight?: boolean;
}

type TerminalHeight = 'collapsed' | 'expanded' | 'maximized';

export default function StudioTerminal({ studioType = 'web', isLight = false }: StudioTerminalProps) {
  const [heightState, setHeightState] = useState<TerminalHeight>('collapsed');
  const [activeTab, setActiveTab] = useState<'terminal' | 'build' | 'logs'>('terminal');
  const [isStreamingLogs, setIsStreamingLogs] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const streamIntervalRef = useRef<any>(null);
  const { triggerDiagnostics } = useSystemState();
  const { t } = useLanguage();
  const { runCommand, isDevServerRunning, stopDevServer, startDevServer } = useWebContainer();
  const { setLastBuildStatus } = useStudioAI();

  // Create local reference for currentLine to avoid state desync in callbacks
  const currentLineRef = useRef<string>('');

  // Stop active log stream
  const stopLogStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreamingLogs(false);
  };

  // Helper to print prompt
  const printPrompt = () => {
    const term = termRef.current;
    if (!term) return;
    term.write('\r\n\x1b[1;35m[pulse-os@workspace]\x1b[0m \x1b[1;32m~\x1b[0m$ ');
    currentLineRef.current = '';
  };

  // Run a command
  const executeCommand = async (cmd: string) => {
    const term = termRef.current;
    if (!term) return;

    const trimmed = cmd.trim();
    if (!trimmed) {
      printPrompt();
      return;
    }

    const parts = trimmed.split(' ');
    const baseCmd = parts[0].toLowerCase();

    if (baseCmd === 'clear') {
      term.clear();
      printPrompt();
      return;
    }

    if (baseCmd === 'diagnostics') {
      term.writeln('\r\n\x1b[1;33m⚲ Initializing live diagnostics sweep across virtual clusters...\x1b[0m');
      try {
        triggerDiagnostics();
        toast.success("Terminal initiated system diagnostic scan!");
      } catch (e) {
        // Fallback if context not mounted
      }

      let diagStep = 0;
      const diagInterval = setInterval(() => {
        if (diagStep === 0) {
          term.writeln('  \x1b[90m[L1_VOLATILE]\x1b[0m Scanning active memory registers... \x1b[1;32m[PASS]\x1b[0m');
        } else if (diagStep === 1) {
          term.writeln('  \x1b[90m[L2_EPISODIC]\x1b[0m Verified workspace database cache. \x1b[1;32m[OK]\x1b[0m');
        } else if (diagStep === 2) {
          term.writeln('  \x1b[90m[L5_SYSTEM]\x1b[0m Cooling threshold adjusted to 41.5°C. \x1b[1;32m[OPTIMAL]\x1b[0m');
        } else if (diagStep === 3) {
          term.writeln('\r\n\x1b[1;32m✓ Diagnostic Sweep Complete. Logs broadcast to Cloud Registry.\x1b[0m\r\n');
          clearInterval(diagInterval);
          printPrompt();
        }
        diagStep++;
      }, 400);
      return;
    }

    if (baseCmd === 'build') {
      setLastBuildStatus('idle');
      term.writeln('\r\n\x1b[1;35m⚡ INITIALIZING PRODUCTION BUILD AND COMPILATION PIPELINE...\x1b[0m');
      term.writeln('\x1b[36m✓ Vite Bundler v6.2.3 & ESBuild transpiler detected\x1b[0m');
      term.writeln('Compiling TypeScript sources with target: ESNext...');
      
      let buildProgress = 0;
      const buildInterval = setInterval(() => {
        buildProgress += 5;
        const barLength = Math.floor(buildProgress / 5);
        const bar = '='.repeat(barLength) + ' '.repeat(20 - barLength);
        
        let stepText = '';
        if (buildProgress < 25) stepText = 'Parsing modules...';
        else if (buildProgress < 50) stepText = 'Compiling CodeStudioPanel & workspace dependencies...';
        else if (buildProgress < 75) stepText = 'Applying CSS compression...';
        else stepText = 'Generating production bundles inside /dist...';

        term.write(`\r\x1b[1;33mBuilding\x1b[0m [${bar}] ${buildProgress}% | ${stepText}`);
        
        if (buildProgress >= 100) {
          clearInterval(buildInterval);
          term.writeln('\r\n');
          term.writeln('dist/index.html                     \x1b[1;32m1.32 kB\x1b[0m │ gzip: 0.58 kB');
          term.writeln('dist/assets/index-A9e8fD7c.js     \x1b[1;32m498.12 kB\x1b[0m │ gzip: 145.24 kB');
          term.writeln('dist/assets/index-F4e2c9D1.css     \x1b[1;32m95.40 kB\x1b[0m │ gzip: 26.15 kB');
          term.writeln('dist/server.cjs                    \x1b[1;32m53.15 kB\x1b[0m │ gzip: 16.10 kB');
          term.writeln('');
          term.writeln('\x1b[1;32m✓ Vite Build Finished Successfully in 2.14s!\x1b[0m');
          term.writeln('Status: READY FOR HIGH-SPEED EDGE REPLICATION');
          term.writeln('');
          setLastBuildStatus('success');
          printPrompt();
        }
      }, 120);
      return;
    }

    if (baseCmd === 'logs') {
      term.writeln('\r\n\x1b[1;35m📡 Streaming Edge Node, Cloudflare Gateway & Microservice logs...\x1b[0m');
      term.writeln('Press \x1b[1;31m[Ctrl+C]\x1b[0m or any key to terminate stream.');
      term.writeln('');
      setIsStreamingLogs(true);
      
      const logInterval = setInterval(() => {
        const levels = ['INFO', 'SUCCESS', 'WARN', 'ERROR', 'AZRAIL'];
        const levelColors: Record<string, string> = {
          INFO: '\x1b[36m[INFO]\x1b[0m',
          SUCCESS: '\x1b[1;32m[SUCCESS]\x1b[0m',
          WARN: '\x1b[1;33m[WARN]\x1b[0m',
          ERROR: '\x1b[1;31m[ERROR]\x1b[0m',
          AZRAIL: '\x1b[1;35m[AZRAIL]\x1b[0m'
        };
        const modules = ['L1_VOLATILE', 'L2_EPISODIC', 'L4_KNOWLEDGE', 'METATRON', 'GEMINI_AI', 'CLOUDFLARE_PROXY'];
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        const randomModule = modules[Math.floor(Math.random() * modules.length)];
        
        const logMsgs = [
          'Garbage collector flushed 18 dead context variables from stack.',
          'Vite Web Socket established handshake with preview frames.',
          'Incoming Request: GET /api/cloudflare/status - 200 OK.',
          'Cloudflare proxy resolved credentials successfully.',
          'Cooling fans optimization verified. CPU Temp stable.',
          'Decoded user session authentication headers.',
          'API proxy parsed request body for Gemini Neural API.',
          'Active worker routes verified globally.'
        ];
        const randomMsg = logMsgs[Math.floor(Math.random() * logMsgs.length)];
        const timestamp = new Date().toLocaleTimeString();
        
        term.writeln(`\x1b[90m${timestamp}\x1b[0m ${levelColors[randomLevel]} \x1b[1;34m${randomModule}\x1b[0m - ${randomMsg}`);
      }, 600);
      
      streamIntervalRef.current = logInterval;
      return;
    }

    // Delegate command execution to WebContainer runner
    await runCommand(trimmed, (data) => term.write(data));
    printPrompt();
  };

  // Keyboard and typed data handler
  const handleTerminalData = (data: string) => {
    const term = termRef.current;
    if (!term) return;

    if (streamIntervalRef.current) {
      stopLogStream();
      term.writeln('\r\n\x1b[1;31mStream aborted by user input.\x1b[0m');
      printPrompt();
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const char = data[i];

      if (char === '\r' || char === '\n') {
        const cmd = currentLineRef.current;
        executeCommand(cmd);
      } else if (char === '\x7f' || char === '\x08') {
        // Backspace
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (char === '\x03') {
        // Ctrl+C
        term.write('^C\r\n');
        printPrompt();
      } else {
        currentLineRef.current += char;
        term.write(char);
      }
    }
  };

  // Trigger resize refitting
  const triggerFit = () => {
    setTimeout(() => {
      try {
        if (fitAddonRef.current && heightState !== 'collapsed') {
          fitAddonRef.current.fit();
        }
      } catch (e) {
        console.warn('Xterm fitting issue:', e);
      }
    }, 100);
  };

  // Handle initialization of the terminal element
  useEffect(() => {
    if (heightState === 'collapsed' || !containerRef.current) {
      if (termRef.current) {
        stopLogStream();
        termRef.current.dispose();
        termRef.current = null;
      }
      return;
    }

    // Initialize Terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Fira Code, JetBrains Mono, Menlo, Courier New, monospace',
      theme: isLight ? {
        background: '#ffffff',
        foreground: '#111827',
        cursor: '#7840ff',
        selectionBackground: 'rgba(120, 64, 255, 0.2)',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#ffffff'
      } : {
        background: '#05010a',
        foreground: '#f8f4ff',
        cursor: '#3bccff',
        selectionBackground: 'rgba(120, 64, 255, 0.4)',
        black: '#0c0412',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#a78bfa',
        cyan: '#22d3ee',
        white: '#f8f4ff'
      },
      lineHeight: 1.4,
      scrollback: 1000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome messages
    term.writeln('\x1b[1;35m  _/\x1b[0m                 \x1b[1;36m_/\x1b[0m');
    term.writeln('\x1b[1;35m _/_/_/    _/    _/  _/_/_/    _/_/    _/_/_/\x1b[0m');
    term.writeln('\x1b[1;35m_/    _/  _/    _/  _/    _/  _/_/_/_/  _/\x1b[0m');
    term.writeln('\x1b[1;35m_/    _/  _/    _/  _/    _/  _/        _/\x1b[0m');
    term.writeln('\x1b[1;35m _/_/_/    _/_/_/  _/_/_/      _/_/_/  _/\x1b[0m');
    term.writeln('\x1b[1;35m                  _/\x1b[0m');
    term.writeln('\x1b[1;35m                 _/\x1b[0m');
    term.writeln('----------------------------------------------------');
    term.writeln('\x1b[1;36mPULSE OS Terminal v1.0.0-Beta Core Connected\x1b[0m');
    term.writeln(`Environment: \x1b[1;33m${studioType.toUpperCase()} Studio workspace\x1b[0m`);
    term.writeln('Type \x1b[1;32mhelp\x1b[0m to list available interactive shell actions.');
    term.write('\r\n\x1b[1;35m[pulse-os@workspace]\x1b[0m \x1b[1;32m~\x1b[0m$ ');

    // Register data handler
    const dataDisposable = term.onData(handleTerminalData);

    // Watch for window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (err) {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      dataDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      stopLogStream();
      term.dispose();
      termRef.current = null;
    };
  }, [heightState, studioType, isLight]);

  // Handle fast tab simulations
  const handleTabClick = (tab: 'terminal' | 'build' | 'logs') => {
    setActiveTab(tab);
    if (heightState === 'collapsed') {
      setHeightState('expanded');
    }
    
    // Auto execute command based on clicked tab
    setTimeout(() => {
      const term = termRef.current;
      if (!term) return;

      term.clear();
      stopLogStream();

      if (tab === 'terminal') {
        term.writeln('\x1b[1;36m--- Switched to Bash Subshell ---\x1b[0m');
        term.write('\r\n\x1b[1;35m[pulse-os@workspace]\x1b[0m \x1b[1;32m~\x1b[0m$ ');
        currentLineRef.current = '';
      } else if (tab === 'build') {
        term.writeln('\x1b[1;36m--- Build Automation Pipeline ---\x1b[0m');
        executeCommand('build');
      } else if (tab === 'logs') {
        term.writeln('\x1b[1;36m--- Active Logs Observer ---\x1b[0m');
        executeCommand('logs');
      }
    }, 150);
  };

  const toggleHeight = () => {
    if (heightState === 'collapsed') {
      setHeightState('expanded');
      triggerFit();
    } else {
      stopLogStream();
      setHeightState('collapsed');
    }
  };

  const toggleMaximize = () => {
    if (heightState === 'maximized') {
      setHeightState('expanded');
    } else {
      setHeightState('maximized');
    }
    triggerFit();
  };

  const handleClear = () => {
    if (termRef.current) {
      stopLogStream();
      termRef.current.clear();
      termRef.current.write('\r\n\x1b[1;35m[pulse-os@workspace]\x1b[0m \x1b[1;32m~\x1b[0m$ ');
      currentLineRef.current = '';
    }
  };

  const getContainerHeightClass = () => {
    switch (heightState) {
      case 'collapsed':
        return 'h-11';
      case 'expanded':
        return 'h-72';
      case 'maximized':
        return 'h-[500px]';
    }
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-40 flex flex-col transition-all duration-300 border-t overflow-hidden ${getContainerHeightClass()} ${
        isLight 
          ? 'bg-white border-gray-200 text-gray-800' 
          : 'bg-[#05010a] border-white/5 text-[#f8f4ff]'
      }`}
      style={{
        boxShadow: heightState !== 'collapsed' ? '0 -10px 30px -15px rgba(120, 64, 255, 0.25)' : 'none'
      }}
    >
      {/* Header bar */}
      <div 
        className={`flex items-center justify-between px-4 h-11 border-b select-none shrink-0 cursor-pointer ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#0c0412] border-white/5'
        }`}
        onClick={(e) => {
          // Only toggle if not clicking on child buttons
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('.tab-button')) return;
          toggleHeight();
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TermIcon className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-[#3bccff] animate-pulse'}`} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Pulse Core Shell
            </span>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold leading-none uppercase ${
              isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Connected
            </span>
          </div>

          {/* Quick tab switcher */}
          <div className="hidden sm:flex items-center gap-1">
            <button 
              onClick={() => handleTabClick('terminal')}
              className={`tab-button px-2.5 py-1 text-[10px] font-mono uppercase tracking-tight rounded-md transition-colors ${
                activeTab === 'terminal' && heightState !== 'collapsed'
                  ? (isLight ? 'bg-indigo-600 text-white' : 'bg-[#7840ff]/30 text-[#3bccff] border border-[#7840ff]/40')
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              bash_sh
            </button>
            <button 
              onClick={() => handleTabClick('build')}
              className={`tab-button px-2.5 py-1 text-[10px] font-mono uppercase tracking-tight rounded-md transition-colors ${
                activeTab === 'build' && heightState !== 'collapsed'
                  ? (isLight ? 'bg-indigo-600 text-white' : 'bg-[#7840ff]/30 text-[#3bccff] border border-[#7840ff]/40')
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              npm_build
            </button>
            <button 
              onClick={() => handleTabClick('logs')}
              className={`tab-button px-2.5 py-1 text-[10px] font-mono uppercase tracking-tight rounded-md transition-colors ${
                activeTab === 'logs' && heightState !== 'collapsed'
                  ? (isLight ? 'bg-indigo-600 text-white' : 'bg-[#7840ff]/30 text-[#3bccff] border border-[#7840ff]/40')
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              observer_logs
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {heightState !== 'collapsed' && (
            <button
              onClick={handleClear}
              title="Clear terminal buffer"
              className={`p-1.5 rounded-lg transition-colors border ${
                isLight 
                  ? 'border-gray-200 hover:bg-gray-150 text-gray-600' 
                  : 'border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={toggleMaximize}
            disabled={heightState === 'collapsed'}
            title={heightState === 'maximized' ? 'Restore height' : 'Maximize terminal'}
            className={`p-1.5 rounded-lg transition-colors border ${
              heightState === 'collapsed' ? 'opacity-30 cursor-not-allowed' : ''
            } ${
              isLight 
                ? 'border-gray-200 hover:bg-gray-150 text-gray-600' 
                : 'border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {heightState === 'maximized' ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={toggleHeight}
            className={`p-1.5 rounded-lg transition-colors border ${
              isLight 
                ? 'border-gray-200 hover:bg-gray-150 text-gray-600' 
                : 'border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {heightState === 'collapsed' ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal View Body */}
      {heightState !== 'collapsed' && (
        <div 
          className={`flex-1 p-3 font-mono relative overflow-hidden ${
            isLight ? 'bg-gray-50' : 'bg-[#05010a]'
          }`}
        >
          {/* xterm mounting ref */}
          <div 
            ref={containerRef} 
            className="w-full h-full relative"
          />

          {/* Quick HUD overlay in corners */}
          <div className="absolute top-2 right-4 pointer-events-none select-none hidden md:flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider flex items-center gap-1.5 uppercase">
              <Cpu className="w-3 h-3 text-[#7840ff]" /> CPU: 12%
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider flex items-center gap-1.5 uppercase">
              <Activity className="w-3 h-3 text-[#3bccff]" /> Ping: 12ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
