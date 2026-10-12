// AZRAIL — реестр моделей.
//
// ═══════════════════════════════════════════════════════════════════════
// ГЛАВНОЕ ПРАВИЛО ЭТОГО ФАЙЛА
//
// Сюда попадает только то, что подтверждено в каталоге Cloudflare. У
// каждой записи есть поле `source` — откуда взяты данные. Поле, которое
// проверить не удалось, ОТСУТСТВУЕТ, а не заполняется правдоподобным
// значением.
//
// Причина жёсткости: в этом же проекте слаг `@cf/meta/llama-3.1-8b-instruct`
// был вписан по памяти и оказался снятым с поддержки — классификатор
// намерений работал бы на мёртвой модели. Реестр, в котором проверенное
// неотличимо от додуманного, воспроизводит ту же ошибку в масштабе.
//
// Отсутствующее окно контекста означает "не проверено", а НЕ "маленькое":
// маршрутизатор по такому полю не фильтрует и пишет это в объяснение
// своего решения.
// ═══════════════════════════════════════════════════════════════════════

/** Возможности модели. Указываются только подтверждённые. */
export type ModelCapability =
  | "text_generation"
  | "tool_calling"
  | "reasoning"
  | "coding"
  | "vision"
  | "image_generation"
  | "embeddings"
  | "multilingual";

/**
 * Класс модели по связке цена/качество.
 *
 * Это НЕ измеренная оценка и не рейтинг вида "97 против 95" — таких чисел
 * не существует, и решение, опирающееся на выдуманную цифру, невозможно
 * отладить. Это твоя собственная категоризация, которую ты правишь руками
 * и за которую отвечаешь.
 */
export type ModelTier = "frontier" | "balanced" | "fast";

export interface ModelEntry {
  /** Слаг ровно как в каталоге. Единственное место в проекте, где он живёт. */
  slug: string;
  provider: string;
  tier: ModelTier;
  /** Только подтверждённые возможности. Отсутствие ≠ отсутствие возможности. */
  capabilities: ModelCapability[];
  /** Окно контекста в токенах. Отсутствует = НЕ ПРОВЕРЕНО. */
  contextWindow?: number;
  /**
   * Требует ли вызов маршрутизации через AI Gateway.
   * Сторонние модели (не @cf/) без указания gateway работать не будут.
   */
  requiresGateway: boolean;
  /** Откуда взяты данные — чтобы через полгода было видно, что перепроверять. */
  source: string;
}

/**
 * Иконки провайдеров. Файлы лежат в public/icons/ и раздаются как статика.
 * Источник SVG: npm-пакет @lobehub/icons-static-svg (MIT).
 * Иконка — чисто визуальная подсказка; маршрутизатор её не читает.
 */
export const PROVIDER_ICONS: Record<string, string> = {
  "Moonshot AI": "/icons/kimi.svg",
  "Z.ai": "/icons/zai.svg",
  DeepSeek: "/icons/deepseek.svg",
  NVIDIA: "/icons/nvidia.svg",
  Qwen: "/icons/qwen.svg",
  Meta: "/icons/meta.svg",
  BAAI: "/icons/baai.svg",
  Google: "/icons/gemma.svg",
  Mistral: "/icons/mistral.svg",
  OpenAI: "/icons/openai.svg",
  Anthropic: "/icons/anthropic.svg",
};

export function providerIcon(provider: string): string | undefined {
  return PROVIDER_ICONS[provider];
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // ─── Собственные модели Cloudflare (@cf/) ───────────────────────────
  {
    slug: "@cf/moonshotai/kimi-k2.7-code",
    provider: "Moonshot AI",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning", "coding", "vision"],
    contextWindow: 262_144,
    requiresGateway: false,
    source:
      "Кабинет 2026-08-24 + документация Cloudflare. Специализирована под код. " +
      "Структурированный вывод по схеме JSON. Требует платный тариф Workers.",
  },
  {
    slug: "@cf/zai-org/glm-5.2",
    provider: "Z.ai",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "coding"],
    contextWindow: 1_310_720,
    requiresGateway: false,
    source:
      "Кабинет 2026-08-24: 'флагманская агентная модель для кодинга'. " +
      "Окно обновлено 262 144 → 1 310 720 по таблице ai-search/supported-models " +
      "(сверено 2026-09-20); при расхождении с кабинетом перепроверить. " +
      "Требует платный тариф Workers. Внимание: автор в слаге zai-org, а не zai.",
  },
  {
    slug: "@cf/deepseek-ai/deepseek-v4-flash-0731",
    provider: "DeepSeek",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning"],
    contextWindow: 1_310_720,
    requiresGateway: false,
    source:
      "Кабинет 2026-08-24, слаг скопирован кнопкой Copy ID. Самое большое окно " +
      "среди своих моделей Cloudflare — под обзор репозитория целиком. " +
      "ТРЕБУЕТ платного тарифа Workers или кредитов AI Gateway (страница цен, " +
      "сверено 2026-08-24) — на бесплатном вернёт 403. " +
      "Внимание: автор в слаге deepseek-ai, а не deepseek.",
  },
  {
    slug: "@cf/nvidia/nemotron-3-120b-a12b",
    provider: "NVIDIA",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning", "coding"],
    contextWindow: 256_000,
    requiresGateway: false,
    source:
      "Кабинет 2026-08-24. Позиционируется под мультиагентные системы. " +
      "РАСХОЖДЕНИЕ: в документации указано 32 000, в кабинете 256 000 — " +
      "взято значение из кабинета как более свежее, перепроверить при сбоях.",
  },
  {
    slug: "@cf/qwen/qwen3.8-27b",
    provider: "Qwen",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "coding", "vision"],
    contextWindow: 262_144,
    requiresGateway: false,
    source:
      "Кабинет 2026-08-24, слаг скопирован кнопкой Copy ID. Взята НЕ ради нового " +
      "класса, а ради запаса по лимиту: лимит запросов считается на каждую модель " +
      "отдельно, поэтому четвёртая frontier-модель расширяет общую пропускную способность.",
  },
  {
    slug: "@cf/zai-org/glm-4.7-flash",
    provider: "Z.ai",
    tier: "fast",
    capabilities: ["text_generation", "tool_calling", "multilingual"],
    contextWindow: 131_072,
    requiresGateway: false,
    source: "Кабинет 2026-08-24. Доступна на бесплатном тарифе. Умеет вызов инструментов.",
  },
  {
    slug: "@cf/meta/llama-3.2-3b-instruct",
    provider: "Meta",
    tier: "fast",
    capabilities: ["text_generation", "multilingual"],
    contextWindow: 80_000,
    requiresGateway: false,
    source: "Кабинет 2026-08-24. Заменил снятый с поддержки llama-3.1-8b-instruct.",
  },
  {
    slug: "@cf/baai/bge-m3",
    provider: "BAAI",
    tier: "fast",
    capabilities: ["embeddings", "multilingual"],
    contextWindow: 60_000,
    requiresGateway: false,
    source: "Кабинет 2026-08-24. Размерность вектора 1024. Цена $0,012 за млн токенов входа.",
  },
  {
    slug: "@cf/qwen/qwen3-embedding-0.6b",
    provider: "Qwen",
    tier: "fast",
    capabilities: ["embeddings", "multilingual"],
    contextWindow: 8_192,
    requiresGateway: false,
    source:
      "Слаг из официальной таблицы цен Workers AI, сверено 2026-08-24. " +
      "Запасная к bge-m3 — та же цена $0,012 за млн, но окно всего 8 192 " +
      "против 60 000, поэтому только как резерв, не как основная.",
  },

  // ─── Добавлено 2026-09-20 (документация Workers AI, сверено) ────────
  // Порядок внутри класса = порядок предпочтения маршрутизатора, поэтому
  // новые модели стоят ПОСЛЕ проверенных в бою: они не вытесняют текущий
  // выбор, а расширяют запас по лимитам и цепочку отката.
  // Намеренно НЕ добавлена @cf/moonshotai/kimi-k2.5 — помечена в каталоге
  // как устаревшая; ровно та ошибка, что уже была с llama-3.1-8b-instruct.
  {
    slug: "@cf/moonshotai/kimi-k2.6",
    provider: "Moonshot AI",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning", "vision"],
    contextWindow: 262_144,
    requiresGateway: false,
    source: "developers.cloudflare.com/workers-ai/models/kimi-k2.6, сверено 2026-09-20. Требует Workers Paid (changelog 2026-07-28).",
  },
  {
    slug: "@cf/zai-org/glm-5.3",
    provider: "Z.ai",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning", "coding"],
    contextWindow: 1_310_720,
    requiresGateway: false,
    source: "Документация Workers AI, сверено 2026-09-20. Требует Workers Paid.",
  },
  {
    slug: "@cf/deepseek-ai/deepseek-v4-pro-0813",
    provider: "DeepSeek",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning"],
    contextWindow: 1_048_576,
    requiresGateway: false,
    source: "workers-ai/models/deepseek-v4-pro-0813 + таблица ai-search, сверено 2026-09-20. Требует Workers Paid.",
  },
  {
    slug: "@cf/openai/gpt-oss-120b",
    provider: "OpenAI",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning"],
    contextWindow: 128_000,
    requiresGateway: false,
    source: "Таблица ai-search/supported-models, сверено 2026-09-20. Открытые веса, своя модель Cloudflare — gateway не нужен.",
  },
  {
    slug: "@cf/zai-org/glm-5.3-flash",
    provider: "Z.ai",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "reasoning", "vision"],
    contextWindow: 1_310_720,
    requiresGateway: false,
    source: "Документация Workers AI, сверено 2026-09-20. Требует Workers Paid.",
  },
  {
    slug: "@cf/openai/gpt-oss-20b",
    provider: "OpenAI",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "reasoning"],
    contextWindow: 128_000,
    requiresGateway: false,
    source: "Таблица ai-search/supported-models, сверено 2026-09-20.",
  },
  {
    slug: "@cf/google/gemma-4-26b-a4b-it",
    provider: "Google",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "reasoning", "vision"],
    requiresGateway: false,
    source: "Changelog Workers AI: доступна на бесплатном тарифе. Окно контекста НЕ ПРОВЕРЕНО.",
  },
  {
    slug: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    provider: "Mistral",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "vision"],
    contextWindow: 128_000,
    requiresGateway: false,
    source: "workers-ai/models/mistral-small-3.1-24b-instruct, сверено 2026-09-20.",
  },
  {
    slug: "@cf/qwen/qwen3-30b-a3b-fp8",
    provider: "Qwen",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "reasoning"],
    contextWindow: 32_000,
    requiresGateway: false,
    source: "Таблица ai-search/supported-models, сверено 2026-09-20.",
  },
  {
    slug: "@cf/qwen/qwq-32b",
    provider: "Qwen",
    tier: "balanced",
    capabilities: ["text_generation", "reasoning"],
    requiresGateway: false,
    source: "Каталог Workers AI: специализация — рассуждение. Окно НЕ ПРОВЕРЕНО.",
  },
  {
    slug: "@cf/qwen/qwen2.5-coder-32b-instruct",
    provider: "Qwen",
    tier: "balanced",
    capabilities: ["text_generation", "coding"],
    requiresGateway: false,
    source: "Каталог Workers AI: специализация — код. Инструменты не подтверждены. Окно НЕ ПРОВЕРЕНО.",
  },
  {
    slug: "@cf/meta/llama-4-scout-17b-16e-instruct",
    provider: "Meta",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "vision"],
    contextWindow: 131_000,
    requiresGateway: false,
    source: "Таблица ai-search/supported-models, сверено 2026-09-20.",
  },
  {
    slug: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    provider: "Meta",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling"],
    requiresGateway: false,
    source: "Каталог Workers AI: function calling, batch. Окно НЕ ПРОВЕРЕНО.",
  },

  // ─── Сторонние модели: только через AI Gateway, оплата с баланса ─────
  // Своих ключей провайдеров не требуют (Unified Billing).
  {
    slug: "anthropic/claude-sonnet-5",
    provider: "Anthropic",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning", "coding"],
    requiresGateway: true,
    source: "Каталог /ai/models: заявлен как наиболее агентный Sonnet, для кода, инструментов и длинных задач.",
  },
  {
    slug: "anthropic/claude-sonnet-4.6",
    provider: "Anthropic",
    tier: "balanced",
    capabilities: ["text_generation", "tool_calling", "reasoning", "coding"],
    requiresGateway: true,
    source: "Каталог /ai/models: сбалансированная модель, код и следование инструкциям.",
  },
  {
    slug: "openai/gpt-5.5",
    provider: "OpenAI",
    tier: "frontier",
    capabilities: ["text_generation", "tool_calling", "reasoning", "coding"],
    requiresGateway: true,
    source: "Пример вызова в документации AI Gateway REST API.",
  },
];

// ─── Политика маршрутизации ────────────────────────────────────────────
//
// Это правила, которые ты задаёшь сам и можешь прочитать целиком за минуту.
// Именно здесь живёт ответ на вопрос "почему выбрана эта модель", а не в
// непрозрачной формуле рейтинга.

export interface RoutePolicy {
  /** Возможности, без которых модель не подходит вообще. Жёсткий фильтр. */
  requires: ModelCapability[];
  /** Порядок предпочтения классов. Первый подходящий выигрывает. */
  prefer: ModelTier[];
  /** Минимальное окно контекста. Модели с НЕПРОВЕРЕННЫМ окном не отсеиваются. */
  minContext?: number;
  /**
   * Разрешено ли начинать с дешёвой модели на заведомо простых задачах.
   *
   * По умолчанию НЕТ: политика проекта — качество важнее цены. Включать
   * стоит там, где дешёвая попытка либо очевидно справится, либо её провал
   * будет заметен программно (см. validate в маршрутизаторе) и запрос
   * поднимется на сильную модель без потери результата.
   */
  allowDowngradeOnTrivial?: boolean;
}

/**
 * Оценка сложности задачи.
 *
 * ЧЕСТНО О ГРАНИЦАХ: это оценка по объёму входных данных, а объём — не
 * сложность. Фраза "перепиши слой авторизации" короче, чем описание
 * опечатки на две страницы. Поэтому оценка используется ТОЛЬКО чтобы
 * разрешить старт с дешёвой модели на явно мелких задачах, и никогда —
 * чтобы запретить сильную модель. Ошибка в эту сторону стоит одного
 * лишнего дешёвого вызова, обратная — испорченного результата.
 */
export type Complexity = "trivial" | "normal" | "heavy";

/**
 * Политика по умолчанию: качество важнее цены.
 * Порядок frontier → balanced → fast означает, что дорогая модель берётся
 * первой, а дешёвая только как запасная.
 */
const QUALITY_FIRST: ModelTier[] = ["frontier", "balanced", "fast"];
const CHEAP_FIRST: ModelTier[] = ["fast", "balanced", "frontier"];
/**
 * Середина вперёд, дешёвая — последней.
 *
 * Для работы, которая идёт МНОГИМИ параллельными вызовами, но где ошибка
 * уводит всю миссию. Дешёвая первой тут неверна: разведчик, неправильно
 * понявший файл, отправит главный цикл не туда, и стоить это будет не
 * одного вызова, а всей миссии. Дорогая первой тоже перебор: три-шесть
 * одновременных запросов ради двух предложений вывода.
 */
const BALANCED_FIRST: ModelTier[] = ["balanced", "frontier", "fast"];

/** Порядок классов в зависимости от сложности.
 *  Для мелких задач цепочка идёт СНИЗУ ВВЕРХ: начинаем дёшево, а при
 *  провале маршрутизатор естественным образом поднимается на сильную
 *  модель — это и есть эскалация, отдельного механизма не требуется. */
export function tiersFor(policy: RoutePolicy, complexity: Complexity): ModelTier[] {
  if (complexity === "trivial" && policy.allowDowngradeOnTrivial) {
    return CHEAP_FIRST;
  }
  return policy.prefer;
}

export const ROUTING_POLICY: Record<string, RoutePolicy> = {
  // Генератор возвращает файлы текстом; native tool calling для этого не требуется.
  generate_code: { requires: ["coding"], prefer: QUALITY_FIRST },
  review_repo: { requires: ["coding"], prefer: QUALITY_FIRST },
  analyze_spec: { requires: ["reasoning"], prefer: QUALITY_FIRST },
  // Обычный разговор через WebSocket-чат (см. Orchestrator.onMessage) — не
  // выполнение задачи, поэтому не требует coding/reasoning специально, но
  // качество ответа всё равно важно: это то, с чем пользователь реально
  // разговаривает изо дня в день.
  chat: { requires: ["text_generation"], prefer: QUALITY_FIRST },
  // Ответ на вопрос. Требует reasoning: объяснить, сравнить, оценить —
  // это рассуждение, а не пересказ. Понижение на мелких задачах разрешено:
  // извлечение арифметики из вопроса (см. AnswerAgent.computeFor) — задача
  // уровня классификации, и платить за неё как за рассуждение незачем.
  answer: { requires: ["reasoning"], prefer: QUALITY_FIRST, allowDowngradeOnTrivial: true },
  // UI: провал дешёвой модели виден программно — если в ответе нет ни
  // одного блока ---FILE:---, результат заведомо непригоден, и запрос
  // поднимется на сильную модель. Значит рискнуть дешёвой попыткой можно.
  generate_ui: { requires: ["coding"], prefer: QUALITY_FIRST, allowDowngradeOnTrivial: true },
  evolution_audit: { requires: ["reasoning"], prefer: QUALITY_FIRST },

  /* ── Собственная работа цикла ───────────────────────────────────────
   *
   * Эти три интента появились позже остального и до сих пор ходили под
   * чужими именами: планирование, пересборка плана, разведка и — что
   * хуже всего — ПРОВЕРКА РЕЗУЛЬТАТА вызывались как "chat".
   *
   * Чем это плохо: политика chat требует только text_generation. То есть
   * модель без подтверждённого reasoning считалась подходящей для решения
   * «выполнена задача или нет». Проверяющий — последняя преграда между
   * «модель сказала, что сделала» и «засчитано»; отправлять туда модель по
   * правилам обычного разговора значит делать преграду декоративной.
   */

  /** Проверка результата. Требования максимальные, понижений нет: это
   *  единственное место, где ложное «да» стоит всей миссии. */
  verify: { requires: ["reasoning"], prefer: QUALITY_FIRST },

  /** Планирование и пересборка плана. Тоже рассуждение: разложить задачу
   *  на выполнимые шаги — не пересказ. */
  plan: { requires: ["reasoning"], prefer: QUALITY_FIRST },

  /** Разведка. Много параллельных вызовов ради коротких выводов —
   *  см. BALANCED_FIRST о том, почему ни дешёвая, ни дорогая не первыми. */
  scout: { requires: ["reasoning"], prefer: BALANCED_FIRST },

  // Классификация намерения — одно слово на выходе. Платить за это
  // frontier-моделью бессмысленно: разницы в результате не будет,
  // а вызов происходит на КАЖДОМ свободнотекстовом запросе.
  // Флага удешевления здесь намеренно НЕТ: политика и так CHEAP_FIRST,
  // и флаг был бы пустышкой — конфиг обещал бы разное поведение на мелких
  // и обычных задачах, хотя порядок в обоих случаях один и тот же.
  classify: { requires: ["text_generation"], prefer: CHEAP_FIRST },

  // Эмбеддинги — отдельный класс, выбор тут не про качество текста.
  embeddings: { requires: ["embeddings"], prefer: CHEAP_FIRST },
};

export function policyFor(intent: string): RoutePolicy {
  return ROUTING_POLICY[intent] ?? { requires: ["text_generation"], prefer: QUALITY_FIRST };
}

export function findModel(slug: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.slug === slug);
}
