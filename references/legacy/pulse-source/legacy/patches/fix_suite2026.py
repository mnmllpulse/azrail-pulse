import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

# Let's find the "Animation Physics Integrator" tool closing
physics_end = """              {/* Animation Physics Integrator */}
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

            </div>"""

section_2 = """
          </div>
        </div>

        {/* SECTION 2: 20 ADVANCED TECHNOLOGICAL FUNCTIONS BENTO MATRIX */}
        <div className="space-y-3 mt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('II. 20 Elite Technological Features / 20 элитных технологических функций', 'II. 20 элитных технологических функций')}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
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
            ].map(feature => (
              <div
                key={feature.id}
                className="group relative flex flex-col p-2.5 rounded-xl border border-white/5 bg-black/40 hover:bg-white/5 hover:border-white/10 transition-all overflow-hidden cursor-crosshair"
                onMouseEnter={() => { playBeep(2000 + Math.random() * 1000, 0.02); setSuiteFunctions(prev => ({ ...prev, [feature.id]: true })); }}
              >
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={`w-1.5 h-1.5 rounded-full ${suiteFunctions[feature.id] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}`} />
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                    {feature.icon}
                  </div>
                  <span className="text-[7px] font-mono tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {feature.tag}
                  </span>
                </div>
                <h6 className="text-[9px] font-bold text-zinc-200 leading-tight mb-1">{t(feature.labelEn, feature.labelRu)}</h6>
                <p className="text-[8px] text-zinc-500 leading-snug group-hover:text-zinc-400 transition-colors line-clamp-2">
                  {feature.desc}
                </p>
                <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent group-hover:w-full transition-all duration-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
"""

content = content.replace(physics_end, physics_end + "\n" + section_2)

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)

print("SECTION 2 injected.")
