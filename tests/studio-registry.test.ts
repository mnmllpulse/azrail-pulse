import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {studios,loadStudioModule} from '../ui/studio-registry';

describe('Studio Module Registry',()=>{
 it('keeps the catalog canonical and unique',()=>{
  expect(studios).toHaveLength(9);
  expect(new Set(studios.map(studio=>studio.id)).size).toBe(studios.length);
  for(const studio of studios){expect(studio.capabilities.length).toBeGreaterThan(0);expect(studio.icon).toBeTruthy();}
 });
 it.each(studios)('$id loads an isolated module matching its manifest',async studio=>{
  const module=await loadStudioModule(studio.id);
  expect(module.id).toBe(studio.id);expect(module.title).toBe(studio.title);expect(module.action).toBe(studio.action);
 });
 it('keeps per-studio implementation branches out of the app shell',()=>{
  const app=readFileSync(new URL('../ui/app.ts',import.meta.url),'utf8');
  expect(app).not.toMatch(/if\s*\(\s*id\s*===\s*['"]/);
  expect(app).toContain('loadStudioModule(id)');
 });
});
