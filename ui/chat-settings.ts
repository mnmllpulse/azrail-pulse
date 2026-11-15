export type SwitchModel = { slug: string; label: string; free?: boolean };
export type SwitchIntent = { slug: string; label: string } | null;

const SWITCH = /^\s*(?:переключи(?:сь)?|используй|поставь|перейди|закрепи|выбери)\s+(?:(?:на|для\s+чата)\s+)?(?:модел\p{L}*\s+)?(.{2,60}?)[.!]?\s*$/iu;
const AUTO = /^(?:авто|автовыбор|auto|автоматическ\p{L}*(?:\s+выбор)?)$/iu;
const FREE = /^(?:бесплатн\p{L}*|free)(?:\s+модел\p{L}*)?$/iu;
export const YES = /^\s*(?:да|применить|применяй|ок|ok|\+)[.!]?\s*$/iu;
export const ROLLBACK = /^\s*(?:откати|откатить|отмени\s+(?:выбор|смену)|верни\s+(?:прежнюю\s+)?модель)[.!]?\s*$/iu;

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');

/** «Переключи на glm» → одна модель из каталога; неоднозначное и неизвестное не угадывается. */
export function modelIntent(message: string, models: readonly SwitchModel[]): SwitchIntent {
  const wanted = message.match(SWITCH)?.[1]?.trim();
  if (!wanted) return null;
  if (AUTO.test(wanted)) return { slug: '', label: 'Auto · AZRAIL' };
  if (FREE.test(wanted)) {
    const free = models.filter((m) => m.free);
    return free.length === 1 ? { slug: free[0].slug, label: free[0].label } : null;
  }
  const key = norm(wanted);
  const exact = models.filter((m) => norm(m.slug) === key || norm(m.label) === key);
  const hits = exact.length ? exact : models.filter((m) => norm(m.slug).includes(key) || norm(m.label).includes(key));
  return hits.length === 1 ? { slug: hits[0].slug, label: hits[0].label } : null;
}

export type ModelProposal = { to: string; toLabel: string; from: string; fromLabel: string };

export function proposalText(p: ModelProposal): string {
  return `Предлагаю закрепить модель «${p.toLabel}» для чата. Сейчас: «${p.fromLabel}». Напиши «да» — применю. Изменение только в этом браузере, «откати» вернёт прежнюю.`;
}
