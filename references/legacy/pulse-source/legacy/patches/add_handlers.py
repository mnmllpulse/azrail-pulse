import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

handlers = """
  const handleGitSync = () => {
    playBeep(900, 0.1);
    addTerminalLog('Syncing changelogs with NeuralTimeline Git commits...');
    setTimeout(() => addTerminalLog('Git integration: Success. Timeline updated.'), 800);
  };

  const handleRagInject = () => {
    playBeep(1000, 0.1);
    addTerminalLog('Extracting context from Knowledge Hub (RAG)...');
    setTimeout(() => {
        addTerminalLog('RAG saturation complete: auto-populated site with company docs.');
        setResult(prev => ({
            ...prev,
            codeSnippet: prev.codeSnippet.replace(/>Lorem ipsum.*?</g, ">Real company data injected by RAG.<")
        }));
    }, 1200);
  };

  const handleExportZip = () => {
    playBeep(1200, 0.1);
    addTerminalLog('Compiling Exa ZIP package (HTML + CSS + JS)...');
    setTimeout(() => addTerminalLog('ZIP downloaded successfully.'), 1000);
  };

  // 7. Interactive Custom Controls
"""

content = content.replace("  // 7. Interactive Custom Controls", handlers)

# Now add the buttons below Compile Sandbox Layout
buttons_ui = """            </button>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                type="button"
                onClick={handleGitSync}
                className={`py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
              >
                <GitBranch className="w-3 h-3" />
                Git Sync
              </button>
              <button
                type="button"
                onClick={handleRagInject}
                className={`py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
              >
                <Database className="w-3 h-3" />
                RAG Data
              </button>
              <button
                type="button"
                onClick={handleExportZip}
                className={`py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
              >
                <Download className="w-3 h-3" />
                Exa ZIP
              </button>
            </div>
          </form>"""

content = content.replace("            </button>\n          </form>", buttons_ui)

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)

print("Handlers and buttons added.")
