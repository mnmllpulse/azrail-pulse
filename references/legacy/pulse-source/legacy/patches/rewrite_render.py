import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

# We need to replace EVERYTHING from:
#   const renderSuite2026 = () => {
# down to the line exactly BEFORE:
#   const renderPlayground = () => {

start_marker = "  const renderSuite2026 = () => {\n"
end_marker = "  const renderPlayground = () => {\n"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers!")
    exit(1)

new_render = """  const renderSuite2026 = () => {
    return (
      <div className={`flex-1 rounded-xl border p-4 sm:p-5 mb-4 overflow-y-auto flex flex-col gap-6 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 shrink-0">
          <div>
            <h4 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" /> Web Studio 2026 Advanced Suite
            </h4>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {t('EXPLORATIVE NEURAL PIPELINE PACK INTEGRATING THE TOP 5 TOOLS & 20 TECHNOLOGICAL FUNCTIONS OF 2026.', 'ЭКСПЕРИМЕНТАЛЬНЫЙ ПАКЕТ ИНСТРУМЕНТОВ И 20 ТЕХНОЛОГИЧЕСКИХ ФУНКЦИЙ НА 2026 ГОД.')}
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-zinc-400">STATUS:</span>
            <span className="text-emerald-400 font-bold">CORE RUNTIME ONLINE</span>
          </div>
        </div>

        {/* SECTION 1: THE 5 ADVANCED TOOLS DOCK & INTERACTIVE SIMULATORS */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('I. 5 Top-Tier Technological Tools of 2026 / Пять передовых инструментов', 'I. Пять передовых инструментов 2026')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left side: Tool Selection Dock (5 columns) */}
            <div className="md:col-span-5 flex flex-col gap-2 border-r border-white/5 pr-4">
              {[
                { id: 'neuro', label: t('Neuro-Design', 'Нейро-Дизайн'), desc: t('Generate fully responsive semantic layouts visually.', 'Визуальный синтез и генерация семантических макетов.') },
                { id: 'ast', label: t('AST Analysis', 'АСТ-Анализ'), desc: t('Live fluid code sanitization and refactoring.', 'Глубокий анализ абстрактного синтаксического дерева кода.') },
                { id: 'shader', label: t('Shader Lab', 'Шейдерная лаборатория'), desc: t('Compile live fluid gradient patterns on GPU Canvas.', 'Интерактивная разработка WebGL шейдеров и фонов.') },
                { id: 'physics', label: t('Animation Physics Integrator', 'Интегратор физики анимации'), desc: t('Simulate physics and spring animations for UI.', 'Симуляция пружинной физики и анимаций для интерфейса.') }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveSuiteTool(tool.id as any);
                    playBeep(800, 0.05);
                    addTerminalLog(`Switched Suite 2026 workspace view to: ${tool.label}`);
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                    activeSuiteTool === tool.id
                      ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.05)]'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-semibold leading-none mb-1 flex items-center justify-between">
                    <span>{tool.label}</span>
                    {activeSuiteTool === tool.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </div>
                  <p className="text-[9px] opacity-60 leading-relaxed truncate">{tool.desc}</p>
                </button>
              ))}
            </div>

            {/* Right side: Active Tool Interactive Simulator (7 columns) */}
            <div className="md:col-span-7 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 min-h-[220px]">
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
                        <div>&gt; Parsing DOM Nodes... <span className="text-emerald-400">OK</span></div>
                        <div>&gt; Validating semantics... <span className="text-emerald-400">OK</span></div>
                        <div>&gt; PulseKernel Optimization... <span className="text-emerald-400">READY</span></div>
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
          </div>
        </div>

        {/* SECTION 2: 20 ADVANCED TECHNOLOGICAL FUNCTIONS BENTO MATRIX */}
        <div className="space-y-3 mt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('II. 20 Elite Technological Features / 20 элитных технологических функций', 'II. 20 элитных технологических функций')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'f31', tag: 'RESP', labelRu: 'ИИ-адаптивный дизайн', labelEn: 'AI-driven responsive design', desc: 'Автоматическая подстройка под любые устройства', icon: <Layout className="w-3 h-3 text-indigo-400" /> },
              { id: 'f32', tag: 'STYLE', labelRu: 'Перенос стилей', labelEn: 'Style transfer', desc: 'Нейросетевой перенос визуального стиля', icon: <Sparkles className="w-3 h-3 text-cyan-400" /> },
              { id: 'f33', tag: 'COMP', labelRu: 'Авто-генерация компонентов', labelEn: 'Automated component generation', desc: 'Синтез UI компонентов на лету', icon: <Layers className="w-3 h-3 text-purple-400" /> },
              { id: 'f34', tag: 'ACC', labelRu: 'Соответствие стандартам', labelEn: 'Accessibility compliance', desc: 'Автоматическая проверка WCAG', icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> },
              { id: 'f35', tag: 'ANIM', labelRu: 'Генерация анимаций', labelEn: 'Motion synthesis', desc: 'Создание CSS/JS анимаций по запросу', icon: <Zap className="w-3 h-3 text-yellow-400" /> },
              { id: 'f36', tag: 'TYPO', labelRu: 'Оптимизация типографики', labelEn: 'Typography pairing', desc: 'Умный подбор и сочетание шрифтов', icon: <FileText className="w-3 h-3 text-fuchsia-400" /> },
              { id: 'f37', tag: 'PERF', labelRu: 'Оптимизация кода', labelEn: 'Code minification AI', desc: 'Минификация и удаление мертвого кода', icon: <Settings2 className="w-3 h-3 text-indigo-400" /> },
              { id: 'f38', tag: 'COLOR', labelRu: 'Генерация палитр', labelEn: 'Color palette generation', desc: 'Динамическое создание цветовых схем', icon: <Sparkles className="w-3 h-3 text-pink-400" /> },
              { id: 'f39', tag: 'DARK', labelRu: 'Генерация темной темы', labelEn: 'Dark mode synthesis', desc: 'Автоматическое создание контрастной темной темы', icon: <Moon className="w-3 h-3 text-blue-400" /> },
              { id: 'f40', tag: 'I18N', labelRu: 'Авто-локализация интерфейса', labelEn: 'Interface auto-localization', desc: 'Перевод интерфейса без потери контекста', icon: <Globe className="w-3 h-3 text-orange-400" /> },
              { id: 'f41', tag: 'HTML', labelRu: 'Семантическая разметка', labelEn: 'Semantic HTML markup', desc: 'Улучшение структуры для скринридеров', icon: <Database className="w-3 h-3 text-teal-400" /> },
              { id: 'f42', tag: 'DATA', labelRu: 'Мокирование данных', labelEn: 'Mock data population', desc: 'Заполнение макетов реалистичными данными', icon: <TerminalSquare className="w-3 h-3 text-yellow-500" /> },
              { id: 'f43', tag: 'IMG', labelRu: 'Оптимизация изображений', labelEn: 'Asset optimization AI', desc: 'Сжатие и генерация плейсхолдеров', icon: <Layers className="w-3 h-3 text-zinc-400" /> },
              { id: 'f44', tag: 'ROUTE', labelRu: 'Интеллектуальный роутинг', labelEn: 'Smart route prefetching', desc: 'Предзагрузка маршрутов на основе поведения', icon: <Activity className="w-3 h-3 text-cyan-500" /> },
              { id: 'f45', tag: 'STATE', labelRu: 'Управление стейтом', labelEn: 'State management inference', desc: 'Генерация логики Redux/Zustand', icon: <Database className="w-3 h-3 text-emerald-500" /> },
              { id: 'f46', tag: 'TEST', labelRu: 'Генерация тестов', labelEn: 'Auto-test generation', desc: 'Создание юнит и E2E тестов', icon: <ShieldCheck className="w-3 h-3 text-red-400" /> },
              { id: 'f47', tag: 'A/B', labelRu: 'A/B тестирование', labelEn: 'Micro-A/B variants', desc: 'Создание микро-вариаций для тестов', icon: <Layout className="w-3 h-3 text-indigo-300" /> },
              { id: 'f48', tag: 'UX', labelRu: 'Анализ микро-взаимодействий', labelEn: 'Micro-interaction analysis', desc: 'Предсказание удобства использования', icon: <Sliders className="w-3 h-3 text-amber-400" /> },
              { id: 'f49', tag: 'SEC', labelRu: 'Анализ уязвимостей', labelEn: 'Security vulnerability scan', desc: 'Анализ XSS и инъекций в интерфейсе', icon: <Flame className="w-3 h-3 text-emerald-400" /> },
              { id: 'f50', tag: 'DEP', labelRu: 'Оптимизация деплоя', labelEn: 'Edge deployment strategy', desc: 'Анализ сборки для Edge сетей', icon: <CloudLightning className="w-3 h-3 text-sky-400" /> }
            ].map(f => {
              const active = suiteFunctions[f.id] || false;
              return (
                <div
                  key={f.id}
                  className={`border rounded-xl p-2.5 flex flex-col justify-between gap-2.5 transition-all relative overflow-hidden group ${
                    active
                      ? 'bg-indigo-600/[0.02] border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.03)]'
                      : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {f.icon}
                      <span className="text-[7px] font-mono font-extrabold uppercase px-1 py-0.5 rounded bg-white/5 text-zinc-400">
                        {f.tag}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSuiteFunctions(prev => {
                          const next = { ...prev, [f.id]: !prev[f.id] };
                          playBeep(next[f.id] ? 1000 : 450, 0.05);
                          addTerminalLog(`Function [${f.id.toUpperCase()}] status toggled to: ${next[f.id] ? 'ACTIVE' : 'DEACTIVATED'}`);
                          return next;
                        });
                      }}
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors relative border ${
                        active ? 'bg-indigo-600 border-indigo-400/50' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-md transition-transform ${
                        active ? 'translate-x-3' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <div>
                    <h6 className="text-[10px] font-bold text-white tracking-tight leading-snug">
                      {language === 'en' ? f.labelEn : f.labelRu}
                    </h6>
                    <p className="text-[8px] text-zinc-400 leading-normal mt-0.5 line-clamp-2">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };\n"""

new_content = content[:start_idx] + new_render + content[end_idx:]

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(new_content)

print("Replacement complete.")
