// AZRAIL — безопасная сборка путей внешних API.
//
// ═══════════════════════════════════════════════════════════════════════
// ЗАЧЕМ ЭТОТ МОДУЛЬ СУЩЕСТВУЕТ
//
// Тело запроса приходит по HTTP как JSON и приводится к типу простым
// `await request.json()`. Типы TypeScript при этом СТИРАЮТСЯ: поле,
// объявленное как `runId: number`, в рантайме может оказаться строкой,
// массивом, чем угодно.
//
// А дальше такое значение подставлялось прямо в путь запроса к GitHub.
// Проверено: конструктор URL нормализует `..`, поэтому
//
//   /repos/owner/name/actions/runs/1/../../../../user/repos/jobs
//
// превращается в /user/repos/jobs — то есть запрос уходит на СОВСЕМ
// ДРУГОЙ эндпоинт, и уходит с токеном GitHub из секретов воркера.
//
// Поэтому любое значение, попадающее в путь, проходит здесь. Точечные
// проверки в каждом месте вызова не годятся: их забывают ровно там, где
// добавляют новый эндпоинт.
// ═══════════════════════════════════════════════════════════════════════

export class UnsafePathError extends Error {
  constructor(what: string, value: unknown) {
    super(`Небезопасное значение для "${what}": ${JSON.stringify(value)?.slice(0, 120)}`);
    this.name = "UnsafePathError";
  }
}

/** Репозиторий в форме owner/name. Ничего кроме букв, цифр, точки, дефиса. */
export function assertRepo(repo: unknown, what = "repo"): string {
  if (typeof repo !== "string" || !/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(repo)) {
    throw new UnsafePathError(what, repo);
  }
  // Отдельно: точки разрешены в именах репозиториев, но ".." — никогда.
  if (repo.split("/").some((part) => part === "." || part === "..")) {
    throw new UnsafePathError(what, repo);
  }
  return repo;
}

/**
 * Одиночный сегмент пути: идентификатор прогона, номер, имя без слешей.
 *
 * Слеш здесь запрещён намеренно — сегмент на то и одиночный. Значение
 * кодируется, поэтому даже разрешённые спецсимволы не разъедут путь.
 */
export function pathSegment(value: unknown, what: string): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw new UnsafePathError(what, value);
    return String(value);
  }
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new UnsafePathError(what, value);
  }
  if (value.includes("/") || value === "." || value === "..") {
    throw new UnsafePathError(what, value);
  }
  return encodeURIComponent(value);
}

/**
 * Составной путь: имя ветки (feature/x) или путь файла (src/app.ts).
 *
 * Слеши разрешены, потому что они часть значения. Кодируется КАЖДЫЙ
 * сегмент по отдельности — иначе encodeURIComponent превратил бы слеши в
 * %2F и сломал бы нормальные пути.
 */
export function pathSegments(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) {
    throw new UnsafePathError(what, value);
  }
  const parts = value.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) throw new UnsafePathError(what, value);
  for (const p of parts) {
    // Именно здесь ловится обход: ни один сегмент не может быть ".." —
    // и неважно, сколько их и где они стоят.
    if (p === "." || p === "..") throw new UnsafePathError(what, value);
  }
  return parts.map((p) => encodeURIComponent(p)).join("/");
}

/** Разбирает "owner/name" в пару, проверив её целиком. */
export function splitRepo(value: unknown, what = "repo"): { owner: string; repo: string } {
  const safe = assertRepo(value, what);
  const [owner, repo] = safe.split("/");
  return { owner, repo };
}
