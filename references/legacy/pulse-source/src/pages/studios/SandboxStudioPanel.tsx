import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Play, Maximize2, UploadCloud, Save, 
  Settings, RefreshCw, Layers, Cpu, Code2, 
  Database, Network, Zap, ShieldAlert, Monitor, Download, Check, FileCode, FileJson, FileType, Trash2, Plus
} from 'lucide-react';
import { useSystemState } from '../../contexts/SystemStateContext';
import { toast } from 'sonner';

import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';

interface VirtualFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

const defaultFiles: VirtualFile[] = [
  {
    id: '1',
    name: 'index.html',
    language: 'html',
    content: '<h1>DARK MNMLL PULSE OS Core Sandbox</h1>\n<div id="app"></div>\n<button id="btn">Click me</button>'
  },
  {
    id: '2',
    name: 'styles.css',
    language: 'css',
    content: 'body {\n  font-family: monospace;\n  background: #0a0a0a;\n  color: #fff;\n}\n\nh1 {\n  color: #4ade80;\n  text-transform: uppercase;\n  letter-spacing: 2px;\n}\n\nbutton {\n  background: #4ade80;\n  color: #000;\n  border: none;\n  padding: 8px 16px;\n  font-family: monospace;\n  cursor: pointer;\n  margin-top: 20px;\n}'
  },
  {
    id: '3',
    name: 'script.js',
    language: 'javascript',
    content: 'console.log("Pulse OS Sandbox initialized.");\n\ndocument.getElementById("app").innerText = "JavaScript runtime active.";\n\ndocument.getElementById("btn").addEventListener("click", () => {\n  console.warn("System Interaction Detected");\n});'
  }
];

export default function SandboxStudioPanel({ isLight }: { isLight: boolean }) {
  const { uiPreferences, isAdmin } = useSystemState();
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'synth' | 'os'>('preview');
  
  const [files, setFiles] = useState<VirtualFile[]>(defaultFiles);
  const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
  
  const [previewFile, setPreviewFile] = useState<{ url: string, type: string, name: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [consoleLogs, setConsoleLogs] = useState<{id: string, level: string, message: string}[]>([]);
  const [showConsole, setShowConsole] = useState(true);

  // Cloudflare 189 Models Simulation State
  const [selectedModels, setSelectedModels] = useState<string[]>(['@cf/meta/llama-3.3-70b-instruct-fp8-fast']);
  const availableModels = [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'gemini-3.1-flash', 'claude-3-opus', 'gpt-4o', 
    'llama-3-70b', 'mixtral-8x22b', 'qwq-32b', 'command-r-plus', 'deepseek-coder'
  ];

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data && e.data.type === 'CONSOLE_LOG') {
        setConsoleLogs(prev => [...prev.slice(-199), {
          id: Math.random().toString(36).substr(2, 9),
          level: e.data.level,
          message: String(e.data.message).slice(0, 4000)
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const runPreview = () => {
    if (activeTab === 'preview' && iframeRef.current && !previewFile) {
      if (iframeRef.current) {
        setConsoleLogs([]); // Clear logs on run
        
        const html = files.find(f => f.name === 'index.html')?.content || '';
        const css = files.find(f => f.name === 'styles.css')?.content || '';
        const js = files.find(f => f.name === 'script.js')?.content || '';

        const interceptorScript = `
          <script>
            (function() {
              const originalLog = console.log;
              const originalError = console.error;
              const originalWarn = console.warn;
              
              window.console.log = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'log', message: args.join(' ') }, '*');
                originalLog.apply(console, args);
              };
              window.console.error = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: args.join(' ') }, '*');
                originalError.apply(console, args);
              };
              window.console.warn = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'warn', message: args.join(' ') }, '*');
                originalWarn.apply(console, args);
              };
              
              window.onerror = function(message, source, lineno, colno, error) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: message + ' at ' + lineno + ':' + colno }, '*');
              };
            })();
          </script>
        `;

        const content = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { margin: 0; padding: 20px; font-family: sans-serif; background: ${isLight ? '#f9fafb' : '#0a0a0a'}; color: ${isLight ? '#111827' : '#f3f4f6'}; }
                * { box-sizing: border-box; }
              </style>
              <style>${css}</style>
              ${interceptorScript}
            </head>
            <body>
              ${html}
              <script>
                try {
                  ${js}
                } catch(e) {
                  console.error(e.message);
                }
              </script>
            </body>
          </html>
        `;

        iframeRef.current.srcdoc = content;
      }
    }
  };

  useEffect(() => {
    // Only auto-run if we are on preview tab
    if (activeTab === 'preview') {
      runPreview();
    }
  }, [files, activeTab, isLight, previewFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewFile({ url, type: file.type, name: file.name });
    setActiveTab('preview');
  };

  const toggleModel = (model: string) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(prev => prev.filter(m => m !== model));
    } else {
      if (selectedModels.length >= 10) {
        toast.error("Maximum 10 simultaneous AI models allowed.");
        return;
      }
      setSelectedModels(prev => [...prev, model]);
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);

  const handleCodeChange = (newCode: string) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content: newCode } : f));
  };

  const highlightCode = (code: string) => {
    if (!activeFile) return code;
    let grammar = Prism.languages.javascript;
    if (activeFile.language === 'html') grammar = Prism.languages.markup;
    if (activeFile.language === 'css') grammar = Prism.languages.css;
    
    return Prism.highlight(code, grammar, activeFile.language);
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.html')) return <Monitor className="w-3.5 h-3.5 text-orange-400" />;
    if (filename.endsWith('.css')) return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    if (filename.endsWith('.js')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
    return <FileType className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div className={`h-full flex flex-col gap-6 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
      
      {/* Header / Admin Warning */}
      <div className="flex items-center justify-between border-b pb-4 border-white/10 shrink-0">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-widest uppercase flex items-center gap-3">
            <Layers className="w-6 h-6 text-pulse-primary" />
            Full-Stack Sandbox Core
            {isAdmin && <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-1 rounded-full animate-pulse">ADMIN PRIVILEGES ACTIVE</span>}
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-2 uppercase tracking-widest">
            Multi-modal rendering • 10-Way AI Concurrency • Root Access
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Toolbar */}
        <div className="w-64 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar shrink-0">
          
          {/* Tabs */}
          <div className="flex flex-col gap-2">
            {[
              { id: 'preview', label: 'Live Preview', icon: Monitor },
              { id: 'code', label: 'Code Editor', icon: Code2 },
              { id: 'synth', label: 'AI Synthesizer', icon: Cpu },
              { id: 'os', label: 'Pulse OS Kernel', icon: Zap },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-3 rounded-xl flex items-center gap-3 text-xs font-mono uppercase tracking-wider transition-all border ${
                  activeTab === tab.id 
                    ? 'bg-pulse-primary text-white border-pulse-primary shadow-lg shadow-pulse-primary/20 font-bold' 
                    : isLight ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-[#0f0f0f] border-white/5 hover:bg-white/5 text-gray-400'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-white/10 my-2" />

          {/* AI Model Selector */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Cloudflare AI Mesh</h3>
              <span className="text-[10px] font-mono text-pulse-primary">{selectedModels.length}/10</span>
            </div>
            
            <div className="flex flex-col gap-2">
              {availableModels.map(model => (
                <button
                  key={model}
                  onClick={() => toggleModel(model)}
                  className={`flex items-center justify-between p-2 rounded-lg text-[10px] font-mono transition-all border ${
                    selectedModels.includes(model)
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                      : isLight ? 'border-gray-200 hover:bg-gray-50 text-gray-600' : 'border-white/5 hover:bg-white/5 text-gray-500'
                  }`}
                >
                  <span className="truncate">{model}</span>
                  {selectedModels.includes(model) && <Check className="w-3 h-3" />}
                </button>
              ))}
              <div className="text-[9px] text-gray-500 text-center font-mono mt-1">+ 180 hidden models</div>
            </div>
          </div>

        </div>

        {/* Main Work Area */}
        <div className={`flex-1 rounded-2xl border flex flex-col overflow-hidden relative ${isLight ? 'bg-white border-gray-200' : 'bg-[#0a0a0a] border-white/10 shadow-2xl'}`}>
          
          {activeTab === 'preview' && (
            <div className="w-full h-full relative flex flex-col bg-zinc-950">
              {previewFile ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-white/10">
                    <span className="text-xs font-mono text-zinc-300 truncate">{previewFile.name}</span>
                    <button onClick={() => setPreviewFile(null)} className="text-[10px] uppercase font-mono text-zinc-500 hover:text-white px-2 py-1 bg-white/5 rounded">Close File</button>
                  </div>
                  <div className="flex-1 w-full h-full p-4 flex items-center justify-center overflow-auto">
                    {previewFile.type.startsWith('image/') ? (
                      <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain" />
                    ) : previewFile.type.startsWith('video/') ? (
                      <video src={previewFile.url} controls className="max-w-full max-h-full" />
                    ) : previewFile.type.startsWith('audio/') ? (
                      <div className="w-full max-w-md p-6 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-4">
                        <div className="w-16 h-16 rounded-full bg-pulse-primary/20 flex items-center justify-center mx-auto animate-pulse">
                          <Play className="w-8 h-8 text-pulse-primary ml-1" />
                        </div>
                        <audio src={previewFile.url} controls className="w-full" />
                      </div>
                    ) : previewFile.type === 'application/pdf' ? (
                      <iframe src={previewFile.url} className="w-full h-full rounded border-0" />
                    ) : (
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                          <UploadCloud className="w-8 h-8 text-zinc-500" />
                        </div>
                        <p className="text-sm font-mono text-zinc-400">Preview not supported for this file type.</p>
                        <a href={previewFile.url} download={previewFile.name} className="mt-4 inline-block px-4 py-2 bg-pulse-primary text-white text-xs font-mono rounded">Download File</a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 relative min-h-0">
                    <iframe 
                      ref={iframeRef}
                      className="w-full h-full border-0 bg-transparent"
                      title="Sandbox Preview"
                      sandbox="allow-scripts"
                    />
                    
                    {/* Floating Toolbar */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-all" title="Upload Media/PDF">
                        <UploadCloud className="w-4 h-4" />
                      </button>
                      <button onClick={runPreview} className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-all" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowConsole(!showConsole)} className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-all" title="Toggle Console">
                        <Terminal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Terminal Console */}
                  {showConsole && (
                    <div className="h-48 shrink-0 bg-[#0E0B25] border-t border-purple-950/50 flex flex-col">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#0A081C] border-b border-purple-950/50">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-pulse-primary" />
                          <span className="text-xs font-mono font-bold uppercase tracking-widest text-pulse-primary">Console</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setConsoleLogs([])} className="text-[10px] font-mono text-gray-500 hover:text-white uppercase">Clear</button>
                          <button onClick={() => setShowConsole(false)} className="text-[10px] font-mono text-gray-500 hover:text-white uppercase">Close</button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-3 font-mono text-xs space-y-1">
                        {consoleLogs.map(log => (
                          <div key={log.id} className={`flex items-start gap-2 ${
                            log.level === 'error' ? 'text-red-400 bg-red-500/10 p-1 rounded' : 
                            log.level === 'warn' ? 'text-amber-400' : 'text-gray-300'
                          }`}>
                            <span className="opacity-50 select-none">{'>'}</span>
                            <span className="break-all whitespace-pre-wrap">{log.message}</span>
                          </div>
                        ))}
                        {consoleLogs.length === 0 && (
                          <div className="text-gray-600 italic">No output...</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div className="w-full h-full flex overflow-hidden">
              {/* Virtual File System Sidebar */}
              <div className={`w-48 shrink-0 border-r flex flex-col ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/10'}`}>
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-gray-500">Explorer</span>
                  <button className="text-gray-500 hover:text-pulse-primary transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-2 flex flex-col gap-1">
                  {files.map(file => (
                    <button
                      key={file.id}
                      onClick={() => setActiveFileId(file.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all ${
                        activeFileId === file.id
                          ? 'bg-pulse-primary/20 text-pulse-primary'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      {getFileIcon(file.name)}
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
                <div className="h-10 shrink-0 bg-[#2d2d2d] flex items-center px-4 border-b border-black/50">
                  {activeFile && (
                    <div className="flex items-center gap-2">
                      {getFileIcon(activeFile.name)}
                      <span className="text-xs font-mono text-gray-300">{activeFile.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  {activeFile && (
                    <Editor
                      value={activeFile.content}
                      onValueChange={handleCodeChange}
                      highlight={highlightCode}
                      padding={10}
                      style={{
                        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                        fontSize: 14,
                        backgroundColor: 'transparent',
                        color: '#d4d4d4',
                        minHeight: '100%',
                      }}
                      className="editor-container"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'synth' && (
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="max-w-md w-full flex flex-col gap-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full border border-pulse-primary/50 flex items-center justify-center bg-pulse-primary/10 animate-pulse">
                  <Cpu className="w-10 h-10 text-pulse-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-mono text-pulse-primary mb-2">Omni-Model Synthesizer</h3>
                  <p className="text-xs text-gray-400 font-mono">Routing task through {selectedModels.length} active AI clusters simultaneously.</p>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pulse-primary to-purple-500 w-1/3 animate-ping" />
                </div>
                <button className="py-3 rounded-xl bg-pulse-primary text-white font-bold font-mono text-xs uppercase tracking-widest hover:bg-pulse-primary/80 transition-all shadow-lg shadow-pulse-primary/20">
                  Synthesize Result
                </button>
              </div>
            </div>
          )}

          {activeTab === 'os' && (
            <div className="w-full h-full p-8 flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Zap className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold font-mono text-emerald-400 uppercase tracking-widest">DARK MNMLL PULSE OS Kernel</h3>
              </div>
              
              {!isAdmin ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5" />
                  ACCESS DENIED. Only Creator/Admin can access kernel compilation.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-gray-400 font-mono leading-relaxed">
                    Real-time generation and improvement of system core architecture.
                    Infinite rollback enabled.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <button className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col gap-2">
                        <span className="text-xs font-bold font-mono text-white">Generate Core Update</span>
                        <span className="text-[10px] text-gray-500 font-mono">Compile new UI/UX patterns</span>
                     </button>
                     <button className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col gap-2">
                        <span className="text-xs font-bold font-mono text-white">Rollback Snapshot</span>
                        <span className="text-[10px] text-gray-500 font-mono">Revert to stable version</span>
                     </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
