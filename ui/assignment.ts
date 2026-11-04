import type { StudioId } from './studio-types';

/** Куда чат отдаёт фразу. talk остаётся разговором. */
export type AssignmentKind = 'talk' | 'image' | 'music' | 'video' | 'web' | 'build';

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

/** Фраза → поручение. Вопрос остаётся разговором. Спорные слова (деплой, тесты, аудит) тоже. */
export function readAssignment(text: string): Assignment {
  const source = (text ?? '').trim();
  if (!source || source.length > 4000) return TALK;
  const asks = QUESTION.test(source) || source.endsWith('?');
  if (asks || HOLD.test(source)) return TALK;

  const hits: Array<{ at: number; plan: Assignment }> = [];
  const imageAt = at(IMAGE, source);
  if (imageAt >= 0) hits.push({
    at: imageAt,
    plan: card({
      kind: 'image',
      studio: 'image',
      control: '#studio-run',
      worker: 'Image Studio',
      now: 'Собираю изображение по этой фразе.',
      ready: 'Картинка появится в Image Studio.',
      next: 'Правку можно написать следующим сообщением.',
    }),
  });
  const videoAt = at(VIDEO, source);
  if (videoAt >= 0) hits.push({
    at: videoAt,
    plan: card({
      kind: 'video',
      studio: 'video',
      control: '#video-build-scenes',
      worker: 'Video Studio',
      now: 'Собираю раскадровку и ролик из кадров на экране.',
      ready: 'Ролик появится в Video Studio.',
      next: 'Это сборка кадров на экране. Внешняя видеомодель не вызывается.',
    }),
  });
  const musicAt = at(MUSIC, source);
  if (musicAt >= 0) hits.push({
    at: musicAt,
    plan: card({
      kind: 'music',
      studio: 'music',
      control: '#music-listen-build',
      worker: 'Music Studio',
      now: 'Собираю трек на этом устройстве.',
      ready: 'Файл появится в плеере Music Studio.',
      next: 'Длина и темп берутся из настроек студии.',
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
      worker: 'Миссия · сайт',
      now: 'Принимаю цель и открываю ход задачи.',
      ready: 'Файлы сайта появятся в проекте, когда шаги закончатся.',
      next: 'На экране будет статус, шаг и что уже сделано.',
    }),
  });
  hits.sort((a, b) => a.at - b.at);
  if (hits[0]) return hits[0].plan;
  if (!CREATE.test(source)) return TALK;
  return card({
    kind: 'build',
    studio: null,
    control: null,
    worker: 'Миссия AZRAIL',
    now: 'Разбираю поручение и открываю ход задачи.',
    ready: 'Результат появится в проекте по шагам.',
    next: 'На экране будет, кто работает и что уже сделано.',
  });
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
