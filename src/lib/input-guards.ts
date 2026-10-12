import { AccessError } from "./accounts";

/**
 * Allowlist check for studio config enums. Non-strings become "" unless
 * coerce=true (then String(value)); the value is trimmed. Throws 400 with `message`.
 */
export function oneOf<T extends readonly string[]>(value: unknown, allowed: T, message: string, coerce = false): T[number] {
  const v = typeof value === "string" ? value.trim() : coerce ? String(value ?? "").trim() : "";
  if (!(allowed as readonly string[]).includes(v)) throw new AccessError(message, 400);
  return v as T[number];
}
