import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Bot, 
  Cpu, 
  Music, 
  Video, 
  Globe, 
  Fingerprint, 
  Layers, 
  Zap, 
  FolderKanban, 
  Settings, 
  BookOpen,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Activity,
  Waves,
  Sun,
  Moon,
  CreditCard,
  Terminal,
  Beaker,
  Database,
  GitBranch,
  Palette,
  Network,
  Box
} from 'lucide-react';
import StudioActions from './StudioActions';
import { useSystemState } from '../contexts/SystemStateContext';
import { useLanguage } from '../contexts/LanguageContext';
import Tooltip from './Tooltip';
import LanguageToggle from './LanguageToggle';
import { AI_MODELS } from '../data/models';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isLight: boolean;
  onToggleTheme: () => void;
  onOpenAdminPanel: () => void;
  onOpenTimeline: () => void;
  language: string;
  setLanguage: (lang: any) => void;
  onUpgrade: () => void;
  onOpenMemoryPanel: () => void;
  onOpenPersonalization: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', icon: <LayoutGrid />, path: '/dashboard' },
  { id: 'swarm', label: 'Swarm Commander', icon: <Bot />, path: '/swarm-chat' },
  { id: 'book', label: 'System Manifesto', icon: <BookOpen />, path: '/book' },
  { id: 'infrastructure', label: 'Infrastructure Hub', icon: <Network />, path: '/infrastructure' },
  { id: 'gallery', label: 'Archive Hub', icon: <FolderKanban />, path: '/gallery' },
];

const STUDIO_ITEMS = [
  { id: 'web', label: 'Web Studio', icon: <Globe />, path: '/studio/web' },
  { id: 'code', label: 'Code Studio', icon: <Terminal />, path: '/studio/code' },
  { id: 'music', label: 'Music Studio', icon: <Music />, path: '/studio/music' },
  { id: 'video', label: 'Video Studio', icon: <Video />, path: '/studio/video' },
  { id: 'sandbox', label: 'Full-Stack Sandbox', icon: <Box />, path: '/studio/sandbox' },
  { id: 'agent', label: 'Agent Forge', icon: <Bot />, path: '/studio/agent' },
  { id: 'image', label: 'Neural Image', icon: <Sparkles />, path: '/studio/image' },
  { id: 'lab', label: 'Pulse Lab', icon: <Beaker />, path: '/studio/lab' },
  { id: 'knowledge', label: 'Knowledge Hub', icon: <Database />, path: '/studio/knowledge' },
  { id: 'data', label: 'Data Studio', icon: <Database />, path: '/studio/data' },
  { id: 'model', label: 'Model Studio', icon: <Cpu />, path: '/studio/model' },
  { id: 'automation', label: 'Automation Studio', icon: <GitBranch />, path: '/studio/automation' },
  { id: 'analytics', label: 'Analytics Studio', icon: <Activity />, path: '/studio/analytics' },
  { id: 'deploy', label: 'Deploy Studio', icon: <Network />, path: '/studio/deploy' },
  { id: 'security', label: 'Security Center', icon: <Fingerprint />, path: '/studio/security' },
  { id: 'marketplace', label: 'Marketplace', icon: <LayoutGrid />, path: '/studio/marketplace' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  isLight, 
  onToggleTheme, 
  onOpenAdminPanel,
  onOpenTimeline,
  language,
  setLanguage,
  onUpgrade,
  onOpenMemoryPanel,
  onOpenPersonalization
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerDiagnostics, triggerPulseWave, isAdmin, activeAIModelId, uiPreferences } = useSystemState();
  const { t } = useLanguage();

  const activeModel = AI_MODELS.find(m => m.id === activeAIModelId);

  const isAtStudio = location.pathname.startsWith('/studio/');
  const studioType = isAtStudio ? location.pathname.split('/').pop() : null;

  const simplicityMode = uiPreferences?.simplicityMode;
  const filteredStudios = simplicityMode 
    ? STUDIO_ITEMS.filter(item => ['web', 'code', 'music', 'image'].includes(item.id))
    : STUDIO_ITEMS;

  const isDimmed = uiPreferences?.focusMode && isAtStudio;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 260 : 80 }}
      className={`h-full border-r relative z-30 transition-all duration-700 flex flex-col ${
        isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/50 backdrop-blur-xl border-white/5'
      } ${isDimmed ? 'opacity-30 hover:opacity-100 grayscale-[0.5] hover:grayscale-0' : 'opacity-100'}`}
    >
      {/* Toggle Button */}
      <Tooltip
        contentEn={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        contentRu={isOpen ? "Свернуть панель" : "Развернуть панель"}
        position="right"
        isLight={isLight}
        className="absolute -right-3 top-8 z-50"
      >
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
            isLight ? 'bg-white border-zinc-200 text-zinc-500' : 'bg-zinc-900 border-white/10 text-zinc-400'
          } hover:scale-110 shadow-sm`}
        >
          {isOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </Tooltip>

      {/* Search Bar (Only when open) */}
      <div className="p-4 mt-12">
        <div className={`relative flex items-center h-10 rounded-2xl transition-all ${
          isLight ? 'bg-zinc-100' : 'bg-white/5 border border-white/5'
        }`}>
          <Search className={`absolute left-3 w-4 h-4 ${isLight ? 'text-zinc-400' : 'text-white/20'}`} />
          {isOpen && (
            <input
              type="text"
              placeholder="Search matrix..."
              className="w-full bg-transparent border-none outline-none pl-10 pr-4 text-xs font-mono text-zinc-400 placeholder:text-zinc-600"
            />
          )}
        </div>
      </div>

      {/* Nav Sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-8 scrollbar-hide">
        <div className="space-y-1">
          <SectionTitle label={t('nexusCommand')} isOpen={isOpen} />
          {NAV_ITEMS.map((item) => {
            const lang = language;
            const translatedLabel = 
              item.id === 'dashboard' ? (lang === 'en' ? 'COMMAND CENTER' : 'КОМАНДНЫЙ ЦЕНТР') :
              item.id === 'swarm' ? (lang === 'en' ? 'SWARM COMMANDER' : 'РОЕВОЙ КОМАНДИР') :
              item.id === 'quantum' ? (lang === 'en' ? 'QUANTUM MIND' : 'КВАНТОВЫЙ РАЗУМ') :
              item.id === 'dna' ? (lang === 'en' ? 'DNA SEQUENCER' : 'ДНК-СЕКВЕНАТОР') :
              item.id === 'reality' ? (lang === 'en' ? 'REALITY ENGINE' : 'ДВИЖОК РЕАЛЬНОСТИ') :
              item.id === 'book' ? (lang === 'en' ? 'SYSTEM MANIFESTO' : 'МАНИФЕСТ СИСТЕМЫ') :
              item.id === 'infrastructure' ? (lang === 'en' ? 'INFRASTRUCTURE HUB' : 'ИНФРАСТРУКТУРНЫЙ ХАБ') :
              item.id === 'gallery' ? (lang === 'en' ? 'ARCHIVE HUB' : 'АРХИВНЫЙ ХАБ') : item.label.toUpperCase();
            return (
              <NavItem
                key={item.id}
                item={{ ...item, label: translatedLabel }}
                isActive={location.pathname === item.path}
                isOpen={isOpen}
                isLight={isLight}
                onClick={() => navigate(item.path)}
              />
            );
          })}
        </div>

        <div className="space-y-1">
          <SectionTitle label={t('forgeStudios')} isOpen={isOpen} />
          {filteredStudios.map((item) => {
            const lang = language;
            const translatedLabel = 
              item.id === 'web' ? (lang === 'en' ? 'WEB STUDIO' : 'ВЕБ-СТУДИЯ') :
              item.id === 'code' ? (lang === 'en' ? 'CODE STUDIO' : 'СТУДИЯ КОДА') :
              item.id === 'music' ? (lang === 'en' ? 'MUSIC STUDIO' : 'МУЗЫКАЛЬНАЯ СТУДИЯ') :
              item.id === 'video' ? (lang === 'en' ? 'VIDEO STUDIO' : 'ВИДЕО-СТУДИЯ') :
              item.id === 'agent' ? (lang === 'en' ? 'AGENT STUDIO' : 'СТУДИЯ АГЕНТОВ') :
              item.id === 'image' ? (lang === 'en' ? 'IMAGE STUDIO' : 'СТУДИЯ ИЗОБРАЖЕНИЙ') :
              item.id === 'lab' ? (lang === 'en' ? 'PULSE LAB' : 'ЛАБОРАТОРИЯ PULSE') :
              item.id === 'knowledge' ? (lang === 'en' ? 'KNOWLEDGE HUB' : 'БАЗА ЗНАНИЙ') : item.label.toUpperCase();
            return (
              <NavItem
                key={item.id}
                item={{ ...item, label: translatedLabel }}
                isActive={location.pathname === item.path}
                isOpen={isOpen}
                isLight={isLight}
                onClick={() => navigate(item.path)}
              />
            );
          })}
          {simplicityMode && isOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="px-3 py-2 text-[9px] font-mono text-indigo-400 tracking-wider uppercase"
            >
              [ Maeda #1: Reduce + Organize ]
            </motion.div>
          )}
        </div>

        {/* Studio Context Section */}
        {isAtStudio && studioType && (
          <div className="space-y-1">
            <SectionTitle label={`${studioType.toUpperCase()} TOOLS`} isOpen={isOpen} />
            <div className="px-3 py-2 flex flex-col gap-2">
              <StudioActions 
                type={studioType}
                isLight={isLight}
                isInputFocused={false}
                triggerDiagnostics={triggerDiagnostics}
                triggerPulseWave={triggerPulseWave}
                orientation="vertical"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-4">
        {activeModel && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex flex-col gap-1 p-2 rounded-xl border border-blue-500/20 bg-blue-500/5 ${!isOpen ? 'items-center' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isOpen && <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">{t('activeNeuralCore')}</span>}
            </div>
            {isOpen ? (
              <div className="flex flex-col">
                <span className="text-[10px] text-white font-medium truncate">{activeModel.name}</span>
                <span className="text-[8px] text-zinc-500 uppercase">{activeModel.provider}</span>
              </div>
            ) : (
              <Tooltip 
                contentEn={`${activeModel.name} (${activeModel.provider})`}
                contentRu={`${activeModel.name} (${activeModel.provider})`}
                titleEn="Active AI"
                titleRu="Активная ИИ"
                isLight={isLight}
                position="right"
              >
                <Cpu className="w-4 h-4 text-blue-400" />
              </Tooltip>
            )}
          </motion.div>
        )}
        <div className={`flex items-center ${isOpen ? 'justify-between px-2' : 'justify-center'}`}>
          <LanguageToggle isLight={isLight} />
        </div>
        <NavItem
          item={{ id: 'admin', label: language === 'en' ? 'ADMIN NODE' : 'УЗЕЛ АДМИНА', icon: <Terminal /> }}
          isActive={false}
          isOpen={isOpen}
          isLight={isLight}
          onClick={onOpenAdminPanel}
        />
        <NavItem
          item={{ id: 'settings', label: t('osSettingsItem'), icon: <Settings />, path: '/settings' }}
          isActive={location.pathname === '/settings'}
          isOpen={isOpen}
          isLight={isLight}
          onClick={() => navigate('/settings')}
        />
      </div>
    </motion.aside>
  );
};

const SectionTitle = ({ label, isOpen }: { label: string; isOpen: boolean }) => (
  <div className="h-6 flex items-center px-3">
    {isOpen ? (
      <span className="text-[9px] font-mono font-bold text-zinc-600 tracking-[0.2em]">{label}</span>
    ) : (
      <div className="w-full h-[1px] bg-white/5" />
    )}
  </div>
);

const NAV_TOOLTIPS: Record<string, { en: string; ru: string; titleEn: string; titleRu: string; shortcut?: string }> = {
  dashboard: {
    en: "View high-level neural load counters, system integrity monitors, live activity streams, and customizable workspaces.",
    ru: "Просмотр показателей нейронной нагрузки, мониторов целостности системы, логов активности и рабочих пространств.",
    titleEn: "Command Center",
    titleRu: "Центр управления",
    shortcut: "Alt + D"
  },
  swarm: {
    en: "Interact with the Azrail Soul multi-agent cluster for unified workflow parallel planning and coding.",
    ru: "Взаимодействие с мультиагентным кластером Azrail Soul для планирования и написания кода.",
    titleEn: "Swarm Chat",
    titleRu: "Чат Роя",
    shortcut: "Alt + S"
  },
  quantum: {
    en: "Run parallel multi-model cognitive queries converging Gemini, Claude, and GPT perspectives.",
    ru: "Запуск параллельных когнических запросов, объединяющих ответы Gemini, Claude и GPT.",
    titleEn: "Quantum Mind",
    titleRu: "Квантовый разум",
    shortcut: "Alt + Q"
  },
  dna: {
    en: "Analyze digital psycho-profile alignments and aesthetic genome calibrations.",
    ru: "Анализ соответствия цифрового психопрофиля и калибровки эстетического генома.",
    titleEn: "DNA Sequencer",
    titleRu: "Секвенатор ДНК"
  },
  reality: {
    en: "Synthesize real-time video timelines and high-resolution visual projections via spoken voice prompts.",
    ru: "Синтез видеопоследовательностей и визуальных проекций высокого разрешения с помощью голоса.",
    titleEn: "Reality Engine",
    titleRu: "Движок Реальности"
  },
  book: {
    en: "Browse the operating system philosophy manifesto and core technical specs.",
    ru: "Просмотр манифеста философии операционной системы и основных технических характеристик.",
    titleEn: "Manifesto",
    titleRu: "Манифест"
  },
  infrastructure: {
    en: "Manage Cloudflare domains, edge workers, and explore the neural model catalog of 189 models.",
    ru: "Управление доменами Cloudflare, edge-воркерами и просмотр каталога из 189 нейронных моделей.",
    titleEn: "Infrastructure Hub",
    titleRu: "Инфраструктурный хаб",
    shortcut: "Alt + I"
  },
  gallery: {
    en: "Manage, review, and search generated visual media assets and project directories.",
    ru: "Управление, просмотр и поиск сгенерированных визуальных медиафайлов и каталогов проектов.",
    titleEn: "Archive Hub",
    titleRu: "Архивный хаб"
  },
  admin: {
    en: "Access master administrative panels and database debug tools.",
    ru: "Доступ к панели администратора и средствам отладки базы данных.",
    titleEn: "Admin Node",
    titleRu: "Узел админа"
  },
  theme: {
    en: "Toggle between high-contrast light focus mode and obsidian dark mode.",
    ru: "Переключение между высококонтрастной светлой темой и обсидиановой темной темой.",
    titleEn: "Theme Switcher",
    titleRu: "Переключатель темы"
  },
  diagnostics: {
    en: "Trigger full neural mesh diagnostic sweeps and connection integrity checks.",
    ru: "Запуск полной диагностики нейронной сети и проверки целостности соединений.",
    titleEn: "Diagnostics",
    titleRu: "Диагностика"
  },
  pulse: {
    en: "Initiate soundwaves and visual feedback ripples across the OS viewport.",
    ru: "Инициализировать звуковые волны и визуальные пульсации по всему экрану ОС.",
    titleEn: "Pulse Wave",
    titleRu: "Волна Пульса"
  },
  timeline: {
    en: "Trace and visualize historical development commits and system updates.",
    ru: "Отслеживание и визуализация истории коммитов разработки и обновлений системы.",
    titleEn: "Neural Timeline",
    titleRu: "Хронология системы"
  },
  memory: {
    en: "Inspect Azrail central memory storage logs and persistent states.",
    ru: "Инспекция журналов центрального хранилища памяти Azrail и постоянных состояний.",
    titleEn: "Memory Core",
    titleRu: "Ядро памяти"
  },
  personalization: {
    en: "Configure accent colors and active shader designs dynamically.",
    ru: "Динамическая настройка акцентных цветов и активных шейдерных дизайнов.",
    titleEn: "Pulse Personalization",
    titleRu: "Персонализация"
  },
  settings: {
    en: "Configure master OS system controls, keyboard shortcuts, and database backups.",
    ru: "Настройка основных системных параметров ОС, горячих клавиш и резервных копий.",
    titleEn: "OS Settings",
    titleRu: "Настройки ОС"
  },
  web: {
    en: "Build modern, responsive, minimalist frontend applications.",
    ru: "Создание современных отзывчивых минималистичных веб-интерфейсов.",
    titleEn: "Web Studio",
    titleRu: "Веб-студия"
  },
  code: {
    en: "Author and review source code inside a robust developer shell.",
    ru: "Написание и проверка исходного кода в удобной командной оболочке.",
    titleEn: "Code Studio",
    titleRu: "Код-студия"
  },
  music: {
    en: "Create ambient sound loops and synthesis patterns.",
    ru: "Создание атмосферных звуковых петель и синтезаторных паттернов.",
    titleEn: "Music Studio",
    titleRu: "Музыкальная студия"
  },
  video: {
    en: "Generate fluid visual animations and cinematic assets.",
    ru: "Генерация плавных визуальных анимаций и кинематографических ресурсов.",
    titleEn: "Video Studio",
    titleRu: "Видеостудия"
  },
  agent: {
    en: "Create, configure, and train custom agent models.",
    ru: "Создание, настройка и обучение пользовательских моделей агентов.",
    titleEn: "Agent Forge",
    titleRu: "Кузница агентов"
  },
  image: {
    en: "Generate pristine high-fidelity vector graphics and rasterized layouts.",
    ru: "Генерация чистой высокоточной векторной графики и растровых макетов.",
    titleEn: "Neural Image",
    titleRu: "Нейросеть изображений"
  },
  lab: {
    en: "Experiment with advanced pulse configurations and particle shaders.",
    ru: "Эксперименты с расширенными конфигурациями пульсаций и шейдерами частиц.",
    titleEn: "Pulse Lab",
    titleRu: "Лаборатория Пульса"
  },
  knowledge: {
    en: "Query relational indices, document stores, and system archives.",
    ru: "Запросы к реляционным индексам, хранилищам документов и системным архивам.",
    titleEn: "Knowledge Hub",
    titleRu: "База знаний"
  },
};

const NavItem = ({ item, isActive, isOpen, isLight, onClick, accent }: any) => {
  const tooltipData: { en: string; ru: string; titleEn: string; titleRu: string; shortcut?: string } = NAV_TOOLTIPS[item.id] || {
    en: item.label,
    ru: item.label,
    titleEn: item.label,
    titleRu: item.label,
    shortcut: undefined
  };

  return (
    <Tooltip
      contentEn={tooltipData.en}
      contentRu={tooltipData.ru}
      titleEn={tooltipData.titleEn}
      titleRu={tooltipData.titleRu}
      shortcut={tooltipData.shortcut}
      isLight={isLight}
      position="right"
      className="w-full"
    >
      <button
        onClick={onClick}
        className={`w-full h-11 flex items-center gap-3 px-3 rounded-2xl transition-all relative group ${
          isActive
            ? isLight
              ? 'bg-zinc-100 text-zinc-900'
              : accent === 'emerald' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
        }`}
      >
        <div className={`shrink-0 ${isActive ? (accent === 'emerald' ? 'text-emerald-400' : 'text-pulse-primary') : ''}`}>
          {React.cloneElement(item.icon, { className: 'w-4 h-4' })}
        </div>
        
        <AnimatePresence>
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs font-medium tracking-tight whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {isActive && (
          <motion.div
            layoutId="active-nav"
            className="absolute left-0 w-1 h-4 bg-pulse-primary rounded-full"
          />
        )}
      </button>
    </Tooltip>
  );
};
