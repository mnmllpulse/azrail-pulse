with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

import re

features_replacement = """              { id: 'f31', tag: 'RESP', labelRu: 'ИИ-адаптивный дизайн', labelEn: 'AI-driven responsive design', desc: 'Автоматическая подстройка под любые устройства', icon: <Layout className="w-3 h-3 text-indigo-400" /> },
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
              { id: 'f50', tag: 'DEP', labelRu: 'Оптимизация деплоя', labelEn: 'Edge deployment strategy', desc: 'Анализ сборки для Edge сетей', icon: <CloudLightning className="w-3 h-3 text-sky-400" /> }"""

# We'll use regex to find the block
pattern = r"(\{\s*id:\s*'f31'.*?\n)(.*?)(\{\s*id:\s*'f50'.*?\n)"

new_content = re.sub(r"\{\s*id:\s*'f31'.*?id:\s*'f50'.*?\}", features_replacement, content, flags=re.DOTALL)

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(new_content)

print("Replacement done.")
