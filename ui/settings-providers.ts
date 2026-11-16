import { PROVIDER_TOKENS, clearProviderToken, hasProviderToken, saveProviderToken } from './provider-tokens';
import { modelBadge, type PickerModel } from './model-picker';
import { providerFromSlug } from './model-display';

export type Routing = {
  policy: { allowThirdPartyModels: boolean; monthlyBudgetUsd: number };
  gatewayConfigured: boolean;
  committedUsd: number;
  workersPlan?: string;
  month?: string;
};

export type ProviderInfo = {
  level: 'ready' | 'blocked' | 'absent';
  headline: string;
  facts: string[];
  models: PickerModel[];
  available: number;
};

const LABELS: Record<string, string[]> = {
  openai: ['OpenAI'],
  anthropic: ['Anthropic'],
  google: ['Google'],
  mistral: ['Mistral'],
  deepseek: ['DeepSeek'],
  xai: ['xAI'],
  huggingface: ['Hugging Face'],
};

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('en') === b.trim().toLocaleLowerCase('en');

export function providerModels(id: string, catalog: readonly PickerModel[]): PickerModel[] {
  const name = PROVIDER_TOKENS.find((item) => item.id === id)?.name ?? id;
  const labels = LABELS[id] ?? [name];
  return catalog.filter((model) => {
    const label = model.provider || providerFromSlug(model.slug);
    return labels.some((candidate) => same(candidate, label));
  });
}

/** Статус считается по состоянию маршрута AZRAIL, а не по наличию локального ключа. */
export function providerInfo(id: string, catalog: readonly PickerModel[], routing: Routing | null, localKey: boolean): ProviderInfo {
  const models = providerModels(id, catalog);
  const available = models.filter((model) => model.availability !== 'unavailable').length;
  const external = models.some((model) => model.hosted === false);
  const facts: string[] = [];
  let level: ProviderInfo['level'];
  let headline: string;

  if (!models.length) {
    level = 'absent';
    headline = 'AZRAIL не маршрутизирует модели этого провайдера';
    facts.push('В каталоге нет ни одной его модели, поэтому подключить его через AZRAIL сейчас нельзя.');
  } else {
    level = available > 0 ? 'ready' : 'blocked';
    headline = available > 0 ? `Доступно ${available} из ${models.length} моделей через AZRAIL` : `Все ${models.length} моделей сейчас недоступны`;
    if (available === 0) facts.push('Каталог помечает все модели провайдера как недоступные на текущем плане.');
  }

  if (external) {
    if (!routing) facts.push('Состояние AI Gateway и политики не удалось прочитать.');
    else {
      facts.push(routing.gatewayConfigured ? 'AI Gateway настроен.' : 'AI Gateway не настроен: сторонние модели не заработают.');
      facts.push(routing.policy.allowThirdPartyModels ? 'Политика разрешает сторонние модели.' : 'Политика блокирует сторонние модели (OFF).');
      if (!routing.gatewayConfigured || !routing.policy.allowThirdPartyModels) {
        if (level === 'ready') { level = 'blocked'; headline = `Маршрут закрыт: ${models.length} моделей в каталоге, вызовы заблокированы`; }
      }
    }
  }

  facts.push(localKey
    ? 'Локальный ключ сохранён в этой вкладке. Сервер его не получает, вызовы им не выполняются, на статус он не влияет.'
    : 'Локальный ключ не задан. Для работы через AZRAIL он не требуется.');
  return { level, headline, facts, models, available };
}

export function limitsLine(routing: Routing | null): string {
  if (!routing) return 'Лимиты не удалось прочитать.';
  const spent = `$${Number(routing.committedUsd).toFixed(4)}`;
  const cap = routing.policy.monthlyBudgetUsd > 0 ? `$${routing.policy.monthlyBudgetUsd}` : 'бюджет не задан';
  return `Платные маршруты за ${routing.month ?? 'месяц'}: учтено ${spent} из ${cap}. Бюджет общий для всех провайдеров, раздельной статистики по провайдерам система не ведёт.`;
}

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export type ProviderPageDeps = {
  providerId: string;
  loadCatalog: () => Promise<PickerModel[]>;
  loadRouting: () => Promise<Routing | null>;
  notice: (text: string, bad?: boolean) => void;
  failure: (error: unknown) => void;
  back: () => void;
};

const LEVEL_TEXT: Record<ProviderInfo['level'], string> = { ready: 'Маршрут открыт', blocked: 'Маршрут закрыт', absent: 'Нет моделей' };
const MODELS_SHOWN = 40;

export function renderProviderPage(host: HTMLElement, deps: ProviderPageDeps): void {
  const provider = PROVIDER_TOKENS.find((item) => item.id === deps.providerId);
  if (!provider) return;
  const back = node('button', '← Все провайдеры', 'settings-back settings-provider-back');
  back.type = 'button';
  back.onclick = deps.back;
  const head = node('h2', provider.name);
  const lead = node('p', provider.note || 'Внешний AI-провайдер.', 'muted');
  const statusCard = node('section', '', 'settings-info-card');
  const modelsCard = node('section', '', 'settings-info-card');
  const limitsCard = node('section', '', 'settings-info-card');
  const keyCard = node('section', '', 'settings-info-card');
  host.append(back, head, lead, statusCard, modelsCard, limitsCard, keyCard);

  const paintLoading = () => {
    for (const card of [statusCard, modelsCard, limitsCard]) card.replaceChildren(node('p', 'Проверяю состояние маршрута…', 'muted'));
  };

  const refresh = async () => {
    paintLoading();
    const [catalog, routing] = await Promise.all([
      deps.loadCatalog().catch(() => null),
      deps.loadRouting().catch(() => null),
    ]);
    if (!catalog) {
      for (const card of [statusCard, modelsCard]) card.replaceChildren(node('p', 'Каталог моделей не загрузился. Войдите в аккаунт и повторите проверку.', 'context-note'));
      limitsCard.replaceChildren(node('p', limitsLine(routing), 'muted'));
      return;
    }
    const info = providerInfo(provider.id, catalog, routing, hasProviderToken(provider.id));

    statusCard.replaceChildren(node('h3', 'Статус подключения'));
    const badge = node('p', `${LEVEL_TEXT[info.level]} · ${info.headline}`, `settings-provider-status is-${info.level}`);
    badge.dataset.level = info.level;
    statusCard.append(badge);
    for (const fact of info.facts) statusCard.append(node('p', fact, 'muted'));
    statusCard.append(node('p', 'Способ авторизации: маршрут AZRAIL на сервере. Ключ из браузера в запросах не участвует.', 'muted'));
    const check = node('button', 'Проверить состояние');
    check.type = 'button';
    check.onclick = () => { check.disabled = true; void refresh().catch(deps.failure).finally(() => { check.disabled = false; }); };
    statusCard.append(check);

    modelsCard.replaceChildren(node('h3', `Модели (${info.models.length})`));
    if (!info.models.length) modelsCard.append(node('p', 'Список пуст.', 'muted'));
    const list = node('ul', '', 'settings-model-list');
    for (const model of info.models.slice(0, MODELS_SHOWN)) {
      const badgeInfo = modelBadge(model);
      const item = node('li', '', 'settings-model-item');
      const name = node('span', model.displayName || model.slug.replace(/^@cf\//, ''));
      const tag = node('span', badgeInfo.text, `settings-model-tag is-${badgeInfo.kind}`);
      tag.title = badgeInfo.hint;
      item.append(name, tag);
      list.append(item);
    }
    modelsCard.append(list);
    if (info.models.length > MODELS_SHOWN) modelsCard.append(node('p', `Показаны первые ${MODELS_SHOWN} из ${info.models.length}.`, 'muted'));

    limitsCard.replaceChildren(node('h3', 'Статистика и ограничения'), node('p', limitsLine(routing), 'muted'));
  };

  keyCard.append(node('h3', 'Локальный ключ'));
  keyCard.append(node('p', 'Не вставляйте ключ в чат. Значение хранится только в sessionStorage этой вкладки и исчезает после её закрытия. Вызовы провайдера этим ключом пока отключены.', 'context-note'));
  const label = node('label', 'API key');
  const input = node('input');
  input.type = 'password';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 400;
  input.setAttribute('aria-label', `API key ${provider.name}`);
  const paintKey = () => { input.placeholder = hasProviderToken(provider.id) ? 'Новый ключ заменит сохранённый' : 'Вставьте ключ'; };
  paintKey();
  label.append(input);
  const actions = node('div', '', 'settings-actions');
  const save = node('button', 'Сохранить ключ', 'primary');
  const clear = node('button', 'Удалить ключ');
  save.type = clear.type = 'button';
  clear.disabled = !hasProviderToken(provider.id);
  save.onclick = () => {
    const value = input.value.trim();
    if (!value) { deps.notice('Вставьте ключ в поле.', true); return; }
    try { saveProviderToken(provider.id, value); } catch { deps.notice('Не удалось сохранить ключ в этой вкладке.', true); return; }
    input.value = '';
    clear.disabled = false;
    paintKey();
    deps.notice(`Ключ ${provider.name} сохранён только в этой вкладке.`);
    void refresh().catch(deps.failure);
  };
  clear.onclick = () => {
    clearProviderToken(provider.id);
    clear.disabled = true;
    paintKey();
    deps.notice(`Локальный ключ ${provider.name} удалён.`);
    void refresh().catch(deps.failure);
  };
  actions.append(save, clear);
  keyCard.append(label, actions);

  void refresh().catch(deps.failure);
}
