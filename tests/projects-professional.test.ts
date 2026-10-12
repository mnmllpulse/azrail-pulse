import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {sqliteD1} from './stubs/sqlite-d1';

const root=(file:string)=>readFileSync(resolve(__dirname,'..',file),'utf8');

describe('Professional Projects architecture',()=>{
  it('keeps migration 020 idempotent with metadata and artifact ownership sidecars',()=>{
    const {sqlite}=sqliteD1();
    sqlite.exec(`CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS studio_artifacts(id TEXT PRIMARY KEY);`);
    const migration=root('migrations/020-professional-projects.sql');
    sqlite.exec(migration); sqlite.exec(migration);
    const profileColumns=sqlite.prepare("PRAGMA table_info('project_profiles')").all().map((row:any)=>row.name);
    const artifactColumns=sqlite.prepare("PRAGMA table_info('studio_artifact_projects')").all().map((row:any)=>row.name);
    for(const name of ['project_id','pinned','studio_id','tags_json','archived_at','deleted_at','duplicated_from','created_at','updated_at']) expect(profileColumns).toContain(name);
    for(const name of ['artifact_id','project_id','studio_id','linked_at']) expect(artifactColumns).toContain(name);
  });

  it('keeps destructive actions explicit and duplication bounded',()=>{
    const center=root('src/lib/project-center.ts'),route=root('src/unified/projects.ts');
    expect(center).toContain('MAX_DUPLICATE_FILES=400');
    expect(center).toContain('MAX_DUPLICATE_BYTES=16*1024*1024');
    expect(center).toContain('withProjectLock');
    expect(route).toContain('X-AZRAIL-Confirm-Project');
    expect(route).toContain('confirmation.confirmName!==current.project.name');
    expect(route).toContain("status:'deleted'");
  });

  it('keeps Projects discoverable without turning cards into button walls',()=>{
    const app=root('ui/app.ts'),projects=root('ui/projects.ts'),html=root('ui/app.html');
    expect(app).toContain('renderProjectCenter(');
    expect(app).not.toContain("card.className='project-card'");
    for(const id of ['project-search','project-status-filter','project-studio-filter','project-sort']) expect(html).toContain(id);
    expect(projects).toContain("open.textContent='Открыть ↗'");
    expect(projects).toContain("menu.textContent='⋯'");
    expect(projects).toContain("pin.textContent=item.pinned?'★':'☆'");
  });
});
