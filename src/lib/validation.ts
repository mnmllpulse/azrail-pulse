import type { z } from "zod";
import { AccessError } from "./accounts";

export type ValidationIssue = { path: string; message: string };

/** 400 with a stable machine-readable shape: { error, code: "invalid_input", issues }. */
export class ValidationError extends AccessError {
  readonly code = "invalid_input";
  constructor(message: string, readonly issues: ValidationIssue[]) { super(message, 400); }
}

/** Parse untrusted input with a shared Zod schema; throws ValidationError (400). */
export function parseInput<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
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

/** JSON error body for any error; ValidationError adds code + issues. */
export function errorPayload(error: unknown, fallback: string): Record<string, unknown> {
  if (error instanceof ValidationError) return { error: error.message, code: error.code, issues: error.issues };
  return { error: error instanceof Error ? error.message : fallback };
}
