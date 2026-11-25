#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve, sep, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const MAX_READ = 200_000;
const RUN_TIMEOUT_MS = 120_000;
const RUN_MAX_OUTPUT = 200_000;

/** Белый список: идентификатор → программа и фиксированные аргументы. Ввода пользователя в аргументах нет. */
export const COMMANDS = {
  git_status: ["git", "status", "--short"],
  git_diff: ["git", "diff", "--stat"],
  git_log: ["git", "log", "--oneline", "-n", "20"],
  node_version: ["node", "--version"],
  npm_test: ["npm", "test"],
  npm_build: ["npm", "run", "build"],
  npm_lint: ["npm", "run", "lint"],
  npm_typecheck: ["npm", "run", "typecheck"],
};

/** Дочерний процесс не видит ключ агента и другие AZRAIL_*. */
export function childEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !/^AZRAIL_/i.test(key)));
}

const ANSI = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\))/g;

/** Цветовые коды терминала в выводе команды превращаются в мусор: убираем их. */
export function stripAnsi(text) {
  return text.replace(ANSI, "");
}

export function runCommand(root, id) {
  const argv = Object.hasOwn(COMMANDS, id) ? COMMANDS[id] : null;
  if (!argv) return Promise.reject(new Error("Команда не из белого списка."));
  const windows = process.platform === "win32";
  return new Promise((done, fail) => {
    execFile(argv[0], argv.slice(1), { cwd: root, env: { ...childEnv(process.env), NO_COLOR: "1", FORCE_COLOR: "0" }, timeout: RUN_TIMEOUT_MS, maxBuffer: RUN_MAX_OUTPUT * 2, windowsHide: true, shell: windows && argv[0] === "npm", encoding: "utf8" }, (error, stdout, stderr) => {
      const text = stripAnsi(`${stdout ?? ""}${stderr ? `\n${stderr}` : ""}`).trim().slice(-RUN_MAX_OUTPUT);
      if (error?.killed) return fail(new Error(`Команда остановлена по таймауту ${RUN_TIMEOUT_MS / 1000} с.\n${text}`.slice(0, 1000)));
      if (error && typeof error.code === "string") return fail(new Error(`Не запустилась: ${error.code}`));
      const code = error ? error.code : 0;
      done({ ok: code === 0, output: `${text}\n[код выхода ${code}]`.trim() });
    });
  });
}

const WEB_TIMEOUT_MS = 45_000;
const WEB_TEXT_LIMIT = 20_000;
const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^(22[4-9]|2[3-5]\d)\./];

/** Те же правила, что на сервере: только публичные http(s), без логина в адресе, портов, внутренних имён и частных IP. */
export function isPublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.includes(":") || host.startsWith("[")) return false;
  if (host === "localhost" || /\.(local|localhost|internal|lan|home|corp)$/.test(host) || !host.includes(".")) return false;
  if (/^[\d.]+$/.test(host) && PRIVATE_V4.some((re) => re.test(host))) return false;
  return true;
}

/** Профиль браузера лежит отдельно от основного Chrome: вход в сайты делается один раз и остаётся в этой папке. */
export function browserProfileDir(env) {
  return env.AZRAIL_BROWSER_PROFILE || join(homedir(), ".azrail-browser");
}

/** Читает страницу в браузере компьютера под сохранёнными входами. Только чтение: кликов и ввода нет. */
export async function readWeb(url, env = process.env, loader = () => import("playwright")) {
  if (!isPublicUrl(url)) throw new Error("Адрес не публичный.");
  let playwright;
  try { playwright = await loader(); } catch { throw new Error("Не найден playwright. В папке проекта выполни: npm install"); }
  const channel = env.AZRAIL_BROWSER_CHANNEL || "chrome";
  const context = await playwright.chromium.launchPersistentContext(browserProfileDir(env), { channel, headless: env.AZRAIL_BROWSER_HEADED !== "1", chromiumSandbox: true, viewport: { width: 1280, height: 800 } }).catch((error) => {
    throw new Error(`Браузер не запустился: ${String(error?.message ?? error).split("\n")[0].slice(0, 200)}. Закрой окна браузера агента или поставь Google Chrome.`);
  });
  try {
    await context.route("**/*", (route) => (isPublicUrl(route.request().url()) ? route.continue() : route.abort()));
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: WEB_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
    if (!isPublicUrl(page.url())) throw new Error("Страница перенаправила на внутренний адрес.");
    const title = (await page.title()).slice(0, 200);
    const full = String(await page.evaluate(() => (document.body ? document.body.innerText : ""))).replace(/\n{3,}/g, "\n\n").trim();
    const cut = full.length > WEB_TEXT_LIMIT ? `${full.slice(0, WEB_TEXT_LIMIT)}\n[текст обрезан]` : full;
    return `Адрес: ${page.url()}\nЗаголовок: ${title || "нет"}\n\n${cut}`;
  } finally {
    await context.close().catch(() => undefined);
  }
}
const MAX_LIST = 500;
const DENIED = /(^|\/)(\.git|\.ssh|\.gnupg|\.aws|node_modules|\.wrangler)(\/|$)|(^|\/)(\.env[^/]*|\.dev\.vars|id_rsa[^/]*|id_ed25519[^/]*|[^/]*\.(pem|key|pfx|p12|kdbx))$/i;

export function isDenied(relative) {
  return DENIED.test(relative.replaceAll("\\", "/"));
}

/** Абсолютный путь строго внутри корня. Симлинки, выходящие наружу, отклоняются. */
export async function resolveInside(root, relative) {
  const base = await realpath(root);
  const clean = relative.replaceAll("\\", "/");
  if (clean.startsWith("/") || /^[a-z]:/i.test(clean) || clean.split("/").includes("..")) throw new Error("Путь вне папки.");
  if (isDenied(clean)) throw new Error("Путь закрыт для агента.");
  const target = resolve(base, clean);
  if (target !== base && !target.startsWith(base + sep)) throw new Error("Путь вне папки.");
  let probe = target;
  for (;;) {
    try {
      const real = await realpath(probe);
      if (real !== base && !real.startsWith(base + sep)) throw new Error("Симлинк выводит за пределы папки.");
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return target;
}

export async function runJob(root, job) {
  if (job.kind === "list") {
    const dir = job.path ? await resolveInside(root, job.path) : await realpath(root);
    const entries = await readdir(dir, { withFileTypes: true });
    const names = entries
      .filter((entry) => !isDenied(`${job.path ? job.path + "/" : ""}${entry.name}`))
      .slice(0, MAX_LIST)
      .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
    return names.join("\n");
  }
  if (job.kind === "read") {
    const file = await resolveInside(root, job.path);
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Это не файл.");
    if (info.size > MAX_READ) throw new Error(`Файл больше ${MAX_READ} байт.`);
    return await readFile(file, "utf8");
  }
  if (job.kind === "write") {
    if (typeof job.content !== "string") throw new Error("Нет содержимого.");
    const file = await resolveInside(root, job.path);
    await mkdir(dirname(file), { recursive: true });
    const temp = join(dirname(file), `.azrail-${process.pid}-${Date.now()}.tmp`);
    await writeFile(temp, job.content, "utf8");
    await rename(temp, file);
    return `Записано ${job.content.length} символов в ${job.path}`;
  }
  throw new Error(`Неизвестное действие: ${job.kind}`);
}

/** AZRAIL_ROOTS — список папок через ; иначе AZRAIL_ROOT или текущая. Имя — последнее звено пути, повтор получает -2, -3. */
export async function resolveRoots(env, cwd) {
  const raw = env.AZRAIL_ROOTS ? env.AZRAIL_ROOTS.split(/;|\n/) : [env.AZRAIL_ROOT || cwd];
  const roots = [];
  const used = new Set();
  for (const item of raw.map((value) => value.trim()).filter(Boolean).slice(0, 8)) {
    const real = await realpath(item);
    if (roots.some((entry) => entry.path === real)) continue;
    const base = (basename(real) || "диск").slice(0, 36);
    let name = base;
    for (let n = 2; used.has(name); n += 1) name = `${base}-${n}`;
    used.add(name);
    roots.push({ name, path: real });
  }
  if (!roots.length) throw new Error("Не указана ни одна папка.");
  return roots;
}

/** Папка для задачи: по имени, без имени — первая. Неизвестное имя — ошибка, а не молчаливая подмена. */
export function pickRoot(roots, name) {
  if (!name) return roots[0];
  const found = roots.find((entry) => entry.name === name);
  if (!found) throw new Error(`У агента нет папки «${name}». Перезапусти его с нужным списком.`);
  return found;
}

/** Один раз открывает окно браузера агента: войди в нужные сайты, закрой окно, входы сохранятся в профиле. */
export async function browserLogin(env = process.env, loader = () => import("playwright")) {
  const playwright = await loader();
  const dir = browserProfileDir(env);
  const context = await playwright.chromium.launchPersistentContext(dir, { channel: env.AZRAIL_BROWSER_CHANNEL || "chrome", headless: false, chromiumSandbox: true, viewport: null });
  console.log(`Окно открыто. Войди в нужные сайты и закрой окно. Профиль: ${dir}`);
  await new Promise((done) => context.on("close", done));
}

async function main() {
  if (process.argv.includes("--browser-login")) {
    await browserLogin();
    return;
  }
  const url = process.env.AZRAIL_URL?.replace(/\/$/, "");
  const token = process.env.AZRAIL_AGENT_TOKEN;
  if (!url || !token) {
    console.error("Нужны AZRAIL_URL и AZRAIL_AGENT_TOKEN.");
    process.exit(2);
  }
  const roots = await resolveRoots(process.env, process.cwd());
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Agent-Root": encodeURIComponent(roots[0].path), "X-Agent-Roots": encodeURIComponent(JSON.stringify(roots)) };
  console.log(`AZRAIL agent: ${roots.length === 1 ? "папка" : "папки"} ${roots.map((entry) => `${entry.name} = ${entry.path}`).join("; ")}. Остановка: Ctrl+C.`);
  let hotUntil = 0;
  for (;;) {
    try {
      const res = await fetch(`${url}/api/agent/poll`, { headers });
      if (res.status === 401) {
        console.log("Сессия агента закончилась. Включи агента в AZRAIL заново.");
        process.exit(0);
      }
      const { job } = res.ok ? await res.json() : { job: null };
      if (job) {
        let body;
        try {
          if (job.kind === "web") body = { ok: true, output: await readWeb(job.path) };
          else {
            const root = pickRoot(roots, job.root).path;
            body = job.kind === "run" ? await runCommand(root, job.path) : { ok: true, output: await runJob(root, job) };
          }
        } catch (error) {
          body = { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        console.log(`${job.root ? `[${job.root}] ` : ""}${job.kind} ${job.path || "."} → ${body.ok ? "ok" : body.error}`);
        await fetch(`${url}/api/agent/jobs/${job.id}/result`, { method: "POST", headers, body: JSON.stringify(body) });
        hotUntil = Date.now() + 30_000;
        continue;
      }
    } catch (error) {
      console.error(`Нет связи: ${error instanceof Error ? error.message : error}`);
    }
    await new Promise((done) => setTimeout(done, Date.now() < hotUntil ? 700 : 3000));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
