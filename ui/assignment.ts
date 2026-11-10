import type { StudioId } from './studio-types';

/** Куда чат отдаёт фразу. talk остаётся разговором. */
export type AssignmentKind = 'talk' | 'image' | 'music' | 'video' | 'web' | 'file' | 'diagram' | 'build';

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

const NB = '(?<!\\p{L})';
const NA = '(?!\\p{L})';
const QUESTION = new RegExp(
  NB + '(что такое|как\\s|почему|зачем|чем отлича|объясни|расскажи|посоветуй|можно ли|какой лучше|сравни|стоит ли)',
  'iu',
);
const CREATE = new RegExp(
  NB + '(созда(й|ть|йте)|напиш(и|ите)|написать|сдела(й|ть|йте)|сгенерируй|собери|собрать|нарисуй|нарисовать|смонтируй)',
  'iu',
);
const HOLD = new RegExp(NB + '(тест|покрыти|уязвимост|безопасн|секрет|аудит|деплой|задепло|выкат|коммит|ветк)', 'iu');
const IMAGE = new RegExp(NB + '(картинк|постер|иллюстрац|обложк|изображен|логотип|нарисуй)', 'iu');
const MUSIC = new RegExp(NB + '(музык|песн|мелод|саундтрек|трек' + NA + '|бит' + NA + ')', 'iu');
const VIDEO = new RegExp(NB + '(видео|раскадров|ролик' + NA + '|клип' + NA + ')', 'iu');
const WEB = new RegExp(NB + '(сайт|лендинг|визитк|интерфейс)', 'iu');
const PAGE = new RegExp(NB + '(страниц|вёрстк|верстк|html)', 'iu');
const FILE = new RegExp(NB + '(pdf|docx|xlsx|pptx|документ(?:а|ы)?|таблиц\\p{L}*|презентац\\p{L}*)' + NA, 'iu');
const DIAGRAM = new RegExp(NB + '(диаграмм\\p{L}*|схем\\p{L}*|график)' + NA, 'iu');

const TALK: Assignment = {
  kind: 'talk',
  studio: null,
  control: null,
  worker: '',
  now: '',
  ready: '',
  next: '',
  needsYou: '',
};

function at(re: RegExp, text: string): number {
  const match = re.exec(text);
  return match ? match.index : -1;
}

function card(partial: Omit<Assignment, 'needsYou'> & { needsYou?: string }): Assignment {
  return { needsYou: 'Пока не нужно.', ...partial };
}

/** Карточка части, которую назвала модель. Слова фразы здесь не угадываются. */
export function assignmentForKind(kind: Exclude<AssignmentKind, 'talk'>): Assignment {
  if (kind === 'image') return card({
    kind: 'image', studio: null, control: null, worker: 'Картинка',
    now: 'Собираю изображение по этой фразе.',
    ready: 'Картинка появится в этом чате.',
    next: 'Правку можно написать следующим сообщением.',
  });
  if (kind === 'video') return card({
    kind: 'video', studio: null, control: null, worker: 'Ролик',
    now: 'Собираю раскадровку.',
    ready: 'Кадры появятся в этом чате. Это не съёмка внешней моделью.',
    next: 'Внешняя видеомодель не вызывается.',
  });
  if (kind === 'music') return card({
    kind: 'music', studio: null, control: null, worker: 'Трек',
    now: 'Собираю трек.',
    ready: 'Трек появится в этом чате, если генератор отвечает.',
    next: 'Если секрета музыки нет, чат так и скажет.',
  });
  if (kind === 'file') return card({
    kind: 'file', studio: null, control: null, worker: 'Файл',
    now: 'Собираю файл.',
    ready: 'Файл появится в этом чате.',
    next: 'PDF, DOCX, XLSX и PPTX скачиваются из чата.',
  });
  if (kind === 'diagram') return card({
    kind: 'diagram', studio: null, control: null, worker: 'Схема',
    now: 'Собираю схему.',
    ready: 'Схема появится в этом чате.',
    next: 'Стрелки можно написать как «А -> Б».',
  });
  if (kind === 'web') return card({
    kind: 'web', studio: null, control: null, worker: 'Сайт',
    now: 'Собираю страницу.',
    ready: 'Код и ссылка появятся в этом чате.',
    next: 'Ссылка живёт 90 дней.',
  });
  return card({
    kind: 'build', studio: null, control: null, worker: 'Код',
    now: 'Разбираю поручение.',
    ready: 'Результат появится в проекте по шагам.',
    next: 'На экране будет, кто работает и что уже сделано.',
  });
}

const SKILLS = /(?<![\p{L}])(?:что\s+(?:ты\s+)?(?:умеешь|можешь)|(?:ты\s+)?умеешь|можешь\s+(?:писать|читать|делать|собрать)|твои\s+возможност|что\s+умеет|писать\s+код|читать\s+(?:зип|zip|файл|архив))(?![\p{L}])/iu;

/** Короткий ответ о реальных действиях чата. Модель этот список не выдумывает. */
export function skillsReply(text: string): string | null {
  const source = (text ?? '').trim();
  if (!source || !SKILLS.test(source)) return null;
  return [
    'Я твой архитектор, разработчик, аналитик и дизайнер в этом чате. Укажи задачу и входные данные.',
    'Программирование: пишу, правлю и разбираю JS, TS, Python, SQL, HTML, CSS и Cloudflare Workers.',
    'Анализ: дроблю задачу, сравниваю варианты, считаю CSV и JSON, пишу технические и художественные тексты.',
    'Файлы: скрепка читает ZIP, текст, DOCX, XLSX, PPTX, PDF и картинку. «Сделай pdf», «docx», «xlsx» или «pptx» отдаёт файл в чат. «Схема» рисует схему. Картинка — «нарисуй …». Страница — «сделай сайт …».',
    'Поиск по фразе «найди» прикладывает источники Википедии и DuckDuckGo. Ссылка github.com на публичный репозиторий читает README.',
    'Push в GitHub, выкладку Cloudflare, Figma, Canva, Gmail и Google Drive фраза сама не нажимает: в ответе будет состояние связи. Нет расписаний, нет управления браузером, нет доступа к твоему компьютеру. Ролик — раскадровка. Трек — только если генератор вернул звук.',
  ].join('\n');
}

/** Фраза → поручение. Вопрос остаётся разговором. Спорные слова (деплой, тесты, аудит) тоже. */
export function readAssignment(text: string): Assignment {
  const source = (text ?? '').trim();
  if (!source || source.length > 4000) return TALK;
  const asks = QUESTION.test(source) || source.endsWith('?');
  if (asks || HOLD.test(source)) return TALK;

  const hits: Array<{ at: number; plan: Assignment }> = [];
  const diagramAt = at(DIAGRAM, source);
  if (diagramAt >= 0) hits.push({
    at: diagramAt,
    plan: card({
      kind: 'diagram',
      studio: null,
      control: null,
      worker: 'Схема',
      now: 'Собираю схему.',
      ready: 'Схема появится в этом чате.',
      next: 'Стрелки можно написать как «А -> Б».',
    }),
  });
  const fileAt = at(FILE, source);
  if (fileAt >= 0) hits.push({
    at: fileAt,
    plan: card({
      kind: 'file',
      studio: null,
      control: null,
      worker: 'Файл',
      now: 'Собираю файл.',
      ready: 'Файл появится в этом чате.',
      next: 'PDF, DOCX, XLSX и PPTX скачиваются из чата.',
    }),
  });
  const imageAt = diagramAt >= 0 ? -1 : at(IMAGE, source);
  if (imageAt >= 0) hits.push({
    at: imageAt,
    plan: card({
      kind: 'image',
      studio: null,
      control: null,
      worker: 'Картинка',
      now: 'Собираю изображение по этой фразе.',
      ready: 'Картинка появится в этом чате.',
      next: 'Правку можно написать следующим сообщением.',
    }),
  });
  const videoAt = at(VIDEO, source);
  if (videoAt >= 0) hits.push({
    at: videoAt,
    plan: card({
      kind: 'video',
      studio: null,
      control: null,
      worker: 'Ролик',
      now: 'Собираю раскадровку.',
      ready: 'Кадры появятся в этом чате. Это не съёмка внешней моделью.',
      next: 'Внешняя видеомодель не вызывается.',
    }),
  });
  const musicAt = at(MUSIC, source);
  if (musicAt >= 0) hits.push({
    at: musicAt,
    plan: card({
      kind: 'music',
      studio: null,
      control: null,
      worker: 'Трек',
      now: 'Собираю трек.',
      ready: 'Трек появится в этом чате, если генератор отвечает.',
      next: 'Если секрета музыки нет, чат так и скажет.',
    }),
  });
  const webAt = at(WEB, source);
  const pageAt = CREATE.test(source) ? at(PAGE, source) : -1;
  const siteAt = webAt >= 0 && pageAt >= 0 ? Math.min(webAt, pageAt) : Math.max(webAt, pageAt);
  if (siteAt >= 0) hits.push({
    at: siteAt,
    plan: card({
      kind: 'web',
      studio: null,
      control: null,
      worker: 'Сайт',
      now: 'Собираю страницу.',
      ready: 'Код и ссылка появятся в этом чате.',
      next: 'Ссылка живёт 90 дней.',
    }),
  });
  hits.sort((a, b) => a.at - b.at);
  if (hits[0]) return hits[0].plan;
  return TALK;
}

export function formatAssignment(plan: Assignment): string {
  return [
    '**Поручение принято**',
    '',
    `Кто работает: ${plan.worker}`,
    `Сейчас: ${plan.now}`,
    `Уже будет: ${plan.ready}`,
    `Дальше: ${plan.next}`,
    `Нужно ли тебе вмешаться: ${plan.needsYou}`,
  ].join('\n');
}
