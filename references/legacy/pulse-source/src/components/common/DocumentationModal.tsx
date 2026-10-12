import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, X, Sparkles, AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  currentPath: string;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  isLight,
  currentPath,
}) => {
  const { getUserGuide } = useLanguage();

  // Determine active section based on path
  const getActiveSection = (path: string): string => {
    const cleanPath = path.toLowerCase();
    if (cleanPath.includes('/admin')) return 'admin';
    if (cleanPath.includes('/studio/web')) return 'web';
    if (cleanPath.includes('/studio/code')) return 'code';
    if (cleanPath.includes('/studio/music')) return 'music';
    if (cleanPath.includes('/studio/video')) return 'video';
    if (cleanPath.includes('/studio/agent')) return 'agent';
    if (cleanPath.includes('/studio/image')) return 'image';
    if (cleanPath.includes('/studio/lab')) return 'lab';
    if (cleanPath.includes('/studio/knowledge')) return 'knowledge';
    if (cleanPath.includes('/gallery')) return 'gallery';
    if (cleanPath.includes('/swarm-chat')) return 'swarm';
    if (cleanPath.includes('/quantum')) return 'quantum';
    if (cleanPath.includes('/dna')) return 'dna';
    if (cleanPath.includes('/reality')) return 'reality';
    return 'dashboard';
  };

  const section = getActiveSection(currentPath);
  
  // Fetch details directly using standard keys or fallback
  const guideEn = getUserGuide(section); // this defaults to the active language, but let's get custom bilingual representation

  // Custom detailed specs to ensure incredibly thorough contextual guides in BOTH languages
  const getBilingualDoc = (sec: string) => {
    const docs: Record<string, {
      titleEn: string;
      titleRu: string;
      descEn: string;
      descRu: string;
      stepsEn: string[];
      stepsRu: string[];
      technicalDetailsEn: string[];
      technicalDetailsRu: string[];
    }> = {
      admin: {
        titleEn: "System Administrator Control Panel",
        titleRu: "Панель управления системного администратора",
        descEn: "Advanced management interface for 'mnmllpulse' owners. Enables diagnostic monitoring, user role management, and deep system configuration.",
        descRu: "Расширенный интерфейс управления для владельцев 'mnmllpulse'. Позволяет выполнять диагностический мониторинг, управление доступом пользователей и глубокую настройку системы.",
        stepsEn: [
          "Monitor real-time system metrics, WebSocket status, and resource usage in the health dashboard.",
          "Review audit logs of all administrative actions taken within the OS.",
          "Use configuration toggles to modify deep-level system flags and parameters."
        ],
        stepsRu: [
          "Мониторинг метрик системы, статуса WebSocket и использования ресурсов в реальном времени.",
          "Просмотр аудиторских логов всех административных действий в ОС.",
          "Использование переключателей конфигурации для изменения параметров низкого уровня."
        ],
        technicalDetailsEn: [
          "Admin privileges protected by server-side RBAC validation.",
          "Audit logs persist state changes for security compliance."
        ],
        technicalDetailsRu: [
          "Привилегии администратора защищены серверной валидацией RBAC.",
          "Аудиторские логи сохраняют изменения состояния для обеспечения безопасности."
        ]
      },
      dashboard: {
        titleEn: "Command Center & Telemetry Control",
        titleRu: "Центр Управления и Телеметрия",
        descEn: "The primary control center of Dark Mnmll Pulse OS. Monitors system resource load, manages global background parameters, and aggregates neural node activity maps in real-time.",
        descRu: "Главный командный пункт Dark Mnmll Pulse OS. Отслеживает нагрузку системных ресурсов, управляет глобальными фоновыми процессами и собирает карту активности нейронных узлов в реальном времени.",
        stepsEn: [
          "Observe active system indicators and telemetry signals in the main dashboard grid.",
          "Trigger a global diagnostics run by using the activity panels or keyboard shortcut Alt+X.",
          "Adjust the display matrix and custom background shaders via the top profile menu."
        ],
        stepsRu: [
          "Наблюдайте за активными индикаторами системы и сигналами телеметрии в главной сетке дашборда.",
          "Запустите глобальную диагностику с помощью панелей активности или комбинации клавиш Alt+X.",
          "Настройте матрицу отображения и кастомные фоновые шейдеры через верхнее меню профиля."
        ],
        technicalDetailsEn: [
          "Real-time resource polling operates on a 1.5s interval daemon.",
          "Diagnostics perform safe synthetic server-thread queries."
        ],
        technicalDetailsRu: [
          "Опрос ресурсов в реальном времени выполняется демоном с интервалом 1.5 сек.",
          "Диагностика осуществляет безопасные синтетические запросы к серверным потокам."
        ]
      },
      web: {
        titleEn: "WEB STUDIO Operational Matrix",
        titleRu: "Операционная Матрица WEB STUDIO",
        descEn: "Design and synthesize modern, minimalist web pages, layouts, and components using advanced AI models. Implemented with live responsive sandbox previews.",
        descRu: "Проектируйте и создавайте современные минималистичные веб-страницы, макеты и компоненты с помощью ИИ. Интегрировано с песочницей предпросмотра.",
        stepsEn: [
          "Select a layout template configuration using the visual BentoForge selectors.",
          "Enter a descriptive prompt detailing color theory, visual themes, or component behavior.",
          "Click 'Synthesize Page' to run the generation pipeline and render in the sandbox container."
        ],
        stepsRu: [
          "Выберите конфигурацию шаблона макета с помощью визуальных селекторов BentoForge.",
          "Введите подробный промпт с описанием цветовой гаммы, темы оформления или поведения компонента.",
          "Нажмите 'Синтезировать страницу' для запуска конвейера генерации и рендеринга в контейнере песочницы."
        ],
        technicalDetailsEn: [
          "Supports React 18 functional layouts styled with Tailwind CSS utility declarations.",
          "Automatic HTML sanitization and iframe-isolated execution sandbox."
        ],
        technicalDetailsRu: [
          "Поддержка функциональных макетов React 18, стилизованных классами Tailwind CSS.",
          "Автоматическая санитизация HTML и изолированная песочница запуска в iframe."
        ]
      },
      code: {
        titleEn: "CODE STUDIO IDE & File Commander",
        titleRu: "CODE STUDIO Среда Разработки IDE",
        descEn: "A high-performance full-stack integrated development environment inside your browser. Browse directories, edit codebase, and trigger continuous validation.",
        descRu: "Высокопроизводительная интегрированная среда разработки (IDE) в вашем браузере. Просматривайте директории, редактируйте код и запускайте непрерывную валидацию.",
        stepsEn: [
          "Browse files using the left-hand directory explorer; click any file to load into the text editor.",
          "Modify React/TypeScript components or backend Express API endpoints in real-time.",
          "Save your changes and observe automatic hot-reloads and continuous compilation safety tests."
        ],
        stepsRu: [
          "Изучайте файлы с помощью левого проводника; кликните на файл для загрузки в текстовый редактор.",
          "Редактируйте компоненты React/TypeScript или API-эндпоинты Express в реальном времени.",
          "Сохраняйте изменения и наблюдайте за автоматической перезагрузкой и тестами компиляции."
        ],
        technicalDetailsEn: [
          "Interactive text editor with syntax highlighting for TSX, CSS, JSON, and Markdown.",
          "Integrated workspace builder tied directly to container processes."
        ],
        technicalDetailsRu: [
          "Интерактивный текстовый редактор с подсветкой синтаксиса для TSX, CSS, JSON и Markdown.",
          "Интегрированный сборщик рабочего пространства, напрямую связанный с контейнерами."
        ]
      },
      knowledge: {
        titleEn: "KNOWLEDGE HUB RAG Indexer",
        titleRu: "KNOWLEDGE HUB Векторный Индексатор",
        descEn: "Manage, audit, and slice critical document collections. Converts unstructured text blocks into optimized vector database embeddings for AI orchestrators.",
        descRu: "Управляйте, проверяйте и нарезайте коллекции документов. Преобразует неструктурированный текст в оптимизированные векторные эмбеддинги для ИИ-оркестраторов.",
        stepsEn: [
          "Upload PDF, JSON, or TXT documentation files or insert raw text blocks directly into the input fields.",
          "Trigger the 'Generate Embeddings' task to chunk text and feed the vector database index.",
          "Run 'Auto-Correct & Optimize' to automatically inspect and repair formatting gaps."
        ],
        stepsRu: [
          "Загружайте файлы PDF, JSON, TXT или вносите текст напрямую в поля ввода.",
          "Запустите задачу 'Генерировать эмбеддинги' для разбиения текста на чанки и наполнения индекса.",
          "Запустите функцию 'Автокоррекция и оптимизация' для автоматического исправления форматирования."
        ],
        technicalDetailsEn: [
          "Semantic text chunking operates on a 500-token sliding window with overlap.",
          "Vector conversions utilize state-of-the-art text embedding models."
        ],
        technicalDetailsRu: [
          "Семантическая разбивка текста работает по методу скользящего окна в 500 токенов с перекрытием.",
          "Преобразование в векторы использует современные модели вложения текстов."
        ]
      },
      music: {
        titleEn: "MUSIC STUDIO Neural Sound Synthesizer",
        titleRu: "MUSIC STUDIO Нейросинтезатор Звука",
        descEn: "Compose dynamic neural sound loops, adjust structural BPM speeds, mix ambient sound frequencies, and export custom synthetic audio clips.",
        descRu: "Сочиняйте динамические звуковые лупы, настраивайте BPM, микшируйте фоновые звуковые частоты и экспортируйте синтезированные аудиоклипы.",
        stepsEn: [
          "Initialize the web-audio synthesizer module using the primary wave loop controllers.",
          "Adjust ambient BPM settings, frequency density sliders, and low-frequency modulation (LFO).",
          "Preview synthesized tracks and click 'Export Audio' to save files to your local device."
        ],
        stepsRu: [
          "Инициализируйте веб-синтезатор аудио с помощью контроллеров волновых циклов.",
          "Регулируйте BPM, слайдеры плотности частот и низкочастотную модуляцию (LFO).",
          "Прослушивайте синтезированные дорожки и нажмите 'Экспорт аудио' для сохранения файлов на устройство."
        ],
        technicalDetailsEn: [
          "Utilizes modern Web Audio API node nodes for high-fidelity oscillator synthesis.",
          "Dynamic visualizer displays real-time FFT frequency spectrum analysis."
        ],
        technicalDetailsRu: [
          "Использует современные узлы Web Audio API для качественного осцилляторного синтеза.",
          "Динамический визуализатор отображает спектральный анализ частот FFT в реальном времени."
        ]
      },
      video: {
        titleEn: "VIDEO STUDIO Procedural Frame Generator",
        titleRu: "VIDEO STUDIO Процедурный Генератор Кадров",
        descEn: "Render cinematic-quality motion sequences, control timeline frames, specify prompt scripts, and compile custom visual mp4 assets.",
        descRu: "Рендерите кинематографические видеопоследовательности, управляйте кадрами таймлайна, задавайте сценарии и компилируйте видеофайлы в формате mp4.",
        stepsEn: [
          "Choose the desired video resolution, frame rate, and core animation model configurations.",
          "Write a storyboard prompt detailing the movement, camera angles, and atmosphere.",
          "Click 'Render Sequence' to initiate the frames generation and download the compiled mp4."
        ],
        stepsRu: [
          "Выберите разрешение видео, частоту кадров и конфигурацию базовой анимационной модели.",
          "Напишите сценарий промпта с подробным описанием движений, ракурсов камеры и атмосферы.",
          "Нажмите 'Рендерить сцену' для запуска генерации кадров и загрузки готового mp4-файла."
        ],
        technicalDetailsEn: [
          "Frame pipeline outputs procedural high-definition animations at up to 60fps.",
          "Utilizes server-side AI model prediction pipelines to render spatial consistency."
        ],
        technicalDetailsRu: [
          "Конвейер кадров выводит процедурные анимации высокого разрешения с частотой до 60 кадров/сек.",
          "Использует серверные конвейеры ИИ для обеспечения пространственной согласованности."
        ]
      },
      agent: {
        titleEn: "AGENT STUDIO Multi-Agent Forge",
        titleRu: "AGENT STUDIO Конструктор Мультиагентов",
        descEn: "Design custom neural agent identities. Teach autonomous systems specific skillsets, assign roles, and simulate collaborative chat structures.",
        descRu: "Проектируйте уникальные цифровые личности ИИ-агентов. Обучайте системы навыкам, распределяйте роли и симулируйте сценарии совместной работы.",
        stepsEn: [
          "Open the Agent Forge panel and choose the agent core type (Analyst, Coder, Creative).",
          "Provide custom system instructions, select LLM models, and toggle tool accesses (Search, Files).",
          "Launch multi-agent discussions in Swarm Orchestra to simulate automated problem-solving."
        ],
        stepsRu: [
          "Откройте панель Agent Forge и выберите тип ядра агента (Аналитик, Программист, Креатив).",
          "Задайте системные инструкции, выберите модель LLM и переключите доступ к инструментам.",
          "Запустите обсуждения агентов в Swarm Orchestra для симуляции автоматического решения задач."
        ],
        technicalDetailsEn: [
          "Agent architecture supports parallel asynchronous message loops with role isolation.",
          "Automated JSON-based context routing to provide stateful agent memories."
        ],
        technicalDetailsRu: [
          "Архитектура агентов поддерживает параллельные асинхронные циклы сообщений с изоляцией ролей.",
          "Автоматическая маршрутизация контекста на базе JSON для обеспечения памяти состояний."
        ]
      },
      image: {
        titleEn: "IMAGE STUDIO Neural Art Engine",
        titleRu: "IMAGE STUDIO Нейронный Арт-Движок",
        descEn: "Generate and edit artwork using deep learning diffusion models. Apply custom style guides and aspect ratios with real-time parameter variations.",
        descRu: "Генерируйте и редактируйте графику с использованием диффузионных моделей глубокого обучения. Применяйте стилевые пресеты и пропорции с тонкой настройкой.",
        stepsEn: [
          "Specify prompt guidelines detailing artistic concepts, lightning values, and style choices.",
          "Adjust aspect ratios (1:1, 16:9, 4:3) and fine-tuning slider controls.",
          "Click 'Synthesize Imagery' to launch the generation and apply real-time glowing filter presets."
        ],
        stepsRu: [
          "Укажите промпт с подробным описанием концепции, освещения и выбранного художественного стиля.",
          "Настройте соотношение сторон (1:1, 16:9, 4:3) и ползунки точной регулировки.",
          "Нажмите 'Синтезировать изображение' для генерации и наложите эффекты свечения."
        ],
        technicalDetailsEn: [
          "Powered by high-contrast diffusion models with automatic text-to-image enhancement.",
          "Dynamic canvas renderer ensures eye-safe RGB color conversions."
        ],
        technicalDetailsRu: [
          "Работает на базе диффузионных моделей с автоматическим улучшением промптов.",
          "Динамический рендеринг холста гарантирует безопасное для глаз преобразование цветов RGB."
        ]
      },
      lab: {
        titleEn: "PULSE LAB Experimental Physics Sandbox",
        titleRu: "Экспериментальная Лаборатория PULSE LAB",
        descEn: "A sandbox environment designed to test non-linear system formulas, interact with responsive coordinate meshes, and stress-test core system APIs.",
        descRu: "Экспериментальная среда для тестирования формул нелинейных систем, взаимодействия с интерактивной сеткой координат и стресс-тестирования API.",
        stepsEn: [
          "Adjust the mathematical formulas and fluid speed coefficients of the interactive liquid mesh.",
          "Observe raw real-time telemetry variables and core JSON payloads on the visual node monitor.",
          "Execute automated network stress tests to monitor internal database and server response times."
        ],
        stepsRu: [
          "Настраивайте математические формулы и коэффициенты скорости жидкой сетки.",
          "Наблюдайте за переменными телеметрии и JSON-файлами на мониторе узлов.",
          "Запускайте автоматические стресс-тесты сети для мониторинга времени отклика базы данных."
        ],
        technicalDetailsEn: [
          "Liquid mesh operations are rendered via CPU-optimized SVG vector coordinates in React state.",
          "Stress test daemon simulates up to 250 sequential request loads in 2.0 seconds."
        ],
        technicalDetailsRu: [
          "Операции жидкой сетки рендерятся через оптимизированные векторы SVG в стейте React.",
          "Демон стресс-тестов симулирует нагрузку до 250 последовательных запросов за 2.0 секунды."
        ]
      },
      gallery: {
        titleEn: "ASSET UNIVERSE & Gallery Hub",
        titleRu: "Хранилище Ресурсов ASSET UNIVERSE",
        descEn: "An integrated catalog containing all creative visual, audio, web, and code outputs created during your Dark Mnmll Pulse OS session.",
        descRu: "Интегрированный каталог, содержащий все графические, аудио-, веб- и программные результаты, созданные во время сессии в Dark Mnmll Pulse OS.",
        stepsEn: [
          "Filter assets by category types (Audio, Video, Web, Code, Images) using the top navigation pill buttons.",
          "Click any individual card to expand the full view and inspect underlying generation details (prompt, seed, models).",
          "Use the quick export buttons to download assets to your local storage or publish them to cloud endpoints."
        ],
        stepsRu: [
          "Фильтруйте ресурсы по категориям (Аудио, Видео, Веб, Код, Картинки) с помощью кнопок навигации.",
          "Кликните на карточку для просмотра детальных параметров генерации (промпт, сид, модель).",
          "Используйте кнопки экспорта для загрузки файлов на диск или публикации в облаке."
        ],
        technicalDetailsEn: [
          "Utilizes local storage and IndexedDB file-pointer caches to avoid asset lookup delays.",
          "Maintains absolute execution timeline logs for quality audits."
        ],
        technicalDetailsRu: [
          "Использует кеш local storage и IndexedDB для исключения задержек при поиске ресурсов.",
          "Ведет лог таймлайна выполнения для аудита качества генерации."
        ]
      },
      swarm: {
        titleEn: "SWARM CHAT Multi-Agent Orchestrator",
        titleRu: "Оркестратор SWARM CHAT Роевого Интеллекта",
        descEn: "An interface designed to simulate direct discussions with an autonomous multi-agent swarm. Coordinate collaborative solutions across multiple digital experts.",
        descRu: "Интерфейс для симуляции диалога с роем автономных ИИ-агентов. Координируйте совместное решение сложных задач группой экспертов.",
        stepsEn: [
          "Type your prompt in the chat input field or select predefined prompt tasks.",
          "Submit the request to observe the system orchestrating background discussions and task divisions.",
          "Inspect individual agent messages and copy generated code or assets directly from the text log."
        ],
        stepsRu: [
          "Введите ваш промпт в поле чата или выберите предустановленную задачу.",
          "Отправьте запрос, чтобы увидеть, как система координирует фоновые обсуждения агентов.",
          "Изучайте сообщения отдельных агентов и копируйте код или файлы прямо из лога беседы."
        ],
        technicalDetailsEn: [
          "Integrates role-based conversational buffers to prevent message collusions.",
          "Utilizes token-saving short histories with automated key semantic retention."
        ],
        technicalDetailsRu: [
          "Интегрирует диалоговые буферы на основе ролей для предотвращения смешивания сообщений.",
          "Использует сокращенную историю для экономии токенов с сохранением ключевого смысла."
        ]
      },
      quantum: {
        titleEn: "QUANTUM MIND Core Simulator",
        titleRu: "Симулятор QUANTUM MIND",
        descEn: "Explore cognitive connection simulations. Visualizes the multi-layered neural pathways and cognitive structures used by our autonomous swarm agents.",
        descRu: "Исследуйте симуляции когнитивных связей. Визуализирует многослойные нейронные пути и когнитивные структуры, используемые роем агентов.",
        stepsEn: [
          "Select specific cognitive levels (Sensory, Semantic, Associative, Executive) inside the dashboard panels.",
          "Click neural core connectors to trigger pulse waves and trace cognitive signal translations.",
          "Toggle interactive parameters to alter connection strengths and map new neural patterns."
        ],
        stepsRu: [
          "Выбирайте когнитивные уровни (Сенсорный, Семантический, Ассоциативный, Исполнительный).",
          "Кликните на коннекторы ядер для запуска импульсных волн и отслеживания сигналов.",
          "Изменяйте интерактивные параметры для регулирования силы связей и создания новых нейронных паттернов."
        ],
        technicalDetailsEn: [
          "Cognitive pathways are rendered via responsive canvas coordinates.",
          "Uses real-time feedback loops to calculate and present connection weight indexes."
        ],
        technicalDetailsRu: [
          "Когнитивные связи рендерятся через динамические координаты холста.",
          "Использует обратную связь для вычисления и отображения индексов весов соединений."
        ]
      },
      dna: {
        titleEn: "DNA SEQUENCER & Code Calibrator",
        titleRu: "DNA SEQUENCER Калибровка Кода",
        descEn: "Inspect the structural 'DNA' genome of our AI-generated scripts. Perform molecular-style audits, identify visual layout bugs, and correct syntax structure.",
        descRu: "Изучайте структурный 'ДНК-геном' генерируемого кода. Проводите аудит в молекулярном стиле, выявляйте визуальные баги разметки и исправляйте синтаксис.",
        stepsEn: [
          "Load the specific script block into the molecular view calibrator.",
          "Analyze structural gaps, CSS alignment faults, and variable naming errors on the live scanner.",
          "Run 'Synthesize Helix Repairs' to generate optimized corrections and validate compilation safety."
        ],
        stepsRu: [
          "Загрузите блок кода в калибратор молекулярного представления.",
          "Анализируйте структурные пропуски, ошибки выравнивания CSS и именования переменных на сканере.",
          "Запустите автоматическое исправление для оптимизации структуры кода и валидации компиляции."
        ],
        technicalDetailsEn: [
          "Utilizes semantic parsing algorithms to divide code files into individual visual genomes.",
          "Automatic continuous lint check verifies TypeScript compilation viability."
        ],
        technicalDetailsRu: [
          "Использует алгоритмы семантического парсинга для разделения кода на визуальные гены.",
          "Автоматический фоновый линтинг проверяет успешность компиляции TypeScript."
        ]
      },
      reality: {
        titleEn: "REALITY ENGINE Spacetime Synthesizer",
        titleRu: "REALITY ENGINE Синтезатор Реальности",
        descEn: "Perform multi-parameter spacetime simulation synthesis. Adjust density factors, chromatic noise, and exposure controls to generate highly calibrated media.",
        descRu: "Проводите многопараметрический синтез пространственно-временных симуляций. Настраивайте плотность, хроматический шум и параметры экспозиции.",
        stepsEn: [
          "Fine-tune the density, chromatic noise, exposure, and structural complexity sliders.",
          "Select the desired output format mode (Video Sequence or Still Asset).",
          "Click 'Manifest Reality' to start the synthesis and view calibrated rendering coordinates."
        ],
        stepsRu: [
          "Отрегулируйте слайдеры плотности, хроматического шума, экспозиции и сложности структуры.",
          "Выберите формат выходных данных (Видеопоследовательность или Статичный ассет).",
          "Нажмите кнопку 'Проявить реальность' для старта синтеза и просмотра координат рендеринга."
        ],
        technicalDetailsEn: [
          "Synthesizer algorithms combine deep-learning generation pipelines with mathematical noise filters.",
          "Saves compiled spacetime outputs directly to your Asset Universe library catalog."
        ],
        technicalDetailsRu: [
          "Алгоритмы синтезатора сочетают глубокие сети генерации с математическими фильтрами шума.",
          "Сохраняет скомпилированные результаты напрямую в библиотеку Asset Universe."
        ]
      }
    };

    return docs[sec] || docs.dashboard;
  };

  const doc = getBilingualDoc(section);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] pointer-events-auto"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 overflow-y-auto z-[999999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`relative w-full max-w-4xl max-h-[85vh] rounded-[2rem] border overflow-hidden shadow-2xl flex flex-col ${
                isLight 
                  ? 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-300/50' 
                  : 'bg-zinc-950/95 border-white/5 text-white backdrop-blur-2xl shadow-black/80'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-pulse-primary/10 text-pulse-primary border border-pulse-primary/20">
                    <BookOpen className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-pulse-primary">
                      {doc.titleEn.toUpperCase()} // MANUAL
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                      DARK MNMLL PULSE OS // CONTEXTUAL SYSTEM BLUEPRINT
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-xl border transition-all hover:scale-105 cursor-pointer ${
                    isLight 
                      ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-500' 
                      : 'border-white/5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bilingual Split Grid Main Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/5">
                
                {/* Introduction Bilingual Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/5">
                  {/* English Section */}
                  <div className="space-y-2 border-r border-white/5 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-indigo-400 tracking-wider uppercase bg-indigo-950/40 px-2 py-0.5 rounded-lg">
                      🇬🇧 EN // OVERVIEW
                    </span>
                    <h4 className="text-sm font-sans font-semibold tracking-tight text-zinc-100">
                      {doc.titleEn}
                    </h4>
                    <p className="text-[11px] font-sans leading-relaxed text-zinc-400">
                      {doc.descEn}
                    </p>
                  </div>

                  {/* Russian Section */}
                  <div className="space-y-2 pl-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 tracking-wider uppercase bg-emerald-950/40 px-2 py-0.5 rounded-lg">
                      🇷🇺 RU // ОБЗОР
                    </span>
                    <h4 className="text-sm font-sans font-semibold tracking-tight text-zinc-100">
                      {doc.titleRu}
                    </h4>
                    <p className="text-[11px] font-sans leading-relaxed text-zinc-400">
                      {doc.descRu}
                    </p>
                  </div>
                </div>

                {/* Steps Bilingual Row */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-pulse-accent animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-pulse-accent uppercase">
                      BILINGUAL INSTRUCTIONS // ИНСТРУКЦИИ НА ДВУХ ЯЗЫКАХ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* English Steps Column */}
                    <div className="space-y-3.5 border-r border-white/5 pr-4">
                      <span className="text-[9px] font-mono text-indigo-400/80 tracking-widest uppercase block mb-1">OPERATIONAL PROTOCOL</span>
                      {doc.stepsEn.map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start group">
                          <span className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] font-mono font-bold flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-all">
                            0{idx + 1}
                          </span>
                          <p className="text-[11px] font-sans leading-relaxed text-zinc-300">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Russian Steps Column */}
                    <div className="space-y-3.5 pl-2">
                      <span className="text-[9px] font-mono text-emerald-400/80 tracking-widest uppercase block mb-1">ОПЕРАЦИОННЫЙ ПРОТОКОЛ</span>
                      {doc.stepsRu.map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start group">
                          <span className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-all">
                            0{idx + 1}
                          </span>
                          <p className="text-[11px] font-sans leading-relaxed text-zinc-300">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specifications / Under the hood Bilingual Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5 text-[9.5px]">
                  {/* Technical Specifications EN */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1.5">
                    <span className="font-mono font-bold text-indigo-300 uppercase tracking-widest block mb-1">TECHNICAL SPECIFICATION</span>
                    {doc.technicalDetailsEn.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-zinc-400">
                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Technical Specifications RU */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1.5">
                    <span className="font-mono font-bold text-emerald-300 uppercase tracking-widest block mb-1">ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ</span>
                    {doc.technicalDetailsRu.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-zinc-400">
                        <div className="w-1 h-1 rounded-full bg-emerald-400" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Footer status */}
              <div className="p-4 bg-zinc-900/40 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-zinc-500 tracking-widest">
                <span>SECURITY LEVEL: EXTREME</span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  HYBRID CONVERSATIONAL SYNCHRONIZATION ACTIVE
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
export default DocumentationModal;
