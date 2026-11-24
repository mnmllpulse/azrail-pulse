export type Decision = 'approved' | 'rejected';

/** Кнопки «Разрешить / Отклонить» для одного запроса. Пока решение уходит, обе заблокированы; при ошибке разблокируются. */
export function decisionRow(send: (decision: Decision) => Promise<void>, onError: (error: unknown) => void, doc: Document = document): HTMLElement {
  const row = doc.createElement('div');
  row.className = 'approval-actions';
  const make = (label: string, decision: Decision, primary: boolean) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (primary) button.dataset.primary = 'true';
    button.onclick = async () => {
      for (const each of row.querySelectorAll('button')) each.disabled = true;
      try {
        await send(decision);
      } catch (error) {
        for (const each of row.querySelectorAll('button')) each.disabled = false;
        onError(error);
      }
    };
    return button;
  };
  row.append(make('Разрешить', 'approved', true), make('Отклонить', 'rejected', false));
  return row;
}
