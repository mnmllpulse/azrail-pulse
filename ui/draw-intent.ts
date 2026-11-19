import { splitAttachments } from './attachment-chip';

const BARE = /^\s*(?:ну\s+|давай\s+|а\s+теперь\s+|теперь\s+)*(?:рисуй|нарисуй|нарисуйте|рисуйте|сгенерируй|генерируй|создай|сделай|делай)(?:\s+(?:это|её|ее|его|картинку|изображение|пожалуйста|уже|мне))*\s*[.!]*\s*$/iu;
const EDIT = /(?:измени|поменяй|переделай|перерисуй|стилизуй|доработай|в\s+(?:таком|этом|том)\s+же\s+стиле|в\s+(?:таком|этом)\s+духе|по\s+образцу|как\s+на\s+(?:картинке|фото|этом)|похож\p{L}*\s+на|такую\s+же|такой\s+же)/iu;
const FENCE = /```[^\n]*\n([\s\S]{20,1500}?)```/;
const MAX = 1500;

export type DrawTurn = { user: string; reply: string } | undefined;

/** Что рисовать на «рисуй»: промпт в блоке кода прошлого ответа, иначе прошлое сообщение пользователя. */
export function contextPrompt(turn: DrawTurn): string {
  if (!turn) return '';
  const block = FENCE.exec(turn.reply)?.[1]?.trim();
  if (block) return block.slice(0, MAX);
  return splitAttachments(turn.user).text.trim().slice(0, MAX);
}

/** Фраза без описания («рисуй») или правка приложенной картинки. null — это обычный разговор или обычный заказ. */
export function drawRequest(message: string, context: { hasImage: boolean; previous: string }): { text: string } | null {
  const text = message.trim();
  if (!text || text.endsWith('?')) return null;
  if (BARE.test(text)) {
    if (context.previous.length >= 15 && !BARE.test(context.previous)) return { text: context.previous };
    return context.hasImage ? { text } : null;
  }
  if (context.hasImage && EDIT.test(text)) return { text };
  return null;
}
