import { AccessError } from "./accounts";
import { checkPublicUrl, PublicUrlError } from "./public-url";
import { safeAgentPath } from "./local-agent";

/** Действия в браузере компьютера. Смотреть можно сразу; всё, что нажимает, вводит или грузит файл, ждёт «Разрешить». */
export const BROWSER_READ_ACTIONS: ReadonlySet<string> = new Set(["open", "snapshot", "screenshot", "scroll", "close"]);
export const BROWSER_WRITE_ACTIONS: ReadonlySet<string> = new Set(["click", "type", "press", "upload"]);
export const BROWSER_KEYS: ReadonlySet<string> = new Set(["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Backspace"]);
export const BROWSER_TEXT_MAX = 2000;

export function isBrowserAction(action: unknown): action is string {
  return typeof action === "string" && (BROWSER_READ_ACTIONS.has(action) || BROWSER_WRITE_ACTIONS.has(action));
}

const ref = (value: unknown): number => {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 9999) throw new AccessError("Укажи номер элемента из последнего snapshot (ref).", 400);
  return n;
};

/** Проверяет и приводит аргументы действия к одному виду. Возвращает JSON для хранения в задаче. */
export function normalizeBrowserArgs(action: string, raw: unknown): string {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  switch (action) {
    case "open": {
      try {
        return JSON.stringify({ url: checkPublicUrl(typeof input.url === "string" ? input.url.trim() : "").href });
      } catch (error) {
        throw new AccessError(error instanceof PublicUrlError ? error.message : "Адрес страницы не распознан.", 400);
      }
    }
    case "click":
      return JSON.stringify({ ref: ref(input.ref) });
    case "type": {
      if (typeof input.text !== "string" || input.text.length > BROWSER_TEXT_MAX) throw new AccessError(`Текст должен быть строкой до ${BROWSER_TEXT_MAX} символов.`, 400);
      return JSON.stringify({ ref: ref(input.ref), text: input.text, submit: input.submit === true });
    }
    case "press": {
      if (typeof input.key !== "string" || !BROWSER_KEYS.has(input.key)) throw new AccessError(`Клавиша из списка: ${[...BROWSER_KEYS].join(", ")}.`, 400);
      return JSON.stringify({ key: input.key });
    }
    case "scroll": {
      const dy = typeof input.dy === "number" ? Math.round(input.dy) : 600;
      return JSON.stringify({ dy: Math.max(-3000, Math.min(3000, dy)) });
    }
    case "upload":
      return JSON.stringify({ ref: ref(input.ref), file: safeAgentPath(input.file) });
    case "screenshot":
    case "snapshot":
    case "close":
      return "{}";
    default:
      throw new AccessError("Неизвестное действие браузера.", 400);
  }
}
