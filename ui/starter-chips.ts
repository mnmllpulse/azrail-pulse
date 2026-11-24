export const STARTERS: ReadonlyArray<{ label: string; text: string }> = [
  { label: 'Нарисуй картинку', text: 'Нарисуй ' },
  { label: 'Сделай страницу', text: 'Сделай страницу: ' },
  { label: 'Напиши код', text: 'Напиши код: ' },
  { label: 'Объясни простыми словами', text: 'Объясни простыми словами: ' },
];

/** Быстрые старты пустого чата: нажатие подставляет начало фразы в поле и ставит курсор в конец. Не отправляет. */
export function mountStarterChips(host: HTMLElement, input: HTMLTextAreaElement): void {
  const doc = host.ownerDocument;
  host.replaceChildren(
    ...STARTERS.map((starter) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'starter-chip';
      button.textContent = starter.label;
      button.onclick = () => {
        input.value = starter.text;
        input.dispatchEvent(new doc.defaultView!.Event('input', { bubbles: true }));
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      };
      return button;
    }),
  );
}
