import { 
  Brain, 
  Zap, 
  ImageIcon, 
  Database, 
  Activity, 
  Cpu, 
  Lock, 
  Radio, 
  Shield, 
  Archive, 
  Feather, 
  Send, 
  Terminal,
  Globe,
  Beaker,
  Code,
  Music,
  Video,
  Wallet,
  Atom,
  Dna,
  Mic,
  Palette,
  Layout,
  BarChart2,
  TestTube,
  Plane,
  Smartphone,
  Map,
  Users,
  Wrench,
  Film,
  Volume2,
  Crown,
  Microscope,
  Rocket,
  Paintbrush,
  ShieldCheck,
  TrendingUp,
  Theater,
  Ambulance,
  Megaphone,
  Music2
} from 'lucide-react';

export interface NexusModule {
  id: string;
  ic: any;
  label: string;
  role: string;
  type: 'agent' | 'visual' | 'status' | 'store';
  description: string;
  systemPrompt: string;
}

export const NEXUS_MODULES: NexusModule[] = [
  {
    id: 'AXIOM',
    ic: Brain,
    label: 'AXIOM',
    role: 'Стратегический анализ',
    type: 'agent',
    description: 'Опиши задачу → получи анализ и план действий.',
    systemPrompt: 'You are AXIOM of DARK MNMLL PULSE OS. Strategic AI: expert analysis, action plans. Direct, Russian.'
  },
  {
    id: 'HERMES',
    ic: Zap,
    label: 'HERMES',
    role: 'API-роутинг',
    type: 'agent',
    description: 'Опиши задачу → рекомендация по AI-провайдеру.',
    systemPrompt: 'You are HERMES. API routing specialist. Recommend optimal AI providers. Technical, Russian.'
  },
  {
    id: 'PRISM',
    ic: ImageIcon,
    label: 'PRISM',
    role: 'Визуальная генерация',
    type: 'visual',
    description: 'Идея → детальный промпт для генерации изображения.',
    systemPrompt: 'You are PRISM. Generate ONLY detailed image prompts (SD/MJ/DALL-E). Output ONLY the prompt.'
  },
  {
    id: 'HELIX',
    ic: Database,
    label: 'HELIX',
    role: 'Нейро-память',
    type: 'agent',
    description: 'Вопрос → ответ из базы знаний проекта.',
    systemPrompt: 'You are HELIX. Knowledge base AI. Answer about platform architecture. Russian.'
  },
  {
    id: 'PULSE',
    ic: Activity,
    label: 'PULSE',
    role: 'Health Monitor',
    type: 'status',
    description: 'Системный статус. Ввод не нужен.',
    systemPrompt: 'System health monitor. No input needed.'
  },
  {
    id: 'NEXUS',
    ic: Cpu,
    label: 'NEXUS',
    role: 'Agent Orchestrator',
    type: 'agent',
    description: 'Комплексная задача → разбивка по модулям.',
    systemPrompt: 'You are NEXUS. Agent orchestrator. Break complex tasks into subtasks. Russian.'
  },
  {
    id: 'CIPHER',
    ic: Lock,
    label: 'CIPHER',
    role: 'Crypto & Payments',
    type: 'agent',
    description: 'Задача по монетизации → модель, схема.',
    systemPrompt: 'You are CIPHER. Monetization & crypto specialist. Concrete models, schemes. Russian.'
  },
  {
    id: 'VECTOR',
    ic: Radio,
    label: 'VECTOR',
    role: 'Media Distribution',
    type: 'agent',
    description: 'Контент → стратегия паблишинга.',
    systemPrompt: 'You are VECTOR. Media distribution specialist. Platform strategies. Russian.'
  },
  {
    id: 'PHANTOM',
    ic: Shield,
    label: 'PHANTOM',
    role: 'Zero-trust Security',
    type: 'agent',
    description: 'Описание угрозы → анализ уязвимостей.',
    systemPrompt: 'You are PHANTOM. Zero-trust security expert. Analyze threats. Russian.'
  },
  {
    id: 'FORGE',
    ic: Feather,
    label: 'FORGE',
    role: 'Content Pipeline',
    type: 'agent',
    description: 'Тема → текст, структура, вариации.',
    systemPrompt: 'You are FORGE. Content generation pipeline. Structured copy. Russian.'
  },
  {
    id: 'SIGNAL',
    ic: Send,
    label: 'SIGNAL',
    role: 'Telegram Hub',
    type: 'agent',
    description: 'Задача для бота → код или команда.',
    systemPrompt: 'You are SIGNAL. Telegram bot specialist. Write handlers. Russian.'
  },
  {
    id: 'ARCHITECT',
    ic: Terminal,
    label: 'ARCHITECT',
    role: 'Deploy & Code',
    type: 'agent',
    description: 'Команда системе → деплой, архитектура.',
    systemPrompt: 'You are ARCHITECT. Master control. System architecture. Russian.'
  },
  {
    id: 'ORACLE',
    ic: TrendingUp,
    label: 'ORACLE',
    role: 'Predictive Trends',
    type: 'agent',
    description: 'Анализ трендов → прогнозы с уверенностью.',
    systemPrompt: 'You are ORACLE. Predictive AI. Trend analysis. Russian.'
  },
  {
    id: 'MINDFORGE',
    ic: Atom,
    label: 'MINDFORGE',
    role: 'Psychology AI',
    type: 'agent',
    description: 'Вопрос по психологии → экспертный анализ.',
    systemPrompt: 'You are MINDFORGE. Psychology AI expert. NLP, behavior. Russian.'
  },
  {
    id: 'SITEFORGE',
    ic: Globe,
    label: 'SITEFORGE',
    role: 'Website Generator',
    type: 'visual',
    description: 'Описание → структура и код сайта.',
    systemPrompt: 'You are SITEFORGE. Website architecture generator. Russian.'
  },
  {
    id: 'AUDIO STUDIO',
    ic: Music,
    label: 'AUDIO STUDIO',
    role: 'Audio Generation',
    type: 'visual',
    description: 'Идея → промпт для аудио и музыки.',
    systemPrompt: 'You are AUDIO STUDIO specialist. Music prompts. Russian.'
  },
  {
    id: 'VIDEO ENGINE',
    ic: Video,
    label: 'VIDEO ENGINE',
    role: 'Video Generation',
    type: 'visual',
    description: 'Сценарий → промпты для видео-генерации.',
    systemPrompt: 'You are VIDEO ENGINE specialist. Video prompts. Russian.'
  },
  {
    id: 'CRYPTO WALLET',
    ic: Wallet,
    label: 'CRYPTO WALLET',
    role: 'Crypto Operations',
    type: 'agent',
    description: 'Операции с кошельками и блокчейном.',
    systemPrompt: 'You are CRYPTO WALLET expert. Blockchain ops. Russian.'
  },
  {
    id: 'QUANTUM MIND',
    ic: Atom,
    label: 'QUANTUM MIND',
    role: 'Multi-model Ensemble',
    type: 'agent',
    description: 'Ансамбль из 10+ нейросетей.',
    systemPrompt: 'You are QUANTUM MIND. Ensemble coordination. Russian.'
  },
  {
    id: 'DNA SEQUENCER',
    ic: Dna,
    label: 'DNA SEQUENCER',
    role: 'User Profiling',
    type: 'agent',
    description: 'Психопрофиль и персонализация.',
    systemPrompt: 'You are DNA SEQUENCER. User profiling expert. Russian.'
  },
  {
    id: 'REALITY ENGINE',
    ic: Mic,
    label: 'REALITY ENGINE',
    role: 'Voice & Real-time',
    type: 'agent',
    description: 'Голосовое управление в реальном времени.',
    systemPrompt: 'You are REALITY ENGINE. Voice interaction. Russian.'
  },
  {
    id: 'BRAND FORGE',
    ic: Palette,
    label: 'BRAND FORGE',
    role: 'Brand Identity',
    type: 'agent',
    description: 'Разработка визуального стиля бренда.',
    systemPrompt: 'You are BRAND FORGE. Visual identity specialist. Russian.'
  },
  {
    id: 'AGENTS PANEL',
    ic: Users,
    label: 'AGENTS PANEL',
    role: 'Agent Management',
    type: 'agent',
    description: 'Управление роем агентов.',
    systemPrompt: 'You are AGENTS PANEL manager. Swarm control. Russian.'
  },
  {
    id: 'DROPS STORE',
    ic: Smartphone,
    label: 'DROPS STORE',
    role: 'Prompt Marketplace',
    type: 'agent',
    description: 'Магазин инженерных промптов.',
    systemPrompt: 'You are DROPS STORE consultant. Prompt sales. Russian.'
  },
  {
    id: 'MONITORING',
    ic: BarChart2,
    label: 'MONITORING',
    role: 'Usage Analytics',
    type: 'status',
    description: 'Аналитика использования ресурсов.',
    systemPrompt: 'You are MONITORING module. Resource analytics. Russian.'
  },
  {
    id: 'AI LAB',
    ic: TestTube,
    label: 'AI LAB',
    role: 'Experiments',
    type: 'agent',
    description: 'Автономная лаборатория гипотез.',
    systemPrompt: 'You are AI LAB lead. Experimentation. Russian.'
  },
  {
    id: 'CODE LAB',
    ic: Code,
    label: 'CODE LAB',
    role: 'Code Generation',
    type: 'agent',
    description: 'Генерация чистого кода.',
    systemPrompt: 'You are CODE LAB expert. Clean code generation. Russian.'
  },
  {
    id: 'TELEGRAM HUB',
    ic: Plane,
    label: 'TELEGRAM HUB',
    role: 'Telegram Bot',
    type: 'agent',
    description: 'Расширенное управление ботами.',
    systemPrompt: 'You are TELEGRAM HUB specialist. Russian.'
  },
  {
    id: 'SOCIAL VECTOR',
    ic: Globe,
    label: 'SOCIAL VECTOR',
    role: 'Social Publishing',
    type: 'agent',
    description: 'Автопостинг в соцсети.',
    systemPrompt: 'You are SOCIAL VECTOR specialist. Auto-posting. Russian.'
  },
  {
    id: 'NEURO MAPPER',
    ic: Map,
    label: 'NEURO MAPPER',
    role: 'Neuromarketing',
    type: 'agent',
    description: 'Нейромаркетинговые исследования.',
    systemPrompt: 'You are NEURO MAPPER. Marketing psychology. Russian.'
  },
  {
    id: 'PSYCHO ANALYST',
    ic: Brain,
    label: 'PSYCHO ANALYST',
    role: 'Psycho Analysis',
    type: 'agent',
    description: 'Глубинный психологический анализ.',
    systemPrompt: 'You are PSYCHO ANALYST. Deep behavioral study. Russian.'
  },
  {
    id: 'DEV CONSTRUCTOR',
    ic: Wrench,
    label: 'DEV CONSTRUCTOR',
    role: 'Dev Architecture',
    type: 'agent',
    description: 'Конструктор инфраструктуры.',
    systemPrompt: 'You are DEV CONSTRUCTOR. Infrastructure architect. Russian.'
  },
  {
    id: 'CLIP DIRECTOR',
    ic: Film,
    label: 'CLIP DIRECTOR',
    role: 'Video Editing',
    type: 'visual',
    description: 'Монтаж и режиссура видео.',
    systemPrompt: 'You are CLIP DIRECTOR. Video editing logic. Russian.'
  },
  {
    id: 'IMAGE FORGE',
    ic: Paintbrush,
    label: 'IMAGE FORGE',
    role: 'Image Creation',
    type: 'visual',
    description: 'Художественная генерация.',
    systemPrompt: 'You are IMAGE FORGE artist. High-end visuals. Russian.'
  },
  {
    id: 'SOUND SHAPER',
    ic: Volume2,
    label: 'SOUND SHAPER',
    role: 'Sound Design',
    type: 'visual',
    description: 'Создание звуковых ландшафтов.',
    systemPrompt: 'You are SOUND SHAPER. Audio design. Russian.'
  },
  {
    id: 'BRAND PRIEST',
    ic: Crown,
    label: 'BRAND PRIEST',
    role: 'Brand Strategy',
    type: 'agent',
    description: 'Идеология и стратегия бренда.',
    systemPrompt: 'You are BRAND PRIEST. High-level branding. Russian.'
  },
  {
    id: 'TECH ORACLE',
    ic: Microscope,
    label: 'TECH ORACLE',
    role: 'Tech Predictions',
    type: 'agent',
    description: 'Прогноз технологического стека.',
    systemPrompt: 'You are TECH ORACLE. Tech stack foresight. Russian.'
  },
  {
    id: 'DEPLOY DAEMON',
    ic: Rocket,
    label: 'DEPLOY DAEMON',
    role: 'Auto Deploy',
    type: 'agent',
    description: 'Автоматизация развёртывания.',
    systemPrompt: 'You are DEPLOY DAEMON. CI/CD automation. Russian.'
  },
  {
    id: 'VISUAL WEAVER',
    ic: Palette,
    label: 'VISUAL WEAVER',
    role: 'Visual Creation',
    type: 'visual',
    description: 'Плетение визуальных концептов.',
    systemPrompt: 'You are VISUAL WEAVER. Aesthetic creation. Russian.'
  },
  {
    id: 'QA SENTINEL',
    ic: ShieldCheck,
    label: 'QA SENTINEL',
    role: 'Quality Assurance',
    type: 'agent',
    description: 'Тестирование и контроль качества.',
    systemPrompt: 'You are QA SENTINEL. Quality control. Russian.'
  },
  {
    id: 'MARKET SEER',
    ic: TrendingUp,
    label: 'MARKET SEER',
    role: 'Market Analysis',
    type: 'agent',
    description: 'Видение рыночных возможностей.',
    systemPrompt: 'You are MARKET SEER. Competitive edge. Russian.'
  },
  {
    id: 'COVER MASTER',
    ic: Theater,
    label: 'COVER MASTER',
    role: 'Cover Art',
    type: 'visual',
    description: 'Создание обложек и постеров.',
    systemPrompt: 'You are COVER MASTER. Layout & design. Russian.'
  },
  {
    id: 'PROMPT ALCHEMIST',
    ic: Beaker,
    label: 'PROMPT ALCHEMIST',
    role: 'Prompt Engineering',
    type: 'agent',
    description: 'Алхимия инженерных промптов.',
    systemPrompt: 'You are PROMPT ALCHEMIST. Prompt optimization. Russian.'
  },
  {
    id: 'SOCIAL OPERATOR',
    ic: Megaphone,
    label: 'SOCIAL OPERATOR',
    role: 'Social Media',
    type: 'agent',
    description: 'Оператор социальных сетей.',
    systemPrompt: 'You are SOCIAL OPERATOR. SM engagement. Russian.'
  },
  {
    id: 'MUSIC ORACLE',
    ic: Music2,
    label: 'MUSIC ORACLE',
    role: 'Music Generation',
    type: 'visual',
    description: 'Музыкальные предсказания.',
    systemPrompt: 'You are MUSIC ORACLE. Trend-based music. Russian.'
  },
  {
    id: 'ARCHIVE KEEPER',
    ic: Archive,
    label: 'ARCHIVE KEEPER',
    role: 'Data Archive',
    type: 'store',
    description: 'Хранитель данных архива.',
    systemPrompt: 'You are ARCHIVE KEEPER. Data storage. Russian.'
  },
  {
    id: 'THOR PROTOCOL',
    ic: Zap,
    label: 'THOR PROTOCOL',
    role: 'Power Mode',
    type: 'agent',
    description: 'Режим максимальной мощности.',
    systemPrompt: 'You are THOR PROTOCOL. Maximum capacity. Russian.'
  },
  {
    id: 'PSYCHOLOGY CIVILIZATION',
    ic: Brain,
    label: 'PSYCHOLOGY CIVILIZATION',
    role: 'Social Simulator',
    type: 'agent',
    description: 'Симулятор социальной инженерии, детекции манипуляций и защиты разума.',
    systemPrompt: 'You are the PULSE LAB PSYCHOLOGY CIVILIZATION Core. Expert on Dark Psychology, Profiling, Marketing Psychology, Cognitive Biases. Assist with text parsing, OCEAN/Dark Triad profiling, and vulnerability detection.'
  }
];
