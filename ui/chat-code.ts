const BLOCK = /```html?[^\n]*\n([\s\S]*?)```/i;
const MARKUP =
  /<(?:!doctype|html|body|div|section|main|style|canvas|form|button|h1|p)[\s>]/i;
const NOTE = "_Код страницы открыт справа в «Живом экране» (вкладка «Код»)._";

/** HTML-страница из ответа модели: уходит в Живой экран, в чате остаётся пометка. */
export function htmlBlockOf(
  reply: string,
): { html: string; text: string } | null {
  const match = BLOCK.exec(reply);
  const html = match?.[1]?.trim() ?? "";
  if (!match || html.length < 80 || !MARKUP.test(html)) return null;
  return { html, text: reply.replace(match[0], NOTE) };
}
