#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, cp, lstat, mkdir, readdir, readFile, realpath, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
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

const SHELL_MAX = 1000;
export const SHELL_BLOCKED = [
  { re: /\b(sudo|su|doas|runas)\b/i, why: "повышение прав" },
  { re: /\brm\s+(-[a-z]*\s+)*-[a-z]*[rf][a-z]*\s+(--\s+)?(\/|~|\$home|\*|\.\.|[a-z]:[\\/])/i, why: "рекурсивное удаление вне проекта" },
  { re: /\b(rmdir|rd|del|erase)\b[^|&;]*\s\/[sq]\b/i, why: "массовое удаление" },
  { re: /\b(format|mkfs(\.\w+)?|diskpart|fdisk|dd)\b\s*[^|&;]*(\bof=|\/dev\/|[a-z]:)/i, why: "работа с диском" },
  { re: /\b(shutdown|reboot|halt|poweroff|init\s+0)\b/i, why: "выключение компьютера" },
  { re: /(curl|wget|iwr|invoke-webrequest|irm|invoke-restmethod)\b[^|;&]*\|\s*(sh|bash|zsh|iex|invoke-expression|powershell|pwsh|cmd)\b/i, why: "запуск скачанного кода" },
  { re: /\b(iex|invoke-expression)\b/i, why: "выполнение строки как кода" },
  { re: /\b(powershell|pwsh)\b[^|;&]*-(e|enc|encodedcommand)\b/i, why: "скрытая команда" },
  { re: /\breg(\.exe)?\s+(delete|add|import)\b/i, why: "изменение реестра" },
  { re: /\bgit\s+push\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)/i, why: "принудительная отправка в git" },
  { re: /\bchmod\s+(-[a-z]+\s+)*[0-7]*777\b|\bchown\s+-R\b/i, why: "массовая смена прав" },
  { re: /(\.env\b|\.dev\.vars|\.ssh|\.gnupg|\.aws|id_rsa|id_ed25519|\.pem\b|\.kdbx|\.azrail-agent|\.azrail-roots|\.azrail-browser)/i, why: "секреты и ключи" },
  { re: /\b(printenv|export\s+-p|get-childitem\s+env:|gci\s+env:)|(^|[|&;]\s*)(env|set)\s*($|[|&;])/i, why: "вывод переменных окружения" },
  { re: /\b(nc|ncat|netcat|telnet|ssh|scp|sftp|ftp)\b/i, why: "сетевое соединение в обход AZRAIL" },
  { re: /:\(\)\s*\{/, why: "fork-бомба" },
  { re: /[\0-\x08\x0b\x0c\x0e-\x1f]/, why: "управляющие символы" },
];

export function shellProblem(command) {
  if (typeof command !== "string") return "Команда должна быть строкой.";
  const text = command.trim();
  if (!text) return "Пустая команда.";
  if (text.length > SHELL_MAX) return `Команда длиннее ${SHELL_MAX} символов.`;
  for (const rule of SHELL_BLOCKED) if (rule.re.test(text)) return `Команда заблокирована: ${rule.why}.`;
  return null;
}

const SHELL_TIMEOUT_MS = 300_000;

/** Любая команда в папке проекта через оболочку системы. Секреты AZRAIL_* дочернему процессу не передаются. */
export function runShell(root, command, spawner = spawn) {
  const problem = shellProblem(command);
  if (problem) return Promise.reject(new Error(problem));
  return new Promise((done, fail) => {
    const child = spawner(command, { cwd: root, shell: true, env: { ...childEnv(process.env), NO_COLOR: "1", FORCE_COLOR: "0" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    let killed = false;
    const add = (chunk) => { text = (text + chunk).slice(-RUN_MAX_OUTPUT); };
    child.stdout?.on("data", (chunk) => add(String(chunk)));
    child.stderr?.on("data", (chunk) => add(String(chunk)));
    const timer = setTimeout(() => { killed = true; child.kill(); }, SHELL_TIMEOUT_MS);
    child.on("error", (error) => { clearTimeout(timer); fail(new Error(`Не запустилась: ${error.code ?? error.message}`)); });
    child.on("close", (code) => {
      clearTimeout(timer);
      const out = stripAnsi(text).trim();
      if (killed) return fail(new Error(`Команда остановлена по таймауту ${SHELL_TIMEOUT_MS / 1000} с.\n${out}`.slice(0, 1000)));
      done({ ok: code === 0, output: `${out}\n[код выхода ${code}]`.trim() });
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
  await closeBrowser();
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

const BROWSER_IDLE_MS = 300_000;
const BROWSER_KEYS = new Set(["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Backspace"]);
let browserSession = null;

/** Закрывает живой браузер агента (тесты и остановка). */
export async function closeBrowser() {
  const session = browserSession;
  browserSession = null;
  if (session) {
    clearTimeout(session.timer);
    await session.context.close().catch(() => undefined);
  }
}

async function openBrowser(env, loader) {
  if (browserSession) {
    clearTimeout(browserSession.timer);
  } else {
    let playwright;
    try { playwright = await loader(); } catch { throw new Error("Не найден playwright. В папке проекта выполни: npm install"); }
    const channel = env.AZRAIL_BROWSER_CHANNEL || "chrome";
    const context = await playwright.chromium.launchPersistentContext(browserProfileDir(env), { channel, headless: env.AZRAIL_BROWSER_HEADED !== "1", chromiumSandbox: true, acceptDownloads: false, viewport: { width: 1280, height: 800 } }).catch((error) => {
      throw new Error(`Браузер не запустился: ${String(error?.message ?? error).split("\n")[0].slice(0, 200)}. Закрой окна браузера агента или поставь Google Chrome.`);
    });
    await context.route("**/*", (route) => (isPublicUrl(route.request().url()) ? route.continue() : route.abort()));
    browserSession = { context, page: context.pages()[0] ?? (await context.newPage()), timer: null };
  }
  browserSession.timer = setTimeout(() => void closeBrowser(), BROWSER_IDLE_MS);
  browserSession.timer.unref?.();
  return browserSession.page;
}

/** Нумерует кнопки, ссылки и поля страницы. Модель ссылается на номер (ref), а не на произвольный селектор. */
async function snapshotPage(page) {
  if (page.url() === "about:blank") throw new Error("Страница не открыта. Сначала action open с адресом.");
  if (!isPublicUrl(page.url())) throw new Error("Страница на внутреннем адресе.");
  const items = await page.evaluate(() => {
    const visible = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return st.visibility !== "hidden" && st.display !== "none" && ((r.width > 0 && r.height > 0) || el.type === "file"); };
    const nodes = [...document.querySelectorAll('a[href], button, input, textarea, select, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [contenteditable="true"]')].filter(visible).slice(0, 120);
    document.querySelectorAll("[data-az-ref]").forEach((el) => el.removeAttribute("data-az-ref"));
    return nodes.map((el, i) => {
      el.setAttribute("data-az-ref", String(i + 1));
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute("type") || "";
      const label = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.getAttribute("title") || el.getAttribute("name") || el.value || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const kind = tag === "a" ? "ссылка" : tag === "button" || el.getAttribute("role") === "button" ? "кнопка" : type === "file" ? "выбор файла" : type === "password" ? "поле пароля" : tag === "select" ? "список" : "поле";
      return `[${i + 1}] ${kind} «${label}»`;
    });
  });
  const title = (await page.title()).slice(0, 200);
  const text = String(await page.evaluate(() => (document.body ? document.body.innerText : ""))).replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000);
  return `Адрес: ${page.url()}\nЗаголовок: ${title || "нет"}\n\nЭлементы:\n${items.join("\n") || "нет"}\n\nТекст страницы:\n${text}`;
}

/** Действие в живом браузере агента. Пароли не вводятся: логин делает владелец через Login-Sites.bat. */
export async function runBrowser(root, job, { env = process.env, loader = () => import("playwright") } = {}) {
  const action = job.path;
  let args;
  try { args = JSON.parse(job.content || "{}"); } catch { throw new Error("Аргументы повреждены."); }
  if (action === "close") {
    await closeBrowser();
    return "Браузер закрыт.";
  }
  const page = await openBrowser(env, loader);
  const target = () => page.locator(`[data-az-ref="${Number(args.ref)}"]`).first();
  const settle = async () => {
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
  };
  if (action === "open") {
    if (!isPublicUrl(args.url)) throw new Error("Адрес не публичный.");
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: WEB_TIMEOUT_MS });
    await settle();
    return await snapshotPage(page);
  }
  if (action === "snapshot") return await snapshotPage(page);
  if (action === "scroll") {
    await page.mouse.wheel(0, Number(args.dy) || 0);
    return await snapshotPage(page);
  }
  if (action === "screenshot") {
    const top = await realpath(root);
    const file = join(top, ".azrail-shots", `${new Date().toISOString().replaceAll(":", "-")}.png`);
    await mkdir(dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    return `Скриншот сохранён: ${relative(top, file).replaceAll("\\", "/")}`;
  }
  if (action === "click") {
    if (!(await target().count())) throw new Error("Элемента с таким номером нет. Сделай snapshot заново.");
    await target().click({ timeout: 10_000 });
    await settle();
    return await snapshotPage(page);
  }
  if (action === "type") {
    if (typeof args.text !== "string") throw new Error("Нет текста.");
    if (!(await target().count())) throw new Error("Элемента с таким номером нет. Сделай snapshot заново.");
    const kind = await target().evaluate((el) => `${el.getAttribute("type") || ""}|${el.getAttribute("autocomplete") || ""}`);
    if (/^password\||current-password|new-password/i.test(kind)) throw new Error("Пароли агент не вводит. Войди сам через Login-Sites.bat.");
    await target().fill(args.text, { timeout: 10_000 });
    if (args.submit === true) await target().press("Enter");
    await settle();
    return await snapshotPage(page);
  }
  if (action === "press") {
    if (!BROWSER_KEYS.has(args.key)) throw new Error("Клавиша не разрешена.");
    await page.keyboard.press(args.key);
    await settle();
    return await snapshotPage(page);
  }
  if (action === "upload") {
    if (!(await target().count())) throw new Error("Элемента с таким номером нет. Сделай snapshot заново.");
    const file = await resolveInside(root, args.file);
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Это не файл.");
    await target().setInputFiles(file, { timeout: 30_000 });
    return `Файл выбран: ${args.file}\n\n${await snapshotPage(page)}`;
  }
  throw new Error(`Неизвестное действие браузера: ${action}`);
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
    const backup = (await exists(file)) ? await backupToTrash(root, job.path, file) : null;
    await record(root, { op: "write", path: job.path, backup });
    await mkdir(dirname(file), { recursive: true });
    const temp = join(dirname(file), `.azrail-${process.pid}-${Date.now()}.tmp`);
    await writeFile(temp, job.content, "utf8");
    await rename(temp, file);
    return `Записано ${job.content.length} символов в ${job.path}`;
  }
  if (job.kind === "symbols") return await findSymbol(root, job.path, job.content);
  if (job.kind === "overview") return await projectOverview(root, job.path);
  if (job.kind === "search") return await searchFiles(root, job.path, job.content);
  if (job.kind === "edit") return await editFile(root, job.path, job.content);
  if (job.kind === "mkdir") {
    const dir = await resolveInside(root, job.path);
    const created = !(await exists(dir));
    await mkdir(dir, { recursive: true });
    await record(root, { op: "mkdir", path: job.path, created });
    return `Папка создана: ${job.path}`;
  }
  if (job.kind === "move") {
    const from = await resolveInside(root, job.path);
    const to = await resolveInside(root, job.content);
    await lstat(from);
    if (await lstat(to).then(() => true, () => false)) throw new Error("Назначение уже существует.");
    await mkdir(dirname(to), { recursive: true });
    await rename(from, to);
    await record(root, { op: "move", path: job.path, to: job.content });
    return `Перемещено: ${job.path} → ${job.content}`;
  }
  if (job.kind === "trash") return await trashPath(root, job.path);
  if (job.kind === "undo") return await undoLast(root, Number(job.path) || 1);
  throw new Error(`Неизвестное действие: ${job.kind}`);
}

const SEARCH_SKIP = /(^|\/)(\.git|node_modules|\.wrangler|\.azrail-trash|dist|build)(\/|$)/;
const MAX_SEARCH_FILES = 5000;
const MAX_HITS = 100;

/** Ищет по имени файла и по тексту (без регистра). Секреты и служебные каталоги пропускаются. */
export async function searchFiles(root, start, query) {
  const base = start ? await resolveInside(root, start) : await realpath(root);
  const top = await realpath(root);
  const needle = String(query).toLowerCase();
  const hits = [];
  let scanned = 0;
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (hits.length >= MAX_HITS || scanned >= MAX_SEARCH_FILES) return;
      const full = join(dir, entry.name);
      const rel = relative(top, full).replaceAll("\\", "/");
      if (isDenied(rel) || SEARCH_SKIP.test(rel) || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase().includes(needle)) hits.push(`${rel}/`);
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      scanned++;
      if (entry.name.toLowerCase().includes(needle)) hits.push(rel);
      const info = await stat(full);
      if (info.size > 1_000_000) continue;
      const text = await readFile(full, "utf8").catch(() => null);
      if (text === null || text.includes("\0")) continue;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length && hits.length < MAX_HITS; i++) {
        if (lines[i].toLowerCase().includes(needle)) hits.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
      }
    }
  };
  await walk(base);
  return hits.length ? hits.join("\n") + (hits.length >= MAX_HITS ? "\n…(показаны первые 100)" : "") : "Ничего не найдено.";
}

const CODE_FILE = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|cs|rb|php|swift|c|h|cpp|hpp|vue|svelte)$/i;

/** Где символ (функция, класс, тип, переменная) определён и где используется. Только чтение. */
export async function findSymbol(root, start, name) {
  const symbol = String(name ?? "").trim();
  if (!/^[\w$]{1,80}$/.test(symbol)) throw new Error("Имя символа: буквы, цифры, _ и $, до 80 знаков.");
  const base = start ? await resolveInside(root, start) : await realpath(root);
  const top = await realpath(root);
  const word = new RegExp(`(?<![\\w$])${symbol.replace(/\$/g, "\\$")}(?![\\w$])`);
  const keyword = /\b(?:function\*?|class|interface|type|enum|namespace|const|let|var|def|fn|struct|trait|func|object|record)\s+$/;
  const defs = [];
  const uses = [];
  let scanned = 0;
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (scanned >= MAX_SEARCH_FILES || defs.length >= 30) return;
      const full = join(dir, entry.name);
      const rel = relative(top, full).replaceAll("\\", "/");
      if (isDenied(rel) || SEARCH_SKIP.test(rel) || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.isFile() || !CODE_FILE.test(entry.name)) continue;
      scanned++;
      if ((await stat(full)).size > 1_000_000) continue;
      const lines = (await readFile(full, "utf8").catch(() => "")).split("\n");
      lines.forEach((line, index) => {
        const match = word.exec(line);
        if (!match) return;
        const before = line.slice(0, match.index);
        const after = line.slice(match.index + symbol.length);
        const isDef = keyword.test(before) || /^\s*(?:async\s+)?(?:static\s+|public\s+|private\s+|protected\s+)*$/.test(before) && /^\s*(?:\(.*\)\s*(?::[^=]+)?\{|[:=]\s*(?:async\s*)?(?:\(|function|\w+\s*=>))/.test(after) || /^\s*=\s*(?:async\s*)?(?:\(|function|\w+\s*=>)/.test(after) && /(?:const|let|var)\s+$/.test(before);
        const row = `${rel}:${index + 1}: ${line.trim().slice(0, 140)}`;
        if (isDef) defs.push(row);
        else if (uses.length < 40) uses.push(row);
      });
    }
  };
  await walk(base);
  if (!defs.length && !uses.length) return `Символ «${symbol}» не найден в ${scanned} файлах кода.`;
  return [`Определения (${defs.length}):`, ...(defs.length ? defs : ["не найдено — возможно, импортируется из библиотеки"]), "", `Использования (${uses.length}${uses.length >= 40 ? "+" : ""}):`, ...uses].join("\n");
}

const TRASH = ".azrail-trash";

async function backupToTrash(root, relative, file) {
  const top = await realpath(root);
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const target = join(top, TRASH, stamp, relative);
  await mkdir(dirname(target), { recursive: true });
  await cp(file, target, { recursive: true });
  return relative_(top, target);
}
const relative_ = (top, target) => relative(top, target).replaceAll("\\", "/");

/** Заменяет ровно одно вхождение. Перед правкой копия оригинала уходит в .azrail-trash. */
export async function editFile(root, path, content) {
  let edit;
  try {
    edit = JSON.parse(content);
  } catch {
    throw new Error("Правка повреждена.");
  }
  if (typeof edit.old !== "string" || !edit.old || typeof edit.new !== "string") throw new Error("Правка повреждена.");
  const file = await resolveInside(root, path);
  const info = await stat(file);
  if (!info.isFile()) throw new Error("Это не файл.");
  if (info.size > MAX_READ) throw new Error(`Файл больше ${MAX_READ} байт.`);
  const text = await readFile(file, "utf8");
  const count = text.split(edit.old).length - 1;
  if (count === 0) throw new Error("Фрагмент не найден. Прочитай файл и укажи точный текст.");
  if (count > 1) throw new Error(`Фрагмент встречается ${count} раз. Добавь соседние строки, чтобы он был уникальным.`);
  const backup = await backupToTrash(root, path, file);
  await record(root, { op: "edit", path, backup });
  const temp = join(dirname(file), `.azrail-${process.pid}-${Date.now()}.tmp`);
  await writeFile(temp, text.replace(edit.old, () => edit.new), "utf8");
  await rename(temp, file);
  return `Исправлено: ${path}. Копия до правки: ${backup}`;
}

const LOCKS = [["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["bun.lockb", "bun"], ["bun.lock", "bun"], ["package-lock.json", "npm"]];
const MARKERS = ["package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "Makefile", "Dockerfile", "wrangler.toml", "wrangler.jsonc", "tsconfig.json", ".git"];

/** Обзор проекта: что за стек, чем запускать, где что лежит. Только чтение. */
export async function projectOverview(root, path) {
  const dir = path ? await resolveInside(root, path) : await realpath(root);
  const all = await readdir(dir, { withFileTypes: true });
  const names = new Set(all.map((entry) => entry.name));
  const entries = all.filter((entry) => !isDenied(entry.name) && entry.name !== "node_modules" && entry.name !== TRASH);
  const out = [`Папка: ${path || "."}`];
  const found = MARKERS.filter((name) => names.has(name));
  out.push(`Признаки проекта: ${found.length ? found.join(", ") : "нет — это не проект"}`);
  if (names.has("package.json")) {
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8").catch(() => "{}") || "{}");
    const manager = (LOCKS.find(([lock]) => names.has(lock)) ?? [null, pkg.packageManager?.split("@")[0] || "npm"])[1];
    out.push(`Менеджер пакетов: ${manager}${names.has("node_modules") ? " (зависимости установлены)" : " (зависимости не установлены: сначала " + manager + " install)"}`);
    const scripts = Object.keys(pkg.scripts ?? {}).slice(0, 25);
    out.push(`Скрипты: ${scripts.length ? scripts.map((name) => `${manager === "npm" ? "npm run" : manager} ${name}`).join("; ") : "нет"}`);
  }
  if (names.has("pyproject.toml") || names.has("requirements.txt")) out.push("Python: тесты — python -m pytest; зависимости — pip install -r requirements.txt");
  if (names.has("Cargo.toml")) out.push("Rust: cargo build; cargo test");
  if (names.has("go.mod")) out.push("Go: go build ./...; go test ./...");
  const readme = entries.find((entry) => /^readme(\.md)?$/i.test(entry.name));
  if (readme) out.push(`README, начало:\n${(await readFile(join(dir, readme.name), "utf8").catch(() => "")).slice(0, 600)}`);
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => `${entry.name}/`).slice(0, 40);
  const files = entries.filter((entry) => !entry.isDirectory()).map((entry) => entry.name).slice(0, 40);
  out.push(`Папки: ${folders.join(" ") || "нет"}`, `Файлы: ${files.join(" ") || "нет"}`);
  return out.join("\n");
}

const JOURNAL = "journal.jsonl";

async function journalFile(root) {
  return join(await realpath(root), TRASH, JOURNAL);
}

async function readJournal(root) {
  const raw = await readFile(await journalFile(root), "utf8").catch(() => "");
  return raw.split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

async function saveJournal(root, entries) {
  const file = await journalFile(root);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
}

/** Журнал «было → стало»: одна строка на изменение, по нему работает undo. */
async function record(root, entry) {
  const file = await journalFile(root);
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify({ t: new Date().toISOString(), undone: false, ...entry }) + "\n", "utf8");
}

const exists = (file) => lstat(file).then(() => true, () => false);

/** Откатывает последние N неотменённых изменений, от свежих к старым. */
export async function undoLast(root, count = 1) {
  const top = await realpath(root);
  const entries = await readJournal(root);
  const todo = entries.map((entry, index) => ({ entry, index })).filter((item) => !item.entry.undone).slice(-Math.max(1, Math.min(Number(count) || 1, 50))).reverse();
  if (!todo.length) throw new Error("Откатывать нечего: журнал изменений пуст.");
  const lines = [];
  for (const { entry, index } of todo) {
    const file = await resolveInside(root, entry.path);
    if (entry.op === "mkdir") {
      if (!entry.created) lines.push(`Пропущено: «${entry.path}» была и до задачи`);
      else {
        await rmdir(file).catch(() => { throw new Error(`Папка «${entry.path}» не пуста — сначала убери содержимое.`); });
        lines.push(`Папка убрана: ${entry.path}`);
      }
    } else if (entry.op === "move") {
      const to = await resolveInside(root, entry.to);
      if (await exists(file)) throw new Error(`Не могу вернуть: «${entry.path}» уже занято.`);
      await mkdir(dirname(file), { recursive: true });
      await rename(to, file);
      lines.push(`Возвращено: ${entry.to} → ${entry.path}`);
    } else if (entry.backup) {
      const copy = join(top, entry.backup);
      if (entry.op === "trash" && (await exists(file))) throw new Error(`Не могу вернуть: «${entry.path}» уже занято.`);
      if (entry.op !== "trash") await rm(file, { recursive: true, force: true });
      await mkdir(dirname(file), { recursive: true });
      await cp(copy, file, { recursive: true });
      lines.push(`Восстановлено: ${entry.path}`);
    } else if (entry.op === "write") {
      await trashPath(root, entry.path);
      lines.push(`Файл убран в корзину: ${entry.path}`);
    }
    entries[index] = { ...entry, undone: true };
    await saveJournal(root, entries);
  }
  return lines.join("\n");
}

/** Не удаляет, а переносит в .azrail-trash/<время>/… внутри той же папки: всё можно вернуть. */
export async function trashPath(root, path) {
  const file = await resolveInside(root, path);
  await lstat(file);
  const backup = await backupToTrash(root, path, file);
  await record(root, { op: "trash", path, backup });
  await rm(file, { recursive: true });
  return `В корзину: ${path}. Вернуть: ${backup}`;
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

/** Путь к обычному Google Chrome или null. */
export function findChrome(env = process.env, platform = process.platform, exists = existsSync) {
  const candidates = platform === "win32"
    ? [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA].filter(Boolean).map((base) => join(base, "Google", "Chrome", "Application", "chrome.exe"))
    : platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];
  return candidates.find((path) => exists(path)) ?? null;
}

/** Один раз открывает обычный Chrome с профилем агента, без управления из программы: Google и другие сайты пускают войти. Закрой окно, входы сохранятся. */
export async function browserLogin(env = process.env, spawner = spawn, chrome = findChrome(env)) {
  const dir = browserProfileDir(env);
  if (!chrome) throw new Error("Не найден Google Chrome. Установи его и повтори.");
  console.log(`Открываю Chrome. Войди в нужные сайты и закрой окно. Профиль: ${dir}`);
  await new Promise((done, fail) => {
    const child = spawner(chrome, [`--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
    child.once("error", fail);
    child.once("exit", done);
  });
}

export const deviceFile = (env = process.env) => env.AZRAIL_DEVICE_FILE || join(homedir(), ".azrail-agent.json");

export async function loadDevice(file) {
  try {
    const data = JSON.parse(await readFile(file, "utf8"));
    return typeof data?.url === "string" && /^azdev_[a-f0-9]{64}$/.test(data?.token ?? "") ? { url: data.url, token: data.token } : null;
  } catch {
    return null;
  }
}

export async function saveDevice(file, data) {
  await writeFile(file, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
}

/** Привязка компьютера: показывает код, ждёт, пока владелец введёт его в AZRAIL, возвращает постоянный ключ. */
export async function pairWithServer(url, { fetchFn = fetch, sleep = (ms) => new Promise((done) => setTimeout(done, ms)), log = console.log, attempts = 300 } = {}) {
  let started;
  for (let tries = 0; ; tries += 1) {
    const res = await fetchFn(`${url}/api/agent/pair/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (res.ok) {
      started = await res.json();
      break;
    }
    if (res.status !== 429 || tries >= 3) throw new Error(`Сервер не принял запрос привязки (${res.status}).`);
    await sleep(6000);
  }
  log(`\nКод привязки: ${started.code}\nВведи его в AZRAIL: Настройки → Агент на компьютере → «Подтвердить компьютер». Код действует 10 минут.`);
  for (let i = 0; i < attempts; i += 1) {
    await sleep(2000);
    const res = await fetchFn(`${url}/api/agent/pair/poll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: started.secret }) });
    if (res.status === 410) throw new Error("Код истёк. Запусти агента заново.");
    if (!res.ok) throw new Error(`Привязка не удалась (${res.status}).`);
    const body = await res.json();
    if (body.status === "approved" && typeof body.token === "string") return body.token;
  }
  throw new Error("Код не подтверждён вовремя. Запусти агента заново.");
}

const ROOT_LIMIT = 8;
const DENIED_ROOT_SEGMENT = /^(\.ssh|\.gnupg|\.aws|\.git|node_modules|\.wrangler|appdata|\.azrail.*)$/i;
const SYSTEM_ROOTS = [/^[a-z]:\/(windows|program files|program files \(x86\)|programdata|\$recycle\.bin|system volume information)(\/|$)/i, /^\/(etc|usr|bin|sbin|lib|lib64|sys|proc|dev|boot|var|system|library|private|applications)(\/|$)/i];
const unifySlashes = (value) => value.replaceAll("\\", "/").replace(/\/+$/, "") || "/";

export const rootsFile = (env = process.env) => env.AZRAIL_ROOTS_FILE || join(homedir(), ".azrail-roots.json");

/** Можно ли выдать папку агенту: не корень диска, не домашняя папка целиком, не системные и не секретные места. */
export function rootProblem(real, env = process.env) {
  const path = unifySlashes(real);
  if (path === "/" || /^[a-z]:$/i.test(path)) return "Корень диска выдавать нельзя.";
  if (path.toLowerCase() === unifySlashes(homedir()).toLowerCase()) return "Домашнюю папку целиком выдавать нельзя: выбери вложенную.";
  if (SYSTEM_ROOTS.some((re) => re.test(path))) return "Системные папки выдавать нельзя.";
  if (path.split("/").some((part) => DENIED_ROOT_SEGMENT.test(part))) return "Эта папка содержит секретные или служебные данные.";
  return null;
}

/** Рабочий стол, документы, загрузки: учитывает перенос в OneDrive. */
export async function presetFolder(name, env = process.env, home = homedir(), exists = async (path) => stat(path).then((info) => info.isDirectory(), () => false)) {
  const folder = { desktop: "Desktop", documents: "Documents", downloads: "Downloads" }[name];
  if (!folder) throw new Error("Неизвестная папка.");
  const bases = [home, env.OneDrive, env.OneDriveConsumer, env.OneDriveCommercial].filter(Boolean);
  for (const base of bases) {
    const candidate = join(base, folder);
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`Не нашёл папку «${folder}» на компьютере.`);
}

async function saveExtraRoots(roots, initial, env) {
  const extra = roots.map((entry) => entry.path).filter((path) => !initial.has(path));
  await writeFile(rootsFile(env), JSON.stringify(extra), { encoding: "utf8", mode: 0o600 });
}

/** Добавляет папку по просьбе владельца (после его «Разрешить»). Живой список `roots` меняется на месте. */
export async function addRoot(roots, spec, env = process.env, initial = new Set()) {
  if (roots.length >= ROOT_LIMIT) throw new Error(`Больше ${ROOT_LIMIT} папок нельзя.`);
  const raw = ["desktop", "documents", "downloads"].includes(spec) ? await presetFolder(spec, env) : spec.startsWith("~") ? join(homedir(), spec.slice(2)) : spec;
  const real = await realpath(raw).catch(() => { throw new Error("Такой папки нет на компьютере."); });
  if (!(await stat(real)).isDirectory()) throw new Error("Это не папка.");
  const problem = rootProblem(real, env);
  if (problem) throw new Error(problem);
  if (roots.some((entry) => entry.path === real)) throw new Error("Эта папка уже добавлена.");
  const base = (basename(real) || "диск").slice(0, 36);
  const used = new Set(roots.map((entry) => entry.name));
  let name = base;
  for (let n = 2; used.has(name); n += 1) name = `${base}-${n}`;
  roots.push({ name, path: real });
  await saveExtraRoots(roots, initial, env);
  return `Папка добавлена: ${name} — ${real}`;
}

export async function dropRoot(roots, name, env = process.env, initial = new Set()) {
  const index = roots.findIndex((entry) => entry.name === name);
  if (index < 0) throw new Error("Такой папки у агента нет.");
  if (roots.length < 2) throw new Error("Последнюю папку убрать нельзя.");
  const [gone] = roots.splice(index, 1);
  await saveExtraRoots(roots, initial, env);
  return `Папка убрана: ${gone.name}`;
}

/** Папки, добавленные раньше через интерфейс: возвращаются после перезапуска, плохие пропускаются. */
export async function loadExtraRoots(roots, env = process.env, initial = new Set(roots.map((entry) => entry.path))) {
  let saved = [];
  try { saved = JSON.parse(await readFile(rootsFile(env), "utf8")); } catch { return; }
  for (const item of Array.isArray(saved) ? saved.slice(0, ROOT_LIMIT) : []) {
    if (typeof item !== "string") continue;
    await addRoot(roots, item, env, initial).catch(() => undefined);
  }
}

/** Откуда взять ключ: переменные окружения (старый способ) или сохранённая привязка; иначе новая привязка. */
export async function resolveCredentials(env, deps = {}) {
  if (env.AZRAIL_AGENT_TOKEN) return { url: env.AZRAIL_URL?.replace(/\/$/, ""), token: env.AZRAIL_AGENT_TOKEN, device: false };
  const file = deviceFile(env);
  const saved = await loadDevice(file);
  if (saved) return { ...saved, url: saved.url.replace(/\/$/, ""), device: true };
  const url = env.AZRAIL_URL?.replace(/\/$/, "");
  if (!url) return null;
  const token = await pairWithServer(url, deps);
  await saveDevice(file, { url, token });
  (deps.log ?? console.log)("Компьютер привязан. Дальше агент подключается сам.");
  return { url, token, device: true };
}

async function runAgent({ url, token, device }, roots, initial) {
  const makeHeaders = () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Agent-Root": encodeURIComponent(roots[0].path), "X-Agent-Roots": encodeURIComponent(JSON.stringify(roots)) });
  let headers = makeHeaders();
  console.log(`AZRAIL agent: ${roots.length === 1 ? "папка" : "папки"} ${roots.map((entry) => `${entry.name} = ${entry.path}`).join("; ")}. Остановка: Ctrl+C.`);
  let hotUntil = 0;
  let waiting = false;
  for (;;) {
    try {
      headers = makeHeaders();
      const res = await fetch(`${url}/api/agent/poll`, { headers });
      if (res.status === 401) {
        if (device) {
          await rm(deviceFile(), { force: true });
          console.log("Компьютер отвязан в AZRAIL. Привяжи его заново.");
          return "repair";
        }
        console.log("Сессия агента закончилась. Включи агента в AZRAIL заново.");
        return "stop";
      }
      const { job, idle } = res.ok ? await res.json() : { job: null };
      if (idle !== waiting) {
        waiting = !!idle;
        console.log(waiting ? "Жду: нажми «Включить» в AZRAIL." : "Доступ открыт.");
      }
      if (job) {
        let body;
        try {
          if (job.kind === "web") body = { ok: true, output: await readWeb(job.path) };
          else if (job.kind === "browser") body = { ok: true, output: await runBrowser(pickRoot(roots, job.root).path, job) };
          else if (job.kind === "addroot") body = { ok: true, output: await addRoot(roots, job.path, process.env, initial) };
          else if (job.kind === "droproot") body = { ok: true, output: await dropRoot(roots, job.path, process.env, initial) };
          else {
            const root = pickRoot(roots, job.root).path;
            body = job.kind === "run" ? await runCommand(root, job.path) : job.kind === "shell" ? await runShell(root, job.path) : { ok: true, output: await runJob(root, job) };
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
    await new Promise((done) => setTimeout(done, waiting ? 5000 : Date.now() < hotUntil ? 700 : 3000));
  }
}

async function main() {
  if (process.argv.includes("--browser-login")) {
    await browserLogin();
    return;
  }
  const roots = await resolveRoots(process.env, process.cwd());
  const initial = new Set(roots.map((entry) => entry.path));
  await loadExtraRoots(roots, process.env, initial);
  for (;;) {
    let creds;
    try {
      creds = await resolveCredentials(process.env);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    if (!creds?.url || !creds.token) {
      console.error("Нужен AZRAIL_URL (адрес AZRAIL) для первой привязки компьютера.");
      process.exit(2);
    }
    if ((await runAgent(creds, roots, initial)) !== "repair") return;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
