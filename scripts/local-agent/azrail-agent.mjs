#!/usr/bin/env node
import { mkdir, readdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_READ = 200_000;
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

async function main() {
  const url = process.env.AZRAIL_URL?.replace(/\/$/, "");
  const token = process.env.AZRAIL_AGENT_TOKEN;
  const root = process.env.AZRAIL_ROOT || process.cwd();
  if (!url || !token) {
    console.error("Нужны AZRAIL_URL и AZRAIL_AGENT_TOKEN.");
    process.exit(2);
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  console.log(`AZRAIL agent: папка ${await realpath(root)}. Остановка: Ctrl+C.`);
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
          body = { ok: true, output: await runJob(root, job) };
        } catch (error) {
          body = { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        console.log(`${job.kind} ${job.path || "."} → ${body.ok ? "ok" : body.error}`);
        await fetch(`${url}/api/agent/jobs/${job.id}/result`, { method: "POST", headers, body: JSON.stringify(body) });
        continue;
      }
    } catch (error) {
      console.error(`Нет связи: ${error instanceof Error ? error.message : error}`);
    }
    await new Promise((done) => setTimeout(done, 3000));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
