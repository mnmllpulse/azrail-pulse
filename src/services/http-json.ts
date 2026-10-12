import { readBoundedBody } from "../lib/request-body";

export interface JsonFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * Fetch JSON with bounded time and memory. External registries are untrusted input:
 * a 200 response is not permission to buffer an arbitrarily large body.
 */
export async function fetchJsonBounded<T>(url: string, options: JsonFetchOptions = {}): Promise<{ response: Response; data: T | null }> {
  const { timeoutMs = 12_000, maxBytes = 2 * 1024 * 1024, ...init } = options;
  const response = await fetch(url, {
    ...init,
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return { response, data: null };

  const bytes = await readBoundedBody(response, maxBytes);
  const text = new TextDecoder().decode(bytes);
  return { response, data: JSON.parse(text) as T };
}

/** Deterministic bounded-concurrency mapper to avoid burst fan-out. */
export async function mapConcurrent<T, R>(items: readonly T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
