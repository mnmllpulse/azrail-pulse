import re

with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

# Replace activeSuiteTool state
content = re.sub(
    r"const \[activeSuiteTool, setActiveSuiteTool\] = useState<.*?>\('.*?'\);",
    r"const [activeSuiteTool, setActiveSuiteTool] = useState<'neuro' | 'ast' | 'shader' | 'physics'>('neuro');",
    content
)

# Replace the tool mapping
tools_mapping = """              {[
                { id: 'neuro', label: t('Neuro-Design', 'Нейро-Дизайн'), desc: t('Generate fully responsive semantic layouts visually.', 'Визуальный синтез и генерация семантических макетов.') },
                { id: 'ast', label: t('AST Analysis', 'АСТ-Анализ'), desc: t('Live fluid code sanitization and refactoring.', 'Глубокий анализ абстрактного синтаксического дерева кода.') },
                { id: 'shader', label: t('Shader Lab', 'Шейдерная лаборатория'), desc: t('Compile live fluid gradient patterns on GPU Canvas.', 'Интерактивная разработка WebGL шейдеров и фонов.') },
                { id: 'physics', label: t('Animation Physics Integrator', 'Интегратор физики анимации'), desc: t('Simulate physics and spring animations for UI.', 'Симуляция пружинной физики и анимаций для интерфейса.') }
              ].map"""

content = re.sub(r"\{\[\s*\{\s*id:\s*'visual'.*?\]\.map", tools_mapping, content, flags=re.DOTALL)

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)

print("Replaced activeSuiteTool.")
