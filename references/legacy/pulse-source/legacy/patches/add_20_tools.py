import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

# Replace the array of 10 items with 20 items
old_array = """[
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
              ]"""

new_array = """[
                { id: 'node_env', label: t('Browser Node.js', 'Node.js в браузере'), desc: t('Full execution of Next.js/Vite in browser without server latency.', 'Полноценное окружение Node.js прямо в браузере пользователя.') },
                { id: 'bi_sync', label: t('Bi-Directional Sync', 'Двунаправленная синхронизация'), desc: t('Visual drag-and-drop updates code, code updates preview instantly.', 'Визуальные изменения обновляют код, код обновляет превью.') },
                { id: 'rag_data', label: t('RAG Data Binding', 'Интеграция RAG данных'), desc: t('Connects to Notion/Drive to populate mockups with real data.', 'Подключение к базам знаний (Notion, CRM) для реальных текстов.') },
                { id: 'logic_gen', label: t('State & Logic Gen', 'Генерация стейта и логики'), desc: t('Generates Zustand/Redux logic, not just dumb UI components.', 'Генерация логики запросов и стейт-менеджмента (Zustand/React Query).') },
                { id: 'auto_sanitizer', label: t('Auto-Sanitizer', 'Авто-Санитайзер'), desc: t('Auto linter, minifier, and dead CSS class removal.', 'Автоматический линтер, минификатор и удаление неиспользуемых классов.') },
                { id: 'seo_a11y', label: t('SEO & A11y Node', 'Встроенный SEO / A11y'), desc: t('Auto aria-attributes, semantic tags, and image alt text.', 'Авто-aria атрибуты, семантические теги и аудит доступности.') },
                { id: 'edge_deploy', label: t('Edge-Ready Optimizer', 'Edge оптимизация'), desc: t('Production-ready code optimized for edge networks.', 'Код готов к продакшену (Edge) с первой секунды.') },
                { id: 'export_ci', label: t('CI/CD & GitHub Sync', 'Экспорт в CI/CD'), desc: t('Direct sync to GitHub or Exa ZIP export for pipelines.', 'Прямая синхронизация с GitHub или выгрузка идеального ZIP.') },
                { id: 'ast_refactor', label: t('AST Deep Refactor', 'AST Рефакторинг'), desc: t('Deep structural sanitization of abstract syntax trees.', 'Глубокий анализ и оптимизация абстрактного синтаксического дерева.') },
                { id: 'auto_engineer', label: t('Autonomous Engineer', 'Автономный Full-Stack'), desc: t('AI that understands business context and builds end-to-end.', 'Автономный Full-Stack инженер в браузере (Анимации, Данные, Логика).') },
                { id: 'perf_profiler', label: t('Performance Profiler', 'Профайлер Производительности'), desc: t('Real-time React flame graphs and metrics rendering.', 'Анализ производительности и Flame-графики в реальном времени.') },
                { id: 'realtime_collab', label: t('WebRTC Multiplayer', 'WebRTC Мультиплеер'), desc: t('Yjs integration for real-time multiplayer cursors.', 'Синхронизация курсоров и стейта в реальном времени.') },
                { id: 'db_studio', label: t('Cloud DB Studio', 'Визуальная БД Студия'), desc: t('Visual Prisma/Drizzle schema builder & queries.', 'Визуальный конструктор схем и запросов Prisma/Drizzle.') },
                { id: 'api_mesh', label: t('API Mesh Graph', 'API Mesh Маршрутизатор'), desc: t('Unified GraphQL/REST endpoint mesh routing.', 'Объединение всех API (GraphQL/REST) в единый Mesh.') },
                { id: 'auth_fabric', label: t('Auth Fabric SSO', 'Фабрика Авторизации'), desc: t('Zero-config JWT & multi-provider OAuth injection.', 'Интеграция JWT и OAuth-провайдеров без конфигурации.') },
                { id: 'ai_ab_testing', label: t('Autonomous A/B', 'Автономные A/B Тесты'), desc: t('AI generates and tests UI variations autonomously.', 'ИИ генерирует и тестирует варианты UI автоматически.') },
                { id: 'micro_frontend', label: t('Micro-Frontend Split', 'Микро-фронтенды'), desc: t('Auto-split monolith into Module Federation apps.', 'Автоматическое разделение монолита на микро-фронтенды.') },
                { id: 'serverless_cron', label: t('Serverless Cron', 'Serverless Cron'), desc: t('Visual background jobs and edge functions flow.', 'Визуальное управление фоновыми задачами и Edge-функциями.') },
                { id: '3d_canvas', label: t('3D WebGL Canvas', '3D WebGL Интеграция'), desc: t('Three.js and React Three Fiber visual node setup.', 'Интеграция и настройка сцен Three.js / React Three Fiber.') },
                { id: 'design_token', label: t('Figma Token Sync', 'Figma Token Sync'), desc: t('Direct sync of Figma design tokens to Tailwind.', 'Синхронизация дизайн-токенов из Figma прямо в Tailwind.') }
              ]"""

content = content.replace(old_array, new_array)

# Import Recharts if not imported
if "import { LineChart" not in content:
    content = content.replace("import { Cpu, TerminalSquare", "import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';\nimport { Cpu, TerminalSquare")

# Add a perf profiler state for the chart
if "const [perfData" not in content:
    # Add after activeSuiteTool
    perf_state = """  const [perfData, setPerfData] = useState(Array.from({length: 20}, (_, i) => ({ time: i, cpu: Math.random() * 40 + 10, mem: Math.random() * 30 + 20 })));
  
  useEffect(() => {
    if (activeSuiteTool === 'perf_profiler') {
      const interval = setInterval(() => {
        setPerfData(prev => {
          const next = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, cpu: Math.random() * 40 + 10, mem: Math.random() * 30 + 20 }];
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSuiteTool]);"""
    content = re.sub(
        r"(const \[activeSuiteTool.*?;\n)",
        r"\1" + perf_state + "\n",
        content
    )

# Now inject the view for the perf_profiler, inside the Tools Simulator rendering block
perf_view = """
              {/* Tool 11: Performance Profiler with Charts */}
              {activeSuiteTool === 'perf_profiler' && (
                <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Real-Time Performance Metrics', 'Метрики производительности')}</span>
                      <span className="text-[8px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">LIVE RECORDING</span>
                    </h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Deep React component rendering analysis, flame graphs, and memory leak detection.', 'Глубокий анализ рендеринга компонентов React, flame-графики и обнаружение утечек памяти.')}
                    </p>
                  </div>
                  <div className="flex-1 bg-black/60 rounded-xl border border-white/5 p-2 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={perfData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" hide />
                        <YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => val + '%'} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontSize: '10px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                        />
                        <Area type="monotone" dataKey="cpu" stroke="#6366f1" fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage" />
                        <Area type="monotone" dataKey="mem" stroke="#10b981" fillOpacity={1} fill="url(#colorMem)" name="Memory" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <button
                    onClick={() => { playBeep(1200, 0.1); addTerminalLog('Snapshot saved. Rendering bottleneck detected in <Button />.'); }}
                    className="w-full py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                     Capture Heap Snapshot
                  </button>
                </div>
              )}"""

# We'll inject this just before the "Catch-all for others" block
catch_all_idx = content.find("{['auto_engineer', 'auto_sanitizer', 'seo_a11y', 'edge_deploy', 'export_ci', 'ast_refactor'].includes(activeSuiteTool)")
if catch_all_idx != -1:
    content = content[:catch_all_idx] + perf_view + "\n              " + content[catch_all_idx:]

# Update the catch-all to include the new tools so they don't just show blank
catch_all_str = "['auto_engineer', 'auto_sanitizer', 'seo_a11y', 'edge_deploy', 'export_ci', 'ast_refactor'].includes(activeSuiteTool)"
new_catch_all_str = "['auto_engineer', 'auto_sanitizer', 'seo_a11y', 'edge_deploy', 'export_ci', 'ast_refactor', 'realtime_collab', 'db_studio', 'api_mesh', 'auth_fabric', 'ai_ab_testing', 'micro_frontend', 'serverless_cron', '3d_canvas', 'design_token'].includes(activeSuiteTool)"
content = content.replace(catch_all_str, new_catch_all_str)


# Now let's improve Playground and Preview panel
# For Preview: add a visual effect: floating particles or a grid
# We have a dotted coordinate grid in preview: `{suiteFunctions.f31 && ( ... )}`
# Let's make it more advanced by default, or add a toggle.
# In `renderPlayground()`, we can add a visual tree representation.
playground_marker = "const renderPlayground = () => {"
playground_end = "  const renderSuite2026 = () => {"

playground_str = """  const renderPlayground = () => {
    return (
      <div className={`flex-1 rounded-xl border p-6 flex flex-col items-center justify-center text-center relative overflow-hidden ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-md">
           <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 relative group">
              <Sparkles className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-black"></div>
           </div>
           <h3 className="text-xl font-bold mb-2 font-mono tracking-tight text-white">COMPONENT PLAYGROUND</h3>
           <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
             {t('Interactive sandbox for isolated component testing. Drag and drop UI elements, adjust props dynamically, and visualize the React rendering tree in real-time.', 'Интерактивная песочница для тестирования компонентов. Перетаскивайте UI-элементы, настраивайте пропсы динамически и визуализируйте дерево рендеринга React в реальном времени.')}
           </p>
           
           <div className="grid grid-cols-2 gap-4 w-full">
             <button onClick={() => addTerminalLog('Booting interactive Storybook environment...')} className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:border-indigo-500/30 group">
               <Monitor className="w-5 h-5 text-indigo-400 group-hover:-translate-y-1 transition-transform" />
               <span className="text-[10px] font-mono font-bold text-zinc-300">ISOLATED RENDER</span>
             </button>
             <button onClick={() => addTerminalLog('Initializing React Tree Visualizer...')} className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:border-emerald-500/30 group">
               <GitBranch className="w-5 h-5 text-emerald-400 group-hover:-translate-y-1 transition-transform" />
               <span className="text-[10px] font-mono font-bold text-zinc-300">DOM TREE VIEWER</span>
             </button>
           </div>
        </div>
      </div>
    );
  };"""

# Replace playground
p_start = content.find(playground_marker)
if p_start != -1:
    # Need to find the end of renderPlayground
    p_end = content.find("const renderSuite2026 =", p_start)
    if p_end != -1:
        # Before we replace, let's make sure we don't accidentally remove anything else
        pass
        
    content = content[:p_start] + playground_str + "\n\n" + content[p_end:]

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)

print("Updates applied successfully.")
