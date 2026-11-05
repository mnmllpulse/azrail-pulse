/** Контракт намерения для уже разобранного плана. Новую модель не вызывает. */

export type RiskLevel = 'low' | 'medium' | 'high';

export type IntentPart = {
  kind: string;
  text: string;
  wave: number;
  dependsOn: string[];
  worker?: string;
};

export type IntentContract = {
  goal: string;
  outputs: string[];
  constraints: string[];
  capabilities: string[];
  agents: string[];
  complexity: number;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  confidence: number;
  parallel: boolean;
};

const OUTPUT: Record<string, string> = {
  image: 'картинка',
  music: 'трек',
  video: 'раскадровка',
  web: 'страница',
  build: 'шаги миссии',
};

const RISK = /(?<!\p{L})(удал(и|ить|яй)|опублик|вылож|депло|оплат|списать)/iu;

export function intentFromParts(goal: string, parts: IntentPart[]): IntentContract {
  const work = parts.filter((part) => part.kind !== 'talk');
  const kinds = [...new Set(work.map((part) => part.kind))];
  const constraints: string[] = [];
  if (kinds.includes('video')) constraints.push('Ролик собирается кадрами на экране. Внешняя видеомодель не вызывается.');
  if (kinds.includes('music')) constraints.push('Трек собирается на устройстве, пока внешняя музыкальная модель не подключена.');
  if (kinds.includes('image')) constraints.push('Прозрачный фон закрыт.');
  constraints.push('Платные модели и платная съёмка не включаются.');
  const high = RISK.test(goal);
  const riskLevel: RiskLevel = high ? 'high' : kinds.includes('web') ? 'medium' : 'low';
  const parallel = work.some((part) => work.filter((other) => other.wave === part.wave).length > 1);
  return {
    goal: goal.trim().slice(0, 500),
    outputs: kinds.map((kind) => OUTPUT[kind] ?? kind),
    constraints,
    capabilities: kinds,
    agents: [...new Set(work.map((part) => part.worker || OUTPUT[part.kind] || part.kind))],
    complexity: Math.min(5, Math.max(1, work.length || 1)),
    riskLevel,
    requiresApproval: high,
    confidence: work.length ? 0.86 : 0.4,
    parallel,
  };
}

/** Одна фраза для полосы. Называет, кто работает и где граница. */
export function explainIntent(intent: IntentContract): string {
  const who = intent.agents.length ? intent.agents.join(' и ') : 'разговор';
  const how = intent.outputs.length < 2
    ? 'Одна часть.'
    : intent.parallel
      ? 'Независимые части идут рядом.'
      : 'Следующая часть ждёт предыдущую.';
  const risk = intent.requiresApproval
    ? 'Перед удалением, выкладкой или оплатой нужно отдельное подтверждение.'
    : intent.riskLevel === 'medium'
      ? 'Публикация страницы остаётся отдельной кнопкой.'
      : 'Отдельное подтверждение для этой фразы не требуется.';
  const limits = intent.constraints.filter((line) => !line.startsWith('Платные')).join(' ');
  return `Решение: ${who}. ${how} ${risk}${limits ? ` ${limits}` : ''}`.replace(/\s+/g, ' ').trim();
}
