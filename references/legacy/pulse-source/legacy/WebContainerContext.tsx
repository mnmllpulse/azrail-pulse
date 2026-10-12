import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface WebContainerContextType {
  fs: Record<string, string>;
  setFs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  installedPackages: Record<string, string>;
  isDevServerRunning: boolean;
  startDevServer: (writeStdout: (data: string) => void) => void;
  stopDevServer: () => void;
  installPackage: (name: string, writeStdout: (data: string) => void) => Promise<void>;
  runCommand: (cmd: string, writeStdout: (data: string) => void) => Promise<void>;
  terminalLogs: string[];
  clearTerminalLogs: () => void;
}

const WebContainerContext = createContext<WebContainerContextType | undefined>(undefined);

const defaultFiles: Record<string, string> = {
  'package.json': JSON.stringify({
    name: "pulse-user-app",
    version: "1.0.0",
    private: true,
    dependencies: {
      "react": "^19.0.1",
      "react-dom": "^19.0.1",
      "lucide-react": "^0.546.0"
    },
    scripts: {
      "dev": "vite",
      "build": "tsc && vite build"
    }
  }, null, 2),
  'src/App.tsx': `import React, { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-6 bg-gradient-to-br from-zinc-900 to-black text-white rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-4 text-center">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        <h1 className="text-lg font-bold font-mono text-indigo-200">Pulse User App</h1>
      </div>
      <p className="text-xs text-zinc-400 font-mono">Isolated browser WebContainer Sandbox running Node v20.10.0</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
      >
        <Zap className="w-4 h-4 text-amber-300" /> Count: {count}
      </button>
    </div>
  );
}`,
  'src/index.css': `@import "tailwindcss";\nbody {\n  background: #050505;\n  color: #fff;\n}`,
  'vite.config.ts': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()]\n});`
};

export const WebContainerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fs, setFs] = useState<Record<string, string>>(() => {
    // Attempt loading from localStorage
    const saved = localStorage.getItem('pulse_webcontainer_fs');
    return saved ? JSON.parse(saved) : defaultFiles;
  });

  const [installedPackages, setInstalledPackages] = useState<Record<string, string>>(() => {
    try {
      const pkgJson = JSON.parse(fs['package.json'] || '{}');
      return pkgJson.dependencies || {};
    } catch {
      return {};
    }
  });

  const [isDevServerRunning, setIsDevServerRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pulse_webcontainer_fs', JSON.stringify(fs));
    try {
      const pkgJson = JSON.parse(fs['package.json'] || '{}');
      setInstalledPackages(pkgJson.dependencies || {});
    } catch {}
  }, [fs]);

  const addLog = useCallback((log: string) => {
    setTerminalLogs(prev => {
      const next = [...prev, log];
      if (next.length > 500) next.shift(); // Bound log size
      return next;
    });
  }, []);

  const clearTerminalLogs = useCallback(() => {
    setTerminalLogs([]);
  }, []);

  const installPackage = useCallback(async (name: string, writeStdout: (data: string) => void) => {
    writeStdout(`\r\nnpm \x1b[34mnotice\x1b[0m fetch metadata for package: ${name}...\r\n`);
    addLog(`npm notice fetch metadata for package: ${name}...`);

    let pct = 0;
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        pct += 10;
        const barLength = Math.floor(pct / 5);
        const bar = '='.repeat(barLength) + ' '.repeat(20 - barLength);
        writeStdout(`\r\x1b[33mDownloading\x1b[0m [${bar}] ${pct}% | Extracting tarball...`);
        
        if (pct >= 100) {
          clearInterval(interval);
          writeStdout('\r\n');
          writeStdout(`\x1b[1;32m✓ added package ${name} and updated lockfile in 0.85s\x1b[0m\r\n`);
          addLog(`✓ added package ${name} and updated lockfile in 0.85s`);

          // Update virtual package.json
          setFs(prev => {
            try {
              const pkgJson = JSON.parse(prev['package.json'] || '{}');
              if (!pkgJson.dependencies) pkgJson.dependencies = {};
              pkgJson.dependencies[name] = '^1.0.0';
              return {
                ...prev,
                'package.json': JSON.stringify(pkgJson, null, 2)
              };
            } catch {
              return prev;
            }
          });

          resolve();
        }
      }, 100);
    });
  }, [addLog]);

  const startDevServer = useCallback((writeStdout: (data: string) => void) => {
    if (isDevServerRunning) {
      writeStdout('\r\n\x1b[1;31mDev server is already running!\x1b[0m\r\n');
      return;
    }

    setIsDevServerRunning(true);
    writeStdout('\r\n\x1b[1;35m⚡ WebContainer starting local server...\x1b[0m\r\n');
    writeStdout('\x1b[36m  vite v6.2.3 dev server running...\x1b[0m\r\n');
    writeStdout('  ➜  Local:   \x1b[1;36mhttp://localhost:5173/\x1b[0m\r\n');
    writeStdout('  ➜  Network: use --host to expose\r\n');
    writeStdout('  ➜  press h to show help\r\n\r\n');

    addLog('⚡ WebContainer starting local server...');
    addLog('vite v6.2.3 dev server running on http://localhost:5173/');

    toast.success('Vite development server started in browser WebContainer!');
  }, [isDevServerRunning, addLog]);

  const stopDevServer = useCallback(() => {
    setIsDevServerRunning(false);
    toast.info('Vite development server stopped.');
  }, []);

  const runCommand = useCallback(async (cmd: string, writeStdout: (data: string) => void) => {
    const parts = cmd.trim().split(/\s+/);
    const base = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    addLog(`$ ${cmd}`);

    if (!base) return;

    switch (base) {
      case 'ls':
      case 'dir': {
        writeStdout('\r\n');
        // Synthesise files
        const paths = Object.keys(fs);
        const folders = new Set<string>();
        const filesAtLevel = new Set<string>();

        const targetDir = args[0] || '';
        paths.forEach(p => {
          if (targetDir) {
            if (p.startsWith(targetDir + '/')) {
              const relative = p.slice(targetDir.length + 1);
              const segment = relative.split('/')[0];
              if (relative.includes('/')) {
                folders.add(segment);
              } else {
                filesAtLevel.add(segment);
              }
            }
          } else {
            const segment = p.split('/')[0];
            if (p.includes('/')) {
              folders.add(segment);
            } else {
              filesAtLevel.add(segment);
            }
          }
        });

        folders.forEach(f => {
          writeStdout(`\x1b[1;34m${f}/\x1b[0m   `);
        });
        filesAtLevel.forEach(f => {
          if (f !== '.keep') {
            writeStdout(`${f}   `);
          }
        });
        writeStdout('\r\n');
        break;
      }

      case 'cat': {
        const target = args[0];
        if (!target) {
          writeStdout('\r\n\x1b[1;31mcat: missing file operand\x1b[0m\r\n');
          break;
        }
        const content = fs[target];
        if (content === undefined) {
          writeStdout(`\r\n\x1b[1;31mcat: ${target}: No such file or directory\x1b[0m\r\n`);
        } else {
          writeStdout('\r\n' + content.replace(/\n/g, '\r\n') + '\r\n');
        }
        break;
      }

      case 'npm': {
        const sub = args[0]?.toLowerCase();
        if (sub === 'install' || sub === 'i') {
          const pkg = args[1] || 'lucide-react';
          await installPackage(pkg, writeStdout);
        } else if (sub === 'run' && args[1] === 'dev') {
          startDevServer(writeStdout);
        } else if (sub === 'run' && args[1] === 'build') {
          writeStdout('\r\n\x1b[1;35m⚡ running: npm run build...\x1b[0m\r\n');
          writeStdout('tsc && vite build\r\n');
          writeStdout('\x1b[32m✓ 21 modules bundled successfully inside /dist!\x1b[0m\r\n');
          addLog('✓ npm run build successfully bundled modules');
        } else {
          writeStdout(`\r\nUsage: npm install [package] or npm run dev/build\r\n`);
        }
        break;
      }

      case 'node': {
        const target = args[0];
        if (!target) {
          writeStdout('\r\nUsage: node [filename.ts/js]\r\n');
          break;
        }
        const content = fs[target];
        if (content === undefined) {
          writeStdout(`\r\n\x1b[1;31mnode: cannot find module '${target}'\x1b[0m\r\n`);
        } else {
          writeStdout(`\r\n\x1b[90m[evaluating ${target} inside isolated micro-engine...]\x1b[0m\r\n`);
          addLog(`node evaluating ${target}`);
          try {
            // Check if standard JS/TS console.log or functions exist
            // Strip imports or common modules to evaluate nicely
            const evalContent = content
              .replace(/import\s+.*?;/g, '')
              .replace(/export\s+/g, '');
            
            // Capture console.logs
            let logs: string[] = [];
            const originalConsoleLog = console.log;
            console.log = (...args) => {
              logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
            };

            try {
              // Simple JS safe eval
              const fn = new Function(evalContent);
              fn();
              console.log = originalConsoleLog;
              if (logs.length === 0) {
                writeStdout(`\x1b[90m(evaluated successfully, returned no stdout)\x1b[0m\r\n`);
              } else {
                writeStdout(logs.map(l => `\x1b[32m[stdout]\x1b[0m ${l}`).join('\r\n') + '\r\n');
              }
            } catch (e: any) {
              console.log = originalConsoleLog;
              writeStdout(`\x1b[1;31mRuntime Error:\x1b[0m ${e.message}\r\n`);
            }
          } catch (err: any) {
            writeStdout(`\x1b[1;31mCompilation/Execution Error:\x1b[0m ${err.message}\r\n`);
          }
        }
        break;
      }

      case 'neofetch': {
        writeStdout('\r\n');
        writeStdout('   \x1b[35m_/\\_/\\/\\____/\\_\x1b[0m     \x1b[1;35mPulse WebContainer Engine\x1b[0m\r\n');
        writeStdout('  \x1b[35m_/\\_/\\/\\__/\\_/\\/\\_\x1b[0m    -------------------------\r\n');
        writeStdout(' \x1b[35m_/\\___/\\/\\___/\\/\\_\x1b[0m   \x1b[36mHost\x1b[0m: In-Browser Sandboxed Container\r\n');
        writeStdout(' \x1b[35m_/\\___________/\\/\\_\x1b[0m  \x1b[36mKernel\x1b[0m: WebContainer Virtual-Process-v2\r\n');
        writeStdout('  \x1b[35m_/\\_________/\\/\\_\x1b[0m   \x1b[36mShell\x1b[0m: node-sh v20.10.0\r\n');
        writeStdout('   \x1b[35m_/\\/\\/\\___/\\/\\/\\_\x1b[0m    \x1b[36mUptime\x1b[0m: Active session\r\n');
        writeStdout('    \x1b[35m_/\\_/\\_/\\_/\\_\x1b[0m      \x1b[36mMemory\x1b[0m: Dynamic Shared ArrayBuffer\r\n');
        writeStdout('      \x1b[35m_/\\_/\\_/\\_\x1b[0m        \x1b[36mEnvironment\x1b[0m: React 19.0\r\n');
        writeStdout('\r\n');
        break;
      }

      case 'help': {
        writeStdout('\r\n\x1b[1;35mWebContainer CLI Tools:\x1b[0m\r\n');
        writeStdout('  \x1b[1;33mls\x1b[0m             List files in current workspace directory\r\n');
        writeStdout('  \x1b[1;33mcat [file]\x1b[0m     Output contents of a workspace file\r\n');
        writeStdout('  \x1b[1;33mnpm install [p]\x1b[0m Install modular dependencies dynamically\r\n');
        writeStdout('  \x1b[1;33mnpm run dev\x1b[0m    Launch the local virtual Vite development server\r\n');
        writeStdout('  \x1b[1;33mnode [file]\x1b[0m    Execute code from a TypeScript/JavaScript module\r\n');
        writeStdout('  \x1b[1;33mneofetch\x1b[0m       Render core system and sandbox architecture info\r\n');
        writeStdout('  \x1b[1;33mclear\x1b[0m          Flush console buffer\r\n\r\n');
        break;
      }

      default: {
        writeStdout(`\r\nsh: command not found: ${base}. Type 'help' for available CLI tools.\r\n`);
        break;
      }
    }
  }, [fs, installPackage, startDevServer, addLog]);

  return (
    <WebContainerContext.Provider value={{
      fs,
      setFs,
      installedPackages,
      isDevServerRunning,
      startDevServer,
      stopDevServer,
      installPackage,
      runCommand,
      terminalLogs,
      clearTerminalLogs
    }}>
      {children}
    </WebContainerContext.Provider>
  );
};

export const useWebContainer = () => {
  const context = useContext(WebContainerContext);
  if (!context) {
    throw new Error('useWebContainer must be used within a WebContainerProvider');
  }
  return context;
};
