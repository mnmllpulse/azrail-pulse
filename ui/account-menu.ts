export type AccountMenuDeps = { wrap: HTMLElement; button: HTMLButtonElement; menu: HTMLElement };

export function createAccountMenu({ wrap, button, menu }: AccountMenuDeps) {
  const doc = wrap.ownerDocument;
  const isOpen = () => !menu.hidden;
  const onPointer = (e: Event) => { if (!wrap.contains(e.target as Node)) close(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen()) { close(); button.focus(); } };
  function open() {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    doc.addEventListener('pointerdown', onPointer);
    doc.addEventListener('keydown', onKey);
    (menu.querySelector('button:not([hidden])') as HTMLElement | null)?.focus();
  }
  function close() {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('pointerdown', onPointer);
    doc.removeEventListener('keydown', onKey);
  }
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.onclick = () => (isOpen() ? close() : open());
  menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) close(); });
  return { open, close, isOpen };
}
