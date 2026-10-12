import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

# I will append the missing main return block to the end of the file.
main_return = """
  return (
    <div className={`h-full flex flex-col md:flex-row gap-4 p-4 font-sans ${isLight ? 'bg-white text-gray-900' : 'bg-[#000000] text-zinc-100'} transition-colors duration-500`}>
      {/* LEFT COLUMN: CONTROLS & LOGS */}
      <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {/* Specification Input */}
        <div className={`border rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#050505] border-white/5'}`}>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold tracking-widest uppercase font-mono">{t('Specification', 'Спецификация')}</h3>
          </div>
          
          <form onSubmit={handleBuild} className="flex flex-col gap-3 relative z-10">
            <textarea
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder={t('Describe the component or UI you want to build...', 'Опишите компонент или UI, который вы хотите создать...')}
              className={`w-full h-28 bg-transparent border rounded-xl p-3 text-xs resize-none focus:outline-none transition-colors ${
                isLight 
                  ? 'border-gray-200 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400' 
                  : 'border-white/10 focus:border-indigo-500/50 text-white placeholder:text-zinc-600'
              }`}
            />
            
            <button
              type="submit"
              disabled={isLoading || !spec.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  {t('COMPILING...', 'КОМПИЛЯЦИЯ...')}
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  {t('BUILD INTERFACE', 'СОЗДАТЬ ИНТЕРФЕЙС')}
                </>
              )}
            </button>

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
          </form>
        </div>

        {/* System Terminal Console */}
        <div className={`border rounded-2xl p-4 flex-1 flex flex-col min-h-[150px] overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              <TerminalSquare className="w-3.5 h-3.5" />
              <span>Metatron Logs</span>
            </div>
            <button
              onClick={() => setTerminalLogs([])}
              className="text-[8px] font-mono uppercase text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-1 pr-1 text-zinc-400 leading-normal">
            {terminalLogs.length === 0 ? (
              <div className="text-zinc-600 text-center py-10 uppercase tracking-widest">Console Clear.</div>
            ) : (
              terminalLogs.map((log, idx) => (
                <div key={idx} className="border-b border-white/[0.01] pb-0.5 truncate">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE STAGE & PREVIEW */}
      <div className="flex-1 flex flex-col border rounded-2xl min-w-0 overflow-hidden relative">
        
        {/* Workspace Toolbar & View Tabs */}
        <div className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${isLight ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#0a0a0c]'}`}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">STAGE:</span>
            <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
              {[
                { id: 'preview', label: 'Preview' },
                { id: 'playground', label: 'Playground' },
                { id: 'suite2026', label: 'Suite 2026' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setViewMode(tab.id as any);
                    playBeep(900, 0.05);
                    addTerminalLog(`Switched view mode to: ${tab.label.toUpperCase()}`);
                  }}
                  className={`px-2 py-1 text-[9px] font-mono rounded-md transition-colors uppercase ${
                    viewMode === tab.id
                      ? (isLight ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'bg-white/10 text-white')
                      : (isLight ? 'text-gray-500 hover:text-gray-900' : 'text-zinc-400 hover:text-white')
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Screen Sizer Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setScreenSize('desktop')}
              className={`p-1 rounded-lg border transition-all ${
                screenSize === 'desktop' ? 'border-indigo-500/50 bg-indigo-600/10 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScreenSize('mobile')}
              className={`p-1 rounded-lg border transition-all ${
                screenSize === 'mobile' ? 'border-indigo-500/50 bg-indigo-600/10 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Sandbox Display Stage */}
        <div className="flex-1 p-4 flex flex-col min-h-0 bg-[#070709] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* View: Suite 2026 */}
            {viewMode === 'suite2026' && (
              <motion.div
                key="suite2026"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderSuite2026()}
              </motion.div>
            )}

            {/* View: Playground */}
            {viewMode === 'playground' && (
              <motion.div
                key="playground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderPlayground()}
              </motion.div>
            )}

            {/* View: Preview Frame */}
            {viewMode === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-center items-center min-h-0"
              >
                {!result ? (
                  <div className={`flex-1 flex flex-col items-center justify-center border border-dashed rounded-2xl w-full p-8 text-center font-mono text-[11px] ${
                    isLight ? 'border-gray-200 text-gray-400' : 'border-white/5 bg-black/10 text-[#E0E0E0]/30'
                  }`}>
                    <Cpu className="w-8 h-8 mb-4 animate-spin text-indigo-500 opacity-40" />
                    {t('AWAITING SPECIFICATION INSTRUCTION TO COMPILE FRONTEND BUILD...', 'ОЖИДАНИЕ ТЕКСТОВЫХ ИНСТРУКЦИЙ ДЛЯ КОМПИЛЯЦИИ ИНТЕРФЕЙСА...')}
                  </div>
                ) : (
                  <div className={`flex-1 w-full flex justify-center items-center overflow-hidden transition-all duration-300 relative rounded-2xl border ${
                    screenSize === 'mobile' ? 'max-w-[360px] h-[580px] shadow-2xl border-white/10 bg-black/40' : 'w-full h-full border-transparent'
                  }`}>
                    <iframe
                      title="Sandbox Frame Display"
                      srcDoc={getIframeSource()}
                      className="w-full h-full border-0 rounded-2xl bg-black"
                      sandbox="allow-scripts"
                    />
                    {/* Dotted Coordinate Pixel Grid Overlay if f31 is active! */}
                    {suiteFunctions.f31 && (
                      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
"""
content += "\n" + main_return

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)

print("Added main return.")
