import { readBoundedBody } from "../lib/request-body";

const GITHUB_API = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_ERROR_BYTES = 16 * 1024;

export interface GitHubRequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * One hardened GitHub REST transport for all runtime agents.
 * - rejects redirects so credentials are never forwarded to another host;
 * - applies a finite timeout to prevent a Durable Object from hanging forever;
 * - keeps authentication/header behavior identical across agents.
 */
export async function githubRequest(token: string, path: string, init: GitHubRequestOptions = {}): Promise<Response> {
  if (!token) throw new Error("GITHUB_TOKEN не настроен.");
  if (!path.startsWith("/repos/")) throw new Error("GitHub API path должен начинаться с /repos/.");

  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestInit } = init;
  return fetch(`${GITHUB_API}${path}`, {
    ...requestInit,
    redirect: "error",
    signal: requestInit.signal ?? AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "azrail-pulse",
      "Content-Type": "application/json",
      ...(requestInit.headers ?? {}),
    },
  });
}

/** Read an API error without allowing an unbounded response body into memory. */
export async function readGithubError(response: Response, limit = MAX_ERROR_BYTES): Promise<string> {
  try {
    const bytes = await readBoundedBody(response, limit);
    const text = new TextDecoder().decode(bytes).trim();
    if (!text) return "";
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      return typeof parsed.message === "string" ? parsed.message : text.slice(0, 500);
    } catch {
      return text.slice(0, 500);
    }
  } catch (error) {
    return error instanceof Error ? error.message.slice(0, 500) : "Не удалось прочитать ответ GitHub.";
  }
}
