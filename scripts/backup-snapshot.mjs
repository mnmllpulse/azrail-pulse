import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const target = 'verification/backup-restore-readonly-snapshot.json';
const drift = JSON.parse(readFileSync('verification/production-drift-readonly-snapshot.json', 'utf8'));
const live = drift.environments?.production?.d1_schema;
if (!live?.database_id || !live?.database_name) throw new Error('В снимке облака нет живой базы. Сначала: npm run cloud:snapshot');

const out = execFileSync('npx', ['wrangler', 'd1', 'time-travel', 'info', live.database_name, '--json'], { encoding: 'utf8', shell: process.platform === 'win32' });
const bookmark = out.match(/[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{32}/i)?.[0];
if (!bookmark) throw new Error('Закладка Time Travel не найдена в ответе wrangler.');

const snapshot = JSON.parse(readFileSync(target, 'utf8'));
const row = { environment: 'production', name: live.database_name, database_id: live.database_id, bookmark, http_status: 200 };
snapshot.databases = [row, ...snapshot.databases.filter((item) => item.environment !== 'production')];
snapshot.generated_at = new Date().toISOString();
snapshot.source = 'wrangler d1 time-travel info (только чтение)';
writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Закладка записана: ${live.database_name} ${bookmark}`);
