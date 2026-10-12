const fs = require('fs');
let file = fs.readFileSync('src/components/ConceptWorkbench.tsx', 'utf8');

file = file.replace(/const handleRunCommand = async[\s\S]*?syncBridgeStatus\(\);\n    }\n  };/, `const handleRunCommand = async () => {
    if (commandRunning) return;
    setCommandRunning("synthesize");
    setConsoleLogs(prev => [...prev, \`> Initiating METATRON SYNTHESIS...\`]);

    try {
      const res = await fetch('/api/metatron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'synthesize', payload: { intent: commitMessage || 'Autonomous Synthesis' } })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setConsoleLogs(prev => [...prev, \`[SUCCESS]: \${data.data.message}\`]);
        toast.success('Synthesis completed successfully');
      } else {
        setConsoleLogs(prev => [...prev, \`[ERROR]: \${data.message}\`]);
        toast.error(\`Synthesis failed: \${data.message}\`);
      }
    } catch (err) {
      setConsoleLogs(prev => [...prev, \`[ERROR]: Network timeout communicating with METATRON CORE.\`]);
    } finally {
      setCommandRunning(null);
    }
  };`);

// Also replace the entire DevOps rendering block to simplify it.
// First, find the start and end of the block.

const startRegex = /\{activeTab === 'devops' && \(\n\s*<div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-\[#030304\] p-5 gap-6 font-mono">/;

// We need to just write a simple block.
const simplifiedBlock = `{activeTab === 'devops' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#030304] p-5 gap-6 font-mono">
            <div className="flex-1 flex flex-col bg-[#050507] border border-zinc-900 rounded-2xl p-8 overflow-hidden justify-center items-center">
              <h2 className="text-xl font-bold text-zinc-100 mb-2">METATRON OS</h2>
              <p className="text-sm text-zinc-500 mb-8 text-center max-w-md">Simplified Synthesis Engine. All scripts, health checks, and rollbacks are now handled atomically in a single click.</p>
              
              <div className="flex flex-col gap-4 w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Intent (e.g. Update navigation bar)"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  className="bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all"
                />
                
                <button
                  onClick={handleRunCommand}
                  disabled={!!commandRunning}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {commandRunning ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                      Synthesizing...
                    </>
                  ) : (
                    "ONE-CLICK SYNTHESIS"
                  )}
                </button>
              </div>

              <div className="w-full max-w-2xl mt-8 bg-black/60 rounded-xl p-4 overflow-y-auto h-48 space-y-2 text-xs text-zinc-400 font-mono scrollbar-thin select-text">
                <p className="text-emerald-500">// METATRON SYNTHESIS ENGINE ONLINE.</p>
                {consoleLogs.map((log, idx) => (
                  <p key={idx} className={log.startsWith('>') ? 'text-indigo-400 font-bold' : log.startsWith('[ERROR]') ? 'text-red-400' : 'text-zinc-300'}>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}`;

// I'll manually replace from activeTab === 'devops' down to its closing tag.
// Instead of complex regex, let's just find the index.
const startIndex = file.indexOf("{activeTab === 'devops' && (");
const endIndex = file.indexOf("{activeTab === 'validation' && (");

if (startIndex !== -1 && endIndex !== -1) {
  file = file.substring(0, startIndex) + simplifiedBlock + '\n\n        ' + file.substring(endIndex);
}

fs.writeFileSync('src/components/ConceptWorkbench.tsx', file, 'utf8');
