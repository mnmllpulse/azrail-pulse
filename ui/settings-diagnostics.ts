export type HealthService = { name: string; status: 'ok' | 'error' | 'absent'; ms: number | null; error: string | null };
export type Health = {
  version?: string;
  status?: 'healthy' | 'degraded';
  services?: HealthService[];
  bindings?: Record<string, string>;
  agents?: number;
  timestamp?: string;
};

const STATUS_TEXT: Record<HealthService['status'], string> = { ok: 'Работает', error: 'Ошибка', absent: 'Не подключён' };
const SERVICE_NAMES: Record<string, string> = { d1: 'База данных D1', kv: 'Хранилище KV', r2: 'Файловое хранилище R2' };
const BINDING_NAMES: Record<string, string> = { ai: 'Workers AI', vectorize: 'Vectorize', queue: 'Очередь' };

export type DiagnosticRow = { label: string; value: string; level: 'ok' | 'error' | 'muted' };

/** Строки диагностики: только то, что реально вернул сервер. Привязка без пробы помечается как непроверенная. */
export function diagnosticRows(health: Health): DiagnosticRow[] {
  const rows: DiagnosticRow[] = [];
  if (health.version) rows.push({ label: 'Версия сборки', value: health.version, level: 'muted' });
  if (health.status) rows.push({ label: 'Общее состояние', value: health.status === 'healthy' ? 'Исправно' : 'Деградация', level: health.status === 'healthy' ? 'ok' : 'error' });
  for (const service of health.services ?? []) {
    const detail = service.status === 'ok' && service.ms !== null ? ` · ${service.ms} мс` : service.error ? ` · ${service.error}` : '';
    rows.push({ label: SERVICE_NAMES[service.name] ?? service.name, value: STATUS_TEXT[service.status] + detail, level: service.status === 'ok' ? 'ok' : service.status === 'error' ? 'error' : 'muted' });
  }
  for (const [name, state] of Object.entries(health.bindings ?? {})) {
    rows.push({ label: BINDING_NAMES[name] ?? name, value: state === 'bound' ? 'Привязан (работоспособность не проверялась)' : 'Не подключён', level: 'muted' });
  }
  if (typeof health.agents === 'number') rows.push({ label: 'Агентов в реестре', value: String(health.agents), level: 'muted' });
  return rows;
}

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export type DiagnosticsDeps = { loadHealth: () => Promise<Health>; failure: (error: unknown) => void };

export function renderDiagnostics(host: HTMLElement, deps: DiagnosticsDeps): void {
  const card = node('section', '', 'settings-info-card');
  const body = node('div', '', 'settings-diagnostics');
  const run = node('button', 'Проверить систему');
  run.type = 'button';
  card.append(node('h3', 'Диагностика'), body, run);
  host.append(card);

  const paint = async () => {
    body.replaceChildren(node('p', 'Проверяю сервисы…', 'muted'));
    try {
      const health = await deps.loadHealth();
      body.replaceChildren();
      const rows = diagnosticRows(health);
      if (!rows.length) { body.append(node('p', 'Сервер не вернул данных о состоянии.', 'context-note')); return; }
      for (const row of rows) {
        const line = node('div', '', 'settings-info-row');
        line.append(node('span', row.label), node('strong', row.value, `settings-diag-${row.level}`));
        body.append(line);
      }
      if (health.timestamp) body.append(node('p', `Проверено: ${new Date(health.timestamp).toLocaleString('ru-RU')}`, 'muted'));
    } catch (error) {
      body.replaceChildren(node('p', error instanceof Error ? error.message : 'Состояние системы получить не удалось.', 'context-note'));
      deps.failure(error);
    }
  };
  run.onclick = () => { run.disabled = true; void paint().finally(() => { run.disabled = false; }); };
  void paint();
}
