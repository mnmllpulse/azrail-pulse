import type { Env } from "../types";
import { detectBackend } from "../core/sandbox";

const RESEARCH = /(?<![\p{L}])(?:найди|поищи|источник|что известно|свеж\p{L}*|исслед|в интернете|в сети)(?![\p{L}])/iu;
const GITHUB = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;
const SKIP_OWNER = new Set(["topics", "features", "settings", "marketplace", "orgs", "apps"]);

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function linkStatus(env: Env): string {
  let connections = "каталог пуст";
  try {
    const list = JSON.parse(env.MCP_SERVERS ?? "[]") as unknown;
    connections = Array.isArray(list) && list.length ? `подключений в каталоге: ${list.length}` : "каталог пуст";
  } catch {
    connections = "каталог не читается";
  }
  return [
    "СОСТОЯНИЕ СВЯЗЕЙ:",
    `GitHub запись: ${env.GITHUB_TOKEN ? "токен есть, сам push из фразы не запускается" : "токена нет"}`,
    `Песочница: ${detectBackend(env)}`,
    `Озвучка: ${env.ELEVENLABS_API_KEY ? "ключ есть" : "ключа нет, говорит браузер"}`,
    `Выкладка Cloudflare из чата: отдельной кнопки нет`,
    `Figma, Canva, Gmail, Google Drive: ${connections}`,
    "Расписаний для задач, управления браузером и доступа к компьютеру владельца нет.",
  ].join("\n");
}

export function sourcesFrom(wiki: unknown, duck: unknown): string {
  const lines: string[] = [];
  if (Array.isArray(wiki) && Array.isArray(wiki[1]) && Array.isArray(wiki[3])) {
    const titles = wiki[1] as unknown[];
    const urls = wiki[3] as unknown[];
    titles.forEach((title, index) => {
      if (typeof title === "string" && typeof urls[index] === "string") lines.push(`- ${title}: ${urls[index]}`);
    });
  }
  const record = duck && typeof duck === "object" ? duck as { AbstractText?: unknown; AbstractURL?: unknown; Heading?: unknown } : {};
  if (typeof record.AbstractText === "string" && record.AbstractText.trim()) {
    lines.push(`- ${typeof record.Heading === "string" && record.Heading ? record.Heading : "Заметка"}: ${clip(record.AbstractText, 500)}${typeof record.AbstractURL === "string" && record.AbstractURL ? ` ${record.AbstractURL}` : ""}`);
  }
  if (!lines.length) return "ИСТОЧНИКИ:\nПоиск не вернул источников. Ссылки не выдумывай.";
  return `ИСТОЧНИКИ:\n${lines.slice(0, 5).join("\n")}`;
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3500), headers: { "User-Agent": "azrail-pulse" } });
  if (!response.ok) return null;
  return response.json();
}

async function researchNote(message: string): Promise<string> {
  const query = clip(message, 180);
  try {
    const [wiki, duck] = await Promise.all([
      readJson(`https://ru.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json`),
      readJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`),
    ]);
    return sourcesFrom(wiki, duck);
  } catch {
    return "ИСТОЧНИКИ:\nПоиск не ответил. Ссылки не выдумывай.";
  }
}

async function githubNote(env: Env, owner: string, repo: string): Promise<string> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw",
      "User-Agent": "azrail-pulse",
    };
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, signal: AbortSignal.timeout(3500) });
    if (!response.ok) return `РЕПОЗИТОРИЙ ${owner}/${repo}:\nПубличный README не открылся. Содержимое не выдумывай.`;
    const text = await response.text();
    return `РЕПОЗИТОРИЙ ${owner}/${repo}:\n${text.slice(0, 8000)}`;
  } catch {
    return `РЕПОЗИТОРИЙ ${owner}/${repo}:\nREADME не прочитан. Содержимое не выдумывай.`;
  }
}

/** Короткий факт для модели: связи, публичный README и источники поиска. */
export async function chatSupplements(env: Env, message: string): Promise<string> {
  const parts = [linkStatus(env)];
  const repo = GITHUB.exec(message);
  if (repo && !SKIP_OWNER.has(repo[1].toLowerCase())) parts.push(await githubNote(env, repo[1], repo[2].replace(/\.git$/, "")));
  if (RESEARCH.test(message)) parts.push(await researchNote(message));
  return `\n\n${parts.join("\n\n")}`;
}
