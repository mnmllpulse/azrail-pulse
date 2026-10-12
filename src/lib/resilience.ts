// AZRAIL — ретраи и логирование.
//
// Зачем ретраи: вызов модели или внешнего API падает по временным причинам
// (перегрузка, таймаут, 5xx). Без ретрая одна такая осечка выглядит как
// «система сломалась», хотя повтор через секунду прошёл бы.
//
// Зачем логи: в Worker'е нет отладчика. Единственный способ понять, что
// произошло в проде — `wrangler tail` или логи в дашборде Cloudflare.
// Без структуры там будет каша из безымянных строк.

export interface RetryOptions {
  /** Сколько попыток ВСЕГО, включая первую. По умолчанию 3 */
  attempts?: number;
  /** Базовая задержка в мс, удваивается с каждой попыткой */
  baseDelayMs?: number;
  /** Потолок на ОДНУ попытку, мс. По умолчанию 60 000.
   *  Без него зависший вызов не падает никогда: ретраи лечат упавшее,
   *  но не отменяют повисшее — оно съедает лимит запроса целиком. */
  timeoutMs?: number;
  /**
   * Переопределяет решение о повторе.
   *
   * Нужно потому, что вызывающий иногда знает про ошибку больше, чем
   * распознаватель по тексту. Пример из этого проекта: маршрутизатор
   * умеет отличать исчерпанную квоту и переходить на ДРУГУЮ модель, но
   * `isRetriable` видит в 429 обычную временную ошибку и успевает
   * повторить ТУ ЖЕ модель с задержкой — то есть слой ретраев отменял
   * защиту, построенную уровнем выше.
   */
  retryable?: (err: unknown) => boolean;
  /** Что за операция — попадёт в лог */
  label: string;
  /** Кооперативная отмена. Останавливает ожидание и не допускает новый retry. */
  signal?: AbortSignal;
}

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`Операция "${label}" не уложилась в ${ms} мс (timeout)`);
    this.name = "TimeoutError";
  }
}

export class OperationAbortedError extends Error {
  constructor(label: string, reason?: unknown) {
    super(`Операция "${label}" отменена${reason instanceof Error && reason.message ? `: ${reason.message}` : ""}`);
    this.name = "OperationAbortedError";
  }
}

function throwIfAborted(signal: AbortSignal | undefined, label: string): void {
  if (signal?.aborted) throw new OperationAbortedError(label, signal.reason);
}

/** Ограничивает время ОДНОЙ попытки. Важно: подлежащий промис нельзя
 *  по-настоящему прервать — мы лишь перестаём его ждать. Для fetch это
 *  нормально (соединение закроется), для env.AI.run — вызов может ещё
 *  доработать в фоне, но запрос уже не блокирует. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  throwIfAborted(signal, label);
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  const cancelled = signal ? new Promise<never>((_, reject) => {
    abort = () => reject(new OperationAbortedError(label, signal.reason));
    signal.addEventListener("abort", abort, { once: true });
  }) : null;
  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);
    if (signal && abort) signal.removeEventListener("abort", abort);
  };
  return Promise.race(cancelled ? [promise, timeout, cancelled] : [promise, timeout]).finally(cleanup);
}

/** Ретраить имеет смысл только временные сбои. 400/401/404 повторять
 *  бессмысленно — ответ не изменится, а время и деньги потратятся. */
export function isRetriable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);

  // Таймаут — временный по определению
  if (err instanceof TimeoutError) return true;

  // Явно постоянные ошибки — не ретраим
  if (/\b(400|401|403|404|409|422)\b/.test(msg)) return false;
  if (/не найден|invalid|неверный|malformed/i.test(msg)) return false;

  // Временные — ретраим
  if (/\b(408|429|500|502|503|504)\b/.test(msg)) return true;
  if (/timeout|timed out|network|fetch failed|ECONNRESET|overload/i.test(msg)) return true;

  // Неизвестное — ретраим один раз: цена ошибки в эту сторону ниже.
  return true;
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelay = options.baseDelayMs ?? 400;
  const timeoutMs = options.timeoutMs ?? 60_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    throwIfAborted(options.signal, options.label);
    try {
      const result = await withTimeout(fn(attempt), timeoutMs, options.label, options.signal);
      if (attempt > 1) {
        log("info", "retry.succeeded", { label: options.label, attempt });
      }
      return result;
    } catch (err) {
      lastError = err;

      // Переопределение вызывающего имеет приоритет: он может знать про
      // ошибку то, чего не видно в её тексте.
      if (err instanceof OperationAbortedError) throw err;
      const canRetry = options.retryable ? options.retryable(err) : isRetriable(err);
      if (!canRetry) {
        log("warn", "retry.skipped", {
          label: options.label,
          attempt,
          reason: "ошибка постоянная, повтор не поможет",
          error: errText(err),
        });
        throw err;
      }
      if (attempt === attempts) break;

      // Экспоненциальная задержка + джиттер. Джиттер важен: без него
      // несколько параллельных задач повторяются синхронно и бьют
      // по уже перегруженному сервису одной волной.
      const delay = baseDelay * 2 ** (attempt - 1) + Math.random() * 200;
      log("warn", "retry.attempt", {
        label: options.label,
        attempt,
        nextInMs: Math.round(delay),
        error: errText(err),
      });
      await withTimeout(new Promise<void>((resolve) => setTimeout(resolve, delay)), Math.ceil(delay + 1000), `${options.label}:retry-delay`, options.signal);
    }
  }

  log("error", "retry.exhausted", { label: options.label, attempts, error: errText(lastError) });
  throw lastError;
}

// ─── Логи ─────────────────────────────────────────────────────────────────

type Level = "info" | "warn" | "error";

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Одна строка = один JSON-объект. Так логи можно фильтровать и грепать
 *  в `wrangler tail`, а не читать глазами простыню текста. */
export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
