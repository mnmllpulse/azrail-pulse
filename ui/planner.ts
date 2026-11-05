import { readAssignment, type Assignment, type AssignmentKind } from './assignment';

export type PlanState = 'waiting' | 'running' | 'done' | 'failed';

export type PlanThing = {
  type: 'image' | 'audio' | 'page' | 'storyboard' | 'note';
  url?: string;
  title?: string;
  lines?: string[];
};

export type PlanPart = Assignment & {
  id: string;
  text: string;
  wave: number;
  dependsOn: string[];
  state: PlanState;
  thing?: PlanThing;
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
  return kind === 'image' || kind === 'music' || kind === 'video' || kind === 'web';
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
  return lines.join('\n');
}

const ARTIFACT_URL = /^\/api\/studio\/artifacts\/[A-Za-z0-9._~-]{1,180}(?:\?inline=1)?$/;
const PAGE_URL = /^\/s\/[A-Za-z0-9_-]{1,80}\/?$/;

function cleanThing(thing: PlanThing | undefined): PlanThing | undefined {
  if (!thing) return undefined;
  const lines = thing.lines?.map((line) => line.slice(0, 200)).filter(Boolean).slice(0, 8);
  const title = thing.title?.slice(0, 200);
  const url = thing.url && (ARTIFACT_URL.test(thing.url) || PAGE_URL.test(thing.url)) ? thing.url : undefined;
  if (thing.type === 'storyboard') return lines?.length ? { type: thing.type, lines } : undefined;
  if (thing.type === 'note') return title ? { type: thing.type, title } : undefined;
  if (!url || (thing.type !== 'image' && thing.type !== 'audio' && thing.type !== 'page')) return undefined;
  return { type: thing.type, url, ...(title ? { title } : {}), ...(lines?.length ? { lines } : {}) };
}

/** Снимок плана для уже существующей переписки. Чужой адрес в ссылку не проходит. */
export function planRecord(plan: WorkPlan) {
  return {
    text: plan.parts.map((part) => part.text).join(' · ').slice(0, 2000),
    parts: plan.parts.slice(0, 4).map((part) => {
      const thing = cleanThing(part.thing);
      return {
        id: part.id.slice(0, 32),
        kind: part.kind === 'talk' ? 'build' : part.kind,
        text: part.text.slice(0, 500),
        worker: part.worker.slice(0, 80),
        state: part.state,
        ready: part.ready.slice(0, 500),
        ...(thing ? { thing } : {}),
      };
    }),
  };
}
