import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Keyboard, 
  Search, 
  X, 
  LayoutGrid, 
  Bot, 
  Layers, 
  Fingerprint, 
  Zap, 
  BookOpen, 
  Network, 
  FolderKanban, 
  Globe, 
  Terminal, 
  Music, 
  Video, 
  Sparkles, 
  Beaker, 
  Database, 
  Cpu, 
  GitBranch, 
  Activity, 
  Server, 
  Key, 
  ShoppingBag,
  Command,
  Sun,
  Moon
} from 'lucide-react';

interface KeyboardShortcutManagerProps {
  isLight: boolean;
  onToggleSidebar: () => void;
  onToggleCommandPalette: () => void;
  onToggleTheme: () => void;
  onTriggerPulse: () => void;
  onTriggerDiagnostics: () => void;
  onOpenPersonalization: () => void;
  onCloseAll: () => void;
  onToggleSystemConsole?: () => void;
}

interface ShortcutItem {
  id: string;
  category: 'system' | 'navigation' | 'studios';
  keys: string[];
  icon: React.ReactNode;
  labelEn: string;
  labelRu: string;
  descEn: string;
  descRu: string;
  action: () => void;
}

export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({
  isLight,
  onToggleSidebar,
  onToggleCommandPalette,
  onToggleTheme,
  onTriggerPulse,
  onTriggerDiagnostics,
  onOpenPersonalization,
  onCloseAll,
  onToggleSystemConsole
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [showHUD, setShowHUD] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const shortcuts: ShortcutItem[] = useMemo(() => [
    // System Shortcuts
    {
      id: 'sidebar',
      category: 'system',
      keys: ['Ctrl/⌘', 'B'],
      icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
      labelEn: 'Toggle Sidebar Panel',
      labelRu: 'Скрыть/Показать боковую панель',
      descEn: 'Toggle side workspace drawer and menu visibility.',
      descRu: 'Переключение видимости боковой панели.',
      action: onToggleSidebar
    },
    {
      id: 'palette',
      category: 'system',
      keys: ['Ctrl/⌘', 'K'],
      icon: <Command className="w-3.5 h-3.5 text-cyan-400" />,
      labelEn: 'Open Command Palette',
      labelRu: 'Открыть палитру команд',
      descEn: 'Triggers global command launcher and AI assistant query.',
      descRu: 'Запуск глобального поиска и выполнения команд.',
      action: onToggleCommandPalette
    },
    {
      id: 'theme',
      category: 'system',
      keys: ['Alt', 'T'],
      icon: isLight ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />,
      labelEn: 'Toggle UI Theme',
      labelRu: 'Переключить цветовую тему',
      descEn: 'Switch between Obsidian Dark and High-contrast Light modes.',
      descRu: 'Переключение между светлым и темным оформлением интерфейса.',
      action: onToggleTheme
    },
    {
      id: 'hud',
      category: 'system',
      keys: ['?'],
      icon: <Keyboard className="w-3.5 h-3.5 text-emerald-400" />,
      labelEn: 'Display Hotkeys HUD',
      labelRu: 'Показать список горячих клавиш',
      descEn: 'Display this visual dashboard of keyboard shortcut bindings.',
      descRu: 'Показывает интерактивное меню всех доступных сочетаний клавиш.',
      action: () => setShowHUD(prev => !prev)
    },
    {
      id: 'gesture_swipe',
      category: 'navigation',
      keys: ['Swipe', 'или Alt+◄/►'],
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
      labelEn: 'Seamless Studio Swipe Gesture',
      labelRu: 'Жест бесшовной навигации студий',
      descEn: 'Swipe left/right on touch/mouse to switch studios seamlessly.',
      descRu: 'Свайп влево/вправо пальцем или мышью для бесшовного перехода между студиями.',
      action: () => {}
    },
    {
      id: 'diagnostics',
      category: 'system',
      keys: ['Alt', 'X'],
      icon: <Activity className="w-3.5 h-3.5 text-rose-400" />,
      labelEn: 'Run Diagnostics Sweep',
      labelRu: 'Запустить диагностику системы',
      descEn: 'Trigger total neural and memory core diagnostics checks.',
      descRu: 'Запускает когнитивную проверку целостности сети.',
      action: onTriggerDiagnostics
    },
    {
      id: 'pulse',
      category: 'system',
      keys: ['Alt', 'P'],
      icon: <Zap className="w-3.5 h-3.5 text-purple-400" />,
      labelEn: 'Trigger Pulse Wave',
      labelRu: 'Запустить волну пульса',
      descEn: 'Initiate localized audio and ripple animations across the screen.',
      descRu: 'Создает звуковые и визуальные пульсации на экране.',
      action: onTriggerPulse
    },
    {
      id: 'system-console',
      category: 'system',
      keys: ['Alt', '\\'],
      icon: <Terminal className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />,
      labelEn: 'Toggle Azrail System Console',
      labelRu: 'Открыть консоль диагностики Azrail',
      descEn: 'Display live diagnostic streams from Azrail Memory Core.',
      descRu: 'Отображает поток диагностики ядра Azrail в реальном времени.',
      action: onToggleSystemConsole || (() => {})
    },

    // Navigation (Primary Modules)
    {
      id: 'dashboard',
      category: 'navigation',
      keys: ['Alt', '1'],
      icon: <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />,
      labelEn: 'Command Center',
      labelRu: 'Центр Управления',
      descEn: 'Main operations dashboard with metrics and sync monitors.',
      descRu: 'Главная панель управления со статистикой и датчиками синхронизации.',
      action: () => navigate('/dashboard')
    },
    {
      id: 'swarm',
      category: 'navigation',
      keys: ['Alt', '2'],
      icon: <Bot className="w-3.5 h-3.5 text-indigo-400" />,
      labelEn: 'Swarm Commander',
      labelRu: 'Командир Роя',
      descEn: 'Cognitive multi-agent unified chat channel.',
      descRu: 'Чат-канал взаимодействия с роем когнитивных агентов.',
      action: () => navigate('/swarm-chat')
    },
    {
      id: 'quantum',
      category: 'navigation',
      keys: ['Alt', '3'],
      icon: <Layers className="w-3.5 h-3.5 text-cyan-400" />,
      labelEn: 'Quantum Mind',
      labelRu: 'Квантовый Разум',
      descEn: 'Converged parallel queries and system thinking loops.',
      descRu: 'Многомодельный синтез и параллельные когнитивные петли.',
      action: () => navigate('/quantum')
    },
    {
      id: 'dna',
      category: 'navigation',
      keys: ['Alt', '4'],
      icon: <Fingerprint className="w-3.5 h-3.5 text-red-400" />,
      labelEn: 'DNA Sequencer',
      labelRu: 'Секвенатор ДНК',
      descEn: 'Digital psycho-profile calibration and biofeedback matrix.',
      descRu: 'Анализ цифрового психопрофиля и эстетическая калибровка.',
      action: () => navigate('/dna')
    },
    {
      id: 'reality',
      category: 'navigation',
      keys: ['Alt', '5'],
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      labelEn: 'Reality Engine',
      labelRu: 'Движок Реальности',
      descEn: 'Cinematic multimedia synthesis and audio projection layers.',
      descRu: 'Синтез медиапотоков и проекций высокого разрешения.',
      action: () => navigate('/reality')
    },
    {
      id: 'book',
      category: 'navigation',
      keys: ['Alt', '6'],
      icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" />,
      labelEn: 'System Manifesto',
      labelRu: 'Манифест Системы',
      descEn: 'Philosophical documentation and fundamental specs of the OS.',
      descRu: 'Официальная документация и манифест философии архитектуры.',
      action: () => navigate('/book')
    },
    {
      id: 'infrastructure',
      category: 'navigation',
      keys: ['Alt', '7'],
      icon: <Network className="w-3.5 h-3.5 text-purple-400" />,
      labelEn: 'Infrastructure Hub',
      labelRu: 'Инфраструктурный Хаб',
      descEn: 'Manage edge pipelines, DNS records, and cloud run servers.',
      descRu: 'Управление доменами Cloudflare и контейнерами Cloud Run.',
      action: () => navigate('/infrastructure')
    },
    {
      id: 'gallery',
      category: 'navigation',
      keys: ['Alt', '8'],
      icon: <FolderKanban className="w-3.5 h-3.5 text-pink-400" />,
      labelEn: 'Archive Hub',
      labelRu: 'Архивный Хаб',
      descEn: 'Global static files explorer and generated graphics catalog.',
      descRu: 'Архив медиафайлов и галерея сгенерированных изображений.',
      action: () => navigate('/gallery')
    },

    // Specialist Studios
    {
      id: 'studio-web',
      category: 'studios',
      keys: ['Alt', 'W'],
      icon: <Globe className="w-3.5 h-3.5 text-indigo-400" />,
      labelEn: 'Web Studio',
      labelRu: 'Веб-Студия',
      descEn: 'Direct visual layout generator and single-page apps builder.',
      descRu: 'Визуальный конструктор и генератор веб-интерфейсов.',
      action: () => navigate('/studio/web')
    },
    {
      id: 'studio-code',
      category: 'studios',
      keys: ['Alt', 'C'],
      icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" />,
      labelEn: 'Code Studio',
      labelRu: 'Код-Студия',
      descEn: 'Full-stack development workspace, editor and terminal logs.',
      descRu: 'Интегрированная рабочая среда разработки и отладки.',
      action: () => navigate('/studio/code')
    },
    {
      id: 'studio-music',
      category: 'studios',
      keys: ['Alt', 'U'],
      icon: <Music className="w-3.5 h-3.5 text-amber-400" />,
      labelEn: 'Music Studio',
      labelRu: 'Музыкальная Студия',
      descEn: 'Neural synthesizer and ambient soundscape wave composer.',
      descRu: 'Синтезатор мелодий и генератор фоновых звуковых дорожек.',
      action: () => navigate('/studio/music')
    },
    {
      id: 'studio-video',
      category: 'studios',
      keys: ['Alt', 'V'],
      icon: <Video className="w-3.5 h-3.5 text-red-400" />,
      labelEn: 'Video Studio',
      labelRu: 'Видео-Студия',
      descEn: 'Synthesize moving clips, frame sequences and spoken tracks.',
      descRu: 'Студия генерации видеороликов и анимированных секвенций.',
      action: () => navigate('/studio/video')
    },
    {
      id: 'studio-agent',
      category: 'studios',
      keys: ['Alt', 'F'],
      icon: <Bot className="w-3.5 h-3.5 text-cyan-400" />,
      labelEn: 'Agent Forge',
      labelRu: 'Кузница Агентов',
      descEn: 'Compile and program persistent specialized helper bots.',
      descRu: 'Программирование и компиляция специализированных ИИ-агентов.',
      action: () => navigate('/studio/agent')
    },
    {
      id: 'studio-image',
      category: 'studios',
      keys: ['Alt', 'N'],
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
      labelEn: 'Neural Image',
      labelRu: 'Нейро-Картины',
      descEn: 'Diffusion engine for design mockups, UI blueprints and art.',
      descRu: 'Генерация концепт-артов, макетов интерфейсов и графики.',
      action: () => navigate('/studio/image')
    },
    {
      id: 'studio-lab',
      category: 'studios',
      keys: ['Alt', 'L'],
      icon: <Beaker className="w-3.5 h-3.5 text-blue-400" />,
      labelEn: 'Pulse Lab',
      labelRu: 'Лаборатория Пульса',
      descEn: 'Experimental features, canvas sandboxes, and shaders sandbox.',
      descRu: 'Песочница экспериментальных функций и шейдерных эффектов.',
      action: () => navigate('/studio/lab')
    },
    {
      id: 'studio-knowledge',
      category: 'studios',
      keys: ['Alt', 'K'],
      icon: <Database className="w-3.5 h-3.5 text-rose-400" />,
      labelEn: 'Knowledge Hub',
      labelRu: 'База Знаний',
      descEn: 'Upload core documents, train neural models, browse embeddings.',
      descRu: 'База векторов, загрузка документов для обучения и дообучения.',
      action: () => navigate('/studio/knowledge')
    },
    {
      id: 'studio-data',
      category: 'studios',
      keys: ['Alt', 'J'],
      icon: <Database className="w-3.5 h-3.5 text-indigo-400" />,
      labelEn: 'Data Studio',
      labelRu: 'Студия Данных',
      descEn: 'Relational Cloud SQL tables orchestrator and visual viewer.',
      descRu: 'Администрирование таблиц реляционной БД Cloud SQL.',
      action: () => navigate('/studio/data')
    },
    {
      id: 'studio-model',
      category: 'studios',
      keys: ['Alt', 'O'],
      icon: <Cpu className="w-3.5 h-3.5 text-teal-400" />,
      labelEn: 'Model Studio',
      labelRu: 'Студия Моделей',
      descEn: 'Fine-tune neural cores, configure temperatures and tokens.',
      descRu: 'Настройка параметров нейросети, температуры и токенов.',
      action: () => navigate('/studio/model')
    },
    {
      id: 'studio-automation',
      category: 'studios',
      keys: ['Alt', 'Y'],
      icon: <GitBranch className="w-3.5 h-3.5 text-amber-400" />,
      labelEn: 'Automation Studio',
      labelRu: 'Студия Автоматизации',
      descEn: 'Setup webhook nodes and automated cognitive routers.',
      descRu: 'Создание триггеров событий и автоматических вебхуков.',
      action: () => navigate('/studio/automation')
    },
    {
      id: 'studio-analytics',
      category: 'studios',
      keys: ['Alt', 'H'],
      icon: <Activity className="w-3.5 h-3.5 text-pink-400" />,
      labelEn: 'Analytics Studio',
      labelRu: 'Студия Аналитики',
      descEn: 'Live GPU memory counters, generation throughput, API costs.',
      descRu: 'Мониторинг видеопамяти GPU, скорости генерации и расходов.',
      action: () => navigate('/studio/analytics')
    },
    {
      id: 'studio-deploy',
      category: 'studios',
      keys: ['Alt', 'E'],
      icon: <Server className="w-3.5 h-3.5 text-indigo-400" />,
      labelEn: 'Deploy Studio',
      labelRu: 'Студия Деплоя',
      descEn: 'Immutable container packaging and serverless cluster logs.',
      descRu: 'Компиляция неизменяемых образов и контейнеров для продакшена.',
      action: () => navigate('/studio/deploy')
    },
    {
      id: 'studio-security',
      category: 'studios',
      keys: ['Alt', 'P'],
      icon: <Key className="w-3.5 h-3.5 text-rose-400" />,
      labelEn: 'Security Center',
      labelRu: 'Центр Безопасности',
      descEn: 'Sovereign RBAC member privileges and API key vault locks.',
      descRu: 'Управление ключами API, ролями пользователей и шифрованием.',
      action: () => navigate('/studio/security')
    },
    {
      id: 'studio-marketplace',
      category: 'studios',
      keys: ['Alt', 'X'],
      icon: <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />,
      labelEn: 'Marketplace',
      labelRu: 'Маркетплейс',
      descEn: 'Browse and buy custom pipelines, LoRAs and UI code.',
      descRu: 'Каталог расширений, моделей LoRA и шаблонов интерфейса.',
      action: () => navigate('/studio/marketplace')
    }
  ], [navigate, onToggleSidebar, onToggleCommandPalette, onToggleTheme, onTriggerPulse, onTriggerDiagnostics, isLight]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      const target = e.target as HTMLElement;
      const isInputActive = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape is always registered
      if (e.key === 'Escape') {
        if (showHUD) {
          setShowHUD(false);
        } else {
          onCloseAll();
        }
      }

      // Input Focus Guard - do not trigger navigation/sidebar shortcuts when typing
      if (isInputActive) {
        // Allow Command Palette and Sidebar toggling even in inputs
        if (isCmd && key === 'k') {
          e.preventDefault();
          onToggleCommandPalette();
        }
        if (isCmd && key === 'b') {
          e.preventDefault();
          onToggleSidebar();
        }
        return;
      }

      // Help/HUD toggle shortcut
      if (e.key === '?' || (isShift && e.key === '/')) {
        e.preventDefault();
        setShowHUD(prev => !prev);
        return;
      }

      // Command Palette (Cmd + K)
      if (isCmd && key === 'k') {
        e.preventDefault();
        onToggleCommandPalette();
      }

      // Sidebar Toggle (Cmd + B)
      if (isCmd && key === 'b') {
        e.preventDefault();
        onToggleSidebar();
      }

      // Theme toggle (Alt + T or Cmd + Shift + T)
      if ((isAlt && key === 't') || (isCmd && isShift && key === 't')) {
        e.preventDefault();
        onToggleTheme();
      }

      // Navigation & Studio Shortkeys
      if (isAlt && !isShift) {
        // Alt + D: Dashboard, Alt + S: Swarm Commander, Alt + Q: Quantum Mind, etc.
        switch (key) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case 's':
            e.preventDefault();
            navigate('/swarm-chat');
            break;
          case 'q':
            e.preventDefault();
            navigate('/quantum');
            break;
          case 'a':
            e.preventDefault();
            navigate('/dna');
            break;
          case 'r':
            e.preventDefault();
            navigate('/reality');
            break;
          case 'm':
            e.preventDefault();
            navigate('/book');
            break;
          case 'i':
            e.preventDefault();
            navigate('/infrastructure');
            break;
          case 'g':
            e.preventDefault();
            navigate('/gallery');
            break;
          case 'x':
            e.preventDefault();
            onTriggerDiagnostics();
            break;
          case 'p':
            e.preventDefault();
            onTriggerPulse();
            break;
          case '\\':
            if (onToggleSystemConsole) {
              e.preventDefault();
              onToggleSystemConsole();
            }
            break;
          
          // Studio fast jumps
          case 'w':
            e.preventDefault();
            navigate('/studio/web');
            break;
          case 'c':
            e.preventDefault();
            navigate('/studio/code');
            break;
          case 'u':
            e.preventDefault();
            navigate('/studio/music');
            break;
          case 'v':
            e.preventDefault();
            navigate('/studio/video');
            break;
          case 'f':
            e.preventDefault();
            navigate('/studio/agent');
            break;
          case 'n':
            e.preventDefault();
            navigate('/studio/image');
            break;
          case 'l':
            e.preventDefault();
            navigate('/studio/lab');
            break;
          case 'k':
            e.preventDefault();
            navigate('/studio/knowledge');
            break;
          case 'j':
            e.preventDefault();
            navigate('/studio/data');
            break;
          case 'o':
            e.preventDefault();
            navigate('/studio/model');
            break;
          case 'y':
            e.preventDefault();
            navigate('/studio/automation');
            break;
          case 'h':
            e.preventDefault();
            navigate('/studio/analytics');
            break;
          case 'e':
            e.preventDefault();
            navigate('/studio/deploy');
            break;
        }
      }

      // Number Navigation: Cmd + [1-8] or Alt + [1-8]
      if ((isCmd || isAlt) && !isNaN(Number(e.key))) {
        const num = Number(e.key);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          const paths = [
            '/dashboard',
            '/swarm-chat',
            '/quantum',
            '/dna',
            '/reality',
            '/book',
            '/infrastructure',
            '/gallery'
          ];
          navigate(paths[num - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onToggleSidebar, onToggleCommandPalette, onToggleTheme, onTriggerPulse, onTriggerDiagnostics, onCloseAll, showHUD, onToggleSystemConsole]);

  // Filter shortcuts based on query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return shortcuts;
    const q = searchQuery.toLowerCase();
    return shortcuts.filter(s => 
      s.labelEn.toLowerCase().includes(q) || 
      s.labelRu.toLowerCase().includes(q) ||
      s.descEn.toLowerCase().includes(q) || 
      s.descRu.toLowerCase().includes(q) ||
      s.keys.some(k => k.toLowerCase().includes(q))
    );
  }, [shortcuts, searchQuery]);

  const categories = {
    system: language === 'en' ? 'Core System & Swarm Controls' : 'Управление Системой и Роем',
    navigation: language === 'en' ? 'Primary Navigation Modules' : 'Основные Навигационные Модули',
    studios: language === 'en' ? 'Specialist Studio Workspaces' : 'Специализированные Студии'
  };

  return (
    <AnimatePresence>
      {showHUD && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 font-mono select-none"
          onClick={() => setShowHUD(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-full max-w-3xl h-[80vh] max-h-[680px] rounded-2xl shadow-2xl border flex flex-col overflow-hidden relative ${
              isLight 
                ? 'bg-white border-zinc-200 text-zinc-900' 
                : 'bg-[#0B0816]/95 border-white/10 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 border-b flex justify-between items-center ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-white/5 bg-white/[0.02]'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                  <Keyboard className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                    {language === 'en' ? 'Cognitive Hotkey Terminal' : 'Терминал Горячих Клавиш'}
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest">
                    {language === 'en' ? 'Unified system keyboard register HUD' : 'Глобальный реестр когнитивных клавиш'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHUD(false)}
                className={`p-2 rounded-lg border transition-colors ${
                  isLight 
                    ? 'hover:bg-zinc-100 border-zinc-200' 
                    : 'hover:bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Filter Search Bar */}
            <div className={`p-4 border-b flex items-center gap-3 ${isLight ? 'border-zinc-100' : 'border-white/[0.03]'}`}>
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search keyboard shortcuts or keycaps...' : 'Поиск горячих клавиш или сочетаний...'}
                className="w-full bg-transparent border-none text-xs focus:outline-none placeholder-zinc-500"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase shrink-0 font-bold"
                >
                  {language === 'en' ? 'Clear' : 'Очистить'}
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {filteredShortcuts.length > 0 ? (
                (['system', 'navigation', 'studios'] as const).map((cat) => {
                  const catItems = filteredShortcuts.filter(s => s.category === cat);
                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-2.5">
                      <h3 className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest border-b border-white/5 pb-1">
                        {categories[cat]}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              item.action();
                              setShowHUD(false);
                            }}
                            className={`p-3 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
                              isLight 
                                ? 'bg-zinc-50 border-zinc-200/60 hover:bg-zinc-100/80' 
                                : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.04] hover:border-indigo-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${isLight ? 'bg-zinc-100' : 'bg-white/5'}`}>
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold truncate leading-tight">
                                  {language === 'en' ? item.labelEn : item.labelRu}
                                </h4>
                                <p className="text-[9px] text-zinc-500 truncate mt-0.5 leading-normal">
                                  {language === 'en' ? item.descEn : item.descRu}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              {item.keys.map((k, i) => (
                                <kbd
                                  key={i}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm font-sans ${
                                    isLight 
                                      ? 'bg-zinc-200 text-zinc-800 border border-zinc-300' 
                                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                                  }`}
                                >
                                  {k}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-zinc-500 text-xs uppercase tracking-wider">
                  {language === 'en' ? 'No keyboard shortcuts register matches.' : 'Совпадений в реестре горячих клавиш не найдено.'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-between items-center text-[9px] text-zinc-500 uppercase tracking-wider ${
              isLight ? 'border-zinc-200 bg-zinc-50' : 'border-white/5 bg-white/[0.01]'
            }`}>
              <span>
                {language === 'en' ? 'Click row to instantly execute register' : 'Кликните на строку для мгновенного выполнения'}
              </span>
              <span>
                {language === 'en' ? 'Esc / Click outside to close' : 'Esc / Клик вне окна для закрытия'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
