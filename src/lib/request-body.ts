export class BodyLimitError extends Error {}

/** Stop consumption at the limit even when Content-Length is absent or forged. */
export async function readBoundedBody(request: Request | Response, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get("Content-Length")) > limit) throw new BodyLimitError("Тело запроса превышает лимит.");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        throw new BodyLimitError("Тело запроса превышает лимит.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** Common API shape guard; route-specific required-field checks remain in handlers. */
export function validateJsonObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ожидался JSON-объект.");
  const body = value as Record<string, unknown>;
  validateTaskFields(body);
  for (const key of ["message", "text", "goal", "payload", "projectId", "conversationId", "missionId", "preferredModel", "r2Key", "inputType", "intent", "note", "parentMessageId", "designBrief", "gitRepo", "commitToBranch", "architecturePlan"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") throw new Error(`Поле ${key} должно быть строкой.`);
  }
  for (const key of ["projectId", "conversationId", "missionId"]) {
    if (typeof body[key] === "string" && (body[key].length > 128 || !body[key].trim())) throw new Error(`Недопустимое поле ${key}.`);
  }
  if (body.confirm !== undefined && typeof body.confirm !== "boolean") throw new Error("confirm должно быть boolean.");
  if (body.only !== undefined && (!Array.isArray(body.only) || body.only.length > 100 || body.only.some(v => typeof v !== "string"))) throw new Error("only должно быть массивом строк.");
  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments) || body.attachments.length > 12) throw new Error("Допустимо не более 12 вложений.");
    for (const ref of body.attachments) {
      if (!ref || typeof ref !== "object" || typeof ref.fileName !== "string" || typeof ref.r2Key !== "string" ||
        (ref.mimeType !== undefined && typeof ref.mimeType !== "string")) throw new Error("Некорректное вложение.");
    }
  }
}

const INPUT_TYPES = ["text","json","zip","pdf","docx","code","image","audio","video","github"];
const INTENTS = ["answer","analyze_spec","review_repo","generate_code","deploy","git_operation","generate_ui","security_scan","qa_check","evolution_audit","unclear"];
function validateTaskFields(body: Record<string,unknown>): void {
  for(const key of ["_billingScope","userId"]) if(body[key]!==undefined) throw new Error(`Поле ${key} задаёт только сервер.`);
  if(body.inputType!==undefined&&!INPUT_TYPES.includes(String(body.inputType)))throw new Error("Неизвестный inputType.");
  if(body.intent!==undefined&&!INTENTS.includes(String(body.intent)))throw new Error("Неизвестный intent.");
  if(body.maxIterations!==undefined&&(!Number.isSafeInteger(body.maxIterations)||Number(body.maxIterations)<1))throw new Error("maxIterations должно быть положительным целым числом.");
  if(body.conversationHistory!==undefined){
    if(!Array.isArray(body.conversationHistory)||body.conversationHistory.length>50)throw new Error("Некорректная история диалога.");
    for(const item of body.conversationHistory)if(!item||!["user","assistant"].includes(item.role)||typeof item.content!=="string")throw new Error("Некорректная реплика диалога.");
  }
  const variants:Record<string,Record<string,string[]>> = {
    gitOp:{create_branch:["branch"],commit_file:["branch","path","content","message"],open_pr:["head","base","title"],diff:["base","head"],list_commits:[]},
    qaOp:{coverage_gaps:[],trigger_tests:["workflow"],latest_run:[],check_run:[]},
  };
  for(const key of ["gitOp","qaOp"]){
    if(body[key]===undefined)continue;
    const op=body[key] as Record<string,unknown>;
    if(!op||typeof op!=="object"||Array.isArray(op)||typeof op.type!=="string"||!Object.hasOwn(variants[key],op.type))throw new Error(`Некорректная операция ${key}.`);
    for(const field of ["branch","from","path","content","message","head","base","title","body","workflow","ref"])
      if(op[field]!==undefined&&typeof op[field]!=="string")throw new Error(`Поле ${key}.${field} должно быть строкой.`);
    for(const field of variants[key][op.type])if(typeof op[field]!=="string"||(field!=="content"&&!op[field]))throw new Error(`Требуется ${key}.${field}.`);
    if(op.type==="check_run"&&(!Number.isSafeInteger(op.runId)||Number(op.runId)<=0))throw new Error("Нужен положительный runId.");
    if(op.limit!==undefined&&(!Number.isSafeInteger(op.limit)||Number(op.limit)<=0||Number(op.limit)>100))throw new Error("limit: целое число от 1 до 100.");
  }
}
