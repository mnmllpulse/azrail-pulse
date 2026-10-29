import { extractText, runModel } from "../lib/model-router";
import { taskTrace } from "../lib/observability-context";
import { quickIntent } from "../lib/quick-intent";
import { log } from "../lib/resilience";
import type { Env, Intent, TaskRequest } from "../types";

const MIN_PAYLOAD_LENGTH = 8;

/** Closed intent vocabulary used by both validation and parsing. */
export const ALLOWED_INTENTS: Intent[] = [
  "answer",
  "analyze_spec",
  "review_repo",
  "generate_code",
  "deploy",
  "git_operation",
  "generate_ui",
  "security_scan",
  "qa_check",
  "evolution_audit",
  "unclear",
];

/** Input completeness guard. This stays independent from routing so a future
 * selector cannot silently weaken the contract for structured inputs. */
export function checkTaskSufficiency(request: TaskRequest): string[] {
  const questions: string[] = [];

  if (request.gitOp) return questions;
  if (request.intent === "evolution_audit") return questions;
  if (request.intent === "answer") return questions; // Chat greetings like «привет» are valid
  if (request.qaOp && request.qaOp.type !== "coverage_gaps") return questions;

  if (!request.payload && !request.r2Key) {
    questions.push(
      "Пришли содержимое задачи: текст, ключ загруженного в AZRAIL_R2 файла (ZIP/PDF/DOCX), либо GitHub-репозиторий вида owner/name.",
    );
  }
  if (request.payload && request.payload.trim().length < MIN_PAYLOAD_LENGTH && !request.r2Key) {
    questions.push("Описание слишком короткое — уточни цель проекта или задачи.");
  }
  if ((request.inputType === "zip" || request.inputType === "pdf" || request.inputType === "docx") && !request.r2Key) {
    questions.push(`Для input_type="${request.inputType}" нужен r2Key — сначала загрузи файл в AZRAIL_R2.`);
  }
  if (request.inputType === "github" && !/^[\w.-]+\/[\w.-]+$/.test(request.payload ?? "")) {
    questions.push('Для input_type="github" payload должен быть в формате "owner/repo".');
  }
  return questions;
}

/** Intent selector: deterministic structural/form rules first, cheap model
 * classification only for genuinely ambiguous free text. */
export async function classifyTaskIntent(env: Env, request: TaskRequest): Promise<Intent> {
  if (request.gitOp) return "git_operation";
  if (request.qaOp) return "qa_check";
  if (request.designBrief || request.commitToBranch) return "generate_ui";

  if (request.inputType === "pdf") return "analyze_spec";
  if (request.inputType === "zip" || request.inputType === "github") return "review_repo";

  const quick = quickIntent(request.payload ?? "");
  if (quick) {
    log("info", "orchestrator.intent_by_form", { intent: quick });
    return quick;
  }

  try {
    const routed = await runModel<{ response?: string }>(
      env,
      "classify",
      {
        messages: [
          {
            role: "system",
            content:
              "Классифицируй запрос ровно одним словом из списка: answer, analyze_spec, review_repo, generate_code, deploy, git_operation, generate_ui, security_scan, qa_check, evolution_audit, unclear. " +
              "answer — если это ВОПРОС, а не поручение: просят объяснить, рассказать, сравнить, посоветовать, посчитать, оценить. Признак: ответом служит текст, а не изменение в проекте. " +
              "generate_code — если просят СОЗДАТЬ, написать, сделать, исправить или дополнить код, файлы, скрипт, проект. Признак: результатом служит изменение в файлах. Это самое частое поручение — выбирай его, когда просят сделать что-то в коде и никакая более узкая метка не подходит. " +
              "generate_ui — если просят интерфейс, компонент, экран, вёрстку. security_scan — если просят проверить безопасность, уязвимости, утечки ключей, зависимости. qa_check — если просят про тесты, покрытие, прогон CI, качество. evolution_audit — если просят аудит проекта целиком, что улучшить, что устарело, где узкие места. " +
              "unclear — только если запрос непонятен настолько, что даже тип неясен. Вопрос, на который есть ответ, — это answer, а не unclear. " +
              "Ответь только этим словом, без пояснений.",
          },
          { role: "user", content: (request.payload ?? "").slice(0, 2000) },
        ],
      },
      {
        complexity: "trivial",
        trace: taskTrace(request),
        validate: (out: { response?: string }) => {
          const text = extractText(out).toLowerCase();
          return ALLOWED_INTENTS.some((intent) => text.includes(intent))
            ? true
            : "ответ не содержит ни одной известной метки намерения";
        },
      },
    );
    const raw = extractText(routed.output).trim().toLowerCase();
    return ALLOWED_INTENTS.find((intent) => raw.includes(intent)) ?? "unclear";
  } catch (err) {
    log("error", "orchestrator.classify_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return "unclear";
  }
}
