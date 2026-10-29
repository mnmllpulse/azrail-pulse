import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { spawnCommand } from './lib/run-command.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim() || null;
const gates = [];

function record(name, critical, status, detail, extra = {}) {
  gates.push({ name, critical, status, detail, ...extra });
}

function run(name, command) {
  const started = Date.now();
  const result = spawnCommand(command, { encoding: 'utf8', env: { ...process.env, AZRAIL_QUALITY_GATE: '1' }, maxBuffer: 20 * 1024 * 1024 });
  const text = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n').trim();
  const tail = text.slice(-2500);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  record(name, true, result.status === 0 ? 'PASS' : 'FAIL', tail || `exit ${result.status}`, {
    command: command.join(' '),
    exit_code: result.status,
    duration_ms: Date.now() - started,
  });
}

function durableMediaJobs() {
  const path = 'verification/durable-media-jobs.json';
  if (!existsSync(path)) return 'Квитанции долгих задач музыки и видео нет.';
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  if (doc.status === 'VERIFIED' && doc.second_paid_launch_blocked === true) return '';
  return 'Квитанция не доказывает очередь и запрет второго платного запуска.';
}

run('repository', ['npm', 'run', 'repo:hygiene']);
run('config', ['npm', 'run', 'config:check']);
run('typecheck', ['npm', 'run', 'typecheck']);
run('lint', ['npm', 'run', 'lint']);
run('unit', ['npm', 'test']);
record('integration', true, 'NOT_RUN', 'Отдельной команды integration в пакете нет.');
run('security', ['npm', 'run', 'security:check']);
run('migrations', ['npm', 'run', 'migrations:check']);
run('build', ['npm', 'run', 'build:check']);
record('e2e', true, 'NOT_RUN', 'Живой браузерный прогон на staging не передан. Локальный отчёт его не заменяет.');
record('smoke', true, 'NOT_RUN', 'AZRAIL_URL и учётная запись для smoke не переданы.');
run('dependency', ['npm', 'run', 'dependency:check']);
run('release', ['npm', 'run', 'release:preflight']);
run('staging-snapshot', ['npm', 'run', 'staging:deploy:check']);
run('staging-drift', ['npm', 'run', 'cloud:drift:staging']);
run('production-drift', ['npm', 'run', 'production:drift:strict']);
run('slo', ['npm', 'run', 'slo:check']);
run('performance', ['npm', 'run', 'performance:budget']);
run('local-load', ['npm', 'run', 'local:load:check']);
run('rollout', ['npm', 'run', 'rollout:check']);
run('cloud-restore', ['npm', 'run', 'backup:restore:strict']);
const durableDetail = durableMediaJobs();
record('durable-jobs', true, durableDetail ? 'FAIL' : 'PASS', durableDetail || 'Квитанция долгих медиазадач принята.');

const criticalFailures = gates.filter((gate) => gate.critical && gate.status !== 'PASS');
const report = {
  release: pkg.version,
  commit,
  status: criticalFailures.length ? 'FAIL' : 'PASS',
  critical_failures: criticalFailures.length,
  production_approved: false,
  generated_at: new Date().toISOString(),
  mutation_policy: {
    cloudflare_write_performed: false,
    database_write_performed: false,
    deploy_performed: false,
  },
  gates,
};
mkdirSync('.work', { recursive: true });
writeFileSync('.work/production-certify.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`PRODUCTION CERTIFY ${report.status}: critical_failures=${report.critical_failures} release=${report.release} commit=${commit ?? 'none'}`);
for (const gate of criticalFailures) console.log(`CRITICAL ${gate.name} ${gate.status}`);
if (report.status !== 'PASS') process.exit(2);
