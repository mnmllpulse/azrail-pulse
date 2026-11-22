export type LocalCommand =
  | "quota"
  | "save-zip"
  | "save-file"
  | "restore-file"
  | "run-tests"
  | "blocked-commands"
  | "blocked-deploy";

const rules: Array<[LocalCommand, RegExp]> = [
  [
    "quota",
    /^(?:а\s+)?сколько\s+(?:у\s+нас\s+|у\s+меня\s+)?(?:ещ[её]\s+)?(?:осталось|остаток|лимит\p{L}*)(?:\s+(?:нейронов|токенов|генераци\p{L}*|сообщени\p{L}*|запрос\p{L}*|картин\p{L}*|на\s+сегодня|сегодня))*\s*[?.!]*$/iu,
  ],
  [
    "quota",
    /^(?:покажи|скажи|какой)\s+(?:мне\s+)?(?:остаток|лимит\p{L}*)(?:\s+на\s+сегодня)?\s*[?.!]*$/iu,
  ],
  ["save-zip", /^скачай(?:те)?\s+(?:этот\s+|текущий\s+)?архив[.!?]?$/iu],
  ["save-file", /^скачай(?:те)?\s+(?:этот\s+|текущий\s+)?файл[.!?]?$/iu],
  ["restore-file", /^верни\s+файл[.!?]?$/iu],
  ["run-tests", /^(?:запусти|выполни|прогони)\s+тесты[.!?]?$/iu],
  [
    "blocked-commands",
    /^(?:запусти|выполни|прогони)\s+(?:npm|сборку|сервер|dev|команд\p{L}*)[.!?]?$/iu,
  ],
  [
    "blocked-deploy",
    /^(?:выложи|задеплой|сделай\s+push|отправь\s+в\s+github)[.!?]?$/iu,
  ],
];

export function localCommandOf(message: string): LocalCommand | null {
  for (const [kind, pattern] of rules) if (pattern.test(message)) return kind;
  return null;
}

export const blockedReply: Record<
  "blocked-commands" | "blocked-deploy",
  string
> = {
  "blocked-commands":
    "Произвольные команды закрыты пробным лимитом. В настройках можно включить только прогон тестов, не больше 3 раз.",
  "blocked-deploy":
    "Выкладка из чата закрыта. Пробный лимит на неё — ноль, токен GitHub её не запускает.",
};

export type LimitsRead = {
  chat?: { left: number; limit: number } | null;
  generation?: { left: number; limit: number } | null;
  neurons?: { used: number; limit: number; left: number } | null;
};

export function limitsText(read: LimitsRead | null): string {
  if (!read)
    return "Остаток на сегодня сейчас не прочитан. Потолок чата 200, генерации 500.";
  const chat = read.chat
    ? `Чат: осталось ${read.chat.left} из ${read.chat.limit} сообщений.`
    : "Остаток чата сейчас не прочитан. Потолок 200.";
  const generation = read.generation
    ? `Генерация: осталось ${read.generation.left} из ${read.generation.limit} вызовов.`
    : "Остаток генерации сейчас не прочитан. Потолок 500.";
  const neurons = read.neurons
    ? `Платные модели: потрачено ${read.neurons.used} из ${read.neurons.limit} нейронов. Бесплатные модели и картинки сюда не входят, их настоящий остаток виден только в Cloudflare, раздел Workers AI.`
    : "";
  return [chat, generation, neurons].filter(Boolean).join(" ");
}
