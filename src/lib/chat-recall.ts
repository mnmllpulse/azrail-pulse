import type { Env } from "../types";

const READ_VERB = /(?<![\p{L}])(?:прочита\p{L}*|посмотр\p{L}*|найд\p{L}*|найти|поищ\p{L}*|ищи|вспомн\p{L}*|загляни|пересмотр\p{L}*|обсуждал\p{L}*|говорил\p{L}*|писал\p{L}*|в\s+каких)(?![\p{L}])/iu;
const CHAT_WORD = /(?<![\p{L}])(?:чат\p{L}*|диалог\p{L}*|бесед\p{L}*|переписк\p{L}*)(?![\p{L}])/iu;
const STOP = new Set(["чаты", "чатах", "чатов", "чата", "чат", "моих", "мои", "моё", "прошлых", "прошлые", "другие", "других", "найди", "найти", "поищи", "прочитай", "прочитать", "посмотри", "вспомни", "диалоги", "диалогах", "беседы", "беседах", "переписка", "переписки", "пожалуйста", "мне", "что", "там", "наши", "наших", "все", "всех", "про", "как", "где", "когда", "было", "были", "обсуждали", "писал", "писали", "говорили", "какие", "каких", "есть", "этом", "этих", "тему", "теме", "насчёт", "насчет", "кратко", "подробно"]);
const MAX_ROWS = 400;
const MAX_CHATS = 6;
const SNIPPET = 300;
const MAX_TEXT = 6000;

type Row = { cid: string; title: string; role: string; content: string };

/** Просьба прочитать или найти что-то в прошлых чатах: нужны и глагол чтения, и слово «чаты». */
export function wantsChatRecall(message: string): boolean {
  return READ_VERB.test(message) && CHAT_WORD.test(message);
}

export function topicWords(message: string): string[] {
  const words = message.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return [...new Set(words.filter((word) => !STOP.has(word)))].slice(0, 6);
}

function clean(text: string): string {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "[вложение]").replace(/\s+/g, " ").trim().slice(0, SNIPPET);
}

/** Блок «прошлые чаты» для модели: только чаты этого аккаунта, только чтение, текущий чат исключён. */
export async function recallChats(env: Env, accountId: string, currentId: string, message: string): Promise<string> {
  if (!accountId) return "";
  let rows: Row[] = [];
  try {
    const { results } = await env.AZRAIL_D1.prepare(
      `SELECT m.conversation_id AS cid, c.title AS title, m.role AS role, m.content AS content
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE c.id != ? AND m.role IN ('user','assistant')
         AND EXISTS(SELECT 1 FROM resource_owners o WHERE o.kind = 'conversation' AND o.resource_id = c.id AND o.account_id = ?)
       ORDER BY m.created_at DESC, m.rowid DESC LIMIT ${MAX_ROWS}`,
    ).bind(currentId, accountId).all<Row>();
    rows = (results ?? []) as Row[];
  } catch {
    return "\n\nПРОШЛЫЕ ЧАТЫ:\nЧтение чатов сейчас недоступно. Содержимое не выдумывай.";
  }
  if (!rows.length) return "\n\nПРОШЛЫЕ ЧАТЫ:\nДругих чатов у пользователя пока нет. Содержимое не выдумывай.";

  const byChat = new Map<string, { title: string; items: Row[] }>();
  for (const row of rows) {
    const entry = byChat.get(row.cid) ?? { title: row.title, items: [] };
    entry.items.push(row);
    byChat.set(row.cid, entry);
  }
  const words = topicWords(message);
  const scored = [...byChat.values()].map((chat, order) => {
    const haystack = `${chat.title} ${chat.items.map((item) => item.content).join(" ")}`.toLowerCase();
    return { chat, order, score: words.filter((word) => haystack.includes(word)).length };
  });
  const matched = words.length ? scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.order - b.order) : scored;
  const picked = (matched.length ? matched : scored).slice(0, MAX_CHATS);
  const note = words.length && !matched.length ? "По теме совпадений нет; ниже последние чаты." : words.length ? `Отобраны чаты по словам: ${words.join(", ")}.` : "Последние чаты.";

  const lines: string[] = [];
  for (const { chat } of picked) {
    const newestFirst = chat.items;
    const firstUser = [...newestFirst].reverse().find((item) => item.role === "user");
    const tail = newestFirst.slice(0, 2).reverse();
    const parts = [firstUser && `начало: ${clean(firstUser.content)}`, ...tail.map((item) => `${item.role === "user" ? "он" : "ты"}: ${clean(item.content)}`)].filter(Boolean);
    lines.push(`- «${clean(chat.title).slice(0, 80)}» — ${parts.join(" | ")}`);
  }
  const body = `ПРОШЛЫЕ ЧАТЫ ПОЛЬЗОВАТЕЛЯ (только чтение; это его чаты; ${note}):\n${lines.join("\n")}\nОтвечай только по этим данным. Если нужного здесь нет, так и скажи.`;
  return `\n\n${body.slice(0, MAX_TEXT)}`;
}
