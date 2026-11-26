import { createAgentBrowser } from './agent-browser';
import { stripAnsi } from './chat-agent';
import { activeRootField, pickActive, readActiveRoot, saveActiveRoot, type AgentRootView } from './agent-roots';
import { agentCommand, toRelativePath } from './agent-paths';
import { COMPUTER_COMMANDS } from './terminal-panel';

type Api = (path: string, init?: RequestInit) => Promise<any>;

type JobView = { id: string; kind: string; path: string; status: string; result: string | null; error: string | null; bytes?: number; dest?: string; query?: string; args?: string };

const STATUS: Record<string, string> = {
  awaiting_approval: 'ждёт твоего «ок»',
  queued: 'в очереди',
  running: 'выполняется',
  done: 'готово',
  failed: 'ошибка',
  rejected: 'отклонено',
  expired: 'истекло',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export { agentCommand } from './agent-paths';

export function agentSettings(api: Api, notice: (text: string, bad?: boolean) => void, failure: (error: unknown) => void): HTMLElement {
  const root = el('section', '', 'settings-block');
  root.append(el('h3', 'Агент на компьютере'));
  root.append(el('p', 'Выключен по умолчанию. Включается на 1 час, видит только одну папку, секреты (.env, .git, ключи) закрыты, запись только после твоего «ок».', 'muted'));
  const body = el('div');
  root.append(body);

  const kind = el('select');
  for (const [value, label] of [['list', 'Список файлов'], ['read', 'Прочитать файл'], ['write', 'Записать файл'], ['run', 'Команда (белый список)']]) {
    const option = el('option', label);
    option.value = value;
    kind.append(option);
  }
  const path = el('input');
  path.placeholder = 'Путь внутри папки: выбери в обзоре ниже или введи вручную';
  path.maxLength = 300;
  path.setAttribute('aria-label', 'Путь относительно папки агента');
  const pathHint = el('p', 'Путь считается от папки агента, например src/index.ts. Абсолютный путь внутри этой папки (C:\\...\\src) пересчитается сам.', 'muted');
  const command = el('select');
  for (const [value, label] of COMPUTER_COMMANDS) {
    const option = el('option', label);
    option.value = value;
    command.append(option);
  }
  const content = el('textarea');
  content.rows = 4;
  content.placeholder = 'Текст файла (только для записи)';
  const syncForm = () => {
    path.hidden = kind.value === 'run';
    pathHint.hidden = kind.value === 'run';
    command.hidden = kind.value !== 'run';
    content.hidden = kind.value !== 'write';
  };
  kind.onchange = syncForm;
  syncForm();
  const ownJobs = new Set<string>();
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const browser = createAgentBrowser({
    api,
    sleep,
    ownJobs,
    failure,
    onSelect: (selection) => {
      path.value = selection.path;
      if (kind.value === 'list' || kind.value === 'read') kind.value = selection.kind;
      syncForm();
    },
  });
  let autoOpened = false;
  let token: string | null = null;
  let agentRoot: string | null = null;
  let known: { enabled: boolean; connected: boolean; roots: string } | null = null;

  const setup = el('div', '', 'agent-setup');
  const rootInput = el('input');
  rootInput.placeholder = 'Папка на компьютере. Несколько — через ; (пусто — текущая папка PowerShell)';
  rootInput.maxLength = 260;
  rootInput.setAttribute('aria-label', 'Папка, которой сможет управлять агент');
  try { rootInput.value = localStorage.getItem('pulse.agentRoot') ?? ''; } catch { /* хранилище недоступно */ }
  const commandBox = el('textarea');
  commandBox.readOnly = true;
  commandBox.rows = 5;
  const copy = el('button', 'Скопировать команду');
  copy.type = 'button';
  const refreshCommand = () => { if (token) commandBox.value = agentCommand(location.origin, token, rootInput.value); };
  rootInput.oninput = () => {
    try { localStorage.setItem('pulse.agentRoot', rootInput.value); } catch { /* хранилище недоступно */ }
    refreshCommand();
  };
  copy.onclick = () => {
    void navigator.clipboard.writeText(`${commandBox.value}\n`).then(() => notice('Команда скопирована.')).catch(() => { commandBox.select(); notice('Выдели текст и скопируй вручную (Ctrl+C).', true); });
  };
  setup.append(
    el('strong', 'Запуск на компьютере'),
    el('p', '1. Открой PowerShell в папке репозитория azrail-pulse (там, где scripts\\local-agent). 2. Вставь команду целиком: последняя строка запустится сама. Окно оставь открытым. Ключ показан один раз и действует только последний: после нового «Включить» старую команду вставлять нельзя.', 'muted'),
    el('label', 'Папки, которыми сможет управлять агент'),
    rootInput,
    commandBox,
    copy,
  );

  const paint = async () => {
    let state: { enabled: boolean; expiresAt: number | null; connected: boolean; paired?: boolean; deviceOnline?: boolean; root?: string | null; roots?: AgentRootView[]; jobs: JobView[] };
    try {
      state = await api('/api/agent/status');
    } catch {
      body.replaceChildren(el('p', 'Состояние агента не прочиталось.', 'muted'));
      return;
    }
    const nodes: HTMLElement[] = [];
    if (!state.enabled) { autoOpened = false; token = null; }
    const roots = state.roots ?? [];
    const active = pickActive(roots, readActiveRoot());
    if (active && roots.length > 1) saveActiveRoot(active.name);
    else saveActiveRoot('');
    agentRoot = active?.path ?? state.root ?? null;
    browser.setRoot(agentRoot);
    known = { enabled: state.enabled, connected: state.connected, roots: JSON.stringify(roots) };
    const until = new Date(state.expiresAt ?? 0).toLocaleTimeString();
    const status = !state.enabled
      ? 'Выключен.'
      : state.connected
        ? `Включён до ${until}. Агент подключён${agentRoot ? `, папка: ${agentRoot}` : ''}.`
        : `Включён до ${until}. Агент на компьютере ещё не подключился.`;
    nodes.push(el('p', status));
    const paired = !!state.paired;
    if (paired) {
      const forget = el('button', 'Забыть компьютер');
      forget.type = 'button';
      forget.onclick = () => void api('/api/agent/pair/forget', { method: 'POST', body: '{}' }).then(() => { notice('Компьютер отвязан, доступ выключен.'); return paint(); }).catch(failure);
      nodes.push(el('p', state.deviceOnline ? 'Компьютер привязан и на связи.' : 'Компьютер привязан, но не на связи: запусти файл Start-Azrail-Agent.bat из папки azrail-pulse (двойной клик).', 'muted'), forget);
    } else {
      const code = el('input');
      code.placeholder = 'Код из окна на компьютере, например 1234-5678';
      code.maxLength = 12;
      code.inputMode = 'numeric';
      code.setAttribute('aria-label', 'Код привязки компьютера');
      const confirmCode = el('button', 'Подтвердить компьютер');
      confirmCode.type = 'button';
      confirmCode.onclick = () => void api('/api/agent/pair/approve', { method: 'POST', body: JSON.stringify({ code: code.value }) }).then(() => { notice('Компьютер привязан. Теперь достаточно нажимать «Включить на 1 час».'); return paint(); }).catch(failure);
      nodes.push(
        el('strong', 'Привязать компьютер один раз'),
        el('p', '1. В папке azrail-pulse дважды кликни файл Start-Azrail-Agent.bat. 2. В чёрном окне появится код. 3. Введи его здесь и нажми «Подтвердить компьютер». Дальше PowerShell и ключи не нужны.', 'muted'),
        code,
        confirmCode,
      );
    }
    if (state.enabled && roots.length > 1 && active) {
      const picker = el('select');
      picker.setAttribute('aria-label', 'Активная папка агента');
      for (const entry of roots) { const option = el('option', `${entry.name} — ${entry.path}`); option.value = entry.name; picker.append(option); }
      picker.value = active.name;
      picker.onchange = () => {
        saveActiveRoot(picker.value);
        const chosen = roots.find((entry) => entry.name === picker.value);
        agentRoot = chosen?.path ?? null;
        browser.setRoot(agentRoot);
        void browser.open('');
        notice(`Активная папка: ${picker.value}. Чат и терминал работают в ней.`);
      };
      nodes.push(el('label', 'Активная папка (смена без перезапуска агента)'), picker);
    }
    const toggle = el('button', state.enabled ? 'Выключить' : 'Включить на 1 час');
    toggle.type = 'button';
    toggle.onclick = () => {
      if (state.enabled) {
        void api('/api/agent/disable', { method: 'POST', body: '{}' }).then(() => { notice('Агент выключен, ключ отозван.'); return paint(); }).catch(failure);
        return;
      }
      void api('/api/agent/enable', { method: 'POST', body: '{}' }).then(async (r: { token: string }) => {
        token = paired ? null : r.token;
        refreshCommand();
        await paint();
      }).catch(failure);
    };
    nodes.push(toggle);
    if (state.enabled && !state.connected && paired) nodes.push(el('p', 'Доступ открыт. Жду компьютер: запусти файл Start-Azrail-Agent.bat, если он ещё не работает.', 'context-note'));
    else if (state.enabled && !state.connected) {
      if (token) nodes.push(setup);
      else nodes.push(el('p', 'Ключ показывается один раз и после обновления страницы недоступен. Нажми «Выключить», затем «Включить на 1 час», чтобы получить новую команду.', 'context-note'));
    }

    if (state.enabled) {
      const send = el('button', 'Поставить задачу');
      send.type = 'button';
      send.onclick = () => {
        const target = kind.value === 'run' ? { path: command.value } : toRelativePath(path.value, agentRoot);
        if ('error' in target) { notice(target.error, true); return; }
        void api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind: kind.value, path: target.path, ...(kind.value === 'write' ? { content: content.value } : {}), ...activeRootField() }) })
          .then(() => { notice('Задача поставлена.'); return paint(); }).catch(failure);
      };
      nodes.push(
        el('p', 'При запуске агент берёт папку, где лежит Start-Azrail-Agent.bat, и добавленные раньше. Обзор показывает только содержимое выданных папок, выше подняться нельзя. Между папками можно переключаться без перезапуска.', 'muted'),
        browser.element,
        kind, path, pathHint, command, content, send,
      );
      const foldersBox = el('div', '', 'agent-folders');
      foldersBox.append(el('strong', 'Папки агента'));
      for (const entry of roots) {
        const row = el('div', '', 'provider-token');
        row.append(el('span', `${entry.name} — ${entry.path}`));
        if (roots.length > 1) {
          const drop = el('button', 'Убрать');
          drop.type = 'button';
          drop.onclick = () => void api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind: 'droproot', path: entry.name }) }).then(() => { notice(`Папка «${entry.name}» будет убрана.`); return paint(); }).catch(failure);
          row.append(drop);
        }
        foldersBox.append(row);
      }
      const preset = el('select');
      preset.setAttribute('aria-label', 'Какую папку добавить');
      for (const [value, label] of [['desktop', 'Рабочий стол'], ['documents', 'Документы'], ['downloads', 'Загрузки'], ['custom', 'Другая папка…']]) { const option = el('option', label); option.value = value; preset.append(option); }
      const custom = el('input');
      custom.placeholder = 'Полный путь, например C:\\Projects';
      custom.maxLength = 300;
      custom.hidden = true;
      custom.setAttribute('aria-label', 'Путь к папке');
      preset.onchange = () => { custom.hidden = preset.value !== 'custom'; };
      const addFolder = el('button', 'Добавить папку');
      addFolder.type = 'button';
      addFolder.onclick = () => void api('/api/agent/jobs', { method: 'POST', body: JSON.stringify({ kind: 'addroot', path: preset.value === 'custom' ? custom.value : preset.value }) }).then(() => { notice('Подтверди ниже: «Разрешить добавить папку».'); return paint(); }).catch(failure);
      foldersBox.append(preset, custom, addFolder, el('p', 'Корень диска, домашняя папка целиком, системные папки и места с ключами выдать нельзя. Новая папка добавляется после твоего «Разрешить» и без перезапуска агента.', 'muted'));
      nodes.push(foldersBox);
      if (state.connected && !autoOpened) { autoOpened = true; void browser.open(''); }
      for (const job of state.jobs.filter((item) => !ownJobs.has(item.id))) {
        const row = el('div', '', 'provider-token');
        const title = job.kind === 'addroot' ? `Добавить папку: ${job.path}` : job.kind === 'droproot' ? `Убрать папку: ${job.path}` : job.kind === 'shell' ? `Команда: ${job.path}` : job.kind === 'browser' ? `Браузер: ${job.path} ${job.args ?? ''}`.slice(0, 120) :  job.kind === 'move' ? `Переместить: ${job.path} → ${job.dest}` : job.kind === 'trash' ? `В корзину: ${job.path}` : job.kind === 'mkdir' ? `Создать папку: ${job.path}` : job.kind === 'edit' ? `Правка файла: ${job.path}` : job.kind === 'search' ? `Поиск «${job.query}» в ${job.path || '.'}` : `${job.kind} ${job.path || '.'}`;
        row.append(el('strong', title), el('small', STATUS[job.status] ?? job.status));
        if (job.error) row.append(el('p', job.error, 'muted'));
        if (job.result) {
          const out = el('textarea');
          out.readOnly = true;
          out.rows = 6;
          out.value = stripAnsi(job.result);
          row.append(out);
        } else if (job.kind === 'run' && job.status === 'done' && !job.error) {
          row.append(el('p', 'Пустой вывод: команда выполнена и ничего не напечатала.', 'muted'));
        }
        if (job.status === 'awaiting_approval') {
          const ok = el('button', job.kind === 'run' ? `Разрешить запуск: ${job.path}` : job.kind === 'addroot' ? `Разрешить добавить папку: ${job.path}` : job.kind === 'browser' ? `Разрешить в браузере: ${job.path} ${job.args ?? ''}`.slice(0, 100) : job.kind === 'shell' ? `Разрешить команду: ${job.path.slice(0, 80)}` : job.kind === 'move' ? `Разрешить перенос: ${job.path} → ${job.dest}` : job.kind === 'trash' ? `Разрешить убрать в корзину: ${job.path}` : job.kind === 'mkdir' ? `Разрешить создать папку: ${job.path}` : job.kind === 'edit' ? `Разрешить правку: ${job.path}` : `Разрешить запись (${job.bytes ?? 0} симв.)`);
          ok.type = 'button';
          ok.onclick = () => void api(`/api/agent/jobs/${job.id}/approve`, { method: 'POST', body: '{}' }).then(paint).catch(failure);
          const no = el('button', 'Отклонить');
          no.type = 'button';
          no.onclick = () => void api(`/api/agent/jobs/${job.id}/reject`, { method: 'POST', body: '{}' }).then(paint).catch(failure);
          row.append(ok, no);
        }
        nodes.push(row);
      }
      const refresh = el('button', 'Обновить');
      refresh.type = 'button';
      refresh.onclick = () => void paint();
      nodes.push(refresh);
    }
    body.replaceChildren(...nodes);
  };
  void paint();
  const timer = setInterval(() => {
    if (!root.isConnected) { clearInterval(timer); return; }
    if (!known?.enabled || document.hidden) return;
    void api('/api/agent/status')
      .then((next: { enabled: boolean; connected: boolean; roots?: AgentRootView[] }) => (next.enabled !== known?.enabled || next.connected !== known?.connected || JSON.stringify(next.roots ?? []) !== known?.roots ? paint() : undefined))
      .catch(() => undefined);
  }, 3000);
  return root;
}
