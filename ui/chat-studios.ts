import type { AudioMeasurements } from './audio-analysis';
import type { DataAnalysis } from './data';

export type ChatStudioIntent = 'ledger' | 'pulse' | 'data' | 'audio' | null;

const LEDGER = /(?:сколько\s+(?:я\s+)?(?:потратил|потрачено|ушло|стоит)|расход|затрат|бюджет|ledger|леджер)/iu;
const PULSE = /(?:состояни[ея]\s+системы|статус\s+системы|как\s+(?:там\s+)?систем|health|здоровь[ея]\s+системы|что\s+с\s+системой)/iu;
const ANALYZE = /(?:проанализ|разбер|посчита|статистик|что\s+(?:в|за)\s|опиши|изучи|измер|loudness|лафс|громкост)/iu;
const TABLE = /\.(?:csv|tsv)$/i;
const AUDIO = /\.(?:wav|mp3|flac|ogg|m4a|aac|webm)$/i;

export function studioIntent(message: string, files: readonly { name: string }[]): ChatStudioIntent {
  const text = message.trim();
  if (!text || text.length > 300) return null;
  if (PULSE.test(text)) return 'pulse';
  if (LEDGER.test(text) && !/(?:напиши|сделай|создай|нарисуй)\s/iu.test(text)) return 'ledger';
  if (ANALYZE.test(text)) {
    if (files.some((file) => TABLE.test(file.name))) return 'data';
    if (files.some((file) => AUDIO.test(file.name))) return 'audio';
  }
  return null;
}

const usd = (micro: unknown) => typeof micro === 'number' ? `$${(micro / 1_000_000).toFixed(micro < 10_000 ? 6 : 2)}` : '—';
const num = (value: unknown, digits = 2) => typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 10 ** digits) / 10 ** digits) : '—';

type LedgerLike = {
  overview?: { todaySpendMicroUsd?: number; budget?: { limitMicroUsd?: number | null; committedMicroUsd?: number | null; scopeLabel?: string } };
  metrics?: { calls?: number; tokens?: number; errors?: number; retries?: number; uncertainCalls?: number; actualMicroUsd?: number };
  anomalies?: Array<{ severity?: string; message?: string }>;
};

export function ledgerSummary(report: LedgerLike): string {
  const budget = report.overview?.budget;
  const metrics = report.metrics;
  const lines = [
    `Расход сегодня: ${usd(report.overview?.todaySpendMicroUsd)}`,
    budget ? `Бюджет (${budget.scopeLabel ?? 'контур'}): лимит ${usd(budget.limitMicroUsd)}, занято ${usd(budget.committedMicroUsd)}` : '',
    metrics ? `Вызовы: ${num(metrics.calls, 0)}, токены: ${num(metrics.tokens, 0)}, ошибки: ${num(metrics.errors, 0)}, повторы: ${num(metrics.retries, 0)}, неопределённых: ${num(metrics.uncertainCalls, 0)}` : '',
  ].filter(Boolean);
  const anomalies = (report.anomalies ?? []).slice(0, 5);
  if (anomalies.length) lines.push('Аномалии:', ...anomalies.map((item) => `- ${item.severity ?? 'info'}: ${item.message ?? ''}`));
  else lines.push('Аномалий нет.');
  return lines.join('\n');
}

type PulseLike = { overall?: string; sections?: Array<{ title: string; items: Array<{ label: string; value: string; status: string }> }> };

export function pulseSummary(report: PulseLike): string {
  const lines = [`Состояние системы: ${report.overall ?? 'unknown'}`];
  for (const section of report.sections ?? []) {
    const bad = section.items.filter((item) => item.status !== 'healthy');
    lines.push(`${section.title}: ${section.items.length - bad.length}/${section.items.length} в норме`);
    for (const item of bad.slice(0, 4)) lines.push(`- ${item.label}: ${item.value} (${item.status})`);
  }
  return lines.join('\n');
}

export function dataSummary(name: string, analysis: DataAnalysis): string {
  const lines = [
    `Файл ${name}: ${analysis.rows} строк, ${analysis.columnCount} столбцов, разделитель ${analysis.delimiterLabel}.`,
    `Пропущено ячеек: ${analysis.missingCells}, дублей: ${analysis.duplicateRows}, пустых строк: ${analysis.emptyRows}, кривых строк: ${analysis.raggedRows}.`,
    '',
    '| Столбец | Тип | Заполнено | Уникальных | Мин | Среднее | Макс |',
    '|---|---|---|---|---|---|---|',
    ...analysis.columns.slice(0, 20).map((column) => `| ${column.name.replaceAll('|', '/')} | ${column.type} | ${column.filled} | ${column.unique} | ${num(column.min)} | ${num(column.mean)} | ${num(column.max)} |`),
  ];
  if (analysis.columns.length > 20) lines.push(`…и ещё ${analysis.columns.length - 20} столбцов.`);
  const issues = analysis.issues.filter((issue) => issue.severity === 'warning').slice(0, 5);
  if (issues.length) lines.push('', 'Замечания:', ...issues.map((issue) => `- ${issue.message} (${issue.count})`));
  return lines.join('\n');
}

export function audioSummary(name: string, m: AudioMeasurements): string {
  const mm = Math.floor(m.durationSeconds / 60);
  const ss = String(Math.round(m.durationSeconds % 60)).padStart(2, '0');
  return [
    `Файл ${name}: ${mm}:${ss}, ${m.sampleRate} Гц, каналов ${m.channels}.`,
    `Громкость: ${num(m.integratedLufs, 1)} LUFS, пик ${num(m.peakDbFS, 1)} дБFS, true peak ${num(m.truePeakDbTP, 1)} дБTP, динамика ${num(m.loudnessRangeLu, 1)} LU.`,
    `Темп: ${num(m.bpm, 0)} BPM, тональность: ${m.detectedKey ?? '—'}.`,
    `Клиппинг: ${num(m.clippedSamplePercent)}%, тишина: ${num(m.silencePercent)}%, ширина стерео: ${num(m.stereoWidthPercent, 0)}%.`,
    m.note ? `Метод: ${m.note}` : '',
  ].filter(Boolean).join('\n');
}
