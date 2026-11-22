import type { StudioId } from "./studio-types";

/** Куда чат отдаёт фразу. talk остаётся разговором. */
export type AssignmentKind =
  "talk" | "image" | "music" | "video" | "web" | "file" | "diagram" | "build";

export type Assignment = {
  kind: AssignmentKind;
  studio: StudioId | null;
  /** Селектор кнопки, которая уже есть в студии. */
  control: string | null;
  worker: string;
  now: string;
  ready: string;
  next: string;
  needsYou: string;
};

const NB = "(?<!\\p{L})";
const NA = "(?!\\p{L})";
const QUESTION = new RegExp(
  NB +
    "(что такое|что\\s+(?:на|в|за|это|тут|здесь|там|изображен\\p{L}*|нарисован\\p{L}*|написан\\p{L}*|видишь|скажешь|думаешь)|кто\\s+(?:это|на|тут|здесь|там)|где|когда|сколько|как\\s|какой|какая|какое|какие|каков\\p{L}*|почему|зачем|чем отлича|объясни|расскажи|посоветуй|можно ли|какой лучше|сравни|стоит ли|есть ли|опиши|описать|опишите|прочитай|прочти|проанализируй|разбери|перескажи|суммируй|резюмируй|переведи|скажи|подскажи|проверь|оцени|посмотри|что видно|что думаешь|(?:ты\\s+)?(?:сможешь|способен\\p{L}*|получится\\s+ли|возможно\\s+ли)|если\\s+(?:я\\s+)?(?:пришлю|отправлю|загружу|дам|скину))",
  "iu",
);
/** Условное предложение или просьба пояснить: «Если нужно создать…, можно подробней» — это разговор, не заказ. */
const CONDITIONAL = new RegExp(
  "^\\s*если\\s|" + NB + "можно\\s+подробн(?:ей|ее)",
  "iu",
);
const CREATE = new RegExp(
  NB +
    "(созда(й|ть|йте)|напиш(и|ите)|написать|сдела(й|ть|йте)|сгенерируй|собери|собрать|нарисуй|нарисовать|изобрази|построй|сочини|оформи|смонтируй|сверстай|набросай|подготов(ь|ьте)|дай|дайте|выдай|хочу|хотел\\p{L}*|нужен|нужна|нужно|надо)",
  "iu",
);
const HOLD = new RegExp(
  NB +
    "(тест(?!ов(?:ый|ая|ое|ые|ого|ому|ым|ых|ую|ой))|покрыти|уязвимост|безопасн|секрет|аудит|деплой|задепло|выкат|коммит|ветк)",
  "iu",
);
const EXPLICIT = new RegExp(
  NB +
    "(созда(?:й|ть|йте)|сдела(?:й|ть|йте)|собери|собрать)\\s+(?:мне\\s+|нам\\s+)?(?:pdf|docx|xlsx|pptx|схем\\p{L}*|диаграмм\\p{L}*|график)" +
    NA,
  "iu",
);
const IMAGE = new RegExp(
  NB + "(картинк|постер|иллюстрац|обложк|изображен|логотип|нарисуй|изобрази)",
  "iu",
);
/** «Промпт этой картинки», «описание к фото»: картинка здесь предмет текста, а не заказ. */
const TEXT_ABOUT_IMAGE = new RegExp(
  NB +
    "(промпт\\p{L}*|prompt|описани\\p{L}*|подпис\\p{L}*)\\s+(?:\\p{L}+\\s+){0,2}(?:картинк|изображен|фото|постер|рисунк|иллюстрац)",
  "iu",
);
const DRAW_VERB = new RegExp(NB + "(нарисуй|изобрази|сгенерируй)", "iu");
const MUSIC = new RegExp(
  NB + "(музык|песн|мелод|саундтрек|трек" + NA + "|бит" + NA + ")",
  "iu",
);
const VIDEO = new RegExp(
  NB + "(видео|раскадров|ролик" + NA + "|клип" + NA + ")",
  "iu",
);
const WEB = new RegExp(
  NB +
    "(сайт(?![уеыо])|лендинг(?![уеыо])|визитк|интерфейс(?![уеаыо])|калькулятор(?![уеаыо])|приложени[ея](?![\\p{L}]))",
  "iu",
);
const PAGE = new RegExp(NB + "(страниц|вёрстк|верстк|html)", "iu");
/** «5 страниц», «по 2000 знаков в странице»: страницы здесь мера объёма текста, а не веб-страница. */
const PAGE_AS_LENGTH = new RegExp(
  "(?:\\d+|один|одн\\p{L}*|дв[ае]|три|четыре|пять|шесть|семь|восемь|девять|десять|двадцать|тридцать)\\s*(?:[-–]\\s*\\d+\\s*)?(?:в\\s+|по\\s+)?страниц|знак\\p{L}*\\s+(?:на|в)\\s+страниц|страниц\\p{L}*\\s+(?:текста|по\\s+\\d)|(?:в|на)\\s+(?:одн[ой]+|кажд[ой]+)\\s+страниц",
  "iu",
);
/** Просьба написать текст (сказку, статью, стихи): это работа модели, а не студия сайта. */
const WRITE_TEXT = new RegExp(
  NB +
    "(?:напиш\\p{L}*|написать|сочини\\p{L}*|придумай|расскажи)\\s+(?:мне\\s+|нам\\s+|пожалуйста\\s+|небольш\\p{L}*\\s+|короткую\\s+|длинную\\s+|фантастическую\\s+|интересную\\s+|свою\\s+)*(?:\\p{L}+\\s+){0,2}?(?:сказк|рассказ|стат[ьи]|эссе|текст|письм|стих|поэм|сценари|речь|отзыв|историю|биографи|реферат|сочинени|книг|глав[уы]|заметк|пост" +
    NA +
    ")",
  "iu",
);
/** «Я не просил сайт», «без сайта»: упоминание сайта в претензии, а не заказ. */
const NOT_ASKED = new RegExp(
  NB +
    "(?:не\\s+(?:просил\\p{L}*|прош[уу]|надо|нужн\\p{L}*|хочу|говорил\\p{L}*)|без)\\s+(?:\\p{L}+\\s+){0,2}?(?:сайт|страниц|кейс|лендинг|приложени|калькулятор|интерфейс|zip|архив)",
  "iu",
);
/** Глагол заказа должен стоять рядом перед предметом, в пределах одной фразы. */
function createdNear(text: string, noun: RegExp): boolean {
  const target = noun.exec(text);
  if (!target) return false;
  const before = text.slice(Math.max(0, target.index - 70), target.index);
  const sentence = before.split(/[.!?\n]/).pop() ?? "";
  return CREATE.test(sentence);
}
const FILE = new RegExp(
  NB +
    "(pdf|docx|xlsx|pptx|документ(?:а|ы)?|таблиц\\p{L}*|презентац\\p{L}*)" +
    NA,
  "iu",
);
const DIAGRAM = new RegExp(
  NB + "(диаграмм\\p{L}*|схем\\p{L}*|график)" + NA,
  "iu",
);

const TALK: Assignment = {
  kind: "talk",
  studio: null,
  control: null,
  worker: "",
  now: "",
  ready: "",
  next: "",
  needsYou: "",
};

function at(re: RegExp, text: string): number {
  const match = re.exec(text);
  return match ? match.index : -1;
}

function card(
  partial: Omit<Assignment, "needsYou"> & { needsYou?: string },
): Assignment {
  return { needsYou: "Пока не нужно.", ...partial };
}

/** Карточка части, которую назвала модель. Слова фразы здесь не угадываются. */
export function assignmentForKind(
  kind: Exclude<AssignmentKind, "talk">,
): Assignment {
  if (kind === "image")
    return card({
      kind: "image",
      studio: null,
      control: null,
      worker: "Картинка",
      now: "Собираю изображение по этой фразе.",
      ready: "Картинка появится в этом чате.",
      next: "Правку можно написать следующим сообщением.",
    });
  if (kind === "video")
    return card({
      kind: "video",
      studio: null,
      control: null,
      worker: "Ролик",
      now: "Собираю раскадровку.",
      ready: "Кадры появятся в этом чате. Это не съёмка внешней моделью.",
      next: "Внешняя видеомодель не вызывается.",
    });
  if (kind === "music")
    return card({
      kind: "music",
      studio: null,
      control: null,
      worker: "Трек",
      now: "Собираю трек.",
      ready: "Трек появится в этом чате, если генератор отвечает.",
      next: "Если секрета музыки нет, чат так и скажет.",
    });
  if (kind === "file")
    return card({
      kind: "file",
      studio: null,
      control: null,
      worker: "Файл",
      now: "Собираю файл.",
      ready: "Файл появится в этом чате.",
      next: "PDF, DOCX, XLSX и PPTX скачиваются из чата.",
    });
  if (kind === "diagram")
    return card({
      kind: "diagram",
      studio: null,
      control: null,
      worker: "Схема",
      now: "Собираю схему.",
      ready: "Схема появится в этом чате.",
      next: "Стрелки можно написать как «А -> Б».",
    });
  if (kind === "web")
    return card({
      kind: "web",
      studio: null,
      control: null,
      worker: "Сайт",
      now: "Собираю страницу.",
      ready: "Код и ссылка появятся в этом чате.",
      next: "Ссылка живёт 90 дней.",
    });
  return card({
    kind: "build",
    studio: null,
    control: null,
    worker: "Код",
    now: "Разбираю поручение.",
    ready: "Результат появится в проекте по шагам.",
    next: "На экране будет, кто работает и что уже сделано.",
  });
}

const SKILLS =
  /(?<![\p{L}])(?:что\s+(?:ты\s+)?(?:умеешь|можешь)|(?:ты\s+)?умеешь|можешь\s+(?:писать|читать|делать|собрать)|твои\s+возможност|что\s+умеет|писать\s+код|читать\s+(?:зип|zip|файл|архив))(?![\p{L}])/iu;

/** Короткий ответ о реальных действиях чата. Модель этот список не выдумывает. */
export function skillsReply(text: string): string | null {
  const source = (text ?? "").trim();
  if (!source || !SKILLS.test(source)) return null;
  return [
    "Я твой архитектор, разработчик, аналитик и дизайнер в этом чате. Укажи задачу и входные данные.",
    "Программирование: пишу, правлю и разбираю JS, TS, Python, SQL, HTML, CSS и Cloudflare Workers.",
    "Анализ: дроблю задачу, сравниваю варианты, считаю CSV и JSON, пишу технические и художественные тексты.",
    "Файлы: скрепка читает ZIP, текст, DOCX, XLSX, PPTX, PDF и картинку. «Сделай pdf», «docx», «xlsx» или «pptx» отдаёт файл в чат. «Схема» рисует схему. Картинка — «нарисуй …». Страница — «сделай сайт …».",
    "Поиск по фразе «найди» прикладывает источники Википедии и DuckDuckGo. Ссылка github.com на публичный репозиторий читает README.",
    "Push в GitHub, выкладку Cloudflare, Figma, Canva, Gmail и Google Drive фраза сама не нажимает: в ответе будет состояние связи. Нет расписаний, нет управления браузером, нет доступа к твоему компьютеру. Ролик — раскадровка. Трек — только если генератор вернул звук.",
  ].join("\n");
}

/** Фраза → поручение. Вопрос остаётся разговором. Спорные слова (деплой, тесты, аудит) тоже. */
export function readAssignment(text: string): Assignment {
  const source = (text ?? "").trim();
  if (!source || source.length > 4000) return TALK;
  if (TEXT_ABOUT_IMAGE.test(source) && !DRAW_VERB.test(source)) return TALK;
  if (NOT_ASKED.test(source)) return TALK;
  if (
    WRITE_TEXT.test(source) &&
    !EXPLICIT.test(source) &&
    !DRAW_VERB.test(source)
  )
    return TALK;
  const asks =
    QUESTION.test(source) || source.endsWith("?") || CONDITIONAL.test(source);
  if (
    asks ||
    !CREATE.test(source) ||
    (HOLD.test(source) && !EXPLICIT.test(source))
  )
    return TALK;

  const hits: Array<{ at: number; plan: Assignment }> = [];
  const diagramAt = at(DIAGRAM, source);
  if (diagramAt >= 0)
    hits.push({
      at: diagramAt,
      plan: card({
        kind: "diagram",
        studio: null,
        control: null,
        worker: "Схема",
        now: "Собираю схему.",
        ready: "Схема появится в этом чате.",
        next: "Стрелки можно написать как «А -> Б».",
      }),
    });
  const fileAt = at(FILE, source);
  if (fileAt >= 0)
    hits.push({
      at: fileAt,
      plan: card({
        kind: "file",
        studio: null,
        control: null,
        worker: "Файл",
        now: "Собираю файл.",
        ready: "Файл появится в этом чате.",
        next: "PDF, DOCX, XLSX и PPTX скачиваются из чата.",
      }),
    });
  const imageAt = diagramAt >= 0 ? -1 : at(IMAGE, source);
  if (imageAt >= 0)
    hits.push({
      at: imageAt,
      plan: card({
        kind: "image",
        studio: null,
        control: null,
        worker: "Картинка",
        now: "Собираю изображение по этой фразе.",
        ready: "Картинка появится в этом чате.",
        next: "Правку можно написать следующим сообщением.",
      }),
    });
  const videoAt = at(VIDEO, source);
  if (videoAt >= 0)
    hits.push({
      at: videoAt,
      plan: card({
        kind: "video",
        studio: null,
        control: null,
        worker: "Ролик",
        now: "Собираю раскадровку.",
        ready: "Кадры появятся в этом чате. Это не съёмка внешней моделью.",
        next: "Внешняя видеомодель не вызывается.",
      }),
    });
  const musicAt = at(MUSIC, source);
  if (musicAt >= 0)
    hits.push({
      at: musicAt,
      plan: card({
        kind: "music",
        studio: null,
        control: null,
        worker: "Трек",
        now: "Собираю трек.",
        ready: "Трек появится в этом чате, если генератор отвечает.",
        next: "Если секрета музыки нет, чат так и скажет.",
      }),
    });
  const webAt = createdNear(source, WEB) ? at(WEB, source) : -1;
  const pageAt =
    CREATE.test(source) &&
    !PAGE_AS_LENGTH.test(source) &&
    createdNear(source, PAGE)
      ? at(PAGE, source)
      : -1;
  const siteAt =
    webAt >= 0 && pageAt >= 0
      ? Math.min(webAt, pageAt)
      : Math.max(webAt, pageAt);
  if (siteAt >= 0)
    hits.push({
      at: siteAt,
      plan: card({
        kind: "web",
        studio: null,
        control: null,
        worker: "Сайт",
        now: "Собираю страницу.",
        ready: "Код и ссылка появятся в этом чате.",
        next: "Ссылка живёт 90 дней.",
      }),
    });
  hits.sort((a, b) => a.at - b.at);
  if (hits[0]) return hits[0].plan;
  return TALK;
}

export function formatAssignment(plan: Assignment): string {
  return [
    "**Поручение принято**",
    "",
    `Кто работает: ${plan.worker}`,
    `Сейчас: ${plan.now}`,
    `Уже будет: ${plan.ready}`,
    `Дальше: ${plan.next}`,
    `Нужно ли тебе вмешаться: ${plan.needsYou}`,
  ].join("\n");
}
