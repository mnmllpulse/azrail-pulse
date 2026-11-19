import { PROVIDER_TOKENS, hasProviderToken } from './provider-tokens';
import { iconElement, type IconName } from './icons';

export type SettingsSection =
  | 'account'
  | 'appearance'
  | 'voice'
  | 'models'
  | 'providers'
  | 'connections'
  | 'permissions'
  | 'agent'
  | 'usage'
  | 'data'
  | 'shortcuts'
  | 'about';

type Destination = { section: SettingsSection; provider?: string };
type Navigate = (destination: Destination | { page: 'create' } | { page: 'settings' }) => void;
type Item = {
  section: SettingsSection;
  title: string;
  description: string;
  icon: IconName;
  group: string;
};

export const SETTINGS_ITEMS: Item[] = [
  { section: 'account', title: 'Аккаунт и профиль', description: 'Имя, роль, вход и управление сессией.', icon: 'account', group: 'Рабочее пространство' },
  { section: 'appearance', title: 'Внешний вид', description: 'Плотность интерфейса и читаемость.', icon: 'appearance', group: 'Рабочее пространство' },
  { section: 'shortcuts', title: 'Управление и доступность', description: 'Горячие клавиши, анимации, контраст и язык.', icon: 'shortcuts', group: 'Рабочее пространство' },
  { section: 'models', title: 'AI и модели', description: 'Текущая модель, каталог и автовыбор.', icon: 'models', group: 'Интеллект' },
  { section: 'voice', title: 'Голос', description: 'Голос для следующего ответа.', icon: 'voice', group: 'Интеллект' },
  { section: 'providers', title: 'Провайдеры и API', description: 'Каталог поставщиков и локальные ключи.', icon: 'providers', group: 'Интеллект' },
  { section: 'connections', title: 'Подключения', description: 'MCP, OAuth, scopes, credentials и вызовы.', icon: 'connections', group: 'Интеграции' },
  { section: 'agent', title: 'Локальный агент', description: 'Связь с компьютером и разрешённые задачи.', icon: 'agent', group: 'Интеграции' },
  { section: 'permissions', title: 'Безопасность и разрешения', description: 'Режим подтверждения действий агентов.', icon: 'permissions', group: 'Защита и данные' },
  { section: 'data', title: 'Данные и память', description: 'Библиотека файлов и проектная память.', icon: 'data', group: 'Защита и данные' },
  { section: 'usage', title: 'Использование и лимиты', description: 'Лимиты, бюджет и пробные возможности.', icon: 'usage', group: 'Система' },
  { section: 'about', title: 'О системе и диагностика', description: 'Версия, принципы работы и сведения о продукте.', icon: 'about', group: 'Система' },
];

const bySection = new Map(SETTINGS_ITEMS.map((item) => [item.section, item]));

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export function settingsTitle(section?: string, provider?: string): string {
  if (section === 'providers' && provider) {
    return PROVIDER_TOKENS.find((item) => item.id === provider)?.name ?? 'Провайдер';
  }
  return bySection.get((section || '') as SettingsSection)?.title ?? 'Настройки';
}

let detachKeys: (() => void) | undefined;

export function mountSettingsCenter(
  host: HTMLElement,
  section: string | undefined,
  provider: string | undefined,
  navigate: Navigate,
): HTMLElement {
  host.replaceChildren();
  const active = (bySection.has(section as SettingsSection) ? section : '') as SettingsSection | '';
  const shell = node('div', '', 'settings-shell');
  shell.classList.toggle('has-section', !!active);
  const sidebar = node('aside', '', 'settings-sidebar');
  const sidebarHead = node('div', '', 'settings-sidebar-head');
  sidebarHead.append(
    node('p', 'PULSE SETTINGS', 'settings-eyebrow'),
    node('span', 'Все параметры AZRAIL в одном месте.', 'muted'),
  );

  const searchLabel = node('label', 'Поиск настроек', 'settings-search-label');
  const search = node('input');
  search.type = 'search';
  search.placeholder = 'Найти настройку…';
  search.maxLength = 80;
  search.setAttribute('aria-label', 'Поиск по настройкам');
  searchLabel.append(search);

  const nav = node('nav', '', 'settings-nav');
  nav.setAttribute('aria-label', 'Категории настроек');
  const buttons = new Map<SettingsSection, HTMLButtonElement>();
  const groups = [...new Set(SETTINGS_ITEMS.map((item) => item.group))];

  for (const groupName of groups) {
    const group = node('section', '', 'settings-nav-group');
    group.append(node('h2', groupName, 'settings-nav-heading'));
    for (const item of SETTINGS_ITEMS.filter((candidate) => candidate.group === groupName)) {
      const button = node('button', '', 'settings-nav-item');
      button.append(iconElement(item.icon), node('span', item.title));
      button.type = 'button';
      button.dataset.settingsSection = item.section;
      button.title = item.description;
      if (active === item.section) button.setAttribute('aria-current', 'page');
      button.onclick = () => navigate({ section: item.section });
      buttons.set(item.section, button);
      group.append(button);
    }
    nav.append(group);
  }

  sidebar.append(sidebarHead, searchLabel, nav);

  const main = node('div', '', 'settings-main');
  const heading = node('div', '', 'settings-page-heading');
  const up = node('button', provider ? '← Провайдеры' : active ? '← Все настройки' : '← Вернуться в чат', 'settings-back settings-up');
  up.type = 'button';
  up.onclick = () => navigate(provider ? { section: 'providers' } : active ? { page: 'settings' } : { page: 'create' });
  const crumbs = node('nav', '', 'settings-breadcrumb');
  crumbs.setAttribute('aria-label', 'Путь в настройках');
  const crumb = (text: string, go?: () => void) => {
    if (!go) return node('span', text, 'settings-crumb is-current');
    const button = node('button', text, 'settings-crumb');
    button.type = 'button';
    button.onclick = go;
    return button;
  };
  const sep = () => node('span', '/', 'settings-crumb-sep');
  if (active) {
    crumbs.append(crumb('Настройки', () => navigate({ page: 'settings' })), sep());
    if (provider) crumbs.append(crumb('Провайдеры', () => navigate({ section: 'providers' })), sep(), crumb(settingsTitle(section, provider)));
    else crumbs.append(crumb(settingsTitle(active)));
  }
  heading.append(up);
  if (active) heading.append(crumbs);
  const title = node('h1', active ? settingsTitle(active, provider) : 'Настройки');
  title.tabIndex = -1;
  const description = active
    ? provider
      ? 'Параметры выбранного провайдера.'
      : 'Управление выбранным разделом AZRAIL PULSE.'
    : 'Управляйте аккаунтом, моделями, подключениями и рабочим пространством.';
  heading.append(title, node('p', description, 'settings-description'));
  main.append(heading);

  const content = node('div', '', 'settings-detail-content');
  content.id = 'settings-content';

  if (!active) {
    main.append(node('p', 'Выберите раздел в меню слева.', 'muted settings-pick-hint'));
  } else if (active === 'providers' && !provider) {
    const intro = node(
      'p',
      'Выберите провайдера, чтобы открыть его отдельную страницу. Наличие локального ключа не означает, что провайдер выбран по умолчанию.',
      'settings-inline-note',
    );
    const grid = node('div', '', 'settings-provider-grid');
    for (const item of PROVIDER_TOKENS) {
      const card = node('button', '', 'settings-provider-card');
      card.type = 'button';
      card.dataset.settingsSearch = [item.name, item.note, item.id, 'провайдер api ключ'].join(' ').toLocaleLowerCase('ru');
      const saved = hasProviderToken(item.id);
      const status = saved ? 'Локальный ключ (не подключение)' : 'Подробнее: статус маршрута';
      card.setAttribute('aria-label', [item.name, item.note || 'Внешний AI-провайдер', status, 'Открыть'].join('. '));
      const top = node('div', '', 'settings-provider-top');
      top.append(
        node('span', item.name, 'settings-provider-name'),
        node('span', '↗', 'settings-category-arrow'),
      );
      card.append(
        top,
        node('span', item.note || 'Внешний AI-провайдер.', 'settings-provider-note'),
        node('span', status, 'settings-provider-status'),
      );
      card.onclick = () => navigate({ section: 'providers', provider: item.id });
      grid.append(card);
    }
    content.append(intro, grid);
    main.append(content);
  } else {
    if (active === 'providers' && provider && !PROVIDER_TOKENS.some((item) => item.id === provider)) {
      content.append(node('p', 'Провайдер не найден. Вернитесь в каталог и выберите доступный вариант.', 'context-note'));
    }
    main.append(content);
  }

  const empty = node('p', 'Ничего не найдено. Попробуйте другое название или очистите поиск.', 'settings-search-empty');
  empty.hidden = true;
  empty.setAttribute('role', 'status');
  if (active === 'providers' && !provider) content.append(empty);
  else if (!active) main.append(empty);

  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('ru');
    let visible = 0;

    for (const [key, button] of buttons) {
      const item = bySection.get(key)!;
      const providerMatch = key === 'providers' && PROVIDER_TOKENS.some((candidate) =>
        `${candidate.name} ${candidate.note} ${candidate.id}`.toLocaleLowerCase('ru').includes(query),
      );
      const matches = !query || `${item.title} ${item.description} ${item.group}`.toLocaleLowerCase('ru').includes(query) || providerMatch;
      button.hidden = !matches;
      if (matches) visible++;
    }

    for (const group of Array.from(nav.querySelectorAll<HTMLElement>('.settings-nav-group'))) {
      group.hidden = !Array.from(group.querySelectorAll<HTMLButtonElement>('.settings-nav-item')).some((button) => !button.hidden);
    }

    for (const card of Array.from(main.querySelectorAll<HTMLButtonElement>('.settings-category-card, .settings-provider-card'))) {
      const matches = !query || (card.dataset.settingsSearch ?? '').toLocaleLowerCase('ru').includes(query);
      card.hidden = !matches;
      if (matches) visible++;
    }

    empty.hidden = !query || visible > 0;
  });

  shell.append(sidebar, main);
  host.append(shell);

  detachKeys?.();
  const onKey = (event: KeyboardEvent) => {
    if (!host.isConnected || host.closest('[hidden]')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search.focus();
      search.select();
    }
  };
  document.addEventListener('keydown', onKey);
  detachKeys = () => document.removeEventListener('keydown', onKey);
  const view = host.closest<HTMLElement>('#settings-page');
  if (view) view.scrollTop = 0;
  return content;
}
