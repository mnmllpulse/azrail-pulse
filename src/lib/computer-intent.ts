import { extractText, runModel } from "./model-router";
import { log } from "./resilience";
import type { Env } from "../types";

const SYSTEM =
  "Определи, просит ли пользователь выполнить действие на его компьютере: создать, изменить, найти, удалить или переместить файлы и папки, запустить команду, открыть сайт или программу в браузере, опубликовать что-то через браузер. " +
  "Вопросы, объяснения, обычная беседа и работа с кодом проекта в AZRAIL — это НЕ задача на компьютере. " +
  "Ответь одним словом: да или нет.";

/** Ответ модели → решение. Неоднозначный ответ считается «нет»: лучше обычный ответ, чем лишняя миссия. */
export function parseComputerVerdict(raw: string): boolean {
  return /^\s*(?:да|yes)(?![\p{L}])/iu.test(raw);
}

/** Быстрый классификатор для фраз, которые шаблоны не узнали. Любая ошибка модели = «нет». */
export async function classifyComputerTask(env: Env, message: string): Promise<boolean> {
  const text = message.trim().slice(0, 1000);
  if (text.length < 4) return false;
  try {
    const routed = await runModel<{ response?: string }>(
      env,
      "classify",
      { messages: [{ role: "system", content: SYSTEM }, { role: "user", content: text }] },
      {
        complexity: "trivial",
        validate: (out: { response?: string }) => (/(?:да|нет|yes|no)/iu.test(extractText(out)) ? true : "нужен ответ да или нет"),
      },
    );
    return parseComputerVerdict(extractText(routed.output));
  } catch (error) {
    log("warn", "computer_intent.failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
