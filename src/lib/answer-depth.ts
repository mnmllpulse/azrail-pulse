export type AnswerDepthLevel = 1 | 2 | 3 | 4;

export interface AnswerDepth {
  level: AnswerDepthLevel;
  brief: boolean;
  maxTokens: number;
  instruction: string;
}

const BRIEF = /(?:^|[\s,.;:!?])(?:коротко|кратко|краткий|в\s+двух\s+словах|в\s+одном\s+предложении|одним\s+предложением|только\s+ответ|без\s+подробностей|tl;?dr|briefly|in\s+short)(?:$|[\s,.;:!?])/i;
const EXPERT = /(?:подробн|глубок|экспертн|полный\s+разбор|исчерпывающ|детальн|всесторонн|in\s+depth|in\s+detail|comprehensive)/i;
const EXPLAIN = /(?:что\s+так(?:ое|ой|ая|ие)|объясни|расскажи|почему|зачем|как\s+(?:работает|устроен|происходит|возника)|в\s+чём\s+(?:разница|суть|смысл)|сравни|разбери|отличи[ея]|what\s+is|explain|why|how\s+does|compare)/i;
const SMALLTALK = /^(?:привет|здравствуй|здорово|хай|добрый\s+(?:день|вечер|утро)|спасибо|ок|окей|хорошо|понял|ясно|да|нет|hi|hello|hey|thanks)[\s!.?,]*$/i;

const LEVELS: Record<AnswerDepthLevel, { maxTokens: number; instruction: string }> = {
  1: {
    maxTokens: 500,
    instruction: "ГЛУБИНА ОТВЕТА: короткая. Ответь естественно и по существу в одном-трёх предложениях. Не расширяй тему.",
  },
  2: {
    maxTokens: 1500,
    instruction: "ГЛУБИНА ОТВЕТА: стандартная. Дай законченное объяснение: определение, суть, достаточный контекст и пример, если он помогает. Не обрывай ответ на одном определении.",
  },
  3: {
    maxTokens: 3000,
    instruction: "ГЛУБИНА ОТВЕТА: подробный разбор. Структура: определение и ключевые понятия; причины и механизм; логические связи; два-три конкретных примера; практическое применение; ограничения, исключения и спорные места; краткий вывод. Заголовки и списки используй там, где они упрощают чтение. Не заменяй разбор общими фразами.",
  },
  4: {
    maxTokens: 5000,
    instruction: "ГЛУБИНА ОТВЕТА: экспертный анализ. Раскрой тему системно: понятия, механизмы, взаимосвязи, сравнения альтернатив (таблица, если уместно), ограничения и пограничные случаи, разные точки зрения при спорности темы, выводы и рекомендации. Не сокращай ответ искусственно; факты, в которых не уверен, помечай прямо.",
  },
};

export function answerDepth(question: string, priorTurns = 0): AnswerDepth {
  const text = question.replace(/\s+/g, " ").trim();
  const build = (level: AnswerDepthLevel, brief = false): AnswerDepth => ({ level, brief, ...LEVELS[level] });
  if (BRIEF.test(text)) return build(1, true);
  if (SMALLTALK.test(text)) return build(1);
  if (EXPERT.test(text) || text.length > 600) return build(4);
  if (EXPLAIN.test(text) || text.length > 220) return build(3);
  if (text.length <= 24 && !text.includes("?") && priorTurns === 0) return build(1);
  return build(2);
}
