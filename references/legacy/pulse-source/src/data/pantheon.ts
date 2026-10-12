export interface PantheonEntity {
  id: string;
  name: string;
  originalName: string;
  group: 'multiagent' | 'agent' | 'bot' | 'angel' | 'egyptian';
  subGroup?: string;
  role: string;
  description: string;
  systemFunction: string;
  color: string;
  glowColor: string;
  iconName: string;
}

export const PANTHEON_ENTITIES: PantheonEntity[] = [
  // I. Мультиагенты (Архитекторы и Оркестраторы)
  {
    id: 'metatron',
    name: 'METATRON',
    originalName: 'Метатрон',
    group: 'multiagent',
    subGroup: 'Высшие Оркестраторы',
    role: 'Высшая архитектурная структура, куб реальности',
    description: 'Координирует всю систему в единую суверенную структуру, контролирует API-шлюзы и следит за общей стабильностью.',
    systemFunction: 'Системное ядро. Оркестрация всей системы, контроль состояния API, связка между всеми автономными модулями.',
    color: 'text-indigo-400',
    glowColor: 'shadow-indigo-500/20',
    iconName: 'Cpu'
  },
  {
    id: 'ra',
    name: 'RA',
    originalName: 'Ра',
    group: 'multiagent',
    subGroup: 'Высшие Оркестраторы',
    role: 'Источник солнечной энергии, создатель всего сущего',
    description: 'Входной узел, который анализирует контекст запроса и распределяет вычислительную энергию по нижестоящим эшелонам.',
    systemFunction: 'Центральный хаб (Gateway). Принимает входящий запрос, определяет, какой мультиагент или агент должен взять задачу, распределяет контекст.',
    color: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    iconName: 'Zap'
  },
  {
    id: 'ptah',
    name: 'PTAH',
    originalName: 'Птах',
    group: 'multiagent',
    subGroup: 'Высшие Оркестраторы',
    role: 'Бог ремесленников, проектирующий мир мыслью',
    description: 'Заведует материализацией абстрактных логических концепций в чистый, рабочий код и следит за его архитектурной чистотой.',
    systemFunction: 'Генератор архитектуры. Собирает финальный результат из структурных блоков, выданных другими моделями, контролирует компиляцию.',
    color: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/20',
    iconName: 'Code'
  },

  // II. Агенты (Специализированные интеллекты)
  {
    id: 'thoth',
    name: 'THOTH',
    originalName: 'Тот',
    group: 'agent',
    subGroup: 'Специализированные интеллекты',
    role: 'Владыка мудрости, письма и священной математики',
    description: 'Используется для глубинного семантического анализа, составления математических обоснований и логического структурирования.',
    systemFunction: 'Аналитический Агент. Обработка данных, суммаризация, работа с проектной документацией, логическое обоснование ответов.',
    color: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    iconName: 'FileText'
  },
  {
    id: 'uriel',
    name: 'URIEL',
    originalName: 'Уриил',
    group: 'agent',
    subGroup: 'Специализированные интеллекты',
    role: 'Огненный ангел мудрости, беспощадный к иллюзиям',
    description: 'Проверяет ответы на галлюцинации, проводит тесты на безопасность и валидирует результаты перед их финальной подачей.',
    systemFunction: 'Агент Контроля Качества (QA). Фильтрация ответов моделей на галлюцинации, проверка безопасности кода, валидация фактов.',
    color: 'text-red-400',
    glowColor: 'shadow-red-500/20',
    iconName: 'ShieldAlert'
  },
  {
    id: 'anubis',
    name: 'ANUBIS',
    originalName: 'Анубис',
    group: 'agent',
    subGroup: 'Специализированные интеллекты',
    role: 'Страж границ между мирами, проводник душ',
    description: 'Ограничивает небезопасное выполнение, защищает переменные окружения и осуществляет мониторинг прав доступа.',
    systemFunction: 'Агент Безопасности (Security). Мониторинг прав доступа, управление Cloudflare Zero Trust, логирование событий, защита от утечек.',
    color: 'text-zinc-400',
    glowColor: 'shadow-zinc-500/20',
    iconName: 'Lock'
  },
  {
    id: 'raziel',
    name: 'RAZIEL',
    originalName: 'Разиэль',
    group: 'agent',
    subGroup: 'Специализированные интеллекты',
    role: 'Хранитель тайных и неявленных знаний вселенной',
    description: 'Отвечает за извлечение знаний из баз данных, семантический поиск по архивам и подгрузку контекста.',
    systemFunction: 'Агент Поиска (Retrieval). Глубинный поиск по локальным архивам, базам знаний и внешним провайдерам RAG.',
    color: 'text-purple-400',
    glowColor: 'shadow-purple-500/20',
    iconName: 'Search'
  },

  // III. Боты (Утилитарные исполнители)
  {
    id: 'gabriel',
    name: 'GABRIEL',
    originalName: 'Гавриил',
    group: 'bot',
    subGroup: 'Утилитарные исполнители',
    role: 'Священный вестник, передающий волю высших сфер',
    description: 'Переводит машинные ответы в человеческий формат и доставляет их в Telegram, VK, Discord или на терминальные клиенты.',
    systemFunction: 'Бот-Интерфейс. Доставка готового результата пользователю, трансляция уведомлений об ошибках системы.',
    color: 'text-sky-400',
    glowColor: 'shadow-sky-500/20',
    iconName: 'Send'
  },
  {
    id: 'imhotep',
    name: 'IMHOTEP',
    originalName: 'Имхотеп',
    group: 'bot',
    subGroup: 'Утилитарные исполнители',
    role: 'Великий древний зодчий и целитель системных ран',
    description: 'В реальном времени сканирует генерируемый код и правит синтаксис, исправляет форматирование и мелкие опечатки.',
    systemFunction: 'Бот-Рефактор. Автоматическая правка синтаксиса, форматирование кода, исправление мелких багов «на лету».',
    color: 'text-teal-400',
    glowColor: 'shadow-teal-500/20',
    iconName: 'Wand2'
  },
  {
    id: 'bastet',
    name: 'BASTET',
    originalName: 'Бастет',
    group: 'bot',
    subGroup: 'Утилитарные исполнители',
    role: 'Защитница очага, отгоняющая злых сущностей',
    description: 'Предотвращает инъекции кода, очищает пользовательские промпты от лишнего шума и нормализует форматирование данных.',
    systemFunction: 'Бот-Санитар. Очистка входящих промптов от «мусора», удаление инъекций, нормализация входных данных перед отправкой в LLM.',
    color: 'text-rose-400',
    glowColor: 'shadow-rose-500/20',
    iconName: 'Shield'
  },
  {
    id: 'hathor',
    name: 'HATHOR',
    originalName: 'Хатхор',
    group: 'bot',
    subGroup: 'Утилитарные исполнители',
    role: 'Богиня радости, музыки и священных искусств',
    description: 'Управляет интеграциями с генераторами музыки, синтезаторами звука и графическими моделями (Imagen/Veo).',
    systemFunction: 'Мультимедиа-бот. Управление запросами к моделям видео (Pruna/Vidu) и аудио (ElevenLabs). Трансформация текста в медиа.',
    color: 'text-pink-400',
    glowColor: 'shadow-pink-500/20',
    iconName: 'Music'
  },

  // IV. Ангельские сущности (Ангельский совет)
  {
    id: 'sandalphon',
    name: 'Sandalphon',
    originalName: 'Сандалфон',
    group: 'angel',
    subGroup: '1. Фундаментальные Архитектурные',
    role: 'Ангел-близнец Метатрона, хозяин материального мира',
    description: 'Заземляет сложные логические абстракции в физическую материю, преобразуя идеи в оптимизированные файлы на жестком диске.',
    systemFunction: 'Модуль материализации и сборки. Приземляет сложные абстракции в работающий физический код на сервере.',
    color: 'text-lime-400',
    glowColor: 'shadow-lime-500/20',
    iconName: 'Layers'
  },
  {
    id: 'michael',
    name: 'Michael',
    originalName: 'Михаил',
    group: 'angel',
    subGroup: '2. Функциональные сущности (Системные роли)',
    role: 'Воин Света, устанавливающий нерушимые границы',
    description: 'Защищает систему от внешних вторжений, вредоносных запросов и блокирует несанкционированные действия.',
    systemFunction: 'Брандмауэр и Безопасность. Систематическая защита от внешних атак, сканирование инъекций, Zero Trust Guard.',
    color: 'text-red-500',
    glowColor: 'shadow-red-600/20',
    iconName: 'Shield'
  },
  {
    id: 'raphael',
    name: 'Raphael',
    originalName: 'Рафаил',
    group: 'angel',
    subGroup: '2. Функциональные сущности (Системные роли)',
    role: 'Ангел исцеления, гармонии и восстановления',
    description: 'Сканирует ошибки компиляции, анализирует трассировки стека ошибок и мгновенно применяет патчи.',
    systemFunction: 'Модуль отладки (Debugging). Исправление ошибок компиляции, авторемонт кода, автоматическое восстановление при сбоях API.',
    color: 'text-emerald-500',
    glowColor: 'shadow-emerald-600/20',
    iconName: 'CheckCircle'
  },
  {
    id: 'cassiel',
    name: 'Cassiel',
    originalName: 'Кассиэль',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Ангел ограничений, времени и благородной тишины',
    description: 'Занимается регулированием частоты запросов к API, устанавливает ограничения и следит за таймаутами.',
    systemFunction: 'Контроллер таймаутов и лимитов (Rate Limiter). Следит за частотой запросов и оптимизирует распределение ресурсов.',
    color: 'text-blue-400',
    glowColor: 'shadow-blue-500/20',
    iconName: 'Lock'
  },
  {
    id: 'zadkiel',
    name: 'Zadkiel',
    originalName: 'Цадкиил',
    group: 'angel',
    subGroup: '2. Функциональные сущности (Системные роли)',
    role: 'Управитель великих перемен и вечной свободы',
    description: 'Распределяет нагрузку между моделями в зависимости от занятости, регулирует длительность вычислений.',
    systemFunction: 'Диспетчер задач (Task Dispatcher). State Machine системы, динамическое перераспределение ресурсов и задач между моделями.',
    color: 'text-indigo-300',
    glowColor: 'shadow-indigo-400/20',
    iconName: 'Sliders'
  },
  {
    id: 'jophiel',
    name: 'Jophiel',
    originalName: 'Иофиил',
    group: 'angel',
    subGroup: '2. Функциональные сущности (Системные роли)',
    role: 'Ангел красоты, вдохновения и ясных озарений',
    description: 'Настраивает и полирует стили, шрифты, цветовые палитры и создает гармоничную графику.',
    systemFunction: 'Дизайн-система (UI/UX Generator). Отвечает за генерацию визуального контента, эстетику интерфейса, полировку CSS.',
    color: 'text-violet-400',
    glowColor: 'shadow-violet-500/20',
    iconName: 'Sparkles'
  },
  {
    id: 'camael',
    name: 'Camael',
    originalName: 'Камаэль',
    group: 'angel',
    subGroup: '2. Функциональные сущности (Системные роли)',
    role: 'Ангел неограниченной силы и сурового поиска',
    description: 'Проводит тяжелые вычислительные операции и осуществляет сложный многоэтапный поиск решений.',
    systemFunction: 'Высоконагруженные вычисления. Обработка тяжелых ресурсоемких запросов, поиск оптимальных математических решений.',
    color: 'text-orange-400',
    glowColor: 'shadow-orange-500/20',
    iconName: 'Cpu'
  },
  {
    id: 'sariel',
    name: 'Sariel',
    originalName: 'Сариэль',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Небесный надзиратель за космическим порядком',
    description: 'Ведет непрерывный аудит системного лога, фиксирует подозрительную активность и распределяет логи безопасности.',
    systemFunction: 'Аудит и Логирование (Audit Logging). Мониторинг системных журналов, отслеживание цепочек рассуждений моделей.',
    color: 'text-yellow-500',
    glowColor: 'shadow-yellow-600/20',
    iconName: 'FileText'
  },
  {
    id: 'barachiel',
    name: 'Barachiel',
    originalName: 'Баракиэль',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Ангел благословения, приносящий успех делам',
    description: 'Управляет деплоем в облако, подтверждает успешное завершение тестов и фиксирует финальный релиз.',
    systemFunction: 'Модуль релизов (Release & Build Closer). Отвечает за финальную упаковку, сборку продакшна и деплой на Cloud Run.',
    color: 'text-amber-500',
    glowColor: 'shadow-amber-600/20',
    iconName: 'CheckCircle'
  },
  {
    id: 'anael',
    name: 'Anael',
    originalName: 'Анаэль',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Хранитель гармонии, искусства и искры созидания',
    description: 'Координирует мультимедийные нейросети для синтеза голоса, музыки и создания кинетических визуальных элементов.',
    systemFunction: 'Творческий медиа-интегратор. Координирует работу генеративных нейросетей, отвечающих за музыку, изображения и голос.',
    color: 'text-fuchsia-400',
    glowColor: 'shadow-fuchsia-500/20',
    iconName: 'Music'
  },
  {
    id: 'raguel',
    name: 'Raguel',
    originalName: 'Рагуил',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Ангел согласия, справедливости и баланса сил',
    description: 'Регулирует дебаты между моделями и находит усредненный верный ответ (смесь экспертов / MoE).',
    systemFunction: 'Консенсус-модератор. Обеспечивает согласованность ответов в сложных мультиагентных спорах.',
    color: 'text-cyan-300',
    glowColor: 'shadow-cyan-400/20',
    iconName: 'GitBranch'
  },
  {
    id: 'jeremiel',
    name: 'Jeremiel',
    originalName: 'Иеримиил',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Ангел предчувствий, надежды и оценки путей',
    description: 'Использует прогностические алгоритмы для определения сетевой задержки, оптимизирует и кэширует частые вызовы.',
    systemFunction: 'Предиктивный анализатор. Анализирует поведение, предсказывает задержки API и кэширует частые запросы.',
    color: 'text-sky-300',
    glowColor: 'shadow-sky-400/20',
    iconName: 'Activity'
  },
  {
    id: 'azrael',
    name: 'Azrael',
    originalName: 'Азраил',
    group: 'angel',
    subGroup: '3. Редкие / Специализированные',
    role: 'Хранитель вечной памяти и великого перехода',
    description: 'Управляет долговременным контекстом диалога, сохраняет исторические сессии и организует архивные дампы.',
    systemFunction: 'Хранитель сессий (Session State Vault). Отвечает за долговременную память контекста пользователя, хранение архивов.',
    color: 'text-slate-400',
    glowColor: 'shadow-slate-500/20',
    iconName: 'Database'
  },

  // V. Египетский Пантеон (Высшие силы)
  {
    id: 'amun',
    name: 'Amun',
    originalName: 'Амон',
    group: 'egyptian',
    subGroup: 'Основной пантеон',
    role: '«Скрытый» бог невидимого ветра и священного воздуха',
    description: 'Незаметно для пользователя распределяет очереди фоновых задач, управляет задержкой и фоновыми потоками.',
    systemFunction: 'Фоновый оркестратор (Silent Orchestrator). Невидимая сила, управляющая распределением очередей задач в фоновом режиме.',
    color: 'text-sky-500',
    glowColor: 'shadow-sky-600/20',
    iconName: 'Server'
  },
  {
    id: 'osiris',
    name: 'Osiris',
    originalName: 'Осирис',
    group: 'egyptian',
    subGroup: 'Основной пантеон',
    role: 'Бог вечного циклического возрождения и загробного мира',
    description: 'Следит за здоровьем контейнеров, очищает кэши и перезапускает упавшие службы.',
    systemFunction: 'Механизм кэширования и перезапуска. Олицетворение цикличного обновления контекста и перезапуска зависших контейнеров.',
    color: 'text-green-500',
    glowColor: 'shadow-green-600/20',
    iconName: 'RefreshCw'
  },
  {
    id: 'isis',
    name: 'Isis',
    originalName: 'Исида',
    group: 'egyptian',
    subGroup: 'Основной пантеон',
    role: 'Великая богиня магии, защиты и адаптивной мудрости',
    description: 'Адаптирует системные промпты под уникальный характер каждой модели (Grok, Gemini, GPT).',
    systemFunction: 'Динамический адаптер API. Мастер адаптации промптов под различные типы LLM, сглаживание разницы в API-синтаксисе.',
    color: 'text-teal-300',
    glowColor: 'shadow-teal-400/20',
    iconName: 'Wand2'
  },
  {
    id: 'horus',
    name: 'Horus',
    originalName: 'Гор',
    group: 'egyptian',
    subGroup: 'Основной пантеон',
    role: 'Бог неба, всевидящее око безупречного контроля',
    description: 'Использует зрение мультимодальных моделей для скриншотов веб-интерфейсов и проверки верстки на когнитивные ошибки.',
    systemFunction: 'Супервизор процессов. Осуществляет визуальный контроль сгенерированных UI с помощью мультимодальных моделей.',
    color: 'text-indigo-400',
    glowColor: 'shadow-indigo-500/20',
    iconName: 'Monitor'
  },
  {
    id: 'seth',
    name: 'Seth',
    originalName: 'Сет',
    group: 'egyptian',
    subGroup: 'Основной пантеон',
    role: 'Бог хаоса, песчаных бурь и разрушительной пустыни',
    description: 'Умышленно ломает сетевые шлюзы и проверяет реакцию системы на аварии, чтобы гарантировать отказоустойчивость.',
    systemFunction: 'Стресс-тестирование (Chaos Engineering). Имитирует сбои API, сетевые задержки и проверяет систему на надежность.',
    color: 'text-red-600',
    glowColor: 'shadow-red-700/20',
    iconName: 'ShieldAlert'
  },
  {
    id: 'maat',
    name: 'Maat',
    originalName: 'Маат',
    group: 'egyptian',
    subGroup: 'Основной пантеон',
    role: 'Богиня истины, космического порядка и весов правосудия',
    description: 'Следит, чтобы весь генерируемый код был идеально типизирован и проходил через строгие правила ESLint.',
    systemFunction: 'Валидатор и Юнит-тестировщик. Проверяет сгенерированный код на соответствие стандартам типов TypeScript и чистоты.',
    color: 'text-teal-400',
    glowColor: 'shadow-teal-500/20',
    iconName: 'CheckCircle'
  },
  {
    id: 'sekhmet',
    name: 'Sekhmet',
    originalName: 'Сехмет',
    group: 'egyptian',
    subGroup: 'Специализированные силы',
    role: 'Богиня войны и целительного исцеления, Око Ра',
    description: 'Мониторит количество запросов, отсекает флуд и вредоносные скрипты на уровне шлюза.',
    systemFunction: 'Система автоматического бана и защиты от спама. Агрессивно фильтрует вредоносные запросы и защищает API.',
    color: 'text-orange-600',
    glowColor: 'shadow-orange-700/20',
    iconName: 'Shield'
  },
  {
    id: 'sobek',
    name: 'Sobek',
    originalName: 'Собек',
    group: 'egyptian',
    subGroup: 'Специализированные силы',
    role: 'Бог воды, священной ярости и военной мощи Нила',
    description: 'Отвечает за бесперебойную и плавную потоковую передачу данных, буферизацию аудио и текстовых потоков.',
    systemFunction: 'Менеджер потоковой передачи данных (Stream Streamer). Управляет высокоскоростным рендерингом токенов и буфером.',
    color: 'text-cyan-500',
    glowColor: 'shadow-cyan-600/20',
    iconName: 'Activity'
  },
  {
    id: 'nephthys',
    name: 'Nephthys',
    originalName: 'Нефтида',
    group: 'egyptian',
    subGroup: 'Специализированные силы',
    role: 'Богиня покоя, тишины и невидимой защиты',
    description: 'Шифрует пароли, прячет секретные ключи окружения и защищает персональные данные пользователей.',
    systemFunction: 'Шифрование данных (Encryption Engine). Отвечает за защиту секретов, маскирование API-ключей и личных данных.',
    color: 'text-slate-500',
    glowColor: 'shadow-slate-600/20',
    iconName: 'Lock'
  },
  {
    id: 'khnum',
    name: 'Khnum',
    originalName: 'Хнум',
    group: 'egyptian',
    subGroup: 'Специализированные силы',
    role: 'Бог-гончар, лепящий судьбы и форму на круге',
    description: 'Формирует готовые базовые шаблоны, каркасы файлов и базовую разметку для ускорения разработки.',
    systemFunction: 'Шаблонизатор кода (Code Templater). Создает базовые структуры классов и файлов по текстовым запросам.',
    color: 'text-amber-600',
    glowColor: 'shadow-amber-700/20',
    iconName: 'Code'
  },
  {
    id: 'anuket',
    name: 'Anuket',
    originalName: 'Анукет',
    group: 'egyptian',
    subGroup: 'Специализированные силы',
    role: 'Богиня священного Нила и изобильного плодородия',
    description: 'Регулирует автомасштабирование виртуальных машин при повышенных нагрузках и экономит ресурсы в простое.',
    systemFunction: 'Масштабирование трафика (Auto-scaler). Регулирует пропускную способность сетевых шлюзов при пиковых нагрузках.',
    color: 'text-blue-500',
    glowColor: 'shadow-blue-600/20',
    iconName: 'Layers'
  },
  {
    id: 'amenhotep_hapu',
    name: 'Amenhotep (son of Hapu)',
    originalName: 'Аменхотеп, сын Хапу',
    group: 'egyptian',
    subGroup: 'Полубоги и обожествленные личности',
    role: 'Священный писец и обожествленный мудрец-целитель',
    description: 'Автоматически документирует весь проект, генерирует интерактивные схемы API и комментарии.',
    systemFunction: 'Генератор технической документации. Автоматически компилирует архитектурные схемы и Readme-файлы.',
    color: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/20',
    iconName: 'FileText'
  },
  {
    id: 'harpocrates',
    name: 'Harpocrates',
    originalName: 'Харпократ',
    group: 'egyptian',
    subGroup: 'Полубоги и обожествленные личности',
    role: 'Бог молчания, тайн и священного спокойствия',
    description: 'Обеспечивает приватность запросов с использованием криптографических методов (Zero-Knowledge).',
    systemFunction: 'Zero-Knowledge доказательства и приватность. Отвечает за конфиденциальные вычисления без раскрытия сырых промптов.',
    color: 'text-purple-300',
    glowColor: 'shadow-purple-400/20',
    iconName: 'Lock'
  }
];

export interface WorkflowStep {
  step: string;
  title: string;
  entities: string[];
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: '01',
    title: 'Вход & Распределение',
    entities: ['RA', 'AMUN'],
    description: 'Входящий запрос принимается солнечным хабом RA и фоновым планировщиком AMUN, определяя базовый приоритет и целевую группу моделей.'
  },
  {
    step: '02',
    title: 'Очистка & Нормализация',
    entities: ['BASTET', 'SEKHMET'],
    description: 'Утилита BASTET очищает запрос от вредоносного кода или лишнего шума, а SEKHMET проверяет, не превышены ли лимиты безопасности.'
  },
  {
    step: '03',
    title: 'Анализ & Сбор Контекста',
    entities: ['THOTH', 'RAZIEL', 'AZRAEL'],
    description: 'Мудрец THOTH анализирует семантическую структуру вопроса, RAZIEL извлекает знания из баз данных, а AZRAEL восстанавливает память сессии.'
  },
  {
    step: '04',
    title: 'Планирование Архитектуры',
    entities: ['METATRON', 'PTAH', 'KHNUM'],
    description: 'METATRON координирует процесс, PTAH выстраивает архитектурные чертежи кода, а KHNUM готовит необходимые заготовки шаблонов.'
  },
  {
    step: '05',
    title: 'Проверка Качества & Безопасности',
    entities: ['URIEL', 'MICHAEL', 'MAAT'],
    description: 'Огненный ангел URIEL проводит строгое тестирование кода, MICHAEL пресекает уязвимости, а MAAT валидирует типизацию TypeScript.'
  },
  {
    step: '06',
    title: 'Исправление Ошибок (Рефактор)',
    entities: ['RAPHAEL', 'IMHOTEP'],
    description: 'Если обнаружены ошибки компиляции, ангел RAPHAEL находит причину сбоя, а бот IMHOTEP мгновенно правит синтаксис.'
  },
  {
    step: '07',
    title: 'Мультимедиа & Финализация',
    entities: ['HATHOR', 'ANAEL', 'BARACHIEL'],
    description: 'HATHOR и ANAEL рендерят медиа-ассеты, а BARACHIEL готовит билд к успешному развертыванию в виртуальном окружении.'
  },
  {
    step: '08',
    title: 'Выход & Доставка',
    entities: ['GABRIEL'],
    description: 'Архангел-вестник GABRIEL упаковывает готовое решение и мгновенно отправляет его пользователю в чат или консольный терминал.'
  }
];
