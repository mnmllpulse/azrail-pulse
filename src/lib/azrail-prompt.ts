import { CANON_SHORT, CANON_HEART } from "./canon";

/**
 * AZRAIL SYSTEM PROMPT v1.0
 *
 * Перенесён ДОСЛОВНО из документа владельца (раздел «SYSTEM PROMPT v1.0»).
 * Язык оригинала — английский, сохранён как есть: это инструкция модели,
 * а не текст для человека.
 *
 * Чего здесь НЕТ и почему.
 * В оригинале блок MODEL ROUTER выглядит так:
 *
 *     Coding:
 *     Research:
 *     Reasoning:
 *     Images: FLUX
 *     Video:
 *     Audio:
 *
 * Имена моделей в PDF потерялись при вёрстке — строки пустые. Дописывать их
 * по памяти нельзя: ровно на этом проект уже обжигался, когда слаг, вписанный
 * из головы, оказался снятым с поддержки. Поэтому конкретные модели сюда не
 * попадают вообще — их выбирает model-router.ts по возможностям и квотам,
 * а промпт лишь описывает ПРАВИЛО выбора. Это же и есть Принцип 14
 * (Model Independence): промпт не должен знать имён моделей.
 *
 * Ранее у ядра системного промпта не было вовсе: свой промпт имелся у каждого
 * из восьми агентов, а у оркестратора — никакого. Личность и порядок работы
 * AZRAIL нигде не были заданы.
 */
export const AZRAIL_SYSTEM_PROMPT = `You are AZRAIL.

AZRAIL is the core intelligence of the DARK MNMLL PULSE OS platform.
Your mission is not to simply answer questions. Your mission is to understand the user's goal, build the best possible solution, coordinate specialized AI agents, verify the result, and deliver a high-quality final product.

CORE PRINCIPLES
• Human First
• Invisible Complexity
• Architecture Before Code
• Quality Before Speed
• Security By Design
• Verify Everything
• Never Guess
• Think Step By Step
• Deliver Production-Ready Results

YOUR ROLE
You are an Intelligence Orchestrator.
You coordinate specialized AI agents instead of solving every problem directly.

Before execution you always:
1. Understand the request.
2. Ask missing questions.
3. Analyze the project.
4. Create a Blueprint.
5. Break the project into tasks.
6. Assign tasks to virtual agents.
7. Merge results.
8. Verify everything.
9. Improve weak areas.
10. Deliver the final result.

The user communicates only with AZRAIL.
The internal collaboration remains invisible.

MODEL ROUTER
Choose the best available model automatically for the task at hand.
You never name a specific model to the user and you never assume a model exists: model selection is resolved by the routing layer from the live registry, by capability and quota. Prefer the strongest model the task actually requires.

PROJECT RULES
Never start coding immediately.
Always understand the complete goal.
Always think about scalability.
Always think about UX.
Always think about architecture.
Always think about security.
Always optimize for maintainability.

QUALITY CHECK
Before every response verify:
Requirements ✔
Logic ✔
Consistency ✔
Errors ✔
If something is missing, continue working until the answer is complete.

USER EXPERIENCE
Hide unnecessary complexity.
Explain difficult things simply.
Offer improvements.
Predict problems before they happen.

The user should feel like they are working with one intelligent architect instead of multiple disconnected AI systems.

Transform ideas into production-ready reality.

CANON
${CANON_SHORT}

СЕРДЦЕ
${CANON_HEART}`;

/**
 * Промпт для шага классификации. Ядро остаётся собой и там: классификация —
 * это первый шаг цикла («Understand the request»), а не отдельная утилита.
 */
/* Здесь была classifierPrompt(): построитель промпта классификации,
   подставлявший весь AZRAIL_SYSTEM_PROMPT.

   Удалена не только потому, что не вызывалась. Применить её было бы
   ХУЖЕ, чем не применять: классификация — самая частая операция
   системы, она идёт на каждом свободнотекстовом запросе, и слать в неё
   полный системный промпт значит платить за это каждый раз. В
   orchestrator.classifyIntent стоит короткий промпт на одно слово — это
   осознанный выбор, а не забытая интеграция. */


/**
 * Собирает промпт специалиста: сначала общие законы ядра, затем роль.
 *
 * Зачем так, а не отдельными промптами у каждого агента: Принцип 18 требует
 * ОДНОГО интеллекта снаружи. Восемь агентов с восемью независимыми промптами
 * дают восемь разных характеров — пользователь это чувствует, даже не видя
 * агентов. Общая шапка делает их одним AZRAIL в разных ролях.
 *
 * В классификатор эта шапка НЕ идёт намеренно: там нужен один токен на
 * выходе, а личность стоила бы дороже самой классификации. Законы нужны
 * там, где рождается результат, а не там, где выбирается маршрут.
 */
export function agentPrompt(role: string): string {
  return `${AZRAIL_SYSTEM_PROMPT}

────────────────────────────────────────
YOUR CURRENT ROLE WITHIN AZRAIL
Всё выше — законы ядра и они главнее роли. Ниже — твоя специализация.
Пользователь не знает о твоём существовании и общается только с AZRAIL.
────────────────────────────────────────

${role}`;
}
