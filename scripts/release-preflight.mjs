import { existsSync, readFileSync, readdirSync } from 'node:fs';

const fail = (message) => { console.error(`PRECHECK FAIL: ${message}`); process.exitCode = 1; };
const warn = (message) => console.warn(`PRECHECK WARN: ${message}`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const staging = JSON.parse(readFileSync('wrangler.staging.json', 'utf8'));
const production = JSON.parse(readFileSync('wrangler.production.json', 'utf8'));

const canonicalConfig = JSON.parse(readFileSync('config/environments.json', 'utf8'));
const activeLegacyConfigs = ['wrangler.json','wrangler.paid.json','wrangler.free.example.toml','deploy/free.json','deploy/paid.json'];
for (const file of activeLegacyConfigs) if (existsSync(file)) fail(`legacy config must not remain active: ${file}`);
if (canonicalConfig.schema_version !== 1) fail('config/environments.json schema_version must be 1');
for (const envName of ['staging','production']) {
  const env = canonicalConfig.environments?.[envName];
  if (!env?.config_file || !env?.d1?.database_id || !env?.kv?.id || !env?.r2?.bucket_name) fail(`${envName}: canonical environment model is incomplete`);
}
if (!pkg.scripts?.['config:generate'] || !pkg.scripts?.['config:check']) fail('canonical config generate/check scripts are missing');
if (!pkg.scripts?.['release:package'] || !pkg.scripts?.['release:verify']) fail('clean release package scripts are missing');
if (!pkg.scripts?.['studios:check']) fail('Studio architecture verification script is missing');
if (!pkg.scripts?.['approvals:check']) fail('Unified Approval Engine verification script is missing');
if (!pkg.scripts?.['events:check']) fail('Unified Event Stream verification script is missing');
if (!pkg.scripts?.['observability:check']) fail('Observability correlation verification script is missing');
if (!pkg.scripts?.['projects:check']) fail('Professional Projects verification script is missing');
if (!pkg.scripts?.['attachments:check']) fail('Attachment Manager verification script is missing');
if (!pkg.scripts?.['web:check']) fail('Web Studio verification script is missing');
if (!pkg.scripts?.['image:check']) fail('Image Studio verification script is missing');
if (!pkg.scripts?.['video:check']) fail('Video Studio verification script is missing');
if (!pkg.scripts?.['audio:check']) fail('Audio Lab verification script is missing');
if (!pkg.scripts?.['ableton:check']) fail('Ableton Lab verification script is missing');
if (!pkg.scripts?.['data:check']) fail('Data Studio verification script is missing');
if (!pkg.scripts?.['ledger:check']) fail('Ledger Studio verification script is missing');
if (!pkg.scripts?.['pulse:check']) fail('Pulse Lab verification script is missing');
if (!pkg.scripts?.['connections:check']) fail('Professional Connections verification script is missing');
if (!pkg.scripts?.['series:g:check'] || !pkg.scripts?.['series:g:live-e2e']) fail('Series G system intelligence/live E2E scripts are missing');
if (!pkg.scripts?.['cross:final']) fail('Final cross-cutting verification script is missing');
if (!pkg.scripts?.['node24:suite'] || !pkg.scripts?.['node24:suite:install'] || !pkg.scripts?.['node24:check']) fail('Node24 verification suite scripts are missing');
if (!pkg.scripts?.['staging:migration:check'] || !pkg.scripts?.['staging:migration:simulate'] || !pkg.scripts?.['db:migrate:staging:apply']) fail('staging migration preparation/apply scripts are missing');
if (!pkg.scripts?.['staging:deploy:check'] || !pkg.scripts?.['staging:deploy:plan'] || !pkg.scripts?.['deploy:staging:apply']) fail('staging deploy preparation/apply scripts are missing');
if (!pkg.scripts?.['production:drift:check'] || !pkg.scripts?.['production:drift:simulate'] || !pkg.scripts?.['production:drift:plan'] || !pkg.scripts?.['production:drift:strict']) fail('production drift reconciliation scripts are missing');
if (!pkg.scripts?.['production:approval:check'] || !pkg.scripts?.['production:approval:plan'] || !pkg.scripts?.['production:approval:authorize']) fail('production approval gate scripts are missing');
for (const file of ['verification/production-approval-readonly-snapshot.json','verification/production-approval-contract.json','docs/runbooks/PRODUCTION_APPROVAL_RU.md']) if (!existsSync(file)) fail(`production approval artifact missing: ${file}`);
for (const file of ['verification/production-drift-readonly-snapshot.json','verification/production-drift-contract.json','docs/runbooks/PRODUCTION_DRIFT_RECONCILIATION_RU.md']) if (!existsSync(file)) fail(`production drift artifact missing: ${file}`);
for (const file of ['verification/staging-deploy-readonly-snapshot.json','verification/staging-deploy-contract.json','docs/runbooks/STAGING_DEPLOY_RU.md']) if (!existsSync(file)) fail(`staging deploy artifact missing: ${file}`);
for (const file of ['verification/staging-migration-readonly-snapshot.json','verification/staging-migration-contract.json','docs/runbooks/STAGING_MIGRATION_RU.md']) if (!existsSync(file)) fail(`staging migration artifact missing: ${file}`);
if (!existsSync('release-manifest.json')) fail('release-manifest.json missing');

const cloudDrift = readFileSync('scripts/cloud-drift.mjs', 'utf8');
if (!cloudDrift.includes('mutation_free') || !cloudDrift.includes('policy.cors_wildcard') || !cloudDrift.includes('resource.d1.exists'))
  fail('Cloudflare drift detector must stay read-only and enforce release-critical config/resource checks');
if (!pkg.scripts?.['cloud:drift'] || !pkg.scripts?.['cloud:drift:staging'] || !pkg.scripts?.['cloud:drift:production'])
  fail('Cloudflare drift scripts are missing from package.json');
const schema = readFileSync('schema.sql', 'utf8');
const migrationFiles = new Set(readdirSync('migrations').filter((name) => /^\d{3}-.+\.sql$/.test(name)));

const router = readFileSync('src/lib/model-router.ts', 'utf8');
const billing = readFileSync('src/lib/billing.ts', 'utf8');
const workspaceHead = readFileSync('src/lib/workspace-head.ts', 'utf8');
if (!router.includes('ModelOutcomeUncertainError') || !router.includes('err instanceof TimeoutError'))
  fail('model timeout must stop retry/fallback when provider outcome is uncertain');
if (!billing.includes('invokeTimeoutMs') || !billing.includes("status='uncertain'"))
  fail('provider timeout must live inside the metering/accounting boundary');
if (!workspaceHead.includes('cleanupUnpublishedR2') || !workspaceHead.includes('workspace.publish_response_lost'))
  fail('workspace publish must verify D1 reference before deleting staged R2 objects');
if (!workspaceHead.includes('WHERE workspace_heads.prefix=?') || !workspaceHead.includes('workspace.cas_conflict_cleanup'))
  fail('workspace publish must use an optimistic CAS before replacing the active head');
if (!workspaceHead.includes('project_lock_leases') || !workspaceHead.includes('f.lease_id=?') || !workspaceHead.includes('f.fence_token=?'))
  fail('workspace head publication must atomically prove the current project fencing lease');
if (!workspaceHead.includes('workspace_publications') || !workspaceHead.includes('manifest_hash') || !workspaceHead.includes('immutable publication provenance'))
  fail('workspace publication must have immutable D1 provenance and a content manifest hash');
const missionGuard = readFileSync('src/core/mission-guard.ts', 'utf8');
if (!missionGuard.includes('env.AZRAIL_D1.batch([versionStmt,linkStmt])') || !missionGuard.includes('mission_snapshots'))
  fail('mission snapshot version and mission link must publish atomically in one D1 batch');
const upload = readFileSync('src/lib/upload.ts', 'utf8');
if (!upload.includes('upload.publish_response_lost') || !upload.includes('cleanupUnpublishedR2'))
  fail('upload publication must verify D1 ownership before deleting an ambiguous R2 object');
const studios = readFileSync('src/unified/studios.ts', 'utf8');
if (!studios.includes('studio.artifact_publish_response_lost') || !studios.includes("request.method==='DELETE'"))
  fail('studio artifact lifecycle must support safe publication recovery and owner deletion');
const backups = readFileSync('src/lib/backups.ts', 'utf8');
if (!backups.includes('MAX_BACKUPS_PER_PROJECT') || !backups.includes('backup.delete_response_lost'))
  fail('backup lifecycle must enforce retention and verify ambiguous delete outcomes');

const missionDelivery = readFileSync('src/lib/mission-delivery.ts', 'utf8');
const missionSnapshot = readFileSync('src/lib/mission-snapshot.ts', 'utf8');
const orchestrator = readFileSync('src/agents/orchestrator.ts', 'utf8');
const missionCoordinator = readFileSync('src/agents/mission-coordinator.ts', 'utf8');
const orchestratorIntent = readFileSync('src/agents/orchestrator-intent.ts', 'utf8');
const unifiedEntry = readFileSync('src/unified/entry.ts', 'utf8');
const projectExport = readFileSync('src/unified/project-export.ts', 'utf8');
const checkpoints = readFileSync('src/lib/checkpoints.ts', 'utf8');
const planner = readFileSync('src/core/planner.ts', 'utf8');
const recoveryState = readFileSync('src/lib/mission-recovery-state.ts', 'utf8');
const missionBaseline = readFileSync('src/lib/mission-baseline.ts', 'utf8');
const executionEngine = readFileSync('src/core/execution-engine.ts', 'utf8');
const projectControl = readFileSync('src/lib/project-control.ts', 'utf8');
const executionProtocol = readFileSync('src/core/execution-protocol.ts','utf8');
if (!executionEngine.includes('from "./execution-protocol"') || !executionProtocol.includes('export function parseDecision') || !executionProtocol.includes('export function renderHistory'))
  fail('Execution Engine protocol parsing/history rendering must be extracted into a pure module before deeper decomposition');
if (orchestrator.split('\n').length >= 550 || !orchestrator.includes('classifyTaskIntent(this.env, request)') || !orchestrator.includes('scheduleMission(missionHost(this, this.activeMissions), params)'))
  fail('Orchestrator shell must remain decomposed and below 550 lines');
if (!orchestratorIntent.includes('export async function classifyTaskIntent')) fail('Orchestrator intent selector module missing');
if (!missionDelivery.includes('payloadGoal!==authoritativeGoal') || !missionDelivery.includes('raw.projectId!==row.project_id'))
  fail('mission delivery payload must match authoritative mission project/goal');
if (!missionDelivery.includes('UPDATE mission_outbox SET delivered=0') || !missionDelivery.includes('mission_delivery_state') || !missionDelivery.includes('generation=generation+1') || !missionDelivery.includes('env.AZRAIL_D1.batch(['))
  fail('mission recovery must atomically re-arm the outbox and advance its delivery generation');
if (!missionDelivery.includes('EXISTS(SELECT 1 FROM mission_delivery_state WHERE mission_id=m.id)') || !missionDelivery.includes('EXISTS(SELECT 1 FROM mission_outbox WHERE mission_id=?)'))
  fail('mission recovery batch statements must share delivery/outbox eligibility and avoid partial generation mutation');
if (!missionDelivery.includes('markMissionDeliveryScheduled') || !missionDelivery.includes('generation=?'))
  fail('stale Durable Object delivery generations must not mark a recovered outbox delivered');
if (!missionDelivery.includes('claimMissionDelivery') || !missionDelivery.includes('mission_delivery_leases') || !missionDelivery.includes('expires_at<=?'))
  fail('mission delivery scheduling must use a bounded cross-process D1 lease');
if (!missionCoordinator.includes('loadMissionDelivery') || !missionCoordinator.includes('queueMissionRecovery') || !missionCoordinator.includes('deliveryGeneration') || !missionCoordinator.includes('final.generation !== deliveryGeneration'))
  fail('MissionCoordinator must fence stale scheduled tasks by durable delivery generation');
if (!missionSnapshot.includes("created_by_agent='execution-engine'") || !missionSnapshot.includes('project_versions'))
  fail('mission snapshot recovery must verify project/version provenance');
if (!unifiedEntry.includes("if(!response)throw new Error('No response generated')"))
  fail('unified entry must narrow the nullable response before secureResponse');
if (!projectExport.includes('const nextCursor=page.cursor') || !projectExport.includes('cursors.add(nextCursor)'))
  fail('project export cursor must be narrowed before reuse');

if (!checkpoints.includes('validateReplayableCheckpoints') || !checkpoints.includes('requiredApprovalCallIds'))
  fail('checkpoint replay must validate durable rows and approval evidence before recovery');
if (!checkpoints.includes('mission_tool_receipts') || !checkpoints.includes('receipt_attempt_id') || !checkpoints.includes("status='running'"))
  fail('tool checkpointing must keep an independent receipt and prevent completed-state downgrade');
if (!executionEngine.includes('mayHaveEffects,callId'))
  fail('execution telemetry callId must also identify the durable tool receipt');
if (!checkpoints.includes('quarantineStaleRunningToolReceipts') || !checkpoints.includes('RC13 always re-reads'))
  fail('stale running tool receipts must be quarantined and completion proof re-read before success');
if (!projectControl.includes('project_lock_leases') || !projectControl.includes('fenceToken') || !projectControl.includes('assertProjectLease'))
  fail('project writers must use a durable monotonic fencing lease');
if (!executionEngine.includes('await assertProjectLease(this.env,lease)'))
  fail('execution engine must prove the current project fence before side effects');
const r2Gc = readFileSync('src/lib/r2-gc.ts', 'utf8');
if (!r2Gc.includes('dryRun: true') || !r2Gc.includes('safeToApply: false') || !r2Gc.includes('referenceSetTruncated'))
  fail('R2 garbage collection must remain bounded dry-run with reference-set fail-closed state');
if (!r2Gc.includes('states = scopePrefixes(scope)') || !r2Gc.includes('orphan-кандидаты не вычисляются'))
  fail('R2 GC preview must scan scopes fairly and suppress candidates when the reference set is incomplete');
if (!r2Gc.includes('workspace_publications') || !r2Gc.includes('snapshots-v2/') || !r2Gc.includes('versions/'))
  fail('R2 GC reference model must protect immutable publications and legacy project namespaces');
const indexSource = readFileSync('src/index.ts', 'utf8');
if (!indexSource.includes('quarantineStaleRunningToolReceipts'))
  fail('scheduled recovery must quarantine abandoned running tool receipts');
if (!indexSource.includes('/api/admin/r2-gc') || !indexSource.includes('previewR2GarbageCollection'))
  fail('admin R2 GC preview route is missing');
const retentionPreview = readFileSync('src/lib/retention-preview.ts','utf8');
if (!retentionPreview.includes('safeToApply:false') || !retentionPreview.includes('keepNewest') || !indexSource.includes('/api/admin/retention-preview'))
  fail('version/studio retention must remain a bounded read-only preview');
if (!retentionPreview.includes('ROW_NUMBER() OVER') || !retentionPreview.includes('PARTITION BY project_id') || !retentionPreview.includes('PARTITION BY account_id'))
  fail('retention preview must rank newest records per project/account without global-owner starvation');
if (!retentionPreview.includes('unsafeReferencesSkipped') || !retentionPreview.includes('startsWith(`projects/${row.project_id}/`)') || !retentionPreview.includes('startsWith(`studio/${row.account_id}/`)'))
  fail('retention preview must reject cross-scope/corrupted R2 references');
const voiceAdapter = readFileSync('src/unified/voice.ts','utf8');
if (studios.includes('audio:[...bytes]') || voiceAdapter.includes('audio:[...') || !voiceAdapter.includes('function audioToBase64'))
  fail('Studio voice must use bounded binary Whisper input through SpeechToTextAdapter instead of expanding bytes into a JS number array');
if (!studios.includes('saveArtifactStream') || !studios.includes('request.body.pipeThrough(limiter)'))
  fail('Studio artifact uploads must stream to R2 through a byte-counting limiter');
if (!missionCoordinator.includes('requiredApprovalCallIds(replay)'))
  fail('waiting_approval recovery must derive connector approvals from validated checkpoints');
if (!planner.includes('export async function loadPlan') || !planner.includes('env.AZRAIL_D1.batch('))
  fail('planner must reload durable mission_steps and mutate multi-row state transactionally');
if (!recoveryState.includes('plan_revisions') || !recoveryState.includes('regression_retries') || !recoveryState.includes('loadMissionRecoveryState'))
  fail('restart-safe replan/regression budgets must live in mission_recovery_state');
if (!missionBaseline.includes('ON CONFLICT(mission_id) DO NOTHING') || !missionBaseline.includes('loadMissionTestBaseline'))
  fail('mission test baseline must use first-write-wins durable storage');
if (!executionEngine.includes('replay.length===0') || !executionEngine.includes('loadMissionTestBaseline') || !executionEngine.includes('claimPlanRevision') || !executionEngine.includes('claimRegressionRetry'))
  fail('execution recovery must reuse durable plan/baseline and restart-safe retry budgets');

const studioApp = readFileSync('ui/app.ts','utf8');
const studioRegistry = readFileSync('ui/studio-registry.ts','utf8');
const studioTypes = readFileSync('ui/studio-types.ts','utf8');
if (/if\s*\(\s*id\s*===\s*['"]/.test(studioApp) || !studioApp.includes('loadStudioModule(id)'))
  fail('Studio UI must stay registry-driven; per-studio branching is forbidden in ui/app.ts');
if (!studioTypes.includes('export type StudioModule=') || !studioTypes.includes('capabilities:readonly StudioCapability[]'))
  fail('StudioModule contract/capabilities missing');
for (const id of ['web','image','music','video','audio','als','data','ledger','lab','prose']) {
  if (!studioRegistry.includes(`${id}:()=>import('./studio-modules/${id}')`)) fail(`Studio registry lazy loader missing: ${id}`);
  if (!existsSync(`ui/studio-modules/${id}.ts`)) fail(`Studio module missing: ${id}`);
}

const musicStudio = readFileSync('ui/studio-modules/music.ts','utf8');
const musicEngine = readFileSync('ui/media.ts','utf8');
const musicBackend = readFileSync('src/lib/music-studio.ts','utf8');
for (const marker of ['Промпт','Genre','Mood','BPM','Key','Scale','Bars','Time signature','Pattern','Arrangement','Synth preset','>Generate<','Waveform','Piano Roll','Save session']) {
  if (!musicStudio.includes(marker)) fail(`Music Studio invariant missing: ${marker}`);
}
for (const marker of ['composeMusicSession','renderMusicSession','OfflineAudioContext','wavFromChannels','audio/midi']) {
  if (!musicEngine.includes(marker)) fail(`Music engine invariant missing: ${marker}`);
}
if (!readFileSync('ui/audio-codecs.ts','utf8').includes("type:'audio/wav'")) fail('Music engine invariant missing: audio/wav');
if (!musicBackend.includes('parseMusicSessionRequest') || !schema.includes('CREATE TABLE IF NOT EXISTS music_sessions')) fail('Professional Music Studio durable session contract missing');
if (!migrationFiles.has('024-professional-video-studio.sql')) fail('migration 024 file is missing');
const videoStudio = readFileSync('ui/video-studio-2.ts','utf8');
const videoBackend = readFileSync('src/lib/video-studio.ts','utf8');
const videoBackendV2 = readFileSync('src/lib/video-studio-2.ts','utf8');
for (const marker of ['Project Storyboard','Shot List','Scene Cards','Asset Library','Reference Video Board','Shot model','Camera','Keyframe controls','Voice-over track','Music track','SFX track','Automatic subtitles/captions','Color Grading','Render Queue','Proxy Preview','Video QA Agent','Export Profiles','Continuity Memory']) {
  if (!videoStudio.includes(marker)) fail(`Video Studio 2.0 invariant missing: ${marker}`);
}
for (const marker of ['parseVideoSessionRequest','parseVideoPlanRequest','buildVideoScenePlan','@cf/openai/gpt-oss-20b']) {
  if (!videoBackend.includes(marker)) fail(`Video Studio backend invariant missing: ${marker}`);
}
for (const marker of ['parseVideo2StoryboardRequest','VIDEO2_CAMERA_MOVES','VIDEO2_TRANSITIONS','VIDEO2_EXPORT_PROFILES']) {
  if (!videoBackendV2.includes(marker)) fail(`Video Studio 2.0 backend invariant missing: ${marker}`);
}
if (!schema.includes('CREATE TABLE IF NOT EXISTS video_sessions') || !schema.includes('CREATE TABLE IF NOT EXISTS video_storyboards')) fail('Professional Video Studio durable session/storyboard contract missing');
const metatronUi = readFileSync('ui/metatron-lab.ts','utf8');
const metatronOps = readFileSync('src/lib/metatron-ops.ts','utf8');
for (const marker of ['Live Mission Graph','Agent Cards','Trace Explorer','Checkpoint System / Mission Replay','Human Approval Nodes','Fault Injection Lab · SIMULATION ONLY','Memory Inspector','Decision Explanation Panel']) {
  if (!metatronUi.includes(marker)) fail(`Metatron Lab 2.0 UI invariant missing: ${marker}`);
}
for (const marker of ["mode:'derived-linear'","mode:'fail-closed'",'retryFailedStep','simulateMissionFault','mission_memory_reads','mission_decisions']) {
  if (!metatronOps.includes(marker)) fail(`Metatron Lab 2.0 runtime invariant missing: ${marker}`);
}
for (const marker of ['CREATE TABLE IF NOT EXISTS mission_controls','CREATE TABLE IF NOT EXISTS mission_agent_runtime','CREATE TABLE IF NOT EXISTS mission_decisions','CREATE TABLE IF NOT EXISTS mission_memory_reads','CREATE TABLE IF NOT EXISTS mission_fault_runs']) {
  if (!schema.includes(marker)) fail(`Metatron Lab 2.0 durable schema invariant missing: ${marker}`);
}

const audioLab = readFileSync('ui/audio-analysis.ts','utf8');
const audioStudioUi = readFileSync('ui/studio-modules/audio.ts','utf8');
for (const marker of ['integratedLufs','shortTermLufsMax','loudnessRangeLu','truePeakDbTP','stereoWidthPercent','silencePercent','dcOffsetPercent','spectrogram','bpmConfidence','keyConfidence']) {
  if (!audioLab.includes(marker)) fail(`Audio Lab invariant missing: ${marker}`);
}
for (const marker of ['Integrated LUFS','Short-term LUFS','Loudness Range','True Peak','Waveform','Spectrogram','Reference Comparison']) {
  if (!audioStudioUi.includes(marker)) fail(`Audio Lab UI invariant missing: ${marker}`);
}


for (const marker of ['CREATE TABLE IF NOT EXISTS event_integrity','event_hash TEXT NOT NULL UNIQUE','idx_event_integrity_scope_prev']) {
  if (!schema.includes(marker)) fail(`event integrity schema invariant missing: ${marker}`);
}

const universalModuleFrame = readFileSync('ui/components/module-frame.ts','utf8');
for (const marker of ['ModuleDefinition','registerUniversalModuleAction','undoStack','redoStack','ModuleHistoryEntry','setResourceUsage','ModuleShortcut','const sourceNodes=[...host.childNodes]','if(options.canDuplicate&&options.onDuplicate)','if(options.canDelete&&options.onDelete)']) {
  if (!universalModuleFrame.includes(marker)) fail(`Universal Module System 2.0 invariant missing: ${marker}`);
}

const seriesG = readFileSync('src/lib/series-g.ts','utf8');
const seriesGRoute = readFileSync('src/unified/system-intelligence.ts','utf8');
const seriesGLive = readFileSync('scripts/series-g-live-e2e.mjs','utf8');
for (const marker of ['rankSystemSuggestions','MEMORY_SCOPE_ORDER','undoContract','REAL_E2E_JOURNEYS','BROWSER_QA_REQUIRED_CHECKS']) if (!seriesG.includes(marker)) fail(`Series G core invariant missing: ${marker}`);
for (const marker of ['/api/studio/system/suggestions','/api/studio/system/history','/api/studio/system/readiness','staticPreviewIsRealBrowser:false']) if (!seriesGRoute.includes(marker)) fail(`Series G route invariant missing: ${marker}`);
for (const marker of ['remote-debugging-port=0','Accessibility.getFullAXTree','AZRAIL_URL','SERIES G LIVE PROOF BLOCKED']) if (!seriesGLive.includes(marker)) fail(`Series G live proof invariant missing: ${marker}`);
const crossCutting = readFileSync('scripts/check-cross-cutting-final.mjs','utf8');
const universalCompare = readFileSync('ui/components/universal-compare.ts','utf8');
for (const marker of ['openUniversalCompareCenter','A и B должны быть разными','Web Studio → Changes/Versions']) if (!universalCompare.includes(marker)) fail(`Universal Compare invariant missing: ${marker}`);
for (const marker of ['Fix critical','Fix all safe issues','Review manually','safeAutoFix===true']) if (!readFileSync('ui/app.ts','utf8').includes(marker)) fail(`Professional Review invariant missing: ${marker}`);
if (!crossCutting.includes('CROSS-CUTTING FINAL PASS')) fail('Final cross-cutting gate body is missing');

const qualityGate = readFileSync('scripts/quality-gate.mjs','utf8');
const packageScripts = pkg.scripts ?? {};
for (const name of ['repo:exhaustive','repo:hygiene','staging:auto-deploy:check','staging:auto-health','dependency:audit','lint','format:check','security:check','studios:check','approvals:check','events:check','observability:check','projects:check','attachments:check','web:check','image:check','music:check','video:check','audio:check','ableton:check','data:check','ledger:check','pulse:check','connections:check','series:f:metatron','series:f:modules','series:g:check','series:g:live-e2e','cross:final','staging:migration:check','staging:migration:simulate','db:migrate:staging:apply','staging:deploy:check','staging:deploy:plan','deploy:staging:apply','quality:static','quality']) {
  if (!packageScripts[name]) fail(`Quality Gate script missing: ${name}`);
}
for (const status of ['VERIFIED','UNVERIFIED','BLOCKED','FAILED']) if (!qualityGate.includes(status)) fail(`Quality Gate status missing: ${status}`);
if (!executionEngine.includes('quality:{status:"unverified"') || !executionEngine.includes('quality:{status:"failed"'))
  fail('Execution Engine must distinguish unverified and failed executable verification');
const missionState = readFileSync('src/lib/mission-state.ts', 'utf8');
const terminalLine = missionState.split('\n').find((line) => line.includes('TERMINAL_STATUSES')) ?? '';
if (terminalLine.includes('waiting_approval'))
  fail('waiting_approval must remain suspended, not terminal');
if (!terminalLine.includes('unverified')) fail('unverified must remain a terminal non-green completion state');
if (!missionState.includes('result.quality?.status === "verified" ? "completed" : "unverified"')) fail('completed must require verified quality');
if (!billing.includes('ProviderOutcomeUncertainError') || !router.includes('ProviderOutcomeUncertainError'))
  fail('ambiguous provider transport failures must stop automatic retry/fallback');
const versions = readFileSync('src/lib/versions.ts', 'utf8');
if (!backups.includes('seenCursors') || !versions.includes('seenCursors'))
  fail('R2 pagination loops must detect repeated cursors instead of looping forever');
const migrate = readFileSync('scripts/migrate.mjs', 'utf8');
if (!migrate.includes('readdirSync(migrationDir)') || !migrate.includes('/^\\d{3}-.+\\.sql$/')) fail('migration planner must dynamically discover numbered migration files');
for (const table of ['mission_recovery_state','mission_test_baselines']) {
  if (!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`schema.sql: ${table} missing`);
}
if (!migrationFiles.has('011-recovery-state.sql')) fail('migration 011 file is missing');
if (!schema.includes('CREATE TABLE IF NOT EXISTS mission_tool_receipts')) fail('schema.sql: mission_tool_receipts missing');
if (!migrationFiles.has('012-tool-receipts-r2-gc.sql')) fail('migration 012 file is missing');
if (!schema.includes('CREATE TABLE IF NOT EXISTS project_lock_counters') || !schema.includes('CREATE TABLE IF NOT EXISTS project_lock_leases'))
  fail('schema.sql: RC13 project fencing tables missing');
if (!migrationFiles.has('013-project-fencing-receipt-recovery.sql')) fail('migration 013 file is missing');
if (!schema.includes('CREATE TABLE IF NOT EXISTS mission_delivery_state')) fail('schema.sql: mission_delivery_state missing');
if (!migrationFiles.has('014-delivery-workspace-retention.sql')) fail('migration 014 file is missing');
if (!schema.includes('CREATE TABLE IF NOT EXISTS mission_delivery_leases') || !schema.includes('CREATE TABLE IF NOT EXISTS workspace_publications'))
  fail('schema.sql: RC15 delivery lease/publication tables missing');
if (!migrationFiles.has('015-delivery-lease-publication-contract.sql')) fail('migration 015 file is missing');
if (!migrationFiles.has('016-schema-migrations-ledger.sql')) fail('migration 016 file is missing');
if (!migrationFiles.has('017-unified-approval-engine.sql')) fail('migration 017 file is missing');
if (!migrationFiles.has('018-unified-event-stream.sql')) fail('migration 018 file is missing');
if (!migrationFiles.has('019-observability-trace-links.sql')) fail('migration 019 file is missing');
if (!migrationFiles.has('020-professional-projects.sql')) fail('migration 020 file is missing');
if (!migrationFiles.has('030-event-integrity-chain.sql')) fail('migration 030 file is missing');
if (!migrationFiles.has('031-product-intelligence.sql')) fail('migration 031 file is missing');
if (!migrationFiles.has('032-music-daw-import.sql')) fail('migration 032 file is missing');
if (!migrationFiles.has('033-video-studio-2.sql')) fail('migration 033 file is missing');
if (!migrationFiles.has('034-metatron-lab-2.sql')) fail('migration 034 file is missing');
if (!migrationFiles.has('035-series-g-system-intelligence.sql')) fail('migration 035 file is missing');
for (const marker of ['CREATE TABLE IF NOT EXISTS project_profiles','pinned INTEGER NOT NULL DEFAULT 0','duplicated_from TEXT','CREATE TABLE IF NOT EXISTS studio_artifact_projects','artifact_id TEXT PRIMARY KEY','project_id TEXT NOT NULL']) {
  if (!schema.includes(marker)) fail(`Professional Projects schema invariant missing: ${marker}`);
}
const projectCenter = readFileSync('src/lib/project-center.ts','utf8');
const projectRoute = readFileSync('src/unified/projects.ts','utf8');
const projectsUi = readFileSync('ui/projects.ts','utf8');
for (const marker of ['listProjects','createProject','updateProject','duplicateProject','projectDetails','MAX_DUPLICATE_FILES=400','MAX_DUPLICATE_BYTES=16*1024*1024']) {
  if (!projectCenter.includes(marker)) fail(`Professional Projects center invariant missing: ${marker}`);
}
if (!projectRoute.includes('X-AZRAIL-Confirm-Project') || !projectRoute.includes("request.method==='DELETE'")) fail('Project delete must remain exact-confirmation gated');
if (!projectsUi.includes('project-search') || !projectsUi.includes('project-menu') || !projectsUi.includes('Экспорт ZIP')) fail('Professional Projects UI controls are incomplete');

const attachmentManager = readFileSync('ui/attachment-manager.ts','utf8');
for (const marker of ['MAX_FILES=12','MAX_BYTES=50*1024*1024','/api/upload','FormData',"state='failed'",'Повторить']) {
  if (!attachmentManager.includes(marker)) fail(`Attachment Manager invariant missing: ${marker}`);
}
const appUi = readFileSync('ui/app.ts','utf8');
if (appUi.includes('attachmentsText')) fail('Attachment Manager must not inline file text into prompt');
for (const marker of ['attachmentManager.hasPending()','attachmentManager.hasFailed()','attachments:attachmentRefs']) {
  if (!appUi.includes(marker)) fail(`Attachment composer invariant missing: ${marker}`);
}

const webWorkbench = readFileSync('ui/web-workbench.ts','utf8');
const webWorkbenchBackend = readFileSync('src/lib/web-workbench.ts','utf8');
for (const marker of ['Files','Preview','Changes','Tests','Logs','Versions','Content-Security-Policy','Restore → new revision']) {
  if (!webWorkbench.includes(marker)) fail(`Web Studio invariant missing: ${marker}`);
}
for (const marker of ['withProjectLock','publishWorkspace','actionType:"delete_file"','actionType:"restore"','workspace_snapshot','expectedSha256']) {
  if (!webWorkbenchBackend.includes(marker)) fail(`Web Studio backend invariant missing: ${marker}`);
}
if (!schema.includes('CREATE TABLE IF NOT EXISTS workspace_snapshots')) fail('schema.sql: workspace_snapshots missing');
if (!migrationFiles.has('022-image-studio.sql')) fail('migration 022 file is missing');
for (const marker of ['CREATE TABLE IF NOT EXISTS image_generations','artifact_id TEXT NOT NULL UNIQUE','reference_artifact_id TEXT','idx_image_generations_project']) {
  if (!schema.includes(marker)) fail(`Image Studio schema invariant missing: ${marker}`);
}
const imageStudio = readFileSync('src/lib/image-studio.ts','utf8');
const imageStudioUi = readFileSync('ui/studio-modules/image.ts','utf8')+'\n'+readFileSync('ui/image-studio-2.ts','utf8');
for (const marker of ['parseImageStudioRequest','selectImageModel','flux-2-klein-4b','flux-2-klein-9b','input_image_0',"form.append('seed'"]) {
  if (!imageStudio.includes(marker)) fail(`Image Studio backend invariant missing: ${marker}`);
}
for (const marker of ['Aspect ratio','Resolution','Style','Seed','Variations','History / Variants','Use as reference','Create variation','Upscale','Metadata','Image model','AUTO router','Reference Board','Mask Editor','Export Center']) {
  if (!imageStudioUi.includes(marker)) fail(`Image Studio UI invariant missing: ${marker}`);
}


if (!migrationFiles.has('025-professional-ableton-lab.sql')) fail('migration 025 file is missing');
if (!migrationFiles.has('026-professional-data-studio.sql')) fail('migration 026 file is missing');
if (!migrationFiles.has('027-professional-ledger-studio.sql')) fail('migration 027 file is missing');
for (const marker of ['CREATE TABLE IF NOT EXISTS model_call_dimensions','provider TEXT NOT NULL','route_attempt INTEGER NOT NULL','retry_attempt INTEGER NOT NULL','ON DELETE CASCADE']) {
  if (!schema.includes(marker)) fail(`Professional Ledger schema invariant missing: ${marker}`);
}
const ledgerBackend = readFileSync('src/lib/ledger-studio.ts','utf8');
const ledgerUi = readFileSync('ui/ledger-studio.ts','utf8');
for (const marker of ['parseLedgerFilters','buildLedgerReport','todaySpendMicroUsd','latencyP95Ms','spend_growth','provider invoices']) {
  if (!ledgerBackend.includes(marker)) fail(`Professional Ledger backend invariant missing: ${marker}`);
}
for (const marker of ["Today's Spend",'Budget','Remaining','Provider','Agent','Retries','Uncertain','Export CSV','Export JSON','Anomaly detector']) {
  if (!ledgerUi.includes(marker)) fail(`Professional Ledger UI invariant missing: ${marker}`);
}
for (const marker of ['CREATE TABLE IF NOT EXISTS ableton_analyses','source_artifact_id TEXT','report_json TEXT NOT NULL','report_truncated INTEGER NOT NULL','idx_ableton_analyses_project']) {
  if (!schema.includes(marker)) fail(`Ableton Lab schema invariant missing: ${marker}`);
}
const abletonEngine = readFileSync('src/lib/ableton-lab.ts','utf8');
const abletonUi = readFileSync('ui/ableton-lab.ts','utf8');
for (const marker of ['sceneCount','clipCount','pluginCount','automationEnvelopeCount','routingLoops','sidechainTopology','missingPlugins','missingSamples','masterChain','ALS_XML_LIMIT']) {
  if (!abletonEngine.includes(marker)) fail(`Ableton Lab engine invariant missing: ${marker}`);
}
for (const marker of ['Missing plugins','Missing samples','Duplicated processing','Routing loops','Sidechain topology','Gain staging warnings','CPU-heavy devices','Frozen tracks','Inactive devices']) {
  if (!abletonUi.includes(marker)) fail(`Ableton Lab UI invariant missing: ${marker}`);
}
if (!readFileSync('src/unified/studios.ts','utf8').includes('verification.ableton.analysis_completed')) fail('Ableton Lab must emit a unified verification event');

for (const marker of ['CREATE TABLE IF NOT EXISTS trace_links','request_id TEXT NOT NULL','trace_id TEXT NOT NULL','tool_call_id TEXT','approval_id TEXT','connector_call_id TEXT','model_call_id TEXT','idx_trace_links_trace']) {
  if (!schema.includes(marker)) fail(`Observability trace schema invariant missing: ${marker}`);
}
const observability = readFileSync('src/lib/observability-context.ts','utf8');
for (const marker of ['TraceContext','requestTrace','taskTrace','childTrace','linkTrace','listTraceLinks','observability.link_failed']) {
  if (!observability.includes(marker)) fail(`Observability context invariant missing: ${marker}`);
}
if (!indexSource.includes('observability\\/traces') || !indexSource.includes('X-Trace-Id')) fail('trace lookup/response correlation contract missing');
for (const marker of ['CREATE TABLE IF NOT EXISTS event_stream','seq INTEGER PRIMARY KEY AUTOINCREMENT','idx_event_stream_project_seq','idx_event_stream_mission_seq']) {
  if (!schema.includes(marker)) fail(`Unified Event Stream schema invariant missing: ${marker}`);
}
const eventStream = readFileSync('src/lib/event-stream.ts','utf8');
for (const marker of ['emitEvent','listProjectEvents','listMissionStream']) {
  if (!eventStream.includes(marker)) fail(`Unified Event Stream invariant missing: ${marker}`);
}
if (!eventStream.includes('ORDER BY e.seq ASC') && !eventStream.includes('ORDER BY seq ASC')) fail('Unified Event Stream invariant missing: monotonic seq ordering');
const eventStore = readFileSync('src/lib/event-store.ts','utf8');
if (eventStore.includes('INSERT INTO mission_events')) fail('new mission events must use event_stream, not legacy mission_events');
if (!orchestrator.includes('{type:"event_stream", event:payload.streamEvent}')) fail('Orchestrator must deliver the unified event_stream envelope');
for (const table of ['approval_requests','approval_receipts']) {
  if (!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`schema.sql: ${table} missing`);
}
const approvalEngine = readFileSync('src/lib/approval-engine.ts','utf8');
const approvalTypes = readFileSync('src/lib/approval-types.ts','utf8');
for (const action of ['delete_file','external_write','connector_mutation','github_pr','deployment','production_migration','restore','secret_rotation']) {
  if (!approvalTypes.includes(`"${action}"`)) fail(`Unified Approval action missing: ${action}`);
}
for (const marker of ['approvalDigest','requestApproval','decideApproval','claimApproval','completeApproval','approval_receipts']) {
  if (!approvalEngine.includes(marker)) fail(`Unified Approval Engine invariant missing: ${marker}`);
}
const gitAgent = readFileSync('src/agents/git-agent.ts','utf8');
const deployAgent = readFileSync('src/agents/deploy-agent.ts','utf8');
const connectorGateway = readFileSync('src/unified/connectors.ts','utf8');
if (!gitAgent.includes('actionType: "github_pr"') || !gitAgent.includes('actionType: "external_write"')) fail('Git writes/PR must stay approval-gated');
if (!deployAgent.includes('actionType: "deployment"')) fail('deployment agent must stay approval-gated');
if (!connectorGateway.includes("actionType:'connector_mutation'")) fail('connector mutation must stay approval-gated');
if (!indexSource.includes('actionType:"restore"')) fail('backup restore must stay approval-gated');
if (!schema.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) fail('schema.sql: schema_migrations missing');
for (const marker of ['version TEXT PRIMARY KEY','filename TEXT NOT NULL UNIQUE','checksum TEXT NOT NULL','applied_at TEXT NOT NULL','applied_by TEXT NOT NULL','duration_ms INTEGER NOT NULL','status TEXT NOT NULL']) {
  if (!schema.includes(marker)) fail(`schema.sql: migration ledger missing ${marker}`);
}
for (const marker of ['createHash','checksum mismatch for already-applied migration','migration-plan.json','legacy-baseline','Schema and migration ledger verified']) {
  if (!migrate.includes(marker)) fail(`migration planner invariant missing: ${marker}`);
}
const migration013 = readFileSync('migrations/013-project-fencing-receipt-recovery.sql','utf8');
if (!migration013.includes('INSERT OR IGNORE INTO project_lock_leases') || !migration013.includes('legacy:'))
  fail('migration 013 must preserve legacy operation locks during fencing upgrade');
const migration012 = readFileSync('migrations/012-tool-receipts-r2-gc.sql','utf8');
if (!migration012.includes('INSERT OR IGNORE INTO mission_tool_receipts') || !migration012.includes("'legacy:' || mission_id"))
  fail('migration 012 must backfill receipt provenance for existing checkpoints');
for (const table of ['model_call_budget_scopes','connector_reconciliations']) {
  if (!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`schema.sql: ${table} missing`);
}
if (!migrationFiles.has('010-reconciliation-hardening.sql')) fail('migration 010 file is missing');

if (!migrationFiles.has('028-pulse-lab-release-evidence.sql')) fail('migration 028 Pulse Lab release evidence file is missing');
const pulseLab = readFileSync('src/lib/pulse-lab.ts','utf8');
const pulseUi = readFileSync('ui/pulse-lab.ts','utf8');
for (const marker of ['buildPulseControlReport','mutationFree:true','paidModelCalls:false','release_evidence','MODEL_REGISTRY.length']) {
  if (!pulseLab.includes(marker)) fail(`Pulse Lab backend invariant missing: ${marker}`);
}
for (const marker of ['SYSTEM','AUTH','STORAGE','AI','RUNTIME','RELEASE','HEALTH','READ ONLY · NO MODEL CALLS']) {
  if (!pulseUi.includes(marker)) fail(`Pulse Lab UI invariant missing: ${marker}`);
}
if (/env\.AI\.run|AZRAIL_QUEUE\.send|cloudflare\.request/.test(pulseLab + pulseUi)) fail('Pulse Lab must not create synthetic paid traffic or control-plane mutations');

const placeholder = (v) => typeof v === 'string' && (/^0+$/.test(v.replaceAll('-', '')) || v.includes('00000000-0000-0000-0000-000000000000'));
const positiveNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const httpsUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash;
  } catch { return false; }
};

if (!/^1\.5\.0-rc\.\d+$/.test(pkg.version)) fail(`unexpected release version ${pkg.version}`);
if (pkg.scripts?.deploy && !pkg.scripts.deploy.includes('disabled')) fail('generic deploy script must stay disabled in an RC');
if (pkg.scripts?.['deploy:production'] && !pkg.scripts['deploy:production'].includes('disabled')) fail('production deploy must stay disabled in an RC');
if (pkg.scripts?.['db:schema'] && !pkg.scripts['db:schema'].includes('disabled')) fail('direct remote db:schema mutation must stay disabled in an RC');
if (pkg.scripts?.['db:security'] && !pkg.scripts['db:security'].includes('disabled')) fail('direct remote db:security mutation must stay disabled in an RC');

const guardedFiles = [
  ['scripts/deploy-ci.mjs','AZRAIL_ALLOW_CLOUD_MUTATION'],
  ['scripts/provision.mjs','AZRAIL_ALLOW_CLOUD_MUTATION'],
  ['scripts/migrate.mjs','AZRAIL_ALLOW_CLOUD_MUTATION'],
];
for (const [file, marker] of guardedFiles) {
  if (!readFileSync(file, 'utf8').includes(marker)) fail(`${file}: mutation interlock missing`);
}

for (const [label, cfg] of [['staging', staging], ['production', production]]) {
  if (!cfg.name || !cfg.main) fail(`${label}: missing name/main`);
  const d1 = cfg.d1_databases?.[0];
  const kv = cfg.kv_namespaces?.[0];
  const r2 = cfg.r2_buckets?.[0];
  if (!d1 || placeholder(d1.database_id)) fail(`${label}: invalid D1 binding`);
  if (!kv || placeholder(kv.id)) fail(`${label}: invalid KV binding`);
  if (!r2?.bucket_name) fail(`${label}: invalid R2 binding`);
  if (cfg.vars?.AUTH_MODE !== 'oidc') fail(`${label}: AUTH_MODE must be oidc`);
  if (cfg.observability?.enabled !== true) fail(`${label}: observability must be enabled`);
  if (cfg.vars?.AZRAIL_METERING !== 'enforce') fail(`${label}: metering must fail closed/enforce in release config`);
  if (!positiveNumber(cfg.vars?.AZRAIL_MISSION_BUDGET_USD)) fail(`${label}: mission budget must be a positive number`);
}

if (staging.name === production.name) fail('staging and production Worker names must differ');
if (staging.d1_databases[0].database_id === production.d1_databases[0].database_id) fail('staging/production D1 must differ');
if (staging.kv_namespaces[0].id === production.kv_namespaces[0].id) fail('staging/production KV must differ');
if (staging.r2_buckets[0].bucket_name === production.r2_buckets[0].bucket_name) fail('staging/production R2 must differ');

const stagingBudget = positiveNumber(staging.vars?.AZRAIL_MISSION_BUDGET_USD);
const productionBudget = positiveNumber(production.vars?.AZRAIL_MISSION_BUDGET_USD);
if (stagingBudget !== null && productionBudget !== null && !(stagingBudget < productionBudget)) {
  fail(`staging budget (${stagingBudget}) must be lower than production (${productionBudget})`);
}

if (!staging.vars?.OIDC_CLIENT_ID?.trim()) fail('staging: OIDC_CLIENT_ID missing; deploying this config would remove the current binding');
if (!httpsUrl(staging.vars?.OIDC_ISSUER)) fail('staging: OIDC_ISSUER must be a clean HTTPS URL');

// Production OIDC values are intentionally not guessed. The currently deployed
// production Worker does not expose them as plain-text bindings, so the RC cannot
// prove what the correct production client should be. Deployment remains locked;
// the deployment pipeline must inject/verify them before release.
if (!production.vars?.OIDC_CLIENT_ID || !production.vars?.OIDC_ISSUER) {
  warn('production OIDC client/issuer are not pinned in the ZIP; production deployment remains blocked until they are explicitly verified and injected');
}


const corsSource = readFileSync('src/lib/cors.ts','utf8');
if (/CORS_ORIGIN\s*\|\|\s*["']\*["']/.test(corsSource)) fail('CORS wildcard fallback must not exist in release source');
for (const marker of ['corsOrigin','PUBLIC_ORIGINS','return "null"']) if (!corsSource.includes(marker)) fail(`strict CORS invariant missing: ${marker}`);
for (const file of ['verification/security-verification-contract.json','verification/security-permission-matrix.json','verification/sbom.spdx.json','scripts/check-security-verification-preparation.mjs','scripts/security-verification-run.mjs']) {
  try { readFileSync(file,'utf8'); } catch { fail(`security verification artifact missing: ${file}`); }
}

for (const file of ['verification/backup-restore-contract.json','verification/backup-restore-readonly-snapshot.json','scripts/check-backup-restore-proof.mjs','scripts/backup-restore-simulate.mjs','docs/runbooks/BACKUP_RESTORE_PROOF_RU.md']) {
  try { readFileSync(file,'utf8'); } catch { fail(`backup/restore proof artifact missing: ${file}`); }
}
const backupRestoreContract = JSON.parse(readFileSync('verification/backup-restore-contract.json','utf8'));
if (backupRestoreContract.master_item !== 35 || backupRestoreContract.policy?.production_restore_allowed !== false) fail('backup/restore proof must stay pinned to item #35 and forbid live production restore');
if (!pkg.scripts?.['backup:restore:strict']?.includes('--strict')) fail('backup/restore strict gate missing');
const productionApprovalContract = JSON.parse(readFileSync('verification/production-approval-contract.json','utf8'));
if (productionApprovalContract.master_item !== 36 || productionApprovalContract.policy?.production_mutation_allowed !== false || productionApprovalContract.policy?.github_pr_required_after_approval !== true) fail('production approval contract must stay pinned to item #36, remain local-only, and require GitHub PR next');
if (!readFileSync('scripts/build-release-package.mjs','utf8').includes('APPROVED_FOR_GITHUB_PR')) fail('release package must remain gated by Stage D #36 production approval');

const githubPrContract = JSON.parse(readFileSync('verification/github-pr-contract.json','utf8'));
if (githubPrContract.master_item !== 37 || githubPrContract.policy?.github_mutation_allowed_in_preparation !== false || githubPrContract.policy?.production_release_is_separate_master_item !== 38) fail('GitHub PR contract must stay pinned to item #37, remain preparation-only, and keep production release as item #38');
if (githubPrContract.base_sha !== productionApprovalContract.leases.github_main_sha) fail('GitHub PR base lease must match the production approval reviewed GitHub main SHA');
for (const wf of githubPrContract.required_source?.workflow_files_mandatory ?? []) {
  try { readFileSync(wf,'utf8'); } catch { fail(`GitHub PR required workflow missing: ${wf}`); }
}
if (!pkg.scripts?.['github:pr:check'] || !pkg.scripts?.['github:pr:plan'] || !pkg.scripts?.['github:pr:ticket']) fail('GitHub PR preparation scripts are incomplete');
if (!readFileSync('.github/workflows/check.yml','utf8').includes('npm run node24:suite')) fail('GitHub Verify workflow must run canonical Node24 suite');
if (!readFileSync('.github/workflows/check.yml','utf8').includes('npm run source:manifest:check')) fail('GitHub Verify workflow must validate the exact source manifest');
if (!readFileSync('.github/workflows/check.yml','utf8').includes('npm run repo:exhaustive')) fail('GitHub Verify workflow must run exhaustive repository audit');
for (const wf of ['.github/workflows/staging-auto-deploy.yml','scripts/check-staging-autodeploy.mjs','scripts/check-repo-exhaustive.mjs']) { try { readFileSync(wf,'utf8'); } catch { fail(`repository/deployment hardening artifact missing: ${wf}`); } }
if (!readFileSync('.github/workflows/staging-auto-deploy.yml','utf8').includes('AZRAIL_TARGET_ENV: staging')) fail('automatic Cloudflare workflow must target staging only');
if (!readFileSync('.github/workflows/staging-auto-deploy.yml','utf8').includes('needs: verify')) fail('automatic staging deployment must depend on verify job');
if (!readFileSync('.github/workflows/deploy.yml','utf8').includes('if: ${{ false }}')) fail('Production deploy workflow must remain disabled before Stage D #38');

const productionReleaseContract = JSON.parse(readFileSync('verification/production-release-contract.json','utf8'));
if (productionReleaseContract.master_item !== 38 || productionReleaseContract.policy?.production_mutation_allowed_in_preparation !== false || productionReleaseContract.policy?.github_pr_must_be_verified_and_merged_before_cloud_mutation !== true) fail('production release contract must stay pinned to item #38, preparation-only, and require verified+merged GitHub PR');
for (const file of ['verification/production-release-readonly-snapshot.json','verification/production-release-contract.json','scripts/check-production-release-preparation.mjs','scripts/production-release-simulate.mjs','scripts/production-release-plan.mjs','scripts/production-release-apply.mjs','scripts/production-release-finalize.mjs','docs/runbooks/PRODUCTION_RELEASE_RU.md']) { try { readFileSync(file,'utf8'); } catch { fail(`production release artifact missing: ${file}`); } }
if (!pkg.scripts?.['production:release:check'] || !pkg.scripts?.['production:release:simulate'] || !pkg.scripts?.['production:release:plan'] || !pkg.scripts?.['production:release:apply'] || !pkg.scripts?.['production:release:finalize']) fail('production release scripts are incomplete');
const productionApply = readFileSync('scripts/production-release-apply.mjs','utf8');
for (const required of ['github_pr_merged',"exact('live_lease'",'c.operator_inputs.cloud_unlock_env','c.operator_inputs.release_approval_env','scripts/migrate.mjs','wrangler.production.json','OIDC_CLIENT_ID:','OIDC_ISSUER:']) if (!productionApply.includes(required)) fail(`production release apply guard missing: ${required}`);
if (productionReleaseContract.operator_inputs?.cloud_unlock_env !== 'AZRAIL_ALLOW_CLOUD_MUTATION' || productionReleaseContract.operator_inputs?.release_approval_env !== 'AZRAIL_PRODUCTION_RELEASE_APPROVAL') fail('production release explicit operator interlocks are not canonical');
if (productionApply.includes('--keep-vars')) fail('production release must not preserve legacy vars such as CORS_ORIGIN=*');

if (!process.exitCode) console.log(`PRECHECK OK: ${pkg.name}@${pkg.version}; staging/production resources are separated and cloud mutations remain locked.`);
