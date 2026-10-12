/** Pure model-loop protocol extracted from ExecutionEngine.
 * No I/O belongs here: keeping parsing/history rendering deterministic makes
 * the later state-machine split measurable without changing runtime effects. */
export interface StepDecision {
  tool?: string;
  input?: Record<string, unknown>;
  reason?: string;
  done?: boolean;
  summary?: string;
  replan?: boolean;
}

export interface StepRecordView {
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  result: string;
}

export function renderHistory(history: StepRecordView[], fullTail = 4): string {
  if (!history.length) return "(шагов ещё не было)";
  return history
    .map((h, n) => {
      const head = `${n + 1}. ${h.tool}(${JSON.stringify(h.input)}) -> ${h.ok ? "ок" : "ОШИБКА"}`;
      if (n >= history.length - fullTail) return `${head}: ${h.result}`;
      if (!h.ok) return `${head}: ${h.result.slice(0, 200)}`;
      return `${head} (${h.result.length} символов, свёрнуто)`;
    })
    .join("\n");
}

export function parseDecision(text: string): StepDecision | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const attempt = (s: string): StepDecision | null => {
    try {
      const v = JSON.parse(s);
      if (!v || typeof v !== "object" || Array.isArray(v)) return null;
      const d = v as StepDecision;
      if (d.tool !== undefined && (typeof d.tool !== "string" || !d.tool)) return null;
      if (d.done !== undefined && typeof d.done !== "boolean") return null;
      if (d.replan !== undefined && typeof d.replan !== "boolean") return null;
      if (d.input !== undefined && (!d.input || typeof d.input !== "object" || Array.isArray(d.input))) return null;
      if (d.reason !== undefined && typeof d.reason !== "string") return null;
      if (d.summary !== undefined && typeof d.summary !== "string") return null;
      if (!d.tool && d.done !== true && d.replan !== true) return null;
      return d;
    } catch {
      return null;
    }
  };

  const direct = attempt(cleaned);
  if (direct) return direct;
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return attempt(cleaned.slice(start, i + 1));
    }
  }
  return null;
}
