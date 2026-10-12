import { makeElement } from "./dom";

export function renderPanelLoading(host: HTMLElement, message = "Загрузка…"): void {
  const note = makeElement("p", message);
  note.className = "muted";
  note.setAttribute("role", "status");
  host.replaceChildren(note);
}

export function renderPanelError(host: HTMLElement, message: string, retry?: () => void | Promise<void>): void {
  const wrap = makeElement("div");
  wrap.className = "panel-error";
  wrap.setAttribute("role", "alert");
  wrap.append(makeElement("strong", "Не удалось загрузить данные"), makeElement("p", message));
  if (retry) {
    const button = makeElement("button", "Повторить");
    button.type = "button";
    button.onclick = () => void Promise.resolve(retry());
    wrap.append(button);
  }
  host.replaceChildren(wrap);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Неизвестная ошибка.";
}
