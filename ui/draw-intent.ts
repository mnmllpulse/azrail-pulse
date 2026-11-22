import { splitAttachments } from "./attachment-chip";
import { fixDrawVerbs } from "./typo";

const BARE =
  /^\s*(?:(?:ну|да|давай|а\s+теперь|теперь|тогда|ладно|хорошо|окей|ок|и|вот|все|всё)[\s,]+)*(?:рисуй|нарисуй|нарисуйте|рисуйте|сгенерируй|генерируй|создай|сделай|делай)(?:\s+(?:это|её|ее|его|картинку|изображение|пожалуйста|уже|мне|ещё|еще|раз|снова|заново))*\s*[.!]*\s*$/iu;
const VERB =
  "(?:рисуй(?:те)?|нарисуй(?:те)?|сгенерируй(?:те)?|генерируй(?:те)?)";
const TRAILING = new RegExp(
  `^([\\s\\S]{30,}?)[\\s,;:—-]+${VERB}(?:\\s+(?:это|её|ее|его|пожалуйста|уже))*\\s*[.!]*\\s*$`,
  "iu",
);
const MENTIONS_PROMPT =
  /(?:промпт\p{L}*|выше|я\s+(?:тебе\s+)?(?:дал|скинул|отправил|написал)|этот|эту|этого|его|её|ее|то\s+что)/iu;
const NEGATED = new RegExp(
  `(?:^|\\s)(?:не|нельзя|без|хватит)\\s+(?:\\p{L}+\\s+)?${VERB}`,
  "iu",
);
const SAID_PROMPT =
  /(?:дал|даю|разрешаю|разрешил)\s+(?:тебе\s+)?(?:добро|разрешение)\s+(?:на\s+)?(?:нарисовать|рисовать)|^\s*(?:мне\s+)?(?:надо|нужн\p{L}*)\s+картин\p{L}*[\s,.!]*$|это\s+(?:был\s+|есть\s+)?промпт\s+для\s+(?:картин\p{L}*|изображени\p{L}*)/iu;
const EDIT =
  /(?:измени|поменяй|переделай|перерисуй|стилизуй|доработай|в\s+(?:таком|этом|том)\s+же\s+стиле|в\s+(?:таком|этом)\s+духе|по\s+образцу|как\s+на\s+(?:картинке|фото|этом)|похож\p{L}*\s+на|такую\s+же|такой\s+же|(?:убери|удали|вырежи|замени)\s+(?:\p{L}+\s+)?(?:фон|задн\p{L}+\s+план|водян\p{L}+|логотип|надпись)|сделай\s+(?:\p{L}+\s+)?(?:светлее|темнее|ярче|контрастнее|прозрачн\p{L}*|ч[её]рно-бел\p{L}*)|(?:сделай|нарисуй|перерисуй)\s+(?:это\s+)?в\s+стиле|^\s*в\s+стиле\s)/iu;
const FENCE = /```[^\n]*\n([\s\S]{20,1500}?)```/;
const MAX = 1500;

export type DrawTurn = { user: string; reply: string } | undefined;

/** Что рисовать на «рисуй»: промпт в блоке кода прошлого ответа, иначе прошлое сообщение пользователя. */
export function contextPrompt(turn: DrawTurn): string {
  if (!turn) return "";
  const block = FENCE.exec(turn.reply)?.[1]?.trim();
  if (block) return block.slice(0, MAX);
  return splitAttachments(turn.user).text.trim().slice(0, MAX);
}

/** Фраза без описания («рисуй») или правка приложенной картинки. null — это обычный разговор или обычный заказ. */
export function drawRequest(
  message: string,
  context: { hasImage: boolean; previous: string },
): { text: string } | null {
  const text = fixDrawVerbs(message.trim());
  if (!text || text.endsWith("?")) return null;
  if (NEGATED.test(text)) return null;
  const hasPrompt =
    context.previous.length >= 15 && !BARE.test(context.previous);
  const referring = text.length <= 160 && MENTIONS_PROMPT.test(text);
  if (hasPrompt && referring && new RegExp(VERB, "iu").test(text))
    return { text: context.previous };
  const trailing = TRAILING.exec(text);
  if (trailing && !referring && !BARE.test(text))
    return { text: trailing[1].replace(/[\s.,;:—-]+$/u, "").slice(0, MAX) };
  if (hasPrompt && SAID_PROMPT.test(text)) return { text: context.previous };
  if (BARE.test(text)) {
    if (context.previous.length >= 15 && !BARE.test(context.previous))
      return { text: context.previous };
    return context.hasImage ? { text } : null;
  }
  if (context.hasImage && EDIT.test(text)) return { text };
  return null;
}
