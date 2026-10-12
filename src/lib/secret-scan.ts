// AZRAIL — поиск утёкших секретов. Детерминированный regex-скан, БЕЗ модели:
// здесь нужна воспроизводимость и нулевой risk галлюцинации "найденного ключа".
// AI-ревью классов уязвимостей (XSS/SQLi/SSRF) уже живёт в Code Agent — здесь
// делается ровно то, чего модель сделать не может надёжно.

import type { GeneratedFile } from "../types";

interface SecretPattern {
  name: string;
  re: RegExp;
  severity: "critical" | "high" | "medium";
}

// Паттерны — только с характерными префиксами провайдеров. Универсальные
// "любая длинная строка" намеренно не берём: они дают лавину ложных
// срабатываний на хешах, base64-ассетах и минифицированном коде.
const GENERIC_TYPE = "Hardcoded secret assignment";

const PATTERNS: SecretPattern[] = [
  { name: "AWS Access Key ID", re: /\bAKIA[0-9A-Z]{16}\b/g, severity: "critical" },
  { name: "GitHub personal access token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, severity: "critical" },
  { name: "GitHub fine-grained PAT", re: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g, severity: "critical" },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, severity: "critical" },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, severity: "critical" },
  { name: "Stripe live secret key", re: /\bsk_live_[A-Za-z0-9]{20,}\b/g, severity: "critical" },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, severity: "high" },
  { name: "OpenAI API key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g, severity: "critical" },
  { name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, severity: "critical" },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, severity: "medium" },
  {
    name: GENERIC_TYPE,
    re: /\b(?:api[_-]?key|secret|password|token|passwd)\s*[:=]\s*["'`]([^"'`\s]{12,})["'`]/gi,
    severity: "high",
  },
];

// Файлы-образцы: там значения заведомо фиктивные, ругаться на них — шум.
const SAMPLE_FILE_RE = /(\.example$|\.sample$|\.template$|^example\.|\.md$)/i;

// Значения-плейсхолдеры: your-key-here, xxx, changeme, <...>, ${...} и т.п.
const PLACEHOLDER_RE =
  /^(?:your[_-]?|my[_-]?|test[_-]?|dummy[_-]?|fake[_-]?|sample[_-]?|example[_-]?|placeholder|changeme|xxx+|\.\.\.|\$\{|<|process\.env|import\.meta)/i;

export interface SecretFinding {
  file: string;
  line: number;
  type: string;
  severity: SecretPattern["severity"];
  /** Значение всегда замаскировано — полный секрет в ответ/логи не попадает */
  masked: string;
}

function mask(value: string): string {
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}${"*".repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
}

export function scanSecrets(files: GeneratedFile[]): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const file of files) {
    if (SAMPLE_FILE_RE.test(file.path)) continue;
    const lines = file.content.split("\n");

    lines.forEach((lineText, idx) => {
      for (const pattern of PATTERNS) {
        pattern.re.lastIndex = 0; // /g-регексы держат состояние между вызовами
        let m: RegExpExecArray | null;
        while ((m = pattern.re.exec(lineText)) !== null) {
          // Для "assignment"-паттерна значение в capture group, иначе — весь матч
          const value = m[1] ?? m[0];
          if (PLACEHOLDER_RE.test(value)) continue;
          findings.push({
            file: file.path,
            line: idx + 1,
            type: pattern.name,
            severity: pattern.severity,
            masked: mask(value),
          });
        }
      }
    });
  }

  return dedupe(findings);
}

/** Один и тот же секрет ловится и провайдерским паттерном, и общим
 *  "Hardcoded secret assignment" — в отчёте это дубль. Оставляем более
 *  специфичную находку: она точнее называет, что именно утекло. */
function dedupe(findings: SecretFinding[]): SecretFinding[] {
  const byLocation = new Map<string, SecretFinding>();
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.masked}`;
    const existing = byLocation.get(key);
    if (!existing || (existing.type === GENERIC_TYPE && f.type !== GENERIC_TYPE)) {
      byLocation.set(key, f);
    }
  }
  return [...byLocation.values()];
}
