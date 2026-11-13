import { explainIntent, intentFromParts } from '../src/lib/intent-contract';
import { assignmentForKind, readAssignment, type Assignment, type AssignmentKind } from './assignment';

export type PlanState = 'waiting' | 'running' | 'done' | 'failed';

export type PlanThing = {
  type: 'image' | 'audio' | 'page' | 'storyboard' | 'note' | 'file' | 'diagram';
  url?: string;
  title?: string;
  lines?: string[];
  alts?: string[];
};

export type PlanPart = Assignment & {
  id: string;
  text: string;
  wave: number;
  dependsOn: string[];
  state: PlanState;
  thing?: PlanThing;
  versions?: PlanThing[];
  seed?: number;
};

export type WorkPlan = {
  parts: PlanPart[];
  /** Несколько частей одной волны идут рядом. */
  parallel: boolean;
};

const SEQUENCE = /\s+(?:а\s+потом|потом|затем|после\s+этого)\s+/iu;
const LOOSE = /\s*,\s*|\s+и\s+/iu;

function realKind(text: string): AssignmentKind {
  return readAssignment(text).kind;
}

function deliverable(text: string): boolean {
  const kind = realKind(text);
  return kind === 'image' || kind === 'music' || kind === 'video' || kind === 'web' || kind === 'file' || kind === 'diagram';
}

function loosePieces(text: string): string[] | null {
  const bits = text.split(LOOSE).map((bit) => bit.trim()).filter(Boolean);
  if (bits.length < 2) return null;
  const kept = bits.filter((bit) => deliverable(bit));
  return kept.length > 1 ? kept : null;
}

function pieces(text: string): Array<{ text: string; after: boolean }> {
  const ordered = text.split(SEQUENCE).map((bit) => bit.trim()).filter(Boolean);
  if (ordered.length > 1) {
    const rows = ordered
      .map((bit, index) => ({ text: bit, after: index > 0 }))
      .filter((row) => realKind(row.text) !== 'talk');
    if (rows.length > 1) return rows.map((row, index) => ({ ...row, after: index > 0 }));
  }
  const loose = loosePieces(text);
  if (loose) return loose.map((bit) => ({ text: bit, after: false }));
  return [{ text, after: false }];
}

function mergeWave(parts: PlanPart[]): PlanPart[] {
  const merged: PlanPart[] = [];
  for (const part of parts) {
    const prev = merged[merged.length - 1];
    if (prev && prev.wave === part.wave && prev.kind === part.kind && prev.kind !== 'talk') {
      prev.text = `${prev.text}. ${part.text}`;
      continue;
    }
    merged.push(part);
  }
  return merged.map((part, index) => {
    const id = `part-${index + 1}`;
    const dependsOn = part.wave === 0 ? [] : [`part-${index}`];
    return { ...part, id, dependsOn };
  });
}

/** План, который вернула модель. Пустой список значит разговор. Неверная часть отменяет весь ответ. */
export function workPlanFromDraft(rows: Array<{ text?: string; kind?: string; after?: boolean }>): WorkPlan | null {
  if (!rows.length) return null;
  const drafted: PlanPart[] = [];
  let wave = 0;
  for (const row of rows.slice(0, 4)) {
    const kind = row.kind;
    if (kind !== 'image' && kind !== 'music' && kind !== 'video' && kind !== 'web' && kind !== 'file' && kind !== 'diagram' && kind !== 'build') return null;
    const text = (row.text ?? '').trim().slice(0, 500);
    if (!text) return null;
    if (row.after && drafted.length) wave += 1;
    drafted.push({
      ...assignmentForKind(kind),
      id: `part-${drafted.length + 1}`,
      text,
      wave,
      dependsOn: [],
      state: 'waiting',
    });
  }
  const parts = drafted.map((part, index) => ({
    ...part,
    id: `part-${index + 1}`,
    dependsOn: part.wave === 0 ? [] : [`part-${index}`],
  }));
  const parallel = parts.some((part) => parts.filter((other) => other.wave === part.wave).length > 1);
  return { parts, parallel };
}

/** Фраза сама просит картинку, трек, ролик, страницу или файл. Пустой план модели это не отменяет. */
export function keepAskedMedia(message: string, drafted: WorkPlan | null): WorkPlan | null {
  const local = planWork(message);
  const asked = local.parts.filter((part) => part.kind === 'image' || part.kind === 'music' || part.kind === 'video' || part.kind === 'web' || part.kind === 'file' || part.kind === 'diagram');
  if (!asked.length) return drafted;
  if (!drafted?.parts.length) return local;
  const kinds = new Set(drafted.parts.map((part) => part.kind));
  return asked.some((part) => !kinds.has(part.kind)) ? local : drafted;
}

/** Файл и схема берутся только из слов самого сообщения. Модель не превращает разбор архива в сборку файла. */
export function groundWorkPlan(message: string, plan: WorkPlan | null): WorkPlan | null {
  if (!plan) return null;
  const asked = readAssignment(message).kind;
  const parts = plan.parts.filter((part) => (part.kind !== 'file' && part.kind !== 'diagram') || asked === part.kind);
  if (!parts.length) return null;
  if (parts.length === plan.parts.length) return plan;
  return { ...plan, parts, parallel: parts.some((part) => parts.filter((other) => other.wave === part.wave).length > 1) };
}

export type StoredPart = {
  id?: string;
  kind?: string;
  text?: string;
  state?: string;
  ready?: string;
  wave?: number;
  dependsOn?: string[];
  thing?: PlanThing;
  versions?: PlanThing[];
  seed?: number;
};

/** План из записи переписки. Идущая часть после закрытия вкладки снова ждёт. */
export function openStoredPlan(rows: StoredPart[]): WorkPlan | null {
  const parts: PlanPart[] = [];
  for (const row of rows.slice(0, 4)) {
    const kind = row.kind;
    if (kind !== 'image' && kind !== 'music' && kind !== 'video' && kind !== 'web' && kind !== 'file' && kind !== 'diagram' && kind !== 'build') return null;
    const text = (row.text ?? '').trim().slice(0, 500);
    if (!text) return null;
    const state = row.state === 'done' || row.state === 'failed' || row.state === 'waiting' ? row.state : 'waiting';
    const wave = Number.isInteger(row.wave) && (row.wave ?? 0) >= 0 && (row.wave ?? 0) <= 3 ? row.wave ?? 0 : 0;
    parts.push({
      ...assignmentForKind(kind),
      id: (row.id ?? `part-${parts.length + 1}`).slice(0, 32),
      text,
      wave,
      dependsOn: Array.isArray(row.dependsOn) ? row.dependsOn.filter((id) => typeof id === 'string').slice(0, 3) : [],
      state,
      ready: (row.ready ?? '').slice(0, 500),
      ...(row.thing ? { thing: row.thing } : {}),
      ...(Array.isArray(row.versions) && row.versions.length ? { versions: row.versions.slice(0, 3) } : {}),
      ...(Number.isInteger(row.seed) && (row.seed ?? 0) >= 0 ? { seed: row.seed } : {}),
    });
  }
  if (!parts.length) return null;
  const parallel = parts.some((part) => parts.filter((other) => other.wave === part.wave).length > 1);
  return { parts, parallel };
}

/** Волны, в которых ещё есть несобранная часть. Готовая часть сюда не входит. onlyId оставляет одну часть. */
export function wavesToRun(plan: WorkPlan, onlyId?: string): PlanPart[][] {
  const waves = [...new Set(plan.parts.map((part) => part.wave))].sort((a, b) => a - b);
  return waves
    .map((wave) => plan.parts.filter((part) => part.wave === wave && part.state !== 'done' && (!onlyId || part.id === onlyId)))
    .filter((group) => group.length > 0);
}

function keepVersion(part: PlanPart) {
  if (!part.thing) return;
  part.versions = [part.thing, ...(part.versions ?? [])].slice(0, 3);
  delete part.thing;
}

const FOLLOW_UP = /темнее|светлее|контраст|ярче|измени|поправь|переделай|ещё вариант|другую версию|верни предыдущ/iu;
const PAGE_CHANGE = /шире|уже|сузь|добав|анимац|эффект|импульс|пульс|фиолет|кнопк|цвет|фон|шрифт|исправ|поменя|обнов|чат|д[её]шев|скучн|бедно|сложн|упрост/iu;
const IMAGE_FOLLOW = /картинк|изображен|постер|темнее|светлее|контраст|ярче/iu;
const OTHER_MEDIA = /(?<![\p{L}])(?:картинк|постер|иллюстрац|обложк|изображен|логотип|нарисуй|музык|песн|мелод|трек|видео|ролик|клип)(?![\p{L}])/iu;

/** Короткая правка продолжает последнюю картинку или страницу этой ленты. Новая задача сюда не попадает. */
export function followUpPlan(message: string, plan: WorkPlan | null): WorkPlan | null {
  const source = message.trim();
  if (!plan || !source) return null;
  const image = [...plan.parts].reverse().find((part) => part.thing?.type === 'image' && part.thing.url);
  const page = [...plan.parts].reverse().find((part) => part.thing?.type === 'page' && part.thing.url);
  const freshSite = /(?<![\p{L}])(?:созда(?:й|ть)|собери)\b/iu.test(source) && /(?<![\p{L}])сайт(?![\p{L}])/iu.test(source);
  if (page?.thing?.url && PAGE_CHANGE.test(source) && !OTHER_MEDIA.test(source) && !freshSite) {
    return {
      parallel: false,
      parts: [{
        ...assignmentForKind('web'),
        id: 'part-1',
        text: source.slice(0, 500),
        wave: 0,
        dependsOn: [],
        state: 'waiting',
        versions: [page.thing, ...(page.versions ?? [])].filter((item) => item.type === 'page' && item.url).slice(0, 3),
      }],
    };
  }
  if (!FOLLOW_UP.test(source) || OTHER_MEDIA.test(source)) return null;
  const thing = image?.thing;
  if (!thing?.url || (PAGE_CHANGE.test(source) && !IMAGE_FOLLOW.test(source))) return null;
  const base = image?.text.trim() ?? '';
  return {
    parallel: false,
    parts: [{
      ...assignmentForKind('image'),
      id: 'part-1',
      text: `${base}. ${source}`.replace(/^\.\s*/, '').slice(0, 500),
      wave: 0,
      dependsOn: [],
      state: 'waiting',
      versions: [thing],
    }],
  };
}

function pagePassport(thing: PlanThing | undefined): thing is PlanThing {
  return thing?.type === 'page' && Boolean(thing.url) && Boolean(thing.lines?.some((line) => line.startsWith('azrail-site\t')));
}

/** Ставит выбранную прошлую страницу текущей. Смещённая страница остаётся в истории, не больше трёх. */
export function restorePageVersion(part: PlanPart, index: number): PlanThing | null {
  const older = part.versions?.[index];
  if (!pagePassport(older)) return null;
  const current = part.thing;
  const rest = (part.versions ?? []).filter((_, place) => place !== index);
  part.thing = older;
  part.versions = current?.url ? [current, ...rest].slice(0, 3) : rest.slice(0, 3);
  part.state = 'done';
  return older;
}

/** Берёт последнюю прошлую страницу этой ленты. Без паспорта страницы план не меняется. */
export function takeBackPage(plan: WorkPlan | null): PlanThing | null {
  if (!plan) return null;
  for (const part of [...plan.parts].reverse()) {
    const index = part.versions?.findIndex((item) => pagePassport(item)) ?? -1;
    if (index >= 0) return restorePageVersion(part, index);
  }
  return null;
}

const PAGE_RESTORE = /верни\s+(?:предыдущ|прошл|как\s+было)/iu;
const IMAGE_WORD = /(?<![\p{L}])(?:картинк|постер|изображен)/iu;

export function wantsPageRestore(message: string): boolean {
  return PAGE_RESTORE.test(message.trim()) && !IMAGE_WORD.test(message);
}

/** Меняет текст одной части и ставит её заново. Прошлая вещь остаётся в истории. Соседей не трогает. */
export function revisePart(plan: WorkPlan, id: string, text: string): boolean {
  const next = text.trim().slice(0, 500);
  const part = plan.parts.find((item) => item.id === id);
  if (!part || !next) return false;
  part.text = next;
  part.state = 'waiting';
  part.ready = '';
  keepVersion(part);
  return true;
}

/** Возвращает в работу только упавшую часть. Готовая соседняя часть остаётся готовой. */
export function retryPart(plan: WorkPlan, id: string): boolean {
  const part = plan.parts.find((item) => item.id === id);
  if (!part || part.state !== 'failed') return false;
  part.state = 'waiting';
  part.ready = '';
  keepVersion(part);
  return true;
}

/** Часть, которая ждёт упавшую предыдущую, сама не идёт. Сосед без этой зависимости остаётся. */
export function holdBlocked(plan: WorkPlan, group: PlanPart[]): PlanPart[] {
  const blocked = group.filter((part) => plan.parts.some((dep) => part.dependsOn.includes(dep.id) && dep.state === 'failed'));
  for (const part of blocked) part.state = 'failed';
  return group.filter((part) => part.state !== 'failed' && part.state !== 'done');
}

/** Имя файла из фразы. Служебные знаки становятся чёрточкой. */
export function fileNameFromPhrase(text: string, ext: string): string {
  const stem = text.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${stem || 'файл'}.${ext.replace(/^\./, '')}`;
}

/** Делит поручение на части. Волна 0 идёт рядом, следующая ждёт предыдущую. */
export function planWork(text: string): WorkPlan {
  const source = (text ?? '').trim();
  const rows = source ? pieces(source).slice(0, 4) : [];
  const drafted: PlanPart[] = [];
  let wave = 0;
  for (const row of rows) {
    const assignment = readAssignment(row.text);
    if (assignment.kind === 'talk') continue;
    if (row.after) wave += 1;
    drafted.push({
      ...assignment,
      id: `part-${drafted.length + 1}`,
      text: row.text,
      wave,
      dependsOn: [],
      state: 'waiting',
    });
  }
  const parts = mergeWave(drafted);
  const parallel = parts.some((part) => parts.filter((other) => other.wave === part.wave).length > 1);
  return { parts, parallel };
}

export function formatPlan(plan: WorkPlan): string {
  if (plan.parts.length < 2) return '';
  const waves = new Map<number, PlanPart[]>();
  for (const part of plan.parts) {
    const list = waves.get(part.wave) ?? [];
    list.push(part);
    waves.set(part.wave, list);
  }
  const lines = [`**План из ${plan.parts.length} частей**`, ''];
  for (const [wave, group] of waves) {
    const names = group.map((part) => part.worker).join(' и ');
    lines.push(wave === 0 ? `Рядом: ${names}.` : `После предыдущей части: ${names}.`);
  }
  lines.push('');
  plan.parts.forEach((part, index) => {
    const place = part.wave === 0 ? 'рядом' : 'после предыдущей';
    lines.push(`${index + 1}. ${part.worker} — ${place} — ${part.text}`);
  });
  lines.push('');
  lines.push(explainIntent(intentFromParts(plan.parts.map((part) => part.text).join(' · '), plan.parts)));
  return lines.join('\n');
}

const ARTIFACT_URL = /^\/api\/studio\/artifacts\/[A-Za-z0-9._~-]{1,180}(?:\?inline=1)?$/;

/** Текст сообщения чата, в котором картинка остаётся картинкой после перерисовки ленты. */
export function pictureReply(parts: Array<{ ready?: string; thing?: PlanThing }>): string {
  const blocks: string[] = [];
  for (const part of parts) {
    const thing = part.thing;
    if (thing?.type === 'file' && thing.url && ARTIFACT_URL.test(thing.url)) {
      const name = (thing.title || 'Файл').replace(/[\[\]]/g, '').slice(0, 80);
      blocks.push(part.ready?.trim() || 'Файл в чате.');
      blocks.push(`[${name}](${thing.url})`);
      continue;
    }
    if (thing?.type === 'diagram' && thing.lines?.length) {
      blocks.push(part.ready?.trim() || 'Схема в чате.');
      blocks.push('```diagram\n' + thing.lines.map((line) => line.replace(/`/g, "'")).join('\n') + '\n```');
      continue;
    }
    if (thing?.type !== 'image' || !thing.url || !ARTIFACT_URL.test(thing.url)) continue;
    const title = (thing.title || 'Картинка').replace(/[\[\]]/g, '').slice(0, 80);
    blocks.push(part.ready?.trim() || 'Картинка в чате.');
    blocks.push(`![${title}](${thing.url})`);
    for (const alt of thing.alts ?? []) {
      if (ARTIFACT_URL.test(alt)) blocks.push(`![${title}](${alt})`);
    }
  }
  return blocks.join('\n\n').slice(0, 4000);
}
const PAGE_URL = /^\/s\/[A-Za-z0-9_-]{1,80}\/?$/;

function keptUrls(urls: Array<string | undefined>): string[] {
  return urls.filter((url): url is string => Boolean(url && (ARTIFACT_URL.test(url) || PAGE_URL.test(url)))).slice(0, 3);
}

function cleanThing(thing: PlanThing | undefined): PlanThing | undefined {
  if (!thing) return undefined;
  const lines = thing.lines?.map((line) => line.slice(0, 200)).filter(Boolean).slice(0, 8);
  const title = thing.title?.slice(0, 200);
  const url = thing.url && (ARTIFACT_URL.test(thing.url) || PAGE_URL.test(thing.url)) ? thing.url : undefined;
  const alts = keptUrls(thing.alts ?? []);
  if (thing.type === 'storyboard' || thing.type === 'diagram') return lines?.length ? { type: thing.type, lines } : undefined;
  if (thing.type === 'note') return title ? { type: thing.type, title } : undefined;
  if (!url || (thing.type !== 'image' && thing.type !== 'audio' && thing.type !== 'page' && thing.type !== 'file')) return undefined;
  return { type: thing.type, url, ...(title ? { title } : {}), ...(lines?.length ? { lines } : {}), ...(alts.length ? { alts } : {}) };
}

/** Снимок плана для уже существующей переписки. Чужой адрес в ссылку не проходит. */
export function planRecord(plan: WorkPlan) {
  return {
    text: plan.parts.map((part) => part.text).join(' · ').slice(0, 2000),
    parts: plan.parts.slice(0, 4).map((part) => {
      const thing = cleanThing(part.thing);
      const versions = (part.versions ?? []).map((item) => cleanThing(item)).filter((item): item is PlanThing => Boolean(item)).slice(0, 3);
      return {
        id: part.id.slice(0, 32),
        kind: part.kind === 'talk' ? 'build' : part.kind,
        text: part.text.slice(0, 500),
        worker: part.worker.slice(0, 80),
        state: part.state,
        ready: part.ready.slice(0, 500),
        wave: part.wave,
        ...(part.dependsOn.length ? { dependsOn: part.dependsOn.slice(0, 3) } : {}),
        ...(thing ? { thing } : {}),
        ...(versions.length ? { versions } : {}),
        ...(Number.isInteger(part.seed) ? { seed: part.seed } : {}),
      };
    }),
  };
}
