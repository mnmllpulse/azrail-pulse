import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/core/azrail-sandbox', () => ({ Sandbox: class {} }));
import worker from '../src/index';
import { createAccount, requireResource } from '../src/lib/accounts';
import { sqliteD1 } from './stubs/sqlite-d1';
import type { Env } from '../src/types';

const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
function fixture() {
  const { db, sqlite } = sqliteD1();
  const env = { AZRAIL_D1: db, AZRAIL_TOKEN: 'local-admin',
    AZRAIL_R2: { list: async () => ({ objects: [], truncated: false }) } } as unknown as Env;
  const call = (path: string, token: string, body?: unknown) => worker.fetch(new Request('https://test' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env, ctx);
  return { env, sqlite, call };
}

describe('two-account HTTP isolation', () => {
  it('only the owner can read project data through the Worker', async () => {
    const { env, call } = fixture();
    const alice = await createAccount(env, 'Alice', 'editor');
    const bob = await createAccount(env, 'Bob', 'editor');
    await requireResource(env, alice, 'project', 'private', true);
    expect((await call('/api/projects/private/memory', alice.token)).status).toBe(200);
    expect((await call('/api/projects/private/memory', bob.token)).status).toBe(404);
    expect((await call('/api/backups?projectId=private', bob.token)).status).toBe(404);
    expect((await call('/api/admin/accounts', bob.token)).status).toBe(403);
  });
  it('a legacy default WebSocket cannot be opened without project authorization', async () => {
    const { env, call } = fixture();
    const alice = await createAccount(env, 'Alice', 'editor');
    expect((await call('/api/stream', alice.token)).status).toBe(400);
    expect((await call('/api/stream?projectId=default', alice.token)).status).toBe(404);
  });
  it('viewer can obtain a stream ticket but cannot change project files', async () => {
    const { env, sqlite, call } = fixture();
    const viewer = await createAccount(env, 'Reader', 'viewer');
    sqlite.prepare("INSERT INTO resource_owners VALUES('project','p',?)").run(viewer.id);
    expect((await call('/api/stream/ticket', viewer.token, { projectId: 'p' })).status).toBe(200);
    expect((await call('/api/backups', viewer.token, { projectId: 'p' })).status).toBe(403);
  });
  it('revocation invalidates an already issued stream ticket', async () => {
    const { env, sqlite, call } = fixture();
    const alice = await createAccount(env, 'Alice', 'editor');
    const response = await call('/api/stream/ticket', alice.token, { projectId: 'p' });
    const ticket = (await response.json() as {ticket: string}).ticket;
    sqlite.prepare('UPDATE access_accounts SET disabled=1 WHERE id=?').run(alice.id);
    expect((await call('/api/stream?projectId=p&ticket=' + ticket, alice.token)).status).toBe(401);
    expect((await call('/api/me', alice.token)).status).toBe(401);
  });
  it('administration never returns a stored password or key hash', async () => {
    const { call } = fixture();
    const created = await call('/api/admin/accounts', 'local-admin', {name:'User',role:'editor',days:1});
    expect(created.status).toBe(201);
    const clear = (await created.json() as {account:{token:string}}).account.token;
    const listing = await (await call('/api/admin/accounts', 'local-admin')).text();
    expect(listing).not.toContain(clear);
    expect(listing).not.toContain('token_hash');
  });
});


describe('0.8.1 HTTP boundary regressions',()=>{
  it('returns JSON 404 for an unknown authenticated API route',async()=>{
    const {call}=fixture();const response=await call('/api/typo','local-admin');expect(response.status).toBe(404);expect(await response.json()).toMatchObject({code:'not_found'});expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rejects malformed percent encoding with 400',async()=>{
    const {call}=fixture();expect((await call('/api/projects/%E0%A4/memory','local-admin')).status).toBe(400);
  });
  it('rejects malformed nested task data before invoking an agent',async()=>{
    const {call}=fixture();expect((await call('/api/task','local-admin',{projectId:'p',designBrief:[],payload:'test'})).status).toBe(400);
  });
  it('preserves security headers of the application shell',async()=>{
    const {env}=fixture();env.ASSETS={fetch:async()=>new Response('<h1>app</h1>',{headers:{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'",'X-Frame-Options':'DENY'}})} as never;
    const response=await worker.fetch(new Request('https://test/project',{headers:{Accept:'text/html'}}),env,ctx);
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
