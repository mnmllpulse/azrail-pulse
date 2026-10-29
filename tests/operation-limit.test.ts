import { describe, expect, it, vi } from 'vitest';
import { enforceOperationLimit, operationOf } from '../src/lib/operation-limit';
import { authRoute } from '../src/unified/oidc';
import { sqliteD1 } from './stubs/sqlite-d1';
import type { Env } from '../src/types';

describe('operation ceilings', () => {
  it('names login, chat, generation, upload and admin separately', () => {
    expect(operationOf('/auth/login', 'GET')).toBe('login');
    expect(operationOf('/api/chat', 'POST')).toBe('chat');
    expect(operationOf('/api/studio/music/generate', 'POST')).toBe('generation');
    expect(operationOf('/api/studio/image', 'POST')).toBe('generation');
    expect(operationOf('/api/upload', 'POST')).toBe('upload');
    expect(operationOf('/api/admin/accounts', 'POST')).toBe('admin');
    expect(operationOf('/api/mission', 'POST')).toBeNull();
    expect(operationOf('/api/hooks/stripe', 'POST')).toBeNull();
  });

  it('stops the 31st login before the identity provider', async () => {
    const { db } = sqliteD1();
    const bucket = Math.floor(Date.now() / 3_600_000);
    await db.prepare('INSERT INTO request_quotas (scope, bucket, used) VALUES (?, ?, ?)').bind('op:login:unknown', bucket, 30).run();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const env = { AZRAIL_D1: db, PUBLIC_ORIGINS: 'https://app.test', OIDC_ISSUER: 'https://login.example.com', OIDC_CLIENT_ID: 'client' } as Env;
    const response = await authRoute(new Request('https://app.test/auth/login'), env);
    expect(response?.status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps generation for one account apart from another', async () => {
    const { db } = sqliteD1();
    const env = { AZRAIL_D1: db } as Env;
    for (let i = 0; i < 20; i++) await enforceOperationLimit(env, 'generation', 'alice');
    await expect(enforceOperationLimit(env, 'generation', 'alice')).rejects.toMatchObject({ status: 429 });
    await expect(enforceOperationLimit(env, 'generation', 'bob')).resolves.toBeUndefined();
  });
});
