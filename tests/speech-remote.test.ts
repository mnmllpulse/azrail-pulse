import { describe, expect, it, vi } from 'vitest';
import { AccessError } from '../src/lib/accounts';
import { speakRemote } from '../src/lib/speech-remote';
import { operationOf } from '../src/lib/operation-limit';
import type { Env } from '../src/types';

describe('speech remote', () => {
  it('does not call the provider when the worker secret is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(speakRemote({} as Env, 'Привет')).rejects.toBeInstanceOf(AccessError);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('counts spoken replies as generation', () => {
    expect(operationOf('/api/tts', 'POST')).toBe('generation');
  });
});
