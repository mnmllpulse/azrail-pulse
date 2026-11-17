import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnCommand } from './lib/run-command.mjs';

const BLOCKING = new Set(['high', 'critical']);
const GHSA = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i;
const EXCEPTIONS_FILE = 'config/audit-exceptions.json';

export function validateExceptions(list) {
  const errors = [];
  const seen = new Set();
  for (const [index, item] of (Array.isArray(list) ? list : []).entries()) {
    const label = `exceptions[${index}]`;
    if (!item || typeof item !== 'object') { errors.push(`${label}: не объект`); continue; }
    if (!GHSA.test(String(item.id ?? '')) || String(item.id).length !== 19) errors.push(`${label}: id должен быть GHSA-xxxx-xxxx-xxxx`);
    if (seen.has(String(item.id).toUpperCase())) errors.push(`${label}: дубликат ${item.id}`);
    seen.add(String(item.id).toUpperCase());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.expires ?? '')) || Number.isNaN(Date.parse(`${item.expires}T00:00:00Z`))) errors.push(`${label}: expires должен быть датой YYYY-MM-DD`);
    if (typeof item.reason !== 'string' || item.reason.trim().length < 40) errors.push(`${label}: reason обязателен (минимум 40 символов)`);
  }
  return errors;
}

export function evaluateAudit(report, exceptions, now = new Date()) {
  const advisories = new Map();
  for (const item of Object.values(report?.vulnerabilities ?? {})) {
    for (const via of Array.isArray(item?.via) ? item.via : []) {
      if (!via || typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = String(via.url ?? '').match(GHSA)?.[0]?.toUpperCase() ?? `source:${via.source ?? via.name}`;
      advisories.set(id, { id, name: via.name ?? '', title: via.title ?? '', severity: via.severity });
    }
  }
  const table = new Map(exceptions.map((item) => [String(item.id).toUpperCase(), item]));
  const blocking = [];
  const allowed = [];
  const expired = [];
  for (const advisory of advisories.values()) {
    const rule = table.get(advisory.id);
    if (!rule) blocking.push(advisory);
    else if (Date.parse(`${rule.expires}T23:59:59Z`) < now.getTime()) expired.push({ ...advisory, expires: rule.expires });
    else allowed.push({ ...advisory, expires: rule.expires });
  }
  const unused = [...table.keys()].filter((id) => !advisories.has(id));
  const counts = report?.metadata?.vulnerabilities ?? {};
  const reported = Number(counts.high ?? 0) + Number(counts.critical ?? 0);
  const unexplained = reported > 0 && advisories.size === 0;
  return { blocking, allowed, expired, unused, unexplained, ok: blocking.length === 0 && expired.length === 0 && !unexplained };
}

function main() {
  const config = JSON.parse(readFileSync(EXCEPTIONS_FILE, 'utf8'));
  const errors = validateExceptions(config.exceptions);
  if (errors.length) {
    for (const error of errors) console.error(`DEPENDENCY AUDIT CONFIG: ${error}`);
    process.exit(2);
  }
  const ran = spawnCommand(['npm', 'audit', '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let report;
  try { report = JSON.parse(ran.stdout || '{}'); } catch { report = {}; }
  if (report.error || !report.metadata?.vulnerabilities) {
    console.error(`DEPENDENCY AUDIT FAILED: реестр npm не ответил (${report.error?.summary ?? `exit ${ran.status}`}).`);
    process.exit(2);
  }
  const result = evaluateAudit(report, config.exceptions);
  for (const item of result.allowed) console.log(`ALLOWED ${item.severity} ${item.id} ${item.name} (исключение до ${item.expires})`);
  for (const id of result.unused) console.log(`UNUSED исключение ${id}: advisory больше не найдена, удали запись из ${EXCEPTIONS_FILE}`);
  for (const item of result.expired) console.error(`EXPIRED ${item.severity} ${item.id} ${item.name}: срок исключения истёк ${item.expires}`);
  for (const item of result.blocking) console.error(`BLOCKING ${item.severity} ${item.id} ${item.name}: ${item.title}`);
  if (result.unexplained) console.error('BLOCKING: npm audit сообщает high/critical, но advisory не распознаны');
  console.log(`DEPENDENCY AUDIT ${result.ok ? 'PASS' : 'FAIL'}: blocking=${result.blocking.length} expired=${result.expired.length} allowed=${result.allowed.length}`);
  if (!result.ok) process.exit(1);
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) main();
