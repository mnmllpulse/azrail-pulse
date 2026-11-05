// AZRAIL — MEMORY AGENT
//
// Архитектурное решение: это НЕ Durable Object / subAgent, а обычный модуль
// над общей D1. Почему: subAgent() создаёт инстанс, привязанный к конкретному
// родителю (Orchestrator получит один MemoryAgent, Code Agent — другой, даже
// для одного и того же project_id — они не разделяют состояние автоматически).
// Памяти же нужен ОДИН согласованный источник правды, который читают и
// Orchestrator, и Code Agent, и любой будущий Architect/QA/Git Agent.
// D1 это и есть — модуль просто даёт типизированный доступ к ней.

import type { Env } from "../types";
import { ensureProject } from "./project";
import { log } from "./resilience";
import { recordMemoryReads } from "./metatron-ops";

export type MemoryCategory = "architecture_decision" | "code_style" | "tech_choice" | "known_issue" | "preference";

const VALID_CATEGORIES: MemoryCategory[] = [
  "architecture_decision",
  "code_style",
  "tech_choice",
  "known_issue",
  "preference",
];

export interface MemoryFact {
  category: MemoryCategory;
  key: string;
  value: string;
  sourceAgent?: string;
}

export interface StoredMemoryFact extends MemoryFact {
  id: string;
  updatedAt: string;
}

/** Пишет факт. UNIQUE(project_id, category, key) — повторная запись того же
 *  ключа ОБНОВЛЯЕТ значение, а не плодит дубликаты (та же логика, что у
 *  памяти самого Claude — новый факт перекрывает старый, а не копится рядом). */
export async function rememberFact(env: Env, projectId: string, fact: MemoryFact): Promise<void> {
  // Мусор из модели не роняет задачу — но и не исчезает бесследно: без
  // следа в логах было бы непонятно, почему факт «запомнили», а его нет.
  if (!VALID_CATEGORIES.includes(fact.category)) {
    log("warn", "memory.invalid_category", { projectId, category: fact.category, key: fact.key });
    return;
  }
  if (!fact.key?.trim() || !fact.value?.trim()) {
    log("warn", "memory.empty_fact", { projectId, category: fact.category });
    return;
  }

  // project_memory имеет FK на projects(id) — без строки проекта вставка
  // упала бы с SQLITE_CONSTRAINT_FOREIGNKEY.
  await ensureProject(env, projectId);

  const now = new Date().toISOString();
  try {
    await env.AZRAIL_D1.prepare(
      `INSERT INTO project_memory (id, project_id, category, key, value, source_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, category, key) DO UPDATE SET
         value = excluded.value,
         source_agent = excluded.source_agent,
         updated_at = excluded.updated_at`,
    )
      .bind(
        crypto.randomUUID(),
        projectId,
        fact.category,
        fact.key.trim().slice(0, 100),
        fact.value.trim().slice(0, 2000),
        fact.sourceAgent ?? null,
        now,
        now,
      )
      .run();
  } catch (err) {
    // НАЙДЕНО ПРИ АУДИТЕ: раньше это не было обёрнуто. Ни один из шести
    // вызывающих (architect/code/ui/evolution/security/qa-agent) не
    // оборачивает rememberFact в свой try/catch — не роняли задачу тем же
    // способом, что saveVersion/saveArtifact уже делают для версий. Сбой
    // здесь пробрасывался наверх, orchestrator.handleTask его ловил, и
    // ВЕСЬ результат задачи — например, уже готовый план архитектуры или
    // сгенерированный код — заменялся на голое "Сбой при выполнении
    // задачи", хотя единственное, что не удалось, — необязательная
    // запись в память проекта. Централизовано здесь, а не в шести местах:
    // тот же довод, что уже написан в шапке safe-path.ts — точечные
    // проверки на местах вызова забывают ровно там, где появляется новое.
    log("error", "memory.remember_failed", {
      projectId,
      category: fact.category,
      key: fact.key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function forgetFact(env: Env, projectId: string, category: MemoryCategory, key: string): Promise<void> {
  await env.AZRAIL_D1.prepare(`DELETE FROM project_memory WHERE project_id = ? AND category = ? AND key = ?`)
    .bind(projectId, category, key)
    .run();
}

export async function listFacts(env: Env, projectId: string, limit = 50): Promise<StoredMemoryFact[]> {
  const { results } = await env.AZRAIL_D1.prepare(
    `SELECT id, category, key, value, source_agent, updated_at
     FROM project_memory WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?`,
  )
    .bind(projectId, limit)
    .all<{ id: string; category: MemoryCategory; key: string; value: string; source_agent: string | null; updated_at: string }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    category: r.category,
    key: r.key,
    value: r.value,
    sourceAgent: r.source_agent ?? undefined,
    updatedAt: r.updated_at,
  }));
}

/**
 * То, что реально спрашивается перед каждым решением.
 *
 * ДОЛГО НЕ ВЫЗЫВАЛОСЬ НИКЕМ. Функция была написана с этим самым
 * комментарием — и цикл миссии импортировал только rememberFact. То есть
 * AZRAIL честно копил знание о проекте и каждую следующую миссию начинал
 * с чистого листа: где что лежит, какое решение принято, на чём уже
 * обжигались — всё лежало в D1 и до модели не доходило.
 *
 * Сначала факты, в которых есть слова фразы. Остальные остаются в прежнем
 * порядке, от свежих к старым. Это НЕ поиск по смыслу и не векторный поиск:
 * совпадение подстроки. Закрывается векторным поиском позже.
 * Записи с паролем, ключом API или приватным ключом в модель не попадают.
 */
const SECRET = /api[_-]?key|password|secret|private key|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/i;

/** Совпадение слов с фразой. Ноль значит «порядок как в базе». Секреты в модель не уходят. */
export function rankFacts<T extends { key: string; value: string }>(facts: T[], phrase = '', limit = 30): T[] {
  const safe = facts.filter((fact) => !SECRET.test(fact.key) && !SECRET.test(fact.value));
  const words = new Set(
    phrase.toLocaleLowerCase('ru').split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3),
  );
  const score = (fact: T) => {
    if (!words.size) return 0;
    const hay = `${fact.key} ${fact.value}`.toLocaleLowerCase('ru');
    let hits = 0;
    for (const word of words) if (hay.includes(word)) hits += 1;
    return hits;
  };
  const ranked = safe.map((fact, index) => ({ fact, index, score: score(fact) }));
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, limit).map((row) => row.fact);
}

export async function recallContext(env: Env, projectId: string, limit = 30, audit?: {missionId?: string; query?: string}): Promise<string | null> {
  const facts = rankFacts(await listFacts(env, projectId, Math.max(limit, 50)), audit?.query ?? '', limit);
  if (facts.length === 0) return null;

  const lines = facts.map((f) => `[${f.category}] ${f.key}: ${f.value}`);

  /* Потолок по символам, а не только по числу фактов.
   *
   * Тридцать коротких записей — это строк тридцать, а тридцать подробных
   * разборов — несколько тысяч символов, которые вытеснят из запроса саму
   * задачу. Обрезается ПО ФАКТАМ целиком: половина факта хуже его
   * отсутствия — модель достроит недосказанное сама. */
  const LIMIT = 3000;
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length > LIMIT) break;
    kept.push(line);
    used += line.length + 1;
  }
  if (!kept.length) return null;

  if(audit?.missionId){
    const usedFacts=facts.slice(0,kept.length);
    await recordMemoryReads(env,audit.missionId,usedFacts).catch((error)=>log("warn","memory.audit_failed",{missionId:audit.missionId,error:error instanceof Error?error.message:String(error)}));
  }
  const tail = kept.length < lines.length ? `\n…ещё ${lines.length - kept.length} записей опущено.` : "";
  return `${kept.join("\n")}${tail}`;
}

/** Достаёт факты из ответа модели, если она сама выделила блок:
 *  ---MEMORY---
 *  category: tech_choice | key: state-management | value: Redux Toolkit, см. анализ выше
 *  ---END---
 *  Строки, которые не парсятся, или с невалидной категорией — пропускаются,
 *  не роняют извлечение остальных. */
export function extractMemoryFacts(modelOutput: string, sourceAgent: string): MemoryFact[] {
  // ВСЕ блоки, а не первый: модель вполне может выдать несколько, и факты
  // из второго молча терялись бы.
  const blocks = [...modelOutput.matchAll(/---MEMORY---([\s\S]*?)---END---/g)];
  if (blocks.length === 0) return [];

  const facts: MemoryFact[] = [];
  for (const line of blocks.map((b) => b[1]).join("\n").split("\n")) {
    const m = line.match(/category:\s*([\w_]+)\s*\|\s*key:\s*([^|]+)\|\s*value:\s*(.+)/i);
    if (!m) continue;
    const category = m[1].trim().toLowerCase() as MemoryCategory;
    if (!VALID_CATEGORIES.includes(category)) continue;
    facts.push({ category, key: m[2].trim(), value: m[3].trim(), sourceAgent });
  }
  return facts;
}

/** Убирает блок ---MEMORY---...---END--- из текста, который увидит пользователь —
 *  это служебная разметка для системы, не часть ответа по задаче. */
export function stripMemoryBlock(modelOutput: string): string {
  // Флаг g обязателен: без него убирался только ПЕРВЫЙ блок, и служебная
  // разметка из второго попадала прямо в текст, который видит человек.
  return modelOutput.replace(/---MEMORY---[\s\S]*?---END---/g, "").trim();
}
