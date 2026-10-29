import type { z } from "zod";
import { AccessError } from "./accounts";

export type ValidationIssue = { path: string; message: string };

/** 400 with a stable machine-readable shape: { error, code: "invalid_input", error_id, issues }. */
export class ValidationError extends AccessError {
  readonly code = "invalid_input";
  constructor(message: string, readonly issues: ValidationIssue[]) { super(message, 400); }
}

/** Parse untrusted input with a shared Zod schema; throws ValidationError (400). */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.slice(0, 20).map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  const first = issues[0];
  throw new ValidationError(first ? (first.path ? `${first.path}: ${first.message}` : first.message) : "Некорректные данные запроса.", issues);
}

/** URLSearchParams → plain object (first value wins) for query schemas. */
export function queryObject(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of url.searchParams) if (!(key in out)) out[key] = value;
  return out;
}

function errorCode(error: unknown) {
  if (error instanceof ValidationError) return error.code;
  if (error instanceof AccessError) {
    if (error.status === 401) return "unauthenticated";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not_found";
    if (error.status === 409) return "conflict";
    if (error.status === 413) return "too_large";
    if (error.status === 429) return "rate_limited";
    if (error.status === 503) return "unavailable";
    return "request_failed";
  }
  return "unavailable";
}

/** JSON error body. `error` stays for the current UI. `code` and `error_id` are the envelope. */
export function errorPayload(error: unknown, fallback: string): Record<string, unknown> {
  const error_id = crypto.randomUUID();
  if (error instanceof ValidationError) return { error: error.message, code: error.code, error_id, issues: error.issues };
  return { error: error instanceof Error ? error.message : fallback, code: errorCode(error), error_id };
}
