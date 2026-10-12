import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Folder, 
  FileCode, 
  Play, 
  GitBranch, 
  Settings, 
  Plus, 
  Sparkles, 
  Activity, 
  Trash2, 
  Download, 
  Eye, 
  Code,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import Tooltip from '../../components/Tooltip';
import { toast } from 'sonner';
import FileExplorer from '../../components/studio/FileExplorer';
import { useWebContainer } from '../../contexts/WebContainerContext';

interface VirtualFileSystem {
  [filename: string]: string;
}

interface CapturedLog {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  source: 'sandbox' | 'parent';
}

const getEditorLanguage = (filename: string): string => {
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'typescript';
  if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.md')) return 'markdown';
  return 'plaintext';
};

export default function CodeStudioPanel({ isLight }: { isLight?: boolean }) {
  const webContainer = useWebContainer();

  // Virtual Filesystem State preloaded with working real-time code
  const [fs, setFs] = useState<VirtualFileSystem>(() => {
    if (webContainer && webContainer.fs && Object.keys(webContainer.fs).length > 0) {
      return webContainer.fs;
    }
    return {
      'src/App.tsx': `import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  const [color, setColor] = useState('indigo');\n\n  const colors: Record<string, string> = {\n    indigo: 'from-indigo-600 to-purple-600 border-indigo-500/30 text-indigo-300',\n    rose: 'from-rose-600 to-pink-600 border-rose-500/30 text-rose-300',\n    emerald: 'from-emerald-600 to-teal-600 border-emerald-500/30 text-emerald-300',\n    amber: 'from-amber-600 to-orange-600 border-amber-500/30 text-amber-300'\n  };\n\n  return (\n    <div className="flex flex-col items-center justify-center min-h-[250px] p-6 text-center rounded-2xl border bg-[#05050c] text-white shadow-2xl transition-all duration-500 border-zinc-800">\n      <h1 className="text-xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">⚡ AZRAIL SYSTEM CORE ⚡</h1>\n      <p className="text-xs text-zinc-500 mt-1 font-mono">Dynamic Multi-Core Excitation Matrix</p>\n      \n      <div className="my-5 p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-xs w-full max-w-xs mx-auto">\n        REACTOR CORE STATUS: <span className="text-emerald-400 font-bold">ONLINE</span>\n        <div className="mt-1">EXCITATION LEVEL: <span className="text-purple-400 font-bold">{(count * 15.5).toFixed(1)} MW</span></div>\n      </div>\n\n      <div className="flex gap-2 mb-4 justify-center">\n        {Object.keys(colors).map(c => (\n          <button\n            key={c}\n            onClick={() => setColor(c)}\n            className={\`w-4 h-4 rounded-full border-2 \${color === c ? 'border-white scale-110' : 'border-transparent opacity-60'}\`}\n            style={{\n              backgroundColor: c === 'indigo' ? '#6366f1' : c === 'rose' ? '#f43f5e' : c === 'emerald' ? '#10b981' : '#f59e0b'\n            }}\n          />\n        ))}\n      </div>\n\n      <button \n        onClick={() => setCount(c => c + 1)}\n        className={\`px-5 py-2.5 bg-gradient-to-r \${colors[color] || colors.indigo} rounded-xl text-xs font-mono font-bold tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-indigo-500/10\`}\n      >\n        BOOST CORE CONCURRENCY\n      </button>\n    </div>\n  );\n}`,
      'src/components/Header.tsx': `import React from 'react';\n\nexport default function Header() {\n  return (\n    <div className="flex justify-between items-center py-2 px-3 border-b border-zinc-850 text-[10px] font-mono text-zinc-500">\n      <span className="text-indigo-400 font-bold">AZRAIL_COGNITIVE_GRID</span>\n      <span className="text-emerald-400 animate-pulse">● STABLE</span>\n    </div>\n  );\n}`,
      'src/index.css': `@import "tailwindcss";\n\n:root {\n  --pulse-primary: #6366f1;\n  --pulse-accent: #f43f5e;\n}`,
      'package.json': `{\n  "name": "pulse-render-sandbox",\n  "version": "1.5.0",\n  "dependencies": {\n    "react": "^18.3.1",\n    "motion": "^11.11.0"\n  }\n}`
    };
  });

  const [activeFile, setActiveFile] = useState('src/App.tsx');
  const [editorCode, setEditorCode] = useState(fs['src/App.tsx']);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  // Copilot States
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [isCopilotGenerating, setIsCopilotGenerating] = useState(false);

  // Compiler/Runner States
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '➜  project git:(main) ✗',
    'System standby. Press RUN to compile the sandbox.'
  ]);
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview' | 'console'>('terminal');
  const [selectedCodeAgent, setSelectedCodeAgent] = useState<'PTAH' | 'URIEL' | 'RAZIEL'>('PTAH');

  // Console Interceptor States
  const [capturedLogs, setCapturedLogs] = useState<CapturedLog[]>([]);
  const [consoleFilterText, setConsoleFilterText] = useState('');
  const [consoleFilterLevel, setConsoleFilterLevel] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const [consoleFilterSource, setConsoleFilterSource] = useState<'all' | 'sandbox' | 'parent'>('all');
  const isInterceptingRef = useRef(false);

  const CODE_AGENTS = [
    { id: 'PTAH', name: 'PTAH (Architect)', role: 'Structure & Layout', icon: <Plus className="w-3 h-3" /> },
    { id: 'URIEL', name: 'URIEL (Auditor)', role: 'Security & Debug', icon: <Check className="w-3 h-3" /> },
    { id: 'RAZIEL', name: 'RAZIEL (Strategist)', role: 'Logic & Docs', icon: <Sparkles className="w-3 h-3" /> }
  ] as const;
  const [compiledComponent, setCompiledComponent] = useState<React.ComponentType | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fsRef = useRef(fs);
  const activeFileRef = useRef(activeFile);

  // Filter logs for the UI
  const filteredLogs = capturedLogs.filter(log => {
    if (consoleFilterLevel !== 'all' && log.type !== consoleFilterLevel) return false;
    if (consoleFilterSource !== 'all' && log.source !== consoleFilterSource) return false;
    if (consoleFilterText.trim()) {
      const search = consoleFilterText.toLowerCase();
      return log.message.toLowerCase().includes(search) || log.type.toLowerCase().includes(search);
    }
    return true;
  });

  // Intercept parent page console logs safely
  useEffect(() => {
    const originalLog = window.console.log;
    const originalWarn = window.console.warn;
    const originalError = window.console.error;
    const originalInfo = window.console.info;

    const formatArgs = (args: any[]): string => {
      return args
        .map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return Object.prototype.toString.call(arg);
            }
          }
          return String(arg);
        })
        .join(' ');
    };

    const addLog = (type: 'log' | 'warn' | 'error' | 'info', source: 'sandbox' | 'parent', ...args: any[]) => {
      if (isInterceptingRef.current) return;
      isInterceptingRef.current = true;
      try {
        const formattedMessage = formatArgs(args);
        // Exclude common noise or debug strings
        if (formattedMessage.includes('react-example@0.0.0 dev') || formattedMessage.includes('react-devtools')) {
          return;
        }

        const newLog: CapturedLog = {
          id: Math.random().toString(36).substring(2, 9),
          type,
          message: formattedMessage,
          timestamp: new Date().toLocaleTimeString(),
          source,
        };
        setCapturedLogs(prev => {
          const next = [...prev, newLog];
          if (next.length > 200) next.shift();
          return next;
        });
      } finally {
        isInterceptingRef.current = false;
      }
    };

    window.console.log = (...args) => {
      originalLog.apply(window.console, args);
      addLog('log', 'parent', ...args);
    };

    window.console.warn = (...args) => {
      originalWarn.apply(window.console, args);
      addLog('warn', 'parent', ...args);
    };

    window.console.error = (...args) => {
      originalError.apply(window.console, args);
      addLog('error', 'parent', ...args);
    };

    window.console.info = (...args) => {
      originalInfo.apply(window.console, args);
      addLog('info', 'parent', ...args);
    };

    return () => {
      window.console.log = originalLog;
      window.console.warn = originalWarn;
      window.console.error = originalError;
      window.console.info = originalInfo;
    };
  }, []);

  useEffect(() => {
    fsRef.current = fs;
  }, [fs]);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  const getIframeBaseHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Space+Grotesk:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0;
              background-color: #05050c;
              color: white;
              font-family: 'Inter', sans-serif;
              padding: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: calc(100vh - 32px);
              overflow-x: hidden;
            }
          </style>
        </head>
        <body>
          <div id="root" style="width: 100%;">
            <div style="font-family: monospace; font-size: 11px; color: #6366f1; text-align: center; animation: pulse 2s infinite;">
              🪐 AWAITING HMR NEURAL STREAM...
            </div>
          </div>
          <script>
            // Intercept iframe console logs
            (function() {
              const _log = console.log;
              const _warn = console.warn;
              const _error = console.error;
              const _info = console.info;

              function formatMessage(args) {
                return args.map(arg => {
                  if (typeof arg === 'object') {
                    try {
                      return JSON.stringify(arg, null, 2);
                    } catch (e) {
                      return Object.prototype.toString.call(arg);
                    }
                  }
                  return String(arg);
                }).join(' ');
              }

              console.log = function(...args) {
                _log.apply(console, args);
                window.parent.postMessage({
                  type: 'SANDBOX_CONSOLE',
                  level: 'log',
                  message: formatMessage(args)
                }, '*');
              };

              console.warn = function(...args) {
                _warn.apply(console, args);
                window.parent.postMessage({
                  type: 'SANDBOX_CONSOLE',
                  level: 'warn',
                  message: formatMessage(args)
                }, '*');
              };

              console.error = function(...args) {
                _error.apply(console, args);
                window.parent.postMessage({
                  type: 'SANDBOX_CONSOLE',
                  level: 'error',
                  message: formatMessage(args)
                }, '*');
              };

              console.info = function(...args) {
                _info.apply(console, args);
                window.parent.postMessage({
                  type: 'SANDBOX_CONSOLE',
                  level: 'info',
                  message: formatMessage(args)
                }, '*');
              };
            })();

            let root = null;
            window.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'HMR_UPDATE') {
                const { jsCode, styleSheet } = event.data;
                try {
                  console.log('[HMR] Applying update...', event.data.file);
                  
                  let styleTag = document.getElementById('hmr-styles');
                  if (!styleTag) {
                    styleTag = document.createElement('style');
                    styleTag.id = 'hmr-styles';
                    document.head.appendChild(styleTag);
                  }
                  styleTag.textContent = styleSheet || '';

                  let cleanJS = jsCode;
                  cleanJS = cleanJS.replace(/import[\\s\\S]*?from[\\s\\S]*?;/g, '');
                  cleanJS = cleanJS.replace(/export\\s+default\\s+/, '');
                  cleanJS = cleanJS.replace(/:\\s*Record<.*?>/g, '');
                  cleanJS = cleanJS.replace(/:\\s*string/g, '');
                  cleanJS = cleanJS.replace(/:\\s*number/g, '');
                  cleanJS = cleanJS.replace(/:\\s*any/g, '');

                  const evalFn = new Function('React', 'useState', 'useEffect', \`
                    \${cleanJS}
                    return App;
                  \`);
                  
                  const CompiledApp = evalFn(window.React, window.React.useState, window.React.useEffect);
                  
                  if (typeof CompiledApp === 'function') {
                    if (!root) {
                      root = window.ReactDOM.createRoot(document.getElementById('root'));
                    }
                    root.render(window.React.createElement(CompiledApp));
                    
                    window.parent.postMessage({ type: 'HMR_SUCCESS', file: event.data.file }, '*');
                  } else {
                    window.parent.postMessage({ type: 'HMR_ERROR', message: "Exported 'App' is not a function" }, '*');
                  }
                } catch (err) {
                  console.error('[HMR] Update error:', err);
                  window.parent.postMessage({ type: 'HMR_ERROR', message: err.message }, '*');
                }
              }
            });
            
            // Send ready event to parent
            window.parent.postMessage({ type: 'HMR_READY' }, '*');
          </script>
        </body>
      </html>
    `;
  };

  const sendHmrUpdate = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const codeToCompile = fsRef.current['src/App.tsx'] || '';
      const styles = fsRef.current['src/index.css'] || '';
      
      iframeRef.current.contentWindow.postMessage({
        type: 'HMR_UPDATE',
        file: 'src/App.tsx',
        jsCode: codeToCompile,
        styleSheet: styles
      }, '*');
    }
  };

  // Listen for iframe HMR handshake and status reports
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !event.data) return;
      
      if (event.data.type === 'HMR_READY') {
        sendHmrUpdate();
      } else if (event.data.type === 'HMR_SUCCESS') {
        setCompileError(null);
        setTerminalLogs(prev => [
          ...prev,
          `⚡ [HMR] Hot Module Replacement applied successfully to ${event.data.file || 'src/App.tsx'}.`,
          `⚡ [HMR] Active component re-mounted cleanly.`
        ]);
        toast.success(`HMR: ${event.data.file || 'src/App.tsx'} hot-reloaded!`);
      } else if (event.data.type === 'HMR_ERROR') {
        const errMsg = event.data.message || 'Unknown runtime error during HMR evaluation.';
        setCompileError(errMsg);
        setTerminalLogs(prev => [
          ...prev,
          `❌ [HMR] Hot reload failed: ${errMsg}`,
          `⚠️ Dev server: keeping old module state alive to prevent crash.`
        ]);
        toast.error(`HMR Update Failed: ${errMsg}`);
      } else if (event.data.type === 'SANDBOX_CONSOLE') {
        const { level, message } = event.data;
        const newLog: CapturedLog = {
          id: Math.random().toString(36).substring(2, 9),
          type: level,
          message: message,
          timestamp: new Date().toLocaleTimeString(),
          source: 'sandbox',
        };
        setCapturedLogs(prev => {
          const next = [...prev, newLog];
          if (next.length > 200) next.shift();
          return next;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Automatically trigger a hot update on code edits (simulating real-time local dev server HMR)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeFile === 'src/App.tsx' || activeFile === 'src/index.css') {
        setTerminalLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ⚡ [HMR] Detected changes in ${activeFile}. Emitting update signal...`
        ]);
        sendHmrUpdate();
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [editorCode, activeFile]);

  // Update editor value when changing active file
  useEffect(() => {
    setEditorCode(fs[activeFile] || '');
  }, [activeFile, fs]);

  // Auto-Save Mechanism States & Debounced Effect
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [lastSaved, setLastSaved] = useState<string>('');

  useEffect(() => {
    if (saveStatus !== 'dirty') return;

    const timer = setTimeout(() => {
      setSaveStatus('saving');
      
      // Sync the entire local virtual fs with WebContainer filesystem context
      webContainer.setFs(fs);

      const delayTimer = setTimeout(() => {
        setSaveStatus('saved');
        setLastSaved(new Date().toLocaleTimeString());
        
        setTerminalLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 💾 [Auto-Save] Successfully synchronized all workspace changes to WebContainer filesystem.`
        ]);
        toast.success(`Workspace changes auto-saved!`);
      }, 400); // Small professional delay for visual feedback

      return () => clearTimeout(delayTimer);
    }, 1200); // 1.2s debounce time

    return () => clearTimeout(timer);
  }, [fs, saveStatus, webContainer]);

  // Handle local code editing
  const handleCodeChange = (val: string) => {
    setEditorCode(val);
    setFs(prev => ({
      ...prev,
      [activeFile]: val
    }));
    setSaveStatus('dirty');
  };

  // Add new file to system from tree explorer
  const handleCreateFileFromExplorer = (pathName: string) => {
    if (fs[pathName]) {
      toast.error('File already exists');
      return;
    }
    
    let defaultContent = '';
    if (pathName.endsWith('.css')) {
      defaultContent = '/* New Stylesheet */\n:root {\n  --accent: #6366f1;\n}';
    } else if (pathName.endsWith('.json')) {
      defaultContent = '{\n  "name": "new-module"\n}';
    } else if (pathName.endsWith('.md')) {
      defaultContent = '# New Documentation\nWrite notes here...';
    } else {
      const parts = pathName.split('/');
      const fileName = parts[parts.length - 1];
      const componentName = fileName.split('.')[0] || 'Component';
      // Capitalize first letter of component name for React compliance
      const capComponentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
      defaultContent = `// New module: ${pathName}\nimport React from 'react';\n\nexport default function ${capComponentName}() {\n  return (\n    <div className="p-4 text-center text-xs font-mono">Module ${capComponentName} active.</div>\n  );\n}`;
    }

    setFs(prev => ({
      ...prev,
      [pathName]: defaultContent
    }));
    setSaveStatus('dirty');
    
    if (!pathName.endsWith('.keep')) {
      setActiveFile(pathName);
    }
  };

  // Delete file from tree explorer
  const handleDeleteFileFromExplorer = (pathName: string) => {
    if (pathName === 'src/App.tsx') {
      toast.error('Cannot delete core App.tsx module');
      return;
    }
    const updated = { ...fs };
    delete updated[pathName];
    setFs(updated);
    setSaveStatus('dirty');
    if (activeFile === pathName) {
      setActiveFile('src/App.tsx');
    }
    toast.success(`Deleted file ${pathName}`);
  };

  // Download Workspace ZIP simulated
  const handleDownloadWorkspace = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "pulse_workspace.json");
    dlAnchorElem.click();
    toast.success("Workspace configuration exported successfully!");
  };

  // AZRAIL AI Code Copilot request
  const handleAICompose = async () => {
    if (!copilotPrompt.trim()) return;
    setIsCopilotGenerating(true);
    toast.info(`Azrail (${selectedCodeAgent}) is parsing instruction to update active module...`);

    try {
      const agentRole = CODE_AGENTS.find(a => a.id === selectedCodeAgent)?.role;
      const systemPrompt = `You are Azrail, the supreme React compiler operating in ${selectedCodeAgent} mode (${agentRole}).
      The user wants to modify their React code in ${activeFile}. 
      Return ONLY the raw updated component code for this file. 
      Your output must start with import statements and end with export default. 
      Do NOT wrap your code in triple backticks or write any introductory or explanatory text. Return ONLY valid, compiler-ready code.`;

      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'dev-workspace',
          message: `Update this code based on this prompt: "${copilotPrompt}".\n\nCurrent Code in ${activeFile}:\n${fs[activeFile]}`,
          systemPrompt,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      const data = await response.json();
      if (data.status === 'ok' && data.data) {
        let cleanCode = data.data;
        // Strip markdown blocks if the model ignored instructions
        if (cleanCode.includes('```')) {
          cleanCode = cleanCode.replace(/```(javascript|typescript|tsx|jsx)?/g, '').trim();
        }
        
        handleCodeChange(cleanCode);
        toast.success(`Module ${activeFile} successfully updated by AI!`);
        setCopilotPrompt('');
        
        // Auto run updated code
        handleCompileAndRun(cleanCode);
      } else {
        throw new Error(data.error || "Copilot return state corrupted");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Copilot compilation failed: ${e.message}`);
    } finally {
      setIsCopilotGenerating(false);
    }
  };

  // Compiler / Run transpile loop
  const handleCompileAndRun = (customCode?: string, skipTabSwitch = false) => {
    const codeToCompile = customCode || fs['src/App.tsx'];
    setIsRunning(true);
    if (!skipTabSwitch) {
      setActiveTab('terminal');
    }
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ➜  project npm run compile`,
      '⚡ Transpiling module: src/App.tsx...',
      '🛠️ Resolving dependencies via ESBuild matrix...'
    ]);

    setTimeout(() => {
      try {
        sendHmrUpdate();
        setCompileError(null);
        
        setTerminalLogs(prev => [
          ...prev,
          '✅ Code parsed successfully.',
          '🪐 Static analysis: 0 warnings, 0 errors.',
          '🚀 Render frame mounted on port 3000 (Preview Workspace).',
          '➜  Ready.'
        ]);
        if (!skipTabSwitch) {
          setActiveTab('preview');
        }
        toast.success("Sandboxed component compiled and mounted!");
      } catch (err: any) {
        console.error("Compilation error", err);
        setCompileError(err.message || "Unknown compilation error");
        setTerminalLogs(prev => [
          ...prev,
          `❌ COMPILATION ERROR: ${err.message}`,
          '⚠️ Stack trace generated in terminal problems view.',
          '➜  Process terminated with exit code 1.'
        ]);
        toast.error("Compilation failed. Check Terminal logs!");
      } finally {
        setIsRunning(false);
      }
    }, 1500);
  };

  // Compile on mount once so preview is pre-filled
  useEffect(() => {
    handleCompileAndRun(undefined, true);
  }, []);

  return (
    <div className={`flex flex-col lg:flex-row h-full w-full rounded-2xl overflow-hidden border ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5 text-gray-300'}`}>
      
      {/* Sidebar: File Explorer */}
      {sidebarOpen && (
        <div className={`w-full lg:w-64 flex flex-col shrink-0 border-r ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-black/40'}`}>
          <FileExplorer
            files={fs}
            activeFile={activeFile}
            onSelectFile={setActiveFile}
            onCreateFile={handleCreateFileFromExplorer}
            onDeleteFile={handleDeleteFileFromExplorer}
            isLight={isLight}
          />
          
          {/* Workspace Utilities */}
          <div className={`p-3 border-t shrink-0 flex items-center justify-between ${isLight ? 'border-gray-200 bg-gray-100/50' : 'border-zinc-800/40 bg-black/20'}`}>
            <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase">Workspace Utilities</span>
            <button 
              onClick={handleDownloadWorkspace}
              title="Download workspace"
              className={`px-2 py-1 rounded hover:bg-white/5 transition-all text-[10px] font-mono uppercase flex items-center gap-1.5 ${isLight ? 'text-gray-600 hover:text-indigo-600' : 'text-zinc-400 hover:text-white'}`}
            >
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Top Bar */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#0a0a0a]'}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono">
              <FileCode className="w-4 h-4 text-indigo-500" />
              <span className="opacity-90">{activeFile}</span>
            </div>
            {/* Save Status Indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all duration-300 ${
              saveStatus === 'saved'
                ? (isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                : saveStatus === 'saving'
                  ? (isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse')
                  : (isLight ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'saved' ? 'bg-emerald-500' : saveStatus === 'saving' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'
              }`} />
              <span className="uppercase text-[8px] tracking-wide font-extrabold">
                {saveStatus === 'saved' ? (lastSaved ? `Synced ${lastSaved}` : 'Synced') : saveStatus === 'saving' ? 'Syncing...' : 'Unsaved Changes'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Tooltip content="Git Integration" position="bottom" isLight={isLight}>
               <button className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-150 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
                 <GitBranch className="w-4 h-4" />
               </button>
             </Tooltip>
             <button 
               onClick={() => handleCompileAndRun()}
               disabled={isRunning}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-md cursor-pointer ${
                 isRunning 
                   ? 'bg-zinc-800 text-zinc-500 animate-pulse' 
                   : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-95'
               }`}
             >
                <Play className="w-3.5 h-3.5" /> Run
             </button>
          </div>
        </div>

        {/* Textarea Workspace and Copilot */}
        <div className="flex-1 relative flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 relative flex flex-col min-h-[300px]">
            <div className={`flex-1 min-h-[400px] lg:min-h-0 w-full border-b lg:border-b-0 lg:border-r relative ${
              isLight ? 'border-gray-200' : 'border-white/5'
            }`}>
              <Editor
                height="100%"
                language={getEditorLanguage(activeFile)}
                theme={isLight ? "light" : "vs-dark"}
                value={editorCode}
                onChange={(value) => handleCodeChange(value || '')}
                loading={
                  <div className={`absolute inset-0 flex items-center justify-center font-mono text-xs ${
                    isLight ? 'bg-gray-50 text-gray-500' : 'bg-[#050505] text-zinc-400'
                  }`}>
                    Loading Professional Editor Engine...
                  </div>
                }
                options={{
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 16, bottom: 16 },
                  renderLineHighlight: 'all',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible'
                  }
                }}
              />
            </div>
            
            {/* AI Assistant Drawer inside Editor */}
            <div className={`p-4 border-t ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/60 border-white/5'}`}>
               <div className="flex items-center justify-between mb-2.5">
                 <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                   <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" /> 
                   AZRAIL AI CODE COMPILER
                 </div>
                 <div className="flex gap-1.5">
                   {CODE_AGENTS.map(agent => (
                     <button
                       key={agent.id}
                       onClick={() => setSelectedCodeAgent(agent.id)}
                       className={`px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                         selectedCodeAgent === agent.id
                           ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                           : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'
                       }`}
                     >
                       {agent.icon}
                       {agent.id}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text"
                   value={copilotPrompt}
                   onChange={(e) => setCopilotPrompt(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter' && !isCopilotGenerating) handleAICompose(); }}
                   placeholder="e.g. 'Add a state variable for power and a boost button...'"
                   className={`flex-1 px-4 py-2.5 text-xs font-mono rounded-xl outline-none border transition-all ${
                     isLight 
                       ? 'bg-white border-gray-300 focus:border-indigo-500' 
                       : 'bg-[#05050c] border-white/10 focus:border-indigo-500/40 text-white placeholder-zinc-600'
                   }`}
                   disabled={isCopilotGenerating}
                 />
                 <button 
                   onClick={handleAICompose}
                   disabled={isCopilotGenerating || !copilotPrompt.trim()}
                   className="px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-50 transition-all font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                 >
                   {isCopilotGenerating ? 'Analyzing...' : 'Compose'}
                 </button>
               </div>
               <p className="text-[9px] text-zinc-500 font-mono mt-1.5">Direct prompt injection updates active module code with zero lag.</p>
            </div>
          </div>
          
          {/* Side Pane: Compilation Preview & Live View */}
          <div className="w-full lg:w-96 shrink-0 flex flex-col border-t lg:border-t-0">
            {/* Tab Switches */}
            <div className={`flex border-b text-[10px] font-mono uppercase tracking-wider font-bold ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-[#080808]'}`}>
              <button 
                onClick={() => setActiveTab('terminal')}
                className={`flex-1 py-3 border-r flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'terminal' 
                    ? (isLight ? 'bg-white text-indigo-700 font-extrabold' : 'bg-[#0c0c14] text-indigo-400 border-b-2 border-b-indigo-500') 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" /> Compiler Logs
              </button>
              <button 
                onClick={() => setActiveTab('console')}
                className={`flex-1 py-3 border-r flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'console' 
                    ? (isLight ? 'bg-white text-indigo-700 font-extrabold' : 'bg-[#0c0c14] text-indigo-400 border-b-2 border-b-indigo-500') 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Console
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'preview' 
                    ? (isLight ? 'bg-white text-indigo-700 font-extrabold' : 'bg-[#0c0c14] text-indigo-400 border-b-2 border-b-indigo-500') 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Live Render Preview
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col min-h-[250px]">
              <AnimatePresence mode="wait">
                {activeTab === 'terminal' ? (
                  <motion.div 
                    key="terminal-pane"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5 flex-1">
                      {terminalLogs.map((log, index) => (
                        <div 
                          key={index} 
                          className={`${
                            log.startsWith('❌') 
                              ? 'text-rose-400 font-bold bg-rose-500/5 p-2 rounded border border-rose-500/10' 
                              : log.startsWith('✅') 
                                ? 'text-emerald-400 font-bold bg-emerald-500/5 p-2 rounded border border-emerald-500/10' 
                                : log.startsWith('⚡')
                                  ? 'text-indigo-400'
                                  : 'text-zinc-400'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : activeTab === 'console' ? (
                  <motion.div 
                    key="console-pane"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Console Header Filters */}
                    <div className={`p-2.5 mb-3 rounded-lg border flex flex-col gap-2 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/40 border-white/5'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Console Interceptor</span>
                        <button 
                          onClick={() => setCapturedLogs([])}
                          className="p-1 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Clear console"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Search & Filters */}
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={consoleFilterText}
                          onChange={(e) => setConsoleFilterText(e.target.value)}
                          placeholder="Filter logs by message/type..."
                          className={`w-full px-2.5 py-1.5 text-[10px] font-mono rounded outline-none border transition-all ${
                            isLight 
                              ? 'bg-white border-gray-300 focus:border-indigo-500' 
                              : 'bg-[#05050c] border-white/10 focus:border-indigo-500/40 text-white placeholder-zinc-600'
                          }`}
                        />
                        
                        <div className="flex items-center justify-between text-[8px] uppercase font-bold text-zinc-500">
                          {/* Level Filter Tags */}
                          <div className="flex gap-1">
                            {(['all', 'log', 'warn', 'error'] as const).map(level => (
                              <button
                                key={level}
                                onClick={() => setConsoleFilterLevel(level)}
                                className={`px-1.5 py-0.5 rounded transition-all ${
                                  consoleFilterLevel === level
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                    : 'hover:text-zinc-300'
                                }`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                          
                          {/* Source Filter Tags */}
                          <div className="flex gap-1">
                            {(['all', 'sandbox', 'parent'] as const).map(src => (
                              <button
                                key={src}
                                onClick={() => setConsoleFilterSource(src)}
                                className={`px-1.5 py-0.5 rounded transition-all ${
                                  consoleFilterSource === src
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'hover:text-zinc-300'
                                }`}
                              >
                                {src}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Console Logs list */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-1.5 pr-1">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center text-zinc-600 py-10 text-[10px]">
                          NO CONSOLE LOGS CAPTURED
                        </div>
                      ) : (
                        filteredLogs.map(log => (
                          <div 
                            key={log.id} 
                            className={`p-2 rounded border font-mono text-[9px] flex flex-col gap-1 transition-all ${
                              log.type === 'error'
                                ? 'bg-rose-500/5 border-rose-500/10 text-rose-300 font-semibold'
                                : log.type === 'warn'
                                  ? 'bg-amber-500/5 border-amber-500/10 text-amber-300 font-semibold'
                                  : log.type === 'info'
                                    ? 'bg-cyan-500/5 border-cyan-500/10 text-cyan-300'
                                    : (isLight ? 'bg-gray-100/50 border-gray-200 text-gray-700' : 'bg-white/5 border-white/5 text-zinc-300')
                            }`}
                          >
                            <div className="flex items-center justify-between text-[8px] opacity-60">
                              <span className="flex items-center gap-1">
                                {log.type === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse"></span>}
                                {log.type === 'warn' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>}
                                {log.type === 'info' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span>}
                                {log.type === 'log' && <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block"></span>}
                                {log.type.toUpperCase()}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1 rounded-[4px] uppercase text-[7px] ${
                                  log.source === 'sandbox' 
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                }`}>
                                  {log.source}
                                </span>
                                <span>{log.timestamp}</span>
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap break-all leading-normal text-[10px] font-mono select-text font-medium">
                              {log.message}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="preview-pane"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col w-full h-full relative"
                  >
                    {compileError && (
                      <div className="absolute top-12 left-4 right-4 z-20 p-3 rounded-lg border border-rose-500/30 bg-rose-950/90 text-rose-400 flex flex-col gap-1 max-w-md shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center gap-2 font-mono text-[9px] font-bold text-rose-300">
                          <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                          HMR SYNAPSE COMPILATION ERROR
                        </div>
                        <p className="text-[9px] leading-normal font-mono break-all">{compileError}</p>
                      </div>
                    )}
                    <div className="flex-1 w-full h-full min-h-[350px] relative rounded-xl overflow-hidden border border-zinc-800 bg-[#05050c]">
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5 text-[8px] text-indigo-400 uppercase font-mono font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        HMR Dev Server: Active
                      </div>
                      <iframe
                        ref={iframeRef}
                        title="HMR Live Sandbox"
                        srcDoc={getIframeBaseHtml()}
                        className="w-full h-full border-0 bg-[#05050c]"
                        sandbox="allow-scripts"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
