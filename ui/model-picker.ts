import { isChatCapableModel, isNeuronPaidModel, providerFromSlug, type CatalogLike } from './model-display';

export type PickerModel = CatalogLike & {
  reviewed?: boolean;
  hosted?: boolean;
  capabilities?: string[];
  availability?: string;
};

export type PickerFilter = 'chat' | 'free' | 'reviewed' | 'all';

export const PICKER_FILTERS: ReadonlyArray<{ id: PickerFilter; label: string }> = [
  { id: 'chat', label: 'Для чата' },
  { id: 'free', label: 'Бесплатные' },
  { id: 'reviewed', label: 'Проверенные' },
  { id: 'all', label: 'Все' },
];

export type PickerBadge = { kind: 'free' | 'paid' | 'neuron' | 'external' | 'locked'; text: string; hint: string };

export const isSelectable = (m: PickerModel) => m.availability !== 'unavailable';

/** Одна метка на модель: что она стоит и почему может быть недоступна. */
export function modelBadge(m: PickerModel): PickerBadge {
  if (!isSelectable(m)) return { kind: 'locked', text: 'Нужен Paid', hint: 'Недоступна на текущем плане Workers.' };
  if (isNeuronPaidModel(m.slug)) return { kind: 'neuron', text: 'Нейроны', hint: 'Workers Paid: тратит общий лимит нейронов в сутки.' };
  if (m.freeAllowlisted) return { kind: 'free', text: 'Free', hint: 'Входит в бесплатный набор.' };
  if (m.hosted === false) return { kind: 'external', text: 'Сторонняя', hint: 'Не на Cloudflare: вызов через AI Gateway и по твоему бюджету.' };
  return { kind: 'paid', text: 'Paid', hint: 'Платная модель Cloudflare.' };
}

const isChat = (m: PickerModel) => isChatCapableModel({ ...m, availability: undefined });

export function applyPicker(
  models: readonly PickerModel[],
  options: { filter: PickerFilter; query: string; showLocked: boolean },
  label: (m: PickerModel) => string,
): PickerModel[] {
  const q = options.query.trim().toLocaleLowerCase();
  return models.filter((m) => {
    if (!options.showLocked && !isSelectable(m)) return false;
    if (options.filter === 'chat' && !isChat(m)) return false;
    if (options.filter === 'free' && !(m.freeAllowlisted && isSelectable(m))) return false;
    if (options.filter === 'reviewed' && !m.reviewed) return false;
    if (!q) return true;
    const provider = m.provider || providerFromSlug(m.slug);
    return `${label(m)} ${provider} ${m.slug} ${m.task ?? ''}`.toLocaleLowerCase().includes(q);
  });
}
