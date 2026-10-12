with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "Right side: Active Tool Interactive Simulator (7 columns)" in line:
        start_idx = i + 1 # keep the comment
    if "SECTION 2: 20 ADVANCED TECHNOLOGICAL FUNCTIONS BENTO MATRIX" in line:
        end_idx = i - 1 # Keep the </div> wrapper
        break

replacement = """            <div className="md:col-span-7 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 min-h-[220px]">
              
              {/* Neuro-Design Tool */}
              {activeSuiteTool === 'neuro' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">{t('Neuro-Design', 'Нейро-Дизайн')}</h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Visual synthesis and layout generation linked directly with PulseKernel.', 'Визуальный синтез макетов с прямой привязкой к PulseKernel.')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {['cyberpunk', 'minimal', 'organic'].map(style => (
                        <button
                          key={style}
                          onClick={() => handleApplyNeuroLayout(style)}
                          className="py-1.5 rounded-lg border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-indigo-600/5 text-[9px] font-mono text-white font-bold uppercase transition-all"
                        >
                          {style === 'cyberpunk' ? 'Cyberpunk' : style === 'minimal' ? 'Swiss Minimal' : 'Aurora Fluid'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AST Analysis Tool */}
              {activeSuiteTool === 'ast' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('AST Analysis', 'АСТ-Анализ')}</span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">PulseKernel Connected</span>
                    </h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Deep structural evaluation of your code.', 'Глубокий структурный анализ абстрактного синтаксического дерева кода.')}
                    </p>
                  </div>
                  <div className="space-y-2">
                     <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-zinc-400 space-y-1">
                        <div>> Parsing DOM Nodes... <span className="text-emerald-400">OK</span></div>
                        <div>> Validating semantics... <span className="text-emerald-400">OK</span></div>
                        <div>> PulseKernel Optimization... <span className="text-emerald-400">READY</span></div>
                     </div>
                  </div>
                  <button
                    onClick={() => { playBeep(900, 0.1); addTerminalLog('AST Analysis complete. Optimization deployed.'); }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Execute AST Optimization
                  </button>
                </div>
              )}

              {/* Shader Lab Tool */}
              {activeSuiteTool === 'shader' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Shader Lab', 'Шейдерная лаборатория')}</span>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">GPU Render</span>
                    </h5>
                    <div className="h-16 w-full rounded-xl overflow-hidden border border-white/10 relative">
                      <canvas id="suite-shader-canvas" className="w-full h-full object-cover opacity-80 mix-blend-screen" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">Flow Velocity</label>
                      <input type="range" min="1" max="10" value={shaderSpeed} onChange={e => setShaderSpeed(Number(e.target.value))} className="w-full accent-indigo-500 h-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">Color Shift</label>
                      <input type="range" min="0" max="360" value={shaderColorShift} onChange={e => setShaderColorShift(Number(e.target.value))} className="w-full accent-fuchsia-500 h-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">Turbulence</label>
                      <input type="range" min="1" max="20" value={shaderScale} onChange={e => setShaderScale(Number(e.target.value))} className="w-full accent-emerald-500 h-1" />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyShaderToBackground}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Apply Animated Shader to Preview
                  </button>
                </div>
              )}

              {/* Animation Physics Integrator */}
              {activeSuiteTool === 'physics' && (
                <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Animation Physics', 'Интегратор физики')}</span>
                      <span className="text-[8px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">Spring Simulation</span>
                    </h5>
                     <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Simulate physics and spring animations for UI elements using framer-motion principles.', 'Симуляция пружинной физики и анимаций для интерфейсов.')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 bg-white/5 p-2 rounded border border-white/5">
                        <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">Mass</label>
                        <input type="range" min="1" max="10" defaultValue="1" className="w-full accent-amber-500 h-1" />
                    </div>
                    <div className="space-y-1 bg-white/5 p-2 rounded border border-white/5">
                        <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">Tension</label>
                        <input type="range" min="10" max="300" defaultValue="170" className="w-full accent-amber-500 h-1" />
                    </div>
                  </div>
                  <button
                    onClick={() => { playBeep(1100, 0.1); addTerminalLog('Physics spring configuration injected into layout.'); }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Inject Physics Animation
                  </button>
                </div>
              )}

            </div>
"""

new_lines = lines[:start_idx] + [replacement] + lines[end_idx:]

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.writelines(new_lines)

print("Right side replaced.")
