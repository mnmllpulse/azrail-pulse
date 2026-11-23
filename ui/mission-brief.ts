const LABELS: Record<string, string> = {
  queued: 'В очереди', executing: 'В работе', waiting_approval: 'Ждёт разрешения', paused: 'На паузе', pausing: 'Ставится на паузу',
  completed: 'Готово', unverified: 'Готово, не проверено', failed: 'Ошибка', cancelled: 'Остановлена', cancelling: 'Останавливается', terminated: 'Остановлена',
};

export const missionStatusLabel = (status: string): string => LABELS[status] ?? status;

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

/** Одна строка сводки для верха пульта: что идёт, чего ждёт, что упало. */
export function missionBrief(items: Array<{ status: string }>): string {
  if (!items.length) return 'Миссий пока нет.';
  const count = (...statuses: string[]) => items.filter((item) => statuses.includes(item.status)).length;
  const running = count('queued', 'executing', 'pausing', 'cancelling');
  const waiting = count('waiting_approval');
  const paused = count('paused');
  const failed = count('failed');
  const parts: string[] = [];
  if (waiting) parts.push(`${waiting} ${plural(waiting, 'ждёт', 'ждут', 'ждут')} твоего разрешения`);
  if (running) parts.push(`${running} ${plural(running, 'миссия идёт', 'миссии идут', 'миссий идут')}`);
  if (paused) parts.push(`${paused} на паузе`);
  if (failed) parts.push(`${failed} с ошибкой`);
  return parts.length ? parts.join(' · ') : 'Всё спокойно: активных миссий нет.';
}
