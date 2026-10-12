import { readBoundedBody } from "./request-body";
// AZRAIL — чтение исходников из любого поддерживаемого входа.
//
// Вынесено из CodeAgent.gatherContext(), потому что появился второй потребитель:
// Security Agent сканирует файлы ПОФАЙЛОВО (нужен путь и номер строки для находки),
// а Code Agent склеивает всё в один блоб для промпта. Один источник, два формата —
// поэтому ридер отдаёт структуру, а склейка живёт отдельной функцией.

import { listZip, readEntry } from "./zip-reader";
import { splitRepo } from "./safe-path";
import type { Env, TaskRequest, GeneratedFile } from "../types";

export const MAX_CONTEXT_CHARS = 60_000;
const TEXT_FILE_RE = /\.(ts|tsx|js|jsx|json|md|css|html|py|toml|yaml|yml|sql|txt|env|lock|astro|vue|svelte|go|rs|java|kt|php|rb|sh)$/i;
const SKIP_RE = /node_modules|\.git\//;

/** Читает исходники и возвращает их пофайлово. Бросает при нечитаемом входе. */
export async function readSource(env: Env, request: TaskRequest, maxChars = MAX_CONTEXT_CHARS): Promise<GeneratedFile[]> {
  maxChars = Number.isFinite(maxChars) ? Math.max(1,Math.min(MAX_CONTEXT_CHARS,Math.floor(maxChars))) : MAX_CONTEXT_CHARS;
  switch (request.inputType) {
    case "text":
    case "json":
      return request.payload ? [{ path: "input.txt", content: request.payload.slice(0,maxChars) }] : [];

    case "zip": {
      if (!request.r2Key) throw new Error("r2Key отсутствует для input_type=zip");
      const obj = await env.AZRAIL_R2.get(request.r2Key);
      if (!obj) throw new Error(`Объект ${request.r2Key} не найден в AZRAIL_R2`);
      if (obj.size > 50 * 1024 * 1024) throw new Error("Архив превышает 50 МБ");
      const buf = await obj.arrayBuffer();
      const { entries } = listZip(buf);
      const files: GeneratedFile[] = [];
      let total = 0;
      for (const entry of entries) {
        if (entry.skipped || !TEXT_FILE_RE.test(entry.path) || SKIP_RE.test(entry.path)) continue;
        if (entry.size > 256 * 1024) continue;
        const content = new TextDecoder().decode(await readEntry(buf, entry, 256 * 1024)).slice(0, Math.max(0, maxChars - total));
        files.push({ path: entry.path, content });
        total += content.length;
        if (total >= maxChars || files.length >= 40) break;
      }
      if (files.length === 0) throw new Error("В архиве не найдено текстовых файлов поддерживаемых типов");
      return files;
    }

    case "pdf":
    case "docx": {
      if (!request.r2Key) throw new Error(`r2Key отсутствует для input_type=${request.inputType}`);
      const obj = await env.AZRAIL_R2.get(request.r2Key);
      if (!obj) throw new Error(`Объект ${request.r2Key} не найден в AZRAIL_R2`);
      if (obj.size > 10*1024*1024) throw new Error("Документ превышает 10 МиБ.");
      const mime =
        request.inputType === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const blob = new Blob([await obj.arrayBuffer()], { type: mime });
      const converted = (await env.AI.toMarkdown([{ name: request.r2Key, blob }])) as Array<{ data?: string }>;
      return [{ path: request.r2Key, content: (converted[0]?.data ?? "").slice(0,maxChars) }];
    }

    case "code":
    case "image":
    case "audio":
    case "video": {
      if (!request.r2Key) throw new Error(`r2Key отсутствует для input_type=${request.inputType}`);
      const obj = await env.AZRAIL_R2.get(request.r2Key);
      if (!obj) throw new Error(`Объект ${request.r2Key} не найден в AZRAIL_R2`);
      // Код читается как есть — это текст, и путь важен для находок
      // Security Agent (файл + строка).
      if (request.inputType === "code") {
        return [{ path: request.payload || "input.code", content: new TextDecoder().decode(await readBoundedBody(new Response(obj.body),maxChars*4)).slice(0,maxChars) }];
      }
      // Двоичное текстом читать нельзя — вернулась бы каша из байтов,
      // которую модель приняла бы за содержимое. Отдаём отметку о вложении:
      // разбор картинок и звука — отдельная работа, которой пока нет.
      return [{ path: request.r2Key, content: `[двоичное вложение: ${request.inputType}]` }];
    }

    case "github": {
      // Раньше owner/repo брались простым split без единой проверки:
      // payload "../../user" давал owner=".." и уводил запрос с эндпоинта.
      const { owner, repo } = splitRepo(request.payload, "payload (owner/name)");
      const headers = {"User-Agent":"azrail-os",...(env.GITHUB_TOKEN?{Authorization:`Bearer ${env.GITHUB_TOKEN}`}:{})};
      const treeRes=await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        {headers,redirect:"error",signal:AbortSignal.timeout(20_000)});
      if(!treeRes.ok)throw new Error(`GitHub API вернул ${treeRes.status} при чтении дерева ${owner}/${repo}`);
      const tree=JSON.parse(new TextDecoder().decode(await readBoundedBody(treeRes,4*1024*1024))) as {
        truncated?:boolean;tree:Array<{path:string;type:string;sha:string;size?:number}>;
      };
      if(!Array.isArray(tree.tree)||tree.truncated)throw new Error("GitHub вернул неполное дерево. Загрузите нужную часть проекта архивом.");
      const candidates=tree.tree.filter(t=>t.type==="blob"&&typeof t.path==="string"&&TEXT_FILE_RE.test(t.path)&&!SKIP_RE.test(t.path)).slice(0,40);
      const files:GeneratedFile[]=[];let total=0;
      for(const file of candidates){
        if(!/^[0-9a-f]{40,64}$/i.test(file.sha))throw new Error("Некорректный SHA файла GitHub.");
        if(file.size!==undefined&&file.size>256*1024)continue;
        // Immutable blobs retain HEAD consistency, and authentication works for private repositories.
        const rawRes=await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`,{
          headers:{...headers,Accept:"application/vnd.github.raw+json"},redirect:"error",signal:AbortSignal.timeout(20_000),
        });
        if(!rawRes.ok)throw new Error(`Не удалось прочитать ${file.path}: GitHub ${rawRes.status}`);
        const content=new TextDecoder().decode(await readBoundedBody(rawRes,256*1024)).slice(0,maxChars-total);
        files.push({path:file.path,content});total+=content.length;
        if(total>=maxChars)break;
      }
      if(!files.length)throw new Error("В репозитории не найдены доступные текстовые файлы.");
      return files;
    }

    default:
      return request.payload ? [{ path: "input.txt", content: request.payload.slice(0,maxChars) }] : [];
  }
}

/** Склеивает файлы в один текст для промпта модели. */
export function joinForPrompt(files: GeneratedFile[], maxChars = MAX_CONTEXT_CHARS): string {
  const parts: string[] = [];
  let total = 0;
  for (const f of files) {
    const part = `--- ${f.path} ---\n${f.content}`;
    parts.push(part);
    total += part.length;
    if (total > maxChars) break;
  }
  return parts.join("\n\n").slice(0, Math.max(0, maxChars));
}
