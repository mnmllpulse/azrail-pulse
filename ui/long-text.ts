const WORDS: Record<string, number> = {
  один: 1,
  одна: 1,
  одну: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
};
const NUMBER =
  "(\\d+|один|одна|одну|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)";
const PAGES = new RegExp(`${NUMBER}\\s+страни\\p{L}*`, "iu");
const PER_PAGE = new RegExp(
  `по\\s+(\\d[\\d\\s]*)\\s*(?:знак|символ)\\p{L}*`,
  "iu",
);
const TOTAL_CHARS = /(\d[\d\s]*)\s*(?:знак|символ)\p{L}*/iu;
const TOTAL_WORDS = /(\d[\d\s]*)\s*слов\p{L}*/iu;

export const LONG_FROM = 4000;
export const CHAPTER_MAX_CHARS = 4500;
export const MAX_CHAPTERS = 10;
export const MAX_TOTAL = CHAPTER_MAX_CHARS * MAX_CHAPTERS;

const num = (raw: string) =>
  Number(raw.replace(/\s+/g, "")) || WORDS[raw.toLowerCase()] || 0;

/** Сколько знаков просят: «10 страниц по 2000 знаков», «20000 знаков», «3000 слов». null — обычный запрос. */
export function longTarget(
  message: string,
): { chars: number; capped: boolean } | null {
  const pages = PAGES.exec(message);
  const each = PER_PAGE.exec(message);
  let chars = 0;
  if (pages && each) chars = num(pages[1]) * num(each[1]);
  else if (pages) chars = num(pages[1]) * 1800;
  else if (TOTAL_WORDS.test(message))
    chars = num(TOTAL_WORDS.exec(message)![1]) * 7;
  else if (TOTAL_CHARS.test(message))
    chars = num(TOTAL_CHARS.exec(message)![1]);
  if (chars < LONG_FROM) return null;
  return { chars: Math.min(chars, MAX_TOTAL), capped: chars > MAX_TOTAL };
}

export function chapterCount(chars: number): number {
  return Math.min(MAX_CHAPTERS, Math.max(2, Math.ceil(chars / 3000)));
}

export function parsePlan(reply: string, count: number): string[] {
  const rows = reply
    .split("\n")
    .map(
      (line) =>
        /^\s*(?:\d+[.)]|[-•])\s*(.+?)\s*$/
          .exec(line)?.[1]
          ?.replace(/\*\*/g, "")
          .trim() ?? "",
    )
    .filter((row) => row.length > 2)
    .slice(0, count);
  while (rows.length < count) rows.push(`Часть ${rows.length + 1}`);
  return rows;
}

export type LongResult = {
  text: string;
  done: number;
  total: number;
  failed?: string;
  capped: boolean;
};

/** Длинный текст по главам: план, затем каждая глава отдельным запросом с памятью о плане и конце прошлой главы. */
export async function writeLong(input: {
  message: string;
  chars: number;
  capped: boolean;
  ask: (prompt: string) => Promise<string>;
  progress?: (text: string) => void;
}): Promise<LongResult> {
  const { message, chars, capped, ask, progress } = input;
  const total = chapterCount(chars);
  const each = Math.round(chars / total / 100) * 100;
  progress?.(`Составляю план из ${total} глав…`);
  let plan: string[];
  try {
    plan = parsePlan(
      await ask(
        `Задача: ${message}\n\nСоставь план из ${total} глав. Только нумерованный список в формате «1. Название главы — одно предложение о содержании». Без вступлений и пояснений.`,
      ),
      total,
    );
  } catch (error) {
    return {
      text: "",
      done: 0,
      total,
      failed: error instanceof Error ? error.message : String(error),
      capped,
    };
  }
  const outline = plan
    .map((title, index) => `${index + 1}. ${title}`)
    .join("\n");
  const parts: string[] = [];
  let tail = "";
  for (let index = 0; index < total; index++) {
    progress?.(`Пишу главу ${index + 1} из ${total}…`);
    const last = index === total - 1;
    try {
      const body = (
        await ask(
          `Общая задача: ${message}\n\nПлан всего текста:\n${outline}\n\n${tail ? `Конец предыдущей главы:\n${tail}\n\n` : ""}Напиши только главу ${index + 1} «${plan[index]}», примерно ${each} знаков (не меньше ${Math.round(each * 0.9)}). Продолжай историю без повторов, не пересказывай план${last ? ", в конце заверши текст" : ", не завершай историю"}. Без вступлений, пояснений и вопросов; заголовок главы не пиши.`,
        )
      ).trim();
      parts.push(`## ${plan[index]}\n\n${body}`);
      tail = body.slice(-700);
    } catch (error) {
      return {
        text: parts.join("\n\n"),
        done: index,
        total,
        failed: error instanceof Error ? error.message : String(error),
        capped,
      };
    }
  }
  return { text: parts.join("\n\n"), done: total, total, capped };
}
