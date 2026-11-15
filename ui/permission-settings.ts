type Api = (path: string, init?: RequestInit) => Promise<any>;

export const MODE_LABELS: Record<string, { title: string; hint: string }> = {
  trusted: { title: 'Доверять рабочей папке', hint: 'Безопасные изменения в рабочей папке и песочнице идут без вопроса. Чувствительные и критические действия всегда ждут твоего подтверждения.' },
  ask: { title: 'Спрашивать всё', hint: 'Любое действие, которое что-то меняет, ждёт твоего подтверждения. Чтение идёт без вопросов.' },
};

export function permissionSettings(api: Api, notice: (text: string, bad?: boolean) => void, failure: (error: unknown) => void): HTMLElement {
  const root = document.createElement('section');
  root.className = 'settings-block';
  const title = document.createElement('h3');
  title.textContent = 'Разрешения агентов';
  const hint = document.createElement('p');
  hint.className = 'muted';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Режим разрешений');
  select.disabled = true;
  for (const [value, label] of Object.entries(MODE_LABELS)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label.title;
    select.append(option);
  }
  const paint = () => { hint.textContent = MODE_LABELS[select.value]?.hint ?? ''; };
  select.addEventListener('change', () => {
    paint();
    select.disabled = true;
    void api('/api/admin/permission-mode', { method: 'POST', body: JSON.stringify({ mode: select.value }) })
      .then((r: { mode: string }) => { select.value = r.mode; paint(); notice(`Режим: ${MODE_LABELS[r.mode]?.title ?? r.mode}.`); })
      .catch(failure)
      .finally(() => { select.disabled = false; });
  });
  root.append(title, select, hint);
  void api('/api/permission-mode')
    .then((r: { mode: string }) => { select.value = r.mode in MODE_LABELS ? r.mode : 'trusted'; select.disabled = false; paint(); })
    .catch(() => { hint.textContent = 'Режим сейчас не прочитался.'; });
  return root;
}
