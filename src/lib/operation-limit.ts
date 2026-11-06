import type { Env } from '../types';
import { AccessError } from './accounts';
import { reserveQuota } from './quota';

/** Hourly ceilings. Chat also keeps its separate daily ceiling. */
export const OPERATION_HOURLY_LIMITS = {
  login: 30,
  chat: 60,
  generation: 20,
  upload: 30,
  admin: 30,
} as const;

export type LimitedOperation = keyof typeof OPERATION_HOURLY_LIMITS;

const generationPaths = new Set([
  '/api/studio/music/generate',
  '/api/studio/image',
  '/api/studio/voice',
  '/api/tts',
  '/api/studio/video/plan',
  '/api/studio/web/generate',
  '/api/studio/prose',
]);

export function operationOf(pathname: string, method: string): LimitedOperation | null {
  if (pathname === '/auth/login' && method === 'GET') return 'login';
  if (pathname === '/api/chat' && method === 'POST') return 'chat';
  if (method === 'POST' && generationPaths.has(pathname)) return 'generation';
  if (pathname === '/api/upload' && method === 'POST') return 'upload';
  if (method === 'POST' && pathname.startsWith('/api/admin/')) return 'admin';
  return null;
}

export async function enforceOperationLimit(env: Env, operation: LimitedOperation, subject: string) {
  const who = subject.replace(/[^\w:.-]/g, '').slice(0, 80) || 'unknown';
  const result = await reserveQuota(env, `op:${operation}:${who}`, 1, OPERATION_HOURLY_LIMITS[operation]);
  if (!result.allowed) throw new AccessError('Слишком много запросов. Подождите и повторите.', 429);
}
