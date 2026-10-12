import { existsSync, readFileSync } from 'node:fs';

const fail=(message)=>{console.error(`PROJECTS ARCHITECTURE FAIL: ${message}`);process.exitCode=1;};
const need=(text,marker,label)=>{if(!text.includes(marker))fail(`${label} missing: ${marker}`);};

if(!existsSync('migrations/020-professional-projects.sql')) fail('migration 020 missing');
const migration=readFileSync('migrations/020-professional-projects.sql','utf8');
const schema=readFileSync('schema.sql','utf8');
for(const marker of ['CREATE TABLE IF NOT EXISTS project_profiles','pinned INTEGER NOT NULL DEFAULT 0','studio_id TEXT','tags_json TEXT NOT NULL','duplicated_from TEXT','CREATE TABLE IF NOT EXISTS studio_artifact_projects','artifact_id TEXT PRIMARY KEY','project_id TEXT NOT NULL']){
 need(migration,marker,'migration 020');need(schema,marker,'schema.sql');
}

const center=readFileSync('src/lib/project-center.ts','utf8');
for(const marker of ['listProjects','createProject','updateProject','duplicateProject','projectDetails','MAX_DUPLICATE_FILES=400','MAX_DUPLICATE_BYTES=16*1024*1024','withProjectLock','publishWorkspace','projectDisplayNameSql','project.duplicated']) need(center,marker,'project center');
if(center.includes('const encoder=new TextEncoder()')) fail('project-center contains unused encoder');

const route=readFileSync('src/unified/projects.ts','utf8');
for(const marker of ["path==='/api/projects'","request.method==='GET'","request.method==='POST'","request.method==='PATCH'","request.method==='DELETE'",'X-AZRAIL-Confirm-Project','confirmName','/duplicate']) need(route,marker,'projects route');

const app=readFileSync('ui/app.ts','utf8');
const projects=readFileSync('ui/projects.ts','utf8');
const html=readFileSync('ui/app.html','utf8');
if(!app.includes('renderProjectCenter(')) fail('ui/app.ts must delegate Projects to renderProjectCenter');
if(/createElement\(['"]article['"]\).*project-card/s.test(app)) fail('legacy inline project-card builder found in ui/app.ts');
for(const marker of ['project-search','project-status-filter','project-studio-filter','project-sort','new-project']) need(html,marker,'Projects HTML');
for(const marker of ['project-card','project-pin','project-menu','Открыть','Дублировать','Экспорт ZIP','В архив','Удалить проект','artifactsCount','versionsCount','ownerName']) need(projects,marker,'Projects UI');
if((projects.match(/open\.textContent='Открыть ↗'/g)||[]).length!==1) fail('project cards must expose one primary Open action');

const studios=readFileSync('src/unified/studios.ts','utf8');
const shared=readFileSync('ui/studio-modules/shared.ts','utf8');
for(const marker of ['X-Project-Id','X-Studio-Id','studio_artifact_projects','project_profiles']) need(studios,marker,'studio backend project linking');
for(const marker of ['X-Project-Id','X-Studio-Id']) need(shared,marker,'studio UI project linking');

if(!process.exitCode) console.log('PROJECTS ARCHITECTURE PASS: professional project center, bounded duplication, metadata, filters and studio artifact ownership are wired.');
