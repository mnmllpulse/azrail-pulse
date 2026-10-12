import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

# 1. Update state type
content = re.sub(
    r"useState\<'neuro' \| 'ast' \| 'shader' \| 'physics'\>\('neuro'\);",
    r"useState<string>('node_env');",
    content
)

# 2. Update shader effect condition
content = re.sub(
    r"activeSuiteTool !== 'shader'",
    r"activeSuiteTool !== 'bi_sync'",
    content
)

# 3. Replace the Suite 2026 tools dock & right side
start_marker = "{/* Left side: Tool Selection Dock (5 columns) */}"
end_marker = "{/* SECTION 2: 20 ADVANCED TECHNOLOGICAL FUNCTIONS BENTO MATRIX */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Build the replacement for the entire Section 1
    new_section = """{/* Left side: Tool Selection Dock (5 columns) */}
            <div className="md:col-span-5 flex flex-col gap-2 border-r border-white/5 pr-4 h-[400px] overflow-y-auto custom-scrollbar">
              {[
                { id: 'node_env', label: t('Browser Node.js', 'Node.js в браузере'), desc: t('Full execution of Next.js/Vite in browser without server latency.', 'Полноценное окружение Node.js прямо в браузере пользователя.') },
                { id: 'bi_sync', label: t('Bi-Directional Sync', 'Двунаправленная синхронизация'), desc: t('Visual drag-and-drop updates code, code updates preview instantly.', 'Визуальные изменения обновляют код, код обновляет превью.') },
                { id: 'rag_data', label: t('RAG Data Binding', 'Интеграция RAG данных'), desc: t('Connects to Notion/Drive to populate mockups with real data.', 'Подключение к базам знаний (Notion, CRM) для реальных текстов.') },
                { id: 'logic_gen', label: t('State & Logic Gen', 'Генерация стейта и логики'), desc: t('Generates Zustand/Redux logic, not just dumb UI components.', 'Генерация логики запросов и стейт-менеджмента (Zustand/React Query).') },
                { id: 'auto_sanitizer', label: t('Auto-Sanitizer', 'Авто-Санитайзер'), desc: t('Auto linter, minifier, and dead CSS class removal.', 'Автоматический линтер, минификатор и удаление неиспользуемых классов.') },
                { id: 'seo_a11y', label: t('SEO & A11y Node', 'Встроенный SEO / A11y'), desc: t('Auto aria-attributes, semantic tags, and image alt text.', 'Авто-aria атрибуты, семантические теги и аудит доступности.') },
                { id: 'edge_deploy', label: t('Edge-Ready Optimizer', 'Edge оптимизация'), desc: t('Production-ready code optimized for edge networks.', 'Код готов к продакшену (Edge) с первой секунды.') },
                { id: 'export_ci', label: t('CI/CD & GitHub Sync', 'Экспорт в CI/CD'), desc: t('Direct sync to GitHub or Exa ZIP export for pipelines.', 'Прямая синхронизация с GitHub или выгрузка идеального ZIP.') },
                { id: 'ast_refactor', label: t('AST Deep Refactor', 'AST Рефакторинг'), desc: t('Deep structural sanitization of abstract syntax trees.', 'Глубокий анализ и оптимизация абстрактного синтаксического дерева.') },
                { id: 'auto_engineer', label: t('Autonomous Engineer', 'Автономный Full-Stack'), desc: t('AI that understands business context and builds end-to-end.', 'Автономный Full-Stack инженер в браузере (Анимации, Данные, Логика).') }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveSuiteTool(tool.id);
                    playBeep(800, 0.05);
                    addTerminalLog(`Activated autonomous module: ${tool.label.toUpperCase()}`);
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all shrink-0 ${
                    activeSuiteTool === tool.id
                      ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.05)]'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-semibold leading-none mb-1 flex items-center justify-between">
                    <span>{tool.label}</span>
                    {activeSuiteTool === tool.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                  </div>
                  <p className="text-[9px] opacity-60 leading-relaxed truncate">{tool.desc}</p>
                </button>
              ))}
            </div>

            {/* Right side: Active Tool Interactive Simulator (7 columns) */}
            <div className="md:col-span-7 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 h-[400px]">
              
              {/* Tool 1: Browser Node.js */}
              {activeSuiteTool === 'node_env' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">{t('Browser Node.js Environment', 'Полноценное окружение Node.js')}</h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Booting a full Node.js environment (Next.js/Vite) directly within the browser tab. Zero server latency. Full API routes support.', 'Запуск сложных полнофункциональных приложений (Next.js/Vite) с API-роутами прямо в нашей студии без задержек сервера.')}
                    </p>
                  </div>
                  <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-zinc-400 space-y-1 flex-1 overflow-y-auto">
                    <div className="text-emerald-400">&gt; WebContainers Initialized.</div>
                    <div>&gt; Booting Node.js v20.11.0...</div>
                    <div>&gt; Installing dependencies via npm... <span className="text-emerald-400">DONE (0.4s)</span></div>
                    <div>&gt; Starting Vite Dev Server on port 3000...</div>
                    <div className="text-indigo-400">&gt; Server running! API Routes ready.</div>
                  </div>
                  <button
                    onClick={() => { playBeep(900, 0.1); addTerminalLog('Node.js environment restarted.'); }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5" /> Restart Dev Server
                  </button>
                </div>
              )}

              {/* Tool 2: Bi-Directional Sync */}
              {activeSuiteTool === 'bi_sync' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Bi-Directional Sync', 'Двунаправленная синхронизация')}</span>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">Live</span>
                    </h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Visual adjustments (drag & drop) instantly compile to React code. Code edits immediately render in the canvas.', 'Если вы визуально тянете кнопку в превью, код обновляется автоматически. Если пишете код — обновляется превью.')}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative bg-black/50 p-2 flex items-center justify-center">
                    {/* Simulated visual feedback for Bi-sync */}
                    <div className="flex gap-4 items-center w-full">
                       <div className="flex-1 h-24 border border-dashed border-indigo-500/50 rounded-lg flex items-center justify-center text-[10px] text-indigo-400 bg-indigo-500/5 font-mono">
                         Visual Editor
                       </div>
                       <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin-slow" />
                       <div className="flex-1 h-24 border border-zinc-700 bg-zinc-900 rounded-lg p-2 text-[8px] font-mono text-zinc-300 overflow-hidden">
                         <span className="text-pink-400">const</span> Button = () =&gt; (<br/>
                         &nbsp;&nbsp;&lt;<span className="text-blue-400">button</span> className="<span className="text-yellow-300">p-4 bg-blue-500</span>"&gt;<br/>
                         &nbsp;&nbsp;&nbsp;&nbsp;Submit<br/>
                         &nbsp;&nbsp;&lt;/<span className="text-blue-400">button</span>&gt;<br/>
                         );
                       </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { playBeep(1000, 0.1); addTerminalLog('AST Sync forced.'); }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Force Sync Trees
                  </button>
                </div>
              )}

              {/* Tool 3: RAG Data Binding */}
              {activeSuiteTool === 'rag_data' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">{t('RAG Data Binding', 'Интеграция реальных данных')}</h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Generating components with Lorem Ipsum is a thing of the past. Connecting AI to your Notion/CRM to fetch real data.', 'Генерация сайтов с Lorem Ipsum — это прошлый век. Подключаемся к базе знаний клиента и заполняем макеты реальными текстами и ценами.')}
                    </p>
                  </div>
                  <div className="bg-black/60 rounded-xl p-3 border border-emerald-500/20 font-mono text-[9px] text-emerald-400/80 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2"><Database className="w-3 h-3 text-emerald-400" /> [Notion DB Linked]</div>
                    <div className="flex items-center gap-2"><Database className="w-3 h-3 text-emerald-400" /> [Stripe Products Linked]</div>
                    <div className="mt-2 text-zinc-400 border-t border-white/5 pt-2">
                       &gt; Extracting 45 product titles...<br/>
                       &gt; Parsing localized descriptions...<br/>
                       <span className="text-indigo-400">&gt; Injecting directly into React Components...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { playBeep(1100, 0.1); addTerminalLog('RAG Vector DB Synced.'); }}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" /> Sync Knowledge Base
                  </button>
                </div>
              )}

              {/* Tool 4: Logic Gen */}
              {activeSuiteTool === 'logic_gen' && (
                <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('State & Logic Engine', 'Генерация логики')}</span>
                      <span className="text-[8px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">Zustand / Redux</span>
                    </h5>
                     <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Beyond dumb UI components. The AI generates fully wired state management and data fetching logic (React Query).', 'Генерация логики, а не только UI. ИИ создает компоненты, уже подключенные к стейт-менеджеру (Zustand) или логике запросов (React Query).')}
                    </p>
                  </div>
                  <div className="flex-1 bg-zinc-900 border border-zinc-700 p-2 rounded-xl text-[8px] font-mono text-zinc-300 overflow-y-auto">
                    <span className="text-pink-400">import</span> {"{ create }"} <span className="text-pink-400">from</span> <span className="text-yellow-300">'zustand'</span>;<br/><br/>
                    <span className="text-pink-400">export const</span> useStore = create((set) =&gt; ({"{"}<br/>
                    &nbsp;&nbsp;cart: [],<br/>
                    &nbsp;&nbsp;addToCart: (item) =&gt; set((state) =&gt; ({"{"} cart: [...state.cart, item] {"}"})),<br/>
                    &nbsp;&nbsp;fetchProducts: <span className="text-pink-400">async</span> () =&gt; {"{"}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">const</span> res = <span className="text-pink-400">await</span> fetch('/api/products');<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;set({"{"} products: <span className="text-pink-400">await</span> res.json() {"}"});<br/>
                    &nbsp;&nbsp;{"}"}<br/>
                    {"}"}));
                  </div>
                  <button
                    onClick={() => { playBeep(1100, 0.1); addTerminalLog('Zustand store injected into App context.'); }}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5" /> Inject Global Store
                  </button>
                </div>
              )}

              {/* Tool 10: Auto Engineer (Catch-all for others for visual brevity) */}
              {['auto_engineer', 'auto_sanitizer', 'seo_a11y', 'edge_deploy', 'export_ci', 'ast_refactor'].includes(activeSuiteTool) && (
                 <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Autonomous Full-Stack Engineer', 'Автономный Инженер')}</span>
                      <span className="text-[8px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">AI AGENT</span>
                    </h5>
                     <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('An autonomous agent that understands business context, writes semantic code, fixes its own errors, auto-lints, adds SEO/A11y, and exports to Exa ZIP or GitHub.', 'Автономный Full-Stack инженер в браузере, который понимает контекст, пишет чистый семантический код, сам исправляет ошибки, минифицирует классы и выдает идеальный результат.')}
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                     <div className="border border-white/5 bg-black/30 rounded-lg p-2 text-[8px] font-mono text-zinc-400 flex flex-col justify-center items-center gap-1 text-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                        <span className="text-emerald-400 font-bold">Auto-Sanitizer</span>
                        Dead Tailwind removed. Code Minified.
                     </div>
                     <div className="border border-white/5 bg-black/30 rounded-lg p-2 text-[8px] font-mono text-zinc-400 flex flex-col justify-center items-center gap-1 text-center">
                        <Globe className="w-4 h-4 text-blue-400 mb-1" />
                        <span className="text-blue-400 font-bold">SEO & A11y</span>
                        Aria tags & semantic HTML injected.
                     </div>
                     <div className="border border-white/5 bg-black/30 rounded-lg p-2 text-[8px] font-mono text-zinc-400 flex flex-col justify-center items-center gap-1 text-center">
                        <CloudLightning className="w-4 h-4 text-sky-400 mb-1" />
                        <span className="text-sky-400 font-bold">Edge-Ready</span>
                        Vite bundle optimized for Vercel/Edge.
                     </div>
                     <div className="border border-white/5 bg-black/30 rounded-lg p-2 text-[8px] font-mono text-zinc-400 flex flex-col justify-center items-center gap-1 text-center">
                        <GitBranch className="w-4 h-4 text-orange-400 mb-1" />
                        <span className="text-orange-400 font-bold">CI/CD Sync</span>
                        Ready to push to GitHub / ZIP.
                     </div>
                  </div>
                  <button
                    onClick={() => { playBeep(2000, 0.2); addTerminalLog('Autonomous agent deployed. System fully optimized.'); }}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Execute Autonomous Pipeline
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* SECTION 2: 20 ADVANCED TECHNOLOGICAL FUNCTIONS BENTO MATRIX */}"""
    
    content = content[:start_idx] + new_section + content[end_idx + len(end_marker):]

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)

print("Replacement complete.")
